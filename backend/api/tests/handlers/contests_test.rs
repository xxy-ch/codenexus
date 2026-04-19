//! Contest API handler tests using tower::ServiceExt::oneshot.
//!
//! Tests verify authentication, authorization, and basic endpoint behavior
//! for the contest domain routes.

use api::AppState;
use api_infra::metrics::setup_metrics_recorder;
use api_infra::testkit::TestFixture;
use api_infra::traits::class_repo::NoopClassMembershipChecker;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use chrono::{Duration, Utc};
use sqlx::PgPool;
use tower::ServiceExt;
use uuid::Uuid;

/// JWT secret used across all handler tests.
const TEST_JWT_SECRET: &str = "test_handler_secret_key";

/// Build a minimal Axum app with the contest router mounted at /contests,
/// with auth and tenant middleware applied (mirrors main.rs setup).
/// Returns the app (as Router<()>) and the JwtService for token generation.
async fn build_contest_app(pool: PgPool) -> (
    axum::Router,
    api::auth::JwtService,
) {
    let jwt_service = api::auth::JwtService::new(TEST_JWT_SECRET);

    let state = AppState {
        db_pool: pool,
        redis_pool: None,
        redis_url: String::new(),
        jwt_service: std::sync::Arc::new(api::auth::JwtService::new(TEST_JWT_SECRET)),
        jwt_secret: TEST_JWT_SECRET.to_string(),
        worker_secret: "test_worker_secret".to_string(),
        websocket_server: std::sync::Arc::new(api::websocket::WebSocketServer::new()),
        class_membership_checker: std::sync::Arc::new(NoopClassMembershipChecker),
        prometheus_handle: setup_metrics_recorder(),
        preview_cache: std::sync::Arc::new(dashmap::DashMap::new()),
    };

    // Mirror create_router's protected_router structure: auth -> tenant -> contest routes
    let protected_router = axum::Router::new()
        .nest("/contests", domain_contests::contests_router())
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

/// Seed the minimum dependency chain: organization -> campus -> user.
/// Returns (org_id, campus_id, user_id).
async fn seed_org_campus_user(pool: &PgPool, org_name: &str) -> (i64, i64, Uuid) {
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
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap();

    let user_id: Uuid = sqlx::query_scalar(
        r#"INSERT INTO users (email, password_hash, organization_id)
        VALUES ('test@contests-handler.com', 'hash', $1)
        RETURNING id"#,
    )
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap();

    sqlx::query(
        "INSERT INTO user_roles (user_id, organization_id, campus_id, role) VALUES ($1, $2, $3, 'student')",
    )
    .bind(user_id)
    .bind(org_id)
    .bind(campus_id)
    .execute(pool)
    .await
    .unwrap();

    (org_id, campus_id, user_id)
}

/// Generate a valid JWT for the given user details.
fn make_token(jwt_service: &api::auth::JwtService, user_id: Uuid, role: &str, school_id: i64) -> String {
    let user = shared::models::User {
        id: user_id,
        username: "testuser".to_string(),
        email: "test@handler.com".to_string(),
        password_hash: String::new(),
        role: role.to_string(),
        school_id,
        campus_id: None,
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
async fn test_list_contests_unauthenticated() {
    let fixture = setup_fixture().await;
    std::env::set_var("JWT_SECRET", TEST_JWT_SECRET);

    let (app, _) = build_contest_app(fixture.db_pool.clone()).await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/contests")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::UNAUTHORIZED,
        "GET /contests without auth token must return 401"
    );
}

#[tokio::test]
async fn test_list_contests_authenticated_returns_200() {
    let fixture = setup_fixture().await;
    std::env::set_var("JWT_SECRET", TEST_JWT_SECRET);

    let (org_id, _campus_id, user_id) = seed_org_campus_user(&fixture.db_pool, "Test Org").await;

    // Seed a contest so the list is not empty
    let now = Utc::now();
    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());
    service
        .create_contest(domain_contests::models::CreateContestRequest {
            organization_id: org_id,
            campus_id: None,
            name: "Handler Test Contest".to_string(),
            description: Some("desc".to_string()),
            rules: Some("acm".to_string()),
            start_time: now + Duration::hours(1),
            end_time: now + Duration::hours(3),
            freeze_minutes: None,
        })
        .await
        .unwrap();

    let (app, jwt_service) = build_contest_app(fixture.db_pool.clone()).await;
    let token = make_token(&jwt_service, user_id, "student", org_id);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/contests")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "GET /contests with valid auth must return 200"
    );
}

#[tokio::test]
async fn test_create_contest_requires_teacher_plus() {
    let fixture = setup_fixture().await;
    std::env::set_var("JWT_SECRET", TEST_JWT_SECRET);

    let (org_id, _campus_id, user_id) = seed_org_campus_user(&fixture.db_pool, "Test Org").await;

    let (app, jwt_service) = build_contest_app(fixture.db_pool.clone()).await;

    // Student role -- should be forbidden from creating contests
    let token = make_token(&jwt_service, user_id, "student", org_id);

    let now = Utc::now();
    let body = serde_json::json!({
        "organization_id": org_id,
        "name": "Should Not Create",
        "description": "desc",
        "rules": "acm",
        "start_time": (now + Duration::hours(1)).to_rfc3339(),
        "end_time": (now + Duration::hours(3)).to_rfc3339(),
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/contests")
                .header("authorization", format!("Bearer {}", token))
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::FORBIDDEN,
        "POST /contests with student role must return 403"
    );
}
