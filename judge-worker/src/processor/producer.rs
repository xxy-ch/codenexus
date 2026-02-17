use anyhow::Result;
use crate::queue::{SubmissionMessage, produce};

pub async fn produce_submission(
    redis_client: &redis::Client,
    stream_name: &str,
    message: &SubmissionMessage,
) -> Result<String> {
    let fields = vec![
        ("submission_id".to_string(), message.submission_id.clone()),
        ("problem_id".to_string(), message.problem_id.clone()),
        ("user_id".to_string(), message.user_id.clone()),
        ("organization_id".to_string(), message.organization_id.to_string()),
        ("language".to_string(), message.language.clone()),
        ("source_code".to_string(), message.source_code.clone()),
        ("time_limit_ms".to_string(), message.time_limit_ms.to_string()),
    ];

    produce(redis_client, stream_name, &fields).await
}
