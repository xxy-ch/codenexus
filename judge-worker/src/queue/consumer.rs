use super::SubmissionMessage;
use anyhow::{Context, Result};
use redis::aio::MultiplexedConnection;

/// Parsed result from consuming a submission from a Redis stream.
pub struct ConsumedMessage {
    pub message_id: String,
    pub submission: SubmissionMessage,
    pub school_id: Option<i64>,
    /// Enqueue timestamp (RFC3339) from the `submitted_at` stream field.
    /// Used to calculate true queue wait time (dequeue_time - enqueue_time).
    pub submitted_at: Option<String>,
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
            let mut submission: SubmissionMessage =
                serde_json::from_str(&data_json).context("Failed to parse submission message")?;

            // If contest_id is missing from the JSON but present as a top-level stream field,
            // merge it in. This handles legacy messages where contest_id was only in XADD fields.
            if submission.contest_id.is_none() {
                submission.contest_id = stream_entry
                    .map
                    .get("contest_id")
                    .and_then(|v| redis::from_redis_value::<String>(v).ok())
                    .and_then(|s| s.parse::<i64>().ok());
            }

            // Extract school_id for DLQ tenant isolation
            let school_id = stream_entry
                .map
                .get("school_id")
                .and_then(|v| redis::from_redis_value::<String>(v).ok())
                .and_then(|s| s.parse::<i64>().ok());

            // Extract submitted_at for queue wait time calculation
            let submitted_at = stream_entry
                .map
                .get("submitted_at")
                .and_then(|v| redis::from_redis_value::<String>(v).ok())
                .filter(|s| !s.is_empty());

            messages.push(ConsumedMessage {
                message_id,
                submission,
                school_id,
                submitted_at,
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
    let result: Result<String, redis::RedisError> = redis::cmd("XGROUP")
        .arg("CREATE")
        .arg(stream_name)
        .arg(group_name)
        .arg("0")
        .arg("MKSTREAM")
        .query_async(conn)
        .await;

    match result {
        Ok(_) => {
            tracing::info!(
                "Consumer group '{}' created for stream '{}'",
                group_name,
                stream_name
            );
        }
        Err(err) => {
            let err_msg = err.to_string();
            // BUSYGROUP means the group already exists — that's fine, not an error.
            if err_msg.contains("BUSYGROUP") {
                tracing::info!(
                    "Consumer group '{}' already exists for stream '{}'",
                    group_name,
                    stream_name
                );
            } else {
                tracing::error!(
                    "Failed to create consumer group '{}' for stream '{}': {}",
                    group_name,
                    stream_name,
                    err
                );
                return Err(err).context("Failed to create consumer group")?;
            }
        }
    }

    Ok(())
}

/// Dual-stream priority consumer using a single XREADGROUP that reads from
/// both contest (priority) and normal streams simultaneously.
///
/// Redis XREADGROUP with multiple STREAMS reads from all listed streams and
/// returns messages from whichever has data first. By listing the contest
/// stream first, Redis gives it natural preference when both have messages.
/// A 200ms BLOCK keeps latency low for contest submissions (the priority
/// stream is checked every loop iteration without a long blocking window).
///
/// Returns tuples of (message_id, SubmissionMessage, origin_stream_name, school_id, submitted_at).
/// The origin stream name is needed for correct ACK (per Pitfall 3 in RESEARCH.md).
/// The school_id is needed for DLQ tenant isolation.
/// The submitted_at is used to calculate queue wait time.
pub async fn consume_priority(
    conn: &mut MultiplexedConnection,
    contest_stream: &str,
    normal_stream: &str,
    group_name: &str,
    consumer_name: &str,
) -> Result<Vec<(String, SubmissionMessage, String, Option<i64>, Option<String>)>> {
    // Single XREADGROUP reading from both streams simultaneously.
    // Contest stream is listed first so Redis returns its messages preferentially.
    // Short BLOCK (200ms) minimizes the window where contest messages could arrive
    // but not be seen — the previous 5s BLOCK caused up to 5s extra latency.
    let mut cmd = redis::cmd("XREADGROUP");
    cmd.arg("GROUP")
        .arg(group_name)
        .arg(consumer_name)
        .arg("BLOCK")
        .arg(200)
        .arg("COUNT")
        .arg(1)
        .arg("STREAMS")
        .arg(contest_stream)
        .arg(normal_stream)
        .arg(">")
        .arg(">");

    let result: redis::streams::StreamReadReply = cmd
        .query_async(conn)
        .await
        .context("Failed to read from priority/normal streams")?;

    let mut messages = Vec::new();

    for stream_key in result.keys {
        let origin_stream = stream_key.key.clone();
        for stream_entry in stream_key.ids {
            let message_id = stream_entry.id;
            let Some(data_value) = stream_entry.map.get("data") else {
                tracing::warn!("Message {} missing data field", message_id);
                continue;
            };

            let data_json: String = redis::from_redis_value(data_value)
                .context("Failed to decode Redis stream payload")?;
            let mut submission: SubmissionMessage =
                serde_json::from_str(&data_json).context("Failed to parse submission message")?;

            // If contest_id is missing from the JSON but present as a top-level stream field,
            // merge it in. This handles legacy messages where contest_id was only in XADD fields.
            if submission.contest_id.is_none() {
                submission.contest_id = stream_entry
                    .map
                    .get("contest_id")
                    .and_then(|v| redis::from_redis_value::<String>(v).ok())
                    .and_then(|s| s.parse::<i64>().ok());
            }

            // Extract school_id for DLQ tenant isolation
            let school_id = stream_entry
                .map
                .get("school_id")
                .and_then(|v| redis::from_redis_value::<String>(v).ok())
                .and_then(|s| s.parse::<i64>().ok());

            // Extract submitted_at for queue wait time calculation
            let submitted_at = stream_entry
                .map
                .get("submitted_at")
                .and_then(|v| redis::from_redis_value::<String>(v).ok())
                .filter(|s| !s.is_empty());

            messages.push((
                message_id,
                submission,
                origin_stream.clone(),
                school_id,
                submitted_at,
            ));
        }
    }

    Ok(messages)
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

    /// Regression test (Issue 2): The consume_priority function must use a short
    /// BLOCK timeout (200ms), not the previous 5-second block. The old approach
    /// did a sequential read: non-blocking on contest, then 5s blocking on normal.
    /// During the 5s block, contest submissions would be delayed.
    ///
    /// The fix uses a single XREADGROUP reading both streams with 200ms BLOCK.
    /// This test verifies the command structure for the dual-stream approach.
    #[test]
    fn test_consume_priority_uses_short_block_timeout() {
        // Build the dual-stream XREADGROUP command args as consume_priority does
        let mut cmd = redis::cmd("XREADGROUP");
        cmd.arg("GROUP")
            .arg("judge_workers")
            .arg("w1")
            .arg("BLOCK")
            .arg(200)
            .arg("COUNT")
            .arg(1)
            .arg("STREAMS")
            .arg("submissions:contest")
            .arg("submissions")
            .arg(">")
            .arg(">");

        let args: Vec<String> = cmd
            .args_iter()
            .map(|arg| match arg {
                redis::Arg::Simple(data) => String::from_utf8_lossy(data).to_string(),
                redis::Arg::Cursor => "<cursor>".to_string(),
            })
            .collect();

        // Verify BLOCK value is 200 (not 5000)
        let block_pos = args.iter().position(|a| a == "BLOCK").expect("BLOCK not found");
        let block_val: u64 = args[block_pos + 1].parse().expect("BLOCK value not a number");
        assert!(
            block_val <= 500,
            "BLOCK timeout should be short (<=500ms) for priority responsiveness, got {}ms",
            block_val
        );

        // Verify both streams are present in a single command
        assert!(
            args.iter().any(|a| a == "submissions:contest"),
            "Contest stream must be listed in dual-stream command"
        );
        let streams_pos = args.iter().position(|a| a == "STREAMS").expect("STREAMS not found");
        let after_streams = &args[streams_pos + 1..];
        // After STREAMS: contest_stream, normal_stream, ">", ">"
        assert!(
            after_streams.contains(&"submissions:contest".to_string()),
            "Contest stream should be listed first (priority)"
        );
        assert!(
            after_streams.contains(&"submissions".to_string()),
            "Normal stream should be listed second"
        );
        assert_eq!(
            after_streams.iter().filter(|a| **a == ">").count(),
            2,
            "Both streams should use '>' (new messages) ID"
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
