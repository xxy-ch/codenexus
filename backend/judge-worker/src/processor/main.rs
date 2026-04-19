use super::SubmissionMessage;
use anyhow::{Context, Result};
use crate::queue::producer;

pub async fn receive_submission(
    redis_client: &redis::Client,
    test_cases: Vec<(String, String)>,
) -> Result<SubmissionMessage, anyhow::Error> {
    let problem_id = test_cases
        .iter()
        .find(|(id, _)| id.starts_with("test"))
        .map(|_| id.trim_matches("test"))
        .ok_or_else(|| anyhow::anyhow!("No test case found for problem"))?;

    let message = SubmissionMessage {
        submission_id: uuid::Uuid::new_v4().to_string(),
        problem_id: problem_id.to_string(),
        user_id: "demo-user".to_string(),
        organization_id: 1,
        language: "python3".to_string(),
        source_code: "print('test')".to_string(),
        time_limit_ms: 10000,
    };

    Ok(message)
}

pub async fn process_submissions_loop(redis_client: &redis::Client) -> Result<(), anyhow::Error> {
    use crate::queue::consumer;

    let mut count = 0;

    loop {
        let messages = consumer::consume(
            redis_client,
            "submission_queue",
            "judge-workers",
            "worker-1",
            Some(10),
            Some(5000),
        ).await
        .context("Failed to consume from queue")?;

        if messages.is_empty() {
            break;
        }

        count += 1;
        tracing::info!("Processed {} submissions", count);
    }
}
