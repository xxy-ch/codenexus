use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;

pub async fn get_db_connection() -> Result<PgPool, sqlx::Error> {
    let database_url = std::env::var("DATABASE_URL").map_err(|_| {
        sqlx::Error::Configuration("DATABASE_URL environment variable not set".into())
    })?;
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(30))
        .connect(&database_url)
        .await?;
    Ok(pool)
}

/// Test case model for judge-worker
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct TestCase {
    pub id: i64,
    pub input: String,
    pub expected_output: String,
    pub is_hidden: bool,
    pub score: i32,
}
