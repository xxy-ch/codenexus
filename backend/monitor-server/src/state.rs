//! Shared application state for the monitor-server.
//!
//! Holds PostgreSQL and Redis connection pools behind `Arc` for safe
//! sharing across Axum route handlers.

use deadpool_redis::Pool as RedisPool;
use sqlx::PgPool;
use std::sync::Arc;

/// Shared application state injected into Axum handlers via [`State`].
///
/// [`State`]: axum::extract::State
#[derive(Clone)]
pub struct AppState {
    /// PostgreSQL connection pool (sqlx).
    pub pg_pool: PgPool,
    /// Redis connection pool (deadpool-redis).
    pub redis_pool: RedisPool,
}

impl AppState {
    /// Create a new `AppState` wrapping the given pools.
    pub fn new(pg_pool: PgPool, redis_pool: RedisPool) -> Arc<Self> {
        Arc::new(Self {
            pg_pool,
            redis_pool,
        })
    }
}
