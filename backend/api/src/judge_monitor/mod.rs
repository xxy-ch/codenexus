//! Judge monitoring module.
//!
//! Provides admin endpoints for observing judge system health and managing
//! the dead letter queue (DLQ). Per D-09, D-11, D-12, D-13.

pub mod routes;
pub mod service;

pub use routes::judge_monitor_router;
