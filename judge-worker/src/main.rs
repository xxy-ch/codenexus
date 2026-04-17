use anyhow::Result;
use redis::Client;
use std::env;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use tokio::sync::Semaphore;
use tracing::{error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[allow(dead_code)]
mod compiler;
mod circuit_breaker;
#[allow(dead_code)]
mod db;
mod heartbeat;
mod processor;
#[allow(dead_code)]
mod queue;
#[allow(dead_code)]
mod sandbox;

use circuit_breaker::CircuitBreaker;
use queue::consumer;

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
    let stream_name =
        env::var("SUBMISSION_STREAM").unwrap_or_else(|_| "submissions".to_string());
    let contest_stream =
        env::var("CONTEST_STREAM").unwrap_or_else(|_| "submissions:contest".to_string());
    let group_name =
        env::var("CONSUMER_GROUP").unwrap_or_else(|_| "judge_workers".to_string());
    let consumer_name =
        env::var("CONSUMER_NAME").unwrap_or_else(|_| format!("worker-{}", uuid::Uuid::new_v4()));

    let max_concurrent: usize = env::var("MAX_CONCURRENT_JUDGES")
        .unwrap_or_else(|_| "4".to_string())
        .parse()
        .unwrap_or(4);
    info!("Max concurrent judges: {}", max_concurrent);

    info!("Connecting to Redis at {}", redis_url);
    let redis_client = Client::open(redis_url)?;

    // Create a single shared MultiplexedConnection reused across all calls
    let conn = redis_client.get_multiplexed_async_connection().await?;
    let conn = Arc::new(tokio::sync::Mutex::new(conn));

    // Ensure consumer groups exist on BOTH streams (per Pitfall 2 in RESEARCH.md)
    info!(
        "Setting up consumer group '{}' on streams '{}' and '{}'",
        group_name, stream_name, contest_stream
    );
    consumer::ensure_consumer_group(&mut *conn.lock().await, &stream_name, &group_name).await?;
    consumer::ensure_consumer_group(&mut *conn.lock().await, &contest_stream, &group_name)
        .await?;

    // Create per-dependency circuit breakers (per D-04)
    let redis_breaker = Arc::new(CircuitBreaker::new(5, 30));
    let api_breaker = Arc::new(CircuitBreaker::new(5, 30));

    // Shared atomic counters for heartbeat reporting (per D-08, D-10)
    let active_count = Arc::new(AtomicUsize::new(0));
    let total_processed = Arc::new(AtomicUsize::new(0));
    let avg_wait_ms = Arc::new(AtomicUsize::new(0));

    // Recover pending submissions from crashed workers on both streams
    let recovery_idle_ms: u64 = env::var("RECOVERY_IDLE_MS")
        .unwrap_or_else(|_| "300000".to_string())
        .parse()
        .unwrap_or(300000);

    // Recover from normal stream
    recover_stream(
        &conn,
        &stream_name,
        &group_name,
        &consumer_name,
        &api_url,
        recovery_idle_ms,
    )
    .await;

    // Recover from contest stream
    recover_stream(
        &conn,
        &contest_stream,
        &group_name,
        &consumer_name,
        &api_url,
        recovery_idle_ms,
    )
    .await;

    info!("Judge worker ready with consumer name: {}", consumer_name);
    info!("Connected to API at: {}", api_url);

    // Spawn heartbeat background task (per D-08, D-10)
    let worker_secret =
        env::var("WORKER_SECRET").unwrap_or_else(|_| "dev-only-insecure-worker-secret-do-not-use-in-production".to_string());
    let _heartbeat_handle = heartbeat::spawn_heartbeat_task(
        api_url.clone(),
        worker_secret,
        consumer_name.clone(),
        active_count.clone(),
        total_processed.clone(),
        avg_wait_ms.clone(),
        redis_breaker.clone(),
        api_breaker.clone(),
    );

    // Enter main processing loop
    run_processing_loop(
        conn,
        &stream_name,
        &contest_stream,
        &group_name,
        &consumer_name,
        &api_url,
        max_concurrent,
        redis_breaker,
        api_breaker,
        active_count,
        total_processed,
        avg_wait_ms,
    )
    .await
}

/// Recover pending submissions from a single stream.
async fn recover_stream(
    conn: &Arc<tokio::sync::Mutex<redis::aio::MultiplexedConnection>>,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
    api_url: &str,
    recovery_idle_ms: u64,
) {
    match queue::recovery::recover_pending_submissions(
        &mut *conn.lock().await,
        stream_name,
        group_name,
        consumer_name,
        recovery_idle_ms,
    )
    .await
    {
        Ok(recovered) => {
            if !recovered.is_empty() {
                info!(
                    "Recovered {} pending submissions from '{}', processing them now",
                    recovered.len(),
                    stream_name
                );
                for (message_id, submission) in recovered {
                    let result = processor::service::process_submission(&submission).await;
                    match result {
                        Ok(judge_result) => {
                            let should_ack =
                                match send_result_with_retry(api_url, &judge_result, conn).await {
                                    Ok(DeliveryOutcome::Delivered) => true,
                                    Ok(DeliveryOutcome::StoredInDlq) => {
                                        warn!(
                                            "Recovered submission {} stored in DLQ (API unreachable)",
                                            submission.submission_id
                                        );
                                        true
                                    }
                                    Err(e) => {
                                        error!(
                                            "Recovered submission {} delivery AND DLQ failed (will retry on next startup): {}",
                                            submission.submission_id, e
                                        );
                                        false
                                    }
                                };

                            if should_ack {
                                if let Err(e) = acknowledge_with_retry(
                                    conn,
                                    stream_name,
                                    group_name,
                                    &message_id,
                                )
                                .await
                                {
                                    error!(
                                        "Recovered message {} ACK failed after retries: {}. \
                                         Message stays in PEL for next recovery cycle.",
                                        message_id, e
                                    );
                                }
                            }
                        }
                        Err(e) => {
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
            warn!(
                "Recovery scan failed for stream '{}' (non-fatal, continuing): {}",
                stream_name, e
            );
        }
    }
}

/// RAII guard that increments active_count on creation and decrements on drop.
/// Used to track the number of concurrently active judging tasks for heartbeat reporting.
struct ActiveGuard {
    active_count: Arc<AtomicUsize>,
}

impl ActiveGuard {
    fn new(active_count: &Arc<AtomicUsize>) -> Self {
        active_count.fetch_add(1, Ordering::Relaxed);
        Self {
            active_count: Arc::clone(active_count),
        }
    }
}

impl Drop for ActiveGuard {
    fn drop(&mut self) {
        self.active_count.fetch_sub(1, Ordering::Relaxed);
    }
}

async fn run_processing_loop(
    conn: Arc<tokio::sync::Mutex<redis::aio::MultiplexedConnection>>,
    stream_name: &str,
    contest_stream: &str,
    group_name: &str,
    consumer_name: &str,
    api_url: &str,
    max_concurrent: usize,
    redis_breaker: Arc<CircuitBreaker>,
    api_breaker: Arc<CircuitBreaker>,
    active_count: Arc<AtomicUsize>,
    total_processed: Arc<AtomicUsize>,
    avg_wait_ms: Arc<AtomicUsize>,
) -> Result<()> {
    info!("Starting main processing loop (max concurrent: {})", max_concurrent);

    let semaphore = Arc::new(Semaphore::new(max_concurrent));
    let mut error_count: u32 = 0;

    loop {
        match consume_and_process(
            &conn,
            stream_name,
            contest_stream,
            group_name,
            consumer_name,
            api_url,
            &semaphore,
            &redis_breaker,
            &api_breaker,
            &active_count,
            &total_processed,
            &avg_wait_ms,
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
    contest_stream: &str,
    group_name: &str,
    consumer_name: &str,
    api_url: &str,
    semaphore: &Arc<Semaphore>,
    redis_breaker: &Arc<CircuitBreaker>,
    api_breaker: &Arc<CircuitBreaker>,
    active_count: &Arc<AtomicUsize>,
    total_processed: &Arc<AtomicUsize>,
    avg_wait_ms: &Arc<AtomicUsize>,
) -> Result<usize> {
    // Use dual-stream priority consumer (contest first, then normal)
    let messages = {
        if !redis_breaker.allow_request() {
            warn!("Redis circuit breaker open, skipping consume");
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            return Ok(0);
        }
        let mut locked_conn = conn.lock().await;
        match consumer::consume_priority(
            &mut locked_conn,
            contest_stream,
            stream_name,
            group_name,
            consumer_name,
        )
        .await
        {
            Ok(msgs) => {
                redis_breaker.record_success();
                msgs
            }
            Err(e) => {
                redis_breaker.record_failure();
                return Err(e);
            }
        }
    };

    if messages.is_empty() {
        return Ok(0);
    }

    // Process messages concurrently
    let mut handles = Vec::with_capacity(messages.len());

    for (message_id, submission, origin_stream, school_id) in messages {
        let permit = semaphore.clone().acquire_owned().await?;
        let conn = Arc::clone(conn);
        let group_name = group_name.to_string();
        let api_url = api_url.to_string();
        let redis_breaker = Arc::clone(redis_breaker);
        let api_breaker = Arc::clone(api_breaker);
        let active_count = Arc::clone(active_count);
        let total_processed = Arc::clone(total_processed);
        let avg_wait_ms = Arc::clone(avg_wait_ms);

        let handle = tokio::spawn(async move {
            let _permit = permit;
            let _guard = ActiveGuard::new(&active_count);
            let start = std::time::Instant::now();

            info!(
                "Processing submission {} (message ID: {}, stream: {})",
                submission.submission_id, message_id, origin_stream
            );

            let result = processor::service::process_submission(&submission).await;

            // Serialize submission for DLQ storage so retry endpoint can re-enqueue
            // a worker-consumable SubmissionMessage (not a JudgeResult).
            let original_msg_json = serde_json::to_string(&submission).unwrap_or_default();

            match result {
                Ok(judge_result) => {
                    let should_ack =
                        match send_result_with_retry_breaker(
                            &api_url,
                            &judge_result,
                            &conn,
                            &api_breaker,
                            &origin_stream,
                            None,
                            &original_msg_json,
                            school_id,
                        )
                        .await
                        {
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
                        // ACK using origin stream name (per Pitfall 3)
                        match acknowledge_with_retry_breaker(
                            &conn,
                            &origin_stream,
                            &group_name,
                            &message_id,
                            &redis_breaker,
                        )
                        .await
                        {
                            Ok(_) => {
                                info!(
                                    "Submission {} completed and acknowledged",
                                    submission.submission_id
                                );
                                // Update heartbeat metrics
                                total_processed.fetch_add(1, Ordering::Relaxed);
                                let elapsed_ms = start.elapsed().as_millis() as usize;
                                // Simple exponential moving average for avg_wait_ms
                                let prev = avg_wait_ms.load(Ordering::Relaxed);
                                let new_avg = if prev == 0 { elapsed_ms } else { (prev * 7 + elapsed_ms * 3) / 10 };
                                avg_wait_ms.store(new_avg, Ordering::Relaxed);
                                true
                            }
                            Err(_) => false,
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

/// Acknowledge a Redis Stream message with short retries and circuit breaker.
async fn acknowledge_with_retry_breaker(
    conn: &Arc<tokio::sync::Mutex<redis::aio::MultiplexedConnection>>,
    stream_name: &str,
    group_name: &str,
    message_id: &str,
    redis_breaker: &CircuitBreaker,
) -> Result<()> {
    if !redis_breaker.allow_request() {
        warn!(
            "Redis breaker open, skipping ACK for message {}",
            message_id
        );
        return Err(anyhow::anyhow!("Redis circuit breaker open"));
    }

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
            Ok(_) => {
                redis_breaker.record_success();
                return Ok(());
            }
            Err(e) if attempt + 1 < max_retries => {
                warn!(
                    "ACK attempt {}/{} failed for message {}: {}, retrying",
                    attempt + 1,
                    max_retries,
                    message_id,
                    e
                );
                drop(locked_conn);
                tokio::time::sleep(std::time::Duration::from_millis(200)).await;
            }
            Err(e) => {
                redis_breaker.record_failure();
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

/// Acknowledge a Redis Stream message with short retries (no circuit breaker).
/// Used during startup recovery.
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
                    attempt + 1,
                    max_retries,
                    message_id,
                    e
                );
                drop(locked_conn);
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
    /// API accepted the result -- safe to ACK.
    Delivered,
    /// API rejected but result was written to DLQ -- safe to ACK.
    StoredInDlq,
}

/// Send result to API with retry, circuit breaker protection, and jitter.
///
/// `origin_stream` and `submitted_at` are stored in the DLQ entry so the retry
/// endpoint can route back to the correct stream. `original_message` is the
/// serialized `SubmissionMessage` so retry re-enqueues a worker-consumable payload.
async fn send_result_with_retry_breaker(
    api_url: &str,
    result: &queue::JudgeResult,
    conn: &Arc<tokio::sync::Mutex<redis::aio::MultiplexedConnection>>,
    api_breaker: &Arc<CircuitBreaker>,
    origin_stream: &str,
    submitted_at: Option<&str>,
    original_message: &str,
    school_id: Option<i64>,
) -> Result<DeliveryOutcome> {
    let max_retries: u32 = 3;
    let mut attempt: u32 = 0;

    loop {
        // Check API circuit breaker before attempting
        if !api_breaker.allow_request() {
            warn!(
                "API circuit breaker open for submission {}, attempting DLQ write",
                result.submission_id
            );
            let mut locked_conn = conn.lock().await;
            match queue::dlq::write_to_dlq(
                &mut locked_conn,
                result,
                "API circuit breaker open",
                Some(origin_stream),
                submitted_at,
                Some(original_message),
                school_id,
            )
            .await
            {
                Ok(()) => return Ok(DeliveryOutcome::StoredInDlq),
                Err(dlq_err) => {
                    error!(
                        "Failed to write submission {} to DLQ: {}",
                        result.submission_id, dlq_err
                    );
                    return Err(anyhow::anyhow!("API circuit breaker open and DLQ write failed"));
                }
            }
        }

        match send_result_to_api(api_url, result).await {
            Ok(()) => {
                api_breaker.record_success();
                return Ok(DeliveryOutcome::Delivered);
            }
            Err(e) => {
                api_breaker.record_failure();
                attempt += 1;
                if attempt >= max_retries {
                    warn!(
                        "All {} retries exhausted for submission {}. Writing to DLQ. Last error: {}",
                        max_retries, result.submission_id, e
                    );
                    let mut locked_conn = conn.lock().await;
                    match queue::dlq::write_to_dlq(
                        &mut locked_conn,
                        result,
                        &e.to_string(),
                        Some(origin_stream),
                        submitted_at,
                        Some(original_message),
                        school_id,
                    )
                    .await
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
                // Exponential backoff with jitter
                let base_delay = 1u64 << attempt.min(3); // 2, 4, 8 seconds
                let jitter = (chrono::Utc::now()
                    .timestamp_nanos_opt()
                    .unwrap_or(0)
                    .unsigned_abs()
                    % 500) as u64; // 0-499ms
                let delay = std::time::Duration::from_millis(base_delay * 1000 + jitter);
                warn!(
                    "Retry {}/{} for submission {} in {:?}: {}",
                    attempt, max_retries, result.submission_id, delay, e
                );
                tokio::time::sleep(delay).await;
            }
        }
    }
}

/// Send result with retry (no circuit breaker). Used during startup recovery.
///
/// Recovery lacks origin stream metadata and original SubmissionMessage, so DLQ entries
/// from this path are not retriable with correct routing data. This is an acceptable
/// limitation -- recovery is rare and these entries should be re-submitted via the API.
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
                    // Recovery path: no origin stream/submitted_at/original_message available.
                    // DLQ entries from recovery will lack retriable data (acceptable limitation).
                    match queue::dlq::write_to_dlq(
                        &mut locked_conn,
                        result,
                        &e.to_string(),
                        Some("submissions"),
                        None,
                        None,
                        None,
                    )
                    .await
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
