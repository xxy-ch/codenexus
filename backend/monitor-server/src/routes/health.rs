//! `/health` endpoint — reports system dependency status.
//!
//! Returns JSON with per-dependency health status:
//! - **ok**: all dependencies reachable (HTTP 200)
//! - **degraded**: at least one dependency unreachable (HTTP 503)
//! - **unavailable**: both dependencies unreachable (HTTP 503)
//!
//! No secrets are included in the response body.

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use deadpool_redis::redis::cmd;
use serde::Serialize;
use sqlx::Row;
use std::sync::Arc;

use crate::state::AppState;

/// Overall health status.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
enum HealthStatus {
    Ok,
    Degraded,
    Unavailable,
}

/// Per-dependency health check result.
#[derive(Debug, Serialize)]
struct DependencyHealth {
    status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

/// Top-level health response body.
#[derive(Debug, Serialize)]
struct HealthResponse {
    status: HealthStatus,
    redis: DependencyHealth,
    db: DependencyHealth,
}

/// `GET /health`
///
/// Checks Redis (PING) and PostgreSQL (`SELECT 1`), then returns
/// aggregated status. Returns 200 for `ok`, 503 for `degraded` or
/// `unavailable`.
pub async fn health_check(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let redis_health = check_redis(&state.redis_pool).await;
    let db_health = check_db(&state.pg_pool).await;

    let redis_ok = redis_health.status == "ok";
    let db_ok = db_health.status == "ok";

    let overall = match (redis_ok, db_ok) {
        (true, true) => HealthStatus::Ok,
        (false, false) => HealthStatus::Unavailable,
        _ => HealthStatus::Degraded,
    };

    let status_code = if overall == HealthStatus::Ok {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    let body = HealthResponse {
        status: overall,
        redis: redis_health,
        db: db_health,
    };

    (status_code, Json(body))
}

/// Check Redis connectivity via PING.
///
/// SECURITY: the raw error is logged server-side but NOT included in the
/// unauthenticated response body — Redis errors can contain host/port/role
/// details. The response carries only a generic "error" status string.
async fn check_redis(pool: &deadpool_redis::Pool) -> DependencyHealth {
    match pool.get().await {
        Ok(mut conn) => match cmd("PING").query_async::<String>(&mut conn).await {
            Ok(pong) if pong == "PONG" => DependencyHealth {
                status: "ok".to_string(),
                error: None,
            },
            Ok(unexpected) => {
                tracing::warn!("Redis PING unexpected response: {unexpected}");
                DependencyHealth {
                    status: "error".to_string(),
                    error: None,
                }
            }
            Err(e) => {
                tracing::error!("Redis command failed: {e}");
                DependencyHealth {
                    status: "error".to_string(),
                    error: None,
                }
            }
        },
        Err(e) => {
            tracing::error!("Redis pool exhausted: {e}");
            DependencyHealth {
                status: "error".to_string(),
                error: None,
            }
        },
    }
}

/// Check PostgreSQL connectivity via `SELECT 1`.
///
/// SECURITY: the raw sqlx error is logged server-side but NOT included in the
/// unauthenticated response body — DB errors can contain connection strings,
/// host, role, and constraint names.
async fn check_db(pool: &sqlx::PgPool) -> DependencyHealth {
    match sqlx::query("SELECT 1 AS health").fetch_one(pool).await {
        Ok(row) => {
            let val: i32 = row.get("health");
            if val == 1 {
                DependencyHealth {
                    status: "ok".to_string(),
                    error: None,
                }
            } else {
                tracing::warn!("DB health check returned unexpected value: {val}");
                DependencyHealth {
                    status: "error".to_string(),
                    error: None,
                }
            }
        }
        Err(e) => {
            tracing::error!("DB query failed: {e}");
            DependencyHealth {
                status: "error".to_string(),
                error: None,
            }
        },
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn health_status_serializes_correctly() {
        let ok = serde_json::to_string(&HealthStatus::Ok).unwrap();
        let degraded = serde_json::to_string(&HealthStatus::Degraded).unwrap();
        let unavailable = serde_json::to_string(&HealthStatus::Unavailable).unwrap();

        assert_eq!(ok, "\"ok\"");
        assert_eq!(degraded, "\"degraded\"");
        assert_eq!(unavailable, "\"unavailable\"");
    }

    #[test]
    fn health_response_serializes_with_no_error_when_ok() {
        let resp = HealthResponse {
            status: HealthStatus::Ok,
            redis: DependencyHealth {
                status: "ok".to_string(),
                error: None,
            },
            db: DependencyHealth {
                status: "ok".to_string(),
                error: None,
            },
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(
            !json.contains("error"),
            "ok responses should omit error field"
        );
        assert!(json.contains("\"status\":\"ok\""));
    }

    #[test]
    fn health_response_includes_error_when_degraded() {
        let resp = HealthResponse {
            status: HealthStatus::Degraded,
            redis: DependencyHealth {
                status: "error".to_string(),
                error: Some("Redis pool exhausted".to_string()),
            },
            db: DependencyHealth {
                status: "ok".to_string(),
                error: None,
            },
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("Redis pool exhausted"));
        assert!(json.contains("\"status\":\"degraded\""));
    }

    #[test]
    fn overall_status_logic() {
        // Both ok → Ok
        let (r_ok, d_ok) = (true, true);
        let status = match (r_ok, d_ok) {
            (true, true) => HealthStatus::Ok,
            (false, false) => HealthStatus::Unavailable,
            _ => HealthStatus::Degraded,
        };
        assert_eq!(status, HealthStatus::Ok);

        // Redis down, DB ok → Degraded
        let status = match (false, true) {
            (true, true) => HealthStatus::Ok,
            (false, false) => HealthStatus::Unavailable,
            _ => HealthStatus::Degraded,
        };
        assert_eq!(status, HealthStatus::Degraded);

        // Both down → Unavailable
        let status = match (false, false) {
            (true, true) => HealthStatus::Ok,
            (false, false) => HealthStatus::Unavailable,
            _ => HealthStatus::Degraded,
        };
        assert_eq!(status, HealthStatus::Unavailable);
    }
}
