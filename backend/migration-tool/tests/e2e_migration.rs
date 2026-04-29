//! End-to-end migration tests against real PostgreSQL.
//!
//! These tests require a running PostgreSQL instance with the AlgoMaster schema.
//! The tests use testcontainers (via api-infra::testkit) to spin up ephemeral
//! PostgreSQL instances, so Docker must be running.
//!
//! Run with:
//!   cargo test -p migration-tool --test e2e_migration
//!
//! Or, if using a manually-managed PostgreSQL:
//!   DATABASE_URL=postgres://... cargo test -p migration-tool --test e2e_migration

use anyhow::Result;
use sqlx::PgPool;
use uuid::Uuid;

use migration_tool::migrator::Migrator;
use migration_tool::parser;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Build a realistic UOJ dump with 2 users, 1 problem, 1 submission, 1 contest,
/// 1 blog, 1 blog comment, 1 click_zan, and 1 direct message.
fn realistic_dump_sql() -> &'static str {
    r#"
-- MySQL dump 10.13  Distrib 5.7.26

LOCK TABLES `user_info` WRITE;
INSERT INTO `user_info` VALUES ('U','alice','alice@example.com','5f4dcc3b5aa765d61d8327deb882cf99','','1500','0','U','0','2024-01-01 00:00:00','127.0.0.1','','','Hello World'),('U','bob','bob@example.com','7c6a180b36896a0a8c02787eeafb0e4c','','1500','0','U','5','2024-01-02 10:30:00','192.168.1.1','','',''),('B','banned_user','banned@test.com','hash123','','1500','0','U','0','2019-03-20 08:00:00','','','','');
UNLOCK TABLES;

LOCK TABLES `problems` WRITE;
INSERT INTO `problems` VALUES (1,'Hello World','0','FILE','0','{"view_content_type":"ALL","time_limit":1000,"memory_limit":256}','0','10','50');
UNLOCK TABLES;

LOCK TABLES `problems_contents` WRITE;
INSERT INTO `problems_contents` VALUES (1,'<p>Print Hello World</p>','## Hello World\n\nPrint `Hello World` to stdout.');
UNLOCK TABLES;

LOCK TABLES `submissions` WRITE;
INSERT INTO `submissions` VALUES (1,1,'NULL','2024-01-01 12:00:00','alice','#include <iostream>','C++','256','2024-01-01 12:00:05',0x4163636570746564,'Judged','','100','10','256','0','');
UNLOCK TABLES;

LOCK TABLES `contests` WRITE;
INSERT INTO `contests` VALUES (1,'Test Contest','2024-06-01 10:00:00','180','10','ended','{}','0');
UNLOCK TABLES;

LOCK TABLES `contests_problems` WRITE;
INSERT INTO `contests_problems` VALUES (1,1);
UNLOCK TABLES;

LOCK TABLES `contests_registrants` WRITE;
INSERT INTO `contests_registrants` VALUES ('alice','1500','1','1','1');
UNLOCK TABLES;

LOCK TABLES `blogs` WRITE;
INSERT INTO `blogs` VALUES (1,'My First Blog','<p>Hello</p>','2024-02-01 08:00:00','alice','# Hello World','5','0','B','0');
UNLOCK TABLES;

LOCK TABLES `blogs_comments` WRITE;
INSERT INTO `blogs_comments` VALUES (1,'1','Nice post!','2024-02-02 09:00:00','bob','1','0');
UNLOCK TABLES;

LOCK TABLES `blogs_tags` WRITE;
INSERT INTO `blogs_tags` VALUES (1,'1','tutorial');
UNLOCK TABLES;

LOCK TABLES `click_zans` WRITE;
INSERT INTO `click_zans` VALUES ('B','alice','1','1');
INSERT INTO `click_zans` VALUES ('P','bob','1','1');
UNLOCK TABLES;

LOCK TABLES `user_msg` WRITE;
INSERT INTO `user_msg` VALUES (1,'alice','bob','Hello Bob!','2024-03-01 10:00:00','2024-03-01 11:00:00');
INSERT INTO `user_msg` VALUES (2,'bob','alice','Hi Alice!','2024-03-01 10:05:00','NULL');
UNLOCK TABLES;

LOCK TABLES `best_ac_submissions` WRITE;
INSERT INTO `best_ac_submissions` VALUES (1,'alice',1,'10','256','256',1,'10','256','256');
UNLOCK TABLES;
"#
}

/// Run all API migrations against the pool, creating the full AlgoMaster schema.
async fn run_schema_migrations(pool: &PgPool) {
    sqlx::migrate!("../api/migrations")
        .run(pool)
        .await
        .expect("Failed to run API schema migrations");
}

/// Create a default organization and campus. Returns (org_id, campus_id).
async fn create_default_org(pool: &PgPool) -> (i64, i64) {
    let org_id: i64 = sqlx::query_scalar(
        "INSERT INTO organizations (name, slug) VALUES ('Test Migration Org', 'test-migration-org') RETURNING id",
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

    (org_id, campus_id)
}

/// Drop all data created by migration tests. Uses the migration_mappings table
/// to identify migrated entities, then cleans up in reverse dependency order.
async fn cleanup_migration_data(pool: &PgPool) {
    // Drop in reverse dependency order to avoid FK violations.
    // Use unconditional DELETE for robustness even if mappings are missing.
    let cleanup_sql = vec![
        "DELETE FROM likes WHERE user_id IN (SELECT new_id::uuid FROM migration_mappings WHERE entity_type = 'user')",
        "DELETE FROM article_comments WHERE author_id IN (SELECT new_id::uuid FROM migration_mappings WHERE entity_type = 'user')",
        "DELETE FROM articles WHERE author_id IN (SELECT new_id::uuid FROM migration_mappings WHERE entity_type = 'user')",
        "DELETE FROM direct_messages WHERE conversation_id IN (SELECT id FROM direct_conversations WHERE user1_id IN (SELECT new_id::uuid FROM migration_mappings WHERE entity_type = 'user') OR user2_id IN (SELECT new_id::uuid FROM migration_mappings WHERE entity_type = 'user'))",
        "DELETE FROM direct_conversations WHERE user1_id IN (SELECT new_id::uuid FROM migration_mappings WHERE entity_type = 'user') OR user2_id IN (SELECT new_id::uuid FROM migration_mappings WHERE entity_type = 'user')",
        "DELETE FROM contest_submissions WHERE submission_id IN (SELECT new_id::bigint FROM migration_mappings WHERE entity_type = 'submission')",
        "DELETE FROM contest_participants WHERE contest_id IN (SELECT new_id::bigint FROM migration_mappings WHERE entity_type = 'contest')",
        "DELETE FROM contest_problems WHERE contest_id IN (SELECT new_id::bigint FROM migration_mappings WHERE entity_type = 'contest')",
        "DELETE FROM submissions WHERE id IN (SELECT new_id::bigint FROM migration_mappings WHERE entity_type = 'submission')",
        "DELETE FROM contests WHERE id IN (SELECT new_id::bigint FROM migration_mappings WHERE entity_type = 'contest')",
        "DELETE FROM test_cases WHERE problem_id IN (SELECT new_id::bigint FROM migration_mappings WHERE entity_type = 'problem')",
        "DELETE FROM problems WHERE id IN (SELECT new_id::bigint FROM migration_mappings WHERE entity_type = 'problem')",
        "DELETE FROM user_roles WHERE user_id IN (SELECT new_id::uuid FROM migration_mappings WHERE entity_type = 'user')",
        "DELETE FROM users WHERE id IN (SELECT new_id::uuid FROM migration_mappings WHERE entity_type = 'user')",
        "DELETE FROM migration_mappings",
        "DELETE FROM campuses WHERE organization_id IN (SELECT id FROM organizations WHERE slug = 'test-migration-org')",
        "DELETE FROM organizations WHERE slug = 'test-migration-org'",
    ];

    for sql in cleanup_sql {
        // Use ignore since some tables may not have matching rows
        let _ = sqlx::query(sql).execute(pool).await;
    }
}

/// Parse the realistic dump and run the full migration pipeline.
/// Returns the pool, org_id, and campus_id for assertions.
async fn run_full_migration(pool: &PgPool) -> Result<(i64, Option<i64>)> {
    let (org_id, campus_id) = create_default_org(pool).await;

    let dump = parser::parse_dump(realistic_dump_sql());
    assert!(!dump.tables.is_empty(), "Parsed dump must contain tables");

    let mut migrator = Migrator::new(
        pool.clone(),
        dump,
        org_id,
        Some(campus_id),
        None, // no test_case_dir for e2e tests
    )
    .await?;

    migrator.run().await?;

    Ok((org_id, Some(campus_id)))
}

// ---------------------------------------------------------------------------
// Test 1: Full E2E migration
// ---------------------------------------------------------------------------

#[tokio::test]
#[ignore = "requires Docker -- run with `cargo test -p migration-tool --test e2e_migration -- --ignored`"]
async fn test_full_e2e_migration() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://localhost/migration_test".to_string());

    let pool = PgPool::connect(&database_url)
        .await
        .expect("Need PostgreSQL. Set DATABASE_URL or start a local instance.");

    // Setup: run schema migrations
    run_schema_migrations(&pool).await;

    // Cleanup any prior test data
    cleanup_migration_data(&pool).await;

    // Run the full migration pipeline
    let (org_id, _campus_id) = run_full_migration(&pool)
        .await
        .expect("Full migration should succeed");

    // ----- Verify users -----
    // 2 non-banned users (alice, bob) + 1 system migration user = 3 total
    let user_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE organization_id = $1")
            .bind(org_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        user_count, 3,
        "Expected 3 users (alice, bob, system user), got {}",
        user_count
    );

    // Verify alice exists with correct attributes
    let alice: (String, String, String) = sqlx::query_as(
        "SELECT username, email, password_hash FROM users WHERE username = 'alice' AND organization_id = $1",
    )
    .bind(org_id)
    .fetch_one(&pool)
    .await
    .expect("alice must exist");
    assert_eq!(alice.0, "alice");
    assert_eq!(alice.1, "alice@example.com");
    assert!(
        alice.2.starts_with("{MD5}"),
        "alice password_hash must have {{MD5}} prefix, got: {}",
        alice.2
    );

    // Verify bob exists
    let bob: (String, String) = sqlx::query_as(
        "SELECT username, email FROM users WHERE username = 'bob' AND organization_id = $1",
    )
    .bind(org_id)
    .fetch_one(&pool)
    .await
    .expect("bob must exist");
    assert_eq!(bob.0, "bob");
    assert_eq!(bob.1, "bob@example.com");

    // Verify banned user was NOT migrated
    let banned_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE username = 'banned_user'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(banned_count, 0, "banned user must not be migrated");

    // Verify system migration user exists
    let system_username = format!("uoj_migration_{}", org_id);
    let system_user_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM users WHERE username = $1 AND organization_id = $2",
    )
    .bind(&system_username)
    .bind(org_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(system_user_count, 1, "system migration user must exist");

    // Verify user_roles were created
    let role_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM user_roles
           WHERE user_id IN (SELECT id FROM users WHERE organization_id = $1)
           AND role = 'student'"#,
    )
    .bind(org_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(role_count, 2, "alice and bob should have student roles");

    // ----- Verify problems -----
    let problem_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM problems WHERE organization_id = $1")
            .bind(org_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        problem_count, 1,
        "Expected 1 problem, got {}",
        problem_count
    );

    let problem: (String, String, i32, i32) = sqlx::query_as(
        "SELECT title, visibility, time_limit_ms, memory_limit_kb FROM problems WHERE id = 1",
    )
    .fetch_one(&pool)
    .await
    .expect("problem 1 must exist");
    assert_eq!(problem.0, "Hello World");
    assert_eq!(problem.1, "public"); // is_hidden=0 => public
    assert_eq!(problem.2, 1000); // time_limit from extra_config
    assert_eq!(problem.3, 256000); // memory_limit 256MB -> 256000KB

    // ----- Verify submissions -----
    let submission_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM submissions WHERE organization_id = $1")
            .bind(org_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        submission_count, 1,
        "Expected 1 submission, got {}",
        submission_count
    );

    let submission: (String, String, String, Option<String>) =
        sqlx::query_as("SELECT language, status, code, verdict FROM submissions WHERE id = 1")
            .fetch_one(&pool)
            .await
            .expect("submission 1 must exist");
    assert_eq!(submission.0, "cpp");
    assert_eq!(submission.1, "judged"); // Accepted => judged
    assert_eq!(submission.3, Some("ac".to_string())); // Accepted => ac verdict

    // ----- Verify contests -----
    let contest_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM contests WHERE organization_id = $1")
            .bind(org_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        contest_count, 1,
        "Expected 1 contest, got {}",
        contest_count
    );

    let contest: (String,) = sqlx::query_as("SELECT name FROM contests WHERE id = 1")
        .fetch_one(&pool)
        .await
        .expect("contest 1 must exist");
    assert_eq!(contest.0, "Test Contest");

    // ----- Verify contest_problems -----
    let cp_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM contest_problems WHERE contest_id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(cp_count, 1, "Expected 1 contest_problem link");

    // ----- Verify contest_participants -----
    let part_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM contest_participants WHERE contest_id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(part_count, 1, "Expected 1 contest participant (alice)");

    // ----- Verify blogs/articles -----
    let article_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM articles")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(
        article_count, 1,
        "Expected 1 article, got {}",
        article_count
    );

    let article: (String, bool, String) =
        sqlx::query_as("SELECT title, is_published, content FROM articles WHERE id = 1")
            .fetch_one(&pool)
            .await
            .expect("article 1 must exist");
    assert_eq!(article.0, "My First Blog");
    assert!(
        article.1,
        "article must be published (not hidden, not draft)"
    );

    // ----- Verify blog comments -----
    let comment_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM article_comments WHERE article_id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(comment_count, 1, "Expected 1 article comment");

    // ----- Verify likes -----
    let like_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM likes")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(like_count, 2, "Expected 2 likes (1 blog + 1 problem)");

    // ----- Verify direct messages -----
    let msg_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM direct_messages")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(msg_count, 2, "Expected 2 direct messages");

    let conv_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM direct_conversations")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(conv_count, 1, "Expected 1 conversation (alice <-> bob)");

    // ----- Verify migration_mappings -----
    let mapping_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM migration_mappings")
        .fetch_one(&pool)
        .await
        .unwrap();
    // users: alice, bob, system user = 3
    // problem: 1 = 1
    // submission: 1 = 1
    // contest: 1 = 1
    // blog: 1 = 1
    // blog_comment: 1 = 1
    // best_ac: 1 = 1
    // messages: 2 messages x 2 mappings (stable_key + old_id) = 4
    // Total: 3 + 1 + 1 + 1 + 1 + 1 + 1 + 4 = 13
    assert!(
        mapping_count >= 10,
        "Expected at least 10 migration_mappings, got {}",
        mapping_count
    );

    // Verify specific mappings exist
    let user_mapping: (String,) = sqlx::query_as(
        "SELECT new_id FROM migration_mappings WHERE entity_type = 'user' AND old_id = 'alice'",
    )
    .fetch_one(&pool)
    .await
    .expect("alice user mapping must exist");
    assert!(
        Uuid::parse_str(&user_mapping.0).is_ok(),
        "user mapping new_id must be a valid UUID"
    );

    let problem_mapping: (String,) = sqlx::query_as(
        "SELECT new_id FROM migration_mappings WHERE entity_type = 'problem' AND old_id = '1'",
    )
    .fetch_one(&pool)
    .await
    .expect("problem 1 mapping must exist");
    assert_eq!(problem_mapping.0, "1", "problem uses old ID as new ID");

    // Cleanup
    cleanup_migration_data(&pool).await;
}

// ---------------------------------------------------------------------------
// Test 2: Double-run idempotency
// ---------------------------------------------------------------------------

#[tokio::test]
#[ignore = "requires Docker -- run with `cargo test -p migration-tool --test e2e_migration -- --ignored`"]
async fn test_double_run_idempotent() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://localhost/migration_test".to_string());

    let pool = PgPool::connect(&database_url)
        .await
        .expect("Need PostgreSQL. Set DATABASE_URL or start a local instance.");

    // Setup: run schema migrations
    run_schema_migrations(&pool).await;

    // Cleanup any prior test data
    cleanup_migration_data(&pool).await;

    // --- First run ---
    let (org_id_1, _campus_id_1) = run_full_migration(&pool)
        .await
        .expect("First migration run should succeed");

    // Capture row counts after first run
    let users_after_run1: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE organization_id = $1")
            .bind(org_id_1)
            .fetch_one(&pool)
            .await
            .unwrap();

    let problems_after_run1: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM problems WHERE organization_id = $1")
            .bind(org_id_1)
            .fetch_one(&pool)
            .await
            .unwrap();

    let submissions_after_run1: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM submissions WHERE organization_id = $1")
            .bind(org_id_1)
            .fetch_one(&pool)
            .await
            .unwrap();

    let contests_after_run1: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM contests WHERE organization_id = $1")
            .bind(org_id_1)
            .fetch_one(&pool)
            .await
            .unwrap();

    let articles_after_run1: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM articles")
        .fetch_one(&pool)
        .await
        .unwrap();

    let mappings_after_run1: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM migration_mappings")
        .fetch_one(&pool)
        .await
        .unwrap();

    // Capture mapping snapshot (old_id -> new_id for each entity type)
    let mapping_snapshot_run1: Vec<(String, String, String)> = sqlx::query_as(
        "SELECT entity_type, old_id, new_id FROM migration_mappings ORDER BY entity_type, old_id",
    )
    .fetch_all(&pool)
    .await
    .unwrap();

    // --- Second run with same data ---
    let (org_id_2, _campus_id_2) = run_full_migration(&pool)
        .await
        .expect("Second migration run should succeed (idempotent)");

    // Organization should be the same since we reuse the slug
    assert_eq!(
        org_id_1, org_id_2,
        "Second run must use the same organization"
    );

    // --- Verify: same row counts ---
    let users_after_run2: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE organization_id = $1")
            .bind(org_id_1)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        users_after_run2, users_after_run1,
        "User count must not change after second run"
    );

    let problems_after_run2: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM problems WHERE organization_id = $1")
            .bind(org_id_1)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        problems_after_run2, problems_after_run1,
        "Problem count must not change after second run"
    );

    let submissions_after_run2: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM submissions WHERE organization_id = $1")
            .bind(org_id_1)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        submissions_after_run2, submissions_after_run1,
        "Submission count must not change after second run"
    );

    let contests_after_run2: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM contests WHERE organization_id = $1")
            .bind(org_id_1)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        contests_after_run2, contests_after_run1,
        "Contest count must not change after second run"
    );

    let articles_after_run2: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM articles")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(
        articles_after_run2, articles_after_run1,
        "Article count must not change after second run"
    );

    // --- Verify: mapping count unchanged ---
    let mappings_after_run2: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM migration_mappings")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(
        mappings_after_run2, mappings_after_run1,
        "Migration mapping count must not change after second run"
    );

    // --- Verify: all mappings are identical ---
    let mapping_snapshot_run2: Vec<(String, String, String)> = sqlx::query_as(
        "SELECT entity_type, old_id, new_id FROM migration_mappings ORDER BY entity_type, old_id",
    )
    .fetch_all(&pool)
    .await
    .unwrap();

    assert_eq!(
        mapping_snapshot_run1, mapping_snapshot_run2,
        "All migration_mappings must be identical after second run"
    );

    // --- Verify no duplicate contest participants ---
    let cp_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM contest_participants WHERE contest_id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        cp_count, 1,
        "No duplicate contest participants after second run"
    );

    // --- Verify no duplicate contest problems ---
    let cprob_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM contest_problems WHERE contest_id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        cprob_count, 1,
        "No duplicate contest problems after second run"
    );

    // --- Verify no duplicate likes ---
    let like_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM likes")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(like_count, 2, "No duplicate likes after second run");

    // --- Verify no duplicate messages ---
    let msg_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM direct_messages")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(msg_count, 2, "No duplicate messages after second run");

    // --- Verify no duplicate conversations ---
    let conv_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM direct_conversations")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(conv_count, 1, "No duplicate conversations after second run");

    // --- Verify no duplicate article comments ---
    let comment_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM article_comments WHERE article_id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        comment_count, 1,
        "No duplicate article comments after second run"
    );

    // Cleanup
    cleanup_migration_data(&pool).await;
}
