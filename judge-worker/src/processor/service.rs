use anyhow::{Context, Result};
use crate::queue::{SubmissionMessage, producer, acknowledge};
use crate::processor::TestCaseResult;
use redis::AsyncCommands;

pub async fn process_submission(
    redis_client: &redis::Client,
    message: SubmissionMessage,
) -> Result<HashMap<String, serde_json::Value>, anyhow::Error> {
    tracing::info!("Processing submission: {}", message.submission_id);

    let verdict_data = crate::processor::determine_verdict(0, 0, None, false);

    let mut test_results = Vec::new();

    let test_case_result = crate::processor::TestCaseResult::ac();
    test_results.push(test_case_result);

    let mut results = crate::processor::create_submission_result(&message.submission_id, test_results, verdict_data);

    results.insert(
        "final_verdict".to_string(),
        serde_json::json!(verdict_data.to_string()),
    );

    let _ = producer::produce(redis_client, "submission_queue", &[
        ("submission_id", message.submission_id.as_str()),
        ("problem_id", message.problem_id.as_str()),
        ("user_id", message.user_id.as_str()),
        ("organization_id", message.organization_id.to_string()),
        ("language", message.language.as_str()),
        ("source_code", message.source_code.as_str()),
        ("time_limit_ms", message.time_limit_ms.to_string()),
    ])
        .await
        .context("Failed to produce submission to queue")?;

    acknowledge(redis_client, "submission_queue", &[&message.submission_id])
        .await
        .context("Failed to acknowledge submission")?;

    tracing::info!("Submission {} processed successfully", message.submission_id);

    Ok(results)
}
