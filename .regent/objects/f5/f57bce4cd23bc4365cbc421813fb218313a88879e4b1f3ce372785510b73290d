//! Feature gateway standalone binary.
//!
//! Connects directly to PostgreSQL (D-19), serves HTTP on port 3001 (D-18),
//! and authenticates API calls with WORKER_SECRET (D-24).

use std::env;
use std::sync::Arc;

use anyhow::Result;
use sqlx::postgres::PgPoolOptions;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use feature_gateway::service::FeatureGatewayService;
use feature_gateway::routes::gateway_router;
use feature_gateway::AppState;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "feature_gateway=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Feature gateway starting...");

    // Load configuration
    let database_url =
        env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let bind_address = env::var("GATEWAY_BIND_ADDRESS")
        .unwrap_or_else(|_| "0.0.0.0:3001".to_string());

    // Ensure WORKER_SECRET is set for security
    let _worker_secret = env::var("WORKER_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("WORKER_SECRET not set, using insecure default — set this in production");
            "default_worker_secret_change_me".to_string()
        });

    // Log feature gateway enabled state
    let gateway_enabled = env::var("FEATURE_GATEWAY_ENABLED")
        .map(|v| v != "false")
        .unwrap_or(true);
    info!("Feature gateway enabled: {}", gateway_enabled);

    // Create database connection pool
    info!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    info!("Database connected successfully");

    // Create application state
    let state = AppState {
        gateway: Arc::new(FeatureGatewayService::new(pool)),
    };

    // Build router with auth middleware on all routes
    let app = gateway_router(state)
        .layer(axum::middleware::from_fn(
            feature_gateway::auth::require_worker_secret,
        ));

    // Bind and serve
    let listener = tokio::net::TcpListener::bind(&bind_address).await?;
    info!("Feature gateway listening on {}", bind_address);

    axum::serve(listener, app).await?;

    Ok(())
}
