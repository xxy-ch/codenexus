//! Feature gateway module.
//!
//! Provides runtime feature flag resolution with scoped hierarchy,
//! DashMap caching, and emergency-off support.

pub mod models;
pub mod service;

pub use models::*;
pub use service::FeatureGatewayService;
