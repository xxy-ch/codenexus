//! Feature gateway module.
//!
//! Provides runtime feature flag resolution with scoped hierarchy,
//! DashMap caching, and emergency-off support.

pub mod middleware;
pub mod models;
pub mod routes;
pub mod service;

pub use models::*;
pub use routes::features_router;
pub use service::FeatureGatewayService;
