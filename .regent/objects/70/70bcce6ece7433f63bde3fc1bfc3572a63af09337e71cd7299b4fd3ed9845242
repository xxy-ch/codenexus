//! Integration tests for the monitor-server control-plane API.
//!
//! Tests are split into two categories:
//! - **Pure tests** (no external deps): validate request/response parsing,
//!   target allowlist enforcement, confirmation flow logic, and audit
//!   record structure. These always run via `cargo test`.
//! - **Redis-backed tests** (marked `#[ignore]`): exercise the full Axum
//!   router against a real Redis instance. Run with `cargo test -- --ignored`
//!   or in CI where Redis is available.

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use monitor_server::audit::AuditResult;
use monitor_server::control::{
    is_valid_target, ControlAction, ControlSignal, ALLOWED_TARGETS, DEFAULT_SIGNAL_TIMEOUT_SECS,
};
use monitor_server::state::AppState;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::broadcast;
use tower::ServiceExt;

// ===========================================================================
// Helpers
// ===========================================================================

/// Build an AppState with real Redis/PG pools (requires both services running).
/// Returns None if either service is unavailable.
async fn build_live_state() -> Option<Arc<AppState>> {
    let redis_url = std::env::var("REDIS_URL")
        .ok()
        .filter(|v| !v.trim().is_empty())
        .unwrap_or_else(|| "redis://127.0.0.1:6379".to_string());

    let redis_pool = deadpool_redis::Config {
        url: Some(redis_url),
        ..Default::default()
    }
    .create_pool(Some(deadpool_redis::Runtime::Tokio1))
    .ok()?;

    // Verify Redis is reachable
    let mut conn = redis_pool.get().await.ok()?;
    deadpool_redis::redis::cmd("PING")
        .query_async::<String>(&mut conn)
        .await
        .ok()?;

    let database_url = std::env::var("DATABASE_URL").ok()?;
    let pg_pool = sqlx::PgPool::connect(&database_url).await.ok()?;

    let (snapshot_tx, _) = broadcast::channel(16);

    Some(AppState::new(pg_pool, redis_pool, snapshot_tx))
}

/// Build the full Axum router from the monitor-server routes module.
/// Uses auth-disabled mode for testing.
fn build_router(state: Arc<AppState>) -> axum::Router {
    use monitor_server::middleware::auth::AuthState;
    let auth_state = AuthState::from_env_value(None);
    monitor_server::routes::build_router(state, auth_state)
}

/// Extract body bytes from a response.
async fn body_bytes(body: Body) -> Vec<u8> {
    body.collect()
        .await
        .expect("failed to read response body")
        .to_bytes()
        .to_vec()
}

/// Build JSON body for creating a control signal.
fn control_request_json(operator: &str) -> String {
    format!(r#"{{"operator":"{}"}}"#, operator)
}

/// Build JSON body for confirming a signal.
fn confirm_request_json(token: &str) -> String {
    format!(r#"{{"confirmation_token":"{}"}}"#, token)
}

// ===========================================================================
// Unit-level tests: control-plane data model & validation (no Redis/PG)
// ===========================================================================

#[test]
fn allowed_targets_is_complete() {
    assert!(is_valid_target("api"));
    assert!(is_valid_target("judge-worker"));
    assert!(is_valid_target("llm-worker"));
    assert!(is_valid_target("domain-analysis"));
    assert!(is_valid_target("monitor"));
    assert_eq!(ALLOWED_TARGETS.len(), 5);
}

#[test]
fn reject_invalid_targets() {
    assert!(!is_valid_target(""));
    assert!(!is_valid_target("admin"));
    assert!(!is_valid_target("postgres"));
    assert!(!is_valid_target("random-service"));
    assert!(!is_valid_target("API")); // case-sensitive
}

#[test]
fn control_action_parse_roundtrip() {
    for action_str in &["pause", "resume", "restart"] {
        let action: ControlAction = action_str.parse().unwrap();
        assert_eq!(action.as_str(), *action_str);
    }
}

#[test]
fn control_action_reject_invalid() {
    assert!("kill".parse::<ControlAction>().is_err());
    assert!("stop".parse::<ControlAction>().is_err());
    assert!("PAUSE".parse::<ControlAction>().is_err());
}

#[test]
fn control_signal_redis_key_convention() {
    assert_eq!(ControlSignal::redis_key("api"), "control:signal:api");
    assert_eq!(
        ControlSignal::redis_key("judge-worker"),
        "control:signal:judge-worker"
    );
}

#[test]
fn control_signal_json_roundtrip() {
    let now = chrono::Utc::now();
    let signal = ControlSignal {
        action: ControlAction::Pause,
        target: "api".to_string(),
        operator: "admin".to_string(),
        created_at: now,
        expires_at: Some(now + chrono::Duration::seconds(1800)),
        confirmed: false,
        confirmation_token: Some("test-token-uuid".to_string()),
    };

    let json = signal.to_json().unwrap();
    let parsed = ControlSignal::from_json(&json).unwrap();
    assert_eq!(signal, parsed);
}

#[test]
fn control_signal_expiry_logic() {
    let now = chrono::Utc::now();

    // Expired signal
    let expired = ControlSignal {
        action: ControlAction::Pause,
        target: "api".to_string(),
        operator: "admin".to_string(),
        created_at: now - chrono::Duration::minutes(35),
        expires_at: Some(now - chrono::Duration::minutes(5)),
        confirmed: true,
        confirmation_token: None,
    };
    assert!(expired.is_expired(now));

    // Future expiry
    let future = ControlSignal {
        action: ControlAction::Pause,
        target: "api".to_string(),
        operator: "admin".to_string(),
        created_at: now,
        expires_at: Some(now + chrono::Duration::minutes(25)),
        confirmed: true,
        confirmation_token: None,
    };
    assert!(!future.is_expired(now));

    // No expiry set
    let no_expiry = ControlSignal {
        action: ControlAction::Pause,
        target: "api".to_string(),
        operator: "admin".to_string(),
        created_at: now,
        expires_at: None,
        confirmed: true,
        confirmation_token: None,
    };
    assert!(!no_expiry.is_expired(now));
}

#[test]
fn signal_created_as_unconfirmed() {
    let now = chrono::Utc::now();
    let signal = ControlSignal {
        action: ControlAction::Pause,
        target: "api".to_string(),
        operator: "admin".to_string(),
        created_at: now,
        expires_at: Some(now + chrono::Duration::seconds(DEFAULT_SIGNAL_TIMEOUT_SECS as i64)),
        confirmed: false,
        confirmation_token: Some("token-123".to_string()),
    };
    assert!(!signal.confirmed, "new signals must start unconfirmed");
    assert!(
        signal.confirmation_token.is_some(),
        "new signals must have a confirmation token"
    );
}

#[test]
fn signal_after_confirmation() {
    let now = chrono::Utc::now();
    let mut signal = ControlSignal {
        action: ControlAction::Pause,
        target: "api".to_string(),
        operator: "admin".to_string(),
        created_at: now,
        expires_at: Some(now + chrono::Duration::seconds(1800)),
        confirmed: false,
        confirmation_token: Some("token-456".to_string()),
    };
    // Simulate confirmation step
    signal.confirmed = true;
    signal.confirmation_token = None;

    assert!(signal.confirmed);
    assert!(signal.confirmation_token.is_none());
}

#[test]
fn audit_result_values() {
    assert_eq!(AuditResult::Success.as_str(), "success");
    assert_eq!(AuditResult::Failure.as_str(), "failure");
}

#[test]
fn default_signal_timeout_is_30_minutes() {
    assert_eq!(DEFAULT_SIGNAL_TIMEOUT_SECS, 1800);
}

// ===========================================================================
// Unit tests: request/response type deserialization (no external deps)
// ===========================================================================

#[test]
fn control_request_body_parsing() {
    let json = r#"{"operator":"admin"}"#;
    let val: Value = serde_json::from_str(json).unwrap();
    assert_eq!(val["operator"], "admin");
}

#[test]
fn confirm_request_body_parsing() {
    let json = r#"{"confirmation_token":"abc-123-def"}"#;
    let val: Value = serde_json::from_str(json).unwrap();
    assert_eq!(val["confirmation_token"], "abc-123-def");
}

#[test]
fn pending_response_shape() {
    let json = r#"{
        "target": "api",
        "action": "pause",
        "status": "pending_confirmation",
        "confirmation_token": "tok",
        "expires_in_secs": 1800,
        "message": "Confirm to activate."
    }"#;
    let val: Value = serde_json::from_str(json).unwrap();
    assert_eq!(val["status"], "pending_confirmation");
    assert_eq!(val["confirmation_token"], "tok");
    assert_eq!(val["expires_in_secs"], 1800);
}

#[test]
fn error_response_shape() {
    let json = r#"{"error":"invalid target 'foo'"}"#;
    let val: Value = serde_json::from_str(json).unwrap();
    assert_eq!(val["error"], "invalid target 'foo'");
}

#[test]
fn signal_status_response_with_signal() {
    let json = r#"{
        "target": "api",
        "signal": {
            "action": "pause",
            "target": "api",
            "operator": "admin",
            "created_at": "2025-01-01T00:00:00Z",
            "expires_at": null,
            "confirmed": false,
            "confirmation_token": "tok"
        }
    }"#;
    let val: Value = serde_json::from_str(json).unwrap();
    assert_eq!(val["target"], "api");
    assert_eq!(val["signal"]["action"], "pause");
    assert_eq!(val["signal"]["confirmed"], false);
}

#[test]
fn signal_status_response_null_signal() {
    let json = r#"{"target":"api","signal":null}"#;
    let val: Value = serde_json::from_str(json).unwrap();
    assert!(val["signal"].is_null());
}

#[test]
fn confirm_response_shape() {
    let json = r#"{
        "target": "api",
        "action": "pause",
        "status": "confirmed",
        "message": "Signal activated."
    }"#;
    let val: Value = serde_json::from_str(json).unwrap();
    assert_eq!(val["status"], "confirmed");
}

#[test]
fn audit_log_response_shape() {
    let json = r#"{"entries":[],"count":0}"#;
    let val: Value = serde_json::from_str(json).unwrap();
    assert_eq!(val["count"], 0);
    assert!(val["entries"].as_array().unwrap().is_empty());
}

// ===========================================================================
// Redis-backed integration tests (ignored unless Redis is available)
// ===========================================================================
//
// Run with: cargo test -p monitor-server -- --ignored
// In CI, Redis should be available so these run automatically.

#[tokio::test]
#[ignore = "requires running Redis instance"]
async fn create_pause_signal_writes_to_redis() {
    let state = build_live_state()
        .await
        .expect("Redis and PostgreSQL must be available");
    let app = build_router(state.clone());

    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/control/services/api/pause")
                .header("content-type", "application/json")
                .body(Body::from(control_request_json("test-admin")))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::ACCEPTED);
    let bytes = body_bytes(resp.into_body()).await;
    let val: Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(val["status"], "pending_confirmation");
    assert_eq!(val["target"], "api");
    assert_eq!(val["action"], "pause");

    // Verify signal in Redis
    let mut conn = state.redis_pool.get().await.unwrap();
    let json: Option<String> = deadpool_redis::redis::cmd("GET")
        .arg("control:signal:api")
        .query_async(&mut conn)
        .await
        .unwrap();
    assert!(json.is_some(), "signal should be written to Redis");

    let signal: ControlSignal = ControlSignal::from_json(&json.unwrap()).unwrap();
    assert_eq!(signal.action, ControlAction::Pause);
    assert_eq!(signal.target, "api");
    assert!(!signal.confirmed, "new signal should be unconfirmed");
    assert!(signal.confirmation_token.is_some());

    // Cleanup
    deadpool_redis::redis::cmd("DEL")
        .arg("control:signal:api")
        .query_async::<()>(&mut conn)
        .await
        .unwrap();
}

#[tokio::test]
#[ignore = "requires running Redis instance"]
async fn reject_invalid_target() {
    let state = build_live_state()
        .await
        .expect("Redis and PostgreSQL must be available");
    let app = build_router(state);

    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/control/services/unknown-service/pause")
                .header("content-type", "application/json")
                .body(Body::from(control_request_json("test-admin")))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    let bytes = body_bytes(resp.into_body()).await;
    let val: Value = serde_json::from_slice(&bytes).unwrap();
    assert!(val["error"].as_str().unwrap().contains("invalid target"));
}

#[tokio::test]
#[ignore = "requires running Redis instance"]
async fn reject_invalid_action() {
    let state = build_live_state()
        .await
        .expect("Redis and PostgreSQL must be available");
    let app = build_router(state);

    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/control/services/api/explode")
                .header("content-type", "application/json")
                .body(Body::from(control_request_json("test-admin")))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
#[ignore = "requires running Redis instance"]
async fn reject_empty_operator() {
    let state = build_live_state()
        .await
        .expect("Redis and PostgreSQL must be available");
    let app = build_router(state);

    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/control/services/api/pause")
                .header("content-type", "application/json")
                .body(Body::from(control_request_json("  ")))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    let bytes = body_bytes(resp.into_body()).await;
    let val: Value = serde_json::from_slice(&bytes).unwrap();
    assert!(val["error"].as_str().unwrap().contains("operator"));
}

#[tokio::test]
#[ignore = "requires running Redis instance"]
async fn unconfirmed_signal_returned_by_status() {
    let state = build_live_state()
        .await
        .expect("Redis and PostgreSQL must be available");
    let app = build_router(state.clone());

    // Create an unconfirmed signal directly in Redis
    let signal = ControlSignal {
        action: ControlAction::Pause,
        target: "api".to_string(),
        operator: "test".to_string(),
        created_at: chrono::Utc::now(),
        expires_at: Some(chrono::Utc::now() + chrono::Duration::seconds(1800)),
        confirmed: false,
        confirmation_token: Some("token-xyz".to_string()),
    };
    let mut conn = state.redis_pool.get().await.unwrap();
    deadpool_redis::redis::cmd("SET")
        .arg("control:signal:api")
        .arg(signal.to_json().unwrap())
        .arg("EX")
        .arg(2000)
        .query_async::<()>(&mut conn)
        .await
        .unwrap();

    // Read status — the signal should be returned as-is (confirmed: false)
    let resp = app
        .oneshot(
            Request::builder()
                .uri("/api/control/services/api/status")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    let bytes = body_bytes(resp.into_body()).await;
    let val: Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(val["target"], "api");
    let sig = &val["signal"];
    assert!(sig.is_object(), "signal should be present");
    assert_eq!(sig["confirmed"], false);
    assert_eq!(sig["action"], "pause");

    // Cleanup
    deadpool_redis::redis::cmd("DEL")
        .arg("control:signal:api")
        .query_async::<()>(&mut conn)
        .await
        .unwrap();
}

#[tokio::test]
#[ignore = "requires running Redis and PostgreSQL"]
async fn two_step_confirmation_flow() {
    let state = build_live_state()
        .await
        .expect("Redis and PostgreSQL must be available");
    let app = build_router(state.clone());

    // Step 1: Create pending signal
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/control/services/judge-worker/pause")
                .header("content-type", "application/json")
                .body(Body::from(control_request_json("test-admin")))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::ACCEPTED);
    let bytes = body_bytes(resp.into_body()).await;
    let val: Value = serde_json::from_slice(&bytes).unwrap();
    let token = val["confirmation_token"].as_str().unwrap().to_string();
    assert!(!token.is_empty(), "confirmation token should be returned");

    // Step 2: Confirm with wrong token → 403
    let app2 = build_router(state.clone());
    let resp = app2
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/control/services/judge-worker/pause/confirm")
                .header("content-type", "application/json")
                .body(Body::from(confirm_request_json("wrong-token")))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::FORBIDDEN);

    // Step 3: Confirm with correct token → 200
    let app3 = build_router(state.clone());
    let resp = app3
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/control/services/judge-worker/pause/confirm")
                .header("content-type", "application/json")
                .body(Body::from(confirm_request_json(&token)))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    let bytes = body_bytes(resp.into_body()).await;
    let val: Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(val["status"], "confirmed");

    // Verify signal is now confirmed in Redis
    let mut conn = state.redis_pool.get().await.unwrap();
    let json: Option<String> = deadpool_redis::redis::cmd("GET")
        .arg("control:signal:judge-worker")
        .query_async(&mut conn)
        .await
        .unwrap();
    let signal = ControlSignal::from_json(&json.unwrap()).unwrap();
    assert!(signal.confirmed);
    assert!(
        signal.confirmation_token.is_none(),
        "token should be cleared after confirmation"
    );

    // Step 4: Try to confirm again → 409 Conflict
    let app4 = build_router(state);
    let resp = app4
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/control/services/judge-worker/pause/confirm")
                .header("content-type", "application/json")
                .body(Body::from(confirm_request_json("any-token")))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::CONFLICT);

    // Cleanup
    deadpool_redis::redis::cmd("DEL")
        .arg("control:signal:judge-worker")
        .query_async::<()>(&mut conn)
        .await
        .unwrap();
}

#[tokio::test]
#[ignore = "requires running Redis and PostgreSQL"]
async fn audit_log_records_control_action() {
    let state = build_live_state()
        .await
        .expect("Redis and PostgreSQL must be available");
    let app = build_router(state.clone());

    // Create a signal (this should write an audit entry)
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/control/services/llm-worker/resume")
                .header("content-type", "application/json")
                .body(Body::from(control_request_json("audit-tester")))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::ACCEPTED);

    // Query audit log
    let app2 = build_router(state);
    let resp = app2
        .oneshot(
            Request::builder()
                .uri("/api/control/audit-log?limit=5&target=llm-worker")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    let bytes = body_bytes(resp.into_body()).await;
    let val: Value = serde_json::from_slice(&bytes).unwrap();
    let entries = val["entries"].as_array().unwrap();
    assert!(!entries.is_empty(), "audit log should have entries");
    let first = &entries[0];
    assert_eq!(first["target"], "llm-worker");
    assert_eq!(first["action"], "resume");
    assert_eq!(first["operator"], "audit-tester");
    assert_eq!(first["result"], "success");
}

#[tokio::test]
#[ignore = "requires running Redis and PostgreSQL"]
async fn get_services_returns_snapshot() {
    let state = build_live_state()
        .await
        .expect("Redis and PostgreSQL must be available");
    let app = build_router(state);

    let resp = app
        .oneshot(
            Request::builder()
                .uri("/api/services")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    let bytes = body_bytes(resp.into_body()).await;
    let val: Value = serde_json::from_slice(&bytes).unwrap();
    assert!(val.get("timestamp").is_some());
    assert!(val.get("services").is_some());
    assert!(val.get("streams").is_some());
    assert!(val.get("analysis_metrics").is_some());
}

#[tokio::test]
#[ignore = "requires running Redis"]
async fn status_returns_null_when_no_signal() {
    let state = build_live_state()
        .await
        .expect("Redis and PostgreSQL must be available");

    // Ensure no signal exists for domain-analysis
    let mut conn = state.redis_pool.get().await.unwrap();
    deadpool_redis::redis::cmd("DEL")
        .arg("control:signal:domain-analysis")
        .query_async::<()>(&mut conn)
        .await
        .unwrap();

    let app = build_router(state);
    let resp = app
        .oneshot(
            Request::builder()
                .uri("/api/control/services/domain-analysis/status")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::OK);
    let bytes = body_bytes(resp.into_body()).await;
    let val: Value = serde_json::from_slice(&bytes).unwrap();
    assert!(val["signal"].is_null(), "no signal should return null");
}
