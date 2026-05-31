//! Feature gateway CRUD routes.
//!
//! Provides endpoints for managing feature flag overrides
//! and reading resolved feature state. Protected by WORKER_SECRET auth.
//! Enforces D-06 role-scope authorization where applicable.

use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    response::{IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use serde::Deserialize;
use shared::models::role::Role;

use crate::models::SetFlagRequest;
use crate::AppState;

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

/// Query parameters for the resolve endpoint.
#[derive(Debug, Deserialize)]
pub struct ResolveQuery {
    pub slug: String,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
}

/// Query parameters for the delete_flag endpoint.
#[derive(Debug, Deserialize)]
pub struct DeleteFlagParams {
    pub scope: String,
    pub scope_id: Option<i64>,
}

/// Query parameters for listing feature flag overrides.
#[derive(Debug, Deserialize)]
pub struct ListFlagParams {
    pub scope: Option<String>,
    pub scope_id: Option<i64>,
}

/// JSON error response body for gateway routes.
#[derive(Debug, serde::Serialize)]
pub struct GatewayError {
    pub error: String,
    pub status: u16,
}

impl IntoResponse for GatewayError {
    fn into_response(self) -> Response {
        let status = axum::http::StatusCode::from_u16(self.status)
            .unwrap_or(axum::http::StatusCode::INTERNAL_SERVER_ERROR);
        (status, Json(self)).into_response()
    }
}

impl GatewayError {
    fn internal(msg: impl Into<String>) -> Self {
        Self {
            error: msg.into(),
            status: 500,
        }
    }

    fn validation(msg: impl Into<String>) -> Self {
        Self {
            error: msg.into(),
            status: 400,
        }
    }
}

/// GET /resolve?slug=&campus_id=&grade_id=
///
/// Resolves a single feature flag for the given scope context.
async fn resolve_feature(
    State(state): State<AppState>,
    Query(params): Query<ResolveQuery>,
) -> Result<impl IntoResponse, GatewayError> {
    let resolved = state
        .gateway
        .resolve(&params.slug, params.campus_id, params.grade_id)
        .await;

    Ok(Json(serde_json::json!({
        "slug": params.slug,
        "enabled": resolved.enabled,
        "source": resolved.source.to_string(),
    })))
}

/// GET /registry
///
/// Returns all feature definitions from the registry.
async fn list_registry(State(state): State<AppState>) -> Result<impl IntoResponse, GatewayError> {
    let entries = state
        .gateway
        .list_registry()
        .await
        .map_err(|e| GatewayError::internal(e.to_string()))?;

    Ok(Json(entries))
}

/// GET /features/:slug/flags
///
/// Returns all flag overrides for a given feature slug.
async fn list_flags(
    Path(slug): Path<String>,
    Query(params): Query<ListFlagParams>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, GatewayError> {
    let flags = state
        .gateway
        .list_flags(&slug, params.scope.as_deref(), params.scope_id)
        .await
        .map_err(|e| GatewayError::internal(e.to_string()))?;

    Ok(Json(flags))
}

/// POST /features/:slug/flags
///
/// Creates or updates a feature flag override at the given scope.
/// Enforces D-06 role-scope authorization.
///
/// The caller role is passed via `X-Caller-Role` header since
/// the gateway uses WORKER_SECRET auth (no JWT).
async fn set_flag(
    Path(slug): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<SetFlagRequest>,
) -> Result<impl IntoResponse, GatewayError> {
    // SECURITY (C-06): Enforce D-06 role-scope authorization
    let caller_role = headers
        .get("X-Caller-Role")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<Role>().ok())
        .ok_or_else(|| GatewayError::validation("Missing or invalid X-Caller-Role header"))?;

    if !check_scope_authorization(caller_role, &req.scope) {
        return Err(GatewayError {
            error: format!(
                "Role {:?} not authorized for scope '{}'",
                caller_role, req.scope
            ),
            status: 403,
        });
    }

    // Validate scope values
    if !matches!(req.scope.as_str(), "global" | "campus" | "grade" | "class") {
        return Err(GatewayError::validation(format!(
            "Invalid scope '{}'. Must be one of: global, campus, grade, class",
            req.scope
        )));
    }

    // Global scope must not have scope_id
    if req.scope == "global" && req.scope_id.is_some() {
        return Err(GatewayError::validation(String::from(
            "Global scope must not specify scope_id",
        )));
    }

    state
        .gateway
        .set_flag(&slug, &req.scope, req.scope_id, req.enabled)
        .await
        .map_err(|e| GatewayError::internal(e.to_string()))?;

    Ok(Json(serde_json::json!({"message": "Flag updated"})))
}

/// DELETE /features/:slug/flags
///
/// Deletes a feature flag override at the given scope.
/// Enforces D-06 role-scope authorization.
async fn delete_flag(
    Path(slug): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<DeleteFlagParams>,
) -> Result<impl IntoResponse, GatewayError> {
    // SECURITY (C-06): Enforce D-06 role-scope authorization
    let caller_role = headers
        .get("X-Caller-Role")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<Role>().ok())
        .ok_or_else(|| GatewayError::validation("Missing or invalid X-Caller-Role header"))?;

    if !check_scope_authorization(caller_role, &params.scope) {
        return Err(GatewayError {
            error: format!(
                "Role {:?} not authorized for scope '{}'",
                caller_role, params.scope
            ),
            status: 403,
        });
    }

    state
        .gateway
        .delete_flag(&slug, &params.scope, params.scope_id)
        .await
        .map_err(|e| GatewayError::internal(e.to_string()))?;

    Ok(Json(serde_json::json!({"message": "Flag deleted"})))
}

/// GET /health
///
/// Health check endpoint. Pings the database with `SELECT 1`.
async fn health_check(State(state): State<AppState>) -> Result<impl IntoResponse, GatewayError> {
    sqlx::query("SELECT 1")
        .execute(state.gateway.db_pool())
        .await
        .map_err(|e| GatewayError::internal(format!("DB health check failed: {}", e)))?;

    Ok(Json(serde_json::json!({"status": "ok"})))
}

/// Build the gateway router with all endpoints.
///
/// All routes are protected by `require_worker_secret` middleware (D-24).
pub fn gateway_router(state: AppState) -> Router {
    Router::new()
        .route("/resolve", get(resolve_feature))
        .route("/registry", get(list_registry))
        .route("/features/:slug/flags", get(list_flags))
        .route("/features/:slug/flags", post(set_flag))
        .route("/features/:slug/flags", delete(delete_flag))
        .route("/health", get(health_check))
        .with_state(state)
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
