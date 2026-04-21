//! Feature gateway CRUD routes.
//!
//! Provides admin/teacher endpoints for managing feature flag overrides
//! and reading resolved feature state. Enforces D-06 role-scope authorization.

use axum::{
    extract::{Extension, Path, Query, State},
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde::Deserialize;
use shared::models::{role::Role, Claims};
use std::str::FromStr;

use crate::error::AppError;
use crate::middleware::tenant::TenantContext;
use crate::state::AppState;

use super::models::SetFlagRequest;

/// Check if a role is authorized to manage flags at the requested scope.
///
/// Implements D-06 permission boundary:
/// - Root: "global", "campus"
/// - CampusAdmin: "campus", "grade"
/// - GradeAdmin: "grade"
/// - Teacher: "class"
/// - All others: denied
pub fn check_scope_authorization(role: Role, requested_scope: &str) -> bool {
    match role {
        Role::Root => matches!(requested_scope, "global" | "campus"),
        Role::CampusAdmin => matches!(requested_scope, "campus" | "grade"),
        Role::GradeAdmin => matches!(requested_scope, "grade"),
        Role::Teacher => matches!(requested_scope, "class"),
        _ => false,
    }
}

/// Query parameters for the delete_flag endpoint.
#[derive(Debug, Deserialize)]
pub struct DeleteFlagParams {
    pub scope: String,
    pub scope_id: Option<i64>,
}

/// GET /features/resolved
///
/// Returns all features with effective state for the current user's scope.
/// Uses TenantContext (campus_id, grade_id) from JWT claims for resolution.
async fn resolved_features(
    Extension(_claims): Extension<Claims>,
    Extension(tenant_ctx): Extension<TenantContext>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let registry = state
        .feature_gateway
        .list_registry()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let mut result = serde_json::Map::new();
    for entry in &registry {
        let resolved = state
            .feature_gateway
            .resolve(&entry.slug, tenant_ctx.campus_id, tenant_ctx.grade_id)
            .await;
        result.insert(
            entry.slug.clone(),
            serde_json::json!({
                "slug": entry.slug,
                "enabled": resolved.enabled,
                "source": resolved.source.to_string(),
            }),
        );
    }

    Ok(Json(serde_json::Value::Object(result)))
}

/// GET /features/registry
///
/// Returns all feature definitions from the registry.
async fn list_registry(State(state): State<AppState>) -> Result<impl IntoResponse, AppError> {
    let entries = state
        .feature_gateway
        .list_registry()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(entries))
}

/// GET /features/:slug/flags
///
/// Returns all flag overrides for a given feature slug.
async fn list_flags(
    Path(slug): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let flags = state
        .feature_gateway
        .list_flags(&slug)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(flags))
}

/// POST /features/:slug/flags
///
/// Creates or updates a feature flag override at the given scope.
/// Enforces D-06 role-scope authorization.
async fn set_flag(
    Extension(claims): Extension<Claims>,
    Path(slug): Path<String>,
    State(state): State<AppState>,
    Json(req): Json<SetFlagRequest>,
) -> Result<impl IntoResponse, AppError> {
    let role = Role::from_str(&claims.role).map_err(|_| AppError::Forbidden("Invalid role".into()))?;

    if !check_scope_authorization(role, &req.scope) {
        return Err(AppError::Forbidden(format!(
            "Role '{}' cannot manage scope '{}'",
            claims.role, req.scope
        )));
    }

    // Validate scope values
    if !matches!(req.scope.as_str(), "global" | "campus" | "grade" | "class") {
        return Err(AppError::Validation(format!(
            "Invalid scope '{}'. Must be one of: global, campus, grade, class",
            req.scope
        )));
    }

    // Global scope must not have scope_id
    if req.scope == "global" && req.scope_id.is_some() {
        return Err(AppError::Validation(
            "Global scope must not specify scope_id".into(),
        ));
    }

    state
        .feature_gateway
        .set_flag(&slug, &req.scope, req.scope_id, req.enabled)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(serde_json::json!({"message": "Flag updated"})))
}

/// DELETE /features/:slug/flags
///
/// Deletes a feature flag override at the given scope.
/// Enforces D-06 role-scope authorization.
async fn delete_flag(
    Extension(claims): Extension<Claims>,
    Path(slug): Path<String>,
    State(state): State<AppState>,
    Query(params): Query<DeleteFlagParams>,
) -> Result<impl IntoResponse, AppError> {
    let role = Role::from_str(&claims.role).map_err(|_| AppError::Forbidden("Invalid role".into()))?;

    if !check_scope_authorization(role, &params.scope) {
        return Err(AppError::Forbidden(format!(
            "Role '{}' cannot manage scope '{}'",
            claims.role, params.scope
        )));
    }

    state
        .feature_gateway
        .delete_flag(&slug, &params.scope, params.scope_id)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(serde_json::json!({"message": "Flag deleted"})))
}

/// Build the features router with all CRUD endpoints.
///
/// This router should be nested inside the protected_router in main.rs
/// so that auth and tenant middleware are already applied.
pub fn features_router() -> Router<AppState> {
    Router::new()
        .route("/features/resolved", get(resolved_features))
        .route("/features/registry", get(list_registry))
        .route("/features/{slug}/flags", get(list_flags))
        .route("/features/{slug}/flags", post(set_flag))
        .route("/features/{slug}/flags", delete(delete_flag))
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- Authorization tests (pure logic, no async) ---

    #[test]
    fn test_check_scope_authorization_root() {
        let role = Role::Root;
        assert!(check_scope_authorization(role, "global"));
        assert!(check_scope_authorization(role, "campus"));
        assert!(!check_scope_authorization(role, "grade"));
        assert!(!check_scope_authorization(role, "class"));
    }

    #[test]
    fn test_check_scope_authorization_campus_admin() {
        let role = Role::CampusAdmin;
        assert!(!check_scope_authorization(role, "global"));
        assert!(check_scope_authorization(role, "campus"));
        assert!(check_scope_authorization(role, "grade"));
        assert!(!check_scope_authorization(role, "class"));
    }

    #[test]
    fn test_check_scope_authorization_grade_admin() {
        let role = Role::GradeAdmin;
        assert!(!check_scope_authorization(role, "global"));
        assert!(!check_scope_authorization(role, "campus"));
        assert!(check_scope_authorization(role, "grade"));
        assert!(!check_scope_authorization(role, "class"));
    }

    #[test]
    fn test_check_scope_authorization_teacher() {
        let role = Role::Teacher;
        assert!(!check_scope_authorization(role, "global"));
        assert!(!check_scope_authorization(role, "campus"));
        assert!(!check_scope_authorization(role, "grade"));
        assert!(check_scope_authorization(role, "class"));
    }

    #[test]
    fn test_check_scope_authorization_student_denied() {
        assert!(!check_scope_authorization(Role::Student, "global"));
        assert!(!check_scope_authorization(Role::Student, "campus"));
        assert!(!check_scope_authorization(Role::Student, "grade"));
        assert!(!check_scope_authorization(Role::Student, "class"));
    }

    #[test]
    fn test_check_scope_authorization_ta_denied() {
        assert!(!check_scope_authorization(Role::TeachingAssistant, "global"));
        assert!(!check_scope_authorization(Role::TeachingAssistant, "campus"));
        assert!(!check_scope_authorization(Role::TeachingAssistant, "grade"));
        assert!(!check_scope_authorization(Role::TeachingAssistant, "class"));
    }

    #[test]
    fn test_check_scope_authorization_invalid_scope() {
        assert!(!check_scope_authorization(Role::Root, "invalid"));
        assert!(!check_scope_authorization(Role::Root, ""));
    }

    #[test]
    fn test_delete_flag_params_deserialize() {
        let json = r#"{"scope":"campus","scope_id":1}"#;
        let params: DeleteFlagParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.scope, "campus");
        assert_eq!(params.scope_id, Some(1));
    }

    #[test]
    fn test_delete_flag_params_deserialize_no_scope_id() {
        let json = r#"{"scope":"global"}"#;
        let params: DeleteFlagParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.scope, "global");
        assert_eq!(params.scope_id, None);
    }
}
