//! Integration tests for domain-contests
//!
//! Tests run against real PostgreSQL + Redis via testcontainers.
//! Requires Docker to be running.

use api_infra::testkit::TestFixture;
use chrono::{DateTime, Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

async fn setup_fixture() -> TestFixture {
    let fixture = TestFixture::new().await;
    let migrator = sqlx::migrate!("../api/migrations");
    migrator.run(&fixture.db_pool).await.expect("Failed to run migrations");
    fixture
}

/// Seed the minimum dependency chain: organization -> campus -> user
/// Returns (org_id, campus_id, user_id)
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
        r#"INSERT INTO users (email, password_hash, organization_id)
        VALUES ('test@contests.com', 'hash', $1)
        RETURNING id"#,
    )
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap();

    // Assign default role
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

/// Seed a problem for contest testing. Returns problem_id.
async fn seed_problem(pool: &PgPool, org_id: i64, author_id: Uuid) -> i64 {
    sqlx::query_scalar(
        r#"INSERT INTO problems (organization_id, author_id, title, description, difficulty, visibility, time_limit_ms, memory_limit_kb)
        VALUES ($1, $2, 'Test Problem', 'A problem', 'easy', 'public', 1000, 256000)
        RETURNING id"#,
    )
    .bind(org_id)
    .bind(author_id)
    .fetch_one(pool)
    .await
    .unwrap()
}

fn make_create_request(
    org_id: i64,
    campus_id: Option<i64>,
    name: &str,
    start: DateTime<Utc>,
    end: DateTime<Utc>,
) -> domain_contests::models::CreateContestRequest {
    domain_contests::models::CreateContestRequest {
        organization_id: org_id,
        campus_id,
        name: name.to_string(),
        description: Some("Integration test contest".to_string()),
        rules: Some("acm".to_string()),
        start_time: start,
        end_time: end,
        freeze_minutes: None,
    }
}

#[tokio::test]
async fn test_create_and_get_contest() {
    let fixture = setup_fixture().await;
    let (org_id, campus_id, _user_id) = seed_org_and_user(&fixture.db_pool).await;

    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());

    let now = Utc::now();
    let start = now + Duration::hours(1);
    let end = now + Duration::hours(3);

    let req = make_create_request(org_id, Some(campus_id), "Test Contest", start, end);
    let contest = service.create_contest(req).await.unwrap();

    assert_eq!(contest.name, "Test Contest");
    assert_eq!(contest.organization_id, org_id);
    assert_eq!(contest.campus_id, Some(campus_id));
    assert_eq!(contest.rules, "acm");

    // Get detail -- should have 0 problems and 0 participants
    let detail = service.get_contest(contest.id).await.unwrap();
    assert_eq!(detail.id, contest.id);
    assert_eq!(detail.problem_count, 0);
    assert_eq!(detail.participant_count, 0);
    assert_eq!(detail.name, "Test Contest");
}

#[tokio::test]
async fn test_list_contests_by_organization() {
    let fixture = setup_fixture().await;
    let (org1_id, _c1, _u1) = seed_org_and_user(&fixture.db_pool).await;

    // Create second org
    let org2_id: i64 = sqlx::query_scalar(
        "INSERT INTO organizations (name) VALUES ('Test Org 2') RETURNING id",
    )
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());

    let now = Utc::now();
    let start = now + Duration::hours(1);
    let end = now + Duration::hours(3);

    // Create contests in both orgs
    let _c1 = service
        .create_contest(make_create_request(org1_id, None, "Org1 Contest", start, end))
        .await
        .unwrap();
    let _c2 = service
        .create_contest(make_create_request(org2_id, None, "Org2 Contest", start, end))
        .await
        .unwrap();

    // Query org1 -- should only see org1's contest
    let (contests, total) = service
        .list_contests(Some(org1_id), None, None, 1, 10)
        .await
        .unwrap();
    assert_eq!(total, 1);
    assert_eq!(contests.len(), 1);
    assert_eq!(contests[0].name, "Org1 Contest");

    // Query org2 -- should only see org2's contest
    let (contests, total) = service
        .list_contests(Some(org2_id), None, None, 1, 10)
        .await
        .unwrap();
    assert_eq!(total, 1);
    assert_eq!(contests[0].name, "Org2 Contest");
}

#[tokio::test]
async fn test_register_for_contest() {
    let fixture = setup_fixture().await;
    let (org_id, _campus_id, user_id) = seed_org_and_user(&fixture.db_pool).await;

    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());

    let now = Utc::now();
    let start = now + Duration::hours(1);
    let end = now + Duration::hours(3);

    let contest = service
        .create_contest(make_create_request(org_id, None, "Register Test", start, end))
        .await
        .unwrap();

    // Register user
    let participant = service
        .register_for_contest(contest.id, user_id)
        .await
        .unwrap();
    assert_eq!(participant.contest_id, contest.id);
    assert_eq!(participant.user_id, user_id);

    // Duplicate registration should fail
    let result = service.register_for_contest(contest.id, user_id).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_contest_status_transitions() {
    let fixture = setup_fixture().await;
    let (org_id, _campus_id, _user_id) = seed_org_and_user(&fixture.db_pool).await;

    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());

    let now = Utc::now();

    // Active contest: started in the past, ends in the future
    let active_contest = service
        .create_contest(make_create_request(
            org_id,
            None,
            "Active Contest",
            now - Duration::hours(1),
            now + Duration::hours(2),
        ))
        .await
        .unwrap();

    let status = service
        .get_contest_status(active_contest.id)
        .await
        .unwrap();
    assert_eq!(status.status, "active");
    assert!(!status.is_frozen);

    // Upcoming contest: starts in the future
    let upcoming_contest = service
        .create_contest(make_create_request(
            org_id,
            None,
            "Upcoming Contest",
            now + Duration::hours(1),
            now + Duration::hours(3),
        ))
        .await
        .unwrap();

    let status = service
        .get_contest_status(upcoming_contest.id)
        .await
        .unwrap();
    assert_eq!(status.status, "upcoming");

    // Ended contest: ended in the past
    let ended_contest = service
        .create_contest(make_create_request(
            org_id,
            None,
            "Ended Contest",
            now - Duration::hours(3),
            now - Duration::hours(1),
        ))
        .await
        .unwrap();

    let status = service
        .get_contest_status(ended_contest.id)
        .await
        .unwrap();
    assert_eq!(status.status, "ended");
}
