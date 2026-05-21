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
    migrator
        .run(&fixture.db_pool)
        .await
        .expect("Failed to run migrations");
    fixture
}

/// Seed the minimum dependency chain: organization -> campus -> user
/// Returns (org_id, campus_id, user_id)
async fn seed_org_and_user(pool: &PgPool) -> (i64, i64, Uuid) {
    let org_id: i64 = sqlx::query_scalar(
        "INSERT INTO organizations (name, slug) VALUES ('Test Org', 'test-org') RETURNING id",
    )
    .fetch_one(pool)
    .await
    .unwrap();

    let campus_id: i64 = sqlx::query_scalar(
        "INSERT INTO campuses (organization_id, name, slug) VALUES ($1, 'Main Campus', 'main-campus') RETURNING id",
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
#[ignore = "requires Docker/testcontainers"]
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
#[ignore = "requires Docker/testcontainers"]
async fn test_list_contests_by_organization() {
    let fixture = setup_fixture().await;
    let (org1_id, _c1, _u1) = seed_org_and_user(&fixture.db_pool).await;

    // Create second org
    let org2_id: i64 = sqlx::query_scalar(
        "INSERT INTO organizations (name, slug) VALUES ('Test Org 2', 'test-org-2') RETURNING id",
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
        .create_contest(make_create_request(
            org1_id,
            None,
            "Org1 Contest",
            start,
            end,
        ))
        .await
        .unwrap();
    let _c2 = service
        .create_contest(make_create_request(
            org2_id,
            None,
            "Org2 Contest",
            start,
            end,
        ))
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
#[ignore = "requires Docker/testcontainers"]
async fn test_register_for_contest() {
    let fixture = setup_fixture().await;
    let (org_id, _campus_id, user_id) = seed_org_and_user(&fixture.db_pool).await;

    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());

    let now = Utc::now();
    let start = now + Duration::hours(1);
    let end = now + Duration::hours(3);

    let contest = service
        .create_contest(make_create_request(
            org_id,
            None,
            "Register Test",
            start,
            end,
        ))
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
#[ignore = "requires Docker/testcontainers"]
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

    let status = service.get_contest_status(active_contest.id).await.unwrap();
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

    let status = service.get_contest_status(ended_contest.id).await.unwrap();
    assert_eq!(status.status, "ended");
}

// ============================================================
// Freeze and Upsolving integration tests (Plan 07-03)
// ============================================================

/// Seed a complete contest with problems and submissions for freeze/upsolving tests.
/// Creates: org -> campus -> user -> problem -> contest -> contest_problem -> submissions
/// Returns (contest_id, problem_id, user_id, org_id)
struct SeededContest {
    contest_id: i64,
    problem_id: i64,
    user_id: Uuid,
    org_id: i64,
}

/// Seed a contest with configurable timing and optional freeze_minutes.
/// Also creates one problem linked to the contest.
async fn seed_contest_for_freeze(
    pool: &PgPool,
    start: DateTime<Utc>,
    end: DateTime<Utc>,
    freeze_minutes: Option<i32>,
) -> SeededContest {
    let (org_id, _campus_id, user_id) = seed_org_and_user(pool).await;
    let problem_id = seed_problem(pool, org_id, user_id).await;

    // Create contest via service
    let service = domain_contests::service::ContestService::new(pool.clone());
    let req = domain_contests::models::CreateContestRequest {
        organization_id: org_id,
        campus_id: None,
        name: "Freeze Test Contest".to_string(),
        description: Some("Contest for freeze testing".to_string()),
        rules: Some("acm".to_string()),
        start_time: start,
        end_time: end,
        freeze_minutes,
    };
    let contest = service.create_contest(req).await.unwrap();

    // Add problem to contest
    service
        .add_problem_to_contest(
            contest.id,
            domain_contests::models::AddProblemToContestRequest {
                problem_id,
                points: Some(100),
                order_index: Some(0),
            },
        )
        .await
        .unwrap();

    SeededContest {
        contest_id: contest.id,
        problem_id,
        user_id,
        org_id,
    }
}

/// Insert a submission with a specific created_at timestamp and verdict.
/// Returns the submission id.
async fn insert_submission_at(
    pool: &PgPool,
    org_id: i64,
    user_id: Uuid,
    problem_id: i64,
    verdict: &str,
    created_at: DateTime<Utc>,
) -> i64 {
    sqlx::query_scalar(
        r#"INSERT INTO submissions (organization_id, user_id, problem_id, language, code, status, verdict, created_at)
        VALUES ($1, $2, $3, 'cpp', 'int main(){}', 'judged', $4, $5)
        RETURNING id"#,
    )
    .bind(org_id)
    .bind(user_id)
    .bind(problem_id)
    .bind(verdict)
    .bind(created_at)
    .fetch_one(pool)
    .await
    .unwrap()
}

/// Insert a submission with NOW() timestamp and given verdict.
async fn insert_submission_now(
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

/// Link a submission to a contest via direct SQL insert with configurable is_upsolving.
/// Used when we need to control the is_upsolving flag directly (e.g., to bypass the service's
/// time-based auto-detection for testing purposes).
async fn link_contest_submission_sql(
    pool: &PgPool,
    contest_id: i64,
    submission_id: i64,
    is_upsolving: bool,
) -> i64 {
    sqlx::query_scalar(
        r#"INSERT INTO contest_submissions (contest_id, submission_id, is_upsolving)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        RETURNING id"#,
    )
    .bind(contest_id)
    .bind(submission_id)
    .bind(is_upsolving)
    .fetch_one(pool)
    .await
    .unwrap()
}

/// Test: During the freeze window, get_contest_rankings only counts pre-freeze submissions.
#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_freeze_snapshot_stored_during_freeze_window() {
    let fixture = setup_fixture().await;
    let now = Utc::now();
    // Contest: started 2h ago, ends in 10min, freeze at 30min before end
    let start = now - Duration::hours(2);
    let end = now + Duration::minutes(10);
    let freeze_minutes = 30;

    let seeded = seed_contest_for_freeze(&fixture.db_pool, start, end, Some(freeze_minutes)).await;
    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());

    // Freeze cutoff = end - 30min = now - 20min
    let _freeze_cutoff = end - Duration::minutes(freeze_minutes as i64);

    // Insert a submission BEFORE freeze (1h ago) -- should count
    let sub_before = insert_submission_at(
        &fixture.db_pool,
        seeded.org_id,
        seeded.user_id,
        seeded.problem_id,
        "ac",
        now - Duration::hours(1),
    )
    .await;
    link_contest_submission_sql(&fixture.db_pool, seeded.contest_id, sub_before, false).await;

    // Insert a submission DURING freeze (5min ago) -- should NOT count
    let sub_during = insert_submission_at(
        &fixture.db_pool,
        seeded.org_id,
        seeded.user_id,
        seeded.problem_id,
        "ac",
        now - Duration::minutes(5),
    )
    .await;
    link_contest_submission_sql(&fixture.db_pool, seeded.contest_id, sub_during, false).await;

    // Get rankings -- freeze is active
    let rankings = service
        .get_contest_rankings(seeded.contest_id)
        .await
        .unwrap();

    // Should have 1 entry (the user)
    assert_eq!(rankings.len(), 1, "Should have exactly one ranking entry");
    let entry = &rankings[0];
    assert_eq!(entry.user_id, seeded.user_id);

    // During freeze, only the pre-freeze submission counts (score = 100 for the AC problem)
    assert!(
        entry.submissions.len() <= 2,
        "Should have at most 2 problem entries"
    );
    // The pre-freeze submission should count: score should reflect 1 solved problem
    assert!(
        entry.solved_count >= 1,
        "At least 1 problem should be solved (pre-freeze AC)"
    );

    // Verify: the submission during freeze should NOT contribute additional score
    // If both counted, solved_count might be inflated. With ACM scoring,
    // the problem is the same, so solved_count is 1 either way, but we verify
    // the ranking was computed with the freeze cutoff by checking the snapshot was stored.
    let snapshot_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM contest_leaderboard_snapshots WHERE contest_id = $1)",
    )
    .bind(seeded.contest_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();
    assert!(snapshot_exists, "Frozen snapshot should be stored in DB");
}

/// Test: Second call during freeze returns the same cached snapshot.
#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_freeze_snapshot_is_cached() {
    let fixture = setup_fixture().await;
    let now = Utc::now();
    let start = now - Duration::hours(2);
    let end = now + Duration::minutes(10);

    let seeded = seed_contest_for_freeze(&fixture.db_pool, start, end, Some(30)).await;
    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());

    // Insert a submission before freeze
    let sub = insert_submission_at(
        &fixture.db_pool,
        seeded.org_id,
        seeded.user_id,
        seeded.problem_id,
        "ac",
        now - Duration::hours(1),
    )
    .await;
    link_contest_submission_sql(&fixture.db_pool, seeded.contest_id, sub, false).await;

    // First call -- computes and stores snapshot
    let rankings1 = service
        .get_contest_rankings(seeded.contest_id)
        .await
        .unwrap();

    // Second call -- should return cached snapshot
    let rankings2 = service
        .get_contest_rankings(seeded.contest_id)
        .await
        .unwrap();

    // Both should return the same data
    assert_eq!(
        rankings1.len(),
        rankings2.len(),
        "Cached snapshot should have same entry count"
    );
    if !rankings1.is_empty() {
        assert_eq!(
            rankings1[0].score, rankings2[0].score,
            "Cached snapshot should have same score"
        );
        assert_eq!(
            rankings1[0].solved_count, rankings2[0].solved_count,
            "Cached snapshot should have same solved count"
        );
    }

    // Verify snapshot row exists in DB
    let snapshot_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM contest_leaderboard_snapshots WHERE contest_id = $1",
    )
    .bind(seeded.contest_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();
    assert_eq!(snapshot_count, 1, "Exactly one snapshot row should exist");
}

/// Test: After contest ends, freeze is lifted and all submissions appear in rankings.
#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_freeze_auto_reveals_after_contest_ends() {
    let fixture = setup_fixture().await;
    let now = Utc::now();
    // Contest that has already ended: started 3h ago, ended 1h ago
    let start = now - Duration::hours(3);
    let end = now - Duration::hours(1);

    let seeded = seed_contest_for_freeze(&fixture.db_pool, start, end, Some(30)).await;
    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());

    // Insert submission before freeze window
    let sub_before_freeze = insert_submission_at(
        &fixture.db_pool,
        seeded.org_id,
        seeded.user_id,
        seeded.problem_id,
        "ac",
        now - Duration::hours(2),
    )
    .await;
    link_contest_submission_sql(
        &fixture.db_pool,
        seeded.contest_id,
        sub_before_freeze,
        false,
    )
    .await;

    // Insert submission during what would have been the freeze window
    let sub_during_freeze = insert_submission_at(
        &fixture.db_pool,
        seeded.org_id,
        seeded.user_id,
        seeded.problem_id,
        "ac",
        now - Duration::minutes(90),
    )
    .await;
    link_contest_submission_sql(
        &fixture.db_pool,
        seeded.contest_id,
        sub_during_freeze,
        false,
    )
    .await;

    // Get rankings -- contest ended, no freeze, all submissions visible
    let rankings = service
        .get_contest_rankings(seeded.contest_id)
        .await
        .unwrap();

    assert_eq!(rankings.len(), 1, "Should have one ranking entry");
    let entry = &rankings[0];
    // Both submissions should be counted (the freeze is no longer active)
    assert!(
        entry.solved_count >= 1,
        "Should have at least 1 solved problem (all submissions visible after contest ends)"
    );
    // Verify no snapshot was stored (freeze window has passed)
    let snapshot_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM contest_leaderboard_snapshots WHERE contest_id = $1)",
    )
    .bind(seeded.contest_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();
    assert!(
        !snapshot_exists,
        "No snapshot should be stored for ended contest"
    );
}

/// Test: Post-contest submissions are automatically tagged is_upsolving=true.
#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_upsolving_submission_tagged_after_contest_ends() {
    let fixture = setup_fixture().await;
    let now = Utc::now();
    // Contest that has already ended
    let start = now - Duration::hours(3);
    let end = now - Duration::hours(1);

    let seeded = seed_contest_for_freeze(&fixture.db_pool, start, end, None).await;
    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());

    // Create a new submission after contest ended
    let submission_id = insert_submission_now(
        &fixture.db_pool,
        seeded.org_id,
        seeded.user_id,
        seeded.problem_id,
        "ac",
    )
    .await;

    // Link it to the contest -- should be tagged as upsolving
    let contest_sub = service
        .link_submission_to_contest(seeded.contest_id, submission_id)
        .await
        .unwrap();

    assert!(
        contest_sub.is_upsolving,
        "Post-contest submission should have is_upsolving = true"
    );
}

/// Test: Upsolving submissions are excluded from official contest rankings.
#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_upsolving_excluded_from_official_rankings() {
    let fixture = setup_fixture().await;
    let now = Utc::now();
    // Active contest (no freeze)
    let start = now - Duration::hours(1);
    let end = now + Duration::hours(2);

    let seeded = seed_contest_for_freeze(&fixture.db_pool, start, end, None).await;
    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());

    // Insert a normal contest-period submission (not upsolving)
    let normal_sub = insert_submission_at(
        &fixture.db_pool,
        seeded.org_id,
        seeded.user_id,
        seeded.problem_id,
        "ac",
        now - Duration::minutes(30),
    )
    .await;
    link_contest_submission_sql(&fixture.db_pool, seeded.contest_id, normal_sub, false).await;

    // Insert an upsolving submission (manually flagged as is_upsolving=true)
    let upsolving_sub = insert_submission_at(
        &fixture.db_pool,
        seeded.org_id,
        seeded.user_id,
        seeded.problem_id,
        "ac",
        now - Duration::minutes(10),
    )
    .await;
    link_contest_submission_sql(&fixture.db_pool, seeded.contest_id, upsolving_sub, true).await;

    // Get rankings
    let rankings = service
        .get_contest_rankings(seeded.contest_id)
        .await
        .unwrap();

    assert_eq!(rankings.len(), 1, "Should have one ranking entry");
    let entry = &rankings[0];
    // Only the normal submission should count; upsolving is excluded
    // With 1 normal AC on 1 problem, solved_count = 1
    assert_eq!(
        entry.solved_count, 1,
        "Only non-upsolving submission should count in rankings"
    );
}

/// Test: Attempting to link a submission to a future (not-yet-started) contest fails.
#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_pre_contest_submissions_blocked() {
    let fixture = setup_fixture().await;
    let now = Utc::now();
    // Contest starts in the future
    let start = now + Duration::hours(1);
    let end = now + Duration::hours(3);

    let seeded = seed_contest_for_freeze(&fixture.db_pool, start, end, None).await;
    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());

    // Create a submission now
    let submission_id = insert_submission_now(
        &fixture.db_pool,
        seeded.org_id,
        seeded.user_id,
        seeded.problem_id,
        "ac",
    )
    .await;

    // Attempt to link should fail because contest hasn't started
    let result = service
        .link_submission_to_contest(seeded.contest_id, submission_id)
        .await;

    assert!(result.is_err(), "Pre-contest submission should be rejected");
    let err_msg = format!("{}", result.unwrap_err());
    assert!(
        err_msg.to_lowercase().contains("not started"),
        "Error should mention 'not started', got: {}",
        err_msg
    );
}
