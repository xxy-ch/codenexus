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
/// ## Security model
///
/// - All API data endpoints (`/api/services`, `/api/services/{target}`,
///   `/api/control/*`) and the WebSocket monitor feed (`/ws/monitor`) require
///   a valid API key when `MONITOR_API_KEY` is set.
/// - Only `/health` is unauthenticated (it returns a boolean-style status, not
///   internal details).
/// - If `MONITOR_API_KEY` is unset, auth is disabled (dev mode). Production
///   deployments MUST set a strong key.
pub fn build_router(state: Arc<AppState>, auth_state: Arc<AuthState>) -> Router {
    let control_routes = control::control_routes()
        .layer(middleware::from_fn_with_state(auth_state.clone(), require_api_key));

    // Protected data + WS routes: require API key auth.
    let protected_data_routes = Router::new()
        .route("/api/services", get(monitor::get_full_snapshot))
        .route("/api/services/{target}", get(monitor::get_service_status))
        .route("/ws/monitor", get(ws::ws_monitor_handler))
        .layer(middleware::from_fn_with_state(auth_state, require_api_key));

    Router::new()
        .route("/health", get(health::health_check))
        .merge(protected_data_routes)
        .nest("/api/control", control_routes)
        .with_state(state)
}
