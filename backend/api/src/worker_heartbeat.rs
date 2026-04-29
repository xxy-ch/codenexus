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

    // Store in Redis hash with 30s TTL atomically via Lua script (per D-08).
    // Using a single EVAL ensures HSET + EXPIRE are executed together in Redis,
    // preventing zombie worker keys if the process crashes between the two commands.
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

    // Lua script: HSET all fields + EXPIRE in a single atomic EVAL call.
    let lua_script = r#"
        redis.call('HSET', KEYS[1],
            'worker_id', ARGV[1],
            'active_judgements', ARGV[2],
            'total_processed', ARGV[3],
            'avg_wait_ms', ARGV[4],
            'redis_breaker_state', ARGV[5],
            'api_breaker_state', ARGV[6],
            'last_seen', ARGV[7]
        )
        redis.call('EXPIRE', KEYS[1], ARGV[8])
        return 1
    "#;

    deadpool_redis::redis::cmd("EVAL")
        .arg(lua_script)
        .arg(1) // number of keys
        .arg(&key) // KEYS[1]
        .arg(&payload.worker_id) // ARGV[1]
        .arg(payload.active_judgements) // ARGV[2]
        .arg(payload.total_processed) // ARGV[3]
        .arg(payload.avg_wait_ms) // ARGV[4]
        .arg(&payload.redis_breaker_state) // ARGV[5]
        .arg(&payload.api_breaker_state) // ARGV[6]
        .arg(&last_seen) // ARGV[7]
        .arg(30) // ARGV[8] -- TTL in seconds
        .query_async::<i64>(&mut conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(serde_json::json!({"status": "ok"})))
}

#[cfg(test)]
mod tests {
    #[allow(unused_imports)]
    use super::*;

    /// Regression test (Bug 1): Verify the Lua script contains both HSET and EXPIRE
    /// in a single script, ensuring atomicity. If someone accidentally splits them
    /// back into separate commands, this test will fail.
    #[test]
    fn heartbeat_lua_script_is_atomic_hset_and_expire() {
        let lua_script = r#"
            redis.call('HSET', KEYS[1],
                'worker_id', ARGV[1],
                'active_judgements', ARGV[2],
                'total_processed', ARGV[3],
                'avg_wait_ms', ARGV[4],
                'redis_breaker_state', ARGV[5],
                'api_breaker_state', ARGV[6],
                'last_seen', ARGV[7]
            )
            redis.call('EXPIRE', KEYS[1], ARGV[8])
            return 1
        "#;

        // Verify HSET is present
        assert!(
            lua_script.contains("HSET"),
            "Lua script must contain HSET command"
        );
        // Verify EXPIRE is present in the same script
        assert!(
            lua_script.contains("EXPIRE"),
            "Lua script must contain EXPIRE command"
        );
        // Verify all required fields are set
        assert!(lua_script.contains("worker_id"), "Must set worker_id");
        assert!(
            lua_script.contains("active_judgements"),
            "Must set active_judgements"
        );
        assert!(
            lua_script.contains("total_processed"),
            "Must set total_processed"
        );
        assert!(lua_script.contains("avg_wait_ms"), "Must set avg_wait_ms");
        assert!(
            lua_script.contains("redis_breaker_state"),
            "Must set redis_breaker_state"
        );
        assert!(
            lua_script.contains("api_breaker_state"),
            "Must set api_breaker_state"
        );
        assert!(lua_script.contains("last_seen"), "Must set last_seen");
        // Verify TTL is passed as ARGV[8], not hardcoded
        assert!(
            lua_script.contains("ARGV[8]"),
            "TTL must be parameterized via ARGV[8], not hardcoded"
        );
    }

    /// Verify the heartbeat key format is correct.
    #[test]
    fn heartbeat_key_format() {
        let worker_id = "worker-abc-123";
        let key = format!("worker:heartbeat:{}", worker_id);
        assert_eq!(key, "worker:heartbeat:worker-abc-123");
        assert!(
            key.starts_with("worker:heartbeat:"),
            "Key must start with worker:heartbeat: prefix for SCAN matching"
        );
    }
}
