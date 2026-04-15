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
        let token = parts
            .headers
            .get("authorization")
            .and_then(|h| h.to_str().ok())
            .and_then(|h| h.strip_prefix("Bearer "))
            .map(|t| t.to_string())
            .or_else(|| {
                parts
                    .headers
                    .get("cookie")
                    .and_then(|c| c.to_str().ok())
                    .and_then(|c| {
                        c.split(';').find_map(|cookie| {
                            let parts: Vec<&str> = cookie.trim().splitn(2, '=').collect();
                            if parts.len() == 2 && parts[0] == "access_token" {
                                Some(parts[1].to_string())
                            } else {
                                None
                            }
                        })
                    })
            })
            .ok_or(StatusCode::UNAUTHORIZED)?;

        let jwt_secret = std::env::var("JWT_SECRET").map_err(|_| StatusCode::UNAUTHORIZED)?;
        let jwt_service = JwtService::new(&jwt_secret);

        let claims = jwt_service
            .validate_token(&token)
            .map_err(|_| StatusCode::UNAUTHORIZED)?;

        Ok(AuthExtractor(claims))
    }
}

pub async fn auth_middleware(
    axum::extract::State(state): axum::extract::State<crate::AppState>,
    request: axum::http::Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> Result<Response, StatusCode> {
    // Try Authorization header first, then fall back to cookie
    let token = request
        .headers()
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .map(|t| t.to_string())
        .or_else(|| {
            request
                .headers()
                .get("cookie")
                .and_then(|c| c.to_str().ok())
                .and_then(|c| {
                    c.split(';').find_map(|cookie| {
                        let parts: Vec<&str> = cookie.trim().splitn(2, '=').collect();
                        if parts.len() == 2 && parts[0] == "access_token" {
                            Some(parts[1].to_string())
                        } else {
                            None
                        }
                    })
                })
        });

    let token = token.ok_or(StatusCode::UNAUTHORIZED)?;

    let jwt_service = Arc::new(JwtService::new(&state.jwt_secret));

    let claims = jwt_service
        .validate_token(&token)
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    // Check JWT blacklist (revoked tokens)
    if let Some(redis_pool) = &state.redis_pool {
        if let Ok(mut conn) = redis_pool.get().await {
            let blacklisted: bool = deadpool_redis::redis::cmd("EXISTS")
                .arg(format!("bl:{}", claims.jti))
                .query_async(&mut conn)
                .await
                .unwrap_or(false);
            if blacklisted {
                return Err(StatusCode::UNAUTHORIZED);
            }
        }
    }

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

    async fn protected_handler(claims: AuthExtractor) -> String {
        format!("user_id: {}", claims.0.sub)
    }

    fn create_test_app() -> Router {
        let jwt_service = crate::auth::JwtService::new("test_secret_key");
        let state = crate::AppState {
            db_pool: sqlx::PgPool::connect_lazy("postgres://localhost/nonexistent").unwrap(),
            redis_pool: None,
            jwt_service: std::sync::Arc::new(jwt_service),
            redis_url: String::new(),
            jwt_secret: "test_secret_key".to_string(),
            worker_secret: "test_worker_secret".to_string(),
            websocket_server: std::sync::Arc::new(crate::websocket::WebSocketServer::new()),
            class_membership_checker: std::sync::Arc::new(
                api_infra::traits::class_repo::NoopClassMembershipChecker,
            ),
        };
        Router::new()
            .route("/protected", get(protected_handler))
            .layer(middleware::from_fn_with_state(
                state.clone(),
                auth_middleware,
            ))
            .with_state(state)
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
        std::env::set_var("JWT_SECRET", "test_secret_key");

        let user = shared::models::User {
            id: uuid::Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap(),
            username: "1001".to_string(),
            email: "admin@example.com".to_string(),
            password_hash: String::new(),
            role: "root".to_string(),
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
    }
}
