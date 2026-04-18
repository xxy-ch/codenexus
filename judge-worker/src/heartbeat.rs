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

/// Number of consecutive heartbeat failures before escalating log level to error.
const HEARTBEAT_FAILURE_THRESHOLD: usize = 3;

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

/// Result of handling a single heartbeat HTTP response.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HeartbeatStatus {
    /// The API accepted the heartbeat (2xx response).
    Success,
    /// The API returned a non-2xx status code.
    HttpError(u16),
    /// The network request itself failed (connection refused, timeout, etc.).
    NetworkError,
}

/// Process a completed heartbeat HTTP response, logging warnings for failures.
///
/// Returns a [`HeartbeatStatus`] indicating the outcome.
/// Separated from the loop for testability.
pub async fn handle_heartbeat_response(
    result: Result<reqwest::Response, reqwest::Error>,
) -> HeartbeatStatus {
    match result {
        Ok(response) => {
            if response.status().is_success() {
                HeartbeatStatus::Success
            } else {
                let status = response.status();
                let body = response.text().await.unwrap_or_else(|e| {
                    tracing::warn!(
                        "Heartbeat: failed to read error response body (status={}): {}",
                        status,
                        e
                    );
                    format!("(failed to read response body: {})", e)
                });
                tracing::warn!(
                    "Heartbeat received non-2xx response: status={}, body={}",
                    status,
                    body
                );
                HeartbeatStatus::HttpError(status.as_u16())
            }
        }
        Err(e) => {
            tracing::warn!("Heartbeat request failed: {}", e);
            HeartbeatStatus::NetworkError
        }
    }
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
        let mut consecutive_failures: usize = 0;

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

            // handle_heartbeat_response logs warnings for non-2xx / network errors
            let status = handle_heartbeat_response(result).await;
            match status {
                HeartbeatStatus::Success => {
                    if consecutive_failures > 0 {
                        tracing::info!(
                            "Heartbeat recovered after {} consecutive failure(s)",
                            consecutive_failures
                        );
                    }
                    consecutive_failures = 0;
                }
                HeartbeatStatus::HttpError(code) => {
                    consecutive_failures += 1;
                    if consecutive_failures >= HEARTBEAT_FAILURE_THRESHOLD {
                        tracing::error!(
                            "Heartbeat has failed {} consecutive time(s) (last: HTTP {}). \
                             Worker may be missing from admin monitoring.",
                            consecutive_failures, code
                        );
                    }
                }
                HeartbeatStatus::NetworkError => {
                    consecutive_failures += 1;
                    if consecutive_failures >= HEARTBEAT_FAILURE_THRESHOLD {
                        tracing::error!(
                            "Heartbeat has failed {} consecutive time(s) (network error). \
                             API may be unreachable. Worker is missing from admin monitoring.",
                            consecutive_failures
                        );
                    }
                }
            }
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::SocketAddr;

    /// Spawn a tiny HTTP server that responds with the given status code and body.
    /// Returns the server address so the client can connect to it.
    async fn spawn_mock_server(status_code: u16, body: &'static str) -> SocketAddr {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            if let Ok((mut stream, _)) = listener.accept().await {
                use tokio::io::{AsyncReadExt, AsyncWriteExt};
                let mut buf = vec![0u8; 4096];
                // Read the request (we don't care about its content)
                let _ = stream.read(&mut buf).await;
                let response = format!(
                    "HTTP/1.1 {} OK\r\ncontent-length: {}\r\n\r\n{}",
                    status_code,
                    body.len(),
                    body
                );
                let _ = stream.write_all(response.as_bytes()).await;
                let _ = stream.flush().await;
            }
        });
        addr
    }

    /// Verify that a 200 response is reported as Success.
    #[tokio::test]
    async fn success_response_returns_success() {
        let addr = spawn_mock_server(200, "ok").await;
        let url = format!("http://{}", addr);

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap();

        let result = client
            .post(format!("{}/internal/worker/heartbeat", url))
            .json(&HeartbeatPayload {
                worker_id: "test".into(),
                active_judgements: 0,
                total_processed: 0,
                avg_wait_ms: 0,
                redis_breaker_state: "Closed".into(),
                api_breaker_state: "Closed".into(),
            })
            .send()
            .await;

        let status = handle_heartbeat_response(result).await;
        assert_eq!(status, HeartbeatStatus::Success);
    }

    /// Verify that a 401 response is reported as HttpError(401), not silently ignored.
    #[tokio::test]
    async fn unauthorized_response_returns_http_error() {
        let addr = spawn_mock_server(401, "unauthorized").await;
        let url = format!("http://{}", addr);

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap();

        let result = client
            .post(format!("{}/internal/worker/heartbeat", url))
            .json(&HeartbeatPayload {
                worker_id: "test".into(),
                active_judgements: 0,
                total_processed: 0,
                avg_wait_ms: 0,
                redis_breaker_state: "Closed".into(),
                api_breaker_state: "Closed".into(),
            })
            .send()
            .await;

        let status = handle_heartbeat_response(result).await;
        assert_eq!(status, HeartbeatStatus::HttpError(401));
    }

    /// Verify that a 500 response is reported as HttpError(500).
    #[tokio::test]
    async fn server_error_response_returns_http_error() {
        let addr = spawn_mock_server(500, "internal server error").await;
        let url = format!("http://{}", addr);

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap();

        let result = client
            .post(format!("{}/internal/worker/heartbeat", url))
            .json(&HeartbeatPayload {
                worker_id: "test".into(),
                active_judgements: 0,
                total_processed: 0,
                avg_wait_ms: 0,
                redis_breaker_state: "Closed".into(),
                api_breaker_state: "Closed".into(),
            })
            .send()
            .await;

        let status = handle_heartbeat_response(result).await;
        assert_eq!(status, HeartbeatStatus::HttpError(500));
    }

    /// Verify that a 403 response is reported as HttpError(403).
    #[tokio::test]
    async fn forbidden_response_returns_http_error() {
        let addr = spawn_mock_server(403, "forbidden").await;
        let url = format!("http://{}", addr);

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap();

        let result = client
            .post(format!("{}/internal/worker/heartbeat", url))
            .json(&HeartbeatPayload {
                worker_id: "test".into(),
                active_judgements: 0,
                total_processed: 0,
                avg_wait_ms: 0,
                redis_breaker_state: "Closed".into(),
                api_breaker_state: "Closed".into(),
            })
            .send()
            .await;

        let status = handle_heartbeat_response(result).await;
        assert_eq!(status, HeartbeatStatus::HttpError(403));
    }

    /// Verify that a network error (connection refused) is reported as NetworkError.
    #[tokio::test]
    async fn network_error_returns_network_error() {
        // Bind to port 0 and immediately drop to guarantee connection refused
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        drop(listener); // Free the port so connections are refused

        let url = format!("http://{}", addr);
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(2))
            .build()
            .unwrap();

        let result = client
            .post(format!("{}/internal/worker/heartbeat", url))
            .json(&HeartbeatPayload {
                worker_id: "test".into(),
                active_judgements: 0,
                total_processed: 0,
                avg_wait_ms: 0,
                redis_breaker_state: "Closed".into(),
                api_breaker_state: "Closed".into(),
            })
            .send()
            .await;

        let status = handle_heartbeat_response(result).await;
        assert_eq!(status, HeartbeatStatus::NetworkError);
    }
}
