use crate::rbac::RbacService;
use axum::{
    extract::Request as AxumRequest,
    http::{Response, StatusCode},
    middleware::Next,
};
use shared::models::{permission::Permission, Claims};

/// Authorization middleware that checks if authenticated user has a specific permission
///
/// This middleware must be used after `auth_middleware` has run,
/// as it relies on `Claims` being available in request extensions.
///
/// # Example
/// ```rust,no_run
/// use crate::middleware::authz::require_permission;
/// use shared::models::permission::Permission;
///
/// let app = Router::new()
///     .route("/admin/users", get(handler))
///     .route_layer(axum::middleware::from_fn_with_state(
///         Permission::ManageUsers,
///         |permission, req, next| require_permission(permission, req, next)
///     ));
/// ```
pub async fn require_permission(
    permission: Permission,
    request: AxumRequest,
    next: Next,
) -> Result<Response<axum::body::Body>, StatusCode> {
    // Get Claims from request extensions (set by auth middleware)
    let claims = request
        .extensions()
        .get::<Claims>()
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Parse role from string in claims
    let role = claims.role.parse().map_err(|_| StatusCode::FORBIDDEN)?;

    // Check if role has the required permission
    if RbacService::role_has_permission(role, permission) {
        Ok(next.run(request).await)
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request, routing::get, Router};
    use shared::models::Role;
    use tower::ServiceExt;
    use uuid::Uuid;

    async fn protected_handler() -> &'static str {
        "authorized"
    }

    async fn submit_handler() -> &'static str {
        "authorized to submit"
    }

    fn create_test_app() -> Router {
        Router::new()
            .route("/admin/users", get(protected_handler))
            .route("/problems/submit", get(submit_handler))
            .route_layer(axum::middleware::from_fn(|req, next| {
                require_permission(Permission::ManageUsers, req, next)
            }))
    }

    fn create_test_app_for_submit() -> Router {
        Router::new()
            .route("/admin/users", get(protected_handler))
            .route("/problems/submit", get(submit_handler))
            .route_layer(axum::middleware::from_fn(|req, next| {
                require_permission(Permission::SubmitSolution, req, next)
            }))
    }

    fn create_claims_with_role(role: Role) -> Claims {
        Claims {
            sub: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            role: role.as_str().to_string(),
            school_id: 1,
            campus_id: None,
            iat: chrono::Utc::now().timestamp(),
            exp: chrono::Utc::now().timestamp() + 3600,
            jti: Uuid::new_v4(),
        }
    }

    #[tokio::test]
    async fn test_authz_missing_claims() {
        let app = create_test_app();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/admin/users")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_authz_root_has_permission() {
        let app = create_test_app();
        let claims = create_claims_with_role(Role::Root);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/admin/users")
                    .extension(claims)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_authz_campus_admin_can_manage_users() {
        let app = create_test_app();
        let claims = create_claims_with_role(Role::CampusAdmin);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/admin/users")
                    .extension(claims)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_authz_teacher_cannot_manage_users() {
        let app = create_test_app();
        let claims = create_claims_with_role(Role::Teacher);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/admin/users")
                    .extension(claims)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn test_authz_student_cannot_manage_users() {
        let app = create_test_app();
        let claims = create_claims_with_role(Role::Student);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/admin/users")
                    .extension(claims)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn test_authz_student_can_submit() {
        let app = create_test_app_for_submit();
        let claims = create_claims_with_role(Role::Student);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/problems/submit")
                    .extension(claims)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_authz_teacher_cannot_submit() {
        let app = create_test_app_for_submit();
        let claims = create_claims_with_role(Role::Teacher);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/problems/submit")
                    .extension(claims)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn test_authz_invalid_role_in_claims() {
        let app = create_test_app();

        let mut claims = create_claims_with_role(Role::Root);
        claims.role = "invalid_role".to_string();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/admin/users")
                    .extension(claims)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }
}
