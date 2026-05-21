//! Integration tests for domain-leaderboard
//!
//! Tests tenant-isolated leaderboard queries against real PostgreSQL via testcontainers.
//! Validates that leaderboard data never leaks across organizational boundaries.

use api_infra::testkit::TestFixture;
use sqlx::PgPool;
use uuid::Uuid;

async fn setup_fixture() -> TestFixture {
    let fixture = TestFixture::new().await;
    let migrator = sqlx::migrate!("../api/migrations");
    migrator
        .run(&fixture.db_pool)
        .await
        .expect("Failed to run migrations");
    fixture
}

/// Seed a user with an AC submission. Returns (org_id, user_id, problem_id).
async fn seed_user_with_ac_submission(pool: &PgPool, email_suffix: &str) -> (i64, Uuid) {
    let org_id: i64 =
        sqlx::query_scalar("INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id")
            .bind(format!("Org for {}", email_suffix))
            .bind(format!("org-for-{}", email_suffix))
            .fetch_one(pool)
            .await
            .unwrap();

    let user_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ($1, 'hash', $2) RETURNING id",
    )
    .bind(format!("{}@leaderboard.com", email_suffix))
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap();

    let problem_id: i64 = sqlx::query_scalar(
        r#"INSERT INTO problems (organization_id, author_id, title, description, difficulty, visibility, time_limit_ms, memory_limit_kb)
        VALUES ($1, $2, 'Test Problem', 'Desc', 'easy', 'public', 1000, 256000)
        RETURNING id"#,
    )
    .bind(org_id)
    .bind(user_id)
    .fetch_one(pool)
    .await
    .unwrap();

    // Insert an AC submission for the user
    sqlx::query(
        r#"INSERT INTO submissions (organization_id, user_id, problem_id, language, code, status, verdict, time_ms, memory_kb)
        VALUES ($1, $2, $3, 'python3', 'print(1)', 'judged', 'ac', 100, 1024)"#,
    )
    .bind(org_id)
    .bind(user_id)
    .bind(problem_id)
    .execute(pool)
    .await
    .unwrap();

    (org_id, user_id)
}

#[tokio::test]
async fn test_global_leaderboard_tenant_isolated() {
    let fixture = setup_fixture().await;

    // Create 2 orgs, each with a user who has an AC submission
    let (org1_id, _user1_id) = seed_user_with_ac_submission(&fixture.db_pool, "user1").await;
    let (org2_id, _user2_id) = seed_user_with_ac_submission(&fixture.db_pool, "user2").await;

    let service = domain_leaderboard::service::LeaderboardService::new(
        fixture.db_pool.clone(),
        None, // no Redis for tests
    )
    .unwrap();

    let make_query = || domain_leaderboard::models::LeaderboardQuery {
        limit: Some(100),
        offset: Some(0),
        timeframe: None,
        min_problems: Some(0),
    };

    // Query org1 leaderboard -- should only see org1 user
    let response = service
        .get_global_leaderboard(make_query(), Some(org1_id), None)
        .await
        .unwrap();
    assert_eq!(response.entries.len(), 1);
    assert_eq!(response.entries[0].user_id, _user1_id);

    // Query org2 leaderboard -- should only see org2 user
    let response = service
        .get_global_leaderboard(make_query(), Some(org2_id), None)
        .await
        .unwrap();
    assert_eq!(response.entries.len(), 1);
    assert_eq!(response.entries[0].user_id, _user2_id);
}

#[tokio::test]
async fn test_problem_leaderboard_tenant_isolated() {
    let fixture = setup_fixture().await;

    let (org1_id, user1_id) = seed_user_with_ac_submission(&fixture.db_pool, "u1").await;
    let (org2_id, _user2_id) = seed_user_with_ac_submission(&fixture.db_pool, "u2").await;

    // Create a shared problem accessible by both orgs (public)
    // Actually problems are org-scoped, so let's just query each org's problem
    let problem1_id: i64 =
        sqlx::query_scalar("SELECT id FROM problems WHERE organization_id = $1 LIMIT 1")
            .bind(org1_id)
            .fetch_one(&fixture.db_pool)
            .await
            .unwrap();

    let service =
        domain_leaderboard::service::LeaderboardService::new(fixture.db_pool.clone(), None)
            .unwrap();

    // Problem leaderboard for org1 should only show org1 users
    let entries = service
        .get_problem_leaderboard(problem1_id, 10, Some(org1_id))
        .await
        .unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].user_id, user1_id);

    // Problem leaderboard for org2 on org1's problem should return empty
    let entries = service
        .get_problem_leaderboard(problem1_id, 10, Some(org2_id))
        .await
        .unwrap();
    assert!(entries.is_empty());
}
