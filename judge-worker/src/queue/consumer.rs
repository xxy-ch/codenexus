use super::SubmissionMessage;
use anyhow::{Context, Result};
use redis::Client;

/// Consumes a submission message from Redis Stream
///
/// # Arguments
/// * `redis_client` - Redis client
/// * `stream_name` - Name of the stream to read from
/// * `group_name` - Consumer group name
/// * `consumer_name` - This consumer's name
/// * `block_ms` - How long to block waiting for messages (0 = non-blocking, None = forever)
///
/// # Returns
/// A vector of (message_id, message) tuples
pub async fn consume_submission(
    redis_client: &Client,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
    block_ms: Option<u64>,
) -> Result<Vec<(String, SubmissionMessage)>> {
    use redis::AsyncCommands;

    let mut conn = redis_client.get_async_connection().await?;

    // Build XREADGROUP command
    let mut cmd = redis::cmd("XREADGROUP");
    cmd.arg("GROUP")
       .arg(group_name)
       .arg(consumer_name)
       .arg("COUNT")
       .arg(1)  // Read one message at a time
       .arg("STREAMS")
       .arg(stream_name)
       .arg(">");  // ">" means only new messages

    // Add BLOCK if specified
    if let Some(ms) = block_ms {
        cmd.arg("BLOCK").arg(ms);
    }

    // Execute command
    let result: redis::streams::StreamReadReply = cmd
        .query_async(&mut conn)
        .await
        .context("Failed to read from stream")?;

    let mut messages = Vec::new();

    // StreamReadReply.keys is a Vec<StreamKey>
    // Each StreamKey has a 'ids' field which is Vec<(StreamId, HashMap<String, String>)>
    // But actually the whole result might already contain the data we need
    // Let's use a different approach - access the data directly
    tracing::debug!("Received stream reply, keys: {:?}", result.keys.len());

    // StreamReadReply should contain the data in some form
    // Let's try accessing it differently
    // Process StreamReadReply to extract messages
    if !result.keys.is_empty() {
        tracing::debug!("Processing {} stream keys", result.keys.len());
        for stream_key in result.keys {
            // stream_key.ids contains Vec<(StreamId, HashMap<String, String>)>
            for stream_entry in stream_key.ids {
                let message_id = stream_entry.id;
                let fields = stream_entry.map;
                if let Some(data_value) = fields.get("data") {
                    let data_json = data_value.as_str().unwrap_or_default();
                    let submission: SubmissionMessage = serde_json::from_str(data_json)
                        .context("Failed to parse submission message")?;
                } else {
                    tracing::warn!("Message {} missing 'data' field", message_id);
                }
            }
        }
    }

    Ok(messages)
}

/// Acknowledges processing of a message
///
/// # Arguments
/// * `redis_client` - Redis client
/// * `stream_name` - Name of the stream
/// * `group_name` - Consumer group name
/// * `message_id` - ID of the message to acknowledge
///
/// # Returns
/// Number of messages acknowledged (should be 1)
pub async fn acknowledge_submission(
    redis_client: &Client,
    stream_name: &str,
    group_name: &str,
    message_id: &str,
) -> Result<i64> {
    use redis::AsyncCommands;

    let mut conn = redis_client.get_async_connection().await?;

    let acknowledged: i64 = redis::cmd("XACK")
        .arg(stream_name)
        .arg(group_name)
        .arg(message_id)
        .query_async(&mut conn)
        .await
        .context("Failed to acknowledge message")?;

    Ok(acknowledged)
}

/// Creates the consumer group if it doesn't exist
pub async fn ensure_consumer_group(
    redis_client: &Client,
    stream_name: &str,
    group_name: &str,
) -> Result<()> {
    use redis::AsyncCommands;

    let mut conn = redis_client.get_async_connection().await?;

    // Try to create the group, ignore error if it already exists
    let _: Result<String, redis::RedisError> = redis::cmd("XGROUP")
        .arg("CREATE")
        .arg(stream_name)
        .arg(group_name)
        .arg("0")
        .arg("MKSTREAM")
        .query_async(&mut conn)
        .await;

    tracing::info!(
        "Consumer group '{}' ready for stream '{}'",
        group_name,
        stream_name
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore = "requires Redis"]
    async fn test_consume() {
        let client = Client::open("redis://127.0.0.1/").unwrap();
        let stream_name = "test_submissions";
        let group_name = "test_workers";
        let consumer_name = "test_consumer";

        ensure_consumer_group(&client, stream_name, group_name)
            .await
            .unwrap();

        // This test requires a message to be in the stream
        // In real usage, the API would have added it
        let messages = consume_submission(&client, stream_name, group_name, consumer_name, Some(1000))
            .await
            .unwrap();

        println!("Received {} messages", messages.len());
    }
}
