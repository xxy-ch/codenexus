#![allow(unused_imports, dead_code)]

use axum::{async_trait, extract::FromRequestParts, http::StatusCode, response::Response};
use shared::models::Claims;
use std::sync::{Arc, Mutex, OnceLock};

use crate::auth::JwtService;

const DEFAULT_JWT_SECRET: &str = "default_jwt_secret_change_me";

fn jwt_secret() -> String {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| DEFAULT_JWT_SECRET.to_string())
}

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

        let jwt_secret = jwt_secret();
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

    let jwt_secret = jwt_secret();
    let jwt_service = Arc::new(JwtService::new(&jwt_secret));

    let claims = jwt_service
        .validate_token(token)
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    let mut request = request;
    request.extensions_mut().insert(claims.sub);
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

    fn jwt_env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

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
        let _guard = jwt_env_lock().lock().unwrap();
        std::env::set_var("JWT_SECRET", "test_secret_key");

        let user = shared::models::User {
            id: uuid::Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap(),
            username: "1001".to_string(),
            email: "admin@example.com".to_string(),
            password_hash: String::new(),
            role: "admin".to_string(),
            school_id: 1,
            campus_id: Some(1),
        };

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
        std::env::remove_var("JWT_SECRET");
    }

    #[tokio::test]
    async fn test_auth_middleware_valid_token_without_explicit_env_uses_runtime_default() {
        let _guard = jwt_env_lock().lock().unwrap();
        std::env::remove_var("JWT_SECRET");

        let user = shared::models::User {
            id: uuid::Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap(),
            username: "1001".to_string(),
            email: "admin@example.com".to_string(),
            password_hash: String::new(),
            role: "admin".to_string(),
            school_id: 1,
            campus_id: Some(1),
        };

        let jwt_service = JwtService::new("default_jwt_secret_change_me");
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
