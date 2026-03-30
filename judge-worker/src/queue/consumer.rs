use super::SubmissionMessage;
use anyhow::{Context, Result};
use redis::Client;

fn build_xreadgroup_args(
    group_name: &str,
    consumer_name: &str,
    stream_name: &str,
    block_ms: Option<u64>,
) -> Vec<String> {
    let mut args = vec![
        "GROUP".to_string(),
        group_name.to_string(),
        consumer_name.to_string(),
        "COUNT".to_string(),
        "1".to_string(),
    ];

    if let Some(ms) = block_ms {
        args.push("BLOCK".to_string());
        args.push(ms.to_string());
    }

    args.push("STREAMS".to_string());
    args.push(stream_name.to_string());
    args.push(">".to_string());

    args
}

pub async fn consume_submission(
    redis_client: &Client,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
    block_ms: Option<u64>,
) -> Result<Vec<(String, SubmissionMessage)>> {
    let mut conn = redis_client.get_multiplexed_async_connection().await?;

    let mut cmd = redis::cmd("XREADGROUP");
    for arg in build_xreadgroup_args(group_name, consumer_name, stream_name, block_ms) {
        cmd.arg(arg);
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

    #[test]
    fn test_build_xreadgroup_args_places_block_before_streams() {
        let args = build_xreadgroup_args("judge_workers", "worker-1", "submissions", Some(5000));

        assert_eq!(
            args,
            vec![
                "GROUP",
                "judge_workers",
                "worker-1",
                "COUNT",
                "1",
                "BLOCK",
                "5000",
                "STREAMS",
                "submissions",
                ">",
            ]
        );
    }

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
