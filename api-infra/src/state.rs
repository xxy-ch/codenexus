//! Shared application state.
//!
//! Moved from the `api` crate to `api-infra` so that domain crates can
//! reference `AppState` without depending on the `api` crate.

use std::sync::Arc;

use crate::traits::token_service::TokenService;
use sqlx::PgPool;

/// Shared application state accessible to all route handlers.
///
/// The `jwt_service` field uses a trait object so domain crates don't
/// need to know the concrete `JwtService` type.
#[derive(Clone)]
pub struct AppState {
    pub db_pool: PgPool,
    pub redis_pool: Option<deadpool_redis::Pool>,
    pub redis_url: String,
    pub jwt_service: Arc<dyn TokenService>,
    pub jwt_secret: String,
    pub worker_secret: String,
    pub websocket_server: Arc<crate::websocket::WebSocketServer>,
}
