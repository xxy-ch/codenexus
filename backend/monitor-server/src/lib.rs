//! monitor-server — health monitoring and data collection for the Online Judge platform.
//!
//! Independent Axum binary crate that connects to Redis and PostgreSQL,
//! exposes a `/health` endpoint reporting dependency status, and provides
//! internal data collectors for worker heartbeats, stream backlog depth,
//! AI metrics aggregation, and feature flag visibility.

pub mod audit;
pub mod collectors;
pub mod config;
pub mod control;
pub mod models;
pub mod middleware;
pub mod routes;
pub mod snapshot;
pub mod state;
