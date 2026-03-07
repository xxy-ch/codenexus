use super::SubmissionMessage;
use anyhow::{Context, Result};
use redis::Client;

pub async fn consume_submission(
    redis_client: &Client,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
    block_ms: Option<u64>,
) -> Result<Vec<(String, SubmissionMessage)>> {
    let mut conn = redis_client.get_multiplexed_async_connection().await?;

    let mut cmd = redis::cmd("XREADGROUP");
    cmd.arg("GROUP")
        .arg(group_name)
        .arg(consumer_name)
        .arg("COUNT")
        .arg(1)
        .arg("STREAMS")
        .arg(stream_name)
        .arg(">");

    if let Some(ms) = block_ms {
        cmd.arg("BLOCK").arg(ms);
    }

    let result: redis::streams::StreamReadReply = cmd
        .query_async(&mut conn)
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
            let submission: SubmissionMessage = serde_json::from_str(&data_json)
                .context("Failed to parse submission message")?;
            messages.push((message_id, submission));
        }
    }

    Ok(messages)
}

pub async fn acknowledge_submission(
    redis_client: &Client,
    stream_name: &str,
    group_name: &str,
    message_id: &str,
) -> Result<i64> {
    let mut conn = redis_client.get_multiplexed_async_connection().await?;

    let acknowledged: i64 = redis::cmd("XACK")
        .arg(stream_name)
        .arg(group_name)
        .arg(message_id)
        .query_async(&mut conn)
        .await
        .context("Failed to acknowledge message")?;

    Ok(acknowledged)
}

pub async fn ensure_consumer_group(
    redis_client: &Client,
    stream_name: &str,
    group_name: &str,
) -> Result<()> {
    let mut conn = redis_client.get_multiplexed_async_connection().await?;

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

        let messages = consume_submission(
            &client,
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
