//! Background heartbeat reporter task.
//!
//! Per D-08: Workers send heartbeat POST to API every 10 seconds.
//! Per D-10: Heartbeat includes breaker states and processing metrics.
//! API stores heartbeat data in Redis with 30-second TTL.

use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Duration;

use serde::Serialize;

use crate::circuit_breaker::CircuitBreaker;

/// Payload sent to the API heartbeat endpoint every 10 seconds.
#[derive(Serialize)]
pub struct HeartbeatPayload {
    pub worker_id: String,
    pub active_judgements: usize,
    pub total_processed: usize,
    pub avg_wait_ms: usize,
    pub redis_breaker_state: String,
    pub api_breaker_state: String,
}

/// Spawn a background task that POSTs heartbeat to API every 10 seconds.
///
/// Per D-08: interval 10s, Redis TTL 30s on the API side.
/// The task runs for the lifetime of the worker process.
pub fn spawn_heartbeat_task(
    api_url: String,
    worker_secret: String,
    worker_id: String,
    active_count: Arc<AtomicUsize>,
    total_processed: Arc<AtomicUsize>,
    avg_wait_ms: Arc<AtomicUsize>,
    redis_breaker: Arc<CircuitBreaker>,
    api_breaker: Arc<CircuitBreaker>,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap();
        let mut interval = tokio::time::interval(Duration::from_secs(10));

        loop {
            interval.tick().await;

            let payload = HeartbeatPayload {
                worker_id: worker_id.clone(),
                active_judgements: active_count.load(Ordering::Relaxed),
                total_processed: total_processed.load(Ordering::Relaxed),
                avg_wait_ms: avg_wait_ms.load(Ordering::Relaxed),
                redis_breaker_state: format!("{:?}", redis_breaker.state()),
                api_breaker_state: format!("{:?}", api_breaker.state()),
            };

            let result = client
                .post(format!("{}/internal/worker/heartbeat", api_url))
                .header("X-Worker-Secret", &worker_secret)
                .json(&payload)
                .send()
                .await;

            if let Err(e) = result {
                tracing::warn!("Heartbeat failed: {}", e);
            }
        }
    })
}
