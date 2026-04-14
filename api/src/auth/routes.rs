use domain_users::{
    models::{LoginRequest as DbLoginRequest, RefreshTokenRequest, RegisterRequest},
    service::UserService,
};
use crate::AppState;
use axum::{extract::State, http::StatusCode, response::Json, Extension};
use shared::models::{
    Claims, LoginRequest, LoginResponse, RefreshRequest, RefreshResponse, UserPublic,
};

fn make_cookie_header(name: &str, value: &str, max_age: u32, path: &str) -> String {
    format!(
        "{}={}; HttpOnly; SameSite=Strict; Path={}; Max-Age={}",
        name, value, path, max_age
    )
}

pub async fn login(
    State(state): State<AppState>,
    Json(request): Json<LoginRequest>,
) -> Result<(axum::http::HeaderMap, Json<LoginResponse>), StatusCode> {
    let service = UserService::new(state.db_pool.clone(), state.jwt_service.clone());
    let response = service
        .login(DbLoginRequest {
            username: request.username,
            password: request.password,
        })
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::SET_COOKIE,
        make_cookie_header("access_token", &response.token, 14400, "/")
            .parse()
            .unwrap(),
    );
    headers.insert(
        axum::http::header::SET_COOKIE,
        make_cookie_header(
            "refresh_token",
            &response.refresh_token,
            604800,
            "/api/auth/refresh",
        )
        .parse()
        .unwrap(),
    );

    Ok((
        headers,
        Json(LoginResponse {
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
        }),
    ))
}

pub async fn refresh(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(request): Json<RefreshRequest>,
) -> Result<(axum::http::HeaderMap, Json<RefreshResponse>), StatusCode> {
    // Try cookie first, then body
    let refresh_token = headers
        .get("cookie")
        .and_then(|c| c.to_str().ok())
        .and_then(|c| {
            c.split(';').find_map(|cookie| {
                let parts: Vec<&str> = cookie.trim().splitn(2, '=').collect();
                if parts.len() == 2 && parts[0] == "refresh_token" {
                    Some(parts[1].to_string())
                } else {
                    None
                }
            })
        })
        .or(request.refresh_token);

    let refresh_token = refresh_token.ok_or(StatusCode::UNAUTHORIZED)?;

    let service = UserService::new(state.db_pool.clone(), state.jwt_service.clone());
    let response = service
        .refresh_token(RefreshTokenRequest { refresh_token })
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    let mut resp_headers = axum::http::HeaderMap::new();
    resp_headers.insert(
        axum::http::header::SET_COOKIE,
        make_cookie_header("access_token", &response.token, 14400, "/")
            .parse()
            .unwrap(),
    );

    Ok((
        resp_headers,
        Json(RefreshResponse {
            token: response.token,
        }),
    ))
}

pub async fn logout(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
) -> StatusCode {
    let ttl = claims.exp - chrono::Utc::now().timestamp();
    if ttl > 0 {
        if let Some(redis_pool) = &state.redis_pool {
            if let Ok(mut conn) = redis_pool.get().await {
                let _: () = deadpool_redis::redis::cmd("SET")
                    .arg(format!("bl:{}", claims.jti))
                    .arg("1")
                    .arg("EX")
                    .arg(ttl)
                    .query_async(&mut conn)
                    .await
                    .unwrap_or(());
            }
        }
    }
    StatusCode::OK
}

pub async fn register(
    State(state): State<AppState>,
    Json(request): Json<RegisterRequest>,
) -> Result<
    (
        axum::http::HeaderMap,
        Json<domain_users::models::AuthResponse>,
    ),
    StatusCode,
> {
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

    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::SET_COOKIE,
        make_cookie_header("access_token", &token, 14400, "/")
            .parse()
            .unwrap(),
    );
    headers.insert(
        axum::http::header::SET_COOKIE,
        make_cookie_header("refresh_token", &refresh_token, 604800, "/api/auth/refresh")
            .parse()
            .unwrap(),
    );

    Ok((
        headers,
        Json(domain_users::models::AuthResponse {
            token,
            refresh_token,
            user: profile,
        }),
    ))
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
            jwt_service: std::sync::Arc::new(jwt_service),
            redis_url: String::new(),
            jwt_secret: jwt_secret.clone(),
            worker_secret: "test_worker_secret".to_string(),
            websocket_server: std::sync::Arc::new(crate::websocket::WebSocketServer::new()),
        };

        Router::new()
            .route("/login", post(login))
            .route("/refresh", post(refresh))
            .route("/logout", post(logout))
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

    #[tokio::test]
    async fn test_logout_returns_ok() {
        let claims = Claims {
            sub: uuid::Uuid::new_v4(),
            email: "test@example.com".to_string(),
            role: "student".to_string(),
            school_id: 1,
            campus_id: None,
            iat: chrono::Utc::now().timestamp(),
            exp: chrono::Utc::now().timestamp() + 3600,
            jti: uuid::Uuid::new_v4(),
        };
        let state = crate::AppState {
            db_pool: sqlx::PgPool::connect_lazy("postgres://localhost/nonexistent").unwrap(),
            redis_pool: None,
            jwt_service: std::sync::Arc::new(crate::auth::JwtService::new("test_secret")),
            redis_url: String::new(),
            jwt_secret: "test_secret".to_string(),
            worker_secret: "test_worker_secret".to_string(),
            websocket_server: std::sync::Arc::new(crate::websocket::WebSocketServer::new()),
        };
        let response = logout(Extension(claims), State(state)).await;
        assert_eq!(response, StatusCode::OK);
    }
}
