use anyhow::Result;
use deadpool_redis::Pool;
use serde::{Deserialize, Serialize};
use crate::redis;

/// Submission message sent to judge queue
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmissionMessage {
    pub submission_id: i64,
    pub problem_id: i64,
    pub user_id: uuid::Uuid,
    pub language: String,
    pub source_code: String,
    pub time_limit_ms: u64,
    pub memory_limit_mb: u64,
}

/// Queue configuration
pub struct QueueConfig {
    pub stream_name: String,
    pub group_name: String,
}

impl Default for QueueConfig {
    fn default() -> Self {
        Self {
            stream_name: "submissions".to_string(),
            group_name: "judge_workers".to_string(),
        }
    }
}

/// Sends a submission to the judge queue
pub async fn queue_submission(
    pool: &Pool,
    message: &SubmissionMessage,
) -> Result<String> {
    let config = QueueConfig::default();

    // Ensure stream exists (ignore error if already exists)
    let _ = redis::create_stream(pool, &config.stream_name).await;

    // Create consumer group if it doesn't exist
    {
        let mut conn = pool.get().await?;
        let _: Result<String, deadpool_redis::redis::RedisError> = deadpool_redis::redis::cmd("XGROUP")
            .arg("CREATE")
            .arg(&config.stream_name)
            .arg(&config.group_name)
            .arg("0")
            .arg("MKSTREAM")
            .query_async(&mut conn)
            .await;
    }

    // Serialize message to JSON
    let message_json = serde_json::to_string(message)?;

    // Add to stream
    let fields = vec![
        ("submission_id".to_string(), message.submission_id.to_string()),
        ("data".to_string(), message_json),
    ];

    let message_id = redis::add_message(pool, &config.stream_name, &fields).await?;

    Ok(message_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_submission_message_serialization() {
        let message = SubmissionMessage {
            submission_id: 1,
            problem_id: 100,
            user_id: uuid::Uuid::new_v4(),
            language: "python3".to_string(),
            source_code: "print('hello')".to_string(),
            time_limit_ms: 1000,
            memory_limit_mb: 256,
        };

        let json = serde_json::to_string(&message).unwrap();
        let deserialized: SubmissionMessage = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.submission_id, message.submission_id);
        assert_eq!(deserialized.problem_id, message.problem_id);
        assert_eq!(deserialized.language, message.language);
    }
}
