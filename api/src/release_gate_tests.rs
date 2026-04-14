use crate::auth::JwtService;
use crate::classes;
use crate::contests;
use crate::db::schema::MIGRATOR;
use crate::leaderboard;
use crate::middleware::auth::auth_middleware;
use crate::search::models::SearchQuery;
use crate::search::service::SearchService;
use crate::websocket::WebSocketServer;
use crate::AppState;
use api_infra::traits::token_service::TokenService;
use axum::{
    body::Body,
    http::{header, HeaderValue, Request, StatusCode},
    middleware, Router,
};
use chrono::{Duration, Utc};
use sqlx::{postgres::PgPoolOptions, PgPool};
use testcontainers::runners::SyncRunner;
use testcontainers::Container;
use testcontainers_modules::postgres::Postgres;
use tower::ServiceExt;
use uuid::Uuid;

struct TestDb {
    _container: Container<Postgres>,
    database_url: String,
}

fn start_test_db() -> TestDb {
    let container = Postgres::default()
        .start()
        .expect("failed to start postgres container");
    let port = container
        .get_host_port_ipv4(5432)
        .expect("failed to resolve postgres port");

    TestDb {
        _container: container,
        database_url: format!("postgres://postgres:postgres@127.0.0.1:{port}/postgres"),
    }
}

async fn connect_and_migrate(database_url: &str) -> PgPool {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
        .expect("failed to connect to postgres");
    MIGRATOR.run(&pool).await.expect("failed to run migrations");
    pool
}

fn build_user(id: Uuid, username: &str, role: &str, school_id: i64) -> shared::models::User {
    shared::models::User {
        id,
        username: username.to_string(),
        email: format!("{username}@example.com"),
        password_hash: "hashed_password".to_string(),
        role: role.to_string(),
        school_id,
        campus_id: None,
    }
}

fn auth_header(jwt_service: &dyn TokenService, user: &shared::models::User) -> HeaderValue {
    let token = jwt_service
        .generate_access_token(user)
        .expect("failed to generate token");
    HeaderValue::from_str(&format!("Bearer {token}")).expect("invalid auth header")
}

fn build_state(pool: PgPool) -> AppState {
    let jwt_secret = "test_secret_key".to_string();
    std::env::set_var("JWT_SECRET", &jwt_secret);
    let jwt_service = JwtService::new(&jwt_secret);
    AppState {
        db_pool: pool,
        redis_pool: None,
        redis_url: "redis://127.0.0.1:6379".to_string(),
        jwt_service: std::sync::Arc::new(jwt_service),
        jwt_secret,
        worker_secret: "test_worker_secret".to_string(),
        websocket_server: std::sync::Arc::new(WebSocketServer::new()),
    }
}

fn build_protected_app(state: AppState, router: Router<AppState>) -> Router {
    Router::new()
        .merge(router)
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ))
        .with_state(state)
}

async fn insert_organization(pool: &PgPool, id: i64, name: &str, slug: &str) {
    sqlx::query("INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3)")
        .bind(id)
        .bind(name)
        .bind(slug)
        .execute(pool)
        .await
        .expect("failed to insert organization");
}

async fn insert_user(pool: &PgPool, user: &shared::models::User) {
    sqlx::query(
        r#"
        INSERT INTO users (
            id, email, password_hash, organization_id, campus_id, username, display_name, user_code, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
        "#,
    )
    .bind(user.id)
    .bind(&user.email)
    .bind(&user.password_hash)
    .bind(user.school_id)
    .bind(user.campus_id)
    .bind(&user.username)
    .bind(&user.username)
    .bind(format!("{:012}", user.username.parse::<u64>().unwrap_or(1)))
    .execute(pool)
    .await
    .expect("failed to insert user");
}

async fn insert_problem(
    pool: &PgPool,
    id: i64,
    organization_id: i64,
    author_id: Uuid,
    title: &str,
    visibility: &str,
) {
    sqlx::query(
        r#"
        INSERT INTO problems (
            id, organization_id, campus_id, author_id, title, description, difficulty, visibility, time_limit_ms, memory_limit_kb
        ) VALUES ($1, $2, NULL, $3, $4, $5, 'easy', $6, 1000, 262144)
        "#,
    )
    .bind(id)
    .bind(organization_id)
    .bind(author_id)
    .bind(title)
    .bind(format!("Description for {title}"))
    .bind(visibility)
    .execute(pool)
    .await
    .expect("failed to insert problem");
}

async fn insert_class(pool: &PgPool, id: i64, organization_id: i64, teacher_id: Uuid, name: &str) {
    sqlx::query(
        r#"
        INSERT INTO classes (id, organization_id, campus_id, name, teacher_id, semester, code)
        VALUES ($1, $2, NULL, $3, $4, '2026-Spring', $5)
        "#,
    )
    .bind(id)
    .bind(organization_id)
    .bind(name)
    .bind(teacher_id)
    .bind(format!("CLS{id:06}"))
    .execute(pool)
    .await
    .expect("failed to insert class");
}

async fn insert_assignment(pool: &PgPool, id: i64, class_id: i64, problem_id: i64) {
    sqlx::query(
        r#"
        INSERT INTO assignments (id, class_id, problem_id, deadline, points, published_at)
        VALUES ($1, $2, $3, $4, 100, NOW())
        "#,
    )
    .bind(id)
    .bind(class_id)
    .bind(problem_id)
    .bind(Utc::now() + Duration::days(7))
    .execute(pool)
    .await
    .expect("failed to insert assignment");
}

async fn insert_enrollment(pool: &PgPool, class_id: i64, student_id: Uuid) {
    sqlx::query(
        "INSERT INTO class_enrollments (class_id, student_id, status) VALUES ($1, $2, 'active')",
    )
    .bind(class_id)
    .bind(student_id)
    .execute(pool)
    .await
    .expect("failed to insert enrollment");
}

async fn insert_discussion(pool: &PgPool, problem_id: i64, user_id: Uuid, content: &str) {
    sqlx::query(
        "INSERT INTO discussions (problem_id, user_id, parent_id, content, is_pinned) VALUES ($1, $2, NULL, $3, false)",
    )
    .bind(problem_id)
    .bind(user_id)
    .bind(content)
    .execute(pool)
    .await
    .expect("failed to insert discussion");
}

#[test]
#[ignore = "requires Docker-backed Postgres"]
fn class_and_assignment_authorization_assignment_read_is_member_scoped() {
    let test_db = start_test_db();
    let rt = tokio::runtime::Runtime::new().expect("failed to create tokio runtime");

    rt.block_on(async {
        let pool = connect_and_migrate(&test_db.database_url).await;
        insert_organization(&pool, 1, "Org One", "org-one").await;

        let teacher = build_user(Uuid::new_v4(), "100100000001", "teacher", 1);
        let member = build_user(Uuid::new_v4(), "100100000002", "student", 1);
        let outsider = build_user(Uuid::new_v4(), "100100000003", "student", 1);
        insert_user(&pool, &teacher).await;
        insert_user(&pool, &member).await;
        insert_user(&pool, &outsider).await;
        insert_problem(&pool, 1, 1, teacher.id, "Scoped Assignment", "public").await;
        insert_class(&pool, 1, 1, teacher.id, "Teacher Class").await;
        insert_assignment(&pool, 1, 1, 1).await;
        insert_enrollment(&pool, 1, member.id).await;

        let state = build_state(pool.clone());
        let app = build_protected_app(
            state.clone(),
            Router::new().nest("/classes", classes::routes::classes_router()),
        );

        let member_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/classes/assignments/1")
                    .header(
                        header::AUTHORIZATION,
                        auth_header(state.jwt_service.as_ref(), &member),
                    )
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(member_response.status(), StatusCode::OK);

        let outsider_response = app
            .oneshot(
                Request::builder()
                    .uri("/classes/assignments/1")
                    .header(
                        header::AUTHORIZATION,
                        auth_header(state.jwt_service.as_ref(), &outsider),
                    )
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(outsider_response.status(), StatusCode::FORBIDDEN);
    });
}

#[test]
fn contest_and_leaderboard_scope_student_writes_and_cross_tenant_views_are_blocked() {
    let rt = tokio::runtime::Runtime::new().expect("failed to create tokio runtime");

    rt.block_on(async {
        let pool = sqlx::PgPool::connect_lazy("postgres://localhost/nonexistent")
            .expect("failed to create lazy pool");
        let state = build_state(pool);
        let student = build_user(Uuid::new_v4(), "100200000001", "student", 1);

        let app = build_protected_app(
            state.clone(),
            Router::new()
                .nest("/contests", contests::routes::contests_router())
                .nest("/leaderboard", leaderboard::routes::leaderboard_router()),
        );

        let create_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/contests")
                    .header(header::CONTENT_TYPE, "application/json")
                    .header(
                        header::AUTHORIZATION,
                        auth_header(state.jwt_service.as_ref(), &student),
                    )
                    .body(Body::from(
                        serde_json::json!({
                            "organization_id": 999,
                            "campus_id": null,
                            "name": "Blocked Contest",
                            "description": null,
                            "rules": "acm",
                            "start_time": Utc::now().to_rfc3339(),
                            "end_time": (Utc::now() + Duration::hours(2)).to_rfc3339(),
                            "freeze_minutes": 30
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(create_response.status(), StatusCode::FORBIDDEN);

        let participants_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/contests/1/participants")
                    .header(
                        header::AUTHORIZATION,
                        auth_header(state.jwt_service.as_ref(), &student),
                    )
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(participants_response.status(), StatusCode::FORBIDDEN);

        let school_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/leaderboard/school/2?limit=10")
                    .header(
                        header::AUTHORIZATION,
                        auth_header(state.jwt_service.as_ref(), &student),
                    )
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(school_response.status(), StatusCode::FORBIDDEN);

        let unauthenticated_global = app
            .oneshot(
                Request::builder()
                    .uri("/leaderboard/global?limit=10")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(unauthenticated_global.status(), StatusCode::UNAUTHORIZED);
    });
}

#[test]
#[ignore = "requires Docker-backed Postgres"]
fn community_message_search_scope_filters_private_and_cross_tenant_content() {
    let test_db = start_test_db();
    let rt = tokio::runtime::Runtime::new().expect("failed to create tokio runtime");

    rt.block_on(async {
        let pool = connect_and_migrate(&test_db.database_url).await;
        insert_organization(&pool, 1, "Org One", "org-one").await;
        insert_organization(&pool, 2, "Org Two", "org-two").await;

        let teacher_one = build_user(Uuid::new_v4(), "100300000001", "teacher", 1);
        let teacher_two = build_user(Uuid::new_v4(), "100300000002", "teacher", 2);
        insert_user(&pool, &teacher_one).await;
        insert_user(&pool, &teacher_two).await;

        insert_problem(
            &pool,
            1,
            1,
            teacher_one.id,
            "alpha private org one",
            "private",
        )
        .await;
        insert_problem(
            &pool,
            2,
            1,
            teacher_one.id,
            "alpha public org one",
            "public",
        )
        .await;
        insert_problem(
            &pool,
            3,
            2,
            teacher_two.id,
            "alpha public org two",
            "public",
        )
        .await;
        insert_discussion(&pool, 2, teacher_one.id, "alpha local discussion").await;
        insert_discussion(&pool, 3, teacher_two.id, "alpha foreign discussion").await;

        let service = SearchService::new(pool);
        let query = SearchQuery {
            q: Some("alpha".to_string()),
            r#type: "all".to_string(),
            category: None,
            tag: None,
            author_id: None,
            sort: "relevance".to_string(),
            page: 1,
            limit: 20,
        };

        let student_results = service
            .search_tenant_aware(query.clone(), Some(1), false)
            .await
            .expect("student search should succeed");
        let student_titles: Vec<&str> = student_results
            .results
            .iter()
            .map(|item| item.title.as_str())
            .collect();
        let student_contents: Vec<&str> = student_results
            .results
            .iter()
            .map(|item| item.content.as_str())
            .collect();

        assert!(student_titles
            .iter()
            .any(|title| title.contains("alpha public org one")));
        assert!(!student_titles
            .iter()
            .any(|title| title.contains("alpha private org one")));
        assert!(!student_titles
            .iter()
            .any(|title| title.contains("alpha public org two")));
        assert!(student_contents
            .iter()
            .any(|content| content.contains("alpha local discussion")));
        assert!(!student_contents
            .iter()
            .any(|content| content.contains("alpha foreign discussion")));

        let teacher_results = service
            .search_tenant_aware(query, Some(1), true)
            .await
            .expect("teacher search should succeed");
        let teacher_titles: Vec<&str> = teacher_results
            .results
            .iter()
            .map(|item| item.title.as_str())
            .collect();
        assert!(teacher_titles
            .iter()
            .any(|title| title.contains("alpha private org one")));
        assert!(teacher_titles
            .iter()
            .any(|title| title.contains("alpha public org one")));
        assert!(!teacher_titles
            .iter()
            .any(|title| title.contains("alpha public org two")));
    });
}
