//! Shared application state.
//!
//! Moved from the `api` crate to `api-infra` so that domain crates can
//! reference `AppState` without depending on the `api` crate.

use std::any::Any;
use std::sync::Arc;

use crate::config::AppEnv;
use crate::feature_gateway::GatewayClient;
use crate::traits::class_repo::ClassMembershipChecker;
use crate::traits::token_service::TokenService;
use dashmap::DashMap;
use metrics_exporter_prometheus::PrometheusHandle;
use sqlx::PgPool;
use uuid::Uuid;

/// In-memory preview cache keyed by UUID token.
/// Values are `Box<dyn Any + Send + Sync>` so domain-imex can store its
/// concrete `CachedPreview` type without api-infra depending on domain-imex.
pub type PreviewCache = DashMap<Uuid, Box<dyn Any + Send + Sync>>;

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
    /// D-06: trait object for class membership checks without depending on domain-classes.
    pub class_membership_checker: Arc<dyn ClassMembershipChecker>,
    /// Prometheus handle for rendering metrics at /metrics endpoint.
    pub prometheus_handle: PrometheusHandle,
    /// In-memory cache for import preview tokens (single-use, short-lived).
    pub preview_cache: Arc<PreviewCache>,
    /// Feature gateway HTTP client for runtime feature flag resolution via standalone Gateway.
    pub gateway_client: Arc<GatewayClient>,
    /// Application environment (Production / Development / Test).
    /// Used to conditionally enable security features like the Secure cookie flag.
    pub app_env: AppEnv,
}
