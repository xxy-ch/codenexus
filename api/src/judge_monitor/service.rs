//! Judge monitor service -- Redis queries for queue monitoring.
//!
//! Uses XINFO/XLEN for stream depth, SCAN for heartbeat discovery,
//! XRANGE/XADD/XDEL for DLQ management.
//!
//! Tenant isolation: All DLQ operations filter by school_id.
//! Legacy entries (pre-fix, no school_id field) are blocked — not visible, deletable, or retriable.
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
    /// Legacy entries without school_id are filtered out.
    ///
    /// Fetches in batches and accumulates tenant-matching entries to avoid
    /// returning empty pages when the first N entries belong to other tenants.
    pub async fn list_dlq_entries(
        redis_pool: &deadpool_redis::Pool,
        count: i64,
        start_id: Option<&str>,
        school_id: i64,
    ) -> Result<Vec<(String, HashMap<String, String>)>> {
        let mut conn = redis_pool.get().await?;
        let mut results = Vec::new();
        let target = count as usize;
        let batch_size = count.max(50);

        // XRANGE is inclusive on both ends. For pagination after a given ID
        // we use "(" (exclusive lower bound) so the already-seen entry is
        // not returned again. The first call uses "-" (earliest ID).
        let mut cursor = start_id.map_or_else(|| "-".to_string(), |id| {
            format!("({}", id)
        });

        while results.len() < target {
            let entries: Vec<(String, HashMap<String, String>)> =
                deadpool_redis::redis::cmd("XRANGE")
                    .arg("submissions:dlq")
                    .arg(&cursor)
                    .arg("+")
                    .arg("COUNT")
                    .arg(batch_size)
                    .query_async(&mut conn)
                    .await
                    .map_err(|e| anyhow::anyhow!("XRANGE on DLQ failed: {}", e))?;

            if entries.is_empty() {
                break;
            }

            // Remember the last ID so the next iteration continues past it.
            let last_id = entries.last().unwrap().0.clone();

            for entry in entries {
                if Self::entry_matches_tenant(&entry.1, school_id) {
                    results.push(entry);
                    if results.len() >= target {
                        break;
                    }
                }
            }

            // Prepare next cursor — exclusive lower bound after last_id
            cursor = format!("({}", last_id);
        }

        Ok(results)
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
            if entry_school_id == '' then
                return {err='Legacy DLQ entry without tenant information cannot be retried'}
            end
            if entry_school_id ~= ARGV[2] then
                return {err='DLQ entry does not belong to your organization'}
            end
            local new_id = redis.call('XADD', source_stream, '*',
                'submission_id', submission_id,
                'data', data,
                'source_stream', source_stream,
                'submitted_at', submitted_at,
                'school_id', entry_school_id)
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

        // Validate tenant: reject entries without school_id (legacy) and mismatched tenants
        let entry_school_id = fields.get("school_id").and_then(|s| s.parse::<i64>().ok());
        match entry_school_id {
            Some(sid) if sid == school_id => { /* tenant match, proceed */ }
            Some(_) => {
                return Err(anyhow::anyhow!(
                    "DLQ entry does not belong to your organization"
                ));
            }
            None => {
                return Err(anyhow::anyhow!(
                    "Legacy DLQ entry without tenant information cannot be deleted"
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

    /// Predicate: does this entry's school_id match the requested tenant?
    /// Legacy entries without a school_id field never match.
    fn entry_matches_tenant(fields: &HashMap<String, String>, school_id: i64) -> bool {
        match fields.get("school_id").map(|s| s.parse::<i64>()) {
            Some(Ok(sid)) => sid == school_id,
            _ => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    /// Helper to build a DLQ entry field map with a given school_id.
    fn make_entry(school_id: Option<i64>) -> HashMap<String, String> {
        let mut fields = HashMap::new();
        fields.insert("submission_id".into(), "42".into());
        fields.insert("error_reason".into(), "timeout".into());
        if let Some(sid) = school_id {
            fields.insert("school_id".into(), sid.to_string());
        }
        fields
    }

    // ---- Tenant matching predicate tests ----

    #[test]
    fn test_entry_matches_tenant_with_matching_school_id() {
        let fields = make_entry(Some(10));
        assert!(JudgeMonitorService::entry_matches_tenant(&fields, 10));
    }

    #[test]
    fn test_entry_matches_tenant_rejects_wrong_school_id() {
        let fields = make_entry(Some(20));
        assert!(!JudgeMonitorService::entry_matches_tenant(&fields, 10));
    }

    #[test]
    fn test_entry_matches_tenant_rejects_legacy_entry_without_school_id() {
        let fields = make_entry(None);
        assert!(!JudgeMonitorService::entry_matches_tenant(&fields, 10));
    }

    #[test]
    fn test_entry_matches_tenant_rejects_malformed_school_id() {
        let mut fields = make_entry(None);
        fields.insert("school_id".into(), "not_a_number".into());
        assert!(!JudgeMonitorService::entry_matches_tenant(&fields, 10));
    }

    // ---- Regression test: batch accumulation logic ----
    //
    // Simulates the core loop of `list_dlq_entries` without Redis.
    // Verifies that when entries from other tenants appear first, the
    // accumulation loop still collects entries belonging to the target tenant.

    #[test]
    fn test_batch_accumulation_finds_entries_past_other_tenants() {
        // Simulate a stream where the first 5 entries belong to school 99,
        // then 3 entries belong to school 10.
        let all_entries: Vec<(String, HashMap<String, String>)> = vec![
            ("1-0".into(), make_entry(Some(99))),
            ("2-0".into(), make_entry(Some(99))),
            ("3-0".into(), make_entry(Some(99))),
            ("4-0".into(), make_entry(Some(99))),
            ("5-0".into(), make_entry(Some(99))),
            ("6-0".into(), make_entry(Some(10))),
            ("7-0".into(), make_entry(Some(10))),
            ("8-0".into(), make_entry(Some(10))),
        ];

        let school_id: i64 = 10;
        let count = 3_usize;

        // Simulate what the batched loop does: iterate all entries,
        // accumulate only those matching the tenant.
        let mut results = Vec::new();
        for entry in all_entries {
            if JudgeMonitorService::entry_matches_tenant(&entry.1, school_id) {
                results.push(entry);
                if results.len() >= count {
                    break;
                }
            }
        }

        // Before the fix, a naive XRANGE+filter would have returned 0 results
        // because COUNT=5 would fetch entries 1-5, all filtered out.
        // With the batched approach, we correctly get 3 entries for school 10.
        assert_eq!(results.len(), 3, "Should find all 3 entries for school 10");
        assert_eq!(results[0].0, "6-0");
        assert_eq!(results[1].0, "7-0");
        assert_eq!(results[2].0, "8-0");
    }

    #[test]
    fn test_batch_accumulation_returns_nothing_when_no_matching_entries() {
        let all_entries: Vec<(String, HashMap<String, String>)> = vec![
            ("1-0".into(), make_entry(Some(99))),
            ("2-0".into(), make_entry(Some(99))),
        ];

        let school_id: i64 = 10;
        let count = 5_usize;

        let mut results = Vec::new();
        for entry in all_entries {
            if JudgeMonitorService::entry_matches_tenant(&entry.1, school_id) {
                results.push(entry);
                if results.len() >= count {
                    break;
                }
            }
        }

        assert!(
            results.is_empty(),
            "Should return empty when no entries match the tenant"
        );
    }

    #[test]
    fn test_batch_accumulation_respects_count_limit() {
        let all_entries: Vec<(String, HashMap<String, String>)> = vec![
            ("1-0".into(), make_entry(Some(10))),
            ("2-0".into(), make_entry(Some(10))),
            ("3-0".into(), make_entry(Some(10))),
            ("4-0".into(), make_entry(Some(10))),
            ("5-0".into(), make_entry(Some(10))),
        ];

        let school_id: i64 = 10;
        let count = 2_usize;

        let mut results = Vec::new();
        for entry in all_entries {
            if JudgeMonitorService::entry_matches_tenant(&entry.1, school_id) {
                results.push(entry);
                if results.len() >= count {
                    break;
                }
            }
        }

        assert_eq!(
            results.len(),
            2,
            "Should stop after reaching requested count"
        );
    }
}
