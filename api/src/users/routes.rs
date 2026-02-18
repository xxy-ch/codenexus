use super::{models::*, service::UserService};
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use crate::AppState;
use crate::middleware::auth::AuthExtractor;

pub fn user_router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/register", axum::routing::post(register))
        .route("/me", axum::routing::get(get_me))
        .route("/me", axum::routing::patch(update_me))
}

pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = UserService::new(state.db_pool, state.jwt_service);
    let user = service.register(req).await?;
    Ok(Json(user))
}

async fn get_me(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<impl IntoResponse, AppError> {
    let service = UserService::new(state.db_pool, state.jwt_service);
    let user = service.get_user_profile(claims.sub).await?;
    Ok(Json(user))
}

async fn update_me(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(updates): Json<UserProfileUpdate>,
) -> Result<impl IntoResponse, AppError> {
    let service = UserService::new(state.db_pool, state.jwt_service);
    let user = service.update_user_profile(claims.sub, updates).await?;
    Ok(Json(user))
}

#[derive(Debug)]
pub enum AppError {
    Auth(String),
    User(String),
    Database(String),
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::Auth(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::User(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Database(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        let body = Json(serde_json::json!({
            "error": message,
            "status": status.as_u16(),
        }));

        (status, body).into_response()
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::Internal(err.to_string())
    }
}