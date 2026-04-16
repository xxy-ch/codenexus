use super::SubmissionMessage;
use anyhow::{Context, Result};
use redis::aio::MultiplexedConnection;
use tracing::{info, warn};

/// Scan Redis Stream for pending messages older than min_idle_ms and claim them.
/// Per D-05: Called on worker startup to recover submissions left behind by crashed workers.
pub async fn recover_pending_submissions(
    conn: &mut MultiplexedConnection,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
    min_idle_ms: u64,
) -> Result<Vec<(String, SubmissionMessage)>> {
    info!(
        "Scanning for pending submissions older than {}ms on stream '{}'",
        min_idle_ms, stream_name
    );

    // Step 1: XPENDING to find messages with idle time > threshold
    // XPENDING stream group - + count
    let pending_reply: redis::Value = redis::cmd("XPENDING")
        .arg(stream_name)
        .arg(group_name)
        .arg("-")
        .arg("+")
        .arg(100)
        .query_async(conn)
        .await
        .context("Failed to query XPENDING")?;

    // Parse pending entries: [[id, consumer, idle_ms, deliveries], ...]
    let entries = match pending_reply {
        redis::Value::Array(arr) => arr,
        redis::Value::Nil => {
            info!("No pending messages found on stream '{}'", stream_name);
            return Ok(Vec::new());
        }
        _ => {
            warn!("Unexpected XPENDING response format, skipping recovery");
            return Ok(Vec::new());
        }
    };

    // Extract IDs with idle time > min_idle_ms
    let mut ids_to_claim: Vec<String> = Vec::new();
    for entry in &entries {
        if let redis::Value::Array(ref fields) = entry {
            if fields.len() >= 3 {
                let id = match fields.get(0) {
                    Some(redis::Value::BulkString(bytes)) => {
                        String::from_utf8_lossy(bytes).to_string()
                    }
                    _ => continue,
                };
                let idle_ms: u64 = match fields.get(2) {
                    Some(redis::Value::Int(n)) => *n as u64,
                    Some(redis::Value::BulkString(bytes)) => {
                        String::from_utf8_lossy(bytes).parse().unwrap_or(0)
                    }
                    _ => continue,
                };
                if idle_ms > min_idle_ms {
                    ids_to_claim.push(id);
                }
            }
        }
    }

    if ids_to_claim.is_empty() {
        info!("No timed-out pending messages to recover");
        return Ok(Vec::new());
    }

    info!(
        "Found {} pending messages to recover (idle > {}ms)",
        ids_to_claim.len(),
        min_idle_ms
    );

    // Step 2: XCLAIM those messages for this consumer
    let mut cmd = redis::cmd("XCLAIM");
    cmd.arg(stream_name)
        .arg(group_name)
        .arg(consumer_name)
        .arg(min_idle_ms);
    for id in &ids_to_claim {
        cmd.arg(id);
    }

    let claimed_reply: redis::Value = cmd
        .query_async(conn)
        .await
        .context("Failed to XCLAIM pending messages")?;

    // Step 3: Parse claimed messages into SubmissionMessage
    // XCLAIM returns same format as XRANGE: [[id, [[field, value], ...]], ...]
    let mut recovered = Vec::new();
    if let redis::Value::Array(stream_entries) = claimed_reply {
        for entry in stream_entries {
            if let redis::Value::Array(ref parts) = entry {
                if parts.len() < 2 {
                    continue;
                }
                let message_id = match &parts[0] {
                    redis::Value::BulkString(bytes) => {
                        String::from_utf8_lossy(bytes).to_string()
                    }
                    _ => continue,
                };

                // Extract "data" field from the field-value pairs
                if let redis::Value::Array(ref field_pairs) = parts[1] {
                    let mut data_json: Option<String> = None;
                    let mut i = 0;
                    while i + 1 < field_pairs.len() {
                        if let (
                            redis::Value::BulkString(key),
                            redis::Value::BulkString(val),
                        ) = (&field_pairs[i], &field_pairs[i + 1])
                        {
                            if key == b"data" {
                                data_json = Some(String::from_utf8_lossy(val).to_string());
                            }
                        }
                        i += 2;
                    }

                    if let Some(json) = data_json {
                        match serde_json::from_str::<SubmissionMessage>(&json) {
                            Ok(msg) => {
                                info!("Recovered submission {}", msg.submission_id);
                                recovered.push((message_id, msg));
                            }
                            Err(e) => {
                                warn!("Failed to parse recovered message {}: {}", message_id, e);
                            }
                        }
                    }
                }
            }
        }
    }

    info!("Recovered {} submissions for re-processing", recovered.len());
    Ok(recovered)
}

#[cfg(test)]
mod tests {
    use super::*;
    use redis::Client;
    use testcontainers::runners::AsyncRunner;

    /// Helper: spin up a Redis container and return a connection + container handle.
    async fn setup_redis() -> (
        MultiplexedConnection,
        testcontainers::ContainerAsync<testcontainers::GenericImage>,
    ) {
        let container = testcontainers::GenericImage::new("redis", "7-alpine")
            .start()
            .await
            .expect("Failed to start Redis container");
        let port = container
            .get_host_port_ipv4(6379)
            .await
            .expect("Failed to get Redis port");
        let url = format!("redis://127.0.0.1:{}", port);

        let client = Client::open(url.as_str()).unwrap();
        let conn = client.get_multiplexed_async_connection().await.unwrap();
        (conn, container)
    }

    /// Helper: add a message to the stream, read it with a consumer group (creating pending entry),
    /// then return. This simulates a worker crashing after reading but before ACKing.
    async fn seed_pending_message(
        conn: &mut MultiplexedConnection,
        stream: &str,
        group: &str,
        consumer: &str,
        data: &str,
    ) -> String {
        // Ensure consumer group exists
        let _: redis::Value = redis::cmd("XGROUP")
            .arg("CREATE")
            .arg(stream)
            .arg(group)
            .arg("0")
            .arg("MKSTREAM")
            .query_async(conn)
            .await
            .unwrap();

        // Add a message to the stream
        let message_id: String = redis::cmd("XADD")
            .arg(stream)
            .arg("*")
            .arg("data")
            .arg(data)
            .query_async(conn)
            .await
            .unwrap();

        // Read the message with the consumer group (makes it pending, no ACK)
        let _: redis::Value = redis::cmd("XREADGROUP")
            .arg("GROUP")
            .arg(group)
            .arg(consumer)
            .arg("COUNT")
            .arg(1)
            .arg("STREAMS")
            .arg(stream)
            .arg(">")
            .query_async(conn)
            .await
            .unwrap();

        message_id
    }

    #[tokio::test]
    async fn test_recover_empty_stream() {
        let (mut conn, _container) = setup_redis().await;
        let stream = "test_stream_empty";
        let group = "test_group";
        let consumer = "test_consumer";

        // Create consumer group but add no messages
        let _: redis::Value = redis::cmd("XGROUP")
            .arg("CREATE")
            .arg(stream)
            .arg(group)
            .arg("0")
            .arg("MKSTREAM")
            .query_async(&mut conn)
            .await
            .unwrap();

        let result = recover_pending_submissions(&mut conn, stream, group, consumer, 0).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_recover_pending_submission() {
        let (mut conn, _container) = setup_redis().await;
        let stream = "test_stream_recover";
        let group = "test_group";
        let original_consumer = "crashed_worker";

        // Seed a pending message with correct SubmissionMessage field names
        let test_data = r#"{"submission_id":42,"problem_id":1,"language":"cpp","source_code":"int main(){}","user_id":"00000000-0000-0000-0000-000000000001","time_limit_ms":1000,"memory_limit_mb":256}"#;
        let _msg_id =
            seed_pending_message(&mut conn, stream, group, original_consumer, test_data).await;

        // Use min_idle_ms=0 so even freshly-pending messages are claimed
        let result =
            recover_pending_submissions(&mut conn, stream, group, "recovery_worker", 0).await;
        assert!(result.is_ok());
        let recovered = result.unwrap();
        assert_eq!(recovered.len(), 1, "Should recover exactly 1 pending message");
        assert_eq!(recovered[0].1.submission_id, 42);
    }

    #[tokio::test]
    async fn test_recover_no_timed_out_messages() {
        let (mut conn, _container) = setup_redis().await;
        let stream = "test_stream_no_timeout";
        let group = "test_group";
        let consumer = "active_worker";

        // Seed a pending message with correct SubmissionMessage field names
        let test_data = r#"{"submission_id":99,"problem_id":1,"language":"cpp","source_code":"int main(){}","user_id":"00000000-0000-0000-0000-000000000001","time_limit_ms":1000,"memory_limit_mb":256}"#;
        let _ =
            seed_pending_message(&mut conn, stream, group, consumer, test_data).await;

        // Use a very high min_idle_ms so the message is NOT claimed
        let result =
            recover_pending_submissions(&mut conn, stream, group, "recovery_worker", 999_999_999)
                .await;
        assert!(result.is_ok());
        let recovered = result.unwrap();
        assert!(
            recovered.is_empty(),
            "Should not recover messages below idle threshold"
        );
    }
}
