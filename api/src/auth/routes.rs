use axum::{extract::State, http::StatusCode, response::Json};
use shared::models::{LoginRequest, LoginResponse, RefreshRequest, RefreshResponse, UserPublic};
use crate::AppState;
use crate::users::{models::{RegisterRequest, LoginRequest as DbLoginRequest, RefreshTokenRequest}, service::UserService};

pub async fn login(
    State(state): State<AppState>,
    Json(request): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, StatusCode> {
    let service = UserService::new(state.db_pool.clone(), state.jwt_service.clone());
    let response = service
        .login(DbLoginRequest {
            username: request.username,
            password: request.password,
        })
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    Ok(Json(LoginResponse {
        token: response.token,
        refresh_token: response.refresh_token,
        user: UserPublic {
            id: response.user.id,
            username: response.user.username,
            email: response.user.email.unwrap_or_default(),
            role: response.user.role,
            school_id: response.user.organization_id,
            campus_id: response.user.campus_id,
        },
    }))
}

pub async fn refresh(
    State(state): State<AppState>,
    Json(request): Json<RefreshRequest>,
) -> Result<Json<RefreshResponse>, StatusCode> {
    let service = UserService::new(state.db_pool.clone(), state.jwt_service.clone());
    let response = service
        .refresh_token(RefreshTokenRequest {
            refresh_token: request.refresh_token,
        })
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    Ok(Json(RefreshResponse { token: response.token }))
}

pub async fn register(
    State(state): State<AppState>,
    Json(request): Json<RegisterRequest>,
) -> Result<Json<crate::users::models::AuthResponse>, StatusCode> {
    let service = UserService::new(state.db_pool.clone(), state.jwt_service.clone());
    let profile = service
        .register(request)
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    let shared_user = shared::models::User {
        id: profile.id,
        username: profile.username.clone(),
        email: profile.email.clone().unwrap_or_default(),
        password_hash: String::new(),
        role: profile.role.clone(),
        school_id: profile.organization_id,
        campus_id: profile.campus_id,
    };

    let token = state
        .jwt_service
        .generate_access_token(&shared_user)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let refresh_token = state
        .jwt_service
        .generate_refresh_token(&shared_user)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(crate::users::models::AuthResponse {
        token,
        refresh_token,
        user: profile,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{header, Request, StatusCode},
        routing::post,
        Router,
    };
    use tower::ServiceExt;

    async fn create_test_app() -> Router {
        use crate::auth::JwtService;
        
        let jwt_secret =
            std::env::var("JWT_SECRET").unwrap_or_else(|_| "test_secret_key".to_string());
        
        let jwt_service = JwtService::new(&jwt_secret);
        
        let database_url = match std::env::var("DATABASE_URL") {
            Ok(url) if !url.is_empty() => url,
            _ => {
                panic!("DATABASE_URL must be set for auth route tests");
            }
        };
        
        let db_pool = sqlx::PgPool::connect(&database_url)
            .await
            .expect("Failed to create test database pool");
        
        let app_state = crate::AppState {
            db_pool,
            redis_pool: None,
            jwt_service,
            redis_url: String::new(),
            websocket_server: std::sync::Arc::new(crate::websocket::WebSocketServer::new()),
        };

        Router::new()
            .route("/login", post(login))
            .route("/refresh", post(refresh))
            .with_state(app_state)
    }

    #[ignore = "requires a running PostgreSQL database; set DATABASE_URL environment variable"]
    #[tokio::test]
    async fn test_login_invalid_credentials() {
        let app = create_test_app().await;

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/login")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        r#"{"username": "9999", "password": "wrong_password"}"#,
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[ignore = "requires a running PostgreSQL database; set DATABASE_URL environment variable"]
    #[tokio::test]
    async fn test_login_valid_credentials() {
        std::env::set_var("DEMO_ADMIN_EMAIL", "admin@example.com");
        std::env::set_var("DEMO_ADMIN_PASSWORD", "admin123");
        std::env::set_var("DEMO_ADMIN_SCHOOL_ID", "1");
        std::env::set_var("DEMO_ADMIN_ROLE", "admin");
        std::env::set_var("JWT_SECRET", "test_secret_key");

        let app = create_test_app().await;

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/login")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        r#"{"username": "1001", "password": "admin123"}"#,
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let json_response: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert!(json_response["token"].is_string());
        assert!(json_response["refresh_token"].is_string());
        assert_eq!(json_response["user"]["username"], "1001");
        assert_eq!(json_response["user"]["school_id"], 1);
    }

    #[ignore = "requires a running PostgreSQL database; set DATABASE_URL environment variable"]
    #[tokio::test]
    async fn test_refresh_invalid_token() {
        let app = create_test_app().await;

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/refresh")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(r#"{"refresh_token": "invalid_token"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[ignore = "requires a running PostgreSQL database; set DATABASE_URL environment variable"]
    #[tokio::test]
    async fn test_refresh_valid_token() {
        std::env::set_var("DEMO_ADMIN_EMAIL", "admin@example.com");
        std::env::set_var("DEMO_ADMIN_PASSWORD", "admin123");
        std::env::set_var("DEMO_ADMIN_SCHOOL_ID", "1");
        std::env::set_var("DEMO_ADMIN_ROLE", "admin");
        std::env::set_var("JWT_SECRET", "test_secret_key");

        let app = create_test_app().await;

        let login_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/login")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(axum::body::Body::from(
                        r#"{"username": "1001", "password": "admin123"}"#,
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(login_response.status(), StatusCode::OK);

        let login_body = axum::body::to_bytes(login_response.into_body(), usize::MAX)
            .await
            .unwrap();
        let login_json: serde_json::Value = serde_json::from_slice(&login_body).unwrap();

        let refresh_token = login_json["refresh_token"].as_str().unwrap();

        let refresh_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/refresh")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(axum::body::Body::from(format!(
                        r#"{{"refresh_token": "{}"}}"#,
                        refresh_token
                    )))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(refresh_response.status(), StatusCode::OK);

        let refresh_body = axum::body::to_bytes(refresh_response.into_body(), usize::MAX)
            .await
            .unwrap();
        let refresh_json: serde_json::Value = serde_json::from_slice(&refresh_body).unwrap();

        assert!(refresh_json["token"].is_string());
    }
}
