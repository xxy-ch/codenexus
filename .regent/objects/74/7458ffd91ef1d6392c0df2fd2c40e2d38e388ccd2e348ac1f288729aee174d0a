//! Control-signal polling and pause middleware.
//!
//! Consumes control signals written by monitor-server to Redis under
//! `control:signal:api`. A background task polls every 5 s and updates
//! an `Arc<AtomicBool>`. The pause middleware reads that flag and returns
//! 503 for business routes while keeping health/metrics/internal routes
//! untouched.

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::response::{IntoResponse, Response};
use serde::Deserialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tracing::{info, warn};

// ---------------------------------------------------------------------------
// Minimal local view of the control signal
// ---------------------------------------------------------------------------

/// Only the fields the API consumer needs. Kept local per MEM049 —
/// no dependency on the monitor-server crate.
#[derive(Debug, Clone, Deserialize)]
struct ControlSignalView {
    action: String,
    #[allow(dead_code)]
    target: String,
    confirmed: bool,
}

/// Determine whether a parsed signal indicates a paused state.
///
/// - `pause` + `confirmed=true` → paused
/// - `resume` + `confirmed=true` → not paused
/// - Anything else (unconfirmed, unknown action, parse failure) → keep
///   current state
fn should_pause(signal: Option<&ControlSignalView>) -> Option<bool> {
    match signal {
        Some(s) if s.confirmed && s.action == "pause" => Some(true),
        Some(s) if s.confirmed && s.action == "resume" => Some(false),
        _ => None, // keep current state
    }
}

// ---------------------------------------------------------------------------
// Pause middleware
// ---------------------------------------------------------------------------

/// Axum middleware that returns 503 when the service is paused.
///
/// Must only be layered on business routes (rate_limited_public +
/// protected_router). Health, metrics, and internal routes must NOT carry
/// this layer.
pub async fn pause_middleware(
    is_paused: Arc<AtomicBool>,
    req: Request<Body>,
    next: axum::middleware::Next,
) -> Response {
    if is_paused.load(Ordering::Relaxed) {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            axum::Json(serde_json::json!({
                "status": "paused",
                "target": "api"
            })),
        )
            .into_response();
    }
    next.run(req).await
}

// ---------------------------------------------------------------------------
// Background polling task
// ---------------------------------------------------------------------------

/// Redis key for the API control signal.
const CONTROL_SIGNAL_KEY: &str = "control:signal:api";

/// Polling interval (5 seconds).
const POLL_INTERVAL: Duration = Duration::from_secs(5);

/// Spawn a background task that polls Redis for control signals every 5 s
/// and updates `is_paused`.
///
/// If Redis is unavailable (pool is `None` or connection fails), the
/// current pause state is preserved and a warning is logged.
pub fn start_control_signal_polling(
    redis_pool: Option<deadpool_redis::Pool>,
    is_paused: Arc<AtomicBool>,
) {
    tokio::spawn(async move {
        info!("[control-signal] polling task started (5s interval)");

        let mut interval = tokio::time::interval(POLL_INTERVAL);
        // Skip the first immediate tick so we don't poll during startup
        // before dependent services are ready.
        interval.tick().await;

        loop {
            interval.tick().await;

            let pool = match &redis_pool {
                Some(p) => p,
                None => {
                    // No Redis configured — nothing to poll. Keep current state.
                    continue;
                }
            };

            let conn_result = pool.get().await;
            let mut conn = match conn_result {
                Ok(c) => c,
                Err(e) => {
                    warn!("[control-signal] Redis pool get failed: {e}");
                    continue;
                }
            };

            let json: Option<String> = match deadpool_redis::redis::cmd("GET")
                .arg(CONTROL_SIGNAL_KEY)
                .query_async(&mut conn)
                .await
            {
                Ok(val) => val,
                Err(e) => {
                    warn!("[control-signal] Redis GET error: {e}");
                    continue;
                }
            };

            let signal: Option<ControlSignalView> = match json {
                Some(ref j) => match serde_json::from_str::<ControlSignalView>(j) {
                    Ok(s) => Some(s),
                    Err(e) => {
                        warn!("[control-signal] Failed to parse signal JSON: {e}");
                        None
                    }
                },
                None => None,
            };

            if let Some(new_state) = should_pause(signal.as_ref()) {
                let prev = is_paused.load(Ordering::Relaxed);
                if prev != new_state {
                    is_paused.store(new_state, Ordering::Relaxed);
                    info!(paused = new_state, "[control-signal] state changed");
                }
            }
        }
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;
    use axum::http::StatusCode;
    use axum::routing::get;
    use axum::Router;
    use tower::ServiceExt;

    /// Helper: build a minimal router with the pause middleware applied.
    fn test_router(is_paused: Arc<AtomicBool>) -> Router {
        let inner = Router::new().route("/test", get(|| async { "ok" }));
        inner.layer(axum::middleware::from_fn(move |req, next| {
            let flag = is_paused.clone();
            async move { pause_middleware(flag, req, next).await }
        }))
    }

    #[tokio::test]
    async fn pause_middleware_allows_when_not_paused() {
        let is_paused = Arc::new(AtomicBool::new(false));
        let app = test_router(is_paused);

        let resp = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(resp.status(), StatusCode::OK);
        let body = to_bytes(resp.into_body(), 1024).await.unwrap();
        assert_eq!(&body[..], b"ok");
    }

    #[tokio::test]
    async fn pause_middleware_returns_503_when_paused() {
        let is_paused = Arc::new(AtomicBool::new(true));
        let app = test_router(is_paused);

        let resp = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(resp.status(), StatusCode::SERVICE_UNAVAILABLE);
        let body = to_bytes(resp.into_body(), 1024).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["status"], "paused");
        assert_eq!(json["target"], "api");
    }

    #[test]
    fn should_pause_confirmed_pause_signal() {
        let signal = ControlSignalView {
            action: "pause".into(),
            target: "api".into(),
            confirmed: true,
        };
        assert_eq!(should_pause(Some(&signal)), Some(true));
    }

    #[test]
    fn should_pause_confirmed_resume_signal() {
        let signal = ControlSignalView {
            action: "resume".into(),
            target: "api".into(),
            confirmed: true,
        };
        assert_eq!(should_pause(Some(&signal)), Some(false));
    }

    #[test]
    fn should_pause_unconfirmed_signal_returns_none() {
        let signal = ControlSignalView {
            action: "pause".into(),
            target: "api".into(),
            confirmed: false,
        };
        assert_eq!(should_pause(Some(&signal)), None);
    }

    #[test]
    fn should_pause_none_returns_none() {
        assert_eq!(should_pause(None), None);
    }

    #[test]
    fn should_pause_unknown_action_returns_none() {
        let signal = ControlSignalView {
            action: "restart".into(),
            target: "api".into(),
            confirmed: true,
        };
        assert_eq!(should_pause(Some(&signal)), None);
    }

    #[test]
    fn parse_full_control_signal_json() {
        let json = r#"{
            "action": "pause",
            "target": "api",
            "operator": "admin",
            "created_at": "2025-01-01T00:00:00Z",
            "expires_at": null,
            "confirmed": true,
            "confirmation_token": null
        }"#;
        let view: ControlSignalView = serde_json::from_str(json).unwrap();
        assert_eq!(view.action, "pause");
        assert_eq!(view.target, "api");
        assert!(view.confirmed);
    }

    // -----------------------------------------------------------------------
    // Extended tests for task T01: S06 integration + control_signal tests
    // -----------------------------------------------------------------------

    /// Simulates a router with business routes (affected by pause) and
    /// health/metrics/internal routes (exempt from pause).
    fn test_router_with_exempt_routes(is_paused: Arc<AtomicBool>) -> (Router, Router) {
        // Business routes — wrapped in pause middleware
        let business = Router::new()
            .route("/api/problems", get(|| async { "problems" }))
            .route("/api/submissions", get(|| async { "submissions" }))
            .layer(axum::middleware::from_fn(move |req, next| {
                let flag = is_paused.clone();
                async move { pause_middleware(flag, req, next).await }
            }));

        // Health/metrics/internal — NOT wrapped in pause middleware
        let exempt = Router::new()
            .route("/health", get(|| async { "healthy" }))
            .route("/metrics", get(|| async { "# HELP test test\n" }))
            .route("/internal/debug", get(|| async { "debug" }));

        (business, exempt)
    }

    #[tokio::test]
    async fn pause_middleware_503_on_business_routes_when_paused() {
        let is_paused = Arc::new(AtomicBool::new(true));
        let (business, _) = test_router_with_exempt_routes(is_paused);

        // Business routes should return 503 when paused
        for uri in &["/api/problems", "/api/submissions"] {
            let resp = business
                .clone()
                .oneshot(
                    axum::http::Request::builder()
                        .uri(*uri)
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(
                resp.status(),
                StatusCode::SERVICE_UNAVAILABLE,
                "business route {} should return 503 when paused",
                uri
            );
            let body = to_bytes(resp.into_body(), 1024).await.unwrap();
            let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
            assert_eq!(json["status"], "paused");
        }
    }

    #[tokio::test]
    async fn exempt_routes_return_200_even_when_paused() {
        let is_paused = Arc::new(AtomicBool::new(true));
        let (_, exempt) = test_router_with_exempt_routes(is_paused);

        // Health, metrics, and internal routes should NOT be wrapped
        // in pause middleware, so they always return 200.
        for uri in &["/health", "/metrics", "/internal/debug"] {
            let resp = exempt
                .clone()
                .oneshot(
                    axum::http::Request::builder()
                        .uri(*uri)
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(
                resp.status(),
                StatusCode::OK,
                "exempt route {} should return 200 even when paused",
                uri
            );
        }
    }

    #[tokio::test]
    async fn resume_restores_business_routes_to_200() {
        let is_paused = Arc::new(AtomicBool::new(true));
        let (business, _) = test_router_with_exempt_routes(is_paused.clone());

        // First verify paused
        let resp = business
            .clone()
            .oneshot(
                axum::http::Request::builder()
                    .uri("/api/problems")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(resp.status(), StatusCode::SERVICE_UNAVAILABLE);

        // Resume (flip the flag)
        is_paused.store(false, Ordering::Relaxed);

        // Rebuild router with the same flag to test the new state
        let (business_after, _) = test_router_with_exempt_routes(is_paused.clone());

        let resp = business_after
            .oneshot(
                axum::http::Request::builder()
                    .uri("/api/problems")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(
            resp.status(),
            StatusCode::OK,
            "business routes should return 200 after resume"
        );
        let body = to_bytes(resp.into_body(), 1024).await.unwrap();
        assert_eq!(&body[..], b"problems");
    }

    #[tokio::test]
    async fn fail_open_when_redis_unavailable() {
        // The start_control_signal_polling function accepts Option<Pool>.
        // When pool is None, the polling loop just continues without changing
        // the pause state. This is the fail-open behavior:
        // - No Redis → no signal → no pause change → service stays as-is.
        //
        // We verify the contract: calling start_control_signal_polling with
        // None should not panic or block, and the initial state should be
        // preserved.

        let is_paused = Arc::new(AtomicBool::new(false));

        // Spawn with None — should not panic
        start_control_signal_polling(None, is_paused.clone());

        // Give the spawned task a moment to settle
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;

        // State should remain unchanged (fail-open: don't crash, don't pause)
        assert!(
            !is_paused.load(Ordering::Relaxed),
            "fail-open: state should not change when Redis is unavailable"
        );
    }

    #[tokio::test]
    async fn fail_open_preserves_paused_state_when_redis_unavailable() {
        // If the service was paused and Redis goes down, it should stay paused
        // (fail-open means don't change state, not "unpause on Redis failure").
        let is_paused = Arc::new(AtomicBool::new(true));

        start_control_signal_polling(None, is_paused.clone());

        // Give the spawned task a moment to settle
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;

        assert!(
            is_paused.load(Ordering::Relaxed),
            "fail-open: paused state should be preserved when Redis is unavailable"
        );
    }

    #[tokio::test]
    async fn pause_middleware_503_response_has_correct_json_body() {
        let is_paused = Arc::new(AtomicBool::new(true));
        let app = test_router(is_paused);

        let resp = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(resp.status(), StatusCode::SERVICE_UNAVAILABLE);
        let body = to_bytes(resp.into_body(), 1024).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        // Verify the full response shape
        assert_eq!(json["status"], "paused");
        assert_eq!(json["target"], "api");
        // Ensure no unexpected fields
        assert_eq!(json.as_object().unwrap().len(), 2);
    }

    #[tokio::test]
    async fn pause_middleware_preserves_response_body_when_not_paused() {
        let is_paused = Arc::new(AtomicBool::new(false));
        let app = test_router(is_paused);

        let resp = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(resp.status(), StatusCode::OK);
        let body = to_bytes(resp.into_body(), 1024).await.unwrap();
        assert_eq!(
            &body[..],
            b"ok",
            "response body should pass through unchanged"
        );
    }
}
