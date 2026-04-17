use anyhow::Result;
use redis::Client;
use std::env;
use std::sync::Arc;
use tokio::sync::Semaphore;
use tracing::{error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[allow(dead_code)]
mod compiler;
mod circuit_breaker;
#[allow(dead_code)]
mod db;
mod processor;
#[allow(dead_code)]
mod queue;
#[allow(dead_code)]
mod sandbox;

use queue::consumer;

const MAX_CONCURRENT_SUBMISSIONS: usize = 4;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "judge_worker=debug,redis=warn".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Judge worker starting...");

    // Load configuration
    let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".to_string());
    let api_url = env::var("API_URL").unwrap_or_else(|_| "http://127.0.0.1:3000".to_string());
    let stream_name = env::var("SUBMISSION_STREAM").unwrap_or_else(|_| "submissions".to_string());
    let group_name = env::var("CONSUMER_GROUP").unwrap_or_else(|_| "judge_workers".to_string());
    let consumer_name =
        env::var("CONSUMER_NAME").unwrap_or_else(|_| format!("worker-{}", uuid::Uuid::new_v4()));

    info!("Connecting to Redis at {}", redis_url);
    let redis_client = Client::open(redis_url)?;

    // Create a single shared MultiplexedConnection reused across all calls
    let conn = redis_client.get_multiplexed_async_connection().await?;
    let conn = Arc::new(tokio::sync::Mutex::new(conn));

    // Ensure consumer group exists
    info!(
        "Setting up consumer group '{}' on stream '{}'",
        group_name, stream_name
    );
    consumer::ensure_consumer_group(&mut *conn.lock().await, &stream_name, &group_name).await?;

    // Recover pending submissions from crashed workers (per D-05)
    let recovery_idle_ms: u64 = env::var("RECOVERY_IDLE_MS")
        .unwrap_or_else(|_| "300000".to_string())
        .parse()
        .unwrap_or(300000);

    match queue::recovery::recover_pending_submissions(
        &mut *conn.lock().await,
        &stream_name,
        &group_name,
        &consumer_name,
        recovery_idle_ms,
    )
    .await
    {
        Ok(recovered) => {
            if !recovered.is_empty() {
                info!(
                    "Recovered {} pending submissions, processing them now",
                    recovered.len()
                );
                for (message_id, submission) in recovered {
                    let result = processor::service::process_submission(&submission).await;
                    match result {
                        Ok(judge_result) => {
                            let should_ack = match send_result_with_retry(&api_url, &judge_result, &conn).await {
                                Ok(DeliveryOutcome::Delivered) => true,
                                Ok(DeliveryOutcome::StoredInDlq) => {
                                    warn!(
                                        "Recovered submission {} stored in DLQ (API unreachable)",
                                        submission.submission_id
                                    );
                                    true
                                }
                                Err(e) => {
                                    // Both API and DLQ failed — do NOT ACK, retry on next startup.
                                    error!(
                                        "Recovered submission {} delivery AND DLQ failed (will retry on next startup): {}",
                                        submission.submission_id, e
                                    );
                                    false
                                }
                            };

                            if should_ack {
                                if let Err(e) = acknowledge_with_retry(
                                    &conn, &stream_name, &group_name, &message_id,
                                ).await {
                                    error!(
                                        "Recovered message {} ACK failed after retries: {}. \
                                         Message stays in PEL for next recovery cycle.",
                                        message_id, e
                                    );
                                }
                            }
                        }
                        Err(e) => {
                            // Processing failed — do NOT ACK, let it retry on next startup.
                            // Log loudly so operator can investigate persistent failures.
                            error!(
                                "Failed to process recovered submission {} (message will reappear on next recovery scan): {}",
                                submission.submission_id, e
                            );
                        }
                    }
                }
            }
        }
        Err(e) => {
            warn!("Recovery scan failed (non-fatal, continuing): {}", e);
        }
    }

    info!("Judge worker ready with consumer name: {}", consumer_name);
    info!("Connected to API at: {}", api_url);

    // Enter main processing loop
    run_processing_loop(conn, &stream_name, &group_name, &consumer_name, &api_url).await
}

async fn run_processing_loop(
    conn: Arc<tokio::sync::Mutex<redis::aio::MultiplexedConnection>>,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
    api_url: &str,
) -> Result<()> {
    info!("Starting main processing loop");

    let mut error_count: u32 = 0;

    loop {
        // Block for up to 5 seconds waiting for messages
        match consume_and_process(
            &conn,
            stream_name,
            group_name,
            consumer_name,
            api_url,
            Some(5000),
        )
        .await
        {
            Ok(count) => {
                error_count = 0;
                if count > 0 {
                    info!("Processed {} submission(s)", count);
                }
            }
            Err(e) => {
                error!("Error processing submission: {}", e);
                error_count += 1;
                let delay = tokio::time::Duration::from_millis(
                    (1000 * 2u64.pow(error_count.min(6))).min(60_000),
                );
                warn!("Retrying in {:?} (error count: {})", delay, error_count);
                tokio::time::sleep(delay).await;
            }
        }
    }
}

async fn consume_and_process(
    conn: &Arc<tokio::sync::Mutex<redis::aio::MultiplexedConnection>>,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
    api_url: &str,
    block_ms: Option<u64>,
) -> Result<usize> {
    // Consume messages from queue
    let messages = {
        let mut locked_conn = conn.lock().await;
        consumer::consume_submission(
            &mut locked_conn,
            stream_name,
            group_name,
            consumer_name,
            block_ms,
        )
        .await?
    };

    if messages.is_empty() {
        return Ok(0);
    }

    // Process messages concurrently with a concurrency limit
    let semaphore = Arc::new(Semaphore::new(MAX_CONCURRENT_SUBMISSIONS));
    let mut handles = Vec::with_capacity(messages.len());

    for (message_id, submission) in messages {
        let permit = semaphore.clone().acquire_owned().await?;
        let conn = Arc::clone(conn);
        let stream_name = stream_name.to_string();
        let group_name = group_name.to_string();
        let api_url = api_url.to_string();

        let handle = tokio::spawn(async move {
            let _permit = permit;

            info!(
                "Processing submission {} (message ID: {})",
                submission.submission_id, message_id
            );

            let result = processor::service::process_submission(&submission).await;

            match result {
                Ok(judge_result) => {
                    // Only ACK when the result is safely stored (delivered to API or DLQ).
                    // If both delivery and DLQ fail, do NOT ACK — recover on next startup.
                    let should_ack = match send_result_with_retry(&api_url, &judge_result, &conn).await {
                        Ok(DeliveryOutcome::Delivered) => true,
                        Ok(DeliveryOutcome::StoredInDlq) => {
                            warn!(
                                "Submission {} stored in DLQ (API unreachable)",
                                submission.submission_id
                            );
                            true
                        }
                        Err(e) => {
                            error!(
                                "Submission {} delivery AND DLQ write failed (will retry on next startup): {}",
                                submission.submission_id, e
                            );
                            false
                        }
                    };

                    if should_ack {
                        match acknowledge_with_retry(
                            &conn, &stream_name, &group_name, &message_id,
                        ).await {
                            Ok(_) => {
                                info!(
                                    "Submission {} completed and acknowledged",
                                    submission.submission_id
                                );
                                true
                            }
                            Err(_) => {
                                // ACK retries exhausted — message stays in PEL.
                                // Will be recovered on next startup; API callback is idempotent.
                                false
                            }
                        }
                    } else {
                        false
                    }
                }
                Err(e) => {
                    error!(
                        "Failed to process submission {}: {}",
                        submission.submission_id, e
                    );
                    // Do NOT ACK — let recovery scan pick it up on next startup.
                    false
                }
            }
        });

        handles.push(handle);
    }

    let mut processed = 0;
    for handle in handles {
        if handle.await.unwrap_or(false) {
            processed += 1;
        }
    }

    Ok(processed)
}

/// Acknowledge a Redis Stream message with short retries.
/// Retries up to 3 times with 200ms delay to handle transient Redis errors.
/// If all retries fail, the message stays in the PEL and will be recovered
/// on next startup — the downstream API callback is idempotent (UPSERT).
async fn acknowledge_with_retry(
    conn: &Arc<tokio::sync::Mutex<redis::aio::MultiplexedConnection>>,
    stream_name: &str,
    group_name: &str,
    message_id: &str,
) -> Result<()> {
    let max_retries: u32 = 3;
    for attempt in 0..max_retries {
        let mut locked_conn = conn.lock().await;
        match consumer::acknowledge_submission(
            &mut locked_conn,
            stream_name,
            group_name,
            message_id,
        )
        .await
        {
            Ok(_) => return Ok(()),
            Err(e) if attempt + 1 < max_retries => {
                warn!(
                    "ACK attempt {}/{} failed for message {}: {}, retrying",
                    attempt + 1, max_retries, message_id, e
                );
                drop(locked_conn); // release lock before sleeping
                tokio::time::sleep(std::time::Duration::from_millis(200)).await;
            }
            Err(e) => {
                error!(
                    "All {} ACK attempts failed for message {}: {}. \
                     Message stays in PEL — will be retried on next startup.",
                    max_retries, message_id, e
                );
                return Err(e);
            }
        }
    }
    Ok(())
}

async fn send_result_to_api(api_url: &str, result: &queue::JudgeResult) -> Result<()> {
    use reqwest::Client;

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| anyhow::anyhow!("Failed to create HTTP client: {}", e))?;

    let url = format!("{}/submissions/{}/results", api_url, result.submission_id);

    let response = client
        .post(&url)
        .json(result)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to send result to API: {}", e))?;

    if response.status().is_success() {
        Ok(())
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!("API returned error status {}: {}", status, body)
    }
}

/// Outcome of attempting to deliver a judge result.
/// Used to determine whether the Redis Stream message can be safely ACKed.
enum DeliveryOutcome {
    /// API accepted the result — safe to ACK.
    Delivered,
    /// API rejected but result was written to DLQ — safe to ACK.
    StoredInDlq,
}

async fn send_result_with_retry(
    api_url: &str,
    result: &queue::JudgeResult,
    conn: &Arc<tokio::sync::Mutex<redis::aio::MultiplexedConnection>>,
) -> Result<DeliveryOutcome> {
    let max_retries: u32 = 3;
    let mut attempt: u32 = 0;

    loop {
        match send_result_to_api(api_url, result).await {
            Ok(()) => return Ok(DeliveryOutcome::Delivered),
            Err(e) => {
                attempt += 1;
                if attempt >= max_retries {
                    warn!(
                        "All {} retries exhausted for submission {}. Writing to DLQ. Last error: {}",
                        max_retries, result.submission_id, e
                    );
                    let mut locked_conn = conn.lock().await;
                    match queue::dlq::write_to_dlq(&mut locked_conn, result, &e.to_string()).await
                    {
                        Ok(()) => return Ok(DeliveryOutcome::StoredInDlq),
                        Err(dlq_err) => {
                            error!(
                                "Failed to write submission {} to DLQ: {}",
                                result.submission_id, dlq_err
                            );
                            return Err(e);
                        }
                    }
                }
                let delay = std::time::Duration::from_secs(1 << attempt.min(3));
                warn!(
                    "Retry {}/{} for submission {} in {:?}: {}",
                    attempt, max_retries, result.submission_id, delay, e
                );
                tokio::time::sleep(delay).await;
            }
        }
    }
}
