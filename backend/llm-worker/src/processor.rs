//! Job processing logic for the llm-worker.
//!
//! Orchestrates the flow: fetch submission + problem → build prompt → call LLM →
//! parse result → write teaching card → update job status.
//!
//! Error handling contract:
//! - **Transient LLM failures** (Http, Api, AllEndpointsFailed): mark job for retry, return Err
//! - **JSON parse failures**: record raw LLM response in error_message, mark as permanently failed
//! - **DB failures** (card insert, status update): return Err — message is NOT ACKed, stays in PEL

use crate::config::WorkerConfig;
use crate::db;
use crate::llm_client::{ChatMessage, LlmClient, LlmError};
use crate::prompts::{self, CodeReviewOutput, TeachingCardOutput};
use anyhow::Result;
use sqlx::PgPool;
use tracing::{error, info, warn};

/// Classify an LLM error as transient (retryable) or permanent.
///
/// Transient errors warrant a retry with backoff. Permanent errors mean the
/// LLM response itself is unusable and retrying won't help.
pub fn is_transient_error(err: &LlmError) -> bool {
    matches!(
        err,
        LlmError::Http { .. } | LlmError::Api { .. } | LlmError::AllEndpointsFailed { .. }
    )
}

/// Convert prompt-module messages into LLM client messages.
///
/// This is the bridge between the zero-dep `prompts::LlmMessage` type and the
/// `llm_client::ChatMessage` wire type. Kept as a named function for testability.
pub fn convert_messages(messages: Vec<crate::prompts::LlmMessage>) -> Vec<ChatMessage> {
    messages
        .into_iter()
        .map(|m| ChatMessage {
            role: m.role,
            content: m.content,
        })
        .collect()
}

/// Process a single analysis job from claim to completion.
///
/// Returns `Ok(())` on success or permanent failure (job is marked done).
/// Returns `Err` for transient failures that warrant a retry or DB errors
/// (message is NOT ACKed so it stays in the Pending Entries List).
pub async fn process_job(pool: &PgPool, config: &WorkerConfig, job_id: i64) -> Result<()> {
    // 1. Claim the job atomically (pending → processing)
    let job = db::claim_job(pool, job_id)
        .await?
        .ok_or_else(|| anyhow::anyhow!("job {job_id} not claimable (missing or not pending)"))?;

    info!(job_id, "claimed analysis job");

    let analysis_type = job
        .analysis_type
        .as_deref()
        .unwrap_or("code_review")
        .to_string();

    match analysis_type.as_str() {
        "teaching_card" => process_teaching_card_job(pool, config, job_id, &job).await,
        _ => process_code_review_job(pool, config, job_id, &job).await,
    }
}

/// Process a code review job: single-submission analysis producing a CodeReviewOutput.
async fn process_code_review_job(
    pool: &PgPool,
    config: &WorkerConfig,
    job_id: i64,
    job: &db::AnalysisJobRow,
) -> Result<()> {
    // Fetch submission code (tenant-scoped by organization_id)
    let submission = db::get_submission_code(pool, job.submission_id, job.organization_id)
        .await?
        .ok_or_else(|| {
            anyhow::anyhow!(
                "submission {} not found for job {job_id} in org {}",
                job.submission_id,
                job.organization_id
            )
        })?;

    // Fetch problem info (tenant-scoped)
    let problem = db::get_problem_info(pool, job.problem_id, job.organization_id)
        .await?
        .ok_or_else(|| {
            anyhow::anyhow!(
                "problem {} not found for job {job_id} in org {}",
                job.problem_id,
                job.organization_id
            )
        })?;

    // Build the prompt messages and convert to wire format
    let prompt_messages = prompts::code_review_prompt(
        &problem.title,
        &problem.description,
        problem.difficulty.as_deref(),
        &submission.language,
        &submission.code,
    );
    let chat_messages = convert_messages(prompt_messages);

    // Call LLM with structured output parsing
    let client = LlmClient::from_config(config)?;
    match client
        .chat_completion_structured::<CodeReviewOutput>(chat_messages, "")
        .await
    {
        Ok((review, result)) => {
            info!(
                job_id,
                model = %result.model,
                prompt_tokens = result.usage.prompt_tokens,
                completion_tokens = result.usage.completion_tokens,
                latency_ms = result.latency.as_millis() as u64,
                endpoint_used = %result.endpoint_used,
                "LLM code review succeeded"
            );

            let content = serde_json::to_value(&review).unwrap_or_else(|e| {
                error!(job_id, error = %e, "failed to serialize CodeReviewOutput");
                serde_json::json!({ "raw_content": "serialization error" })
            });

            let card = db::NewTeachingCard {
                problem_id: job.problem_id,
                organization_id: job.organization_id,
                card_type: "code_review".to_string(),
                title: review.title.clone(),
                content,
                source_cluster_ids: vec![],
            };
            db::insert_teaching_card(pool, &card).await?;

            let usage = db::LlmUsage {
                model: result.model,
                prompt_tokens: result.usage.prompt_tokens,
                completion_tokens: result.usage.completion_tokens,
                latency_ms: result.latency.as_millis() as i32,
            };
            db::update_job_with_usage(pool, job_id, "completed", None, Some(&usage)).await?;

            Ok(())
        }
        Err(e) => handle_llm_error(pool, job_id, &e).await,
    }
}

/// Process a cluster-based teaching card job: aggregate submissions into a TeachingCardOutput.
async fn process_teaching_card_job(
    pool: &PgPool,
    config: &WorkerConfig,
    job_id: i64,
    job: &db::AnalysisJobRow,
) -> Result<()> {
    // Fetch problem info (tenant-scoped)
    let problem = db::get_problem_info(pool, job.problem_id, job.organization_id)
        .await?
        .ok_or_else(|| {
            anyhow::anyhow!(
                "problem {} not found for job {job_id} in org {}",
                job.problem_id,
                job.organization_id
            )
        })?;

    // Fetch cluster representative submissions
    let cluster_ids: Vec<i64> = job.source_cluster_ids.clone().unwrap_or_default();
    let representatives = if cluster_ids.is_empty() {
        vec![]
    } else {
        db::get_cluster_representatives(pool, job.problem_id, job.organization_id, &cluster_ids, 5)
            .await?
    };

    if representatives.is_empty() {
        warn!(
            job_id,
            "no cluster representatives found, falling back to code review"
        );
        return process_code_review_job(pool, config, job_id, job).await;
    }

    // Build cluster summary from representative data
    let cluster_summary = format!(
        "共 {} 个聚类，{} 份代表性提交",
        cluster_ids.len(),
        representatives.len(),
    );

    // Collect sample codes for the teaching card prompt
    let sample_codes: Vec<(&str, &str)> = representatives
        .iter()
        .map(|r| (r.language.as_str(), r.code.as_str()))
        .collect();

    let prompt_messages =
        prompts::teaching_card_prompt(&problem.title, &cluster_summary, &sample_codes);
    let chat_messages = convert_messages(prompt_messages);

    let client = LlmClient::from_config(config)?;
    match client
        .chat_completion_structured::<TeachingCardOutput>(chat_messages, "")
        .await
    {
        Ok((card_output, result)) => {
            info!(
                job_id,
                model = %result.model,
                prompt_tokens = result.usage.prompt_tokens,
                completion_tokens = result.usage.completion_tokens,
                latency_ms = result.latency.as_millis() as u64,
                endpoint_used = %result.endpoint_used,
                "LLM teaching card succeeded"
            );

            let content = serde_json::to_value(&card_output).unwrap_or_else(|e| {
                error!(job_id, error = %e, "failed to serialize TeachingCardOutput");
                serde_json::json!({ "raw_content": "serialization error" })
            });

            let card = db::NewTeachingCard {
                problem_id: job.problem_id,
                organization_id: job.organization_id,
                card_type: "cluster_insight".to_string(),
                title: card_output.title.clone(),
                content,
                source_cluster_ids: cluster_ids,
            };
            db::insert_teaching_card(pool, &card).await?;

            let usage = db::LlmUsage {
                model: result.model,
                prompt_tokens: result.usage.prompt_tokens,
                completion_tokens: result.usage.completion_tokens,
                latency_ms: result.latency.as_millis() as i32,
            };
            db::update_job_with_usage(pool, job_id, "completed", None, Some(&usage)).await?;

            Ok(())
        }
        Err(e) => handle_llm_error(pool, job_id, &e).await,
    }
}

/// Handle LLM errors with retry/transient classification.
async fn handle_llm_error(pool: &PgPool, job_id: i64, e: &LlmError) -> Result<()> {
    match e {
        // Transient errors — mark for retry, return Err to prevent ACK
        err if is_transient_error(err) => {
            warn!(job_id, error = %err, "LLM call failed with transient error, scheduling retry");
            let retried = db::retry_job(pool, job_id).await?;
            if !retried {
                db::update_job_with_usage(
                    pool,
                    job_id,
                    "failed",
                    Some("max retries exceeded"),
                    None,
                )
                .await?;
                return Err(anyhow::anyhow!(
                    "LLM transient error, max retries exceeded: {err}"
                ));
            }
            Err(anyhow::anyhow!(
                "LLM transient error, retry scheduled: {err}"
            ))
        }

        // JSON parse failure — record raw response, mark permanently failed
        LlmError::JsonParse { raw, endpoint, .. } => {
            error!(
                job_id,
                raw_length = raw.len(),
                endpoint = %endpoint,
                "LLM response was not valid JSON — recording raw response"
            );
            // Truncate the raw response for the error_message field.
            // IMPORTANT: slice by CHARACTERS, not bytes — LLM responses often
            // contain CJK text, and slicing a UTF-8 string at a byte offset
            // that falls inside a multi-byte sequence panics. Using chars()
            // ensures we never split a codepoint.
            let raw_preview = if raw.len() > 4000 {
                let truncated: String = raw.chars().take(4000).collect();
                format!("{}...[truncated, total {} bytes]", truncated, raw.len())
            } else {
                raw.clone()
            };
            db::update_job_with_usage(
                pool,
                job_id,
                "failed",
                Some(&format!(
                    "LLM JSON parse error. Raw response:\n{raw_preview}"
                )),
                None,
            )
            .await?;
            Ok(())
        }

        // Other permanent errors (MalformedResponse, EmptyResponse, etc.)
        err => {
            error!(job_id, error = %err, "LLM call failed with permanent error");
            db::update_job_with_usage(pool, job_id, "failed", Some(&err.to_string()), None).await?;
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
    use crate::prompts::{self, LlmMessage};

    // -- is_transient_error classification --

    #[test]
    fn http_error_is_transient() {
        // Construct a real reqwest::Error by attempting a connection that will fail,
        // then wrapping it. We use a blocking client to get a concrete error.
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(async {
            reqwest::Client::new()
                .get("http://127.0.0.1:1")
                .timeout(std::time::Duration::from_millis(100))
                .send()
                .await
        });
        let req_err = result.unwrap_err();
        let err = LlmError::Http {
            endpoint: "https://api.test.com".to_string(),
            source: req_err,
        };
        assert!(is_transient_error(&err));
    }

    #[test]
    fn api_error_is_transient() {
        let err = LlmError::Api {
            endpoint: "https://api.test.com".to_string(),
            status: reqwest::StatusCode::TOO_MANY_REQUESTS,
            body: "rate limited".to_string(),
        };
        assert!(is_transient_error(&err));
    }

    #[test]
    fn api_error_500_is_transient() {
        let err = LlmError::Api {
            endpoint: "https://api.test.com".to_string(),
            status: reqwest::StatusCode::INTERNAL_SERVER_ERROR,
            body: "internal error".to_string(),
        };
        assert!(is_transient_error(&err));
    }

    #[test]
    fn all_endpoints_failed_is_transient() {
        let err = LlmError::AllEndpointsFailed {
            primary_err: "conn refused".to_string(),
            fallback_err: "timeout".to_string(),
        };
        assert!(is_transient_error(&err));
    }

    #[test]
    fn json_parse_error_is_permanent() {
        let err = LlmError::JsonParse {
            endpoint: "https://api.test.com".to_string(),
            raw: "not json".to_string(),
            source: serde_json::from_str::<serde_json::Value>("bad json").unwrap_err(),
        };
        assert!(
            !is_transient_error(&err),
            "JSON parse errors should be permanent"
        );
    }

    #[test]
    fn malformed_response_is_permanent() {
        let err = LlmError::MalformedResponse {
            endpoint: "https://api.test.com".to_string(),
            message: "missing choices field".to_string(),
        };
        assert!(!is_transient_error(&err));
    }

    #[test]
    fn empty_response_is_permanent() {
        let err = LlmError::EmptyResponse {
            endpoint: "https://api.test.com".to_string(),
        };
        assert!(!is_transient_error(&err));
    }

    // -- convert_messages --

    #[test]
    fn convert_messages_preserves_order_and_content() {
        let input = vec![
            LlmMessage::system("you are helpful"),
            LlmMessage::user("analyze this code"),
            LlmMessage::assistant("here is my analysis"),
        ];
        let output = convert_messages(input);
        assert_eq!(output.len(), 3);
        assert_eq!(output[0].role, "system");
        assert_eq!(output[0].content, "you are helpful");
        assert_eq!(output[1].role, "user");
        assert_eq!(output[1].content, "analyze this code");
        assert_eq!(output[2].role, "assistant");
        assert_eq!(output[2].content, "here is my analysis");
    }

    #[test]
    fn convert_messages_empty_vec() {
        let output = convert_messages(vec![]);
        assert!(output.is_empty());
    }

    #[test]
    fn convert_messages_preserves_unicode() {
        let input = vec![LlmMessage::user("分析代码：\n你好世界 🌍")];
        let output = convert_messages(input);
        assert_eq!(output[0].content, "分析代码：\n你好世界 🌍");
    }

    // -- End-to-end prompt → messages → ChatMessage conversion --

    #[test]
    fn prompt_to_chat_messages_roundtrip() {
        let prompt_messages = prompts::code_review_prompt(
            "Two Sum",
            "Find two numbers that add up to target.",
            Some("Easy"),
            "python",
            "def two_sum(nums, target):\n    pass",
        );
        let chat_messages = convert_messages(prompt_messages);

        assert_eq!(chat_messages.len(), 2, "should have system + user");
        assert_eq!(chat_messages[0].role, "system");
        assert_eq!(chat_messages[1].role, "user");
        assert!(chat_messages[1].content.contains("Two Sum"));
        assert!(chat_messages[1].content.contains("def two_sum"));
        assert!(chat_messages[1].content.contains("python"));
    }

    // -- Raw response truncation logic (unit test) --

    #[test]
    fn raw_response_truncation_at_4000_chars() {
        let raw = "x".repeat(5000);
        let preview = if raw.len() > 4000 {
            format!("{}...[truncated, total {} bytes]", &raw[..4000], raw.len())
        } else {
            raw.clone()
        };
        assert!(preview.len() < 4200, "preview should be shorter than raw");
        assert!(preview.contains("truncated"));
        assert!(preview.contains("5000 bytes"));
    }

    #[test]
    fn raw_response_no_truncation_under_limit() {
        let raw = "short response".to_string();
        let preview = if raw.len() > 4000 {
            format!("{}...[truncated]", &raw[..4000])
        } else {
            raw.clone()
        };
        assert_eq!(preview, "short response");
    }

    // -- CodeReviewOutput serialization for DB storage --

    #[test]
    fn code_review_output_serializes_to_json_value() {
        use crate::prompts::*;
        let output = CodeReviewOutput {
            title: "暴力枚举模式".to_string(),
            insights: vec![CodeReviewInsight {
                insight_type: InsightType::AntiPattern,
                description: "使用了 O(n²) 暴力枚举".to_string(),
                code_reference: "第 3-5 行".to_string(),
            }],
            suggestions: vec!["使用哈希表优化".to_string()],
            complexity: ComplexityEstimate {
                time: "O(n²)".to_string(),
                space: "O(1)".to_string(),
            },
            overall_quality: QualityLevel::Fair,
        };

        let value = serde_json::to_value(&output).expect("should serialize");
        assert_eq!(value["title"], "暴力枚举模式");
        assert_eq!(value["insights"][0]["type"], "anti_pattern");
        assert_eq!(value["suggestions"][0], "使用哈希表优化");
        assert_eq!(value["complexity"]["time"], "O(n²)");
        assert_eq!(value["overall_quality"], "fair");

        // Verify roundtrip
        let parsed: CodeReviewOutput = serde_json::from_value(value).expect("should deserialize");
        assert_eq!(parsed.title, output.title);
    }

    // -- Observability: verify all LlmUsage fields are populated --

    #[test]
    fn llm_usage_construction_captures_all_metrics() {
        let usage = db::LlmUsage {
            model: "deepseek-coder".to_string(),
            prompt_tokens: 1500,
            completion_tokens: 800,
            latency_ms: 3200,
        };
        assert_eq!(usage.model, "deepseek-coder");
        assert_eq!(usage.prompt_tokens, 1500);
        assert_eq!(usage.completion_tokens, 800);
        assert_eq!(usage.latency_ms, 3200);
    }

    // -- Process job signature compiles --
    // The function signature is validated by the compiler through lib.rs exports.
    // Full integration testing with wiremock + mock DB is in tests/integration.rs.
}
