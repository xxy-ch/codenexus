//! Integration tests for domain-search
//!
//! Tests tenant-aware search against real PostgreSQL via testcontainers.
//! Validates that search results respect organizational boundaries.

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

/// Seed org, user, and a problem with a specific title.
/// Returns (org_id, user_id, problem_id).
async fn seed_org_with_problem(
    pool: &PgPool,
    org_name: &str,
    problem_title: &str,
) -> (i64, Uuid, i64) {
    let org_id: i64 =
        sqlx::query_scalar("INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id")
            .bind(org_name)
            .bind(org_name.to_lowercase().replace(' ', "-"))
            .fetch_one(pool)
            .await
            .unwrap();

    let user_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ($1, 'hash', $2) RETURNING id",
    )
    .bind(format!("user@{}.com", org_name))
    .bind(org_id)
    .fetch_one(pool)
    .await
    .unwrap();

    let problem_id: i64 = sqlx::query_scalar(
        r#"INSERT INTO problems (organization_id, author_id, title, description, difficulty, visibility, time_limit_ms, memory_limit_kb)
        VALUES ($1, $2, $3, 'A problem description', 'easy', 'public', 1000, 256000)
        RETURNING id"#,
    )
    .bind(org_id)
    .bind(user_id)
    .bind(problem_title)
    .fetch_one(pool)
    .await
    .unwrap();

    (org_id, user_id, problem_id)
}

#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_search_returns_tenant_results_only() {
    let fixture = setup_fixture().await;

    // Create 2 orgs with different problems sharing a keyword
    let (org1_id, _u1, _p1) =
        seed_org_with_problem(&fixture.db_pool, "Org1", "Binary Search Tree").await;
    let (_org2_id, _u2, _p2) =
        seed_org_with_problem(&fixture.db_pool, "Org2", "Binary Search Array").await;

    let service = domain_search::service::SearchService::new(fixture.db_pool.clone());

    let query = domain_search::models::SearchQuery {
        q: Some("Binary".to_string()),
        r#type: "problem".to_string(),
        category: None,
        tag: None,
        author_id: None,
        sort: "relevance".to_string(),
        page: 1,
        limit: 20,
    };

    // Search scoped to org1 -- should only see org1's problem
    let response = service
        .search_tenant_aware(query.clone(), Some(org1_id), false, false, None)
        .await
        .unwrap();
    assert_eq!(response.problem_count, 1);
    assert_eq!(response.results.len(), 1);
    assert_eq!(response.results[0].title, "Binary Search Tree");

    // Search scoped to org2 -- should only see org2's problem
    let response = service
        .search_tenant_aware(query.clone(), Some(_org2_id), false, false, None)
        .await
        .unwrap();
    assert_eq!(response.problem_count, 1);
    assert_eq!(response.results[0].title, "Binary Search Array");
}

#[tokio::test]
#[ignore = "requires Docker/testcontainers"]
async fn test_search_empty_query_returns_empty() {
    let fixture = setup_fixture().await;
    let (_org_id, _u, _p) =
        seed_org_with_problem(&fixture.db_pool, "EmptyTest", "Some Problem").await;

    let service = domain_search::service::SearchService::new(fixture.db_pool.clone());

    let query = domain_search::models::SearchQuery {
        q: Some(String::new()), // empty query
        r#type: "all".to_string(),
        category: None,
        tag: None,
        author_id: None,
        sort: "relevance".to_string(),
        page: 1,
        limit: 20,
    };

    // Empty query should return results (empty query matches everything in the LIKE)
    // This verifies the service handles empty queries without error
    let response = service
        .search_tenant_aware(query, Some(_org_id), false, false, None)
        .await
        .unwrap();
    // The search should succeed (not error), even if results are returned.
    // Verify we got a valid response object back (not an error).
    assert_eq!(
        response.results.len(),
        0,
        "Empty DB should return zero results"
    );
}
