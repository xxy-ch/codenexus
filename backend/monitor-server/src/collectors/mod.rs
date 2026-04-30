//! Data collectors for the monitor-server.
//!
//! Each collector module reads from a specific data source (Redis, DB)
//! and produces structured results suitable for API exposure (S03).

pub mod db_collector;
pub mod redis_collector;
