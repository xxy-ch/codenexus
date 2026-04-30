//! Control-plane REST API routes.
//!
//! Provides endpoints for managing control signals on allowlisted services:
//!
//! - `POST /api/control/services/:target/pause`    — Create a pending pause signal
//! - `POST /api/control/services/:target/resume`    — Create a pending resume signal
//! - `POST /api/control/services/:target/restart`   — Create a pending restart signal
//! - `POST /api/control/services/:target/:action/confirm` — Confirm a pending signal
//! - `GET  /api/control/services/:target/status`    — Read current signal for a target
//! - `GET  /api/control/audit-log`                  — Query recent audit log entries
//!
//! ## Two-step confirmation flow
//!
//! 1. POST to create a pending signal → returns `{ confirmation_token }` + 202 Accepted
//! 2. POST with `{ confirmation_token }` to confirm → signal becomes active (200 OK)
//!
//! Signals auto-expire after 30 minutes unless confirmed.

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use chrono::Utc;
use deadpool_redis::redis::cmd;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::audit::{AuditLogEntry, AuditResult, AuditWriter};
use crate::control::{
    is_valid_target, ControlAction, ControlSignal, DEFAULT_SIGNAL_TIMEOUT_SECS,
};
use crate::state::AppState;

// ---------------------------------------------------------------------------
// Request / response types
// ---------------------------------------------------------------------------

/// Request body for initiating a control action.
#[derive(Debug, Deserialize)]
pub struct ControlRequest {
    /// Who is performing the action (username or system identifier).
    pub operator: String,
}

/// Response returned when a control signal is created (pending confirmation).
#[derive(Debug, Serialize)]
pub struct ControlPendingResponse {
    pub target: String,
    pub action: String,
    pub status: String,
    pub confirmation_token: String,
    pub expires_in_secs: u64,
    pub message: String,
}

/// Request body for confirming a control action.
#[derive(Debug, Deserialize)]
pub struct ConfirmRequest {
    pub confirmation_token: String,
}

/// Response returned when a control signal is confirmed.
#[derive(Debug, Serialize)]
pub struct ControlConfirmResponse {
    pub target: String,
    pub action: String,
    pub status: String,
    pub message: String,
}

/// Response for reading the current signal status of a target.
#[derive(Debug, Serialize)]
pub struct SignalStatusResponse {
    pub target: String,
    pub signal: Option<ControlSignal>,
}

/// Query parameters for the audit-log endpoint.
#[derive(Debug, Deserialize)]
pub struct AuditLogQuery {
    /// Maximum number of entries to return (default 50, max 200).
    #[serde(default = "default_limit")]
    pub limit: i64,
    /// Optional target filter.
    pub target: Option<String>,
}

fn default_limit() -> i64 {
    50
}

/// Response for the audit-log endpoint.
#[derive(Debug, Serialize)]
pub struct AuditLogResponse {
    pub entries: Vec<AuditLogEntry>,
    pub count: usize,
}

/// Generic error response.
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

// ---------------------------------------------------------------------------
// Handler: Create control signal (step 1 of two-step flow)
// ---------------------------------------------------------------------------

/// Create a pending control signal for a target service.
///
/// Returns 202 Accepted with a confirmation token that must be used
/// to confirm the signal before it takes effect.
pub async fn create_signal(
    State(state): State<Arc<AppState>>,
    Path((target, action_str)): Path<(String, String)>,
    Json(body): Json<ControlRequest>,
) -> impl IntoResponse {
    // Validate target
    if !is_valid_target(&target) {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!(
                    "invalid target '{}'. Allowed: {}",
                    target,
                    crate::control::ALLOWED_TARGETS.join(", ")
                ),
            }),
        )
            .into_response();
    }

    // Parse action
    let action: ControlAction = match action_str.parse() {
        Ok(a) => a,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse { error: e }),
            )
                .into_response();
        }
    };

    // Validate operator
    if body.operator.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "operator field is required".to_string(),
            }),
        )
            .into_response();
    }

    let now = Utc::now();
    let confirmation_token = Uuid::new_v4().to_string();

    let signal = ControlSignal {
        action,
        target: target.clone(),
        operator: body.operator.clone(),
        created_at: now,
        expires_at: Some(now + chrono::Duration::seconds(DEFAULT_SIGNAL_TIMEOUT_SECS as i64)),
        confirmed: false,
        confirmation_token: Some(confirmation_token.clone()),
    };

    let redis_key = ControlSignal::redis_key(&target);

    // Write to Redis
    let write_result: Result<(), String> = async {
        let json = signal.to_json().map_err(|e| format!("serialization error: {e}"))?;
        let mut conn = state
            .redis_pool
            .get()
            .await
            .map_err(|e| format!("redis pool error: {e}"))?;

        // Set with TTL slightly longer than expires_at to auto-clean stale keys
        let ttl_secs = DEFAULT_SIGNAL_TIMEOUT_SECS + 300; // +5 min buffer
        cmd("SET")
            .arg(&redis_key)
            .arg(&json)
            .arg("EX")
            .arg(ttl_secs)
            .query_async::<()>(&mut conn)
            .await
            .map_err(|e| format!("redis SET error: {e}"))?;

        Ok(())
    }
    .await;

    if let Err(err_msg) = write_result {
        error!(
            target = %target,
            action = %action,
            "[control] failed to write signal to Redis: {err_msg}"
        );

        // Record audit failure
        let _ = AuditWriter::new(&state.pg_pool)
            .record(
                &target,
                action,
                &body.operator,
                AuditResult::Failure,
                Some(&err_msg),
            )
            .await;

        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("failed to write control signal: {err_msg}"),
            }),
        )
            .into_response();
    }

    info!(
        target = %target,
        action = %action,
        operator = %body.operator,
        "[control] pending signal created"
    );

    // Record audit success
    let _ = AuditWriter::new(&state.pg_pool)
        .record(&target, action, &body.operator, AuditResult::Success, None)
        .await;

    (
        StatusCode::ACCEPTED,
        Json(ControlPendingResponse {
            target: target.clone(),
            action: action.to_string(),
            status: "pending_confirmation".to_string(),
            confirmation_token,
            expires_in_secs: DEFAULT_SIGNAL_TIMEOUT_SECS,
            message: format!(
                "Control signal created. POST /api/control/services/{target}/{action}/confirm with the confirmation_token to activate."
            ),
        }),
    )
        .into_response()
}

// ---------------------------------------------------------------------------
// Handler: Confirm control signal (step 2 of two-step flow)
// ---------------------------------------------------------------------------

/// Confirm a pending control signal using the confirmation token.
///
/// Returns 200 OK once the signal is confirmed and active.
pub async fn confirm_signal(
    State(state): State<Arc<AppState>>,
    Path((target, action_str)): Path<(String, String)>,
    Json(body): Json<ConfirmRequest>,
) -> impl IntoResponse {
    // Validate target
    if !is_valid_target(&target) {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("invalid target '{}'", target),
            }),
        )
            .into_response();
    }

    // Parse action (for logging/validation)
    let action: ControlAction = match action_str.parse() {
        Ok(a) => a,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse { error: e }),
            )
                .into_response();
        }
    };

    let redis_key = ControlSignal::redis_key(&target);

    // Read existing signal from Redis
    let mut conn = match state.redis_pool.get().await {
        Ok(c) => c,
        Err(e) => {
            error!("[control] redis pool error on confirm: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: "redis connection error".to_string(),
                }),
            )
                .into_response();
        }
    };

    let existing_json: Option<String> = cmd("GET")
        .arg(&redis_key)
        .query_async(&mut conn)
        .await
        .unwrap_or(None);

    let existing_signal = match existing_json {
        Some(json) => match ControlSignal::from_json(&json) {
            Ok(s) => s,
            Err(e) => {
                error!("[control] failed to parse signal from Redis: {e}");
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: "corrupted signal in Redis".to_string(),
                    }),
                )
                    .into_response();
            }
        },
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(ErrorResponse {
                    error: format!(
                        "no pending signal found for target '{}'. The signal may have expired.",
                        target
                    ),
                }),
            )
                .into_response();
        }
    };

    // Verify the signal is not already confirmed
    if existing_signal.confirmed {
        return (
            StatusCode::CONFLICT,
            Json(ErrorResponse {
                error: format!("signal for '{}' is already confirmed", target),
            }),
        )
            .into_response();
    }

    // Verify the action matches
    if existing_signal.action != action {
        return (
            StatusCode::CONFLICT,
            Json(ErrorResponse {
                error: format!(
                    "pending signal action is '{}', not '{}'",
                    existing_signal.action, action
                ),
            }),
        )
            .into_response();
    }

    // Verify confirmation token
    match &existing_signal.confirmation_token {
        Some(token) if token == &body.confirmation_token => {}
        Some(_) => {
            warn!(
                target = %target,
                "[control] invalid confirmation token"
            );
            return (
                StatusCode::FORBIDDEN,
                Json(ErrorResponse {
                    error: "invalid confirmation token".to_string(),
                }),
            )
                .into_response();
        }
        None => {
            return (
                StatusCode::CONFLICT,
                Json(ErrorResponse {
                    error: "signal has no confirmation token (already confirmed?)".to_string(),
                }),
            )
                .into_response();
        }
    }

    // Confirm the signal: set confirmed=true, clear token
    let mut confirmed_signal = existing_signal.clone();
    confirmed_signal.confirmed = true;
    confirmed_signal.confirmation_token = None;

    let confirmed_json = match confirmed_signal.to_json() {
        Ok(j) => j,
        Err(e) => {
            error!("[control] serialization error on confirm: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: "internal serialization error".to_string(),
                }),
            )
                .into_response();
        }
    };

    // Write confirmed signal back to Redis (preserve remaining TTL)
    let ttl_secs = DEFAULT_SIGNAL_TIMEOUT_SECS + 300;
    if let Err(e) = cmd("SET")
        .arg(&redis_key)
        .arg(&confirmed_json)
        .arg("EX")
        .arg(ttl_secs)
        .query_async::<()>(&mut conn)
        .await
    {
        error!("[control] failed to write confirmed signal to Redis: {e}");

        let _ = AuditWriter::new(&state.pg_pool)
            .record(
                &target,
                action,
                &existing_signal.operator,
                AuditResult::Failure,
                Some(&format!("redis write error on confirm: {e}")),
            )
            .await;

        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "failed to confirm signal".to_string(),
            }),
        )
            .into_response();
    }

    info!(
        target = %target,
        action = %action,
        operator = %existing_signal.operator,
        "[control] signal confirmed and activated"
    );

    // Record audit
    let _ = AuditWriter::new(&state.pg_pool)
        .record(&target, action, &existing_signal.operator, AuditResult::Success, None)
        .await;

    (
        StatusCode::OK,
        Json(ControlConfirmResponse {
            target: target.clone(),
            action: action.to_string(),
            status: "confirmed".to_string(),
            message: format!("Control signal for '{}' has been confirmed and is now active.", target),
        }),
    )
        .into_response()
}

// ---------------------------------------------------------------------------
// Handler: Read signal status
// ---------------------------------------------------------------------------

/// Read the current control signal for a target service.
///
/// Returns 200 OK with the signal state (or null if no signal exists).
pub async fn get_status(
    State(state): State<Arc<AppState>>,
    Path(target): Path<String>,
) -> impl IntoResponse {
    if !is_valid_target(&target) {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!(
                    "invalid target '{}'. Allowed: {}",
                    target,
                    crate::control::ALLOWED_TARGETS.join(", ")
                ),
            }),
        )
            .into_response();
    }

    let redis_key = ControlSignal::redis_key(&target);

    let signal: Result<Option<ControlSignal>, String> = async {
        let mut conn = state
            .redis_pool
            .get()
            .await
            .map_err(|e| format!("redis pool error: {e}"))?;
        let json: Option<String> = cmd("GET")
            .arg(&redis_key)
            .query_async(&mut conn)
            .await
            .unwrap_or(None);
        match json {
            Some(j) => ControlSignal::from_json(&j).map(Some).map_err(|e| format!("parse error: {e}")),
            None => Ok(None),
        }
    }
    .await;

    match signal {
        Ok(Some(s)) => (
            StatusCode::OK,
            Json(SignalStatusResponse {
                target: target.clone(),
                signal: Some(s),
            }),
        )
            .into_response(),
        Ok(None) => (
            StatusCode::OK,
            Json(SignalStatusResponse {
                target: target.clone(),
                signal: None,
            }),
        )
            .into_response(),
        Err(e) => {
            error!(target = %target, "[control] failed to read signal: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("failed to read signal: {e}"),
                }),
            )
                .into_response()
        }
    }
}

// ---------------------------------------------------------------------------
// Handler: Query audit log
// ---------------------------------------------------------------------------

/// Query recent audit log entries.
///
/// Supports optional `target` filter and configurable `limit`.
/// Returns newest entries first.
pub async fn get_audit_log(
    State(state): State<Arc<AppState>>,
    Query(params): Query<AuditLogQuery>,
) -> impl IntoResponse {
    // Clamp limit
    let limit = params.limit.clamp(1, 200);

    let result = if let Some(target) = &params.target {
        if !is_valid_target(target) {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: format!(
                        "invalid target filter '{}'. Allowed: {}",
                        target,
                        crate::control::ALLOWED_TARGETS.join(", ")
                    ),
                }),
            )
                .into_response();
        }
        AuditWriter::query_by_target(&state.pg_pool, target, limit).await
    } else {
        AuditWriter::query_recent(&state.pg_pool, limit).await
    };

    match result {
        Ok(entries) => {
            let count = entries.len();
            (
                StatusCode::OK,
                Json(AuditLogResponse { entries, count }),
            )
                .into_response()
        }
        Err(e) => {
            error!("[control] failed to query audit log: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: "failed to query audit log".to_string(),
                }),
            )
                .into_response()
        }
    }
}

// ---------------------------------------------------------------------------
// Router builder
// ---------------------------------------------------------------------------

/// Build the control-plane sub-router with all routes.
pub fn control_routes() -> axum::Router<std::sync::Arc<crate::state::AppState>> {
    use axum::routing::{get, post};

    axum::Router::new()
        // Create pending signal
        .route(
            "/services/:target/pause",
            post(create_signal),
        )
        .route(
            "/services/:target/resume",
            post(create_signal),
        )
        .route(
            "/services/:target/restart",
            post(create_signal),
        )
        // Confirm pending signal
        .route(
            "/services/:target/:action/confirm",
            post(confirm_signal),
        )
        // Read signal status
        .route(
            "/services/:target/status",
            get(get_status),
        )
        // Audit log
        .route("/audit-log", get(get_audit_log))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn control_pending_response_serializes() {
        let resp = ControlPendingResponse {
            target: "api".to_string(),
            action: "pause".to_string(),
            status: "pending_confirmation".to_string(),
            confirmation_token: "abc-123".to_string(),
            expires_in_secs: 1800,
            message: "Confirm to activate.".to_string(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"status\":\"pending_confirmation\""));
        assert!(json.contains("\"confirmation_token\":\"abc-123\""));
        assert!(json.contains("\"expires_in_secs\":1800"));
    }

    #[test]
    fn confirm_request_deserializes() {
        let json = r#"{"confirmation_token":"test-token"}"#;
        let req: ConfirmRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.confirmation_token, "test-token");
    }

    #[test]
    fn audit_log_query_defaults() {
        let query: AuditLogQuery = serde_json::from_str("{}").unwrap();
        assert_eq!(query.limit, 50);
        assert!(query.target.is_none());
    }

    #[test]
    fn audit_log_query_with_params() {
        let query: AuditLogQuery =
            serde_json::from_str(r#"{"limit":100,"target":"api"}"#).unwrap();
        assert_eq!(query.limit, 100);
        assert_eq!(query.target.as_deref(), Some("api"));
    }

    #[test]
    fn signal_status_response_with_signal() {
        let now = Utc::now();
        let signal = ControlSignal {
            action: ControlAction::Pause,
            target: "api".to_string(),
            operator: "admin".to_string(),
            created_at: now,
            expires_at: Some(now + chrono::Duration::seconds(1800)),
            confirmed: false,
            confirmation_token: Some("tok".to_string()),
        };
        let resp = SignalStatusResponse {
            target: "api".to_string(),
            signal: Some(signal),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"target\":\"api\""));
        assert!(json.contains("\"confirmed\":false"));
    }

    #[test]
    fn signal_status_response_without_signal() {
        let resp = SignalStatusResponse {
            target: "api".to_string(),
            signal: None,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"signal\":null"));
    }

    #[test]
    fn error_response_serializes() {
        let resp = ErrorResponse {
            error: "invalid target 'foo'".to_string(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"error\":\"invalid target 'foo'\""));
    }

    #[test]
    fn control_confirm_response_serializes() {
        let resp = ControlConfirmResponse {
            target: "api".to_string(),
            action: "pause".to_string(),
            status: "confirmed".to_string(),
            message: "Signal activated.".to_string(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"status\":\"confirmed\""));
    }

    #[test]
    fn audit_log_response_serializes() {
        let resp = AuditLogResponse {
            entries: vec![],
            count: 0,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"count\":0"));
        assert!(json.contains("\"entries\":[]"));
    }
}
