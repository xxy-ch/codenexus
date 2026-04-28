pub mod schema;

use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;

/// Creates a PostgreSQL connection pool with configurable options.
///
/// # Arguments
/// * `database_url` - Connection string for PostgreSQL (e.g., "postgresql://user:pass@localhost/db")
/// * `max_connections` - Maximum number of connections in the pool (default: 5)
/// * `acquire_timeout_seconds` - Timeout for acquiring a connection from the pool (default: 30)
///
/// # Returns
/// A configured `PgPool` instance.
///
/// # Errors
/// Returns an error if the connection string is invalid or the database is unreachable.
pub async fn create_pool(
    database_url: &str,
    max_connections: Option<u32>,
    acquire_timeout_seconds: Option<u64>,
) -> Result<PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(max_connections.unwrap_or(5))
        .acquire_timeout(Duration::from_secs(acquire_timeout_seconds.unwrap_or(30)))
        .connect(database_url)
        .await?;

    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_pool_invalid_url() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(async { create_pool("invalid://url", Some(1), Some(1)).await });
        assert!(result.is_err(), "Expected error for invalid DATABASE_URL");
    }

    #[ignore = "requires a running PostgreSQL database; set DATABASE_URL environment variable"]
    #[tokio::test]
    async fn test_connection() {
        let database_url = match std::env::var("DATABASE_URL") {
            Ok(url) if !url.is_empty() => url,
            _ => {
                panic!("DATABASE_URL must be set and non-empty for this test");
            }
        };

        let pool = create_pool(&database_url, None, None)
            .await
            .expect("Failed to create database connection pool");

        // Execute a simple query to verify connectivity
        let result: i32 = sqlx::query_scalar("SELECT 1")
            .fetch_one(&pool)
            .await
            .expect("Failed to execute query");

        assert_eq!(result, 1, "Database connection test query should return 1");
    }
}
