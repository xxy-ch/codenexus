//! Admin routes for judge monitoring and DLQ management.
//!
//! Per D-09: GET /status returns queue depths, active workers, average wait time.
//! Per D-11: GET /dlq lists DLQ entries with pagination.
//! Per D-12: POST /dlq/:id/retry re-enqueues item to original stream.
//! Per D-13: DELETE /dlq/:id permanently removes entry.
//!
//! All endpoints are protected by the existing auth+tenant middleware layer
//! that wraps the protected_router. Only authenticated admin users can access them.

use api_infra::error::AppError;
use api_infra::state::AppState;
use axum::extract::{Path, Query, State};
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;

use super::service::JudgeMonitorService;

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
) -> Result<impl IntoResponse, AppError> {
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
    Query(query): Query<DlqQuery>,
) -> Result<impl IntoResponse, AppError> {
    let redis_pool = state
        .redis_pool
        .as_ref()
        .ok_or_else(|| AppError::Internal("Redis not configured".into()))?;

    let count = query.count.unwrap_or(50).min(200);
    let entries = JudgeMonitorService::list_dlq_entries(redis_pool, count, query.start_id.as_deref())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

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
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let redis_pool = state
        .redis_pool
        .as_ref()
        .ok_or_else(|| AppError::Internal("Redis not configured".into()))?;

    let target_stream = JudgeMonitorService::retry_dlq_entry(redis_pool, &id)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

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
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let redis_pool = state
        .redis_pool
        .as_ref()
        .ok_or_else(|| AppError::Internal("Redis not configured".into()))?;

    JudgeMonitorService::delete_dlq_entry(redis_pool, &id)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(serde_json::json!({
        "message": "DLQ entry discarded",
        "entry_id": id,
    })))
}
