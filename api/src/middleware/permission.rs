//! Type A (pure middleware) re-exported from api-infra.
//! Type B (DB-dependent) stays here because they use AppState + sqlx.

// Re-export pure middleware from api-infra
pub use api_infra::middleware::permission::{
    require_all_permissions, require_any_permission, require_min_role, require_permission,
};

use crate::AppState;
use axum::{
    extract::State,
    http::StatusCode,
};
use shared::models::{role::Role, Claims};
use std::str::FromStr;

/// Check if user has access to a specific organization
///
/// This middleware verifies that the user belongs to the specified organization
/// or has a role that allows cross-organization access (Root, OrganizationAdmin).
pub async fn require_organization_access(
    State(state): State<AppState>,
    organization_id: i64,
    claims: Claims,
) -> Result<(), StatusCode> {
    // Root can access any organization
    let role = Role::from_str(&claims.role).map_err(|_| StatusCode::FORBIDDEN)?;
    if role == Role::Root {
        return Ok(());
    }

    // Check if user belongs to this organization
    let belongs = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND organization_id = $2)",
    )
    .bind(claims.sub)
    .bind(organization_id)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if belongs {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

/// Check if user has access to a specific campus
///
/// This middleware verifies that the user belongs to the specified campus
/// or has a role that allows cross-campus access.
pub async fn require_campus_access(
    State(state): State<AppState>,
    campus_id: i64,
    claims: Claims,
) -> Result<(), StatusCode> {
    // Root can access any campus
    let role = Role::from_str(&claims.role).map_err(|_| StatusCode::FORBIDDEN)?;
    if role == Role::Root {
        return Ok(());
    }

    // Check if user belongs to this campus
    let belongs = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND campus_id = $2)",
    )
    .bind(claims.sub)
    .bind(campus_id)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if belongs {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_hierarchy_check() {
        assert!(Role::Root.is_higher_or_equal(Role::Teacher));
        assert!(Role::Teacher.is_higher_or_equal(Role::Student));
        assert!(!Role::Student.is_higher_or_equal(Role::Teacher));
    }
}
