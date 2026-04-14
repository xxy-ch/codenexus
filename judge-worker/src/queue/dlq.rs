use anyhow::{Context, Result};
use redis::aio::MultiplexedConnection;
use tracing::info;

const DLQ_STREAM: &str = "submissions:dlq";

/// Write a failed judge result to the dead letter queue
pub async fn write_to_dlq(
    conn: &mut MultiplexedConnection,
    result: &crate::queue::JudgeResult,
    error_reason: &str,
) -> Result<()> {
    let result_json =
        serde_json::to_string(result).context("Failed to serialize judge result for DLQ")?;

    let fields = &[
        ("submission_id", result.submission_id.to_string()),
        ("result_json", result_json),
        ("error_reason", error_reason.to_string()),
        ("failed_at", chrono::Utc::now().to_rfc3339()),
    ];

    let mut pipe = redis::pipe();
    pipe.cmd("XADD").arg(DLQ_STREAM).arg("*").arg(fields);

    pipe.query_async::<()>(conn)
        .await
        .context("Failed to write to DLQ stream")?;

    info!("Wrote submission {} to DLQ", result.submission_id);
    Ok(())
}

/// Read entries from the dead letter queue
pub async fn get_dlq_entries(
    conn: &mut MultiplexedConnection,
    count: i64,
) -> Result<Vec<(String, std::collections::HashMap<String, String>)>> {
    let entries: Vec<(String, std::collections::HashMap<String, String>)> = redis::cmd("XRANGE")
        .arg(DLQ_STREAM)
        .arg("-")
        .arg("+")
        .arg("COUNT")
        .arg(count)
        .query_async(conn)
        .await
        .context("Failed to read from DLQ stream")?;

    Ok(entries)
}

/// Delete an entry from the dead letter queue after processing
pub async fn delete_dlq_entry(conn: &mut MultiplexedConnection, entry_id: &str) -> Result<()> {
    redis::cmd("XDEL")
        .arg(DLQ_STREAM)
        .arg(entry_id)
        .query_async::<()>(conn)
        .await
        .context("Failed to delete DLQ entry")?;

    Ok(())
}
