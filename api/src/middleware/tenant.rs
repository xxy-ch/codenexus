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
/// Extracts tenant ID exclusively from JWT claims (inserted by auth middleware).
/// The X-Tenant-ID header is NOT trusted — tenant identity comes only from
/// the verified JWT token.
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
    // SECURITY: Only use JWT claims as source of tenant identity.
    // Never trust client-supplied headers for tenant isolation.
    request.extensions().get::<Claims>().map(|c| c.school_id)
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
    async fn test_middleware_valid_tenant_from_claims() {
        let app = Router::new()
            .route("/test", get(get_tenant))
            .layer(middleware::from_fn(tenant_middleware));

        let claims = Claims {
            sub: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            role: "root".to_string(),
            school_id: 123,
            campus_id: None,
            iat: chrono::Utc::now().timestamp(),
            exp: chrono::Utc::now().timestamp() + 3600,
            jti: Uuid::new_v4(),
        };

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/test")
                    .extension(claims)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_middleware_ignores_header_without_claims() {
        let app = Router::new()
            .route("/test", get(get_tenant))
            .layer(middleware::from_fn(tenant_middleware));

        // Header alone should NOT grant access
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

        let claims = Claims {
            sub: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            role: "student".to_string(),
            school_id: 456,
            campus_id: None,
            iat: chrono::Utc::now().timestamp(),
            exp: chrono::Utc::now().timestamp() + 3600,
            jti: Uuid::new_v4(),
        };

        let app = Router::new()
            .route("/test", get(handler))
            .layer(middleware::from_fn(tenant_middleware));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/test")
                    .extension(claims)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_middleware_uses_claims_not_header() {
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

        // Header says 123 but claims say 999 — must use claims
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
