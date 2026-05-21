use anyhow::Result;
use deadpool_redis::Pool;
use serde::{Deserialize, Serialize};

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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contest_id: Option<i64>,
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

/// Creates a Redis Stream.
///
/// # Arguments
/// * `pool` - The Redis connection pool
/// * `stream_name` - The name of the stream to create
///
/// # Returns
/// Ok(()) if successful.
async fn create_stream(pool: &Pool, stream_name: &str) -> Result<(), deadpool_redis::PoolError> {
    let mut conn = pool.get().await?;
    let _: () = deadpool_redis::redis::cmd("XGROUP")
        .arg("CREATE")
        .arg(stream_name)
        .arg("dummy-group")
        .arg("0")
        .arg("MKSTREAM")
        .query_async(&mut conn)
        .await?;
    let _: () = deadpool_redis::redis::cmd("XGROUP")
        .arg("DESTROY")
        .arg(stream_name)
        .arg("dummy-group")
        .query_async(&mut conn)
        .await?;
    Ok(())
}

/// Adds a message to a Redis Stream.
///
/// # Arguments
/// * `pool` - The Redis connection pool
/// * `stream_name` - The name of the stream
/// * `fields` - Key-value pairs to add as message fields
///
/// # Returns
/// The ID of the added message.
async fn add_message(
    pool: &Pool,
    stream_name: &str,
    fields: &[(String, String)],
) -> Result<String, deadpool_redis::PoolError> {
    let mut conn = pool.get().await?;
    let mut cmd = deadpool_redis::redis::cmd("XADD");
    cmd.arg(stream_name).arg("*");
    for (key, value) in fields {
        cmd.arg(key).arg(value);
    }
    Ok(cmd.query_async(&mut conn).await?)
}

/// Sends a submission to the judge queue
pub async fn queue_submission(
    pool: &Pool,
    message: &SubmissionMessage,
    stream_name: &str,
    school_id: i64,
) -> Result<String> {
    let config = QueueConfig::default();

    // Ensure stream exists (ignore error if already exists)
    let _ = create_stream(pool, stream_name).await;

    // Create consumer group if it doesn't exist
    {
        let mut conn = pool.get().await?;
        let _: Result<String, deadpool_redis::redis::RedisError> =
            deadpool_redis::redis::cmd("XGROUP")
                .arg("CREATE")
                .arg(stream_name)
                .arg(&config.group_name)
                .arg("0")
                .arg("MKSTREAM")
                .query_async(&mut conn)
                .await;
    }

    // Serialize message to JSON
    let message_json = serde_json::to_string(message)?;

    // Add to stream with metadata for DLQ retry routing and wait time calculation
    let mut fields = vec![
        (
            "submission_id".to_string(),
            message.submission_id.to_string(),
        ),
        ("data".to_string(), message_json),
        ("submitted_at".to_string(), chrono::Utc::now().to_rfc3339()),
        ("source_stream".to_string(), stream_name.to_string()),
        ("school_id".to_string(), school_id.to_string()),
    ];

    // Include contest_id as a top-level field so DLQ retry and consumer can route
    // without parsing the data JSON. This is critical for the priority queue mechanism.
    if let Some(cid) = message.contest_id {
        fields.push(("contest_id".to_string(), cid.to_string()));
    }

    let message_id = add_message(pool, stream_name, &fields).await?;

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
            contest_id: None,
        };

        let json = serde_json::to_string(&message).unwrap();
        let deserialized: SubmissionMessage = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.submission_id, message.submission_id);
        assert_eq!(deserialized.problem_id, message.problem_id);
        assert_eq!(deserialized.language, message.language);
        assert!(deserialized.contest_id.is_none());
    }

    /// Regression test: contest_id must be preserved in serialized SubmissionMessage.
    /// Before the fix, contest_id was absent from the struct, causing the priority queue
    /// mechanism to lose contest context when messages were re-enqueued from DLQ.
    #[test]
    fn test_submission_message_contest_id_preserved() {
        let message = SubmissionMessage {
            submission_id: 42,
            problem_id: 200,
            user_id: uuid::Uuid::new_v4(),
            language: "cpp".to_string(),
            source_code: "int main() {}".to_string(),
            time_limit_ms: 2000,
            memory_limit_mb: 512,
            contest_id: Some(99),
        };

        let json = serde_json::to_string(&message).unwrap();

        // Verify contest_id appears in the JSON output
        assert!(
            json.contains("\"contest_id\":99"),
            "contest_id must be in JSON: {}",
            json
        );

        let deserialized: SubmissionMessage = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.contest_id, Some(99));
    }

    /// Verify skip_serializing_if works: None should not produce a contest_id field.
    #[test]
    fn test_submission_message_no_contest_id_omitted() {
        let message = SubmissionMessage {
            submission_id: 1,
            problem_id: 100,
            user_id: uuid::Uuid::new_v4(),
            language: "python3".to_string(),
            source_code: "print('hello')".to_string(),
            time_limit_ms: 1000,
            memory_limit_mb: 256,
            contest_id: None,
        };

        let json = serde_json::to_string(&message).unwrap();
        assert!(
            !json.contains("contest_id"),
            "contest_id should be omitted when None: {}",
            json
        );

        // Deserialization without the field should still work
        let deserialized: SubmissionMessage = serde_json::from_str(&json).unwrap();
        assert!(deserialized.contest_id.is_none());
    }
}
