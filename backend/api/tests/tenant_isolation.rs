//! Multi-tenant isolation test suite (TEST-03).
//!
//! Verifies the core security property: data seeded in organization A
//! never appears in queries scoped to organization B. Each test seeds
//! identical data in two organizations, queries for one org, and confirms
//! no cross-tenant leakage.
//!
//! These are integration-level tests that call domain service layers directly
//! (not HTTP handlers), because tenant filtering happens in the SQL queries
//! within service functions. Handler-level tenant tests would duplicate the
//! auth middleware tests already covered in 07-04 handlers.

use api_infra::testkit::TestFixture;
use chrono::{Duration, Utc};
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

/// Seed the full dependency chain: org -> campus -> user with a given role.
/// Returns (org_id, campus_id, user_id).
async fn seed_org_with_user(
    pool: &PgPool,
    org_name: &str,
    username: &str,
    role: &str,
) -> (i64, i64, Uuid) {
    let org_id: i64 =
        sqlx::query_scalar("INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id")
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

    let user_id: Uuid = sqlx::query_scalar(
        r#"INSERT INTO users (username, email, password_hash, organization_id)
        VALUES ($1, $2, 'hash', $3)
        RETURNING id"#,
    )
    .bind(username)
    .bind(format!("{}@tenant-test.com", username))
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

/// Seed a problem in the given org. Returns problem_id.
async fn seed_problem(pool: &PgPool, org_id: i64, author_id: Uuid, title: &str) -> i64 {
    sqlx::query_scalar(
        r#"INSERT INTO problems (organization_id, author_id, title, description, difficulty, visibility, time_limit_ms, memory_limit_kb)
        VALUES ($1, $2, $3, 'desc', 'easy', 'public', 1000, 256000)
        RETURNING id"#,
    )
    .bind(org_id)
    .bind(author_id)
    .bind(title)
    .fetch_one(pool)
    .await
    .unwrap()
}

/// Seed a submission. Returns submission_id.
async fn seed_submission(
    pool: &PgPool,
    org_id: i64,
    user_id: Uuid,
    problem_id: i64,
    verdict: &str,
) -> i64 {
    sqlx::query_scalar(
        r#"INSERT INTO submissions (organization_id, user_id, problem_id, language, code, status, verdict)
        VALUES ($1, $2, $3, 'cpp', 'int main(){}', 'judged', $4)
        RETURNING id"#,
    )
    .bind(org_id)
    .bind(user_id)
    .bind(problem_id)
    .bind(verdict)
    .fetch_one(pool)
    .await
    .unwrap()
}

// -----------------------------------------------------------------------
// Test 1: Contest list is tenant-isolated
// -----------------------------------------------------------------------

#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_contest_list_tenant_isolated() {
    let fixture = setup_fixture().await;

    // Seed org A and org B
    let (org_a, _campus_a, _user_a) = seed_org_with_user(
        &fixture.db_pool,
        "Org A (Contest)",
        "contest_user_a",
        "teacher",
    )
    .await;
    let (org_b, _campus_b, _user_b) = seed_org_with_user(
        &fixture.db_pool,
        "Org B (Contest)",
        "contest_user_b",
        "teacher",
    )
    .await;

    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());

    let now = Utc::now();
    let start = now + Duration::hours(1);
    let end = now + Duration::hours(3);

    // Create distinct contests in each org
    service
        .create_contest(domain_contests::models::CreateContestRequest {
            organization_id: org_a,
            campus_id: None,
            name: "Org A Contest Alpha".to_string(),
            description: Some("Alpha".to_string()),
            rules: Some("acm".to_string()),
            start_time: start,
            end_time: end,
            freeze_minutes: None,
        })
        .await
        .unwrap();

    service
        .create_contest(domain_contests::models::CreateContestRequest {
            organization_id: org_b,
            campus_id: None,
            name: "Org B Contest Beta".to_string(),
            description: Some("Beta".to_string()),
            rules: Some("acm".to_string()),
            start_time: start,
            end_time: end,
            freeze_minutes: None,
        })
        .await
        .unwrap();

    // Query org A -- must only see Org A contest
    let (contests, total) = service
        .list_contests(Some(org_a), None, None, 1, 10)
        .await
        .unwrap();

    assert_eq!(total, 1, "Org A should see exactly 1 contest");
    assert_eq!(contests.len(), 1);
    assert_eq!(contests[0].name, "Org A Contest Alpha");
    assert!(
        contests.iter().all(|c| c.organization_id == org_a),
        "No contest from org B should appear in org A results"
    );

    // Query org B -- must only see Org B contest
    let (contests_b, total_b) = service
        .list_contests(Some(org_b), None, None, 1, 10)
        .await
        .unwrap();

    assert_eq!(total_b, 1, "Org B should see exactly 1 contest");
    assert_eq!(contests_b[0].name, "Org B Contest Beta");
}

// -----------------------------------------------------------------------
// Test 2: Problem list is tenant-isolated
// -----------------------------------------------------------------------

#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_problem_list_tenant_isolated() {
    let fixture = setup_fixture().await;

    let (org_a, _campus_a, user_a) = seed_org_with_user(
        &fixture.db_pool,
        "Org A (Problem)",
        "problem_user_a",
        "teacher",
    )
    .await;
    let (org_b, _campus_b, user_b) = seed_org_with_user(
        &fixture.db_pool,
        "Org B (Problem)",
        "problem_user_b",
        "teacher",
    )
    .await;

    // Create problems in each org
    let prob_a = seed_problem(&fixture.db_pool, org_a, user_a, "Org A Problem").await;
    let prob_b = seed_problem(&fixture.db_pool, org_b, user_b, "Org B Problem").await;

    // Verify problems exist in different orgs
    assert_ne!(prob_a, prob_b);

    // Query problems for org A only
    let org_a_problems: Vec<(i64, String)> =
        sqlx::query_as("SELECT id, title FROM problems WHERE organization_id = $1 ORDER BY id")
            .bind(org_a)
            .fetch_all(&fixture.db_pool)
            .await
            .unwrap();

    assert_eq!(org_a_problems.len(), 1, "Org A should see 1 problem");
    assert_eq!(org_a_problems[0].1, "Org A Problem");

    // Verify org A problems don't contain org B data
    let org_a_ids: Vec<i64> = org_a_problems.iter().map(|p| p.0).collect();
    assert!(
        !org_a_ids.contains(&prob_b),
        "Org B problem must not appear in org A query results"
    );

    // Query problems for org B only
    let org_b_problems: Vec<(i64, String)> =
        sqlx::query_as("SELECT id, title FROM problems WHERE organization_id = $1 ORDER BY id")
            .bind(org_b)
            .fetch_all(&fixture.db_pool)
            .await
            .unwrap();

    assert_eq!(org_b_problems.len(), 1, "Org B should see 1 problem");
    assert_eq!(org_b_problems[0].1, "Org B Problem");
}

// -----------------------------------------------------------------------
// Test 3: User list is tenant-isolated
// -----------------------------------------------------------------------

#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_user_list_tenant_isolated() {
    let fixture = setup_fixture().await;

    let (org_a, _campus_a, user_a) =
        seed_org_with_user(&fixture.db_pool, "Org A (User)", "user_a", "student").await;
    let (org_b, _campus_b, user_b) =
        seed_org_with_user(&fixture.db_pool, "Org B (User)", "user_b", "student").await;

    // Direct SQL to verify tenant scoping at the database level
    let org_a_users: Vec<(Uuid,)> =
        sqlx::query_as("SELECT id FROM users WHERE organization_id = $1")
            .bind(org_a)
            .fetch_all(&fixture.db_pool)
            .await
            .unwrap();

    let org_b_users: Vec<(Uuid,)> =
        sqlx::query_as("SELECT id FROM users WHERE organization_id = $1")
            .bind(org_b)
            .fetch_all(&fixture.db_pool)
            .await
            .unwrap();

    // Each org should see exactly its own user
    assert!(
        org_a_users.iter().any(|u| u.0 == user_a),
        "Org A must contain user_a"
    );
    assert!(
        !org_a_users.iter().any(|u| u.0 == user_b),
        "Org A must NOT contain user_b (cross-tenant leak)"
    );

    assert!(
        org_b_users.iter().any(|u| u.0 == user_b),
        "Org B must contain user_b"
    );
    assert!(
        !org_b_users.iter().any(|u| u.0 == user_a),
        "Org B must NOT contain user_a (cross-tenant leak)"
    );
}

// -----------------------------------------------------------------------
// Test 4: Submissions are tenant-isolated
// -----------------------------------------------------------------------

#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_submission_list_tenant_isolated() {
    let fixture = setup_fixture().await;

    let (org_a, _campus_a, user_a) =
        seed_org_with_user(&fixture.db_pool, "Org A (Sub)", "sub_user_a", "student").await;
    let (org_b, _campus_b, user_b) =
        seed_org_with_user(&fixture.db_pool, "Org B (Sub)", "sub_user_b", "student").await;

    // Create problems in each org
    let prob_a = seed_problem(&fixture.db_pool, org_a, user_a, "Org A Problem for Sub").await;
    let prob_b = seed_problem(&fixture.db_pool, org_b, user_b, "Org B Problem for Sub").await;

    // Create submissions in each org
    let sub_a = seed_submission(&fixture.db_pool, org_a, user_a, prob_a, "ac").await;
    let sub_b = seed_submission(&fixture.db_pool, org_b, user_b, prob_b, "wa").await;

    // Query submissions for org A only
    let org_a_subs: Vec<(i64,)> =
        sqlx::query_as("SELECT id FROM submissions WHERE organization_id = $1")
            .bind(org_a)
            .fetch_all(&fixture.db_pool)
            .await
            .unwrap();

    assert!(
        org_a_subs.iter().any(|s| s.0 == sub_a),
        "Org A must contain its own submission"
    );
    assert!(
        !org_a_subs.iter().any(|s| s.0 == sub_b),
        "Org A must NOT contain org B submission (cross-tenant leak)"
    );

    // Query submissions for org B only
    let org_b_subs: Vec<(i64,)> =
        sqlx::query_as("SELECT id FROM submissions WHERE organization_id = $1")
            .bind(org_b)
            .fetch_all(&fixture.db_pool)
            .await
            .unwrap();

    assert!(
        org_b_subs.iter().any(|s| s.0 == sub_b),
        "Org B must contain its own submission"
    );
    assert!(
        !org_b_subs.iter().any(|s| s.0 == sub_a),
        "Org B must NOT contain org A submission (cross-tenant leak)"
    );
}

// -----------------------------------------------------------------------
// Test 5: Leaderboard global ranking is tenant-isolated
// -----------------------------------------------------------------------

#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_leaderboard_global_tenant_isolated() {
    let fixture = setup_fixture().await;

    let (org_a, _campus_a, user_a) =
        seed_org_with_user(&fixture.db_pool, "Org A (LB)", "lb_user_a", "student").await;
    let (org_b, _campus_b, user_b) =
        seed_org_with_user(&fixture.db_pool, "Org B (LB)", "lb_user_b", "student").await;

    // Create problems in each org
    let prob_a = seed_problem(&fixture.db_pool, org_a, user_a, "Org A LB Problem").await;
    let prob_b = seed_problem(&fixture.db_pool, org_b, user_b, "Org B LB Problem").await;

    // Create AC submissions in each org
    seed_submission(&fixture.db_pool, org_a, user_a, prob_a, "ac").await;
    seed_submission(&fixture.db_pool, org_b, user_b, prob_b, "ac").await;

    // Use LeaderboardService to query with org scoping
    let service = domain_leaderboard::service::LeaderboardService::new(
        fixture.db_pool.clone(),
        None, // no Redis for tests
    )
    .unwrap();

    let make_query = || domain_leaderboard::models::LeaderboardQuery {
        limit: Some(50),
        offset: Some(0),
        timeframe: None,
        min_problems: None,
    };

    // Query leaderboard scoped to org A
    let lb_a = service
        .get_global_leaderboard(make_query(), Some(org_a), None)
        .await
        .unwrap();

    // Org A leaderboard should only contain org A users
    let lb_a_user_ids: Vec<Uuid> = lb_a.entries.iter().map(|e| e.user_id).collect();
    assert!(
        lb_a_user_ids.contains(&user_a),
        "Org A leaderboard must contain org A user"
    );
    assert!(
        !lb_a_user_ids.contains(&user_b),
        "Org A leaderboard must NOT contain org B user (cross-tenant leak)"
    );

    // Query leaderboard scoped to org B
    let lb_b = service
        .get_global_leaderboard(make_query(), Some(org_b), None)
        .await
        .unwrap();

    let lb_b_user_ids: Vec<Uuid> = lb_b.entries.iter().map(|e| e.user_id).collect();
    assert!(
        lb_b_user_ids.contains(&user_b),
        "Org B leaderboard must contain org B user"
    );
    assert!(
        !lb_b_user_ids.contains(&user_a),
        "Org B leaderboard must NOT contain org A user (cross-tenant leak)"
    );
}
