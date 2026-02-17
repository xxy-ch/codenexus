use super::{models::*, service::UserService};
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use uuid::Uuid;
use crate::AppState;

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
    headers: axum::http::HeaderMap,
) -> Result<impl IntoResponse, AppError> {
    let user_id = extract_user_id(&headers)?;
    let service = UserService::new(state.db_pool, state.jwt_service);
    let user = service.get_user_profile(user_id).await?;
    Ok(Json(user))
}

async fn update_me(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(updates): Json<UserProfileUpdate>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = extract_user_id(&headers)?;
    let service = UserService::new(state.db_pool, state.jwt_service);
    let user = service.update_user_profile(user_id, updates).await?;
    Ok(Json(user))
}

fn extract_user_id(headers: &axum::http::HeaderMap) -> Result<Uuid, AppError> {
    let auth_header = headers
        .get("authorization")
        .ok_or_else(|| AppError::Auth("Missing authorization header".to_string()))?;

    let token = auth_header
        .to_str()
        .map_err(|_| AppError::Auth("Invalid authorization header".to_string()))?
        .strip_prefix("Bearer ")
        .ok_or_else(|| AppError::Auth("Invalid authorization format".to_string()))?;

    // Decode and verify token (simplified - in real app, this would use the JWT service)
    // For now, just extract the user ID from the token
    // In production, use the JWT service to verify the token
    Ok(Uuid::parse_str(token).map_err(|_| AppError::Auth("Invalid token".to_string()))?)
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