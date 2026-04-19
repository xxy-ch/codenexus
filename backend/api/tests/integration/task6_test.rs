use testcontainers::{clients::Cli, Container, GenericImage};
use testcontainers_modules::postgres::Postgres;
use sqlx::postgres::PgPool;
use uuid::Uuid;
use anyhow::Result;

use super::common::{setup_test_db, TestDb};
use leaderboard::service::LeaderboardService;
use search::service::SearchService;
use db::Pool;

/// Test Task 6: Streak calculation
#[tokio::test]
async fn test_streak_calculation() {
    let TestDb { pool, .. } = setup_test_db();
    let leaderboard_service = LeaderboardService::new(pool.clone());
    let user_id = Uuid::new_v4();

    let _ = sqlx::query("INSERT INTO users (id, username, email, password) VALUES ($1, $2, $3, $4)")
        .bind(user_id)
        .bind("testuser")
        .bind("test@example.com")
        .bind("hashed_password")
        .execute(&pool)
        .await;

    let now = chrono::Utc::now();

    let _ = sqlx::query("INSERT INTO submissions (id, user_id, problem_id, language, source_code, verdict, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)")
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(1)
        .bind("python3")
        .bind("print('test')")
        .bind("AC")
        .bind(now.with_time(chrono::NaiveTime::from_hms_opt(12, 0, 0).unwrap()))
        .execute(&pool)
        .await;

    let _ = sqlx::query("INSERT INTO submissions (id, user_id, problem_id, language, source_code, verdict, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)")
        .bind(Uuid::new_v4())
        .bind(user_id)
        .bind(2)
        .bind("python3")
        .bind("print('test')")
        .bind("AC")
        .bind(now.with_time(chrono::NaiveTime::from_hms_opt(12, 0, 0).unwrap()) - chrono::Duration::days(1))
        .execute(&pool)
        .await;

    let stats = leaderboard_service.get_user_stats(user_id).await.unwrap();

    assert_eq!(stats.streak_days, 2, "Current streak should be 2 days");
    assert_eq!(stats.max_streak_days, 2, "Max streak should be 2 days");
}

/// Test Task 6: Recent searches
#[tokio::test]
async fn test_recent_searches() {
    let TestDb { pool, .. } = setup_test_db();
    let search_service = SearchService::new(pool.clone());
    let user_id = Uuid::new_v4().to_string();

    let _ = search_service.save_recent_searches(&user_id, "python tutorial").await;
    let _ = search_service.save_recent_searches(&user_id, "rust programming").await;
    let _ = search_service.save_recent_searches(&user_id, "javascript guide").await;

    let recent = search_service.get_recent_searches(&user_id).await.unwrap();

    assert_eq!(recent.len(), 3, "Should retrieve 3 recent searches");
    assert!(recent.contains(&"python tutorial"));
    assert!(recent.contains(&"rust programming"));
    assert!(recent.contains(&"javascript guide"));
    assert_eq!(recent[0], "javascript guide", "Most recent search should be first");
}
