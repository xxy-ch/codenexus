//! Feature gateway module.
//!
//! Provides HTTP client for the standalone Feature Gateway service,
//! feature gate middleware, and proxy routes.

pub mod client;
pub mod middleware;
pub mod models;
pub mod routes;

pub use client::GatewayClient;
pub use models::*;
pub use routes::features_router;
