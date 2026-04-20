//! Integration tests for domain-community
//!
//! Tests discussion and blog CRUD against real PostgreSQL via testcontainers.
//! The community crate has sub-modules: discussions, blog, messages.
//! These tests validate the discussion and blog service layers.

use api_infra::testkit::TestFixture;
use sqlx::PgPool;
use uuid::Uuid;

async fn setup_fixture() -> TestFixture {
    let fixture = TestFixture::new().await;
    let migrator = sqlx::migrate!("../api/migrations");
    migrator.run(&fixture.db_pool).await.expect("Failed to run migrations");
    fixture
}

/// Seed org, user, and a problem. Returns (org_id, user_id, problem_id).
async fn seed_org_user_problem(pool: &PgPool) -> (i64, Uuid, i64) {
    let org_id: i64 = sqlx::query_scalar(
        "INSERT INTO organizations (name, slug) VALUES ('Test Org', 'test-org') RETURNING id",
    )
    .fetch_one(pool)
    .await
    .unwrap();

    let user_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, password_hash, organization_id) VALUES ('test@community.com', 'hash', $1) RETURNING id",
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

    (org_id, user_id, problem_id)
}

#[tokio::test]
async fn test_create_and_get_discussion() {
    let fixture = setup_fixture().await;
    let (_org_id, user_id, problem_id) = seed_org_user_problem(&fixture.db_pool).await;

    let service =
        domain_community::discussions::service::DiscussionService::new(fixture.db_pool.clone());

    let req = domain_community::discussions::models::CreateDiscussionRequest {
        title: "How to solve Two Sum?".to_string(),
        content: "I am stuck on the Two Sum problem. Any hints?".to_string(),
        problem_id: Some(problem_id),
        contest_id: None,
        tags: vec!["help".to_string()],
    };

    let discussion = service.create_discussion(user_id, _org_id, req).await.unwrap();

    assert_eq!(discussion.title, "How to solve Two Sum?");
    assert_eq!(discussion.content, "I am stuck on the Two Sum problem. Any hints?");
    assert_eq!(discussion.problem_id, Some(problem_id));
    assert!(!discussion.is_pinned);
    assert!(!discussion.is_locked);

    // Get detail (increments view count)
    let detail = service.get_discussion_detail(discussion.id, _org_id).await.unwrap();
    assert_eq!(detail.discussion.id, discussion.id);
    assert_eq!(detail.discussion.view_count, 1); // incremented by get_discussion_detail
    assert!(detail.replies.is_empty());
}

#[tokio::test]
async fn test_list_discussions_by_problem() {
    let fixture = setup_fixture().await;
    let (_org_id, user_id, problem1_id) = seed_org_user_problem(&fixture.db_pool).await;

    // Create second problem
    let problem2_id: i64 = sqlx::query_scalar(
        r#"INSERT INTO problems (organization_id, author_id, title, description, difficulty, visibility, time_limit_ms, memory_limit_kb)
        VALUES ((SELECT organization_id FROM users WHERE id = $1), $1, 'Problem 2', 'Desc', 'easy', 'public', 1000, 256000)
        RETURNING id"#,
    )
    .bind(user_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    let service =
        domain_community::discussions::service::DiscussionService::new(fixture.db_pool.clone());

    // Create discussions on problem 1
    service
        .create_discussion(
            user_id,
            _org_id,
            domain_community::discussions::models::CreateDiscussionRequest {
                title: "Help with P1".to_string(),
                content: "Question about P1".to_string(),
                problem_id: Some(problem1_id),
                contest_id: None,
                tags: vec![],
            },
        )
        .await
        .unwrap();
    service
        .create_discussion(
            user_id,
            _org_id,
            domain_community::discussions::models::CreateDiscussionRequest {
                title: "Another P1 question".to_string(),
                content: "Another question".to_string(),
                problem_id: Some(problem1_id),
                contest_id: None,
                tags: vec![],
            },
        )
        .await
        .unwrap();

    // Create discussion on problem 2
    service
        .create_discussion(
            user_id,
            _org_id,
            domain_community::discussions::models::CreateDiscussionRequest {
                title: "Help with P2".to_string(),
                content: "Question about P2".to_string(),
                problem_id: Some(problem2_id),
                contest_id: None,
                tags: vec![],
            },
        )
        .await
        .unwrap();

    // List discussions for problem 1
    let filters = domain_community::discussions::models::DiscussionFilters {
        problem_id: Some(problem1_id),
        contest_id: None,
        tags: None,
        author_id: None,
        is_pinned: None,
        is_solved: None,
        search: None,
        page: Some(1),
        limit: Some(20),
        sort: None,
    };
    let response = service.get_discussions(filters, _org_id).await.unwrap();
    assert_eq!(response.total, 2);

    // List discussions for problem 2
    let filters = domain_community::discussions::models::DiscussionFilters {
        problem_id: Some(problem2_id),
        contest_id: None,
        tags: None,
        author_id: None,
        is_pinned: None,
        is_solved: None,
        search: None,
        page: Some(1),
        limit: Some(20),
        sort: None,
    };
    let response = service.get_discussions(filters, _org_id).await.unwrap();
    assert_eq!(response.total, 1);
    assert_eq!(response.discussions[0].title, "Help with P2");
}

#[tokio::test]
async fn test_blog_article_crud() {
    let fixture = setup_fixture().await;
    let (_org_id, user_id, _problem_id) = seed_org_user_problem(&fixture.db_pool).await;

    let service = domain_community::blog::service::BlogService::new(fixture.db_pool.clone());

    // Create article
    let req = domain_community::blog::models::CreateArticleRequest {
        title: "Introduction to Graph Theory".to_string(),
        content: "Graph theory is the study of graphs...".to_string(),
        summary: Some("A brief intro to graphs".to_string()),
        cover_image: None,
        tags: vec!["graphs".to_string(), "algorithms".to_string()],
        category: Some("education".to_string()),
        is_published: Some(true),
        is_featured: Some(false),
    };

    let article = service.create_article(user_id, _org_id, req).await.unwrap();

    assert_eq!(article.title, "Introduction to Graph Theory");
    assert_eq!(article.author_id, user_id);
    assert!(article.is_published);
    assert!(!article.slug.is_empty());

    // Get article by ID
    let detail = service.get_article_detail(&article.id.to_string(), _org_id).await.unwrap();
    assert_eq!(detail.article.id, article.id);
    assert_eq!(detail.article.view_count, 1); // incremented by get_article_detail
    assert!(detail.comments.is_empty());
}
