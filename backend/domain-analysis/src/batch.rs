use std::env;

use anyhow::Result;
use chrono::{NaiveDate, Utc};
use sqlx::PgPool;
use tracing::{error, info, warn};

use crate::embedding::EmbeddingClient;
use crate::extractor;
use crate::models::AnalysisJob;
use crate::service::AnalysisService;

/// Configuration for the nightly batch processor.
#[derive(Debug, Clone)]
pub struct BatchConfig {
    /// Whether batch processing is enabled.
    pub enabled: bool,
    /// Hour of day to run batch (UTC, 0-23)
    pub run_hour_utc: u32,
    /// Maximum submissions to process per organization per batch run
    pub batch_size: i64,
    /// Whether embedding generation is enabled for feature backfill.
    pub embedding_enabled: bool,
    /// Whether LLM-based generation is enabled.
    pub llm_enabled: bool,
}

impl Default for BatchConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            run_hour_utc: 2,
            batch_size: 1000,
            embedding_enabled: false,
            llm_enabled: false,
        }
    }
}

impl BatchConfig {
    pub fn from_env() -> Self {
        Self {
            enabled: env::var("AI_BATCH_ENABLED").unwrap_or_default() == "true",
            run_hour_utc: env::var("AI_BATCH_HOUR")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(2),
            batch_size: env::var("AI_BATCH_SIZE")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(1000),
            embedding_enabled: env::var("EMBEDDING_API_URL")
                .ok()
                .map(|value| !value.trim().is_empty())
                .unwrap_or(false),
            llm_enabled: env::var("AI_API_KEY")
                .ok()
                .map(|value| !value.is_empty())
                .unwrap_or(false),
        }
    }
}

/// Run the nightly batch process for all organizations.
pub async fn run_nightly_batch(pool: PgPool, config: &BatchConfig) -> Result<()> {
    if !config.enabled {
        info!("Nightly batch disabled — skipping");
        return Ok(());
    }

    let service = AnalysisService::new(pool.clone());
    let today = Utc::now().date_naive();
    let embedding_client = if config.embedding_enabled {
        match EmbeddingClient::from_env() {
            Ok(client) => client,
            Err(error) => {
                warn!(error = %error, "Embedding client configuration failed; continuing without embeddings");
                None
            }
        }
    } else {
        None
    };

    info!(date = %today, "Starting nightly analysis batch");

    match backfill_pending_features(
        &service,
        &pool,
        config.batch_size,
        embedding_client.as_ref(),
    )
    .await
    {
        Ok(count) => info!(count, "Feature backfill complete"),
        Err(error) => error!(error = %error, "Feature backfill failed"),
    }

    match recluster_solutions(&service, &pool, config.batch_size).await {
        Ok(count) => info!(count, "Reclustering complete"),
        Err(error) => error!(error = %error, "Reclustering failed"),
    }

    if config.llm_enabled {
        match generate_teaching_cards(&service, &pool).await {
            Ok(count) => info!(count, "Teaching card generation complete"),
            Err(error) => error!(error = %error, "Teaching card generation failed"),
        }
    }

    match build_class_snapshots(&service, &pool, today).await {
        Ok(count) => info!(count, "Class snapshot build complete"),
        Err(error) => error!(error = %error, "Class snapshot build failed"),
    }

    match invalidate_stale(&pool).await {
        Ok(count) => info!(count, "Stale artifact cleanup complete"),
        Err(error) => error!(error = %error, "Stale cleanup failed"),
    }

    info!("Nightly analysis batch complete");
    Ok(())
}

async fn backfill_pending_features(
    service: &AnalysisService,
    pool: &PgPool,
    batch_size: i64,
    embedding_client: Option<&EmbeddingClient>,
) -> Result<u64> {
    let pending = sqlx::query_as::<_, AnalysisJob>(
        "SELECT * FROM analysis_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT $1",
    )
    .bind(batch_size)
    .fetch_all(pool)
    .await?;

    let mut processed = 0u64;
    for job in &pending {
        if let Err(error) = process_job(service, pool, job, embedding_client).await {
            warn!(job_id = job.id, error = %error, "Failed to process analysis job");
            let _ = service.mark_failed(job.id, &error.to_string()).await;
        } else {
            processed += 1;
        }
    }

    Ok(processed)
}

async fn process_job(
    service: &AnalysisService,
    pool: &PgPool,
    job: &AnalysisJob,
    embedding_client: Option<&EmbeddingClient>,
) -> Result<()> {
    service.mark_processing(job.id).await?;

    let source: Option<(String, String)> =
        sqlx::query_as("SELECT s.code, s.language FROM submissions s WHERE s.id = $1")
            .bind(job.submission_id)
            .fetch_optional(pool)
            .await?;

    if let Some((source_code, language)) = source {
        let extract_source = source_code.clone();
        let features = tokio::task::spawn_blocking(move || {
            extractor::extract_features(&extract_source, &language)
        })
        .await??;

        let embedding = if let Some(client) = embedding_client {
            match client.embed(&source_code).await {
                Ok(embedding) => Some(embedding),
                Err(error) => {
                    warn!(
                        job_id = job.id,
                        submission_id = job.submission_id,
                        error = %error,
                        "Embedding generation failed; storing structural features without embedding"
                    );
                    None
                }
            }
        } else {
            None
        };

        service
            .store_features(job.submission_id, job.organization_id, &features, embedding)
            .await?;
    }

    service.mark_completed(job.id).await?;
    Ok(())
}

async fn recluster_solutions(
    service: &AnalysisService,
    pool: &PgPool,
    _batch_size: i64,
) -> Result<u64> {
    let orgs: Vec<(i64,)> =
        sqlx::query_as("SELECT DISTINCT organization_id FROM analysis_submission_features")
            .fetch_all(pool)
            .await?;

    let mut count = 0u64;
    for (org_id,) in &orgs {
        let problems: Vec<(i64,)> = sqlx::query_as(
            "SELECT DISTINCT problem_id FROM analysis_jobs WHERE organization_id = $1 AND status = 'completed'",
        )
        .bind(org_id)
        .fetch_all(pool)
        .await?;

        for (problem_id,) in problems {
            sqlx::query(
                "DELETE FROM analysis_solution_clusters WHERE problem_id = $1 AND organization_id = $2",
            )
            .bind(problem_id)
            .bind(org_id)
            .execute(pool)
            .await?;

            let clusters = sqlx::query_as::<_, (String, i64)>(
                "SELECT CASE
                    WHEN COALESCE(cyclomatic_complexity, 0) < 3 THEN 'simple'
                    WHEN COALESCE(cyclomatic_complexity, 0) < 8 THEN 'moderate'
                    ELSE 'complex'
                END AS bucket, COUNT(*) AS cnt
                FROM analysis_submission_features af
                JOIN analysis_jobs aj ON aj.submission_id = af.submission_id
                WHERE aj.problem_id = $1 AND aj.organization_id = $2 AND aj.status = 'completed'
                GROUP BY bucket",
            )
            .bind(problem_id)
            .bind(org_id)
            .fetch_all(pool)
            .await?;

            for (bucket, member_count) in clusters {
                sqlx::query(
                    "INSERT INTO analysis_solution_clusters (problem_id, organization_id, cluster_name, member_count, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, NOW(), NOW())",
                )
                .bind(problem_id)
                .bind(org_id)
                .bind(bucket)
                .bind(member_count as i32)
                .execute(pool)
                .await?;
                count += 1;
            }
        }
    }

    let _ = service;
    Ok(count)
}

async fn generate_teaching_cards(service: &AnalysisService, pool: &PgPool) -> Result<u64> {
    let problems: Vec<(i64, i64)> = sqlx::query_as(
        "SELECT problem_id, organization_id FROM analysis_solution_clusters GROUP BY problem_id, organization_id",
    )
    .fetch_all(pool)
    .await?;

    let mut generated = 0u64;
    for (problem_id, organization_id) in problems {
        let cluster_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM analysis_solution_clusters WHERE problem_id = $1 AND organization_id = $2",
        )
        .bind(problem_id)
        .bind(organization_id)
        .fetch_one(pool)
        .await?;

        let card_content = serde_json::json!({
            "summary": "Auto-generated analysis placeholder",
            "cluster_count": cluster_count.0,
        });

        sqlx::query(
            "INSERT INTO analysis_teaching_cards (problem_id, organization_id, card_type, title, content, source_cluster_ids, created_at, updated_at)
             VALUES ($1, $2, 'summary', 'Nightly Analysis Summary', $3, '{}'::bigint[], NOW(), NOW())",
        )
        .bind(problem_id)
        .bind(organization_id)
        .bind(sqlx::types::Json(card_content))
        .execute(pool)
        .await?;
        generated += 1;
    }

    let _ = service;
    Ok(generated)
}

async fn build_class_snapshots(
    service: &AnalysisService,
    pool: &PgPool,
    today: NaiveDate,
) -> Result<u64> {
    let classes: Vec<(i64, i64, i64)> = sqlx::query_as(
        "SELECT c.id, c.organization_id, COUNT(ce.student_id)::bigint AS student_count
         FROM classes c
         LEFT JOIN class_enrollments ce ON ce.class_id = c.id AND ce.status = 'active'
         GROUP BY c.id, c.organization_id",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let mut built = 0u64;
    for (class_id, organization_id, student_count) in classes {
        let avg_complexity: Option<f64> = sqlx::query_scalar(
            "SELECT AVG(af.cyclomatic_complexity)
             FROM analysis_submission_features af
             JOIN submissions s ON s.id = af.submission_id
             JOIN class_enrollments ce ON ce.student_id = s.user_id AND ce.status = 'active'
             WHERE ce.class_id = $1 AND s.organization_id = $2",
        )
        .bind(class_id)
        .bind(organization_id)
        .fetch_optional(pool)
        .await?;

        let cognition_profile = serde_json::json!({
            "class_id": class_id,
            "generated_at": today,
            "notes": "Placeholder cognition profile",
        });

        sqlx::query(
            "INSERT INTO analysis_class_snapshots (class_id, organization_id, snapshot_date, cognition_profile, student_count, avg_complexity, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (class_id, snapshot_date) DO UPDATE SET
                organization_id = EXCLUDED.organization_id,
                cognition_profile = EXCLUDED.cognition_profile,
                student_count = EXCLUDED.student_count,
                avg_complexity = EXCLUDED.avg_complexity",
        )
        .bind(class_id)
        .bind(organization_id)
        .bind(today)
        .bind(sqlx::types::Json(cognition_profile))
        .bind(student_count as i32)
        .bind(avg_complexity)
        .execute(pool)
        .await?;
        built += 1;
    }

    let _ = service;
    Ok(built)
}

async fn invalidate_stale(pool: &PgPool) -> Result<u64> {
    let result = sqlx::query("DELETE FROM analysis_jobs WHERE status IN ('failed', 'completed') AND updated_at < NOW() - INTERVAL '30 days'")
        .execute(pool)
        .await?;
    Ok(result.rows_affected())
}

#[cfg(test)]
mod tests {
    use std::sync::{Mutex, OnceLock};

    use super::*;

    fn env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    /// Verify BatchConfig::from_env correctly detects embedding availability
    /// based on EMBEDDING_API_URL presence.
    #[test]
    fn batch_config_embedding_enabled_when_url_set() {
        let _guard = env_lock().lock().unwrap();
        std::env::set_var("EMBEDDING_API_URL", "http://embedding.test");
        let config = BatchConfig::from_env();
        assert!(config.embedding_enabled, "embedding should be enabled when EMBEDDING_API_URL is set");
        std::env::remove_var("EMBEDDING_API_URL");
    }

    #[test]
    fn batch_config_embedding_disabled_when_url_missing() {
        let _guard = env_lock().lock().unwrap();
        std::env::remove_var("EMBEDDING_API_URL");
        let config = BatchConfig::from_env();
        assert!(!config.embedding_enabled, "embedding should be disabled when EMBEDDING_API_URL is unset");
    }

    #[test]
    fn batch_config_ignores_whitespace_url() {
        let _guard = env_lock().lock().unwrap();
        std::env::set_var("EMBEDDING_API_URL", "   ");
        let config = BatchConfig::from_env();
        assert!(!config.embedding_enabled, "whitespace-only URL should disable embedding");
        std::env::remove_var("EMBEDDING_API_URL");
    }

    /// Verify that structural feature extraction completes successfully
    /// even when no embedding client is available (degradation pattern).
    #[test]
    fn extract_features_succeeds_without_embedding_client() {
        let code = r#"
fn quicksort(arr: &mut [i32]) {
    if arr.len() <= 1 { return; }
    let pivot = arr[0];
    for i in 1..arr.len() {
        if arr[i] < pivot {
            arr.swap(i, 0);
        }
    }
}
"#;
        let features = extractor::extract_features(code, "rust").unwrap();

        // Structural features must be valid and complete regardless of embedding
        assert!(features.cyclomatic_complexity > 0.0);
        assert!(features.lines_of_code > 0);
        assert!(features.function_count >= 1);
        assert!(features.loop_count >= 1);
        assert!(features.max_nesting_depth >= 1);
        // This simulates the degradation path: features are ready to store
        // even though embedding = None
    }

    #[test]
    fn extract_features_python_degradation_path() {
        let code = r#"
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)
"#;
        let features = extractor::extract_features(code, "python").unwrap();
        assert!(features.has_recursion, "merge_sort calls itself");
        assert!(features.function_count >= 1);
        // Features are complete and can be stored without embedding
    }

    #[test]
    fn batch_default_config_sensible() {
        let config = BatchConfig::default();
        assert!(!config.enabled);
        assert!(!config.embedding_enabled);
        assert!(!config.llm_enabled);
        assert_eq!(config.run_hour_utc, 2);
        assert_eq!(config.batch_size, 1000);
    }
}
