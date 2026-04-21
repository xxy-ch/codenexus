//! WORKER_SECRET authentication middleware.
//!
//! Validates that incoming requests bear the shared secret token
//! configured via `WORKER_SECRET` env var (D-24).

use std::env;

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};

/// Middleware that requires a valid `WORKER_SECRET` Bearer token.
///
/// Reads `WORKER_SECRET` from the environment. Requests must include
/// `Authorization: Bearer <token>` header. Returns 401 if missing
/// or mismatched.
pub async fn require_worker_secret(
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let expected = env::var("WORKER_SECRET")
        .unwrap_or_else(|_| "default_worker_secret_change_me".to_string());

    let auth_header = req
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok());

    match auth_header {
        Some(header) if header.starts_with("Bearer ") => {
            let token = &header[7..];
            if token == expected {
                Ok(next.run(req).await)
            } else {
                Err(StatusCode::UNAUTHORIZED)
            }
        }
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, routing::get, Router, middleware};
    use tower::ServiceExt;

    async fn ok_handler() -> StatusCode {
        StatusCode::OK
    }

    #[tokio::test]
    async fn test_valid_token_passes_through() {
        env::set_var("WORKER_SECRET", "test-secret-123");

        let app = Router::new()
            .route("/health", get(ok_handler))
            .route_layer(middleware::from_fn(require_worker_secret));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .header("authorization", "Bearer test-secret-123")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_wrong_token_returns_unauthorized() {
        env::set_var("WORKER_SECRET", "test-secret-123");

        let app = Router::new()
            .route("/health", get(ok_handler))
            .route_layer(middleware::from_fn(require_worker_secret));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .header("authorization", "Bearer wrong-token")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_missing_header_returns_unauthorized() {
        env::set_var("WORKER_SECRET", "test-secret-123");

        let app = Router::new()
            .route("/health", get(ok_handler))
            .route_layer(middleware::from_fn(require_worker_secret));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}
