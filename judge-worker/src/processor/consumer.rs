use anyhow::Result;
use crate::queue::{consume, acknowledge};

pub async fn consume_submission(
    redis_client: &redis::Client,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
) -> Result<Vec<(String, Vec<(String, String)>)>> {
    consume(
        redis_client,
        stream_name,
        group_name,
        consumer_name,
        Some(1),
        Some(5000),
    ).await
}

pub async fn acknowledge_submission(
    redis_client: &redis::Client,
    stream_name: &str,
    group_name: &str,
    message_id: &str,
) -> Result<i64> {
    acknowledge(
        redis_client,
        stream_name,
        group_name,
        &[message_id],
    ).await
}
