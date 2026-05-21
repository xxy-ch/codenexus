//! HTTP metrics middleware for Prometheus observability.
//!
//! Records `http_requests_total` counter and `http_request_duration_seconds`
//! histogram with method, path (matched route pattern), and status labels.
//!
//! The `/metrics` endpoint is excluded from tracking to avoid self-referential noise.

use axum::{
    extract::{MatchedPath, Request},
    middleware::Next,
    response::IntoResponse,
};
use std::time::Instant;

/// HTTP metrics middleware that records request duration, count, and status.
///
/// Uses `MatchedPath` for low-cardinality route labels (e.g., `/users/:id` not `/users/abc-123`).
/// Skips the `/metrics` endpoint to avoid self-referential noise.
pub async fn track_metrics(req: Request, next: Next) -> impl IntoResponse {
    // Skip self-referential metrics for the /metrics endpoint
    if req.uri().path() == "/metrics" {
        return next.run(req).await;
    }

    let start = Instant::now();
    let path = if let Some(matched_path) = req.extensions().get::<MatchedPath>() {
        matched_path.as_str().to_owned()
    } else {
        req.uri().path().to_owned()
    };
    let method = req.method().clone();
    let response = next.run(req).await;
    let latency = start.elapsed().as_secs_f64();
    let status = response.status().as_u16().to_string();

    let labels = [
        ("method", method.to_string()),
        ("path", path),
        ("status", status),
    ];

    metrics::counter!("http_requests_total", &labels).increment(1);
    metrics::histogram!("http_request_duration_seconds", &labels).record(latency);
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

    #[tokio::test]
    async fn test_metrics_endpoint_returns_prometheus_format() {
        let handle = api_infra::metrics::setup_metrics_recorder();

        let app = Router::new()
            .route("/health/live", get(ok_handler))
            .route(
                "/metrics",
                get(move || {
                    let h = handle.clone();
                    async move { h.render() }
                }),
            )
            .layer(axum::middleware::from_fn(track_metrics));

        // First, make a request to a tracked endpoint to populate histogram data
        let _ = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/health/live")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        // Now fetch /metrics
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/metrics")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = axum::body::to_bytes(response.into_body(), 4096)
            .await
            .unwrap();
        let body_str = String::from_utf8(body.to_vec()).unwrap();
        assert!(
            body_str.contains("http_request_duration_seconds_bucket"),
            "Response should contain http_request_duration_seconds_bucket, got: {}",
            body_str
        );
    }

    #[tokio::test]
    async fn test_http_requests_total_counter_increments() {
        // Install a fresh recorder for this test
        let handle = api_infra::metrics::setup_metrics_recorder();

        let app = Router::new()
            .route("/health/live", get(ok_handler))
            .layer(axum::middleware::from_fn(track_metrics));

        // Make a request to /health/live
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health/live")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // Check metrics output
        let metrics_output = handle.render();
        assert!(
            metrics_output.contains("http_requests_total"),
            "Metrics should contain http_requests_total, got: {}",
            metrics_output
        );
        assert!(
            metrics_output.contains(r#"method="GET""#),
            "Metrics should contain method label, got: {}",
            metrics_output
        );
        assert!(
            metrics_output.contains(r#"path="/health/live""#),
            "Metrics should contain path label with MatchedPath, got: {}",
            metrics_output
        );
        assert!(
            metrics_output.contains(r#"status="200""#),
            "Metrics should contain status label, got: {}",
            metrics_output
        );
    }

    #[tokio::test]
    async fn test_metrics_endpoint_not_self_referencing() {
        let handle = api_infra::metrics::setup_metrics_recorder();
        let render_handle = handle.clone();

        let app = Router::new()
            .route(
                "/metrics",
                get(move || {
                    let h = handle.clone();
                    async move { h.render() }
                }),
            )
            .layer(axum::middleware::from_fn(track_metrics));

        // Hit /metrics multiple times
        for _ in 0..3 {
            let response = app
                .clone()
                .oneshot(
                    Request::builder()
                        .uri("/metrics")
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::OK);
        }

        // The metrics output should NOT contain entries for path="/metrics"
        let metrics_output = render_handle.render();
        assert!(
            !metrics_output.contains(r#"path="/metrics""#),
            "Metrics should NOT contain self-referential /metrics entries, got: {}",
            metrics_output
        );
    }

    #[tokio::test]
    async fn test_histogram_records_duration() {
        let handle = api_infra::metrics::setup_metrics_recorder();

        let app = Router::new()
            .route("/health/live", get(ok_handler))
            .layer(axum::middleware::from_fn(track_metrics));

        // Make a request
        let _ = app
            .oneshot(
                Request::builder()
                    .uri("/health/live")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        let metrics_output = handle.render();
        assert!(
            metrics_output.contains("http_request_duration_seconds_count"),
            "Metrics should contain http_request_duration_seconds_count, got: {}",
            metrics_output
        );
        assert!(
            metrics_output.contains("http_request_duration_seconds_sum"),
            "Metrics should contain http_request_duration_seconds_sum, got: {}",
            metrics_output
        );
    }

    #[tokio::test]
    async fn test_matched_path_used_for_labels() {
        let handle = api_infra::metrics::setup_metrics_recorder();

        // Test with a parameterized route to verify MatchedPath is used
        let app = Router::new()
            .route("/users/:id", get(ok_handler))
            .layer(axum::middleware::from_fn(track_metrics));

        // Request /users/123 -- should record path as /users/:id
        let _ = app
            .oneshot(
                Request::builder()
                    .uri("/users/123")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        let metrics_output = handle.render();
        assert!(
            metrics_output.contains(r#"path="/users/:id""#),
            "Should use MatchedPath pattern /users/:id, not actual path /users/123. Got: {}",
            metrics_output
        );
        assert!(
            !metrics_output.contains(r#"path="/users/123""#),
            "Should NOT contain actual path /users/123. Got: {}",
            metrics_output
        );
    }
}
