//! Shared application state for the monitor-server.
//!
//! Holds PostgreSQL and Redis connection pools, plus a broadcast channel
//! for pushing monitoring snapshots to WebSocket clients.

use deadpool_redis::Pool as RedisPool;
use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::broadcast;

/// Shared application state injected into Axum handlers via [`State`].
///
/// [`State`]: axum::extract::State
#[derive(Clone)]
pub struct AppState {
    /// PostgreSQL connection pool (sqlx).
    pub pg_pool: PgPool,
    /// Redis connection pool (deadpool-redis).
    pub redis_pool: RedisPool,
    /// Broadcast sender for MonitorSnapshot JSON strings.
    /// WebSocket handlers subscribe to this to receive periodic snapshots.
    pub snapshot_tx: broadcast::Sender<String>,
}

impl AppState {
    /// Create a new `AppState` wrapping the given pools and broadcast sender.
    pub fn new(
        pg_pool: PgPool,
        redis_pool: RedisPool,
        snapshot_tx: broadcast::Sender<String>,
    ) -> Arc<Self> {
        Arc::new(Self {
            pg_pool,
            redis_pool,
            snapshot_tx,
        })
    }
}
