use sqlx::{postgres::PgPoolOptions, PgPool};
use std::sync::OnceLock;
use std::time::Duration;

static DB_POOL: OnceLock<PgPool> = OnceLock::new();

/// Get a shared PgPool singleton.
///
/// Creates the pool on first call, returns the same instance on subsequent calls.
/// Prevents connection leak from creating a new 5-connection pool per submission.
pub async fn get_db_connection() -> Result<&'static PgPool, sqlx::Error> {
    if let Some(pool) = DB_POOL.get() {
        return Ok(pool);
    }

    let database_url = std::env::var("DATABASE_URL").map_err(|_| {
        sqlx::Error::Configuration("DATABASE_URL environment variable not set".into())
    })?;
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(30))
        .connect(&database_url)
        .await?;

    // Another thread may have initialized it first — that's fine
    let _ = DB_POOL.set(pool);
    Ok(DB_POOL.get().unwrap())
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
