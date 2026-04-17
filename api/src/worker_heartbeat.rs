//! Internal heartbeat endpoint for judge workers.
//!
//! Per D-08: Workers POST heartbeat every 10 seconds.
//! Per D-10: Heartbeat data stored in Redis hash with 30-second TTL.
//! Auth: X-Worker-Secret header validated with constant-time comparison.

use api_infra::error::AppError;
use api_infra::state::AppState;
use axum::extract::State;
use axum::http::HeaderMap;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct HeartbeatRequest {
    pub worker_id: String,
    pub active_judgements: usize,
    pub total_processed: usize,
    pub avg_wait_ms: usize,
    pub redis_breaker_state: String,
    pub api_breaker_state: String,
}

/// POST /internal/worker/heartbeat
///
/// Validates the worker secret and stores heartbeat data in Redis.
/// Key format: `worker:heartbeat:{worker_id}` with 30-second TTL.
pub async fn handle_heartbeat(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<HeartbeatRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Validate worker secret (constant-time comparison, same pattern as domain-submissions routes.rs)
    let provided_secret = headers
        .get("X-Worker-Secret")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let expected = state.worker_secret.as_bytes();
    let provided = provided_secret.as_bytes();
    let secret_valid = provided.len() == expected.len()
        && provided
            .iter()
            .zip(expected.iter())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
        == 0;
    if !secret_valid {
        return Err(AppError::Auth("Invalid or missing worker secret".into()));
    }

    // Store in Redis hash with 30s TTL (per D-08)
    let redis_pool = state
        .redis_pool
        .as_ref()
        .ok_or_else(|| AppError::Internal("Redis not configured".into()))?;
    let mut conn = redis_pool
        .get()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let key = format!("worker:heartbeat:{}", payload.worker_id);
    let last_seen = chrono::Utc::now().to_rfc3339();

    // HSET fields
    let mut cmd = deadpool_redis::redis::cmd("HSET");
    cmd.arg(&key)
        .arg("worker_id")
        .arg(&payload.worker_id)
        .arg("active_judgements")
        .arg(payload.active_judgements)
        .arg("total_processed")
        .arg(payload.total_processed)
        .arg("avg_wait_ms")
        .arg(payload.avg_wait_ms)
        .arg("redis_breaker_state")
        .arg(&payload.redis_breaker_state)
        .arg("api_breaker_state")
        .arg(&payload.api_breaker_state)
        .arg("last_seen")
        .arg(&last_seen);
    cmd.query_async::<()>(&mut conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // EXPIRE 30s
    deadpool_redis::redis::cmd("EXPIRE")
        .arg(&key)
        .arg(30)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(serde_json::json!({"status": "ok"})))
}
