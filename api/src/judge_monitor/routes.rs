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
    if role != "admin" && role != "root" {
        return Err(AppError::Forbidden("Admin access required".into()));
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
async fn get_judge_status(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&claims.role)?;
    let redis_pool = state
        .redis_pool
        .as_ref()
        .ok_or_else(|| AppError::Internal("Redis not configured".into()))?;

    // Get stream depths
    let normal_depth = JudgeMonitorService::get_stream_depth(redis_pool, "submissions")
        .await
        .unwrap_or(0);
    let contest_depth =
        JudgeMonitorService::get_stream_depth(redis_pool, "submissions:contest")
            .await
            .unwrap_or(0);

    // Get worker heartbeats
    let workers = JudgeMonitorService::get_worker_heartbeats(redis_pool)
        .await
        .unwrap_or_default();

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

    let count = query.count.unwrap_or(50).max(1).min(200);
    let school_id = claims.school_id;
    let entries = JudgeMonitorService::list_dlq_entries(redis_pool, count, query.start_id.as_deref(), school_id)
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
    } else {
        AppError::Internal(msg)
    }
}
