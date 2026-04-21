//! Feature gateway proxy routes.
//!
//! Provides admin/teacher endpoints that proxy to the standalone Feature Gateway
//! service. The API acts as a facade (D-22) -- frontend code is unchanged.
//!
//! All endpoints forward requests to Gateway via GatewayClient and return
//! the Gateway's JSON response as-is. On Gateway failure, returns 502 Bad Gateway.

use axum::{
    extract::{Extension, Path, Query, State},
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde::Deserialize;
use shared::models::Claims;
use std::str::FromStr;

use crate::error::AppError;
use crate::middleware::tenant::TenantContext;
use crate::state::AppState;

use shared::models::role::Role;

/// Query parameters for the delete_flag endpoint.
#[derive(Debug, Deserialize)]
pub struct DeleteFlagParams {
    pub scope: String,
    pub scope_id: Option<i64>,
}

/// GET /features/resolved
///
/// Proxies to Gateway: resolves all features for the current user's scope.
/// Uses TenantContext (campus_id, grade_id) from JWT claims for resolution.
async fn resolved_features(
    Extension(_claims): Extension<Claims>,
    Extension(tenant_ctx): Extension<TenantContext>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    // First get the registry from Gateway
    let registry_resp = state
        .gateway_client
        .get("/registry")
        .await
        .map_err(|(_status, msg)| AppError::Internal(msg))?;

    let registry: Vec<serde_json::Value> = registry_resp
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse registry: {}", e)))?;

    let mut result = serde_json::Map::new();
    for entry in &registry {
        let slug = entry["slug"].as_str().unwrap_or("");
        if slug.is_empty() {
            continue;
        }

        let resolved = state
            .gateway_client
            .resolve(slug, tenant_ctx.campus_id, tenant_ctx.grade_id)
            .await;

        result.insert(
            slug.to_string(),
            serde_json::json!({
                "slug": slug,
                "enabled": resolved.enabled,
                "source": resolved.source.to_string(),
            }),
        );
    }

    Ok(Json(serde_json::Value::Object(result)))
}

/// GET /features/registry
///
/// Proxies to Gateway: returns all feature definitions from the registry.
async fn list_registry(State(state): State<AppState>) -> Result<impl IntoResponse, AppError> {
    let resp = state
        .gateway_client
        .get("/registry")
        .await
        .map_err(|(_status, msg)| AppError::Internal(msg))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse gateway response: {}", e)))?;

    Ok(Json(body))
}

/// GET /features/:slug/flags
///
/// Proxies to Gateway: returns all flag overrides for a given feature slug.
async fn list_flags(
    Path(slug): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let path = format!("/features/{}/flags", slug);
    let resp = state
        .gateway_client
        .get(&path)
        .await
        .map_err(|(_status, msg)| AppError::Internal(msg))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse gateway response: {}", e)))?;

    Ok(Json(body))
}

/// POST /features/:slug/flags
///
/// Proxies to Gateway: creates or updates a feature flag override.
/// Enforces D-06 role-scope authorization before proxying.
async fn set_flag(
    Extension(claims): Extension<Claims>,
    Path(slug): Path<String>,
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Result<impl IntoResponse, AppError> {
    // Extract scope from body for authorization check
    let scope = body["scope"].as_str().unwrap_or("");
    let role = Role::from_str(&claims.role)
        .map_err(|_| AppError::Forbidden("Invalid role".into()))?;

    // D-06: Enforce role-scope authorization at API layer before proxying
    if !check_scope_authorization(role, scope) {
        return Err(AppError::Forbidden(format!(
            "Role '{}' cannot manage scope '{}'",
            claims.role, scope
        )));
    }

    let path = format!("/features/{}/flags", slug);
    let resp = state
        .gateway_client
        .post_json(&path, body)
        .await
        .map_err(|(_status, msg)| AppError::Internal(msg))?;

    let result: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse gateway response: {}", e)))?;

    Ok(Json(result))
}

/// DELETE /features/:slug/flags
///
/// Proxies to Gateway: deletes a feature flag override.
/// Enforces D-06 role-scope authorization before proxying.
async fn delete_flag(
    Extension(claims): Extension<Claims>,
    Path(slug): Path<String>,
    State(state): State<AppState>,
    Query(params): Query<DeleteFlagParams>,
) -> Result<impl IntoResponse, AppError> {
    let role = Role::from_str(&claims.role)
        .map_err(|_| AppError::Forbidden("Invalid role".into()))?;

    // D-06: Enforce role-scope authorization at API layer before proxying
    if !check_scope_authorization(role, &params.scope) {
        return Err(AppError::Forbidden(format!(
            "Role '{}' cannot manage scope '{}'",
            claims.role, params.scope
        )));
    }

    let mut path = format!("/features/{}/flags?scope={}", slug, params.scope);
    if let Some(scope_id) = params.scope_id {
        path.push_str(&format!("&scope_id={}", scope_id));
    }

    let resp = state
        .gateway_client
        .delete(&path)
        .await
        .map_err(|(_status, msg)| AppError::Internal(msg))?;

    let result: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse gateway response: {}", e)))?;

    Ok(Json(result))
}

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

/// Build the features router with all proxy endpoints.
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
