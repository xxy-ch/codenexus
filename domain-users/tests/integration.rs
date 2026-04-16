//! Integration tests for domain-users
//!
//! Tests DB-level user operations against real PostgreSQL via testcontainers.
//! The UserService requires an Arc<dyn TokenService>, so these tests validate
//! the underlying SQL queries and schema constraints directly.

use api_infra::testkit::TestFixture;
use sqlx::PgPool;
use uuid::Uuid;

async fn setup_fixture() -> TestFixture {
    let fixture = TestFixture::new().await;
    let migrator = sqlx::migrate!("../api/migrations");
    migrator.run(&fixture.db_pool).await.expect("Failed to run migrations");
    fixture
}

/// Seed an organization. Returns org_id.
async fn seed_org(pool: &PgPool) -> i64 {
    sqlx::query_scalar("INSERT INTO organizations (name) VALUES ('Test Org') RETURNING id")
        .fetch_one(pool)
        .await
        .unwrap()
}

/// Seed org + campus. Returns (org_id, campus_id).
async fn seed_org_and_campus(pool: &PgPool) -> (i64, i64) {
    let org_id = seed_org(pool).await;
    let campus_id: i64 = sqlx::query_scalar(
        "INSERT INTO campuses (organization_id, name) VALUES ($1, 'Main Campus') RETURNING id",
    )
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap();
    (org_id, campus_id)
}

#[tokio::test]
async fn test_create_and_get_user() {
    let fixture = setup_fixture().await;
    let (org_id, campus_id) = seed_org_and_campus(&fixture.db_pool).await;

    // Insert user directly (mimicking what UserService::register does)
    let user_id: Uuid = sqlx::query_scalar(
        r#"INSERT INTO users (email, password_hash, organization_id, campus_id)
        VALUES ('test@users.com', 'hashed_pw_123', $1, $2)
        RETURNING id"#,
    )
    .bind(org_id)
    .bind(campus_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    // Fetch back and verify
    let row = sqlx::query_as::<_, (Uuid, String, i64, Option<i64>, String)>(
        "SELECT id, email, organization_id, campus_id, status FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    assert_eq!(row.0, user_id);
    assert_eq!(row.1, "test@users.com");
    assert_eq!(row.2, org_id);
    assert_eq!(row.3, Some(campus_id));
    assert_eq!(row.4, "active"); // default status from migration 021
}

#[tokio::test]
async fn test_list_users_by_organization() {
    let fixture = setup_fixture().await;
    let org1_id = seed_org(&fixture.db_pool).await;
    let org2_id: i64 = sqlx::query_scalar(
        "INSERT INTO organizations (name) VALUES ('Test Org 2') RETURNING id",
    )
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    // Create 2 users in org1, 1 user in org2
    let _u1: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('u1@test.com', 'h', $1) RETURNING id",
    )
    .bind(org1_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    let _u2: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('u2@test.com', 'h', $1) RETURNING id",
    )
    .bind(org1_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    let _u3: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('u3@test.com', 'h', $1) RETURNING id",
    )
    .bind(org2_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    // Count users in org1
    let org1_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE organization_id = $1")
            .bind(org1_id)
            .fetch_one(&fixture.db_pool)
            .await
            .unwrap();
    assert_eq!(org1_count, 2);

    // Count users in org2
    let org2_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE organization_id = $1")
            .bind(org2_id)
            .fetch_one(&fixture.db_pool)
            .await
            .unwrap();
    assert_eq!(org2_count, 1);
}

#[tokio::test]
async fn test_user_email_uniqueness() {
    let fixture = setup_fixture().await;
    let org_id = seed_org(&fixture.db_pool).await;

    // First user with this email succeeds
    let _u1: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('unique@test.com', 'h', $1) RETURNING id",
    )
    .bind(org_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    // Second user with same email fails (UNIQUE constraint on email)
    let result: Result<Uuid, _> = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('unique@test.com', 'h', $1) RETURNING id",
    )
    .bind(org_id)
    .fetch_one(&fixture.db_pool)
    .await;

    assert!(result.is_err());
}
