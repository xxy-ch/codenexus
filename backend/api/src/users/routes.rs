use super::{models::*, service::UserService};
use crate::error::AppError;
use crate::middleware::auth::AuthExtractor;
use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

pub fn user_router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/register", axum::routing::post(register))
        .route("/admin", axum::routing::get(list_admin_users))
        .route(
            "/admin/batch-create",
            axum::routing::post(batch_create_users),
        )
        .route(
            "/admin/:user_id/role",
            axum::routing::patch(update_user_role),
        )
        .route(
            "/admin/:user_id/status",
            axum::routing::patch(toggle_user_status),
        )
        .route("/me", axum::routing::get(get_me))
        .route("/me", axum::routing::patch(update_me))
}

pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = UserService::new(state.db_pool, state.jwt_service.clone());
    let user = service.register(req).await?;
    Ok(Json(user))
}

async fn get_me(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<impl IntoResponse, AppError> {
    let service = UserService::new(state.db_pool, state.jwt_service.clone());
    let user = service.get_user_profile(claims.sub).await?;
    Ok(Json(user))
}

async fn update_me(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(updates): Json<UserProfileUpdate>,
) -> Result<impl IntoResponse, AppError> {
    let service = UserService::new(state.db_pool, state.jwt_service.clone());
    let user = service.update_user_profile(claims.sub, updates).await?;
    Ok(Json(user))
}

async fn list_admin_users(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Query(query): Query<AdminUserQuery>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&claims.role)?;
    let service = UserService::new(state.db_pool, state.jwt_service.clone());
    let response = service.list_admin_users(query).await?;
    Ok(Json(response))
}

async fn batch_create_users(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(request): Json<BatchCreateUsersRequest>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&claims.role)?;
    let service = UserService::new(state.db_pool, state.jwt_service.clone());
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
    let service = UserService::new(state.db_pool, state.jwt_service.clone());
    service.update_user_role(user_id, &request.role).await?;
    Ok(Json(AdminMutationResponse { success: true }))
}

async fn toggle_user_status(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(user_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&claims.role)?;
    let service = UserService::new(state.db_pool, state.jwt_service.clone());
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
