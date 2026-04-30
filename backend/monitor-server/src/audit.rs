//! Audit writer for the control plane.
//!
//! Provides an append-only audit log that records every control signal
//! write, confirm, and auto-restore event to PostgreSQL. The audit_log
//! table stores action/target/operator/timestamp/result but no secrets
//! or PII.
//!
//! All writes emit a structured `[control]` log event for observability.

use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;
use tracing::info;

use crate::control::ControlAction;

// ---------------------------------------------------------------------------
// Audit log record (read model)
// ---------------------------------------------------------------------------

/// A single audit log entry, as read from PostgreSQL.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct AuditLogEntry {
    pub id: i64,
    pub target: String,
    pub action: String,
    pub operator: String,
    pub result: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// Write parameters
// ---------------------------------------------------------------------------

/// The outcome of a control-plane action.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AuditResult {
    Success,
    Failure,
}

impl AuditResult {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuditResult::Success => "success",
            AuditResult::Failure => "failure",
        }
    }
}

// ---------------------------------------------------------------------------
// Audit writer
// ---------------------------------------------------------------------------

/// Writes append-only audit entries to the `audit_log` table.
///
/// Usage:
/// ```ignore
/// let writer = AuditWriter::new(&pg_pool);
/// writer.record("api", ControlAction::Pause, "admin", AuditResult::Success, None).await?;
/// ```
pub struct AuditWriter<'a> {
    pool: &'a PgPool,
}

impl<'a> AuditWriter<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    /// Record a control-plane action in the audit log.
    ///
    /// Emits a structured `[control]` log line for observability.
    /// The `error_message` parameter should be `None` on success and
    /// `Some(reason)` on failure.
    pub async fn record(
        &self,
        target: &str,
        action: ControlAction,
        operator: &str,
        result: AuditResult,
        error_message: Option<&str>,
    ) -> Result<i64> {
        let row = sqlx::query_scalar::<_, i64>(
            r#"
            INSERT INTO audit_log (target, action, operator, result, error_message)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            "#,
        )
        .bind(target)
        .bind(action.as_str())
        .bind(operator)
        .bind(result.as_str())
        .bind(error_message)
        .fetch_one(self.pool)
        .await?;

        info!(
            target = %target,
            action = %action,
            operator = %operator,
            result = result.as_str(),
            id = row,
            "[control] audit log entry recorded"
        );

        Ok(row)
    }

    /// Query recent audit log entries, ordered by newest first.
    ///
    /// Returns at most `limit` entries. Used by the
    /// `GET /api/control/audit-log` endpoint.
    pub async fn query_recent(
        pool: &PgPool,
        limit: i64,
    ) -> Result<Vec<AuditLogEntry>> {
        let entries = sqlx::query_as::<_, AuditLogEntry>(
            r#"
            SELECT id, target, action, operator, result, error_message, created_at
            FROM audit_log
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(entries)
    }

    /// Query audit log entries for a specific target.
    pub async fn query_by_target(
        pool: &PgPool,
        target: &str,
        limit: i64,
    ) -> Result<Vec<AuditLogEntry>> {
        let entries = sqlx::query_as::<_, AuditLogEntry>(
            r#"
            SELECT id, target, action, operator, result, error_message, created_at
            FROM audit_log
            WHERE target = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(target)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(entries)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn audit_result_as_str() {
        assert_eq!(AuditResult::Success.as_str(), "success");
        assert_eq!(AuditResult::Failure.as_str(), "failure");
    }

    #[test]
    fn audit_log_entry_serializes_without_error_when_none() {
        let entry = AuditLogEntry {
            id: 1,
            target: "api".to_string(),
            action: "pause".to_string(),
            operator: "admin".to_string(),
            result: "success".to_string(),
            error_message: None,
            created_at: Utc::now(),
        };
        let json = serde_json::to_string(&entry).unwrap();
        assert!(!json.contains("error_message"), "Should skip null error_message");
        assert!(json.contains("\"result\":\"success\""));
    }

    #[test]
    fn audit_log_entry_serializes_with_error_when_some() {
        let entry = AuditLogEntry {
            id: 2,
            target: "judge-worker".to_string(),
            action: "restart".to_string(),
            operator: "ops-bot".to_string(),
            result: "failure".to_string(),
            error_message: Some("connection refused".to_string()),
            created_at: Utc::now(),
        };
        let json = serde_json::to_string(&entry).unwrap();
        assert!(json.contains("connection refused"));
        assert!(json.contains("\"result\":\"failure\""));
    }
}
