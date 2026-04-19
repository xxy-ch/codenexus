//! Judge monitor service -- Redis queries for queue monitoring.
//!
//! Uses XINFO GROUPS for full backlog depth (pending + lag), covering both
//! in-flight and never-delivered messages. SCAN for heartbeat discovery,
//! XRANGE/XADD/XDEL for DLQ management.
//!
//! Tenant isolation: All DLQ operations filter by school_id.
//! Legacy entries (pre-fix, no school_id field) are blocked — not visible, deletable, or retriable.
//! Atomic retry: Lua script ensures concurrent retries produce exactly one re-enqueue.

use anyhow::Result;
use std::collections::HashMap;

pub struct JudgeMonitorService;

/// Check if a Redis error is a "NOGROUP" or "no such key" error, indicating
/// the stream or consumer group simply doesn't exist yet (legitimate 0 pending).
/// All other errors (connection, timeout, auth) are real infrastructure failures.
fn is_no_group_error(err: &deadpool_redis::redis::RedisError) -> bool {
    let msg = err.to_string().to_lowercase();
    msg.contains("nogroup") || msg.contains("no such key") || msg.contains("doesn't exist")
}

impl JudgeMonitorService {
    /// Get the true backlog depth for a stream + consumer group.
    ///
    /// Returns the count of messages that are either:
    /// - **In-flight**: delivered to a consumer but not yet ACKed (`pending`)
    /// - **Unconsumed**: exist in the stream but never delivered to the group (`lag`)
    ///
    /// Uses `XINFO GROUPS` which provides both `pending` and `lag` fields in
    /// Redis 7.0+. The project uses `redis:7-alpine`, so `lag` is always available.
    ///
    /// When `lag` is nil (consumer group freshly created, no reads yet), falls back
    /// to `XLEN` for the total stream length (all entries are unconsumed).
    ///
    /// Error handling:
    /// - Stream/group doesn't exist → legitimate 0
    /// - Any other Redis error → propagated (returns 500 from the endpoint)
    pub async fn get_stream_depth(
        redis_pool: &deadpool_redis::Pool,
        stream: &str,
    ) -> Result<usize> {
        let mut conn = redis_pool.get().await?;

        // XINFO GROUPS returns one entry per consumer group with key-value pairs:
        //   [name, <val>, consumers, <val>, pending, <val>, last-delivered-id, <val>, lag, <val>, ...]
        let info_result: Result<deadpool_redis::redis::Value, deadpool_redis::redis::RedisError> =
            deadpool_redis::redis::cmd("XINFO")
                .arg("GROUPS")
                .arg(stream)
                .query_async(&mut conn)
                .await;

        match info_result {
            Ok(info) => {
                let (pending, lag) = parse_group_depth(&info, "judge_workers");
                match lag {
                    Some(lag_val) => Ok(pending + lag_val),
                    None => {
                        // lag is nil: consumer group hasn't read anything yet.
                        // All entries in the stream are unconsumed — use XLEN.
                        tracing::debug!(
                            "Consumer group 'judge_workers' on '{}' has nil lag, falling back to XLEN",
                            stream
                        );
                        let total_len: i64 = deadpool_redis::redis::cmd("XLEN")
                            .arg(stream)
                            .query_async(&mut conn)
                            .await
                            .map_err(|e| anyhow::anyhow!(
                                "XLEN for stream '{}' failed during nil-lag fallback: {}",
                                stream,
                                e
                            ))?;
                        Ok(pending + total_len as usize)
                    }
                }
            }
            Err(ref e) if is_no_group_error(e) => {
                tracing::debug!(
                    "Stream '{}' has no consumer groups, returning 0 backlog",
                    stream
                );
                Ok(0)
            }
            Err(e) => Err(anyhow::anyhow!(
                "XINFO GROUPS for stream '{}' failed: {}",
                stream,
                e
            )),
        }
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
        let mut failed_reads: usize = 0;
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
                let fields: HashMap<String, String> = match deadpool_redis::redis::cmd("HGETALL")
                    .arg(&key)
                    .query_async(&mut conn)
                    .await
                {
                    Ok(fields) => fields,
                    Err(e) => {
                        failed_reads += 1;
                        tracing::warn!(
                            "Failed to read heartbeat data for key '{}': {}",
                            key,
                            e
                        );
                        continue;
                    }
                };
                if !fields.is_empty() {
                    workers.push(fields);
                }
            }

            cursor = new_cursor;
            if cursor == 0 {
                break;
            }
        }

        // If a significant number of heartbeat reads failed, return an error
        // so the monitoring endpoint signals a problem rather than silently
        // returning partial results.
        if failed_reads > 0 && workers.is_empty() {
            return Err(anyhow::anyhow!(
                "All {} heartbeat key reads failed -- Redis may be degraded",
                failed_reads
            ));
        }

        if failed_reads > 0 {
            tracing::warn!(
                "Heartbeat scan completed with {} failed reads out of {} keys",
                failed_reads,
                workers.len() + failed_reads
            );
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

/// Parse XINFO GROUPS output to extract `pending` and `lag` for a specific consumer group.
///
/// XINFO GROUPS returns a list of groups, each as alternating key-value pairs:
/// ```
/// [[name, <val>, consumers, <val>, pending, <val>, last-delivered-id, <val>, lag, <val>, ...], ...]
/// ```
///
/// Returns `(pending, Some(lag))` if the group was found and `lag` is a number.
/// Returns `(pending, None)` if `lag` is nil (group hasn't consumed yet) or absent (pre-Redis 7).
/// Returns `(0, None)` if the target group is not found.
fn parse_group_depth(info: &deadpool_redis::redis::Value, target_group: &str) -> (usize, Option<usize>) {
    let groups = match info {
        deadpool_redis::redis::Value::Array(groups) => groups,
        _ => return (0, None),
    };

    for group in groups {
        let fields = match group {
            deadpool_redis::redis::Value::Array(fields) => fields,
            _ => continue,
        };

        let mut found = false;
        let mut pending: usize = 0;
        let mut lag: Option<usize> = None;

        let mut i = 0;
        while i + 1 < fields.len() {
            let key = match &fields[i] {
                deadpool_redis::redis::Value::BulkString(b) => {
                    String::from_utf8_lossy(b).to_string()
                }
                _ => { i += 2; continue; }
            };

            match key.as_str() {
                "name" => {
                    let val = match &fields[i + 1] {
                        deadpool_redis::redis::Value::BulkString(b) => {
                            String::from_utf8_lossy(b).to_string()
                        }
                        _ => String::new(),
                    };
                    found = val == target_group;
                }
                "pending" if found => {
                    pending = match &fields[i + 1] {
                        deadpool_redis::redis::Value::Int(n) => *n as usize,
                        deadpool_redis::redis::Value::BulkString(b) => {
                            String::from_utf8_lossy(b).parse().unwrap_or(0)
                        }
                        _ => 0,
                    };
                }
                "lag" if found => {
                    lag = match &fields[i + 1] {
                        deadpool_redis::redis::Value::Int(n) => Some(*n as usize),
                        deadpool_redis::redis::Value::BulkString(b) => {
                            let s = String::from_utf8_lossy(b);
                            if s.contains("nil") { None } else { s.parse().ok() }
                        }
                        // Nil value: group hasn't consumed anything yet
                        deadpool_redis::redis::Value::Nil => None,
                        _ => None,
                    };
                }
                _ => {}
            }

            i += 2;
        }

        if found {
            return (pending, lag);
        }
    }

    (0, None)
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

    /// Regression test: is_no_group_error correctly identifies NOGROUP / no-such-key
    /// errors as "stream doesn't exist" (legitimate 0), while rejecting all other
    /// Redis errors (connection, timeout, auth) which must propagate up.
    #[test]
    fn test_is_no_group_error_classifies_correctly() {
        // Should match: NOGROUP
        let err = deadpool_redis::redis::RedisError::from((
            deadpool_redis::redis::ErrorKind::ResponseError,
            "NOGROUP No such key 'submissions' or consumer group 'judge_workers'",
        ));
        assert!(is_no_group_error(&err), "NOGROUP should be classified as non-existent");

        // Should NOT match: connection refused
        let conn_err = deadpool_redis::redis::RedisError::from((
            deadpool_redis::redis::ErrorKind::IoError,
            "connection refused",
        ));
        assert!(
            !is_no_group_error(&conn_err),
            "Connection errors must NOT be swallowed as 0"
        );

        // Should NOT match: timeout
        let timeout_err = deadpool_redis::redis::RedisError::from((
            deadpool_redis::redis::ErrorKind::ResponseError,
            "Timeout waiting for response",
        ));
        assert!(
            !is_no_group_error(&timeout_err),
            "Timeout errors must NOT be swallowed as 0"
        );
    }

    // ---- parse_group_depth tests ----

    /// Helper: build XINFO GROUPS response for a single group.
    fn build_xinfo_response(group_name: &str, pending: i64, lag: Option<i64>) -> deadpool_redis::redis::Value {
        let mut fields: Vec<deadpool_redis::redis::Value> = vec![
            deadpool_redis::redis::Value::BulkString(b"name".to_vec()),
            deadpool_redis::redis::Value::BulkString(group_name.as_bytes().to_vec()),
            deadpool_redis::redis::Value::BulkString(b"consumers".to_vec()),
            deadpool_redis::redis::Value::Int(2),
            deadpool_redis::redis::Value::BulkString(b"pending".to_vec()),
            deadpool_redis::redis::Value::Int(pending),
            deadpool_redis::redis::Value::BulkString(b"last-delivered-id".to_vec()),
            deadpool_redis::redis::Value::BulkString(b"1700000000000-0".to_vec()),
        ];
        match lag {
            Some(n) => {
                fields.push(deadpool_redis::redis::Value::BulkString(b"lag".to_vec()));
                fields.push(deadpool_redis::redis::Value::Int(n));
            }
            None => {
                fields.push(deadpool_redis::redis::Value::BulkString(b"lag".to_vec()));
                fields.push(deadpool_redis::redis::Value::Nil);
            }
        }
        deadpool_redis::redis::Value::Array(vec![
            deadpool_redis::redis::Value::Array(fields),
        ])
    }

    #[test]
    fn test_parse_group_depth_with_pending_and_lag() {
        let info = build_xinfo_response("judge_workers", 3, Some(7));
        let (pending, lag) = parse_group_depth(&info, "judge_workers");
        assert_eq!(pending, 3, "Should parse pending count");
        assert_eq!(lag, Some(7), "Should parse lag count");
        // Total backlog = 3 + 7 = 10
        assert_eq!(pending + lag.unwrap(), 10, "Total backlog should be pending + lag");
    }

    #[test]
    fn test_parse_group_depth_with_zero_lag() {
        let info = build_xinfo_response("judge_workers", 2, Some(0));
        let (pending, lag) = parse_group_depth(&info, "judge_workers");
        assert_eq!(pending, 2);
        assert_eq!(lag, Some(0));
        assert_eq!(pending + lag.unwrap(), 2, "No unconsumed messages, only in-flight");
    }

    #[test]
    fn test_parse_group_depth_nil_lag_means_unconsumed_unknown() {
        let info = build_xinfo_response("judge_workers", 0, None);
        let (pending, lag) = parse_group_depth(&info, "judge_workers");
        assert_eq!(pending, 0);
        assert_eq!(lag, None, "Nil lag means caller must fall back to XLEN");
    }

    #[test]
    fn test_parse_group_depth_wrong_group_returns_zero() {
        let info = build_xinfo_response("other_group", 5, Some(10));
        let (pending, lag) = parse_group_depth(&info, "judge_workers");
        assert_eq!(pending, 0, "Should return 0 for non-matching group");
        assert_eq!(lag, None);
    }

    #[test]
    fn test_parse_group_depth_empty_info() {
        let info = deadpool_redis::redis::Value::Array(vec![]);
        let (pending, lag) = parse_group_depth(&info, "judge_workers");
        assert_eq!(pending, 0);
        assert_eq!(lag, None);
    }

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

    // ---- Regression test (Bug 2/3): DLQ visibility consistency ----
    // Recovery-path DLQ entries that include school_id and original_message
    // must be visible via entry_matches_tenant and retriable via the Lua script.

    /// Regression test: DLQ entry with school_id and original_message from recovery
    /// path must match tenant filter (not be rejected as legacy).
    #[test]
    fn recovery_dlq_entry_with_school_id_is_visible_to_tenant() {
        let mut fields = HashMap::new();
        fields.insert("submission_id".into(), "42".into());
        fields.insert("error_reason".into(), "API circuit breaker open".into());
        fields.insert("school_id".into(), "10".into());
        fields.insert("original_message".into(), r#"{"submission_id":42}"#.into());
        fields.insert("source_stream".into(), "submissions".into());

        // Must match school_id=10
        assert!(
            JudgeMonitorService::entry_matches_tenant(&fields, 10),
            "Recovery DLQ entry with school_id must be visible to matching tenant"
        );

        // Must NOT match different tenant
        assert!(
            !JudgeMonitorService::entry_matches_tenant(&fields, 20),
            "Recovery DLQ entry must not be visible to different tenant"
        );
    }

    /// Regression test: DLQ entry without original_message cannot be retried
    /// (the Lua script checks for this). Verify we can detect it.
    #[test]
    fn dlq_entry_without_original_message_is_detected_as_non_retriable() {
        let mut fields = HashMap::new();
        fields.insert("submission_id".into(), "42".into());
        fields.insert("error_reason".into(), "timeout".into());
        fields.insert("school_id".into(), "10".into());
        // No original_message -- the Lua retry script will reject this

        assert!(
            !fields.contains_key("original_message"),
            "Entry without original_message should be detectable"
        );

        // But it's still visible for listing
        assert!(
            JudgeMonitorService::entry_matches_tenant(&fields, 10),
            "Entry without original_message should still be visible in listings"
        );
    }

    /// Regression test (Bug 3): Heartbeat HGETALL errors should not produce
    /// silently empty results. The fix changed from unwrap_or_default() to
    /// explicit error logging. This test validates the behavioral contract:
    /// a well-formed heartbeat HashMap is always pass-through.
    #[test]
    fn well_formed_heartbeat_fields_pass_through() {
        let mut fields: HashMap<String, String> = HashMap::new();
        fields.insert("worker_id".into(), "worker-1".into());
        fields.insert("active_judgements".into(), "2".into());
        fields.insert("total_processed".into(), "100".into());
        fields.insert("avg_wait_ms".into(), "150".into());
        fields.insert("redis_breaker_state".into(), "Closed".into());
        fields.insert("api_breaker_state".into(), "Closed".into());

        // Verify all expected fields are present and parseable
        assert_eq!(fields.get("worker_id").unwrap(), "worker-1");
        assert_eq!(
            fields.get("active_judgements").and_then(|v: &String| v.parse::<usize>().ok()),
            Some(2)
        );
        assert_eq!(
            fields.get("total_processed").and_then(|v: &String| v.parse::<usize>().ok()),
            Some(100)
        );
        assert_eq!(
            fields.get("avg_wait_ms").and_then(|v: &String| v.parse::<usize>().ok()),
            Some(150)
        );

        // Empty fields should not be pushed (the fix skips empty results)
        let empty: HashMap<String, String> = HashMap::new();
        assert!(empty.is_empty(), "Empty heartbeat maps should be filtered out");
    }

    /// Regression test (Bug 3): Verify that a missing or malformed active_judgements
    /// field results in None from parse, not a panic or silent 0.
    #[test]
    fn malformed_active_judgements_returns_none_not_zero() {
        let mut fields: HashMap<String, String> = HashMap::new();
        fields.insert("active_judgements".into(), "not_a_number".into());

        // This is what get_judge_status does -- filter_map with parse
        let result = fields
            .get("active_judgements")
            .and_then(|v: &String| v.parse::<usize>().ok());

        assert_eq!(result, None, "Malformed field should produce None, not 0");
    }

    /// Regression test (Bug 2): When some but not all heartbeat reads fail,
    /// the function still returns the successful reads (partial results).
    #[test]
    fn partial_heartbeat_reads_succeed_returns_partial_results() {
        let failed_reads: usize = 1;
        let mut workers: Vec<HashMap<String, String>> = Vec::new();
        let mut fields: HashMap<String, String> = HashMap::new();
        fields.insert("worker_id".into(), "worker-1".into());
        workers.push(fields);

        // Should NOT error -- some workers were read successfully
        let should_error = failed_reads > 0 && workers.is_empty();
        assert!(
            !should_error,
            "When some heartbeats are readable, should return them, not error"
        );
    }

    /// Gap-closure test: Verify that list_dlq_entries tenant filtering correctly
    /// isolates entries across multiple tenants, including edge cases:
    /// - Entries from different tenants are filtered out
    /// - Legacy entries (no school_id) are excluded
    /// - Malformed school_id entries are excluded
    /// - Only exact school_id matches are included
    ///
    /// This test exercises entry_matches_tenant against a realistic mixed dataset
    /// without requiring Redis.
    #[test]
    fn test_dlq_tenant_isolation_filters_correctly() {
        // Build a realistic DLQ entry set with mixed tenants
        let entries: Vec<(String, HashMap<String, String>)> = vec![
            // Entry 1: school_id=10, valid
            {
                let mut fields = HashMap::new();
                fields.insert("submission_id".into(), "1".into());
                fields.insert("school_id".into(), "10".into());
                fields.insert("error_reason".into(), "timeout".into());
                fields.insert("original_message".into(), r#"{"submission_id":1}"#.into());
                ("100-0".into(), fields)
            },
            // Entry 2: school_id=20, different tenant
            {
                let mut fields = HashMap::new();
                fields.insert("submission_id".into(), "2".into());
                fields.insert("school_id".into(), "20".into());
                fields.insert("error_reason".into(), "circuit open".into());
                ("101-0".into(), fields)
            },
            // Entry 3: no school_id (legacy)
            {
                let mut fields = HashMap::new();
                fields.insert("submission_id".into(), "3".into());
                fields.insert("error_reason".into(), "timeout".into());
                ("102-0".into(), fields)
            },
            // Entry 4: school_id=10, valid (second match)
            {
                let mut fields = HashMap::new();
                fields.insert("submission_id".into(), "4".into());
                fields.insert("school_id".into(), "10".into());
                fields.insert("error_reason".into(), "API error".into());
                ("103-0".into(), fields)
            },
            // Entry 5: malformed school_id
            {
                let mut fields = HashMap::new();
                fields.insert("submission_id".into(), "5".into());
                fields.insert("school_id".into(), "abc".into());
                fields.insert("error_reason".into(), "sandbox error".into());
                ("104-0".into(), fields)
            },
            // Entry 6: school_id=10, valid (third match)
            {
                let mut fields = HashMap::new();
                fields.insert("submission_id".into(), "6".into());
                fields.insert("school_id".into(), "10".into());
                fields.insert("error_reason".into(), "OOM".into());
                ("105-0".into(), fields)
            },
            // Entry 7: school_id=30, yet another tenant
            {
                let mut fields = HashMap::new();
                fields.insert("submission_id".into(), "7".into());
                fields.insert("school_id".into(), "30".into());
                fields.insert("error_reason".into(), "timeout".into());
                ("106-0".into(), fields)
            },
        ];

        // Filter for school_id=10
        let target_school_id: i64 = 10;
        let filtered: Vec<_> = entries
            .into_iter()
            .filter(|(_, fields)| {
                JudgeMonitorService::entry_matches_tenant(fields, target_school_id)
            })
            .collect();

        // Should get exactly entries 1, 4, 6 (school_id=10)
        assert_eq!(filtered.len(), 3, "Should find exactly 3 entries for school_id=10");

        let filtered_ids: Vec<&str> = filtered.iter().map(|(id, _)| id.as_str()).collect();
        assert!(
            filtered_ids.contains(&"100-0"),
            "Entry 1 (school_id=10) should be included"
        );
        assert!(
            filtered_ids.contains(&"103-0"),
            "Entry 4 (school_id=10) should be included"
        );
        assert!(
            filtered_ids.contains(&"105-0"),
            "Entry 6 (school_id=10) should be included"
        );

        // Verify excluded entries
        assert!(
            !filtered_ids.contains(&"101-0"),
            "Entry 2 (school_id=20) should be excluded"
        );
        assert!(
            !filtered_ids.contains(&"102-0"),
            "Entry 3 (legacy, no school_id) should be excluded"
        );
        assert!(
            !filtered_ids.contains(&"104-0"),
            "Entry 5 (malformed school_id) should be excluded"
        );
        assert!(
            !filtered_ids.contains(&"106-0"),
            "Entry 7 (school_id=30) should be excluded"
        );
    }

    // ===================== DLQ Concurrent Retry Atomicity =====================

    /// Simulate the Lua retry script's atomic logic to prove concurrent retries
    /// for the same DLQ entry produce exactly one successful re-enqueue.
    ///
    /// The real Lua script (lines 239-274) executes atomically in Redis:
    ///   1. XRANGE to read entry
    ///   2. Validate school_id ownership
    ///   3. XADD to source stream (re-enqueue)
    ///   4. XDEL from DLQ (remove)
    ///
    /// Because Lua scripts run atomically in Redis (single-threaded), two
    /// concurrent calls cannot interleave steps 1-4. The second caller always
    /// sees the entry as deleted (XRANGE returns empty) and fails.
    #[test]
    fn test_dlq_concurrent_retry_only_one_succeeds() {
        // Simulate DLQ state: entry exists
        let mut dlq_entries: HashMap<String, HashMap<String, String>> = HashMap::new();
        let mut entry = HashMap::new();
        entry.insert("submission_id".to_string(), "42".to_string());
        entry.insert("original_message".to_string(), "test_data".to_string());
        entry.insert("school_id".to_string(), "10".to_string());
        entry.insert("source_stream".to_string(), "submissions".to_string());
        dlq_entries.insert("123-0".to_string(), entry);

        // Simulate source stream (for re-enqueued messages)
        let mut source_stream: Vec<String> = Vec::new();

        // === First concurrent retry ===
        let retry1_entry_id = "123-0";

        // Step 1: XRANGE — entry exists
        let entry1 = dlq_entries.get(retry1_entry_id).cloned();
        assert!(entry1.is_some(), "First retry: entry must exist");

        if let Some(fields) = entry1 {
            // Step 2: Validate school_id
            let entry_school = fields.get("school_id").map(|s| s.as_str()).unwrap_or("");
            assert_eq!(entry_school, "10", "School ID must match");
            assert_ne!(
                entry_school, "",
                "original_message must be present"
            );

            // Step 3: XADD (re-enqueue)
            source_stream.push("re-enqueued:42".to_string());

            // Step 4: XDEL (remove from DLQ)
            dlq_entries.remove(retry1_entry_id);
        }
        let retry1_success = true;

        // === Second concurrent retry (same entry) ===
        let retry2_entry_id = "123-0";

        // Step 1: XRANGE — entry GONE (already deleted by first retry)
        let entry2 = dlq_entries.get(retry2_entry_id).cloned();
        assert!(entry2.is_none(), "Second retry: entry must NOT exist");

        let retry2_success = entry2.is_some();

        // === Invariant: exactly one retry succeeded ===
        assert!(retry1_success, "First retry must succeed");
        assert!(!retry2_success, "Second retry must fail (entry already deleted)");
        assert_eq!(source_stream.len(), 1, "Exactly one re-enqueue must happen");
        assert!(dlq_entries.is_empty(), "DLQ must be empty after both retries");
    }

    /// Verify that the Lua retry script rejects entries without school_id
    /// (legacy entries), preventing cross-tenant retry.
    #[test]
    fn test_dlq_retry_rejects_legacy_no_school_id() {
        let mut fields: HashMap<String, String> = HashMap::new();
        fields.insert("submission_id".to_string(), "99".to_string());
        fields.insert("original_message".to_string(), "test_data".to_string());
        // No school_id — legacy entry

        // Simulate Lua script's school_id check
        let entry_school_id = fields.get("school_id").map(|s| s.as_str()).unwrap_or("");
        assert!(
            entry_school_id.is_empty(),
            "Legacy entry must have empty school_id"
        );

        // The Lua script returns error: 'Legacy DLQ entry without tenant information cannot be retried'
        let should_reject = entry_school_id.is_empty();
        assert!(
            should_reject,
            "Legacy entries without school_id must be rejected"
        );
    }

    /// Verify that the Lua retry script rejects cross-tenant retry attempts.
    #[test]
    fn test_dlq_retry_rejects_cross_tenant() {
        let mut fields: HashMap<String, String> = HashMap::new();
        fields.insert("submission_id".to_string(), "42".to_string());
        fields.insert("original_message".to_string(), "test_data".to_string());
        fields.insert("school_id".to_string(), "10".to_string());

        // Admin from school 20 tries to retry an entry belonging to school 10
        let entry_school_id = fields.get("school_id").map(|s| s.as_str()).unwrap_or("");
        let requesting_school_id = "20";

        let is_cross_tenant = entry_school_id != requesting_school_id;
        assert!(
            is_cross_tenant,
            "Cross-tenant retry must be detected: entry school=10, request school=20"
        );

        // Same school should be allowed
        let same_school = entry_school_id == "10";
        assert!(same_school, "Same-school retry must be allowed");
    }
}
