//! Integration tests for domain-problems
//!
//! Tests problem CRUD SQL operations against real PostgreSQL via testcontainers.
//! domain-problems does not have a separate service.rs -- routes use AppState directly.
//! These tests validate the underlying SQL queries and schema constraints.

use api_infra::testkit::TestFixture;
use sqlx::PgPool;
use uuid::Uuid;

async fn setup_fixture() -> TestFixture {
    let fixture = TestFixture::new().await;
    let migrator = sqlx::migrate!("../api/migrations");
    migrator.run(&fixture.db_pool).await.expect("Failed to run migrations");
    fixture
}

/// Seed organization, campus, and user. Returns (org_id, campus_id, user_id).
async fn seed_org_and_user(pool: &PgPool) -> (i64, i64, Uuid) {
    let org_id: i64 = sqlx::query_scalar(
        "INSERT INTO organizations (name) VALUES ('Test Org') RETURNING id",
    )
    .fetch_one(pool)
    .await
    .unwrap();

    let campus_id: i64 = sqlx::query_scalar(
        "INSERT INTO campuses (organization_id, name) VALUES ($1, 'Main Campus') RETURNING id",
    )
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap();

    let user_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('test@problems.com', 'hash', $1) RETURNING id",
    )
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap();

    (org_id, campus_id, user_id)
}

/// Insert a problem and return its id.
async fn insert_problem(
    pool: &PgPool,
    org_id: i64,
    author_id: Uuid,
    title: &str,
    visibility: &str,
) -> i64 {
    sqlx::query_scalar(
        r#"INSERT INTO problems (organization_id, author_id, title, description, difficulty, visibility, time_limit_ms, memory_limit_kb)
        VALUES ($1, $2, $3, 'A test problem', 'easy', $4, 1000, 256000)
        RETURNING id"#,
    )
    .bind(org_id)
    .bind(author_id)
    .bind(title)
    .bind(visibility)
    .fetch_one(pool)
    .await
    .unwrap()
}

#[tokio::test]
async fn test_create_and_get_problem() {
    let fixture = setup_fixture().await;
    let (org_id, _campus_id, user_id) = seed_org_and_user(&fixture.db_pool).await;

    let problem_id = insert_problem(&fixture.db_pool, org_id, user_id, "Two Sum", "public").await;

    // Fetch back
    let row: (String, String, String, String, i32, i32) = sqlx::query_as(
        "SELECT title, description, difficulty, visibility, time_limit_ms, memory_limit_kb FROM problems WHERE id = $1",
    )
    .bind(problem_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    assert_eq!(row.0, "Two Sum");
    assert_eq!(row.2, "easy");
    assert_eq!(row.3, "public");
    assert_eq!(row.4, 1000);
    assert_eq!(row.5, 256000);
}

#[tokio::test]
async fn test_list_problems_by_organization() {
    let fixture = setup_fixture().await;
    let (org1_id, _c1, user1_id) = seed_org_and_user(&fixture.db_pool).await;

    // Create second org with a user
    let org2_id: i64 = sqlx::query_scalar(
        "INSERT INTO organizations (name) VALUES ('Test Org 2') RETURNING id",
    )
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();
    let user2_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('test2@problems.com', 'hash', $1) RETURNING id",
    )
    .bind(org2_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    // Create problems in both orgs
    insert_problem(&fixture.db_pool, org1_id, user1_id, "Org1 Problem A", "public").await;
    insert_problem(&fixture.db_pool, org1_id, user1_id, "Org1 Problem B", "private").await;
    insert_problem(&fixture.db_pool, org2_id, user2_id, "Org2 Problem A", "public").await;

    // Verify tenant isolation
    let org1_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM problems WHERE organization_id = $1")
            .bind(org1_id)
            .fetch_one(&fixture.db_pool)
            .await
            .unwrap();
    assert_eq!(org1_count, 2);

    let org2_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM problems WHERE organization_id = $1")
            .bind(org2_id)
            .fetch_one(&fixture.db_pool)
            .await
            .unwrap();
    assert_eq!(org2_count, 1);
}

#[tokio::test]
async fn test_problem_visibility_filtering() {
    let fixture = setup_fixture().await;
    let (org_id, _campus_id, user_id) = seed_org_and_user(&fixture.db_pool).await;

    // Create public and private problems
    insert_problem(&fixture.db_pool, org_id, user_id, "Public Problem", "public").await;
    insert_problem(&fixture.db_pool, org_id, user_id, "Private Problem", "private").await;

    // Count public-only
    let public_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM problems WHERE organization_id = $1 AND visibility = 'public'",
    )
    .bind(org_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();
    assert_eq!(public_count, 1);

    // Count all (admin view)
    let total_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM problems WHERE organization_id = $1")
            .bind(org_id)
            .fetch_one(&fixture.db_pool)
            .await
            .unwrap();
    assert_eq!(total_count, 2);
}
