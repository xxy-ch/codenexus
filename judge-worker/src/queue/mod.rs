pub mod producer;
pub mod consumer;

use anyhow::{Context, Result};

pub struct SubmissionMessage {
    pub submission_id: String,
    pub problem_id: String,
    pub user_id: String,
    pub organization_id: i64,
    pub language: String,
    pub source_code: String,
    pub time_limit_ms: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_serialization() {
        let msg = SubmissionMessage {
            submission_id: "sub-123".to_string(),
            problem_id: "prob-456".to_string(),
            user_id: "user-789".to_string(),
            organization_id: 1001,
            language: "python3".to_string(),
            source_code: "print('hello')".to_string(),
            time_limit_ms: 10000,
        };

        let serialized = serde_json::to_string(&msg).unwrap();
        let deserialized: SubmissionMessage = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.submission_id, msg.submission_id);
        assert_eq!(deserialized.problem_id, msg.problem_id);
        assert_eq!(deserialized.user_id, msg.user_id);
        assert_eq!(deserialized.organization_id, msg.organization_id);
        assert_eq!(deserialized.language, msg.language);
        assert_eq!(deserialized.source_code, msg.source_code);
        assert_eq!(deserialized.time_limit_ms, msg.time_limit_ms);
    }
}

pub fn produce(
    redis_client: &redis::Client,
    stream_name: &str,
    fields: &[(String, String)],
) -> Result<String, anyhow::Error> {
    use redis::AsyncCommands;

    let mut cmd = redis::cmd("XADD");
    cmd.arg(stream_name);
    cmd.arg("*");

    for (key, value) in fields {
        cmd.arg(key);
        cmd.arg(value);
    }

    let mut conn = redis_client.get_async_connection().await?;
    let message_id: String = cmd.query_async(&mut conn).await
        .context("Failed to add submission to stream")?;

    Ok(message_id)
}

pub async fn consume(
    redis_client: &redis::Client,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
    count: Option<i64>,
    block_ms: Option<i64>,
) -> Result<Vec<(String, Vec<(String, String)>)>, anyhow::Error> {
    use redis::AsyncCommands;

    let mut opts = redis::streams::StreamReadOptions::default()
        .group(group_name, consumer_name)
        .count(count.unwrap_or(1));

    if let Some(ms) = block_ms {
        opts = opts.block(ms);
    }

    let mut conn = redis_client.get_async_connection().await?;
    let result: redis::streams::StreamReadResult = redis::cmd("XREADGROUP")
        .arg("GROUP")
        .arg(group_name)
        .arg(consumer_name)
        .arg("COUNT")
        .arg(count.unwrap_or(1))
        .arg("STREAMS")
        .arg(stream_name)
        .arg(">")
        .query_async(&mut conn)
        .await
        .context("Failed to read from stream")?;

    let mut messages = Vec::new();
    // Parse result and populate messages
    // This is a simplified version - adjust based on actual redis library API

    Ok(messages)
}

pub async fn acknowledge(
    redis_client: &redis::Client,
    stream_name: &str,
    group_name: &str,
    message_ids: &[&str],
) -> Result<i64, anyhow::Error> {
    use redis::AsyncCommands;

    let mut cmd = redis::cmd("XACK");
    cmd.arg(stream_name);
    cmd.arg(group_name);

    for msg_id in message_ids {
        cmd.arg(msg_id);
    }

    let mut conn = redis_client.get_async_connection().await?;
    let acknowledged: i64 = cmd.query_async(&mut conn).await
        .context("Failed to acknowledge messages")?;

    Ok(acknowledged)
}
