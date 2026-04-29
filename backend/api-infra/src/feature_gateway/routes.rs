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
            .resolve(slug, tenant_ctx.tenant_id, tenant_ctx.campus_id, tenant_ctx.grade_id)
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
async fn list_registry(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let role =
        Role::from_str(&claims.role).map_err(|_| AppError::Forbidden("Invalid role".into()))?;
    if !role.is_higher_or_equal(Role::Teacher) {
        return Err(AppError::Forbidden(
            "Feature registry requires teacher or higher role".into(),
        ));
    }

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
    Extension(claims): Extension<Claims>,
    Path(slug): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let role =
        Role::from_str(&claims.role).map_err(|_| AppError::Forbidden("Invalid role".into()))?;
    if !role.is_higher_or_equal(Role::Teacher) {
        return Err(AppError::Forbidden(
            "Feature flags require teacher or higher role".into(),
        ));
    }

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
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(slug): Path<String>,
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Result<impl IntoResponse, AppError> {
    // Extract scope from body for authorization check
    let scope = body["scope"].as_str().unwrap_or("");
    let role =
        Role::from_str(&claims.role).map_err(|_| AppError::Forbidden("Invalid role".into()))?;

    // D-06: Enforce role-scope authorization at API layer before proxying
    if !check_scope_authorization(role, scope) {
        return Err(AppError::Forbidden(format!(
            "Role '{}' cannot manage scope '{}'",
            claims.role, scope
        )));
    }
    let scope_id = body["scope_id"].as_i64();
    verify_scope_ownership(&state, &claims, tenant_ctx, role, scope, scope_id).await?;

    let path = format!("/features/{}/flags", slug);
    let resp = state
        .gateway_client
        .post_json(&path, body, Some(&claims.role))
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
    Extension(tenant_ctx): Extension<TenantContext>,
    Path(slug): Path<String>,
    State(state): State<AppState>,
    Query(params): Query<DeleteFlagParams>,
) -> Result<impl IntoResponse, AppError> {
    let role =
        Role::from_str(&claims.role).map_err(|_| AppError::Forbidden("Invalid role".into()))?;

    // D-06: Enforce role-scope authorization at API layer before proxying
    if !check_scope_authorization(role, &params.scope) {
        return Err(AppError::Forbidden(format!(
            "Role '{}' cannot manage scope '{}'",
            claims.role, params.scope
        )));
    }
    verify_scope_ownership(
        &state,
        &claims,
        tenant_ctx,
        role,
        &params.scope,
        params.scope_id,
    )
    .await?;

    let mut path = format!("/features/{}/flags?scope={}", slug, params.scope);
    if let Some(scope_id) = params.scope_id {
        path.push_str(&format!("&scope_id={}", scope_id));
    }

    let resp = state
        .gateway_client
        .delete(&path, Some(&claims.role))
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

async fn verify_scope_ownership(
    state: &AppState,
    claims: &Claims,
    tenant_ctx: TenantContext,
    role: Role,
    scope: &str,
    scope_id: Option<i64>,
) -> Result<(), AppError> {
    match (role, scope) {
        (Role::Root, "global") => Ok(()),
        (Role::Root, "campus") => require_existing_campus(state, claims.school_id, scope_id).await,
        (Role::CampusAdmin, "campus") => {
            let expected = tenant_ctx
                .campus_id
                .ok_or_else(|| AppError::Forbidden("Campus scope is missing".into()))?;
            require_matching_scope(scope_id, expected, "campus")
        }
        (Role::CampusAdmin, "grade") => {
            let campus_id = tenant_ctx
                .campus_id
                .ok_or_else(|| AppError::Forbidden("Campus scope is missing".into()))?;
            require_grade_in_campus(state, claims.school_id, campus_id, scope_id).await
        }
        (Role::GradeAdmin, "grade") => {
            let expected = tenant_ctx
                .grade_id
                .ok_or_else(|| AppError::Forbidden("Grade scope is missing".into()))?;
            require_matching_scope(scope_id, expected, "grade")
        }
        (Role::Teacher, "class") => {
            let class_id = scope_id
                .ok_or_else(|| AppError::Validation("class scope_id is required".into()))?;
            let owns_class = sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS(
                    SELECT 1 FROM classes
                    WHERE id = $1 AND organization_id = $2 AND teacher_id = $3
                )",
            )
            .bind(class_id)
            .bind(claims.school_id)
            .bind(claims.sub)
            .fetch_one(&state.db_pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;
            if owns_class {
                Ok(())
            } else {
                Err(AppError::Forbidden("Class scope is outside caller ownership".into()))
            }
        }
        _ => Err(AppError::Forbidden(format!(
            "Role '{}' cannot manage scope '{}'",
            claims.role, scope
        ))),
    }
}

fn require_matching_scope(scope_id: Option<i64>, expected: i64, label: &str) -> Result<(), AppError> {
    match scope_id {
        Some(actual) if actual == expected => Ok(()),
        Some(_) => Err(AppError::Forbidden(format!(
            "{} scope is outside caller ownership",
            label
        ))),
        None => Err(AppError::Validation(format!("{} scope_id is required", label))),
    }
}

async fn require_existing_campus(
    state: &AppState,
    organization_id: i64,
    scope_id: Option<i64>,
) -> Result<(), AppError> {
    let campus_id =
        scope_id.ok_or_else(|| AppError::Validation("campus scope_id is required".into()))?;
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM campuses WHERE id = $1 AND organization_id = $2)",
    )
    .bind(campus_id)
    .bind(organization_id)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;
    if exists {
        Ok(())
    } else {
        Err(AppError::Forbidden("Campus scope is outside caller ownership".into()))
    }
}

async fn require_grade_in_campus(
    state: &AppState,
    organization_id: i64,
    campus_id: i64,
    scope_id: Option<i64>,
) -> Result<(), AppError> {
    let grade_id =
        scope_id.ok_or_else(|| AppError::Validation("grade scope_id is required".into()))?;
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(
            SELECT 1 FROM grades g
            JOIN campuses c ON c.id = g.campus_id
            WHERE g.id = $1 AND g.campus_id = $2 AND c.organization_id = $3
        )",
    )
    .bind(grade_id)
    .bind(campus_id)
    .bind(organization_id)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;
    if exists {
        Ok(())
    } else {
        Err(AppError::Forbidden("Grade scope is outside caller ownership".into()))
    }
}

/// Build the features router with all proxy endpoints.
///
/// This router should be nested inside the protected_router in main.rs
/// so that auth and tenant middleware are already applied.
pub fn features_router() -> Router<AppState> {
    Router::new()
        .route("/resolved", get(resolved_features))
        .route("/registry", get(list_registry))
        .route("/:slug/flags", get(list_flags))
        .route("/:slug/flags", post(set_flag))
        .route("/:slug/flags", delete(delete_flag))
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
        assert!(!check_scope_authorization(
            Role::TeachingAssistant,
            "global"
        ));
        assert!(!check_scope_authorization(
            Role::TeachingAssistant,
            "campus"
        ));
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
