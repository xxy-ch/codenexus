//! Judge monitor service -- Redis queries for queue monitoring.
//!
//! Uses XINFO/XLEN for stream depth, SCAN for heartbeat discovery,
//! XRANGE/XADD/XDEL for DLQ management.
//!
//! Tenant isolation: All DLQ operations filter by school_id.
//! Legacy entries (pre-fix, no school_id field) are visible to all admins.
//! Atomic retry: Lua script ensures concurrent retries produce exactly one re-enqueue.

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

    /// List DLQ entries using XRANGE with pagination, filtered by tenant.
    ///
    /// Per D-11: Returns entry ID and field map for each DLQ item.
    /// Legacy entries without school_id are visible to all tenants.
    pub async fn list_dlq_entries(
        redis_pool: &deadpool_redis::Pool,
        count: i64,
        start_id: Option<&str>,
        school_id: i64,
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

        // Filter by tenant: entries with matching school_id, or legacy entries without school_id
        let filtered: Vec<_> = entries
            .into_iter()
            .filter(|(_, fields)| {
                match fields.get("school_id").map(|s| s.parse::<i64>()) {
                    Some(Ok(sid)) => sid == school_id,
                    _ => true, // Legacy entries without school_id are visible to all admins
                }
            })
            .collect();

        Ok(filtered)
    }

    /// Retry a DLQ entry atomically using a Redis Lua script.
    ///
    /// The Lua script performs XRANGE + tenant check + XADD + XDEL in a single EVAL,
    /// ensuring concurrent retries for the same entry produce exactly one re-enqueue.
    /// Per D-13: Defaults to "submissions" stream for backward compat if source_stream missing.
    pub async fn retry_dlq_entry(
        redis_pool: &deadpool_redis::Pool,
        entry_id: &str,
        school_id: i64,
    ) -> Result<String> {
        let mut conn = redis_pool.get().await?;

        let lua_script = r#"
            local entry = redis.call('XRANGE', KEYS[1], ARGV[1], ARGV[1])
            if #entry == 0 then
                return {err='DLQ entry not found'}
            end
            local fields = entry[1][2]
            local data = ''
            local submission_id = ''
            local source_stream = 'submissions'
            local submitted_at = ''
            local entry_school_id = ''
            for i = 1, #fields, 2 do
                if fields[i] == 'original_message' then data = fields[i+1] end
                if fields[i] == 'submission_id' then submission_id = fields[i+1] end
                if fields[i] == 'source_stream' then source_stream = fields[i+1] end
                if fields[i] == 'submitted_at' then submitted_at = fields[i+1] end
                if fields[i] == 'school_id' then entry_school_id = fields[i+1] end
            end
            if data == '' then
                return {err='Missing original_message -- cannot retry'}
            end
            if entry_school_id ~= '' and entry_school_id ~= ARGV[2] then
                return {err='DLQ entry does not belong to your organization'}
            end
            local new_id = redis.call('XADD', source_stream, '*',
                'submission_id', submission_id,
                'data', data,
                'source_stream', source_stream,
                'submitted_at', submitted_at)
            redis.call('XDEL', KEYS[1], ARGV[1])
            return {source_stream, new_id}
        "#;

        let result: (String, String) = deadpool_redis::redis::cmd("EVAL")
            .arg(lua_script)
            .arg(1) // number of keys
            .arg("submissions:dlq") // KEYS[1]
            .arg(entry_id) // ARGV[1]
            .arg(school_id.to_string()) // ARGV[2]
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("Atomic DLQ retry failed: {}", e))?;

        Ok(result.0) // source_stream
    }

    /// Delete a DLQ entry permanently, with tenant ownership validation.
    pub async fn delete_dlq_entry(
        redis_pool: &deadpool_redis::Pool,
        entry_id: &str,
        school_id: i64,
    ) -> Result<()> {
        let mut conn = redis_pool.get().await?;

        // Read entry to validate tenant ownership
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

        // Validate tenant: legacy entries without school_id are deletable by any admin
        let entry_school_id = fields.get("school_id").and_then(|s| s.parse::<i64>().ok());
        if let Some(sid) = entry_school_id {
            if sid != school_id {
                return Err(anyhow::anyhow!(
                    "DLQ entry does not belong to your organization"
                ));
            }
        }

        deadpool_redis::redis::cmd("XDEL")
            .arg("submissions:dlq")
            .arg(entry_id)
            .query_async::<()>(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("XDEL from DLQ failed: {}", e))?;
        Ok(())
    }
}
