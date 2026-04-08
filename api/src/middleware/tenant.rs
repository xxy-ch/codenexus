#![allow(unused_imports)]

use axum::{
    extract::Request,
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::Response,
};

use shared::models::Claims;

const TENANT_HEADER: &str = "X-Tenant-ID";

/// Tenant context stored in request extensions
#[derive(Debug, Clone, Copy)]
pub struct TenantContext {
    pub tenant_id: i64,
}

/// Tenant isolation middleware
///
/// Extracts tenant ID from JWT claims if present (from Authorization header),
/// otherwise falls back to the `X-Tenant-ID` header.
/// Returns 401 Unauthorized if no valid tenant ID can be found.
pub async fn tenant_middleware(
    mut request: axum::http::Request<axum::body::Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let tenant_id = extract_tenant_id_from_request(&request);

    match tenant_id {
        Some(id) => {
            request
                .extensions_mut()
                .insert(TenantContext { tenant_id: id });
            Ok(next.run(request).await)
        }
        None => Err(StatusCode::UNAUTHORIZED),
    }
}

fn extract_tenant_id_from_request(request: &axum::http::Request<axum::body::Body>) -> Option<i64> {
    if let Some(claims) = request.extensions().get::<Claims>() {
        return Some(claims.school_id);
    }

    let headers = request.headers();
    headers
        .get(TENANT_HEADER)
        .and_then(|value| value.to_str().ok())
        .and_then(|s| s.parse::<i64>().ok())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{HeaderMap, Request, StatusCode},
        middleware,
        routing::get,
        Extension, Router,
    };
    use shared::models::Claims;
    use tower::util::ServiceExt;
    use uuid::Uuid;

    async fn get_tenant(ctx: Option<axum::Extension<TenantContext>>) -> StatusCode {
        if ctx.is_some() {
            StatusCode::OK
        } else {
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }

    #[tokio::test]
    async fn test_middleware_missing_tenant_header() {
        let app = Router::new()
            .route("/test", get(get_tenant))
            .layer(middleware::from_fn(tenant_middleware));

        let response = app
            .oneshot(Request::builder().uri("/test").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_middleware_valid_tenant_header() {
        let app = Router::new()
            .route("/test", get(get_tenant))
            .layer(middleware::from_fn(tenant_middleware));

        let mut headers = HeaderMap::new();
        headers.insert(TENANT_HEADER, "123".parse().unwrap());

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/test")
                    .header(TENANT_HEADER, "123")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_middleware_invalid_tenant_header() {
        let app = Router::new()
            .route("/test", get(get_tenant))
            .layer(middleware::from_fn(tenant_middleware));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/test")
                    .header(TENANT_HEADER, "invalid")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_middleware_context_available() {
        async fn handler(Extension(ctx): Extension<TenantContext>) -> StatusCode {
            if ctx.tenant_id == 456 {
                StatusCode::OK
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            }
        }

        let app = Router::new()
            .route("/test", get(handler))
            .layer(middleware::from_fn(tenant_middleware));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/test")
                    .header(TENANT_HEADER, "456")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_middleware_prefers_jwt_claims_over_header() {
        async fn handler(
            Extension(ctx): Extension<TenantContext>,
            Extension(claims): Extension<Claims>,
        ) -> StatusCode {
            if ctx.tenant_id == claims.school_id && ctx.tenant_id == 999 {
                StatusCode::OK
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            }
        }

        let app = Router::new()
            .route("/test", get(handler))
            .layer(middleware::from_fn(tenant_middleware));

        let claims = Claims {
            sub: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            role: "root".to_string(),
            school_id: 999,
            campus_id: None,
            iat: chrono::Utc::now().timestamp(),
            exp: chrono::Utc::now().timestamp() + 3600,
            jti: Uuid::new_v4(),
        };

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/test")
                    .header(TENANT_HEADER, "123")
                    .extension(claims)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }
}
