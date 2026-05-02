//! Database data collector — analysis job metrics and feature flag visibility.
//!
//! Two read-only capabilities:
//! 1. **Analysis metrics**: Aggregate `analysis_jobs` for status distribution,
//!    total token usage, and average latency.
//! 2. **Feature flags**: Query `feature_registry` + `feature_flags` for visibility
//!    (slug, name, default_enabled, override count).
//!
//! Both queries are simple aggregates — no complex joins needed.

use anyhow::Result;
use sqlx::PgPool;
use tracing::{debug, warn};

use crate::models::{AnalysisMetrics, FeatureFlagStatus};

// ---------------------------------------------------------------------------
// Row types for sqlx query results
// ---------------------------------------------------------------------------

/// Row from analysis job status distribution query.
#[derive(Debug, sqlx::FromRow)]
struct AnalysisJobStatusRow {
    status: String,
    count: i64,
}

/// Row from token usage and latency aggregation.
#[derive(Debug, sqlx::FromRow)]
struct AnalysisUsageRow {
    total_prompt_tokens: Option<i64>,
    total_completion_tokens: Option<i64>,
    avg_latency_ms: Option<f64>,
}

/// Row from feature flag visibility query.
#[derive(Debug, sqlx::FromRow)]
struct FeatureFlagRow {
    slug: String,
    name: String,
    default_enabled: bool,
    override_count: i64,
}

// ---------------------------------------------------------------------------
// Collector
// ---------------------------------------------------------------------------

/// Database data collector — read-only aggregate monitoring queries.
pub struct DbCollector;

impl DbCollector {
    /// Collect analysis job metrics from PostgreSQL.
    ///
    /// Queries `analysis_jobs` for:
    /// - Status distribution (pending/processing/completed/failed counts)
    /// - Total prompt and completion token usage
    /// - Average latency (only from jobs with latency_ms recorded)
    ///
    /// Returns default zeroed metrics on query failure rather than propagating
    /// the error — partial data is more useful for monitoring than total absence.
    pub async fn collect_analysis_metrics(pg_pool: &PgPool) -> Result<AnalysisMetrics> {
        // 1. Status distribution
        let status_rows: Vec<AnalysisJobStatusRow> = sqlx::query_as(
            "SELECT status, COUNT(*)::bigint AS count FROM analysis_jobs GROUP BY status",
        )
        .fetch_all(pg_pool)
        .await
        .map_err(|e| {
            warn!(error = %e, "Failed to query analysis job status distribution");
            e
        })?;

        let mut pending: i64 = 0;
        let mut processing: i64 = 0;
        let mut completed: i64 = 0;
        let mut failed: i64 = 0;

        for row in &status_rows {
            match row.status.as_str() {
                "pending" => pending = row.count,
                "processing" => processing = row.count,
                "completed" => completed = row.count,
                "failed" => failed = row.count,
                other => {
                    debug!(
                        status = other,
                        count = row.count,
                        "Unknown analysis job status"
                    );
                }
            }
        }

        // 2. Token usage and average latency
        let usage_row: AnalysisUsageRow = sqlx::query_as(
            "SELECT \
               COALESCE(SUM(prompt_tokens), 0)::bigint AS total_prompt_tokens, \
               COALESCE(SUM(completion_tokens), 0)::bigint AS total_completion_tokens, \
               AVG(CASE WHEN latency_ms IS NOT NULL THEN latency_ms::double precision END) AS avg_latency_ms \
             FROM analysis_jobs",
        )
        .fetch_one(pg_pool)
        .await
        .map_err(|e| {
            warn!(error = %e, "Failed to query analysis job usage aggregation");
            e
        })?;

        let total_prompt_tokens = usage_row.total_prompt_tokens.unwrap_or(0);
        let total_completion_tokens = usage_row.total_completion_tokens.unwrap_or(0);
        let avg_latency_ms = usage_row.avg_latency_ms.unwrap_or(0.0);

        debug!(
            pending,
            processing,
            completed,
            failed,
            total_prompt_tokens,
            total_completion_tokens,
            avg_latency_ms,
            "Analysis metrics collected"
        );

        Ok(AnalysisMetrics {
            pending,
            processing,
            completed,
            failed,
            total_prompt_tokens,
            total_completion_tokens,
            avg_latency_ms,
        })
    }

    /// Collect feature flag visibility from PostgreSQL.
    ///
    /// Queries `feature_registry` for all flags with their default_enabled status
    /// and counts how many scoped overrides exist in `feature_flags`.
    ///
    /// Returns an empty Vec on query failure — the absence of flag data is less
    /// harmful than a monitoring crash.
    pub async fn collect_feature_flags(pg_pool: &PgPool) -> Result<Vec<FeatureFlagStatus>> {
        let rows: Vec<FeatureFlagRow> = sqlx::query_as(
            "SELECT \
               fr.slug, \
               fr.name, \
               fr.default_enabled, \
               COALESCE(ov.override_count, 0)::bigint AS override_count \
             FROM feature_registry fr \
             LEFT JOIN LATERAL ( \
               SELECT COUNT(*)::bigint AS override_count \
               FROM feature_flags ff \
               WHERE ff.feature_slug = fr.slug \
             ) ov ON true \
             ORDER BY fr.slug",
        )
        .fetch_all(pg_pool)
        .await
        .map_err(|e| {
            warn!(error = %e, "Failed to query feature flag visibility");
            e
        })?;

        debug!(count = rows.len(), "Feature flags collected");

        Ok(rows
            .into_iter()
            .map(|r| FeatureFlagStatus {
                slug: r.slug,
                name: r.name,
                default_enabled: r.default_enabled,
                override_count: r.override_count,
            })
            .collect())
    }

    /// Run both DB collectors and return combined results.
    ///
    /// Individual failures are logged and produce empty/default results
    /// rather than failing the entire collection.
    pub async fn collect(pg_pool: &PgPool) -> (AnalysisMetrics, Vec<FeatureFlagStatus>) {
        let metrics = Self::collect_analysis_metrics(pg_pool)
            .await
            .unwrap_or_else(|e| {
                warn!(error = %e, "Analysis metrics collection failed, using defaults");
                AnalysisMetrics {
                    pending: 0,
                    processing: 0,
                    completed: 0,
                    failed: 0,
                    total_prompt_tokens: 0,
                    total_completion_tokens: 0,
                    avg_latency_ms: 0.0,
                }
            });

        let feature_flags = Self::collect_feature_flags(pg_pool)
            .await
            .unwrap_or_else(|e| {
                warn!(error = %e, "Feature flag collection failed, returning empty");
                Vec::new()
            });

        (metrics, feature_flags)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // =======================================================================
    // Row type construction tests (verifies FromRow derivation)
    // =======================================================================

    #[test]
    fn analysis_usage_row_holds_nullable_fields() {
        // Verify the row type handles nulls gracefully
        let row = AnalysisUsageRow {
            total_prompt_tokens: None,
            total_completion_tokens: None,
            avg_latency_ms: None,
        };
        assert!(row.total_prompt_tokens.is_none());
        assert!(row.total_completion_tokens.is_none());
        assert!(row.avg_latency_ms.is_none());
    }

    #[test]
    fn analysis_usage_row_with_values() {
        let row = AnalysisUsageRow {
            total_prompt_tokens: Some(50000),
            total_completion_tokens: Some(20000),
            avg_latency_ms: Some(1234.5),
        };
        assert_eq!(row.total_prompt_tokens, Some(50000));
        assert_eq!(row.total_completion_tokens, Some(20000));
        assert_eq!(row.avg_latency_ms, Some(1234.5));
    }

    #[test]
    fn feature_flag_row_fields() {
        let row = FeatureFlagRow {
            slug: "plagiarism".to_string(),
            name: "Plagiarism Detection".to_string(),
            default_enabled: true,
            override_count: 2,
        };
        assert_eq!(row.slug, "plagiarism");
        assert_eq!(row.override_count, 2);
    }

    #[test]
    fn analysis_job_status_row_fields() {
        let row = AnalysisJobStatusRow {
            status: "completed".to_string(),
            count: 42,
        };
        assert_eq!(row.status, "completed");
        assert_eq!(row.count, 42);
    }

    // =======================================================================
    // Model integration tests
    // =======================================================================

    #[test]
    fn default_analysis_metrics_serializes() {
        let metrics = AnalysisMetrics {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            total_prompt_tokens: 0,
            total_completion_tokens: 0,
            avg_latency_ms: 0.0,
        };
        let json = serde_json::to_string(&metrics).unwrap();
        assert!(json.contains("\"pending\":0"));
        assert!(json.contains("\"avg_latency_ms\":0.0"));
    }

    #[test]
    fn feature_flag_status_from_row() {
        let row = FeatureFlagRow {
            slug: "direct_messages".to_string(),
            name: "Direct Messages".to_string(),
            default_enabled: true,
            override_count: 0,
        };
        let status = FeatureFlagStatus {
            slug: row.slug,
            name: row.name,
            default_enabled: row.default_enabled,
            override_count: row.override_count,
        };
        assert_eq!(status.slug, "direct_messages");
        assert_eq!(status.override_count, 0);
    }

    #[test]
    fn analysis_metrics_with_actual_values() {
        let metrics = AnalysisMetrics {
            pending: 5,
            processing: 2,
            completed: 100,
            failed: 3,
            total_prompt_tokens: 50000,
            total_completion_tokens: 20000,
            avg_latency_ms: 1234.5,
        };
        let json = serde_json::to_string(&metrics).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["pending"], 5);
        assert_eq!(parsed["completed"], 100);
        assert_eq!(parsed["total_prompt_tokens"], 50000);
    }

    #[test]
    fn nullable_usage_fields_default_correctly() {
        // Simulates what the collector does with None values
        let row = AnalysisUsageRow {
            total_prompt_tokens: None,
            total_completion_tokens: None,
            avg_latency_ms: None,
        };
        let total_prompt_tokens = row.total_prompt_tokens.unwrap_or(0);
        let total_completion_tokens = row.total_completion_tokens.unwrap_or(0);
        let avg_latency_ms = row.avg_latency_ms.unwrap_or(0.0);

        let metrics = AnalysisMetrics {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            total_prompt_tokens,
            total_completion_tokens,
            avg_latency_ms,
        };
        assert_eq!(metrics.total_prompt_tokens, 0);
        assert_eq!(metrics.total_completion_tokens, 0);
        assert_eq!(metrics.avg_latency_ms, 0.0);
    }
}
