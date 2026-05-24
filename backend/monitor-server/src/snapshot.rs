//! Snapshot assembly — combines all collectors and control signals into a MonitorSnapshot.
//!
//! The `assemble_snapshot` function is the shared entry point for both REST
//! and WebSocket consumers. It runs the Redis heartbeat/backlog collectors,
//! the DB analysis-metrics/feature-flag collectors, and reads all control
//! signals from Redis, producing a single `MonitorSnapshot`.

use std::collections::HashMap;
use tracing::{info, warn};

use crate::collectors::db_collector::DbCollector;
use crate::collectors::redis_collector::RedisCollector;
use crate::control::{ControlSignal, ALLOWED_TARGETS};
use crate::models::MonitorSnapshot;
use crate::state::AppState;

/// Assemble a full monitoring snapshot by running all collectors and reading
/// control signals. This is the shared function for both REST and WS paths.
///
/// Each collector failure is isolated — one degraded source does not prevent
/// the rest of the snapshot from being assembled.
pub async fn assemble_snapshot(state: &AppState) -> MonitorSnapshot {
    let start = std::time::Instant::now();

    // Run Redis collector (heartbeats + stream backlogs)
    let redis_result = RedisCollector::collect(&state.redis_pool).await;
    let services: Vec<_> = redis_result
        .workers
        .into_iter()
        .map(|w| crate::models::ServiceStatus {
            worker_id: w.worker_id,
            active_judgements: w.active_judgements,
            total_processed: w.total_processed,
            avg_wait_ms: w.avg_wait_ms,
            redis_breaker_state: w.redis_breaker_state,
            api_breaker_state: w.api_breaker_state,
            last_seen: w.last_seen,
        })
        .collect();
    let streams: Vec<_> = redis_result
        .streams
        .into_iter()
        .map(|s| crate::models::StreamBacklog {
            stream: s.stream,
            consumer_group: s.consumer_group,
            pending: s.pending,
            lag: s.lag,
            total: s.total,
        })
        .collect();

    // Run DB collector (analysis metrics + feature flags)
    let (analysis_metrics, feature_flags) = DbCollector::collect(&state.pg_pool).await;

    // Read control signals from Redis
    let control_signals = read_all_control_signals(&state.redis_pool).await;

    let elapsed = start.elapsed();

    let snapshot = MonitorSnapshot {
        timestamp: chrono::Utc::now().to_rfc3339(),
        services,
        streams,
        analysis_metrics,
        feature_flags,
        control_signals,
    };

    info!(
        duration_ms = elapsed.as_millis() as u64,
        service_count = snapshot.services.len(),
        stream_count = snapshot.streams.len(),
        signal_count = snapshot.control_signals.len(),
        "[monitor-api] snapshot assembled"
    );

    snapshot
}

/// Read all control signals from Redis by iterating ALLOWED_TARGETS.
///
/// For each target, reads the `control:signal:{target}` key and, if present,
/// stores a summary string in the returned map. Failed reads are logged and
/// skipped — a single bad key does not block the rest.
async fn read_all_control_signals(redis_pool: &deadpool_redis::Pool) -> HashMap<String, String> {
    use deadpool_redis::redis::cmd;

    let mut signals = HashMap::new();

    for &target in ALLOWED_TARGETS {
        let key = ControlSignal::redis_key(target);

        let conn_result = redis_pool.get().await;
        let mut conn = match conn_result {
            Ok(c) => c,
            Err(e) => {
                warn!(target, error = %e, "[snapshot] failed to get Redis connection for control signal");
                continue;
            }
        };

        let json: Option<String> = match cmd("GET").arg(&key).query_async(&mut conn).await {
            Ok(val) => val,
            Err(e) => {
                warn!(target, error = %e, "[snapshot] failed to read control signal");
                continue;
            }
        };

        if let Some(json_str) = json {
            match ControlSignal::from_json(&json_str) {
                Ok(signal) => {
                    // Store a human-readable summary of the signal
                    let summary = format!(
                        "{}:{} (by {}, confirmed={})",
                        signal.action.as_str(),
                        signal.target,
                        signal.operator,
                        signal.confirmed,
                    );
                    signals.insert(target.to_string(), summary);
                }
                Err(e) => {
                    warn!(target, error = %e, "[snapshot] failed to parse control signal JSON");
                }
            }
        }
    }

    signals
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn control_signal_redis_key_format() {
        for &target in ALLOWED_TARGETS {
            let key = ControlSignal::redis_key(target);
            assert!(key.starts_with("control:signal:"));
            assert!(key.ends_with(target));
        }
    }

    #[test]
    fn control_signal_summary_format() {
        // Verify the summary string format is parseable and contains key info
        let summary = format!("{}:{} (by {}, confirmed={})", "pause", "api", "admin", true,);
        assert!(summary.contains("pause"));
        assert!(summary.contains("api"));
        assert!(summary.contains("admin"));
        assert!(summary.contains("confirmed=true"));
    }

    #[test]
    fn allowed_targets_is_not_empty() {
        assert!(
            !ALLOWED_TARGETS.is_empty(),
            "ALLOWED_TARGETS should have entries"
        );
    }
}
