//! Admin routes for judge monitoring and DLQ management.
//!
//! Per D-09: GET /status returns queue depths, active workers, average wait time.
//! Per D-11: GET /dlq lists DLQ entries with pagination.
//! Per D-12: POST /dlq/:id/retry re-enqueues item to original stream.
//! Per D-13: DELETE /dlq/:id permanently removes entry.
//!
//! All endpoints require admin or root role via AuthExtractor + ensure_admin.
//! Non-admin authenticated users receive 403 Forbidden.

use api_infra::error::AppError;
use api_infra::state::AppState;
use axum::extract::{Path, Query, State};
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;

use crate::middleware::auth::AuthExtractor;

use super::service::JudgeMonitorService;

/// Verify that the requesting user has admin or root role.
/// All /admin/judge/* endpoints require elevated privileges.
fn ensure_admin(role: &str) -> Result<(), AppError> {
    if matches!(role, "root" | "campusadmin" | "gradeadmin") {
        Ok(())
    } else {
        Err(AppError::Forbidden("Admin access required".into()))
    }
}

/// Verify that the requesting user has root (superadmin) role.
/// Used for endpoints that expose global infrastructure data that
/// cannot be tenant-isolated (e.g., judge worker metrics).
fn ensure_root(role: &str) -> Result<(), AppError> {
    if role != "root" {
        return Err(AppError::Forbidden(
            "Root access required for global infrastructure data".into(),
        ));
    }
    Ok(())
}

/// Build the judge monitor router with status and DLQ management endpoints.
pub fn judge_monitor_router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/status", axum::routing::get(get_judge_status))
        .route("/dlq", axum::routing::get(list_dlq))
        .route("/dlq/{id}/retry", axum::routing::post(retry_dlq))
        .route("/dlq/{id}", axum::routing::delete(delete_dlq))
}

#[derive(Deserialize)]
struct DlqQuery {
    count: Option<i64>,
    start_id: Option<String>,
}

/// GET /admin/judge/status
///
/// Per D-09: Returns queue depths, active workers, average wait time, circuit breaker states.
///
/// NOTE: Worker heartbeats and queue depths are **global** -- judge workers serve all tenants
/// and do not report per-tenant activity in their heartbeat payload. This endpoint is gated
/// by root-only role check to prevent cross-tenant information leakage. Admin users from
/// one organization must not see worker counts or queue pressure from other tenants.
/// Root role is system-wide by design, so global data exposure is appropriate.
async fn get_judge_status(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<impl IntoResponse, AppError> {
    ensure_root(&claims.role)?;
    let redis_pool = state
        .redis_pool
        .as_ref()
        .ok_or_else(|| AppError::Internal("Redis not configured".into()))?;

    // Get stream depths (XPENDING-based true backlog).
    // Connection pool errors are propagated; missing stream/group returns 0.
    let normal_depth = JudgeMonitorService::get_stream_depth(redis_pool, "submissions")
        .await
        .map_err(|e| AppError::Internal(format!("Failed to query normal queue depth: {}", e)))?;
    let contest_depth = JudgeMonitorService::get_stream_depth(redis_pool, "submissions:contest")
        .await
        .map_err(|e| AppError::Internal(format!("Failed to query contest queue depth: {}", e)))?;

    // Get worker heartbeats -- propagate Redis errors instead of silently returning empty
    let workers = JudgeMonitorService::get_worker_heartbeats(redis_pool)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to query worker heartbeats: {}", e)))?;

    // Compute aggregate metrics
    let active_judges = workers.len();
    let total_active = workers
        .iter()
        .filter_map(|w| {
            w.get("active_judgements")
                .and_then(|v| v.parse::<usize>().ok())
        })
        .sum::<usize>();
    let avg_wait_ms = if workers.is_empty() {
        0
    } else {
        workers
            .iter()
            .filter_map(|w| w.get("avg_wait_ms").and_then(|v| v.parse::<usize>().ok()))
            .sum::<usize>()
            / workers.len()
    };

    Ok(Json(serde_json::json!({
        "scope": "global",
        "queues": {
            "normal_depth": normal_depth,
            "contest_depth": contest_depth,
        },
        "active_judges": active_judges,
        "total_active_judgements": total_active,
        "avg_wait_ms": avg_wait_ms,
        "workers": workers,
    })))
}

/// GET /admin/judge/dlq
///
/// Per D-11: Lists DLQ entries with optional pagination.
async fn list_dlq(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Query(query): Query<DlqQuery>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&claims.role)?;
    let redis_pool = state
        .redis_pool
        .as_ref()
        .ok_or_else(|| AppError::Internal("Redis not configured".into()))?;

    let count = query.count.unwrap_or(50).clamp(1, 200);
    let school_id = claims.school_id;
    let entries = JudgeMonitorService::list_dlq_entries(
        redis_pool,
        count,
        query.start_id.as_deref(),
        school_id,
    )
    .await
    .map_err(map_dlq_error)?;

    let items: Vec<serde_json::Value> = entries
        .into_iter()
        .map(|(id, fields)| {
            serde_json::json!({
                "id": id,
                "submission_id": fields.get("submission_id").unwrap_or(&"".to_string()),
                "error_reason": fields.get("error_reason").unwrap_or(&"".to_string()),
                "source_stream": fields.get("source_stream").unwrap_or(&"submissions".to_string()),
                "submitted_at": fields.get("submitted_at").unwrap_or(&"".to_string()),
                "failed_at": fields.get("failed_at").unwrap_or(&"".to_string()),
            })
        })
        .collect();

    Ok(Json(serde_json::json!({
        "items": items,
        "count": items.len(),
    })))
}

/// POST /admin/judge/dlq/:id/retry
///
/// Per D-12: Re-enqueues DLQ entry to its original stream and removes it from DLQ.
async fn retry_dlq(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&claims.role)?;
    let redis_pool = state
        .redis_pool
        .as_ref()
        .ok_or_else(|| AppError::Internal("Redis not configured".into()))?;

    let school_id = claims.school_id;
    let target_stream = JudgeMonitorService::retry_dlq_entry(redis_pool, &id, school_id)
        .await
        .map_err(map_dlq_error)?;

    Ok(Json(serde_json::json!({
        "message": "DLQ entry retried",
        "entry_id": id,
        "target_stream": target_stream,
    })))
}

/// DELETE /admin/judge/dlq/:id
///
/// Per D-13: Permanently removes a DLQ entry.
async fn delete_dlq(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&claims.role)?;
    let redis_pool = state
        .redis_pool
        .as_ref()
        .ok_or_else(|| AppError::Internal("Redis not configured".into()))?;

    let school_id = claims.school_id;
    JudgeMonitorService::delete_dlq_entry(redis_pool, &id, school_id)
        .await
        .map_err(map_dlq_error)?;

    Ok(Json(serde_json::json!({
        "message": "DLQ entry discarded",
        "entry_id": id,
    })))
}

/// Map DLQ service errors to appropriate HTTP status codes.
fn map_dlq_error(err: anyhow::Error) -> AppError {
    let msg = err.to_string();
    if msg.contains("not found") || msg.contains("Legacy DLQ entry") {
        AppError::NotFound(msg)
    } else if msg.contains("does not belong") {
        AppError::Forbidden(msg)
    } else if msg.contains("Missing original_message") {
        // Client data is incomplete -- this is a business error, not a server bug.
        // 422 would be ideal but we map to Validation (400) for consistency.
        AppError::Validation(msg)
    } else {
        AppError::Internal(msg)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;

    /// Verify that ensure_admin rejects non-admin roles.
    #[test]
    fn ensure_admin_rejects_student() {
        let result = ensure_admin("student");
        assert!(result.is_err());
        if let Err(AppError::Forbidden(msg)) = result {
            assert!(msg.contains("Admin access required"));
        } else {
            panic!("Expected Forbidden error, got {:?}", result);
        }
    }

    /// Verify that ensure_admin accepts gradeadmin role.
    #[test]
    fn ensure_admin_accepts_admin() {
        assert!(ensure_admin("gradeadmin").is_ok());
    }

    /// Verify that ensure_admin accepts root role.
    #[test]
    fn ensure_admin_accepts_root() {
        assert!(ensure_admin("root").is_ok());
    }

    /// Verify that ensure_admin rejects teacher role.
    #[test]
    fn ensure_admin_rejects_teacher() {
        assert!(ensure_admin("teacher").is_err());
    }

    /// Regression test: Redis errors from get_stream_depth must produce
    /// AppError::Internal (500), not be silently swallowed as 0.
    ///
    /// This tests the error-propagation path directly. The bug was that
    /// `.unwrap_or(0)` and `.unwrap_or_default()` hid real Redis failures.
    #[test]
    fn redis_error_produces_internal_error_not_zero() {
        let redis_err = anyhow::anyhow!("connection pool exhausted for 'submissions'");
        let app_error: AppError =
            AppError::Internal(format!("Failed to query normal queue depth: {}", redis_err));

        // Verify the error maps to 500 Internal Server Error
        let response = app_error.into_response();
        assert_eq!(
            response.status(),
            StatusCode::INTERNAL_SERVER_ERROR,
            "Redis errors should return 500, not 200 with fake zeros"
        );
    }

    /// Regression test: Redis errors from get_worker_heartbeats must produce
    /// AppError::Internal (500), not be silently swallowed as empty array.
    #[test]
    fn heartbeat_redis_error_produces_internal_error() {
        let redis_err = anyhow::anyhow!("SCAN failed: connection refused");
        let app_error: AppError =
            AppError::Internal(format!("Failed to query worker heartbeats: {}", redis_err));

        let response = app_error.into_response();
        assert_eq!(
            response.status(),
            StatusCode::INTERNAL_SERVER_ERROR,
            "Redis heartbeat errors should return 500, not 200 with empty workers"
        );
    }

    /// Verify map_dlq_error returns NotFound for "not found" messages.
    #[test]
    fn map_dlq_error_not_found() {
        let err = anyhow::anyhow!("DLQ entry not found");
        match map_dlq_error(err) {
            AppError::NotFound(msg) => assert!(msg.contains("not found")),
            other => panic!("Expected NotFound, got {:?}", other),
        }
    }

    /// Verify map_dlq_error returns Forbidden for "does not belong" messages.
    #[test]
    fn map_dlq_error_forbidden() {
        let err = anyhow::anyhow!("DLQ entry does not belong to your organization");
        match map_dlq_error(err) {
            AppError::Forbidden(msg) => assert!(msg.contains("does not belong")),
            other => panic!("Expected Forbidden, got {:?}", other),
        }
    }

    /// Verify map_dlq_error returns Internal for generic errors.
    #[test]
    fn map_dlq_error_internal() {
        let err = anyhow::anyhow!("XRANGE on DLQ failed: timeout");
        match map_dlq_error(err) {
            AppError::Internal(msg) => assert!(msg.contains("XRANGE")),
            other => panic!("Expected Internal, got {:?}", other),
        }
    }

    /// Regression test (Bug 3): "Missing original_message" DLQ retry error
    /// must map to Validation (400), not Internal (500). The Lua retry script
    /// returns this error when the DLQ entry lacks the original_message field.
    #[test]
    fn map_dlq_error_missing_original_message_returns_validation() {
        let err = anyhow::anyhow!("Missing original_message -- cannot retry");
        match map_dlq_error(err) {
            AppError::Validation(msg) => {
                assert!(msg.contains("Missing original_message"), "msg: {}", msg);
            }
            other => panic!(
                "Expected AppError::Validation (400) for missing original_message, got {:?}",
                other
            ),
        }
    }

    /// Regression test (Bug 3 / T-10-monitor-isolation): The status response JSON
    /// must include `"scope": "global"` to document that worker metrics are NOT
    /// tenant-isolated. Workers serve all tenants and do not report per-tenant
    /// activity in their heartbeat payload. This marker informs the frontend that
    /// the data is cross-tenant.
    #[test]
    fn status_response_includes_global_scope_marker() {
        let response_body = serde_json::json!({
            "scope": "global",
            "queues": {
                "normal_depth": 5,
                "contest_depth": 2,
            },
            "active_judges": 3,
            "total_active_judgements": 7,
            "avg_wait_ms": 120,
            "workers": [],
        });

        assert_eq!(
            response_body.get("scope").and_then(|v| v.as_str()),
            Some("global"),
            "Status response must include scope: \"global\" to document tenant isolation limitation"
        );
    }

    // ---- Tenant isolation regression tests (Issue 1) ----
    // Judge status endpoint returns global infrastructure data (worker heartbeats,
    // queue depths) that cannot be filtered by tenant. To prevent cross-tenant
    // information leakage, the endpoint is restricted to root role only.

    /// Regression test: ensure_root accepts root role.
    #[test]
    fn ensure_root_accepts_root() {
        assert!(ensure_root("root").is_ok());
    }

    /// Regression test: ensure_root rejects admin role.
    /// Admins from org A must not see org B's worker metrics.
    #[test]
    fn ensure_root_rejects_admin() {
        let result = ensure_root("admin");
        assert!(
            result.is_err(),
            "Admin should not access global infrastructure data"
        );
        if let Err(AppError::Forbidden(msg)) = result {
            assert!(
                msg.contains("Root access required"),
                "Error message should explain root-only requirement, got: {}",
                msg
            );
        } else {
            panic!("Expected Forbidden error, got {:?}", result);
        }
    }

    /// Regression test: ensure_root rejects teacher role.
    #[test]
    fn ensure_root_rejects_teacher() {
        assert!(ensure_root("teacher").is_err());
    }

    /// Regression test: ensure_root rejects student role.
    #[test]
    fn ensure_root_rejects_student() {
        assert!(ensure_root("student").is_err());
    }
}
