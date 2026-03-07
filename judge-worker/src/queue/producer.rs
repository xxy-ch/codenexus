// Producer is only used by API, not by judge-worker
// This file is kept for compatibility but will not be used
pub use super::{JudgeResult};

use anyhow::Result;
use redis::Client;

/// Send judge result back to API via a callback queue
///
/// # Arguments
/// * `redis_client` - Redis client
/// * `stream_name` - Results stream name
/// * `result` - Judging result to send
///
/// # Returns
/// Message ID if successful
pub async fn send_judge_result(
    redis_client: &Client,
    stream_name: &str,
    result: &JudgeResult,
) -> Result<String> {
    let mut conn = redis_client.get_multiplexed_async_connection().await?;

    let result_json = serde_json::to_string(result)?;

    let mut cmd = redis::cmd("XADD");
    cmd.arg(stream_name)
       .arg("*")
       .arg("submission_id")
       .arg(result.submission_id.to_string())
       .arg("data")
       .arg(result_json);

    let message_id: String = cmd.query_async(&mut conn).await?;

    Ok(message_id)
}
