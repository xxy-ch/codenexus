//! Route definitions for the monitor-server.

pub mod control;
pub mod health;

use axum::routing::get;
use axum::Router;
use std::sync::Arc;

use crate::state::AppState;

/// Build the application router with all routes mounted.
pub fn build_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(health::health_check))
        .nest("/api/control", control::control_routes())
        .with_state(state)
}
