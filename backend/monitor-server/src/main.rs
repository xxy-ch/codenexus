//! monitor-server binary entry point.
//!
//! Connects to Redis and PostgreSQL, exposes an HTTP health endpoint,
//! and will host internal data collectors for worker heartbeats, stream
//! backlog, AI metrics, and feature flags.
//!
//! Completely independent from domain-*/api-infra/judge-worker/llm-worker.
//! Only Redis + DB tables are the shared interface.

use anyhow::Result;
use deadpool_redis::{Config as RedisConfig, Runtime};
use sqlx::postgres::PgPoolOptions;
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use monitor_server::config::ServerConfig;
use monitor_server::routes;
use monitor_server::state::AppState;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "monitor_server=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("monitor-server starting...");

    // Load configuration from environment
    let config = ServerConfig::from_env()?;
    info!(
        bind_addr = %config.bind_addr,
        redis_url = %config.redis_url,
        "Configuration loaded"
    );

    // Connect to PostgreSQL
    let pg_pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to connect to PostgreSQL");
            e
        })?;
    info!("Connected to PostgreSQL");

    // Connect to Redis via deadpool
    let redis_pool = build_redis_pool(&config.redis_url)?;
    info!("Connected to Redis at {}", config.redis_url);

    // Build shared state
    let state = AppState::new(pg_pool, redis_pool);

    // Build router and start serving
    let app = routes::build_router(state);
    let listener = tokio::net::TcpListener::bind(&config.bind_addr).await?;
    info!(addr = %config.bind_addr, "HTTP server listening");

    axum::serve(listener, app).await?;

    Ok(())
}

/// Build a deadpool-redis connection pool.
fn build_redis_pool(redis_url: &str) -> Result<deadpool_redis::Pool> {
    let cfg = RedisConfig::from_url(redis_url);
    let pool = cfg.create_pool(Some(Runtime::Tokio1))?;
    Ok(pool)
}
