//! Judge monitor service -- Redis queries for queue monitoring.
//!
//! Uses XINFO/XLEN for stream depth, SCAN for heartbeat discovery,
//! XRANGE/XADD/XDEL for DLQ management.

use anyhow::Result;
use std::collections::HashMap;

pub struct JudgeMonitorService;

impl JudgeMonitorService {
    /// Get stream depth using XINFO STREAM command.
    ///
    /// Falls back to XLEN if XINFO parsing fails (per RESEARCH.md Pattern).
    pub async fn get_stream_depth(
        redis_pool: &deadpool_redis::Pool,
        stream: &str,
    ) -> Result<usize> {
        let mut conn = redis_pool.get().await?;

        // Try XINFO STREAM first -- returns array of key-value pairs
        let result: deadpool_redis::redis::Value = deadpool_redis::redis::cmd("XINFO")
            .arg("STREAM")
            .arg(stream)
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("XINFO STREAM failed for '{}': {}", stream, e))?;

        if let deadpool_redis::redis::Value::Array(pairs) = result {
            let mut i = 0;
            while i + 1 < pairs.len() {
                if let (
                    deadpool_redis::redis::Value::BulkString(key),
                    deadpool_redis::redis::Value::Int(val),
                ) = (&pairs[i], &pairs[i + 1])
                {
                    if key == b"length" {
                        return Ok(*val as usize);
                    }
                }
                i += 2;
            }
        }

        // Fallback: XLEN
        let len: i64 = deadpool_redis::redis::cmd("XLEN")
            .arg(stream)
            .query_async(&mut conn)
            .await
            .unwrap_or(0);
        Ok(len as usize)
    }

    /// Scan for all worker heartbeat keys using SCAN (production-safe, per T-09-08).
    ///
    /// Returns a list of field maps from HGETALL for each active worker.
    pub async fn get_worker_heartbeats(
        redis_pool: &deadpool_redis::Pool,
    ) -> Result<Vec<HashMap<String, String>>> {
        let mut conn = redis_pool.get().await?;
        let pattern = "worker:heartbeat:*";

        let mut workers = Vec::new();
        let mut cursor: u64 = 0;
        loop {
            let (new_cursor, keys): (u64, Vec<String>) = deadpool_redis::redis::cmd("SCAN")
                .arg(cursor)
                .arg("MATCH")
                .arg(pattern)
                .arg("COUNT")
                .arg(100)
                .query_async(&mut conn)
                .await
                .map_err(|e| anyhow::anyhow!("SCAN failed: {}", e))?;

            for key in keys {
                let fields: HashMap<String, String> = deadpool_redis::redis::cmd("HGETALL")
                    .arg(&key)
                    .query_async(&mut conn)
                    .await
                    .unwrap_or_default();
                if !fields.is_empty() {
                    workers.push(fields);
                }
            }

            cursor = new_cursor;
            if cursor == 0 {
                break;
            }
        }
        Ok(workers)
    }

    /// List DLQ entries using XRANGE with pagination.
    ///
    /// Per D-11: Returns entry ID and field map for each DLQ item.
    pub async fn list_dlq_entries(
        redis_pool: &deadpool_redis::Pool,
        count: i64,
        start_id: Option<&str>,
    ) -> Result<Vec<(String, HashMap<String, String>)>> {
        let mut conn = redis_pool.get().await?;
        let start = start_id.unwrap_or("-");
        let entries: Vec<(String, HashMap<String, String>)> = deadpool_redis::redis::cmd("XRANGE")
            .arg("submissions:dlq")
            .arg(start)
            .arg("+")
            .arg("COUNT")
            .arg(count)
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("XRANGE on DLQ failed: {}", e))?;
        Ok(entries)
    }

    /// Retry a DLQ entry: read it, re-enqueue to original stream, delete from DLQ.
    ///
    /// Per D-13: Defaults to "submissions" stream for backward compat if source_stream missing.
    pub async fn retry_dlq_entry(
        redis_pool: &deadpool_redis::Pool,
        entry_id: &str,
    ) -> Result<String> {
        let mut conn = redis_pool.get().await?;

        // 1. Read the DLQ entry
        let entries: Vec<(String, HashMap<String, String>)> = deadpool_redis::redis::cmd("XRANGE")
            .arg("submissions:dlq")
            .arg(entry_id)
            .arg(entry_id)
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("XRANGE for DLQ entry failed: {}", e))?;

        let (_, fields) = entries
            .into_iter()
            .next()
            .ok_or_else(|| anyhow::anyhow!("DLQ entry not found"))?;

        // 2. Determine original stream (per D-13, default "submissions" for backward compat)
        let original_stream = fields
            .get("source_stream")
            .map(|s| s.as_str())
            .unwrap_or("submissions");

        let submission_id = fields
            .get("submission_id")
            .ok_or_else(|| anyhow::anyhow!("Missing submission_id in DLQ entry"))?;

        // Read the original SubmissionMessage (NOT result_json) so the worker consumer
        // can parse the re-enqueued message. Old entries created before the fix will have
        // an empty original_message and cannot be safely retried.
        let data = fields
            .get("original_message")
            .ok_or_else(|| anyhow::anyhow!("Missing original_message in DLQ entry -- entry cannot be retried (created before fix)"))?;
        if data.is_empty() {
            return Err(anyhow::anyhow!(
                "DLQ entry lacks original submission data -- cannot retry. Use re-submit via submission API instead."
            ));
        }

        // 3. Re-enqueue to original stream
        let _new_id: String = deadpool_redis::redis::cmd("XADD")
            .arg(original_stream)
            .arg("*")
            .arg("submission_id")
            .arg(submission_id)
            .arg("data")
            .arg(data)
            .arg("source_stream")
            .arg(original_stream)
            .arg("submitted_at")
            .arg(fields.get("submitted_at").map(|s| s.as_str()).unwrap_or(""))
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("XADD to original stream failed: {}", e))?;

        // 4. Delete from DLQ
        deadpool_redis::redis::cmd("XDEL")
            .arg("submissions:dlq")
            .arg(entry_id)
            .query_async::<()>(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("XDEL from DLQ failed: {}", e))?;

        Ok(original_stream.to_string())
    }

    /// Delete a DLQ entry permanently.
    pub async fn delete_dlq_entry(
        redis_pool: &deadpool_redis::Pool,
        entry_id: &str,
    ) -> Result<()> {
        let mut conn = redis_pool.get().await?;
        deadpool_redis::redis::cmd("XDEL")
            .arg("submissions:dlq")
            .arg(entry_id)
            .query_async::<()>(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("XDEL from DLQ failed: {}", e))?;
        Ok(())
    }
}
