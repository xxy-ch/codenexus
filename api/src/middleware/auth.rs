use axum::{async_trait, extract::FromRequestParts, http::StatusCode, response::Response};
use shared::models::Claims;

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

        let jwt_service = parts
            .extensions
            .get::<JwtService>()
            .cloned()
            .ok_or(StatusCode::UNAUTHORIZED)?;

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
    let jwt_service = request
        .extensions()
        .get::<JwtService>()
        .cloned()
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let auth_header = request
        .headers()
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let token = &auth_header[7..];

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
        Extension,
        Router,
    };
    use tower::ServiceExt;

    async fn protected_handler(claims: AuthExtractor) -> String {
        format!("user_id: {}", claims.0.sub)
    }

    fn create_test_app(jwt_service: JwtService) -> Router {
        Router::new()
            .route("/protected", get(protected_handler))
            .layer(middleware::from_fn(auth_middleware))
            .layer(Extension(jwt_service))
    }

    #[tokio::test]
    async fn test_auth_middleware_missing_token() {
        let app = create_test_app(JwtService::new("test_secret_key"));

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
        let app = create_test_app(JwtService::new("test_secret_key"));

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

        let app = create_test_app(jwt_service);

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

    #[tokio::test]
    async fn test_auth_middleware_missing_jwt_service_rejects() {
        let app = Router::new()
            .route("/protected", get(protected_handler))
            .layer(middleware::from_fn(auth_middleware));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/protected")
                    .header(header::AUTHORIZATION, HeaderValue::from_static("Bearer invalid"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}
