use anyhow::{Context, Result};
use redis::aio::MultiplexedConnection;
use tracing::info;

const DLQ_STREAM: &str = "submissions:dlq";

/// Write a failed judge result to the dead letter queue.
///
/// Stores both `result_json` (for admin inspection) and `original_message` (serialized
/// SubmissionMessage, for safe re-enqueue via retry endpoint). Without `original_message`,
/// the retry endpoint cannot reconstruct a valid worker-consumable message.
///
/// `school_id` is stored for tenant isolation in DLQ management endpoints.
pub async fn write_to_dlq(
    conn: &mut MultiplexedConnection,
    result: &crate::queue::JudgeResult,
    error_reason: &str,
    source_stream: Option<&str>,
    submitted_at: Option<&str>,
    original_message: Option<&str>,
    school_id: Option<i64>,
) -> Result<()> {
    let result_json =
        serde_json::to_string(result).context("Failed to serialize judge result for DLQ")?;

    let mut fields_vec = vec![
        ("submission_id", result.submission_id.to_string()),
        ("result_json", result_json),
        ("error_reason", error_reason.to_string()),
        ("failed_at", chrono::Utc::now().to_rfc3339()),
        ("source_stream", source_stream.unwrap_or("submissions").to_string()),
        ("submitted_at", submitted_at.unwrap_or("").to_string()),
        ("original_message", original_message.unwrap_or("").to_string()),
    ];

    // Include school_id for tenant isolation if available
    if let Some(sid) = school_id {
        fields_vec.push(("school_id", sid.to_string()));
    }

    let fields: Vec<(&str, String)> = fields_vec;

    // Build XADD command with all field key-value pairs
    let mut xadd_args: Vec<String> = Vec::with_capacity(fields.len() * 2);
    for (key, value) in &fields {
        xadd_args.push(key.to_string());
        xadd_args.push(value.clone());
    }

    let mut pipe = redis::pipe();
    let mut cmd = redis::cmd("XADD");
    cmd.arg(DLQ_STREAM).arg("*");
    for arg in &xadd_args {
        cmd.arg(arg);
    }
    pipe.add_command(cmd);

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
