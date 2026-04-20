use super::{models::*, service::UserService};
use api_infra::error::AppError;
use api_infra::middleware::auth::AuthExtractor;
use api_infra::state::AppState;
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
    let response = service.list_admin_users(query, claims.school_id).await?;
    Ok(Json(response))
}

async fn batch_create_users(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(mut request): Json<BatchCreateUsersRequest>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&claims.role)?;
    // SECURITY: Force organization_id from JWT claims, never trust client input
    request.organization_id = claims.school_id;

    // SECURITY: Prevent privilege escalation — validate each requested role
    // does not equal or exceed the caller's role level (no same-level granting)
    let caller_role = claims.role.parse::<shared::models::Role>()
        .map_err(|_| AppError::Auth("Invalid caller role".to_string()))?;
    // SECURITY: Validate roles AND force campus_id/grade_id from caller's scope.
    // A single mutable pass prevents CampusAdmin/GradeAdmin from passing arbitrary scope values.
    for user in &mut request.users {
        // Prevent privilege escalation — caller cannot assign at or above their own level
        if let Some(role_str) = &user.role {
            let target_role = role_str.parse::<shared::models::Role>()
                .map_err(|_| AppError::Auth(format!("Invalid role: {}", role_str)))?;
            if target_role.is_higher_or_equal(caller_role) {
                return Err(AppError::Auth(format!(
                    "Cannot assign role '{}' — cannot assign at or above your own level", role_str
                )));
            }
            // SECURITY: GradeAdmin can only assign TeachingAssistant and Student — cannot manage Teachers
            if caller_role == shared::models::Role::GradeAdmin {
                if target_role.is_higher_or_equal(shared::models::Role::Teacher) {
                    return Err(AppError::Auth(
                        "GradeAdmin cannot assign Teacher or higher roles".to_string()
                    ));
                }
            }
        }
        // Force campus_id/grade_id based on caller role scope
        match caller_role {
            shared::models::Role::Root => {
                // Root: allow any campus_id/grade_id — no override needed
            }
            shared::models::Role::CampusAdmin => {
                // CampusAdmin: force campus_id to claims, allow any grade_id
                if let Some(cid) = claims.campus_id {
                    user.campus_id = Some(cid);
                }
            }
            _ => {
                // GradeAdmin and below: force both campus_id and grade_id from claims
                if let Some(cid) = claims.campus_id {
                    user.campus_id = Some(cid);
                }
                if let Some(gid) = claims.grade_id {
                    user.grade_id = Some(gid);
                }
            }
        }
    }

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
    // SECURITY: Prevent privilege escalation — caller cannot assign at or above their own level
    let caller_role = claims.role.parse::<shared::models::Role>()
        .map_err(|_| AppError::Auth("Invalid caller role".to_string()))?;
    let target_role = request.role.parse::<shared::models::Role>()
        .map_err(|_| AppError::Auth("Invalid target role".to_string()))?;
    if target_role.is_higher_or_equal(caller_role) {
        return Err(AppError::Auth("Cannot assign a role at or above your own level".to_string()));
    }
    // SECURITY: GradeAdmin can only assign TeachingAssistant and Student
    if caller_role == shared::models::Role::GradeAdmin {
        if target_role.is_higher_or_equal(shared::models::Role::Teacher) {
            return Err(AppError::Auth("GradeAdmin cannot assign Teacher or higher roles".to_string()));
        }
    }
    let service = UserService::new(state.db_pool, state.jwt_service.clone());
    service.update_user_role_scoped(
        user_id,
        &request.role,
        claims.school_id,
        claims.campus_id,
        claims.grade_id,
        caller_role,
    ).await?;
    Ok(Json(AdminMutationResponse { success: true }))
}

async fn toggle_user_status(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(user_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&claims.role)?;
    let service = UserService::new(state.db_pool, state.jwt_service.clone());
    service.update_user_status(user_id, claims.school_id).await?;
    Ok(Json(AdminMutationResponse { success: true }))
}

fn ensure_admin(role: &str) -> Result<(), AppError> {
    if matches!(role, "root" | "campusadmin" | "gradeadmin") {
        Ok(())
    } else {
        Err(AppError::Auth("Admin access required".to_string()))
    }
}
