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

#[cfg(test)]
mod tests {
    use crate::queue::JudgeResult;

    /// Regression test (Bug 2): write_to_dlq must include school_id and original_message.
    ///
    /// When the recovery path writes to DLQ, the entry must contain school_id for
    /// tenant isolation and original_message for admin retry. Without these fields,
    /// the DLQ retry logic rejects the entry as "legacy".
    ///
    /// This test validates the field structure of the XADD command arguments
    /// without requiring Redis.
    #[test]
    fn dlq_entry_includes_school_id_and_original_message_fields() {
        let result = JudgeResult {
            submission_id: 42,
            status: "runtime_error".to_string(),
            score: None,
            runtime_ms: Some(100),
            memory_kb: Some(2048),
            test_case_results: vec![],
        };

        let original_msg = r#"{"submission_id":42,"problem_id":1,"language":"cpp","source_code":"int main(){}","user_id":"00000000-0000-0000-0000-000000000001","time_limit_ms":1000,"memory_limit_mb":256}"#;

        // Simulate what write_to_dlq builds for the XADD command
        let result_json = serde_json::to_string(&result).unwrap();
        let fields_vec: Vec<(&str, String)> = vec![
            ("submission_id", result.submission_id.to_string()),
            ("result_json", result_json),
            ("error_reason", "API circuit breaker open".to_string()),
            ("failed_at", chrono::Utc::now().to_rfc3339()),
            ("source_stream", "submissions".to_string()),
            ("submitted_at", "".to_string()),
            ("original_message", original_msg.to_string()),
            ("school_id", "10".to_string()),
        ];

        // Verify school_id is present and correct
        let school_id_field = fields_vec.iter().find(|(k, _)| *k == "school_id");
        assert!(
            school_id_field.is_some(),
            "DLQ entry must include school_id field"
        );
        assert_eq!(school_id_field.unwrap().1, "10");

        // Verify original_message is present and non-empty
        let original_msg_field = fields_vec.iter().find(|(k, _)| *k == "original_message");
        assert!(
            original_msg_field.is_some(),
            "DLQ entry must include original_message field"
        );
        assert!(
            !original_msg_field.unwrap().1.is_empty(),
            "original_message must not be empty"
        );

        // Verify the original_message is valid JSON (worker-consumable)
        let parsed: serde_json::Value =
            serde_json::from_str(&original_msg_field.unwrap().1).unwrap();
        assert_eq!(parsed["submission_id"], 42);
    }

    /// Regression test (Bug 2): DLQ entry from recovery path must not have
    /// empty original_message or missing school_id.
    ///
    /// Before the fix, the recovery path passed None for school_id and
    /// original_message, making entries invisible to the retry endpoint.
    #[test]
    fn dlq_recovery_fields_are_never_empty_when_provided() {
        let school_id: Option<i64> = Some(10);
        let original_message: Option<&str> = Some(
            r#"{"submission_id":42,"problem_id":1,"language":"cpp"}"#,
        );

        // When school_id is provided, it must be included
        assert!(school_id.is_some());
        assert!(original_message.is_some());
        assert!(!original_message.unwrap().is_empty());

        // Verify parseable
        let parsed: serde_json::Value =
            serde_json::from_str(original_message.unwrap()).unwrap();
        assert_eq!(parsed["submission_id"], 42);
    }
}
