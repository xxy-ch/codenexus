//! llm-worker binary entry point.
//!
//! Connects to Redis Streams (analysis_events) and PostgreSQL, then enters
//! a consume-loop that picks up analysis jobs and processes them through
//! the LLM pipeline. Completely independent from domain-analysis and
//! feature-gateway — only Redis Streams + DB tables are the interface.

use anyhow::Result;
use deadpool_redis::{Config as RedisConfig, Pool, Runtime};
use sqlx::postgres::PgPoolOptions;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tracing::{error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use llm_worker::config::WorkerConfig;
use llm_worker::processor;

/// Redis stream consumed by this worker.
const ANALYSIS_STREAM: &str = "analysis_events";
/// Consumer group name — matches what domain-analysis creates.
const ANALYSIS_GROUP: &str = "analysis_workers";

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "llm_worker=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("llm-worker starting...");

    // Load configuration from environment
    let config = WorkerConfig::from_env()?;
    info!(
        llm_api_url = %config.llm_api_url,
        llm_model = %config.llm_model,
        redis_url = %config.redis_url,
        redis_stream = %config.redis_stream,
        consumer_group = %config.consumer_group,
        consumer_name = %config.consumer_name,
        "Configuration loaded"
    );

    // Connect to PostgreSQL
    let pg_pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await?;
    info!("Connected to PostgreSQL");

    // Connect to Redis via deadpool
    let redis_pool = build_redis_pool(&config.redis_url)?;
    info!("Connected to Redis at {}", config.redis_url);

    // Ensure the consumer group exists (idempotent)
    ensure_consumer_group(&redis_pool).await?;

    // Run main processing loop
    run_loop(pg_pool, redis_pool, &config).await
}

/// Build a deadpool-redis connection pool.
fn build_redis_pool(redis_url: &str) -> Result<Pool> {
    let cfg = RedisConfig::from_url(redis_url);
    let pool = cfg.create_pool(Some(Runtime::Tokio1))?;
    Ok(pool)
}

/// Create the consumer group on the analysis_events stream if it doesn't exist.
/// Uses MKSTREAM so the stream is created on first use.
async fn ensure_consumer_group(pool: &Pool) -> Result<()> {
    let mut conn = pool.get().await?;
    let result: Result<String, _> = deadpool_redis::redis::cmd("XGROUP")
        .arg("CREATE")
        .arg(ANALYSIS_STREAM)
        .arg(ANALYSIS_GROUP)
        .arg("0")
        .arg("MKSTREAM")
        .query_async(&mut *conn)
        .await;

    if let Err(e) = result {
        let msg = e.to_string();
        if !msg.contains("BUSYGROUP") {
            return Err(e.into());
        }
        // BUSYGROUP means the group already exists — that's fine.
    }
    info!(
        "Consumer group '{}' on stream '{}' is ready",
        ANALYSIS_GROUP, ANALYSIS_STREAM
    );
    Ok(())
}

/// Type alias for the complex Redis XREADGROUP response shape.
type StreamEntries = Vec<(
    String,
    Vec<(String, std::collections::HashMap<String, String>)>,
)>;

/// Read a batch of messages from the Redis stream via XREADGROUP.
///
/// Returns a vec of (message_id, job_id) pairs for claimed messages.
async fn read_messages(
    pool: &Pool,
    consumer_name: &str,
    count: usize,
) -> Result<Vec<(String, i64)>> {
    let mut conn = pool.get().await?;

    // Use ">" to receive only new messages never delivered to other consumers.
    let entries: StreamEntries = deadpool_redis::redis::cmd("XREADGROUP")
        .arg("GROUP")
        .arg(ANALYSIS_GROUP)
        .arg(consumer_name)
        .arg("COUNT")
        .arg(count)
        .arg("BLOCK")
        .arg(5000) // 5s block — allows graceful shutdown checks
        .arg("STREAMS")
        .arg(ANALYSIS_STREAM)
        .arg(">")
        .query_async(&mut *conn)
        .await?;

    let mut messages = Vec::new();
    for (_stream_key, entries) in entries {
        for (message_id, fields) in entries {
            // Expect {"data": "<json>"} or {"job_id": "<number>"}
            if let Some(job_id_str) = fields.get("job_id") {
                if let Ok(job_id) = job_id_str.parse::<i64>() {
                    messages.push((message_id.clone(), job_id));
                } else {
                    warn!(message_id, "Invalid job_id field, skipping message");
                }
            } else if let Some(data_str) = fields.get("data") {
                // Try to extract job_id from the JSON payload
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data_str) {
                    if let Some(job_id) = json.get("job_id").and_then(|v| v.as_i64()) {
                        messages.push((message_id.clone(), job_id));
                    } else {
                        warn!(message_id, "JSON payload has no job_id, skipping");
                    }
                } else {
                    warn!(message_id, "Invalid JSON in data field, skipping");
                }
            } else {
                warn!(
                    message_id,
                    "Message has neither job_id nor data field, skipping"
                );
            }
        }
    }
    Ok(messages)
}

/// Acknowledge a processed message so it's removed from the Pending Entries List.
async fn ack_message(pool: &Pool, message_id: &str) -> Result<()> {
    let mut conn = pool.get().await?;
    let _: i64 = deadpool_redis::redis::cmd("XACK")
        .arg(ANALYSIS_STREAM)
        .arg(ANALYSIS_GROUP)
        .arg(message_id)
        .query_async(&mut *conn)
        .await?;
    Ok(())
}

/// Requeue a retryable job as a fresh stream message after its DB row is reset
/// to pending. The current failed delivery is ACKed only after this succeeds.
async fn requeue_job(pool: &Pool, job_id: i64) -> Result<String> {
    let mut conn = pool.get().await?;
    let message_id: String = deadpool_redis::redis::cmd("XADD")
        .arg(ANALYSIS_STREAM)
        .arg("*")
        .arg("job_id")
        .arg(job_id.to_string())
        .query_async(&mut *conn)
        .await?;
    Ok(message_id)
}

/// Main processing loop: read messages, process jobs, ACK on success.
async fn run_loop(pg_pool: sqlx::PgPool, redis_pool: Pool, config: &WorkerConfig) -> Result<()> {
    let total_processed = Arc::new(AtomicUsize::new(0));
    let total_failed = Arc::new(AtomicUsize::new(0));
    let mut consecutive_errors: u32 = 0;

    info!(
        consumer = %config.consumer_name,
        "Entering main processing loop"
    );

    loop {
        // Check control signal before each iteration. When paused, skip job
        // pulling entirely and sleep 5 s (matching the normal XREADGROUP BLOCK
        // cadence). Fail-open: Redis errors are treated as "not paused" so a
        // Redis outage doesn't halt all processing.
        if llm_worker::control_signal::check_paused(&redis_pool)
            .await
            .unwrap_or(false)
        {
            tracing::info!("[control] llm-worker is paused, skipping job pull");
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            continue;
        }

        match read_messages(&redis_pool, &config.consumer_name, 10).await {
            Ok(messages) => {
                consecutive_errors = 0;

                if messages.is_empty() {
                    continue;
                }

                info!(count = messages.len(), "Received analysis jobs");

                for (message_id, job_id) in messages {
                    info!(job_id, message_id = %message_id, "Processing analysis job");

                    match processor::process_job(&pg_pool, config, job_id).await {
                        Ok(()) => {
                            total_processed.fetch_add(1, Ordering::Relaxed);
                            if let Err(e) = ack_message(&redis_pool, &message_id).await {
                                error!(
                                    job_id,
                                    message_id = %message_id,
                                    error = %e,
                                    "ACK failed — message stays in PEL"
                                );
                            }
                        }
                        Err(e) => {
                            total_failed.fetch_add(1, Ordering::Relaxed);
                            error!(job_id, error = %e, "Job processing failed");
                            let error_text = e.to_string();
                            if error_text.contains("retry scheduled") {
                                match requeue_job(&redis_pool, job_id).await {
                                    Ok(new_message_id) => {
                                        info!(
                                            job_id,
                                            old_message_id = %message_id,
                                            new_message_id = %new_message_id,
                                            "Requeued transient LLM job"
                                        );
                                        if let Err(ack_error) =
                                            ack_message(&redis_pool, &message_id).await
                                        {
                                            error!(
                                                job_id,
                                                message_id = %message_id,
                                                error = %ack_error,
                                                "ACK failed after retry requeue"
                                            );
                                        }
                                    }
                                    Err(requeue_error) => {
                                        error!(
                                            job_id,
                                            message_id = %message_id,
                                            error = %requeue_error,
                                            "Retry requeue failed — message stays in PEL"
                                        );
                                    }
                                }
                            } else if error_text.contains("max retries exceeded") {
                                if let Err(ack_error) = ack_message(&redis_pool, &message_id).await
                                {
                                    error!(
                                        job_id,
                                        message_id = %message_id,
                                        error = %ack_error,
                                        "ACK failed after max retries"
                                    );
                                }
                            } else {
                                // Do NOT ACK unexpected DB/logic errors; leave them
                                // in PEL for manual XCLAIM or future recovery tooling.
                            }
                        }
                    }
                }

                let processed = total_processed.load(Ordering::Relaxed);
                let failed = total_failed.load(Ordering::Relaxed);
                info!(processed, failed, "Batch complete");
            }
            Err(e) => {
                consecutive_errors += 1;
                error!(
                    error = %e,
                    consecutive_errors,
                    "Failed to read from Redis stream"
                );
                let delay = std::time::Duration::from_millis(
                    (1000 * 2u64.pow(consecutive_errors.min(6))).min(60_000),
                );
                warn!(?delay, "Backing off before retry");
                tokio::time::sleep(delay).await;
            }
        }
    }
}
