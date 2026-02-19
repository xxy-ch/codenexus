use axum::{
    extract::{Request, State},
    http::StatusCode,
    response::Response,
    middleware::Next,
};
use shared::models::{Claims, permission::Permission, role::Role};
use crate::rbac::RbacService;
use crate::AppState;
use std::str::FromStr;

/// Require specific permission to access a route
///
/// This middleware checks if the authenticated user has the required permission.
/// Returns 403 Forbidden if the user lacks the permission.
///
/// # Example
///
/// ```rust
/// use axum::{routing::get, Router};
/// use crate::middleware::permission::require_permission;
/// use shared::models::permission::Permission;
///
/// let app = Router::new()
///     .route("/admin", get(handler)
///     .route_layer(axum::middleware::from_fn(
///         require_permission(Permission::ManageUsers)
///     ));
/// ```
pub fn require_permission(
    required_permission: Permission,
) -> impl Fn(Request, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Response, StatusCode>> + Send>> + Clone {
    move |req: Request, next: Next| {
        let required = required_permission;
        Box::pin(async move {
            // Get claims from request extensions (inserted by auth middleware)
            let claims = match req.extensions().get::<Claims>() {
                Some(claims) => claims.clone(),
                None => return Err(StatusCode::UNAUTHORIZED),
            };

            // Parse user's role from claims
            let role = match Role::from_str(&claims.role) {
                Ok(role) => role,
                Err(_) => return Err(StatusCode::FORBIDDEN),
            };

            // Check if role has the required permission
            if RbacService::role_has_permission(role, required) {
                Ok(next.run(req).await)
            } else {
                Err(StatusCode::FORBIDDEN)
            }
        })
    }
}

/// Require any of the specified permissions
///
/// This middleware checks if the authenticated user has at least one of the required permissions.
/// Returns 403 Forbidden if the user lacks all permissions.
///
/// # Example
///
/// ```rust
/// use axum::{routing::get, Router};
/// use crate::middleware::permission::require_any_permission;
/// use shared::models::permission::Permission;
///
/// let app = Router::new()
///     .route("/manage", get(handler))
///     .route_layer(axum::middleware::from_fn(
///         require_any_permission(&[
///             Permission::ManageProblems,
///             Permission::ManageContests
///         ])
///     ));
/// ```
pub fn require_any_permission(
    permissions: &'static [Permission],
) -> impl Fn(Request, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Response, StatusCode>> + Send>> + Clone {
    move |req: Request, next: Next| {
        let perms = permissions;
        Box::pin(async move {
            let claims = match req.extensions().get::<Claims>() {
                Some(claims) => claims.clone(),
                None => return Err(StatusCode::UNAUTHORIZED),
            };

            let role = match Role::from_str(&claims.role) {
                Ok(role) => role,
                Err(_) => return Err(StatusCode::FORBIDDEN),
            };

            if RbacService::role_has_any_permission(role, perms) {
                Ok(next.run(req).await)
            } else {
                Err(StatusCode::FORBIDDEN)
            }
        })
    }
}

/// Require all of the specified permissions
///
/// This middleware checks if the authenticated user has all of the required permissions.
/// Returns 403 Forbidden if the user lacks any permission.
///
/// # Example
///
/// ```rust
/// use axum::{routing::get, Router};
/// use crate::middleware::permission::require_all_permissions;
/// use shared::models::permission::Permission;
///
/// let app = Router::new()
///     .route("/admin", get(handler))
///     .route_layer(axum::middleware::from_fn(
///         require_all_permissions(&[
///             Permission::ManageUsers,
///             Permission::ManageSystem
///         ])
///     ));
/// ```
pub fn require_all_permissions(
    permissions: &'static [Permission],
) -> impl Fn(Request, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Response, StatusCode>> + Send>> + Clone {
    move |req: Request, next: Next| {
        let perms = permissions;
        Box::pin(async move {
            let claims = match req.extensions().get::<Claims>() {
                Some(claims) => claims.clone(),
                None => return Err(StatusCode::UNAUTHORIZED),
            };

            let role = match Role::from_str(&claims.role) {
                Ok(role) => role,
                Err(_) => return Err(StatusCode::FORBIDDEN),
            };

            if RbacService::role_has_all_permissions(role, perms) {
                Ok(next.run(req).await)
            } else {
                Err(StatusCode::FORBIDDEN)
            }
        })
    }
}

/// Require minimum role level
///
/// This middleware checks if the authenticated user has a role that is
/// equal to or higher than the required role in the hierarchy.
/// Returns 403 Forbidden if the user's role is too low.
///
/// # Example
///
/// ```rust
/// use axum::{routing::get, Router};
/// use crate::middleware::permission::require_min_role;
/// use shared::models::role::Role;
///
/// let app = Router::new()
///     .route("/admin", get(handler))
///     .route_layer(axum::middleware::from_fn(
///         require_min_role(Role::Teacher)
///     ));
/// ```
pub fn require_min_role(
    min_role: Role,
) -> impl Fn(Request, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Response, StatusCode>> + Send>> + Clone {
    move |req: Request, next: Next| {
        let required = min_role;
        Box::pin(async move {
            let claims = match req.extensions().get::<Claims>() {
                Some(claims) => claims.clone(),
                None => return Err(StatusCode::UNAUTHORIZED),
            };

            let role = match Role::from_str(&claims.role) {
                Ok(role) => role,
                Err(_) => return Err(StatusCode::FORBIDDEN),
            };

            if role.is_higher_or_equal(required) {
                Ok(next.run(req).await)
            } else {
                Err(StatusCode::FORBIDDEN)
            }
        })
    }
}

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
        "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND organization_id = $2)"
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
        "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND campus_id = $2)"
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
