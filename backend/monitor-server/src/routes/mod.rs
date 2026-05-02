//! Route definitions for the monitor-server.

pub mod control;
pub mod health;
pub mod monitor;
pub mod ws;

use axum::middleware;
use axum::routing::get;
use axum::Router;
use std::sync::Arc;

use crate::middleware::auth::{require_api_key, AuthState};
use crate::state::AppState;

/// Build the application router with all routes mounted.
///
/// Control-plane routes (`/api/control/*`) are gated behind API key
/// authentication when `MONITOR_API_KEY` is set. Health, read-only monitor,
/// and WebSocket endpoints are always accessible.
pub fn build_router(state: Arc<AppState>, auth_state: Arc<AuthState>) -> Router {
    let control_routes = control::control_routes()
        .layer(middleware::from_fn_with_state(auth_state, require_api_key));

    Router::new()
        .route("/health", get(health::health_check))
        .route("/api/services", get(monitor::get_full_snapshot))
        .route("/api/services/{target}", get(monitor::get_service_status))
        .nest("/api/control", control_routes)
        .route("/ws/monitor", get(ws::ws_monitor_handler))
        .with_state(state)
}
