use super::{models::*, service::UserService};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use crate::AppState;
use crate::middleware::auth::AuthExtractor;
use uuid::Uuid;

pub fn user_router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/register", axum::routing::post(register))
        .route("/admin", axum::routing::get(list_admin_users))
        .route("/admin/batch-create", axum::routing::post(batch_create_users))
        .route("/admin/:user_id/role", axum::routing::patch(update_user_role))
        .route("/admin/:user_id/status", axum::routing::patch(toggle_user_status))
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

async fn list_admin_users(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Query(query): Query<AdminUserQuery>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&claims.role)?;
    let service = UserService::new(state.db_pool, state.jwt_service);
    let response = service.list_admin_users(query).await?;
    Ok(Json(response))
}

async fn batch_create_users(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(request): Json<BatchCreateUsersRequest>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&claims.role)?;
    let service = UserService::new(state.db_pool, state.jwt_service);
    let response = service.batch_create_users(request).await?;
    Ok(Json(response))
}

async fn update_user_role(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(user_id): Path<Uuid>,
    Json(request): Json<UpdateUserRoleRequest>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&claims.role)?;
    let service = UserService::new(state.db_pool, state.jwt_service);
    service.update_user_role(user_id, &request.role).await?;
    Ok(Json(AdminMutationResponse { success: true }))
}

async fn toggle_user_status(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(user_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&claims.role)?;
    let service = UserService::new(state.db_pool, state.jwt_service);
    service.update_user_status(user_id).await?;
    Ok(Json(AdminMutationResponse { success: true }))
}

fn ensure_admin(role: &str) -> Result<(), AppError> {
    if role == "admin" {
        Ok(())
    } else {
        Err(AppError::Auth("Admin access required".to_string()))
    }
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
