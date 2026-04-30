//! REST handlers for monitoring snapshot endpoints.
//!
//! Two endpoints:
//! - `GET /api/services` — full `MonitorSnapshot` (workers + streams + analysis + flags + control signals)
//! - `GET /api/services/:target` — single service status from the snapshot
//!
//! Both endpoints share `assemble_snapshot` to avoid duplication.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use serde_json::{json, Value};
use std::sync::Arc;
use tracing::{info, warn};

use crate::snapshot::assemble_snapshot;
use crate::state::AppState;

/// `GET /api/services` — return the full monitoring snapshot.
///
/// Runs all collectors, reads control signals, and returns the complete
/// `MonitorSnapshot` as JSON.
pub async fn get_full_snapshot(
    State(state): State<Arc<AppState>>,
) -> Json<crate::models::MonitorSnapshot> {
    let snapshot = assemble_snapshot(&state).await;
    info!(
        service_count = snapshot.services.len(),
        stream_count = snapshot.streams.len(),
        "[monitor-api] GET /api/services responded"
    );
    Json(snapshot)
}

/// `GET /api/services/:target` — return a single service's status.
///
/// Assembles the full snapshot and filters by `worker_id` matching the
/// `:target` path parameter. Returns 404 if no matching service is found.
pub async fn get_service_status(
    State(state): State<Arc<AppState>>,
    Path(target): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let snapshot = assemble_snapshot(&state).await;

    let matched: Vec<_> = snapshot
        .services
        .into_iter()
        .filter(|s| s.worker_id == target)
        .collect();

    if matched.is_empty() {
        warn!(target = %target, "[monitor-api] GET /api/services/:target — not found");
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": "service not found",
                "target": target,
            })),
        ));
    }

    info!(
        target = %target,
        match_count = matched.len(),
        "[monitor-api] GET /api/services/:target responded"
    );

    Ok(Json(json!({
        "target": target,
        "status": matched,
        "timestamp": snapshot.timestamp,
        "control_signal": snapshot.control_signals.get(&target),
    })))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::*;
    use std::collections::HashMap;

    fn make_test_snapshot() -> MonitorSnapshot {
        MonitorSnapshot {
            timestamp: "2026-04-30T12:00:00Z".to_string(),
            services: vec![
                ServiceStatus {
                    worker_id: "judge-worker-1".to_string(),
                    active_judgements: 2,
                    total_processed: 100,
                    avg_wait_ms: 150,
                    redis_breaker_state: "Closed".to_string(),
                    api_breaker_state: "Closed".to_string(),
                    last_seen: "2026-04-30T11:59:00Z".to_string(),
                },
                ServiceStatus {
                    worker_id: "judge-worker-2".to_string(),
                    active_judgements: 0,
                    total_processed: 50,
                    avg_wait_ms: 80,
                    redis_breaker_state: "Closed".to_string(),
                    api_breaker_state: "Closed".to_string(),
                    last_seen: "2026-04-30T11:58:00Z".to_string(),
                },
            ],
            streams: vec![StreamBacklog {
                stream: "submissions".to_string(),
                consumer_group: "judge_workers".to_string(),
                pending: 3,
                lag: 7,
                total: 10,
            }],
            analysis_metrics: AnalysisMetrics {
                pending: 5,
                processing: 2,
                completed: 100,
                failed: 3,
                total_prompt_tokens: 50000,
                total_completion_tokens: 20000,
                avg_latency_ms: 1234.5,
            },
            feature_flags: vec![],
            control_signals: HashMap::new(),
        }
    }

    #[test]
    fn snapshot_json_includes_all_top_level_fields() {
        let snapshot = make_test_snapshot();
        let json = serde_json::to_string(&snapshot).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert!(parsed.get("timestamp").is_some());
        assert!(parsed.get("services").is_some());
        assert!(parsed.get("streams").is_some());
        assert!(parsed.get("analysis_metrics").is_some());
        assert!(parsed.get("feature_flags").is_some());
    }

    #[test]
    fn snapshot_services_is_array() {
        let snapshot = make_test_snapshot();
        let json = serde_json::to_string(&snapshot).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();

        let services = parsed["services"].as_array().unwrap();
        assert_eq!(services.len(), 2);
        assert_eq!(services[0]["worker_id"], "judge-worker-1");
        assert_eq!(services[1]["worker_id"], "judge-worker-2");
    }

    #[test]
    fn not_found_response_shape() {
        let body = json!({
            "error": "service not found",
            "target": "nonexistent-worker",
        });
        assert_eq!(body["error"], "service not found");
        assert_eq!(body["target"], "nonexistent-worker");
    }

    #[test]
    fn single_service_response_includes_target_and_timestamp() {
        let snapshot = make_test_snapshot();
        let response: serde_json::Value = json!({
            "target": "judge-worker-1",
            "status": Vec::<serde_json::Value>::new(),
            "timestamp": snapshot.timestamp,
        });
        assert_eq!(response["target"], "judge-worker-1");
        assert_eq!(response["timestamp"], "2026-04-30T12:00:00Z");
    }

    #[test]
    fn control_signal_included_in_single_service_response() {
        let mut signals = HashMap::new();
        signals.insert("judge-worker".to_string(), "pause:judge-worker (by admin, confirmed=true)".to_string());

        let snapshot = MonitorSnapshot {
            timestamp: "2026-04-30T12:00:00Z".to_string(),
            services: vec![],
            streams: vec![],
            analysis_metrics: AnalysisMetrics {
                pending: 0,
                processing: 0,
                completed: 0,
                failed: 0,
                total_prompt_tokens: 0,
                total_completion_tokens: 0,
                avg_latency_ms: 0.0,
            },
            feature_flags: vec![],
            control_signals: signals,
        };

        let signal = snapshot.control_signals.get("judge-worker");
        assert!(signal.is_some());
        assert!(signal.unwrap().contains("pause"));
    }
}
