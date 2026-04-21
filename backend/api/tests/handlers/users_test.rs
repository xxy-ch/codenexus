//! User API handler tests using tower::ServiceExt::oneshot.
//!
//! Tests verify authentication and authorization for user domain routes,
//! including the admin-only list endpoint and the /me profile endpoint.

use api::AppState;
use api_infra::metrics::setup_metrics_recorder;
use api_infra::testkit::TestFixture;
use api_infra::traits::class_repo::NoopClassMembershipChecker;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use sqlx::PgPool;
use tower::ServiceExt;
use uuid::Uuid;

const TEST_JWT_SECRET: &str = "test_handler_secret_key";

/// Build a minimal Axum app with the user router mounted at /users,
/// with auth and tenant middleware applied.
/// Returns the app (as Router<()>) and the JwtService for token generation.
async fn build_users_app(pool: PgPool) -> (
    axum::Router,
    api::auth::JwtService,
) {
    let jwt_service = api::auth::JwtService::new(TEST_JWT_SECRET);

    let state = AppState {
        db_pool: pool.clone(),
        redis_pool: None,
        redis_url: String::new(),
        jwt_service: std::sync::Arc::new(api::auth::JwtService::new(TEST_JWT_SECRET)),
        jwt_secret: TEST_JWT_SECRET.to_string(),
        worker_secret: "test_worker_secret".to_string(),
        websocket_server: std::sync::Arc::new(api::websocket::WebSocketServer::new()),
        class_membership_checker: std::sync::Arc::new(NoopClassMembershipChecker),
        prometheus_handle: setup_metrics_recorder(),
        preview_cache: std::sync::Arc::new(dashmap::DashMap::new()),
        feature_gateway: std::sync::Arc::new(
            api_infra::feature_gateway::FeatureGatewayService::new(pool),
        ),
    };

    let protected_router = axum::Router::new()
        .nest("/users", domain_users::user_router())
        .route_layer(axum::middleware::from_fn(
            api::middleware::tenant::tenant_middleware,
        ))
        .route_layer(axum::middleware::from_fn_with_state(
            state.clone(),
            api::middleware::auth::auth_middleware,
        ));

    // .with_state() converts Router<AppState> to Router<()> which supports oneshot
    let app = protected_router.with_state(state);
    (app, jwt_service)
}

/// Seed an org + campus + user with a specific role.
/// Returns (org_id, campus_id, user_id).
async fn seed_user_with_role(
    pool: &PgPool,
    org_name: &str,
    username: &str,
    role: &str,
) -> (i64, i64, Uuid) {
    let org_id: i64 = sqlx::query_scalar(
        "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
    )
    .bind(org_name)
    .bind(org_name.to_lowercase().replace(' ', "-"))
    .fetch_one(pool)
    .await
    .unwrap();

    let campus_id: i64 = sqlx::query_scalar(
        "INSERT INTO campuses (organization_id, name, slug) VALUES ($1, 'Main Campus', $2) RETURNING id",
    )
    .bind(org_id)
    .bind(format!("main-{}", org_id))
    .fetch_one(pool)
    .await
    .unwrap();

    let password_hash = bcrypt::hash("Password123", bcrypt::DEFAULT_COST).unwrap();

    let user_id: Uuid = sqlx::query_scalar(
        r#"INSERT INTO users (username, email, password_hash, organization_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id"#,
    )
    .bind(username)
    .bind(format!("{}@users-handler.com", username))
    .bind(&password_hash)
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap();

    sqlx::query(
        "INSERT INTO user_roles (user_id, organization_id, campus_id, role) VALUES ($1, $2, $3, $4)",
    )
    .bind(user_id)
    .bind(org_id)
    .bind(campus_id)
    .bind(role)
    .execute(pool)
    .await
    .unwrap();

    (org_id, campus_id, user_id)
}

fn make_token(jwt_service: &api::auth::JwtService, user_id: Uuid, role: &str, school_id: i64, campus_id: Option<i64>) -> String {
    let user = shared::models::User {
        id: user_id,
        username: "testuser".to_string(),
        email: "test@handler.com".to_string(),
        password_hash: String::new(),
        role: role.to_string(),
        school_id,
        campus_id,
        grade_id: None,
    };
    jwt_service.generate_access_token(&user).unwrap()
}

async fn setup_fixture() -> TestFixture {
    let fixture = TestFixture::new().await;
    let migrator = sqlx::migrate!("../api/migrations");
    migrator.run(&fixture.db_pool).await.expect("Failed to run migrations");
    fixture
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

#[tokio::test]
async fn test_get_me_unauthenticated() {
    let fixture = setup_fixture().await;
    std::env::set_var("JWT_SECRET", TEST_JWT_SECRET);

    let (app, _) = build_users_app(fixture.db_pool.clone()).await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/users/me")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::UNAUTHORIZED,
        "GET /users/me without auth must return 401"
    );
}

#[tokio::test]
async fn test_admin_list_users_returns_200() {
    let fixture = setup_fixture().await;
    std::env::set_var("JWT_SECRET", TEST_JWT_SECRET);

    let (org_id, _campus_id, admin_id) =
        seed_user_with_role(&fixture.db_pool, "Grade Admin", "admin1", "gradeadmin").await;

    let (app, jwt_service) = build_users_app(fixture.db_pool.clone()).await;
    let token = make_token(&jwt_service, admin_id, "gradeadmin", org_id, Some(_campus_id));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/users/admin")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "GET /users/admin with admin role must return 200"
    );
}

#[tokio::test]
async fn test_student_cannot_list_all_users() {
    let fixture = setup_fixture().await;
    std::env::set_var("JWT_SECRET", TEST_JWT_SECRET);

    let (org_id, _campus_id, student_id) =
        seed_user_with_role(&fixture.db_pool, "Student Org", "student1", "student").await;

    let (app, jwt_service) = build_users_app(fixture.db_pool.clone()).await;
    let token = make_token(&jwt_service, student_id, "student", org_id, None);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/users/admin")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // The ensure_admin check in routes.rs returns AppError::Auth which maps to 401
    assert!(
        response.status() == StatusCode::UNAUTHORIZED
            || response.status() == StatusCode::FORBIDDEN,
        "GET /users/admin with student role must return 401 or 403, got {}",
        response.status()
    );
}
