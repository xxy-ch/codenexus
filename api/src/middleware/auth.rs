#![allow(unused_imports, dead_code)]

use axum::{async_trait, extract::FromRequestParts, http::StatusCode, response::Response};
use shared::models::Claims;
use std::sync::Arc;

use crate::auth::JwtService;

pub struct AuthExtractor(pub Claims);

#[async_trait]
impl<S> FromRequestParts<S> for AuthExtractor
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("authorization")
            .and_then(|h| h.to_str().ok())
            .ok_or(StatusCode::UNAUTHORIZED)?;

        if !auth_header.starts_with("Bearer ") {
            return Err(StatusCode::UNAUTHORIZED);
        }

        let token = &auth_header[7..];

        let jwt_secret =
            std::env::var("JWT_SECRET").map_err(|_| StatusCode::UNAUTHORIZED)?;
        let jwt_service = JwtService::new(&jwt_secret);

        let claims = jwt_service
            .validate_token(token)
            .map_err(|_| StatusCode::UNAUTHORIZED)?;

        Ok(AuthExtractor(claims))
    }
}

pub async fn auth_middleware(
    request: axum::http::Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> Result<Response, StatusCode> {
    let auth_header = request
        .headers()
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let token = &auth_header[7..];

    let jwt_secret = std::env::var("JWT_SECRET").map_err(|_| StatusCode::UNAUTHORIZED)?;
    let jwt_service = Arc::new(JwtService::new(&jwt_secret));

    let claims = jwt_service
        .validate_token(token)
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    let mut request = request;
    request.extensions_mut().insert(claims);

    Ok(next.run(request).await)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{header, HeaderValue, Request, StatusCode},
        middleware,
        routing::get,
        Router,
    };
    use tower::ServiceExt;

    async fn protected_handler(claims: AuthExtractor) -> String {
        format!("user_id: {}", claims.0.sub)
    }

    fn create_test_app() -> Router {
        Router::new()
            .route("/protected", get(protected_handler))
            .layer(middleware::from_fn(auth_middleware))
    }

    #[tokio::test]
    async fn test_auth_middleware_missing_token() {
        let app = create_test_app();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/protected")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_invalid_token() {
        let app = create_test_app();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/protected")
                    .header(
                        header::AUTHORIZATION,
                        HeaderValue::from_static("Bearer invalid_token"),
                    )
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_valid_token() {
        std::env::set_var("DEMO_ADMIN_EMAIL", "admin@example.com");
        std::env::set_var("DEMO_ADMIN_PASSWORD", "admin123");
        std::env::set_var("DEMO_ADMIN_SCHOOL_ID", "1");
        std::env::set_var("DEMO_ADMIN_ROLE", "admin");
        std::env::set_var("JWT_SECRET", "test_secret_key");

        let user = crate::auth::get_user_store()
            .get_by_email("admin@example.com")
            .unwrap();

        let jwt_service = JwtService::new("test_secret_key");
        let token = jwt_service.generate_access_token(&user).unwrap();

        let app = create_test_app();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/protected")
                    .header(
                        header::AUTHORIZATION,
                        HeaderValue::from_str(&format!("Bearer {}", token)).unwrap(),
                    )
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }
}
