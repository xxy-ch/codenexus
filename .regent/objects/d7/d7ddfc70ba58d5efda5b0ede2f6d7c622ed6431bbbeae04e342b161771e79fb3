//! Feature gateway standalone service.
//!
//! Provides runtime feature flag resolution with scoped hierarchy,
//! DashMap caching, emergency-off support, and CRUD endpoints.

pub mod auth;
pub mod models;
pub mod routes;
pub mod service;

use service::FeatureGatewayService;
use std::sync::Arc;

/// Application state shared across all route handlers.
#[derive(Clone)]
pub struct AppState {
    pub gateway: Arc<FeatureGatewayService>,
}
