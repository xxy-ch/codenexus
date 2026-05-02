use sqlx::{postgres::PgPoolOptions, PgPool};
use std::sync::OnceLock;
use std::time::Duration;

static DB_POOL: OnceLock<PgPool> = OnceLock::new();

/// Get a shared PgPool singleton.
///
/// Uses `OnceLock::get_or_init` to guarantee exactly one pool is created even
/// when multiple tasks race to initialize concurrently — eliminating the TOCTOU
/// race where two threads each create a pool but only one is stored (leaking the other).
pub async fn get_db_connection() -> Result<&'static PgPool, sqlx::Error> {
    DB_POOL.get_or_init(|| {
        let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current()
                .block_on(async {
                    PgPoolOptions::new()
                        .max_connections(5)
                        .acquire_timeout(Duration::from_secs(30))
                        .connect(&database_url)
                        .await
                        .expect("Failed to create DB connection pool")
                })
        })
    });
    // Second get() always succeeds because get_or_init guarantees initialization.
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
