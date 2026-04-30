//! Redis data collector — heartbeat scanning and stream backlog depth.
//!
//! Two read-only capabilities:
//! 1. **Heartbeat scanning**: SCAN `worker:heartbeat:*` keys, HGETALL each to
//!    extract worker status fields. Uses SCAN (never KEYS) for production safety.
//! 2. **Stream backlog depth**: XINFO GROUPS to get pending + lag for known streams
//!    (submissions, submissions:contest, analysis_events). Handles NOGROUP/no-such-key
//!    as 0, nil lag via XLEN fallback.
//!
//! Reuses the `parse_group_depth` logic pattern from `judge_monitor/service.rs`.

use anyhow::Result;
use serde::Serialize;
use std::collections::HashMap;
use tracing::{debug, warn};

/// Known streams and their expected consumer groups.
/// These must match the actual groups created by judge-worker and llm-worker.
const MONITORED_STREAMS: &[(&str, &str)] = &[
    ("submissions", "judge_workers"),
    ("submissions:contest", "judge_workers"),
    ("analysis_events", "analysis_workers"),
];

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/// Parsed heartbeat data for a single worker.
#[derive(Debug, Clone, Serialize)]
pub struct WorkerHeartbeat {
    pub worker_id: String,
    pub active_judgements: usize,
    pub total_processed: usize,
    pub avg_wait_ms: usize,
    pub redis_breaker_state: String,
    pub api_breaker_state: String,
    pub last_seen: String,
}

/// Backlog depth for a single stream + consumer group.
#[derive(Debug, Clone, Serialize)]
pub struct StreamBacklog {
    pub stream: String,
    pub consumer_group: String,
    /// Messages delivered but not yet ACKed.
    pub pending: usize,
    /// Messages in the stream not yet delivered to this consumer group.
    pub lag: usize,
    /// Total backlog = pending + lag.
    pub total: usize,
}

/// Full Redis collector result.
#[derive(Debug, Clone, Serialize)]
pub struct RedisCollectorResult {
    pub workers: Vec<WorkerHeartbeat>,
    pub streams: Vec<StreamBacklog>,
}

// ---------------------------------------------------------------------------
// Collector
// ---------------------------------------------------------------------------

/// Redis data collector — read-only monitoring queries.
pub struct RedisCollector;

/// Check if a Redis error is a "NOGROUP" or "no such key" error, indicating
/// the stream or consumer group doesn't exist yet (legitimate 0 backlog).
/// All other errors (connection, timeout, auth) are real infrastructure failures.
fn is_no_group_error(err: &deadpool_redis::redis::RedisError) -> bool {
    let msg = err.to_string().to_lowercase();
    msg.contains("nogroup") || msg.contains("no such key") || msg.contains("doesn't exist")
}

impl RedisCollector {
    /// Scan for all worker heartbeat keys using SCAN (production-safe).
    ///
    /// Returns parsed heartbeat structs for each active worker found.
    /// Keys with empty or unparseable fields are logged and skipped.
    pub async fn scan_heartbeats(
        redis_pool: &deadpool_redis::Pool,
    ) -> Result<Vec<WorkerHeartbeat>> {
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
                        warn!(key = %key, error = %e, "Failed to read heartbeat data");
                        continue;
                    }
                };

                if fields.is_empty() {
                    continue;
                }

                match Self::parse_heartbeat(&fields) {
                    Some(hb) => workers.push(hb),
                    None => {
                        debug!(key = %key, "Skipping heartbeat with missing/invalid fields");
                    }
                }
            }

            cursor = new_cursor;
            if cursor == 0 {
                break;
            }
        }

        if failed_reads > 0 && workers.is_empty() {
            return Err(anyhow::anyhow!(
                "All {} heartbeat key reads failed — Redis may be degraded",
                failed_reads
            ));
        }

        if failed_reads > 0 {
            warn!(
                failed_reads,
                total = workers.len() + failed_reads,
                "Heartbeat scan completed with some failed reads"
            );
        }

        Ok(workers)
    }

    /// Get backlog depth for all monitored streams.
    ///
    /// For each stream, uses XINFO GROUPS to extract pending and lag.
    /// Handles missing streams/groups as 0 backlog.
    /// Streams with nil lag fall back to XLEN for unconsumed count.
    pub async fn get_stream_backlogs(
        redis_pool: &deadpool_redis::Pool,
    ) -> Result<Vec<StreamBacklog>> {
        let mut results = Vec::new();

        for (stream, group) in MONITORED_STREAMS {
            match Self::get_single_stream_depth(redis_pool, stream, group).await {
                Ok(backlog) => {
                    debug!(
                        stream,
                        group,
                        pending = backlog.pending,
                        lag = backlog.lag,
                        total = backlog.total,
                        "Stream backlog measured"
                    );
                    results.push(backlog);
                }
                Err(e) => {
                    warn!(stream, group, error = %e, "Failed to get stream depth");
                    // Return a zero-entry so the caller sees which streams were checked
                    results.push(StreamBacklog {
                        stream: stream.to_string(),
                        consumer_group: group.to_string(),
                        pending: 0,
                        lag: 0,
                        total: 0,
                    });
                }
            }
        }

        Ok(results)
    }

    /// Run both collectors and return the combined result.
    pub async fn collect(redis_pool: &deadpool_redis::Pool) -> RedisCollectorResult {
        let workers = Self::scan_heartbeats(redis_pool)
            .await
            .unwrap_or_else(|e| {
                warn!(error = %e, "Heartbeat scan failed");
                Vec::new()
            });

        let streams = Self::get_stream_backlogs(redis_pool)
            .await
            .unwrap_or_else(|e| {
                warn!(error = %e, "Stream backlog scan failed");
                Vec::new()
            });

        RedisCollectorResult { workers, streams }
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /// Get backlog depth for a single stream + consumer group.
    async fn get_single_stream_depth(
        redis_pool: &deadpool_redis::Pool,
        stream: &str,
        group: &str,
    ) -> Result<StreamBacklog> {
        let mut conn = redis_pool.get().await?;

        let info_result: Result<deadpool_redis::redis::Value, deadpool_redis::redis::RedisError> =
            deadpool_redis::redis::cmd("XINFO")
                .arg("GROUPS")
                .arg(stream)
                .query_async(&mut conn)
                .await;

        match info_result {
            Ok(info) => {
                let (pending, lag) = parse_group_depth(&info, group);
                let lag_val = match lag {
                    Some(l) => l,
                    None => {
                        // lag is nil: consumer group hasn't read anything yet.
                        // Fall back to XLEN for the total stream length.
                        debug!(
                            stream,
                            group,
                            "Consumer group has nil lag, falling back to XLEN"
                        );
                        let total_len: i64 = deadpool_redis::redis::cmd("XLEN")
                            .arg(stream)
                            .query_async(&mut conn)
                            .await
                            .map_err(|e| {
                                anyhow::anyhow!(
                                    "XLEN for stream '{}' failed during nil-lag fallback: {}",
                                    stream,
                                    e
                                )
                            })?;
                        total_len as usize
                    }
                };

                Ok(StreamBacklog {
                    stream: stream.to_string(),
                    consumer_group: group.to_string(),
                    pending,
                    lag: lag_val,
                    total: pending + lag_val,
                })
            }
            Err(ref e) if is_no_group_error(e) => {
                debug!(
                    stream,
                    group,
                    "Stream/group does not exist, returning 0 backlog"
                );
                Ok(StreamBacklog {
                    stream: stream.to_string(),
                    consumer_group: group.to_string(),
                    pending: 0,
                    lag: 0,
                    total: 0,
                })
            }
            Err(e) => Err(anyhow::anyhow!(
                "XINFO GROUPS for stream '{}' failed: {}",
                stream,
                e
            )),
        }
    }

    /// Parse a heartbeat hash field map into a typed struct.
    /// Returns None if required fields are missing or unparseable.
    fn parse_heartbeat(fields: &HashMap<String, String>) -> Option<WorkerHeartbeat> {
        let worker_id = fields.get("worker_id")?.clone();
        if worker_id.is_empty() {
            return None;
        }

        let active_judgements = fields
            .get("active_judgements")
            .and_then(|v| v.parse::<usize>().ok())
            .unwrap_or(0);

        let total_processed = fields
            .get("total_processed")
            .and_then(|v| v.parse::<usize>().ok())
            .unwrap_or(0);

        let avg_wait_ms = fields
            .get("avg_wait_ms")
            .and_then(|v| v.parse::<usize>().ok())
            .unwrap_or(0);

        let redis_breaker_state = fields
            .get("redis_breaker_state")
            .cloned()
            .unwrap_or_default();

        let api_breaker_state = fields
            .get("api_breaker_state")
            .cloned()
            .unwrap_or_default();

        let last_seen = fields.get("last_seen").cloned().unwrap_or_default();

        Some(WorkerHeartbeat {
            worker_id,
            active_judgements,
            total_processed,
            avg_wait_ms,
            redis_breaker_state,
            api_breaker_state,
            last_seen,
        })
    }
}

// ---------------------------------------------------------------------------
// XINFO GROUPS parser (reused from judge_monitor/service.rs pattern)
// ---------------------------------------------------------------------------

/// Parse XINFO GROUPS output to extract `pending` and `lag` for a specific consumer group.
///
/// XINFO GROUPS returns a list of groups, each as alternating key-value pairs:
/// ```text
/// [[name, <val>, consumers, <val>, pending, <val>, last-delivered-id, <val>, lag, <val>, ...], ...]
/// ```
///
/// Returns `(pending, Some(lag))` if the group was found and `lag` is a number.
/// Returns `(pending, None)` if `lag` is nil (group hasn't consumed yet) or absent.
/// Returns `(0, None)` if the target group is not found.
fn parse_group_depth(
    info: &deadpool_redis::redis::Value,
    target_group: &str,
) -> (usize, Option<usize>) {
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
                _ => {
                    i += 2;
                    continue;
                }
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
                            if s.contains("nil") {
                                None
                            } else {
                                s.parse().ok()
                            }
                        }
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // =======================================================================
    // parse_group_depth tests
    // =======================================================================

    /// Helper: build XINFO GROUPS response for a single group.
    fn build_xinfo_response(
        group_name: &str,
        pending: i64,
        lag: Option<i64>,
    ) -> deadpool_redis::redis::Value {
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
        deadpool_redis::redis::Value::Array(vec![deadpool_redis::redis::Value::Array(fields)])
    }

    #[test]
    fn test_parse_group_depth_with_pending_and_lag() {
        let info = build_xinfo_response("judge_workers", 3, Some(7));
        let (pending, lag) = parse_group_depth(&info, "judge_workers");
        assert_eq!(pending, 3);
        assert_eq!(lag, Some(7));
        assert_eq!(pending + lag.unwrap(), 10);
    }

    #[test]
    fn test_parse_group_depth_with_zero_lag() {
        let info = build_xinfo_response("judge_workers", 2, Some(0));
        let (pending, lag) = parse_group_depth(&info, "judge_workers");
        assert_eq!(pending, 2);
        assert_eq!(lag, Some(0));
    }

    #[test]
    fn test_parse_group_depth_nil_lag() {
        let info = build_xinfo_response("judge_workers", 0, None);
        let (pending, lag) = parse_group_depth(&info, "judge_workers");
        assert_eq!(pending, 0);
        assert_eq!(lag, None, "Nil lag means caller must fall back to XLEN");
    }

    #[test]
    fn test_parse_group_depth_wrong_group_returns_zero() {
        let info = build_xinfo_response("other_group", 5, Some(10));
        let (pending, lag) = parse_group_depth(&info, "judge_workers");
        assert_eq!(pending, 0);
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
    fn test_parse_group_depth_multiple_groups() {
        // Two groups: judge_workers and analysis_workers
        let info = deadpool_redis::redis::Value::Array(vec![
            deadpool_redis::redis::Value::Array(vec![
                deadpool_redis::redis::Value::BulkString(b"name".to_vec()),
                deadpool_redis::redis::Value::BulkString(b"judge_workers".to_vec()),
                deadpool_redis::redis::Value::BulkString(b"pending".to_vec()),
                deadpool_redis::redis::Value::Int(5),
                deadpool_redis::redis::Value::BulkString(b"lag".to_vec()),
                deadpool_redis::redis::Value::Int(3),
            ]),
            deadpool_redis::redis::Value::Array(vec![
                deadpool_redis::redis::Value::BulkString(b"name".to_vec()),
                deadpool_redis::redis::Value::BulkString(b"analysis_workers".to_vec()),
                deadpool_redis::redis::Value::BulkString(b"pending".to_vec()),
                deadpool_redis::redis::Value::Int(1),
                deadpool_redis::redis::Value::BulkString(b"lag".to_vec()),
                deadpool_redis::redis::Value::Int(8),
            ]),
        ]);

        let (pending, lag) = parse_group_depth(&info, "analysis_workers");
        assert_eq!(pending, 1);
        assert_eq!(lag, Some(8));
    }

    // =======================================================================
    // is_no_group_error tests
    // =======================================================================

    #[test]
    fn test_is_no_group_error_classifies_correctly() {
        let err = deadpool_redis::redis::RedisError::from((
            deadpool_redis::redis::ErrorKind::ResponseError,
            "NOGROUP No such key 'submissions' or consumer group 'judge_workers'",
        ));
        assert!(is_no_group_error(&err));

        let conn_err = deadpool_redis::redis::RedisError::from((
            deadpool_redis::redis::ErrorKind::IoError,
            "connection refused",
        ));
        assert!(!is_no_group_error(&conn_err));
    }

    // =======================================================================
    // parse_heartbeat tests
    // =======================================================================

    fn make_heartbeat_fields() -> HashMap<String, String> {
        let mut m = HashMap::new();
        m.insert("worker_id".into(), "worker-1".into());
        m.insert("active_judgements".into(), "2".into());
        m.insert("total_processed".into(), "100".into());
        m.insert("avg_wait_ms".into(), "150".into());
        m.insert("redis_breaker_state".into(), "Closed".into());
        m.insert("api_breaker_state".into(), "Closed".into());
        m.insert("last_seen".into(), "2026-04-30T10:00:00Z".into());
        m
    }

    #[test]
    fn test_parse_heartbeat_all_fields() {
        let fields = make_heartbeat_fields();
        let hb = RedisCollector::parse_heartbeat(&fields).expect("Should parse");
        assert_eq!(hb.worker_id, "worker-1");
        assert_eq!(hb.active_judgements, 2);
        assert_eq!(hb.total_processed, 100);
        assert_eq!(hb.avg_wait_ms, 150);
        assert_eq!(hb.redis_breaker_state, "Closed");
        assert_eq!(hb.api_breaker_state, "Closed");
        assert_eq!(hb.last_seen, "2026-04-30T10:00:00Z");
    }

    #[test]
    fn test_parse_heartbeat_missing_worker_id_returns_none() {
        let mut fields = make_heartbeat_fields();
        fields.remove("worker_id");
        assert!(RedisCollector::parse_heartbeat(&fields).is_none());
    }

    #[test]
    fn test_parse_heartbeat_empty_worker_id_returns_none() {
        let mut fields = make_heartbeat_fields();
        fields.insert("worker_id".into(), "".into());
        assert!(RedisCollector::parse_heartbeat(&fields).is_none());
    }

    #[test]
    fn test_parse_heartbeat_defaults_numeric_fields_to_zero() {
        let mut fields = HashMap::new();
        fields.insert("worker_id".into(), "worker-2".into());
        // No numeric fields — should default to 0
        let hb = RedisCollector::parse_heartbeat(&fields).expect("Should parse");
        assert_eq!(hb.active_judgements, 0);
        assert_eq!(hb.total_processed, 0);
        assert_eq!(hb.avg_wait_ms, 0);
        assert_eq!(hb.redis_breaker_state, "");
        assert_eq!(hb.api_breaker_state, "");
        assert_eq!(hb.last_seen, "");
    }

    #[test]
    fn test_parse_heartbeat_malformed_numbers_default_to_zero() {
        let mut fields = HashMap::new();
        fields.insert("worker_id".into(), "worker-3".into());
        fields.insert("active_judgements".into(), "not_a_number".into());
        fields.insert("total_processed".into(), "abc".into());
        fields.insert("avg_wait_ms".into(), "".into());
        let hb = RedisCollector::parse_heartbeat(&fields).expect("Should parse");
        assert_eq!(hb.active_judgements, 0);
        assert_eq!(hb.total_processed, 0);
        assert_eq!(hb.avg_wait_ms, 0);
    }

    #[test]
    fn test_parse_heartbeat_empty_hash_returns_none() {
        let fields: HashMap<String, String> = HashMap::new();
        assert!(RedisCollector::parse_heartbeat(&fields).is_none());
    }

    // =======================================================================
    // Monitored streams constant tests
    // =======================================================================

    #[test]
    fn test_monitored_streams_cover_all_known_streams() {
        let streams: Vec<&str> = MONITORED_STREAMS.iter().map(|(s, _)| *s).collect();
        assert!(streams.contains(&"submissions"), "Must monitor submissions");
        assert!(
            streams.contains(&"submissions:contest"),
            "Must monitor submissions:contest"
        );
        assert!(
            streams.contains(&"analysis_events"),
            "Must monitor analysis_events"
        );
    }

    #[test]
    fn test_monitored_streams_have_correct_groups() {
        let groups: std::collections::HashMap<&str, &str> =
            MONITORED_STREAMS.iter().copied().collect();
        assert_eq!(groups["submissions"], "judge_workers");
        assert_eq!(groups["submissions:contest"], "judge_workers");
        assert_eq!(groups["analysis_events"], "analysis_workers");
    }
}
