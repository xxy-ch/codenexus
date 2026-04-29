//! Database operations for the llm-worker.
//!
//! Provides typed queries for:
//! - Fetching submission source code and language
//! - Fetching problem metadata
//! - Inserting teaching cards
//! - Updating analysis_jobs with LLM usage metrics and status

use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Query result types
// ---------------------------------------------------------------------------

/// Submission code + language returned by `get_submission_code`.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct SubmissionCodeRow {
    pub code: String,
    pub language: String,
}

/// Problem metadata returned by `get_problem_info`.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProblemInfo {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub difficulty: Option<String>,
    pub time_limit_ms: i32,
    pub memory_limit_kb: i32,
}

/// Analysis job row (mirrors the post-migration schema including LLM usage columns).
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AnalysisJobRow {
    pub id: i64,
    pub submission_id: i64,
    pub problem_id: i64,
    pub user_id: Uuid,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
    pub contest_id: Option<i64>,
    pub status: String,
    pub error_message: Option<String>,
    pub llm_model: Option<String>,
    pub prompt_tokens: Option<i32>,
    pub completion_tokens: Option<i32>,
    pub latency_ms: Option<i32>,
    pub retry_count: Option<i32>,
    pub max_retries: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Parameters for `insert_teaching_card`.
#[derive(Debug, Clone)]
pub struct NewTeachingCard {
    pub problem_id: i64,
    pub organization_id: i64,
    pub card_type: String,
    pub title: String,
    pub content: serde_json::Value,
    pub source_cluster_ids: Vec<i64>,
}

/// LLM usage metrics to record on job completion.
#[derive(Debug, Clone)]
pub struct LlmUsage {
    pub model: String,
    pub prompt_tokens: i32,
    pub completion_tokens: i32,
    pub latency_ms: i32,
}

// ---------------------------------------------------------------------------
// Database functions
// ---------------------------------------------------------------------------

/// Fetch a submission's source code and language by its ID.
pub async fn get_submission_code(
    pool: &PgPool,
    submission_id: i64,
) -> Result<Option<SubmissionCodeRow>> {
    let row = sqlx::query_as::<_, SubmissionCodeRow>(
        "SELECT code, language FROM submissions WHERE id = $1",
    )
    .bind(submission_id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

/// Fetch problem metadata by its ID.
pub async fn get_problem_info(
    pool: &PgPool,
    problem_id: i64,
) -> Result<Option<ProblemInfo>> {
    let row = sqlx::query_as::<_, ProblemInfo>(
        "SELECT id, title, description, difficulty, time_limit_ms, memory_limit_kb \
         FROM problems WHERE id = $1",
    )
    .bind(problem_id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

/// Fetch a pending analysis job by ID (for claim-and-process).
pub async fn get_analysis_job(
    pool: &PgPool,
    job_id: i64,
) -> Result<Option<AnalysisJobRow>> {
    let row = sqlx::query_as::<_, AnalysisJobRow>(
        "SELECT id, submission_id, problem_id, user_id, organization_id, \
                campus_id, grade_id, contest_id, status, error_message, \
                llm_model, prompt_tokens, completion_tokens, latency_ms, \
                retry_count, max_retries, \
                created_at, updated_at \
         FROM analysis_jobs WHERE id = $1",
    )
    .bind(job_id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

/// Insert a teaching card produced by LLM analysis.
pub async fn insert_teaching_card(pool: &PgPool, card: &NewTeachingCard) -> Result<i64> {
    let row = sqlx::query_scalar::<_, i64>(
        "INSERT INTO analysis_teaching_cards \
             (problem_id, organization_id, card_type, title, content, source_cluster_ids) \
         VALUES ($1, $2, $3, $4, $5, $6) \
         RETURNING id",
    )
    .bind(card.problem_id)
    .bind(card.organization_id)
    .bind(&card.card_type)
    .bind(&card.title)
    .bind(sqlx::types::Json(&card.content))
    .bind(&card.source_cluster_ids)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

/// Update an analysis job's status with optional LLM usage metrics.
///
/// When `usage` is `Some`, the `llm_model`, `prompt_tokens`, `completion_tokens`,
/// and `latency_ms` columns are written alongside the new status. When `None`,
/// only the status (and optional error_message) are updated.
pub async fn update_job_with_usage(
    pool: &PgPool,
    job_id: i64,
    status: &str,
    error_message: Option<&str>,
    usage: Option<&LlmUsage>,
) -> Result<()> {
    let updated_at = Utc::now();
    match usage {
        Some(u) => {
            sqlx::query(
                "UPDATE analysis_jobs \
                 SET status = $1, error_message = $2, \
                     llm_model = $3, prompt_tokens = $4, \
                     completion_tokens = $5, latency_ms = $6, \
                     updated_at = $7 \
                 WHERE id = $8",
            )
            .bind(status)
            .bind(error_message)
            .bind(&u.model)
            .bind(u.prompt_tokens)
            .bind(u.completion_tokens)
            .bind(u.latency_ms)
            .bind(updated_at)
            .bind(job_id)
            .execute(pool)
            .await?;
        }
        None => {
            sqlx::query(
                "UPDATE analysis_jobs \
                 SET status = $1, error_message = $2, updated_at = $3 \
                 WHERE id = $4",
            )
            .bind(status)
            .bind(error_message)
            .bind(updated_at)
            .bind(job_id)
            .execute(pool)
            .await?;
        }
    }
    Ok(())
}

/// Claim a pending job by atomically setting its status from "pending" to "processing".
///
/// Returns `Ok(Some(job))` if the claim succeeded, `Ok(None)` if the job was
/// already claimed by another worker (or doesn't exist).
pub async fn claim_job(pool: &PgPool, job_id: i64) -> Result<Option<AnalysisJobRow>> {
    let row = sqlx::query_as::<_, AnalysisJobRow>(
        "UPDATE analysis_jobs \
         SET status = 'processing', updated_at = $1 \
         WHERE id = $2 AND status = 'pending' \
         RETURNING id, submission_id, problem_id, user_id, organization_id, \
                   campus_id, grade_id, contest_id, status, error_message, \
                   llm_model, prompt_tokens, completion_tokens, latency_ms, \
                   retry_count, max_retries, \
                   created_at, updated_at",
    )
    .bind(Utc::now())
    .bind(job_id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

/// Increment the retry_count and reset a failed job back to "pending" for retry.
///
/// Returns `Ok(true)` if the row was updated, `Ok(false)` if retry_count already
/// equals max_retries (job will not be retried).
pub async fn retry_job(pool: &PgPool, job_id: i64) -> Result<bool> {
    let updated = sqlx::query(
        "UPDATE analysis_jobs \
         SET status = 'pending', \
             retry_count = COALESCE(retry_count, 0) + 1, \
             updated_at = $1 \
         WHERE id = $2 \
           AND COALESCE(retry_count, 0) < COALESCE(max_retries, 3)",
    )
    .bind(Utc::now())
    .bind(job_id)
    .execute(pool)
    .await?;
    Ok(updated.rows_affected() > 0)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_teaching_card_fields_match_expectation() {
        let card = NewTeachingCard {
            problem_id: 1,
            organization_id: 1,
            card_type: "insight".to_string(),
            title: "Common Off-by-One".to_string(),
            content: serde_json::json!({"summary": "test"}),
            source_cluster_ids: vec![10, 20],
        };
        assert_eq!(card.problem_id, 1);
        assert_eq!(card.card_type, "insight");
        assert_eq!(card.source_cluster_ids.len(), 2);
    }

    #[test]
    fn llm_usage_stores_model_and_metrics() {
        let usage = LlmUsage {
            model: "deepseek-chat".to_string(),
            prompt_tokens: 500,
            completion_tokens: 200,
            latency_ms: 1200,
        };
        assert_eq!(usage.model, "deepseek-chat");
        assert_eq!(usage.prompt_tokens, 500);
        assert_eq!(usage.completion_tokens, 200);
        assert_eq!(usage.latency_ms, 1200);
    }
}
