use super::SubmissionMessage;
use anyhow::{Context, Result};
use redis::aio::MultiplexedConnection;

/// Parsed result from consuming a submission from a Redis stream.
pub struct ConsumedMessage {
    pub message_id: String,
    pub submission: SubmissionMessage,
    pub school_id: Option<i64>,
}

pub async fn consume_submission(
    conn: &mut MultiplexedConnection,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
    block_ms: Option<u64>,
) -> Result<Vec<ConsumedMessage>> {
    let mut cmd = redis::cmd("XREADGROUP");
    cmd.arg("GROUP")
        .arg(group_name)
        .arg(consumer_name);

    if let Some(ms) = block_ms {
        cmd.arg("BLOCK").arg(ms);
    }

    cmd.arg("COUNT")
        .arg(1)
        .arg("STREAMS")
        .arg(stream_name)
        .arg(">");

    let result: redis::streams::StreamReadReply = cmd
        .query_async(conn)
        .await
        .context("Failed to read from stream")?;

    let mut messages = Vec::new();

    for stream_key in result.keys {
        for stream_entry in stream_key.ids {
            let message_id = stream_entry.id;
            let Some(data_value) = stream_entry.map.get("data") else {
                tracing::warn!("Message {} missing data field", message_id);
                continue;
            };

            let data_json: String = redis::from_redis_value(data_value)
                .context("Failed to decode Redis stream payload")?;
            let submission: SubmissionMessage =
                serde_json::from_str(&data_json).context("Failed to parse submission message")?;

            // Extract school_id for DLQ tenant isolation
            let school_id = stream_entry
                .map
                .get("school_id")
                .and_then(|v| redis::from_redis_value::<String>(v).ok())
                .and_then(|s| s.parse::<i64>().ok());

            messages.push(ConsumedMessage {
                message_id,
                submission,
                school_id,
            });
        }
    }

    Ok(messages)
}

pub async fn acknowledge_submission(
    conn: &mut MultiplexedConnection,
    stream_name: &str,
    group_name: &str,
    message_id: &str,
) -> Result<i64> {
    let acknowledged: i64 = redis::cmd("XACK")
        .arg(stream_name)
        .arg(group_name)
        .arg(message_id)
        .query_async(conn)
        .await
        .context("Failed to acknowledge message")?;

    Ok(acknowledged)
}

pub async fn ensure_consumer_group(
    conn: &mut MultiplexedConnection,
    stream_name: &str,
    group_name: &str,
) -> Result<()> {
    let _: Result<String, redis::RedisError> = redis::cmd("XGROUP")
        .arg("CREATE")
        .arg(stream_name)
        .arg(group_name)
        .arg("0")
        .arg("MKSTREAM")
        .query_async(conn)
        .await;

    tracing::info!(
        "Consumer group '{}' ready for stream '{}'",
        group_name,
        stream_name
    );

    Ok(())
}

/// Dual-stream priority consumer: drains contest stream first (non-blocking),
/// then falls back to normal stream (5s blocking read).
///
/// Returns tuples of (message_id, SubmissionMessage, origin_stream_name, school_id).
/// The origin stream name is needed for correct ACK (per Pitfall 3 in RESEARCH.md).
/// The school_id is needed for DLQ tenant isolation.
pub async fn consume_priority(
    conn: &mut MultiplexedConnection,
    contest_stream: &str,
    normal_stream: &str,
    group_name: &str,
    consumer_name: &str,
) -> Result<Vec<(String, SubmissionMessage, String, Option<i64>)>> {
    // Try contest stream first (non-blocking, per D-03)
    let contest_msgs = consume_submission(conn, contest_stream, group_name, consumer_name, None).await?;
    if !contest_msgs.is_empty() {
        return Ok(contest_msgs
            .into_iter()
            .map(|m| (m.message_id, m.submission, contest_stream.to_string(), m.school_id))
            .collect());
    }
    // Fall back to normal stream (5s block, same as current)
    let normal_msgs = consume_submission(
        conn,
        normal_stream,
        group_name,
        consumer_name,
        Some(5000),
    )
    .await?;
    Ok(normal_msgs
        .into_iter()
        .map(|m| (m.message_id, m.submission, normal_stream.to_string(), m.school_id))
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use redis::Client;

    /// Helper: build the same XREADGROUP command as `consume_submission` and return
    /// its args as a Vec<String> for inspection.
    fn build_xreadgroup_args(
        stream_name: &str,
        group_name: &str,
        consumer_name: &str,
        block_ms: Option<u64>,
    ) -> Vec<String> {
        let mut cmd = redis::cmd("XREADGROUP");
        cmd.arg("GROUP")
            .arg(group_name)
            .arg(consumer_name);

        if let Some(ms) = block_ms {
            cmd.arg("BLOCK").arg(ms);
        }

        cmd.arg("COUNT")
            .arg(1)
            .arg("STREAMS")
            .arg(stream_name)
            .arg(">");

        cmd.args_iter()
            .map(|arg| match arg {
                redis::Arg::Simple(data) => {
                    String::from_utf8_lossy(data).to_string()
                }
                redis::Arg::Cursor => "<cursor>".to_string(),
            })
            .collect()
    }

    /// Regression test: BLOCK must come BEFORE STREAMS in the XREADGROUP command.
    /// Before the fix, BLOCK was appended *after* STREAMS, which is invalid Redis
    /// syntax and caused normal-queue consumption to fail silently.
    #[test]
    fn test_xreadgroup_blocking_args_order() {
        let args = build_xreadgroup_args("submissions", "workers", "w1", Some(5000));

        // Expected: GROUP workers w1 BLOCK 5000 COUNT 1 STREAMS submissions >
        let streams_pos = args.iter().position(|a| a == "STREAMS").expect("STREAMS not found");
        let block_pos = args.iter().position(|a| a == "BLOCK").expect("BLOCK not found");

        assert!(
            block_pos < streams_pos,
            "BLOCK (index {}) must come before STREAMS (index {}), got args: {:?}",
            block_pos,
            streams_pos,
            args,
        );

        // Full argument verification (includes command name from args_iter)
        assert_eq!(
            args,
            vec!["XREADGROUP", "GROUP", "workers", "w1", "BLOCK", "5000", "COUNT", "1", "STREAMS", "submissions", ">"]
        );
    }

    /// Non-blocking (contest priority) path: no BLOCK arg at all.
    #[test]
    fn test_xreadgroup_nonblocking_args_order() {
        let args = build_xreadgroup_args("contest_submissions", "workers", "w1", None);

        assert!(
            !args.iter().any(|a| a == "BLOCK"),
            "BLOCK should not appear in non-blocking command, got: {:?}",
            args,
        );

        // Expected: XREADGROUP GROUP workers w1 COUNT 1 STREAMS contest_submissions >
        assert_eq!(
            args,
            vec!["XREADGROUP", "GROUP", "workers", "w1", "COUNT", "1", "STREAMS", "contest_submissions", ">"]
        );
    }

    #[tokio::test]
    #[ignore = "requires Redis"]
    async fn test_consume() {
        let client = Client::open("redis://127.0.0.1/").unwrap();
        let mut conn = client.get_multiplexed_async_connection().await.unwrap();
        let stream_name = "test_submissions";
        let group_name = "test_workers";
        let consumer_name = "test_consumer";

        ensure_consumer_group(&mut conn, stream_name, group_name)
            .await
            .unwrap();

        let messages = consume_submission(
            &mut conn,
            stream_name,
            group_name,
            consumer_name,
            Some(1000),
        )
        .await
        .unwrap();

        println!("Received {} messages", messages.len());
    }
}
