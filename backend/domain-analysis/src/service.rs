use anyhow::Result;
use chrono::{NaiveDate, Utc};
use sqlx::PgPool;
use std::cmp::Ordering;

use crate::extractor::StructuralFeatures;
use crate::models::{
    AnalysisClassSnapshot, AnalysisJob, AnalysisSolutionCluster, AnalysisSubmissionFeatures,
    AnalysisTeachingCard, CandidateProblem, FeatureWithProblem, NewAnalysisJob, ProblemRecommendation,
    SimilarSubmission, SubmissionMeta, UserDifficultyStats,
};

#[derive(Clone)]
pub struct AnalysisService {
    pool: PgPool,
}

impl AnalysisService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub async fn create_job(&self, job: &NewAnalysisJob) -> Result<i64> {
        let record = sqlx::query_scalar::<_, i64>(
            r#"
            INSERT INTO analysis_jobs (
                submission_id, problem_id, user_id, organization_id,
                campus_id, grade_id, contest_id, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
            RETURNING id
            "#,
        )
        .bind(job.submission_id)
        .bind(job.problem_id)
        .bind(job.user_id)
        .bind(job.organization_id)
        .bind(job.campus_id)
        .bind(job.grade_id)
        .bind(job.contest_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(record)
    }

    pub async fn mark_processing(&self, job_id: i64) -> Result<()> {
        sqlx::query(
            "UPDATE analysis_jobs SET status = 'processing', updated_at = NOW() WHERE id = $1",
        )
        .bind(job_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn mark_completed(&self, job_id: i64) -> Result<()> {
        sqlx::query(
            "UPDATE analysis_jobs SET status = 'completed', updated_at = NOW() WHERE id = $1",
        )
        .bind(job_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn mark_failed(&self, job_id: i64, error_message: &str) -> Result<()> {
        sqlx::query(
            "UPDATE analysis_jobs SET status = 'failed', updated_at = NOW(), error_message = $2 WHERE id = $1",
        )
        .bind(job_id)
        .bind(error_message)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn store_features(
        &self,
        submission_id: i64,
        organization_id: i64,
        features: &StructuralFeatures,
        embedding: Option<Vec<f64>>,
    ) -> Result<()> {
        let embedding = embedding.map(sqlx::types::Json);

        sqlx::query(
            r#"
            INSERT INTO analysis_submission_features (
                submission_id,
                organization_id,
                cyclomatic_complexity,
                lines_of_code,
                token_count,
                function_count,
                nesting_depth,
                has_recursion,
                loop_count,
                avg_loop_nesting,
                distinct_operators,
                distinct_operands,
                halstead_volume,
                embedding_vector,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
            ON CONFLICT (submission_id)
            DO UPDATE SET
                organization_id = EXCLUDED.organization_id,
                cyclomatic_complexity = EXCLUDED.cyclomatic_complexity,
                lines_of_code = EXCLUDED.lines_of_code,
                token_count = EXCLUDED.token_count,
                function_count = EXCLUDED.function_count,
                nesting_depth = EXCLUDED.nesting_depth,
                has_recursion = EXCLUDED.has_recursion,
                loop_count = EXCLUDED.loop_count,
                avg_loop_nesting = EXCLUDED.avg_loop_nesting,
                distinct_operators = EXCLUDED.distinct_operators,
                distinct_operands = EXCLUDED.distinct_operands,
                halstead_volume = EXCLUDED.halstead_volume,
                embedding_vector = COALESCE(EXCLUDED.embedding_vector, analysis_submission_features.embedding_vector)
            "#,
        )
        .bind(submission_id)
        .bind(organization_id)
        .bind(features.cyclomatic_complexity)
        .bind(features.lines_of_code)
        .bind(features.token_count)
        .bind(features.function_count)
        .bind(features.max_nesting_depth)
        .bind(features.has_recursion)
        .bind(features.loop_count)
        .bind(features.avg_loop_nesting)
        .bind(features.distinct_operators)
        .bind(features.distinct_operands)
        .bind(features.halstead_volume)
        .bind(embedding)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn store_embedding(
        &self,
        submission_id: i64,
        organization_id: i64,
        embedding: Vec<f64>,
    ) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE analysis_submission_features
            SET embedding_vector = $3
            WHERE submission_id = $1 AND organization_id = $2
            "#,
        )
        .bind(submission_id)
        .bind(organization_id)
        .bind(sqlx::types::Json(embedding))
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_submission_features(
        &self,
        submission_id: i64,
        organization_id: i64,
    ) -> Result<Option<AnalysisSubmissionFeatures>> {
        let record = sqlx::query_as::<_, AnalysisSubmissionFeatures>(
            r#"
            SELECT *
            FROM analysis_submission_features
            WHERE submission_id = $1 AND organization_id = $2
            LIMIT 1
            "#,
        )
        .bind(submission_id)
        .bind(organization_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(record)
    }

    pub async fn get_teaching_cards(
        &self,
        problem_id: i64,
        organization_id: i64,
    ) -> Result<Vec<AnalysisTeachingCard>> {
        let cards = sqlx::query_as::<_, AnalysisTeachingCard>(
            r#"
            SELECT *
            FROM analysis_teaching_cards
            WHERE problem_id = $1 AND organization_id = $2
            ORDER BY updated_at DESC
            "#,
        )
        .bind(problem_id)
        .bind(organization_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(cards)
    }

    pub async fn get_solution_clusters(
        &self,
        problem_id: i64,
        organization_id: i64,
    ) -> Result<Vec<AnalysisSolutionCluster>> {
        let clusters = sqlx::query_as::<_, AnalysisSolutionCluster>(
            r#"
            SELECT *
            FROM analysis_solution_clusters
            WHERE problem_id = $1 AND organization_id = $2
            ORDER BY member_count DESC, updated_at DESC
            "#,
        )
        .bind(problem_id)
        .bind(organization_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(clusters)
    }

    pub async fn get_class_snapshot(
        &self,
        class_id: i64,
        organization_id: i64,
    ) -> Result<Option<AnalysisClassSnapshot>> {
        let snapshot = sqlx::query_as::<_, AnalysisClassSnapshot>(
            r#"
            SELECT *
            FROM analysis_class_snapshots
            WHERE class_id = $1 AND organization_id = $2
            ORDER BY snapshot_date DESC, created_at DESC
            LIMIT 1
            "#,
        )
        .bind(class_id)
        .bind(organization_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(snapshot)
    }

    pub async fn list_pending_jobs(&self, limit: i64) -> Result<Vec<AnalysisJob>> {
        let jobs = sqlx::query_as::<_, AnalysisJob>(
            r#"SELECT id, submission_id, problem_id, user_id, organization_id,
                      campus_id, grade_id, contest_id, status, error_message,
                      llm_model, prompt_tokens, completion_tokens, latency_ms,
                      retry_count, max_retries, created_at, updated_at
               FROM analysis_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT $1"#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(jobs)
    }

    pub async fn latest_processing_date(&self) -> NaiveDate {
        Utc::now().date_naive()
    }

    // -----------------------------------------------------------------------
    // LLM feedback trigger & query methods
    // -----------------------------------------------------------------------

    /// Look up a submission's metadata (user_id, problem_id, organization_id).
    /// Used by the trigger-feedback endpoint to create an analysis job.
    pub async fn get_submission_meta(
        &self,
        submission_id: i64,
        organization_id: i64,
    ) -> Result<Option<SubmissionMeta>> {
        let row = sqlx::query_as::<_, SubmissionMeta>(
            r#"SELECT user_id, problem_id, organization_id
               FROM submissions
               WHERE id = $1 AND organization_id = $2"#,
        )
        .bind(submission_id)
        .bind(organization_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    /// Find the latest analysis job for a given submission.
    /// Returns None if no job exists yet.
    pub async fn find_latest_job_by_submission(
        &self,
        submission_id: i64,
    ) -> Result<Option<AnalysisJob>> {
        let row = sqlx::query_as::<_, AnalysisJob>(
            r#"SELECT id, submission_id, problem_id, user_id, organization_id,
                      campus_id, grade_id, contest_id, status, error_message,
                      llm_model, prompt_tokens, completion_tokens, latency_ms,
                      retry_count, max_retries, created_at, updated_at
               FROM analysis_jobs
               WHERE submission_id = $1
               ORDER BY created_at DESC
               LIMIT 1"#,
        )
        .bind(submission_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row)
    }

    /// Get the AI feedback result for a submission — job status + teaching card.
    /// Returns the latest job for the submission, and if completed, the associated
    /// teaching card for the problem.
    pub async fn get_ai_feedback(
        &self,
        submission_id: i64,
        organization_id: i64,
    ) -> Result<Option<AiFeedbackResult>> {
        let job = self.find_latest_job_by_submission(submission_id).await?;

        match job {
            None => Ok(None),
            Some(job) => {
                let card = if job.status == "completed" {
                    self.get_teaching_cards(job.problem_id, organization_id)
                        .await
                        .ok()
                        .and_then(|cards| cards.into_iter().next())
                } else {
                    None
                };

                Ok(Some(AiFeedbackResult { job, card }))
            }
        }
    }

    // -----------------------------------------------------------------------
    // Similarity retrieval (L2+L3 weighted ranking)
    // -----------------------------------------------------------------------

    /// Find the most similar submissions to the given submission within the
    /// **same problem**, constrained to the same organization (multi-tenant).
    ///
    /// Ranking: `embedding_cosine * 0.6 + structural_similarity * 0.4`
    ///
    /// Returns an empty list when the target has no embedding (graceful
    /// degradation per MEM016 / MEM013).
    pub async fn find_similar_submissions(
        &self,
        submission_id: i64,
        org_id: i64,
        limit: i64,
    ) -> Result<Vec<SimilarSubmission>> {
        // 1. Get target features (embedding + structural).
        let target = match self.get_submission_features(submission_id, org_id).await? {
            Some(f) => f,
            None => return Ok(vec![]),
        };

        let target_embedding: Vec<f64> = match &target.embedding_vector {
            Some(json_vec) => json_vec.0.clone(),
            None => return Ok(vec![]), // no embedding → degrade gracefully
        };

        if target_embedding.is_empty() {
            return Ok(vec![]);
        }

        // 2. Get the problem_id via the analysis_jobs table (or features row).
        //    The features row does not store problem_id directly; we look it up
        //    from the most recent analysis job for this submission.
        let problem_id = self
            .find_latest_job_by_submission(submission_id)
            .await?
            .map(|j| j.problem_id);

        let target_structural = extract_structural_vector(&target);

        // 3. Query candidate features. If we have a problem_id, restrict to
        //    same-problem; otherwise search across all submissions in the org.
        let candidates = if let Some(pid) = problem_id {
            self.list_features_by_problem(pid, org_id, submission_id)
                .await?
        } else {
            self.list_features_by_org(org_id, submission_id).await?
        };

        // 4. Score, sort, and return top N.
        Ok(rank_by_similarity(
            &target_embedding,
            &target_structural,
            candidates,
            problem_id,
            limit,
        ))
    }

    /// Find similar submissions **across all problems** within the organization.
    /// Uses the same weighted scoring but does not restrict to the same problem.
    pub async fn find_cross_problem_similar(
        &self,
        submission_id: i64,
        org_id: i64,
        limit: i64,
    ) -> Result<Vec<SimilarSubmission>> {
        let target = match self.get_submission_features(submission_id, org_id).await? {
            Some(f) => f,
            None => return Ok(vec![]),
        };

        let target_embedding: Vec<f64> = match &target.embedding_vector {
            Some(json_vec) => json_vec.0.clone(),
            None => return Ok(vec![]),
        };

        if target_embedding.is_empty() {
            return Ok(vec![]);
        }

        let target_structural = extract_structural_vector(&target);

        let candidates = self.list_features_by_org(org_id, submission_id).await?;

        Ok(rank_by_similarity(
            &target_embedding,
            &target_structural,
            candidates,
            None,
            limit,
        ))
    }

    // -----------------------------------------------------------------------
    // Internal helpers for similarity retrieval
    // -----------------------------------------------------------------------

    /// Fetch features for all submissions of a given problem (same org),
    /// excluding the query submission itself.
    async fn list_features_by_problem(
        &self,
        problem_id: i64,
        org_id: i64,
        exclude_submission_id: i64,
    ) -> Result<Vec<(AnalysisSubmissionFeatures, i64)>> {
        // Join analysis_jobs to get problem_id for each feature row.
        let rows = sqlx::query_as::<_, AnalysisSubmissionFeatures>(
            r#"
            SELECT f.*
            FROM analysis_submission_features f
            JOIN analysis_jobs j ON j.submission_id = f.submission_id
                AND j.organization_id = f.organization_id
            WHERE f.organization_id = $1
              AND j.problem_id = $2
              AND f.submission_id != $3
              AND f.embedding_vector IS NOT NULL
            GROUP BY f.id
            "#,
        )
        .bind(org_id)
        .bind(problem_id)
        .bind(exclude_submission_id)
        .fetch_all(&self.pool)
        .await?;

        // Attach problem_id to each row.
        Ok(rows.into_iter().map(|f| (f, problem_id)).collect())
    }

    /// Fetch features for all submissions in the org, excluding the query.
    async fn list_features_by_org(
        &self,
        org_id: i64,
        exclude_submission_id: i64,
    ) -> Result<Vec<(AnalysisSubmissionFeatures, i64)>> {
        let rows = sqlx::query_as::<_, FeatureWithProblem>(
            r#"
            SELECT f.id, f.submission_id, f.organization_id,
                   f.cyclomatic_complexity, f.lines_of_code, f.token_count,
                   f.function_count, f.nesting_depth, f.has_recursion,
                   f.loop_count, f.avg_loop_nesting,
                   f.distinct_operators, f.distinct_operands, f.halstead_volume,
                   f.embedding_vector, f.created_at,
                   j_latest.problem_id
            FROM analysis_submission_features f
            LEFT JOIN LATERAL (
                SELECT problem_id FROM analysis_jobs
                WHERE submission_id = f.submission_id
                  AND organization_id = f.organization_id
                ORDER BY created_at DESC LIMIT 1
            ) j_latest ON true
            WHERE f.organization_id = $1
              AND f.submission_id != $2
              AND f.embedding_vector IS NOT NULL
            "#,
        )
        .bind(org_id)
        .bind(exclude_submission_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .filter_map(|row| {
                let pid = row.problem_id?;
                let (feat, _) = row.into();
                Some((feat, pid))
            })
            .collect())
    }

    // -----------------------------------------------------------------------
    // Problem recommendations (rule-based)
    // -----------------------------------------------------------------------

    /// Get rule-based problem recommendations for a user after they have
    /// worked on a given problem. The algorithm:
    ///
    /// 1. Queries the user's acceptance rate per difficulty level.
    /// 2. Looks up the current problem's difficulty.
    /// 3. Recommends up to 3 unsolved problems of similar difficulty.
    /// 4. Recommends up to 2 problems at the next difficulty level.
    /// 5. Returns at most 5 recommendations total.
    ///
    /// Results are cached in Redis for 1 hour (TTL 3600s).
    pub async fn get_problem_recommendations(
        &self,
        user_id: uuid::Uuid,
        problem_id: i64,
        org_id: i64,
        redis_pool: Option<&deadpool_redis::Pool>,
    ) -> Result<Vec<ProblemRecommendation>> {
        let cache_key = format!("recommend:{org_id}:{user_id}:{problem_id}");

        // Try Redis cache first.
        if let Some(pool) = redis_pool {
            if let Ok(cached) = Self::read_cache(pool, &cache_key).await {
                if !cached.is_empty() {
                    tracing::debug!(
                        user_id = %user_id,
                        problem_id,
                        "recommendation cache hit"
                    );
                    return Ok(cached);
                }
            }
        }

        // 1. Get the current problem's difficulty.
        let current_difficulty: Option<(String,)> = sqlx::query_as(
            "SELECT COALESCE(difficulty, 'easy') FROM problems WHERE id = $1 AND organization_id = $2",
        )
        .bind(problem_id)
        .bind(org_id)
        .fetch_optional(&self.pool)
        .await?;

        let current_difficulty = match current_difficulty {
            Some((d,)) => d,
            None => return Ok(vec![]),
        };

        // 2. Get user's accuracy per difficulty.
        let stats = sqlx::query_as::<_, UserDifficultyStats>(
            r#"
            SELECT
                COALESCE(p.difficulty, 'easy') AS difficulty,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE s.verdict = 'ac') AS accepted
            FROM submissions s
            JOIN problems p ON p.id = s.problem_id AND p.organization_id = s.organization_id
            WHERE s.user_id = $1 AND s.organization_id = $2
            GROUP BY COALESCE(p.difficulty, 'easy')
            "#,
        )
        .bind(user_id)
        .bind(org_id)
        .fetch_all(&self.pool)
        .await?;

        // 3. Find problems the user has already solved (verdict = 'ac').
        let solved_ids: Vec<i64> = sqlx::query_scalar(
            r#"
            SELECT DISTINCT problem_id
            FROM submissions
            WHERE user_id = $1 AND organization_id = $2 AND verdict = 'ac'
            "#,
        )
        .bind(user_id)
        .bind(org_id)
        .fetch_all(&self.pool)
        .await?;

        // 4. Find problems the user has attempted but not solved.
        let attempted_ids: Vec<i64> = sqlx::query_scalar(
            r#"
            SELECT DISTINCT problem_id
            FROM submissions
            WHERE user_id = $1 AND organization_id = $2 AND verdict IS NOT NULL AND verdict != 'ac'
            "#,
        )
        .bind(user_id)
        .bind(org_id)
        .fetch_all(&self.pool)
        .await?;

        // 5. Recommend similar-difficulty unsolved problems (up to 3).
        let similar_candidates = self
            .fetch_candidate_problems(
                org_id,
                &current_difficulty,
                &solved_ids,
                &attempted_ids,
                3,
            )
            .await?;

        // 6. Recommend next-difficulty problems (up to 2).
        let next_difficulty = next_difficulty_level(&current_difficulty, &stats);
        let next_candidates = self
            .fetch_candidate_problems(
                org_id,
                &next_difficulty,
                &solved_ids,
                &attempted_ids,
                2,
            )
            .await?;

        // 7. Combine and build recommendation objects.
        let mut recommendations = Vec::with_capacity(5);

        for c in &similar_candidates {
            recommendations.push(ProblemRecommendation {
                problem_id: c.id,
                title: c.title.clone(),
                difficulty: c.difficulty.clone(),
                reason: format!(
                    "与当前题目难度相同 ({})，推荐练习以巩固",
                    current_difficulty
                ),
                submission_count: c.submission_count,
            });
        }

        for c in &next_candidates {
            recommendations.push(ProblemRecommendation {
                problem_id: c.id,
                title: c.title.clone(),
                difficulty: c.difficulty.clone(),
                reason: if c.difficulty == current_difficulty {
                    "继续挑战当前难度".to_string()
                } else {
                    format!("尝试更高难度 ({}) 的题目", c.difficulty)
                },
                submission_count: c.submission_count,
            });
        }

        recommendations.truncate(5);

        // Cache the result for 1 hour.
        if let Some(pool) = redis_pool {
            Self::write_cache(pool, &cache_key, &recommendations, 3600).await;
        }

        tracing::info!(
            user_id = %user_id,
            problem_id,
            org_id,
            count = recommendations.len(),
            "generated rule-based recommendations"
        );

        Ok(recommendations)
    }

    /// Fetch candidate problems for recommendation.
    /// Prefers unsolved problems (not attempted at all), then unsolved but attempted.
    /// Excludes already-solved problems.
    async fn fetch_candidate_problems(
        &self,
        org_id: i64,
        difficulty: &str,
        solved_ids: &[i64],
        attempted_ids: &[i64],
        limit: i64,
    ) -> Result<Vec<CandidateProblem>> {
        if limit <= 0 {
            return Ok(vec![]);
        }

        let candidates = sqlx::query_as::<_, CandidateProblem>(
            r#"
            SELECT
                p.id,
                p.title,
                COALESCE(p.difficulty, 'easy') AS difficulty,
                COALESCE(sub_stats.cnt, 0) AS submission_count
            FROM problems p
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS cnt
                FROM submissions s
                WHERE s.problem_id = p.id AND s.organization_id = p.organization_id
            ) sub_stats ON true
            WHERE p.organization_id = $1
              AND COALESCE(p.difficulty, 'easy') = $2
              AND p.visibility IN ('public', 'campus')
              AND p.id != ALL($3::bigint[])
            ORDER BY
                CASE WHEN p.id = ANY($4::bigint[]) THEN 1 ELSE 0 END,
                sub_stats.cnt DESC NULLS LAST,
                p.created_at DESC
            LIMIT $5
            "#,
        )
        .bind(org_id)
        .bind(difficulty)
        .bind(solved_ids)
        .bind(attempted_ids)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(candidates)
    }

    // -----------------------------------------------------------------------
    // Redis cache helpers
    // -----------------------------------------------------------------------

    async fn read_cache(
        pool: &deadpool_redis::Pool,
        key: &str,
    ) -> Result<Vec<ProblemRecommendation>> {
        let mut conn = pool.get().await?;
        let val: Option<String> = deadpool_redis::redis::cmd("GET")
            .arg(key)
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("Redis GET error: {e}"))?;

        match val {
            Some(json_str) => {
                let recs: Vec<ProblemRecommendation> =
                    serde_json::from_str(&json_str).unwrap_or_default();
                Ok(recs)
            }
            None => Ok(vec![]),
        }
    }

    async fn write_cache(
        pool: &deadpool_redis::Pool,
        key: &str,
        recs: &[ProblemRecommendation],
        ttl_secs: i64,
    ) {
        if let Ok(json) = serde_json::to_string(recs) {
            let mut conn = match pool.get().await {
                Ok(c) => c,
                Err(e) => {
                    tracing::warn!(error = %e, "Redis pool get failed for cache write");
                    return;
                }
            };
            let result: Result<(), _> = deadpool_redis::redis::cmd("SETEX")
                .arg(key)
                .arg(ttl_secs)
                .arg(&json)
                .query_async(&mut conn)
                .await;
            if let Err(e) = result {
                tracing::warn!(error = %e, "Redis SETEX failed for recommendation cache");
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Pure functions for similarity computation
// ---------------------------------------------------------------------------

/// Structural feature vector extracted from `AnalysisSubmissionFeatures`.
/// Ordered: [cyclomatic_complexity, lines_of_code, token_count,
///           function_count, nesting_depth, loop_count, avg_loop_nesting,
///           distinct_operators, distinct_operands, halstead_volume]
fn extract_structural_vector(f: &AnalysisSubmissionFeatures) -> Vec<f64> {
    vec![
        f.cyclomatic_complexity.unwrap_or(0.0),
        f.lines_of_code.unwrap_or(0) as f64,
        f.token_count.unwrap_or(0) as f64,
        f.function_count.unwrap_or(0) as f64,
        f.nesting_depth.unwrap_or(0) as f64,
        f.loop_count.unwrap_or(0) as f64,
        f.avg_loop_nesting.unwrap_or(0.0),
        f.distinct_operators.unwrap_or(0) as f64,
        f.distinct_operands.unwrap_or(0) as f64,
        f.halstead_volume.unwrap_or(0.0),
    ]
}

/// Compute cosine similarity between two vectors.
/// Returns 0.0 if either vector is empty or magnitudes are zero.
fn cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    if a.is_empty() || b.is_empty() || a.len() != b.len() {
        return 0.0;
    }

    let dot: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let mag_a: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let mag_b: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();

    if mag_a == 0.0 || mag_b == 0.0 {
        return 0.0;
    }

    (dot / (mag_a * mag_b)).clamp(-1.0, 1.0)
}

/// Normalize a structural vector to [0, 1] range using the target vector
/// as the reference for scale. We use a simple approach: divide each
/// dimension by (max(target_dim, candidate_dim) + epsilon) so the
/// normalized difference is bounded.
///
/// Returns a similarity score in [0, 1] where 1.0 means identical.
fn structural_similarity(target: &[f64], candidate: &[f64]) -> f64 {
    if target.is_empty() || candidate.is_empty() || target.len() != candidate.len() {
        return 0.0;
    }

    let epsilon = 1e-6;
    let mut sum_normalized_diff = 0.0;

    for (t, c) in target.iter().zip(candidate.iter()) {
        let scale = t.abs().max(c.abs()).max(epsilon);
        let diff = (t - c).abs() / scale;
        sum_normalized_diff += diff * diff;
    }

    let rms_distance = (sum_normalized_diff / target.len() as f64).sqrt();

    // Convert distance to similarity: 1 / (1 + distance).
    // RMS distance of 0 → similarity 1.0; large distance → similarity → 0.
    1.0 / (1.0 + rms_distance)
}

/// Score candidates against the target and return top-N sorted by weighted
/// similarity.
fn rank_by_similarity(
    target_embedding: &[f64],
    target_structural: &[f64],
    candidates: Vec<(AnalysisSubmissionFeatures, i64)>,
    problem_id: Option<i64>,
    limit: i64,
) -> Vec<SimilarSubmission> {
    let embedding_weight = 0.6;
    let structural_weight = 0.4;

    let mut scored: Vec<SimilarSubmission> = candidates
        .into_iter()
        .filter_map(|(feat, pid)| {
            let candidate_embedding: Vec<f64> = feat.embedding_vector.as_ref()?.0.clone();
            if candidate_embedding.is_empty() {
                return None;
            }

            let cos_sim = cosine_similarity(target_embedding, &candidate_embedding);
            let candidate_structural = extract_structural_vector(&feat);
            let struct_sim = structural_similarity(target_structural, &candidate_structural);

            // For same-problem search, prefer the actual problem_id.
            // For cross-problem, use the looked-up pid.
            let resolved_pid = problem_id.unwrap_or(pid);

            Some(SimilarSubmission {
                submission_id: feat.submission_id,
                problem_id: resolved_pid,
                similarity_score: cos_sim * embedding_weight + struct_sim * structural_weight,
                embedding_similarity: cos_sim,
                structural_similarity: struct_sim,
                cyclomatic_complexity: feat.cyclomatic_complexity,
                lines_of_code: feat.lines_of_code,
            })
        })
        .collect();

    // Sort descending by similarity_score.
    scored.sort_by(|a, b| {
        b.similarity_score
            .partial_cmp(&a.similarity_score)
            .unwrap_or(Ordering::Equal)
    });

    scored.truncate(limit as usize);
    scored
}

/// Aggregated result for the GET ai-feedback endpoint.
pub struct AiFeedbackResult {
    pub job: AnalysisJob,
    pub card: Option<AnalysisTeachingCard>,
}

/// Determine the next difficulty level based on user's performance.
/// If the user has > 60% acceptance rate at the current level, advance.
/// Otherwise stay at the same level for more practice.
fn next_difficulty_level(current: &str, stats: &[UserDifficultyStats]) -> String {
    let acceptance_rate = stats
        .iter()
        .find(|s| s.difficulty == current)
        .map(|s| {
            if s.total > 0 {
                s.accepted as f64 / s.total as f64
            } else {
                0.0
            }
        })
        .unwrap_or(0.0);

    match current {
        "easy" if acceptance_rate > 0.6 => "medium".to_string(),
        "medium" if acceptance_rate > 0.6 => "hard".to_string(),
        _ => current.to_string(),
    }
}

#[cfg(test)]
mod similarity_tests {
    use super::*;

    #[test]
    fn cosine_similarity_identical_vectors() {
        let v = vec![1.0, 2.0, 3.0];
        let sim = cosine_similarity(&v, &v);
        assert!((sim - 1.0).abs() < 1e-9, "identical vectors should have cosine sim 1.0, got {sim}");
    }

    #[test]
    fn cosine_similarity_orthogonal_vectors() {
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        let sim = cosine_similarity(&a, &b);
        assert!(sim.abs() < 1e-9, "orthogonal vectors should have cosine sim 0.0, got {sim}");
    }

    #[test]
    fn cosine_similarity_opposite_vectors() {
        let a = vec![1.0, 0.0];
        let b = vec![-1.0, 0.0];
        let sim = cosine_similarity(&a, &b);
        assert!((sim - (-1.0)).abs() < 1e-9, "opposite vectors should have cosine sim -1.0, got {sim}");
    }

    #[test]
    fn cosine_similarity_empty_vectors() {
        assert_eq!(cosine_similarity(&[], &[]), 0.0);
    }

    #[test]
    fn cosine_similarity_zero_magnitude() {
        assert_eq!(cosine_similarity(&[0.0, 0.0], &[1.0, 2.0]), 0.0);
    }

    #[test]
    fn cosine_similarity_mismatched_lengths() {
        assert_eq!(cosine_similarity(&[1.0], &[1.0, 2.0]), 0.0);
    }

    #[test]
    fn structural_similarity_identical() {
        let v = vec![10.0, 50.0, 200.0, 3.0, 2.0, 1.0, 0.5, 15.0, 20.0, 100.0];
        let sim = structural_similarity(&v, &v);
        assert!((sim - 1.0).abs() < 1e-9, "identical structures should have sim 1.0, got {sim}");
    }

    #[test]
    fn structural_similarity_different() {
        let a = vec![1.0, 10.0, 50.0, 1.0, 0.0, 0.0, 0.0, 5.0, 8.0, 20.0];
        let b = vec![20.0, 500.0, 2000.0, 15.0, 8.0, 10.0, 3.0, 30.0, 50.0, 500.0];
        let sim = structural_similarity(&a, &b);
        assert!(sim < 0.6, "very different structures should have low sim, got {sim}");
        assert!(sim < 1.0, "different structures should not be identical");
    }

    #[test]
    fn structural_similarity_empty() {
        assert_eq!(structural_similarity(&[], &[]), 0.0);
    }

    #[test]
    fn rank_by_similarity_sorts_descending() {
        let target_emb = vec![1.0, 0.0, 0.0];
        let target_struct = vec![10.0, 50.0, 20.0, 3.0, 2.0, 1.0, 0.5, 15.0, 20.0, 100.0];

        let now = chrono::Utc::now();
        let candidates = vec![
            // Cosine sim = 1.0 (identical direction)
            make_candidate(1, 100, vec![1.0, 0.0, 0.0], 10.0, 50, now),
            // Cosine sim = 0.0 (orthogonal)
            make_candidate(2, 100, vec![0.0, 1.0, 0.0], 10.0, 50, now),
            // Cosine sim = -1.0 (opposite)
            make_candidate(3, 100, vec![-1.0, 0.0, 0.0], 10.0, 50, now),
        ];

        let results = rank_by_similarity(&target_emb, &target_struct, candidates, Some(100), 10);

        assert_eq!(results.len(), 3, "all candidates have embeddings, should get 3 results");
        assert!(results[0].similarity_score > results[1].similarity_score);
        assert!(results[1].similarity_score > results[2].similarity_score);
        assert_eq!(results[0].submission_id, 1, "identical embedding should rank first");
    }

    #[test]
    fn rank_by_similarity_respects_limit() {
        let target_emb = vec![1.0, 0.0];
        let target_struct = vec![1.0; 10];
        let now = chrono::Utc::now();

        let candidates: Vec<_> = (1..=5)
            .map(|i| make_candidate(i, 100, vec![1.0, 0.0], 5.0, 10, now))
            .collect();

        let results = rank_by_similarity(&target_emb, &target_struct, candidates, Some(100), 3);
        assert_eq!(results.len(), 3, "should respect limit of 3");
    }

    #[test]
    fn rank_by_similarity_skips_no_embedding() {
        let target_emb = vec![1.0, 0.0];
        let target_struct = vec![1.0; 10];
        let now = chrono::Utc::now();

        let candidates = vec![
            make_candidate(1, 100, vec![1.0, 0.0], 5.0, 10, now),
            make_candidate_no_embedding(2, 100, now),
        ];

        let results = rank_by_similarity(&target_emb, &target_struct, candidates, Some(100), 10);
        assert_eq!(results.len(), 1, "candidate without embedding should be skipped");
    }

    #[test]
    fn cosine_similarity_known_value() {
        // a = [1, 2, 3], b = [4, 5, 6]
        // dot = 1*4 + 2*5 + 3*6 = 32
        // |a| = sqrt(14), |b| = sqrt(77)
        // cos = 32 / (sqrt(14) * sqrt(77)) = 32 / sqrt(1078) ≈ 0.9746
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![4.0, 5.0, 6.0];
        let sim = cosine_similarity(&a, &b);
        let expected = 32.0 / (14.0_f64.sqrt() * 77.0_f64.sqrt());
        assert!(
            (sim - expected).abs() < 1e-9,
            "expected {expected}, got {sim}"
        );
    }

    #[test]
    fn weighted_combination_verifies_weights() {
        // Use vectors where embedding cosine ≠ structural similarity
        // so we can verify the exact weighted combination.
        let target_emb = vec![1.0, 0.0];
        let target_struct = vec![10.0, 50.0, 20.0, 3.0, 2.0, 1.0, 0.5, 15.0, 20.0, 100.0];

        // Candidate embedding is orthogonal to target → cosine = 0.0
        // Candidate structural is identical to target → structural = 1.0
        let candidate_struct = target_struct.clone();
        let now = chrono::Utc::now();
        let candidates = vec![make_candidate_with_struct(
            1,
            100,
            vec![0.0, 1.0], // orthogonal embedding → cos = 0.0
            &candidate_struct,
            now,
        )];

        let results = rank_by_similarity(&target_emb, &target_struct, candidates, Some(100), 10);
        assert_eq!(results.len(), 1);
        let r = &results[0];

        // embedding_sim should be ~0.0, structural_sim should be ~1.0
        assert!(r.embedding_similarity.abs() < 1e-9, "embedding should be ~0.0, got {}", r.embedding_similarity);
        assert!((r.structural_similarity - 1.0).abs() < 1e-9, "structural should be ~1.0, got {}", r.structural_similarity);

        // Weighted: 0.0 * 0.6 + 1.0 * 0.4 = 0.4
        let expected_score = 0.0 * 0.6 + 1.0 * 0.4;
        assert!(
            (r.similarity_score - expected_score).abs() < 1e-9,
            "weighted score should be {expected_score}, got {}",
            r.similarity_score
        );
    }

    #[test]
    fn no_embedding_returns_empty_gracefully() {
        // When target has no embedding, the DB-level queries would return None.
        // We test the rank_by_similarity function with an empty candidates list
        // (simulating what happens when no target embedding exists).
        let target_struct = vec![10.0; 10];
        let results = rank_by_similarity(&[], &target_struct, vec![], None, 10);
        assert!(results.is_empty(), "no embedding should yield empty results");
    }

    #[test]
    fn structural_similarity_symmetric() {
        let a = vec![10.0, 50.0, 200.0, 3.0, 2.0, 1.0, 0.5, 15.0, 20.0, 100.0];
        let b = vec![15.0, 60.0, 180.0, 5.0, 3.0, 2.0, 1.0, 20.0, 25.0, 120.0];
        let sim_ab = structural_similarity(&a, &b);
        let sim_ba = structural_similarity(&b, &a);
        assert!(
            (sim_ab - sim_ba).abs() < 1e-9,
            "structural similarity should be symmetric: ab={sim_ab}, ba={sim_ba}"
        );
    }

    #[test]
    fn structural_similarity_mismatched_lengths() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![1.0, 2.0];
        assert_eq!(structural_similarity(&a, &b), 0.0);
    }

    fn make_candidate_with_struct(
        submission_id: i64,
        problem_id: i64,
        embedding: Vec<f64>,
        structural: &[f64],
        created_at: chrono::DateTime<chrono::Utc>,
    ) -> (AnalysisSubmissionFeatures, i64) {
        (
            AnalysisSubmissionFeatures {
                id: submission_id * 100,
                submission_id,
                organization_id: 1,
                cyclomatic_complexity: Some(structural[0]),
                lines_of_code: Some(structural[1] as i32),
                token_count: Some(structural[2] as i32),
                function_count: Some(structural[3] as i32),
                nesting_depth: Some(structural[4] as i32),
                has_recursion: Some(false),
                loop_count: Some(structural[5] as i32),
                avg_loop_nesting: Some(structural[6]),
                distinct_operators: Some(structural[7] as i32),
                distinct_operands: Some(structural[8] as i32),
                halstead_volume: Some(structural[9]),
                embedding_vector: Some(sqlx::types::Json(embedding)),
                created_at,
            },
            problem_id,
        )
    }

    // Helper to build a candidate feature row with a known embedding.
    fn make_candidate(
        submission_id: i64,
        problem_id: i64,
        embedding: Vec<f64>,
        complexity: f64,
        loc: i32,
        created_at: chrono::DateTime<chrono::Utc>,
    ) -> (AnalysisSubmissionFeatures, i64) {
        (
            AnalysisSubmissionFeatures {
                id: submission_id * 100,
                submission_id,
                organization_id: 1,
                cyclomatic_complexity: Some(complexity),
                lines_of_code: Some(loc),
                token_count: Some(loc * 5),
                function_count: Some(1),
                nesting_depth: Some(2),
                has_recursion: Some(false),
                loop_count: Some(0),
                avg_loop_nesting: Some(0.0),
                distinct_operators: Some(10),
                distinct_operands: Some(15),
                halstead_volume: Some(100.0),
                embedding_vector: Some(sqlx::types::Json(embedding)),
                created_at,
            },
            problem_id,
        )
    }

    fn make_candidate_no_embedding(
        submission_id: i64,
        problem_id: i64,
        created_at: chrono::DateTime<chrono::Utc>,
    ) -> (AnalysisSubmissionFeatures, i64) {
        (
            AnalysisSubmissionFeatures {
                id: submission_id * 100,
                submission_id,
                organization_id: 1,
                cyclomatic_complexity: Some(5.0),
                lines_of_code: Some(10),
                token_count: Some(50),
                function_count: Some(1),
                nesting_depth: Some(2),
                has_recursion: Some(false),
                loop_count: Some(0),
                avg_loop_nesting: Some(0.0),
                distinct_operators: Some(10),
                distinct_operands: Some(15),
                halstead_volume: Some(100.0),
                embedding_vector: None,
                created_at,
            },
            problem_id,
        )
    }

    // -----------------------------------------------------------------------
    // next_difficulty_level tests
    // -----------------------------------------------------------------------

    #[test]
    fn next_difficulty_easy_high_acceptance_advances() {
        let stats = vec![UserDifficultyStats {
            difficulty: "easy".to_string(),
            total: 10,
            accepted: 7, // 70% > 60%
        }];
        assert_eq!(next_difficulty_level("easy", &stats), "medium");
    }

    #[test]
    fn next_difficulty_easy_low_acceptance_stays() {
        let stats = vec![UserDifficultyStats {
            difficulty: "easy".to_string(),
            total: 10,
            accepted: 5, // 50% < 60%
        }];
        assert_eq!(next_difficulty_level("easy", &stats), "easy");
    }

    #[test]
    fn next_difficulty_medium_high_acceptance_advances() {
        let stats = vec![UserDifficultyStats {
            difficulty: "medium".to_string(),
            total: 10,
            accepted: 8, // 80% > 60%
        }];
        assert_eq!(next_difficulty_level("medium", &stats), "hard");
    }

    #[test]
    fn next_difficulty_hard_stays() {
        let stats = vec![UserDifficultyStats {
            difficulty: "hard".to_string(),
            total: 10,
            accepted: 9, // 90% > 60%, but hard is max
        }];
        assert_eq!(next_difficulty_level("hard", &stats), "hard");
    }

    #[test]
    fn next_difficulty_no_stats_defaults_to_current() {
        let stats: Vec<UserDifficultyStats> = vec![];
        assert_eq!(next_difficulty_level("medium", &stats), "medium");
    }

    #[test]
    fn next_difficulty_zero_total_stays() {
        let stats = vec![UserDifficultyStats {
            difficulty: "easy".to_string(),
            total: 0,
            accepted: 0,
        }];
        assert_eq!(next_difficulty_level("easy", &stats), "easy");
    }
}
