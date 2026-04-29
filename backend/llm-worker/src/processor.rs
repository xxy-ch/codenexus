//! Job processing logic for the llm-worker.
//!
//! Orchestrates the flow: fetch submission + problem → build prompt → call LLM → parse result → write teaching card.

use anyhow::Result;
use sqlx::PgPool;
use tracing::{error, info, warn};
use crate::config::WorkerConfig;
use crate::db;
use crate::llm_client::{LlmClient, LlmError};
use crate::prompts;

/// Process a single analysis job from claim to completion.
///
/// Returns `Ok(())` on success or permanent failure; returns `Err` for
/// transient failures that warrant a retry.
pub async fn process_job(pool: &PgPool, config: &WorkerConfig, job_id: i64) -> Result<()> {
    // 1. Claim the job atomically
    let job = db::claim_job(pool, job_id)
        .await?
        .ok_or_else(|| anyhow::anyhow!("job {job_id} not claimable (missing or not pending)"))?;

    info!(job_id, "claimed analysis job");

    // 2. Fetch submission code
    let submission = db::get_submission_code(pool, job.submission_id)
        .await?
        .ok_or_else(|| {
            anyhow::anyhow!("submission {} not found for job {job_id}", job.submission_id)
        })?;

    // 3. Fetch problem info
    let problem = db::get_problem_info(pool, job.problem_id)
        .await?
        .ok_or_else(|| {
            anyhow::anyhow!("problem {} not found for job {job_id}", job.problem_id)
        })?;

    // 4. Build the prompt
    let system = prompts::system_prompt();
    let user_prompt = prompts::code_review_prompt(
        &problem.title,
        &problem.description,
        problem.difficulty.as_deref(),
        &submission.language,
        &submission.code,
    );

    // 5. Call LLM
    let client = LlmClient::from_config(config)?;
    match client.chat(&system, &user_prompt).await {
        Ok(result) => {
            info!(
                job_id,
                model = %result.model,
                prompt_tokens = result.usage.prompt_tokens,
                completion_tokens = result.usage.completion_tokens,
                latency_ms = result.latency.as_millis() as u64,
                "LLM call succeeded"
            );

            // 6. Parse the response as JSON
            let content: serde_json::Value = match serde_json::from_str(&result.content) {
                Ok(v) => v,
                Err(e) => {
                    warn!(job_id, error = %e, "LLM output is not valid JSON, wrapping as raw content");
                    serde_json::json!({ "raw_content": result.content })
                }
            };

            // 7. Insert teaching card
            let title = content
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("Code Analysis")
                .to_string();

            let card = db::NewTeachingCard {
                problem_id: job.problem_id,
                organization_id: job.organization_id,
                card_type: "code_review".to_string(),
                title,
                content,
                source_cluster_ids: vec![],
            };

            if let Err(e) = db::insert_teaching_card(pool, &card).await {
                error!(job_id, error = %e, "failed to insert teaching card");
            }

            // 8. Mark job completed with usage metrics
            let usage = db::LlmUsage {
                model: result.model,
                prompt_tokens: result.usage.prompt_tokens,
                completion_tokens: result.usage.completion_tokens,
                latency_ms: result.latency.as_millis() as i32,
            };
            db::update_job_with_usage(pool, job_id, "completed", None, Some(&usage)).await?;

            Ok(())
        }
        Err(LlmError::Http { .. }) | Err(LlmError::Api { .. }) => {
            // Transient error — mark as failed and retry
            warn!(job_id, "LLM call failed with transient error, scheduling retry");
            let retried = db::retry_job(pool, job_id).await?;
            if !retried {
                db::update_job_with_usage(pool, job_id, "failed", Some("max retries exceeded"), None)
                    .await?;
            }
            Err(anyhow::anyhow!("LLM call failed, retry scheduled"))
        }
        Err(e) => {
            // Permanent error (malformed response, etc.)
            error!(job_id, error = %e, "LLM call failed with permanent error");
            db::update_job_with_usage(
                pool,
                job_id,
                "failed",
                Some(&e.to_string()),
                None,
            )
            .await?;
            Ok(())
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // Note: process_job requires a real PgPool and LLM endpoint.
    // End-to-end testing is covered by integration tests with wiremock.
    // The function signature is validated by the compiler through lib.rs exports.
}
