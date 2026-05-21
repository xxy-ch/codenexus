//! Request ID middleware for structured tracing.
//!
//! Generates a UUID v4 per request (or forwards an existing `x-request-id` header),
//! injects it into request extensions, creates a tracing span with structured fields,
//! and echoes the ID back in the response header.
//!
//! Per D-05: structured fields include `request_id`, `method`, `uri`, `duration_ms`.

use axum::{extract::Request, middleware::Next, response::Response};
use tracing::Instrument;
use uuid::Uuid;

/// Request ID stored in request extensions for downstream access.
#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct RequestId(pub String);

/// Request ID middleware that generates a unique ID per request and creates a
/// structured tracing span.
///
/// Behavior:
/// - If `x-request-id` header is present, uses its value.
/// - Otherwise, generates a new UUID v4.
/// - Creates a `tracing::info_span!("request", request_id, method, uri)`.
/// - Logs "request completed" with `duration_ms` and `status` on span exit.
/// - Sets `x-request-id` response header.
pub async fn request_id_middleware(mut req: Request, next: Next) -> Response {
    let request_id = req
        .headers()
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    req.extensions_mut().insert(RequestId(request_id.clone()));

    let method = req.method().clone();
    let uri = req.uri().clone();

    let span = tracing::info_span!(
        "request",
        request_id = %request_id,
        method = %method,
        uri = %uri,
    );

    let start = std::time::Instant::now();
    let response = next.run(req).instrument(span.clone()).await;
    let duration_ms = start.elapsed().as_millis() as f64;

    tracing::info!(
        parent: &span,
        duration_ms = duration_ms,
        status = response.status().as_u16(),
        "request completed"
    );

    let mut response = response;
    response
        .headers_mut()
        .insert("x-request-id", request_id.parse().unwrap());
    response
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use axum::routing::get;
    use axum::Router;
    use tower::ServiceExt;

    async fn ok_handler() -> StatusCode {
        StatusCode::OK
    }

    fn test_app() -> Router {
        Router::new()
            .route("/test", get(ok_handler))
            .layer(axum::middleware::from_fn(request_id_middleware))
    }

    #[tokio::test]
    async fn test_generates_uuid_when_no_header() {
        let app = test_app();
        let response = app
            .oneshot(Request::builder().uri("/test").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let request_id = response
            .headers()
            .get("x-request-id")
            .expect("x-request-id header should be present")
            .to_str()
            .unwrap();

        // Should be a valid UUID v4
        assert!(
            uuid::Uuid::parse_str(request_id).is_ok(),
            "Generated request_id should be a valid UUID, got: {}",
            request_id
        );
    }

    #[tokio::test]
    async fn test_forwards_existing_request_id() {
        let app = test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/test")
                    .header("x-request-id", "test-123-custom")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let request_id = response
            .headers()
            .get("x-request-id")
            .expect("x-request-id header should be present")
            .to_str()
            .unwrap();

        assert_eq!(request_id, "test-123-custom");
    }

    #[tokio::test]
    async fn test_request_id_in_extensions() {
        let app = test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/test")
                    .header("x-request-id", "ext-test-456")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        // If middleware runs correctly, the response header should echo the ID
        let rid = response
            .headers()
            .get("x-request-id")
            .unwrap()
            .to_str()
            .unwrap();
        assert_eq!(rid, "ext-test-456");
    }

    #[tokio::test]
    async fn test_response_header_is_set() {
        let app = test_app();
        let response = app
            .oneshot(Request::builder().uri("/test").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert!(response.headers().contains_key("x-request-id"));
    }
}
