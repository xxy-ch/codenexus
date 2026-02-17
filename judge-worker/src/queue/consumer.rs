// Re-export the consume function from the parent module
pub use super::{consume, acknowledge};

use anyhow::Result;
use redis::Client;

pub async fn consume_submission(
    redis_client: &Client,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
) -> Result<Vec<(String, Vec<(String, String)>)>> {
    // This will be implemented when we have async support
    Ok(vec![])
}

pub async fn acknowledge_submission(
    redis_client: &Client,
    stream_name: &str,
    group_name: &str,
    message_id: &str,
) -> Result<i64> {
    // This will be implemented when we have async support
    Ok(1)
}
