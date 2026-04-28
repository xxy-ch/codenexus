//! Feature gateway standalone service.
//!
//! Provides runtime feature flag resolution with scoped hierarchy,
//! DashMap caching, emergency-off support, and CRUD endpoints.

pub mod models;
pub mod service;
pub mod routes;
pub mod auth;

use std::sync::Arc;
use service::FeatureGatewayService;

/// Application state shared across all route handlers.
#[derive(Clone)]
pub struct AppState {
    pub gateway: Arc<FeatureGatewayService>,
}
