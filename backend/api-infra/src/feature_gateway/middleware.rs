//! Feature gate middleware.
//!
//! Provides `feature_gate()` middleware function that checks if a feature
//! is enabled before allowing the request through. Returns 404 (not 403)
//! when a feature is disabled, per D-08.

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};

use crate::feature_gateway::FeatureGatewayService;
use crate::middleware::tenant::TenantContext;

/// Feature gate middleware -- returns 404 if feature is disabled (D-08).
///
/// Follows the same closure pattern as `require_permission` in authz.rs:
/// closure returning `Pin<Box<dyn Future>>` + `Clone`.
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
///         feature_gate("plagiarism", gateway.clone())
///     ));
/// ```
pub fn feature_gate(
    slug: &'static str,
    gateway: Arc<FeatureGatewayService>,
) -> impl Fn(Request, Next) -> Pin<Box<dyn Future<Output = Result<Response, StatusCode>> + Send>>
       + Clone {
    move |req: Request, next: Next| {
        let gateway = gateway.clone();
        Box::pin(async move {
            let tenant_ctx = req.extensions().get::<TenantContext>();

            let (campus_id, grade_id) = match tenant_ctx {
                Some(ctx) => (ctx.campus_id, ctx.grade_id),
                None => return Err(StatusCode::UNAUTHORIZED),
            };

            let resolved = gateway.resolve(slug, campus_id, grade_id).await;

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
    use axum::{body::Body, routing::get, Router, middleware};
    use tower::util::ServiceExt;

    async fn ok_handler() -> StatusCode {
        StatusCode::OK
    }

    #[tokio::test]
    async fn test_feature_gate_no_tenant_returns_401() {
        // Without TenantContext in extensions, should return 401
        let pool = sqlx::PgPool::connect_lazy("postgres://localhost/nonexistent_test")
            .expect("lazy connect should not fail");
        let gateway = Arc::new(FeatureGatewayService::new(pool));

        let app = Router::new()
            .route("/test", get(ok_handler))
            .route_layer(middleware::from_fn(
                feature_gate("plagiarism", gateway)
            ));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_feature_gate_disabled_returns_404() {
        // Gateway with enabled=false should return 404 for any feature
        let pool = sqlx::PgPool::connect_lazy("postgres://localhost/nonexistent_test")
            .expect("lazy connect should not fail");
        let gateway = Arc::new(FeatureGatewayService::new_with_enabled(pool, false));

        let tenant_ctx = TenantContext {
            tenant_id: 1,
            campus_id: Some(1),
            grade_id: Some(1),
        };

        let app = Router::new()
            .route("/test", get(ok_handler))
            .route_layer(middleware::from_fn(
                feature_gate("plagiarism", gateway)
            ));

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

    #[tokio::test]
    async fn test_feature_gate_enabled_passes_through() {
        // Gateway with enabled=true but no DB -- resolve falls through to
        // cache miss then DB miss (no connection), returning default false.
        // To test the pass-through path, we inject a cache entry.
        let pool = sqlx::PgPool::connect_lazy("postgres://localhost/nonexistent_test")
            .expect("lazy connect should not fail");
        let gateway = Arc::new(FeatureGatewayService::new_with_enabled(pool, true));

        // Pre-populate cache with enabled=true for the feature
        gateway.insert_cache(
            "plagiarism",
            "campus:1",
            super::super::models::ResolvedFeature {
                enabled: true,
                source: super::super::models::FeatureSource::CampusOverride,
            },
        );

        let tenant_ctx = TenantContext {
            tenant_id: 1,
            campus_id: Some(1),
            grade_id: None,
        };

        let app = Router::new()
            .route("/test", get(ok_handler))
            .route_layer(middleware::from_fn(
                feature_gate("plagiarism", gateway)
            ));

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

        assert_eq!(response.status(), StatusCode::OK);
    }
}
