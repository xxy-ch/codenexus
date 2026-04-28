//! Shared test infrastructure for all domain crates.
//!
//! This module is only available when the `testkit` feature is enabled.
//! It provides testcontainers-based PostgreSQL and Redis instances,
//! plus fixture factories for creating test data.
//!
//! # Requirements
//! - Docker must be running
//! - The `testkit` feature must be enabled: `cargo test -p api-infra --features testkit`

pub mod database;
pub mod fixtures;
pub mod redis;

use deadpool_redis::Pool as RedisPool;
use sqlx::PgPool;

/// Holds test container handles and connection pools.
/// Dropping this struct will automatically stop the containers.
pub struct TestFixture {
    pub database_url: String,
    pub redis_url: String,
    pub db_pool: PgPool,
    pub redis_pool: RedisPool,
    _pg_container: database::PgTestContainer,
    _redis_container: redis::RedisTestContainer,
}

impl TestFixture {
    /// Create a new test fixture with PostgreSQL and Redis containers.
    ///
    /// # Panics
    /// Panics if Docker is not running or containers cannot be started.
    pub async fn new() -> Self {
        let pg_container = database::PgTestContainer::start()
            .await
            .expect("Failed to start PostgreSQL test container. Is Docker running?");

        let redis_container = redis::RedisTestContainer::start()
            .await
            .expect("Failed to start Redis test container. Is Docker running?");

        let database_url = pg_container.connection_url().await;
        let redis_url = redis_container.connection_url().await;

        let db_pool = pg_container
            .create_pool()
            .await
            .expect("Failed to create PostgreSQL pool");

        let redis_pool = redis_container
            .create_pool()
            .await
            .expect("Failed to create Redis pool");

        Self {
            database_url,
            redis_url,
            db_pool,
            redis_pool,
            _pg_container: pg_container,
            _redis_container: redis_container,
        }
    }

    /// Run database migrations using the provided migrator.
    /// The migrator is passed as a closure to avoid depending on api's migration code.
    pub async fn run_migrations<F, Fut>(&self, migrate_fn: F)
    where
        F: FnOnce(&PgPool) -> Fut,
        Fut: std::future::Future<Output = Result<(), sqlx::Error>>,
    {
        migrate_fn(&self.db_pool)
            .await
            .expect("Failed to run migrations");
    }
}
