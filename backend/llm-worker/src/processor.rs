//! Job processing logic for the llm-worker.
//!
//! Orchestrates the flow: fetch submission + problem → build prompt → call LLM → parse result → write teaching card.

use anyhow::Result;
use sqlx::PgPool;
use tracing::{error, info, warn};
use crate::config::WorkerConfig;
use crate::db;
use crate::llm_client::{ChatMessage, LlmClient, LlmError};
use crate::prompts::{self, CodeReviewOutput};

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

    // 4. Build the prompt messages
    let messages = prompts::code_review_prompt(
        &problem.title,
        &problem.description,
        problem.difficulty.as_deref(),
        &submission.language,
        &submission.code,
    );

    // Convert prompt messages to ChatMessage for the LLM client
    let chat_messages: Vec<ChatMessage> = messages
        .into_iter()
        .map(|m| ChatMessage {
            role: m.role,
            content: m.content,
        })
        .collect();

    // 5. Call LLM with structured output parsing
    let client = LlmClient::from_config(config)?;
    match client.chat_completion_structured::<CodeReviewOutput>(chat_messages, "").await {
        Ok((review, result)) => {
            info!(
                job_id,
                model = %result.model,
                prompt_tokens = result.usage.prompt_tokens,
                completion_tokens = result.usage.completion_tokens,
                latency_ms = result.latency.as_millis() as u64,
                endpoint_used = %result.endpoint_used,
                "LLM call succeeded"
            );

            // 6. Serialize the structured output for storage
            let content = serde_json::to_value(&review).unwrap_or_else(|_| {
                serde_json::json!({ "raw_content": "serialization error" })
            });

            // 7. Insert teaching card
            let card = db::NewTeachingCard {
                problem_id: job.problem_id,
                organization_id: job.organization_id,
                card_type: "code_review".to_string(),
                title: review.title.clone(),
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
        Err(LlmError::Http { .. }) | Err(LlmError::Api { .. }) | Err(LlmError::AllEndpointsFailed { .. }) => {
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
    // Note: process_job requires a real PgPool and LLM endpoint.
    // End-to-end testing is covered by integration tests with wiremock.
    // The function signature is validated by the compiler through lib.rs exports.
}
