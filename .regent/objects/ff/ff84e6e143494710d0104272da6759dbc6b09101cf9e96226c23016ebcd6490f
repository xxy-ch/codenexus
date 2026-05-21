//! API Key authentication middleware for control-plane routes.
//!
//! Validates requests via `Authorization: Bearer <key>` or `?api_key=<key>`.
//! The expected key is loaded from the `MONITOR_API_KEY` environment variable.
//!
//! ## Security model
//!
//! - If `MONITOR_API_KEY` is set, **all** `/api/control/*` requests require it.
//! - If `MONITOR_API_KEY` is not set (empty or missing), auth is **disabled**.
//!   This is intentional for local development — production deployments MUST
//!   set a strong API key.
//! - Health (`/health`), read-only monitor (`/api/services`), and WebSocket
//!   (`/ws/monitor`) endpoints are NOT gated — only control-plane mutations
//!   require authentication.

use axum::extract::Request;
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use std::sync::Arc;

/// Shared auth state injected into the middleware layer.
#[derive(Clone)]
pub struct AuthState {
    /// The expected API key. `None` means auth is disabled.
    pub api_key: Option<String>,
}

impl AuthState {
    /// Build from an optional env value. Empty strings are treated as None.
    pub fn from_env_value(raw: Option<String>) -> Arc<Self> {
        Arc::new(Self {
            api_key: raw.filter(|v| !v.trim().is_empty()),
        })
    }

    /// Returns true if auth is configured (key is set).
    pub fn is_enabled(&self) -> bool {
        self.api_key.is_some()
    }
}

/// JSON error response body for 401 replies.
#[derive(Debug, Serialize)]
struct AuthErrorResponse {
    error: String,
}

/// Axum middleware that enforces API key authentication.
///
/// Extraction order:
/// 1. `Authorization: Bearer <key>` header
/// 2. `?api_key=<key>` query parameter
///
/// If `AuthState::api_key` is `None`, the request passes through (dev mode).
pub async fn require_api_key(
    axum::extract::State(auth_state): axum::extract::State<Arc<AuthState>>,
    request: Request,
    next: Next,
) -> Response {
    // If no key configured, skip auth (dev mode)
    let expected = match &auth_state.api_key {
        Some(k) => k,
        None => return next.run(request).await,
    };

    // Try Authorization: Bearer <key> header first
    let provided = request
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|v| v.trim().to_string())
        // Fallback: ?api_key=<key> query parameter
        .or_else(|| {
            request
                .uri()
                .query()
                .and_then(|q| urlencoded_query_get(q, "api_key"))
        });

    match provided {
        Some(ref key) if constant_time_eq(key.as_bytes(), expected.as_bytes()) => {
            next.run(request).await
        }
        Some(_) => {
            tracing::warn!("[auth] rejected control-plane request: invalid API key");
            (
                StatusCode::UNAUTHORIZED,
                axum::Json(AuthErrorResponse {
                    error: "invalid or missing API key".to_string(),
                }),
            )
                .into_response()
        }
        None => {
            tracing::warn!("[auth] rejected control-plane request: no API key provided");
            (
                StatusCode::UNAUTHORIZED,
                axum::Json(AuthErrorResponse {
                    error: "API key required. Use Authorization: Bearer <key> or ?api_key=<key>"
                        .to_string(),
                }),
            )
                .into_response()
        }
    }
}

/// Constant-time comparison to prevent timing attacks.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        // Still do a comparison to keep constant time for same-length inputs.
        // Different-length comparison leaks length but that's acceptable for API keys.
        return false;
    }
    let mut result = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        result |= x ^ y;
    }
    result == 0
}

/// Extract a value for `key` from a URL-encoded query string.
/// Minimal parser — handles `key=value&key2=value2` without full URL decoding.
fn urlencoded_query_get(query: &str, key: &str) -> Option<String> {
    for pair in query.split('&') {
        let (k, v) = pair.split_once('=')?;
        if k == key {
            return Some(v.to_string());
        }
    }
    None
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::middleware;
    use axum::routing::post;
    use axum::Router;
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    /// Helper: build a test router with auth middleware wrapping a dummy handler.
    fn test_router(api_key: Option<&str>) -> Router {
        let auth_state = AuthState::from_env_value(api_key.map(|s| s.to_string()));

        async fn ok_handler() -> &'static str {
            "ok"
        }

        Router::new()
            .route("/test", post(ok_handler))
            .layer(middleware::from_fn_with_state(auth_state, require_api_key))
    }

    async fn body_string(body: Body) -> String {
        let bytes = body
            .collect()
            .await
            .expect("failed to read body")
            .to_bytes();
        String::from_utf8_lossy(&bytes).to_string()
    }

    #[tokio::test]
    async fn auth_disabled_when_no_key_configured() {
        let app = test_router(None);
        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn auth_accepts_valid_bearer_token() {
        let app = test_router(Some("my-secret-key"));
        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/test")
                    .header("authorization", "Bearer my-secret-key")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn auth_rejects_invalid_bearer_token() {
        let app = test_router(Some("my-secret-key"));
        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/test")
                    .header("authorization", "Bearer wrong-key")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        let body = body_string(response.into_body()).await;
        assert!(body.contains("invalid or missing API key"));
    }

    #[tokio::test]
    async fn auth_rejects_missing_key() {
        let app = test_router(Some("my-secret-key"));
        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        let body = body_string(response.into_body()).await;
        assert!(body.contains("API key required"));
    }

    #[tokio::test]
    async fn auth_accepts_query_param_key() {
        let app = test_router(Some("my-secret-key"));
        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/test?api_key=my-secret-key")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn auth_rejects_wrong_query_param_key() {
        let app = test_router(Some("my-secret-key"));
        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/test?api_key=wrong")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn constant_time_eq_same_strings() {
        assert!(constant_time_eq(b"abc123", b"abc123"));
    }

    #[test]
    fn constant_time_eq_different_strings() {
        assert!(!constant_time_eq(b"abc123", b"abc124"));
    }

    #[test]
    fn constant_time_eq_different_lengths() {
        assert!(!constant_time_eq(b"short", b"much-longer-string"));
    }

    #[test]
    fn query_param_extraction() {
        assert_eq!(
            urlencoded_query_get("api_key=hello&limit=10", "api_key"),
            Some("hello".to_string())
        );
        assert_eq!(
            urlencoded_query_get("limit=10&api_key=world", "api_key"),
            Some("world".to_string())
        );
        assert_eq!(urlencoded_query_get("limit=10", "api_key"), None);
    }

    #[test]
    fn auth_state_from_env_value() {
        let state = AuthState::from_env_value(Some("  ".to_string()));
        assert!(!state.is_enabled());

        let state = AuthState::from_env_value(None);
        assert!(!state.is_enabled());

        let state = AuthState::from_env_value(Some("real-key".to_string()));
        assert!(state.is_enabled());
        assert_eq!(state.api_key.as_deref(), Some("real-key"));
    }
}
