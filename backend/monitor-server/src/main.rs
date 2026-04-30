//! monitor-server binary entry point.
//!
//! Connects to Redis and PostgreSQL, exposes an HTTP health endpoint,
//! WebSocket monitoring endpoint, and runs background data collectors
//! for worker heartbeats, stream backlog, AI metrics, and feature flags.
//!
//! Completely independent from domain-*/api-infra/judge-worker/llm-worker.
//! Only Redis + DB tables are the shared interface.

use anyhow::Result;
use deadpool_redis::{Config as RedisConfig, Runtime};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use monitor_server::config::ServerConfig;
use monitor_server::control;
use monitor_server::routes;
use monitor_server::snapshot::assemble_snapshot;
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
        signal_timeout_secs = config.signal_timeout_secs,
        recovery_scan_interval_secs = config.recovery_scan_interval_secs,
        push_interval_secs = config.push_interval_secs,
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

    // Create broadcast channel for WebSocket snapshot pushes.
    // Capacity of 8 means we buffer up to 8 snapshots; slow consumers
    // that fall behind get a Lagged error and skip to the latest.
    let (snapshot_tx, _) = broadcast::channel::<String>(8);

    // Build shared state
    let state = AppState::new(pg_pool.clone(), redis_pool.clone(), snapshot_tx.clone());

    // Spawn the auto-recovery background task
    let recovery_interval = std::time::Duration::from_secs(config.recovery_scan_interval_secs);
    tokio::spawn(control::run_recovery_task(
        redis_pool,
        pg_pool,
        recovery_interval,
    ));
    info!(
        interval_secs = config.recovery_scan_interval_secs,
        "Auto-recovery task spawned"
    );

    // Spawn the WebSocket broadcast task
    let broadcast_state = state.clone();
    let push_interval = std::time::Duration::from_secs(config.push_interval_secs);
    tokio::spawn(run_broadcast_task(broadcast_state, push_interval));
    info!(
        interval_secs = config.push_interval_secs,
        "Snapshot broadcast task spawned"
    );

    // Build router and start serving
    let app = routes::build_router(state);
    let listener = tokio::net::TcpListener::bind(&config.bind_addr).await?;
    info!(addr = %config.bind_addr, "HTTP server listening");

    axum::serve(listener, app).await?;

    Ok(())
}

/// Background task that periodically assembles a MonitorSnapshot and
/// broadcasts it to all WebSocket subscribers.
///
/// Runs on a fixed interval (default 5s). Each cycle:
/// 1. Assembles snapshot via `assemble_snapshot`
/// 2. Serializes to JSON
/// 3. Sends via broadcast channel
///
/// Observability: logs [broadcast] with subscriber count, snapshot size,
/// and collection latency.
async fn run_broadcast_task(state: Arc<AppState>, interval: std::time::Duration) {
    let mut tick = tokio::time::interval(interval);
    // First tick fires immediately; skip it to avoid a burst on startup.
    tick.tick().await;

    loop {
        tick.tick().await;

        let start = std::time::Instant::now();
        let snapshot = assemble_snapshot(&state).await;
        let elapsed = start.elapsed();

        match serde_json::to_string(&snapshot) {
            Ok(json) => {
                let snapshot_size = json.len();
                let subscriber_count = state.snapshot_tx.receiver_count();

                // broadcast::send returns Err only when there are no receivers.
                // That's fine — we still assemble to keep the channel warm.
                let _ = state.snapshot_tx.send(json);

                info!(
                    subscriber_count,
                    snapshot_size_bytes = snapshot_size,
                    collection_ms = elapsed.as_millis() as u64,
                    "[broadcast] snapshot pushed"
                );
            }
            Err(e) => {
                error!(error = %e, "[broadcast] failed to serialize snapshot");
            }
        }
    }
}

/// Build a deadpool-redis connection pool.
fn build_redis_pool(redis_url: &str) -> Result<deadpool_redis::Pool> {
    let cfg = RedisConfig::from_url(redis_url);
    let pool = cfg.create_pool(Some(Runtime::Tokio1))?;
    Ok(pool)
}
