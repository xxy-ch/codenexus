//! Integration tests for domain-submissions
//!
//! Tests submission CRUD and status transitions against real PostgreSQL via testcontainers.
//! Uses SubmissionService::new(pool) which creates a service without Redis (no queue publishing).

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

/// Seed organization, campus, user, and problem.
/// Returns (org_id, campus_id, user_id, problem_id).
async fn seed_full_chain(pool: &PgPool) -> (i64, i64, Uuid, i64) {
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
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('test@subs.com', 'hash', $1) RETURNING id",
    )
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

    (org_id, campus_id, user_id, problem_id)
}

/// Insert a submission directly into the DB (bypassing service to avoid Redis).
async fn insert_submission(
    pool: &PgPool,
    org_id: i64,
    user_id: Uuid,
    problem_id: i64,
    language: &str,
    status: &str,
) -> i64 {
    sqlx::query_scalar(
        r#"INSERT INTO submissions (organization_id, user_id, problem_id, language, code, status)
        VALUES ($1, $2, $3, $4, 'print("hello")', $5)
        RETURNING id"#,
    )
    .bind(org_id)
    .bind(user_id)
    .bind(problem_id)
    .bind(language)
    .bind(status)
    .fetch_one(pool)
    .await
    .unwrap()
}

#[tokio::test]
async fn test_create_and_get_submission() {
    let fixture = setup_fixture().await;
    let (org_id, _campus_id, user_id, problem_id) = seed_full_chain(&fixture.db_pool).await;

    let service = domain_submissions::service::SubmissionService::new(fixture.db_pool.clone());

    // Note: create_submission checks language_enabled via judge_language_settings.
    // We seed the default settings row so python3 is always enabled.
    sqlx::query("INSERT INTO judge_language_settings (id) VALUES (TRUE) ON CONFLICT DO NOTHING")
        .execute(&fixture.db_pool)
        .await
        .unwrap();

    let req = domain_submissions::models::CreateSubmissionRequest {
        problem_id,
        code: r#"print("hello world")"#.to_string(),
        language: "python3".to_string(),
        contest_id: None,
    };

    let submission = service
        .create_submission(user_id, org_id, req)
        .await
        .unwrap();

    assert_eq!(submission.problem_id, problem_id);
    assert_eq!(submission.language, "python3");
    assert_eq!(submission.status, "queued");
    assert_eq!(submission.code, r#"print("hello world")"#);
}

#[tokio::test]
async fn test_list_submissions_by_user() {
    let fixture = setup_fixture().await;
    let (org_id, _campus_id, user1_id, problem_id) = seed_full_chain(&fixture.db_pool).await;

    // Create second user in same org
    let user2_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('user2@subs.com', 'hash', $1) RETURNING id",
    )
    .bind(org_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    // Insert submissions for both users
    insert_submission(
        &fixture.db_pool,
        org_id,
        user1_id,
        problem_id,
        "python3",
        "queued",
    )
    .await;
    insert_submission(
        &fixture.db_pool,
        org_id,
        user1_id,
        problem_id,
        "python3",
        "judged",
    )
    .await;
    insert_submission(
        &fixture.db_pool,
        org_id,
        user2_id,
        problem_id,
        "python3",
        "queued",
    )
    .await;

    let service = domain_submissions::service::SubmissionService::new(fixture.db_pool.clone());

    // User1 should see 2 submissions
    let (subs, total) = service
        .list_submissions(user1_id, None, None, None, 10, 0)
        .await
        .unwrap();
    assert_eq!(total, 2);
    assert_eq!(subs.len(), 2);

    // User2 should see 1 submission
    let (subs, total) = service
        .list_submissions(user2_id, None, None, None, 10, 0)
        .await
        .unwrap();
    assert_eq!(total, 1);
    assert_eq!(subs.len(), 1);
}

#[tokio::test]
async fn test_submission_status_update() {
    let fixture = setup_fixture().await;
    let (org_id, _campus_id, user_id, problem_id) = seed_full_chain(&fixture.db_pool).await;

    let sub_id = insert_submission(
        &fixture.db_pool,
        org_id,
        user_id,
        problem_id,
        "python3",
        "queued",
    )
    .await;

    let service = domain_submissions::service::SubmissionService::new(fixture.db_pool.clone());

    // Update to accepted
    service
        .update_judge_result(sub_id, "accepted", Some(100), Some(50), Some(1024))
        .await
        .unwrap();

    // Verify status changed
    let status = service.get_submission_status(sub_id).await.unwrap();
    // The service maps "accepted" to status "judged" and verdict "ac"
    assert_eq!(status.as_deref(), Some("judged"));

    // Check verdict column directly
    let verdict: Option<String> =
        sqlx::query_scalar("SELECT verdict FROM submissions WHERE id = $1")
            .bind(sub_id)
            .fetch_one(&fixture.db_pool)
            .await
            .unwrap();
    assert_eq!(verdict.as_deref(), Some("ac"));

    // Verify score was persisted (regression: score was silently dropped before fix)
    let stored_score: Option<i32> =
        sqlx::query_scalar("SELECT score FROM submissions WHERE id = $1")
            .bind(sub_id)
            .fetch_one(&fixture.db_pool)
            .await
            .unwrap();
    assert_eq!(stored_score, Some(100), "Score must be persisted from judge result");
}

// --- Regression tests for compile_error terminal status (typo was "compilation_error") ---

use domain_submissions::service::SubmissionService;

#[test]
fn test_compile_error_is_terminal_status() {
    assert!(
        SubmissionService::is_terminal_status("compile_error"),
        "compile_error must be recognized as terminal"
    );
}

#[test]
fn test_compile_error_normalizes_to_judged() {
    assert_eq!(
        SubmissionService::normalize_judge_status("compile_error"),
        "judged",
        "compile_error must normalize to 'judged' (same as other verdicts)"
    );
}

#[test]
fn test_all_verdict_statuses_are_terminal() {
    // Every status that normalize_judge_status maps to "judged" must also be terminal
    for status in &[
        "accepted",
        "wrong_answer",
        "runtime_error",
        "time_limit_exceeded",
        "memory_limit_exceeded",
        "compile_error",
    ] {
        assert!(
            SubmissionService::is_terminal_status(status),
            "{} should be terminal (it normalizes to 'judged')",
            status
        );
        assert_eq!(
            SubmissionService::normalize_judge_status(status),
            "judged",
            "{} should normalize to 'judged'",
            status
        );
    }
}
