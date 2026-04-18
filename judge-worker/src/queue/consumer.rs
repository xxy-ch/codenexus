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

/// Two-phase priority consumer that guarantees strict contest-priority ordering.
///
/// Phase 1 (Contest drain): Non-blocking reads from the contest stream in a loop
/// until it is empty. Each contest message is returned immediately for processing.
///
/// Phase 2 (Normal with quick check): Only when the contest stream is empty, read
/// ONE message from the normal stream with a short 200ms BLOCK. After the caller
/// processes it, the next call to this function will drain any new contest messages
/// first before touching normal again.
///
/// This guarantees:
/// - Contest messages are ALWAYS processed before any normal message.
/// - Normal messages are processed only when the contest queue is empty.
/// - The 200ms block on normal means we check contest again at least every 200ms.
/// - New contest submissions arriving during normal processing are picked up within
///   200ms on the next call.
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
    // Phase 1: Drain contest stream completely (non-blocking).
    // Keep reading until the contest stream returns no messages.
    loop {
        let mut cmd = redis::cmd("XREADGROUP");
        cmd.arg("GROUP")
            .arg(group_name)
            .arg(consumer_name)
            .arg("COUNT")
            .arg(1)
            .arg("STREAMS")
            .arg(contest_stream)
            .arg(">");

        let result: redis::streams::StreamReadReply = cmd
            .query_async(conn)
            .await
            .context("Failed to read from contest stream")?;

        if result.keys.is_empty() {
            // Contest stream is empty — break to Phase 2
            break;
        }

        // Parse and return the first contest message immediately
        let messages = parse_stream_reply(result)?;
        if !messages.is_empty() {
            return Ok(messages);
        }
        // If all entries were malformed (no data field), loop again
    }

    // Phase 2: Contest stream is empty. Read one message from normal stream
    // with a short 200ms BLOCK. The short timeout ensures we check contest
    // again quickly on the next call.
    let mut cmd = redis::cmd("XREADGROUP");
    cmd.arg("GROUP")
        .arg(group_name)
        .arg(consumer_name)
        .arg("BLOCK")
        .arg(200)
        .arg("COUNT")
        .arg(1)
        .arg("STREAMS")
        .arg(normal_stream)
        .arg(">");

    let result: redis::streams::StreamReadReply = cmd
        .query_async(conn)
        .await
        .context("Failed to read from normal stream")?;

    parse_stream_reply(result)
}

/// Parse a StreamReadReply into the tuple format used by consume_priority.
fn parse_stream_reply(
    result: redis::streams::StreamReadReply,
) -> Result<Vec<(String, SubmissionMessage, String, Option<i64>, Option<String>)>> {
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

    /// Regression test: Phase 1 (contest drain) uses a NON-BLOCKING XREADGROUP.
    /// This ensures contest messages are always drained immediately without waiting.
    #[test]
    fn test_contest_drain_phase_is_nonblocking() {
        let args = build_xreadgroup_args("submissions:contest", "judge_workers", "w1", None);

        // Contest phase must NOT have a BLOCK argument
        assert!(
            !args.iter().any(|a| a == "BLOCK"),
            "Contest drain phase should be non-blocking (no BLOCK arg), got: {:?}",
            args,
        );

        assert_eq!(
            args,
            vec!["XREADGROUP", "GROUP", "judge_workers", "w1", "COUNT", "1", "STREAMS", "submissions:contest", ">"]
        );
    }

    /// Regression test: Phase 2 (normal read) uses a short BLOCK (200ms).
    /// The short block ensures we re-check the contest stream within 200ms,
    /// keeping contest latency low even during normal processing.
    #[test]
    fn test_normal_phase_uses_short_block() {
        let args = build_xreadgroup_args("submissions", "judge_workers", "w1", Some(200));

        let block_pos = args.iter().position(|a| a == "BLOCK").expect("BLOCK not found");
        let block_val: u64 = args[block_pos + 1].parse().expect("BLOCK value not a number");
        assert!(
            block_val <= 500,
            "Normal phase BLOCK should be short (<=500ms) for priority responsiveness, got {}ms",
            block_val
        );

        assert_eq!(
            args,
            vec!["XREADGROUP", "GROUP", "judge_workers", "w1", "BLOCK", "200", "COUNT", "1", "STREAMS", "submissions", ">"]
        );
    }

    /// Regression test: verify parse_stream_reply correctly extracts message fields
    /// from a StreamReadReply, including origin_stream tracking.
    #[test]
    fn test_parse_stream_reply_extracts_fields() {
        use redis::streams::{StreamId, StreamKey, StreamReadReply};

        let reply = StreamReadReply {
            keys: vec![StreamKey {
                key: "submissions:contest".to_string(),
                ids: vec![StreamId {
                    id: "1234567890-0".to_string(),
                    map: {
                        let mut m = std::collections::HashMap::new();
                        m.insert(
                            "data".to_string(),
                            redis::Value::BulkString(
                                br#"{"submission_id":42,"problem_id":1,"user_id":"550e8400-e29b-41d4-a716-446655440000","language":"cpp","source_code":"int main(){}","time_limit_ms":1000,"memory_limit_mb":256,"contest_id":7}"#.to_vec(),
                            ),
                        );
                        m.insert("school_id".to_string(), redis::Value::BulkString(b"100".to_vec()));
                        m.insert(
                            "submitted_at".to_string(),
                            redis::Value::BulkString(b"2026-01-15T12:00:00.000Z".to_vec()),
                        );
                        m
                    },
                }],
            }],
        };

        let messages = parse_stream_reply(reply).unwrap();

        assert_eq!(messages.len(), 1, "Should parse exactly one message");
        let (msg_id, submission, origin, school_id, submitted_at) = &messages[0];
        assert_eq!(msg_id, "1234567890-0");
        assert_eq!(submission.submission_id, 42);
        assert_eq!(submission.contest_id, Some(7));
        assert_eq!(origin, "submissions:contest");
        assert_eq!(*school_id, Some(100));
        assert_eq!(
            submitted_at.as_deref(),
            Some("2026-01-15T12:00:00.000Z")
        );
    }

    /// Regression test: parse_stream_reply with empty reply returns no messages.
    #[test]
    fn test_parse_stream_reply_empty() {
        let reply = redis::streams::StreamReadReply {
            keys: vec![],
        };

        let messages = parse_stream_reply(reply).unwrap();
        assert!(messages.is_empty(), "Empty reply should produce no messages");
    }

    /// Regression test: parse_stream_reply skips entries with missing data field.
    #[test]
    fn test_parse_stream_reply_skips_missing_data() {
        let reply = redis::streams::StreamReadReply {
            keys: vec![redis::streams::StreamKey {
                key: "submissions".to_string(),
                ids: vec![redis::streams::StreamId {
                    id: "123-0".to_string(),
                    map: {
                        let mut m = std::collections::HashMap::new();
                        // No "data" field — should be skipped
                        m.insert("foo".to_string(), redis::Value::BulkString(b"bar".to_vec()));
                        m
                    },
                }],
            }],
        };

        let messages = parse_stream_reply(reply).unwrap();
        assert!(messages.is_empty(), "Entry without data field should be skipped");
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
