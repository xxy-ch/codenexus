//! Feature gate middleware.
//!
//! Provides `feature_gate()` middleware function that checks if a feature
//! is enabled via the standalone Gateway HTTP service before allowing the
//! request through. Returns 404 (not 403) when a feature is disabled, per D-08.
//!
//! Uses `GatewayClient` with TTL cache (D-21) and fail-closed behavior (C-07):
//! when the Gateway is unavailable, features resolve to disabled.

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};

use super::client::GatewayClient;
use crate::middleware::tenant::TenantContext;

/// Feature gate middleware -- returns 404 if feature is disabled (D-08).
///
/// Follows the same closure pattern as `require_permission` in authz.rs:
/// closure returning `Pin<Box<dyn Future>>` + `Clone`.
///
/// Uses `GatewayClient` to call the standalone Gateway service via HTTP.
/// The client includes a 10s TTL cache (D-21) and fail-open on Gateway
/// unavailability (D-23).
///
/// Accesses `TenantContext` from request extensions for scope resolution.
/// The TenantContext is inserted by the tenant middleware, which runs
/// after auth middleware in the middleware pipeline.
///
/// # Example
///
/// ```ignore
/// // Applied at route registration time via route_layer:
/// let gated_router = Router::new()
///     .route("/plagiarism", get(handler))
///     .route_layer(axum::middleware::from_fn(
///         feature_gate("plagiarism", gateway_client.clone())
///     ));
/// ```
pub fn feature_gate(
    slug: &'static str,
    client: Arc<GatewayClient>,
) -> impl Fn(Request, Next) -> Pin<Box<dyn Future<Output = Result<Response, StatusCode>> + Send>> + Clone
{
    move |req: Request, next: Next| {
        let client = client.clone();
        Box::pin(async move {
            let tenant_ctx = req.extensions().get::<TenantContext>();

            let (tenant_id, campus_id, grade_id) = match tenant_ctx {
                Some(ctx) => (ctx.tenant_id, ctx.campus_id, ctx.grade_id),
                None => return Err(StatusCode::UNAUTHORIZED),
            };

            let resolved = client.resolve(slug, tenant_id, campus_id, grade_id).await;

            if resolved.enabled {
                Ok(next.run(req).await)
            } else {
                Err(StatusCode::NOT_FOUND) // D-08: 404, not 403
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, middleware, routing::get, Router};
    use tower::util::ServiceExt;

    async fn ok_handler() -> StatusCode {
        StatusCode::OK
    }

    #[tokio::test]
    async fn test_feature_gate_no_tenant_returns_401() {
        // Without TenantContext in extensions, should return 401
        let client = Arc::new(GatewayClient::new(
            "http://127.0.0.1:19999".to_string(),
            "test_secret".to_string(),
        ));

        let app = Router::new()
            .route("/test", get(ok_handler))
            .route_layer(middleware::from_fn(feature_gate("plagiarism", client)));

        let response = app
            .oneshot(Request::builder().uri("/test").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_feature_gate_unavailable_returns_404() {
        // C-07: GatewayClient with fail-closed: when Gateway is unavailable,
        // resolve() returns enabled=false.
        // The middleware should block with 404 (D-08).
        let client = Arc::new(GatewayClient::new(
            "http://127.0.0.1:19998".to_string(),
            "test_secret".to_string(),
        ));

        let tenant_ctx = TenantContext {
            tenant_id: 1,
            campus_id: Some(1),
            grade_id: None,
        };

        let app = Router::new()
            .route("/test", get(ok_handler))
            .route_layer(middleware::from_fn(feature_gate("plagiarism", client)));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/test")
                    .extension(tenant_ctx)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        // C-07: fail-closed means Gateway unavailable -> enabled=false -> 404
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_feature_gate_with_disabled_cache_entry_returns_404() {
        // Pre-populate the client's cache with a disabled entry to test
        // the disabled path without a real Gateway.
        let client = Arc::new(GatewayClient::new(
            "http://127.0.0.1:19997".to_string(),
            "test_secret".to_string(),
        ));

        // Manually insert a disabled cache entry
        let cache_key = "1:plagiarism:Some(1):None".to_string();
        client.cache.insert(
            cache_key,
            super::super::client::CachedResolve {
                resolved: super::super::client::ResolvedFeature {
                    enabled: false,
                    source: super::super::client::FeatureSource::GradeOverride,
                },
                expires_at: std::time::Instant::now() + std::time::Duration::from_secs(60),
            },
        );

        let tenant_ctx = TenantContext {
            tenant_id: 1,
            campus_id: Some(1),
            grade_id: None,
        };

        let app = Router::new()
            .route("/test", get(ok_handler))
            .route_layer(middleware::from_fn(feature_gate("plagiarism", client)));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/test")
                    .extension(tenant_ctx)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        // D-08: must be 404, not 403
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }
}
