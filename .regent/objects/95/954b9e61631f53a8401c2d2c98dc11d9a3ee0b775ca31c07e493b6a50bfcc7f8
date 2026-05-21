use anyhow::Result;
use deadpool_redis::Pool;
use serde::{Deserialize, Serialize};

use crate::models::AnalysisEvent;

pub const ANALYSIS_STREAM: &str = "analysis_events";
pub const ANALYSIS_GROUP: &str = "analysis_workers";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisJobMessage {
    pub job_id: i64,
    pub submission_id: i64,
    pub problem_id: i64,
    pub user_id: uuid::Uuid,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
    pub contest_id: Option<i64>,
}

/// Emit an analysis event to the analysis_events Redis stream.
/// Called from the submission callback handler after successful judging.
/// Failures are logged and swallowed — never blocks the callback.
pub async fn emit_analysis_event(redis_pool: &Pool, event: &AnalysisEvent) {
    if let Err(error) = emit_event_inner(redis_pool, event).await {
        tracing::warn!(
            submission_id = event.submission_id,
            error = %error,
            "Failed to emit analysis event — shadow pipeline tolerant"
        );
    }
}

async fn emit_event_inner(redis_pool: &Pool, event: &AnalysisEvent) -> Result<()> {
    let mut conn = redis_pool.get().await?;
    let json = serde_json::to_string(event)?;
    let _: String = deadpool_redis::redis::cmd("XADD")
        .arg(ANALYSIS_STREAM)
        .arg("MAXLEN")
        .arg("~")
        .arg("10000")
        .arg("*")
        .arg("data")
        .arg(&json)
        .query_async(&mut conn)
        .await?;
    Ok(())
}

/// Create the analysis_events consumer group if it doesn't exist.
pub async fn ensure_consumer_group(redis_pool: &Pool) -> Result<()> {
    let mut conn = redis_pool.get().await?;
    let result: Result<String, _> = deadpool_redis::redis::cmd("XGROUP")
        .arg("CREATE")
        .arg(ANALYSIS_STREAM)
        .arg(ANALYSIS_GROUP)
        .arg("0")
        .arg("MKSTREAM")
        .query_async(&mut conn)
        .await;

    if let Err(error) = result {
        let message = error.to_string();
        if !message.contains("BUSYGROUP") {
            return Err(error.into());
        }
    }

    Ok(())
}
