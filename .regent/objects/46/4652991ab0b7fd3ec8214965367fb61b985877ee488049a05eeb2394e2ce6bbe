//! Control-signal polling for llm-worker pause/resume.
//!
//! Reads `control:signal:llm-worker` from Redis before each run_loop
//! iteration. When `confirmed=true` + `action=pause`, the worker skips
//! job pulling and sleeps 5 s. Fail-open on Redis errors so a Redis
//! outage doesn't halt processing.
//!
//! Kept local (no monitor-server dependency) per MEM049 / MEM007.

use anyhow::Result;
use deadpool_redis::Pool;
use serde::Deserialize;

// ---------------------------------------------------------------------------
// Minimal local view of the control signal
// ---------------------------------------------------------------------------

/// Only the fields the worker needs to decide pause state.
#[derive(Debug, Clone, Deserialize)]
pub struct ControlSignalView {
    pub action: String,
    #[allow(dead_code)]
    pub target: String,
    pub confirmed: bool,
}

// ---------------------------------------------------------------------------
// Pause decision logic
// ---------------------------------------------------------------------------

/// Determine whether a parsed signal indicates a paused state.
///
/// - `pause` + `confirmed=true` → paused
/// - `resume` + `confirmed=true` → not paused
/// - Anything else (unconfirmed, unknown action, missing key) → not paused
pub fn should_pause(signal: Option<&ControlSignalView>) -> Option<bool> {
    match signal {
        Some(s) if s.confirmed && s.action == "pause" => Some(true),
        Some(s) if s.confirmed && s.action == "resume" => Some(false),
        _ => None, // ambiguous / missing → keep current state
    }
}

// ---------------------------------------------------------------------------
// Redis read
// ---------------------------------------------------------------------------

/// Redis key for the llm-worker control signal.
const CONTROL_SIGNAL_KEY: &str = "control:signal:llm-worker";

/// Check whether this worker should be paused.
///
/// Returns `Some(true)` when paused, `Some(false)` when explicitly resumed,
/// `None` when no actionable signal is present (missing key, unconfirmed,
/// or Redis error).
///
/// Designed for inline use in the run_loop — cheap enough to call every
/// iteration since the Redis GET is ~0.1 ms.
pub async fn check_paused(redis_pool: &Pool) -> Result<bool> {
    let mut conn = redis_pool.get().await?;

    let json: Option<String> = deadpool_redis::redis::cmd("GET")
        .arg(CONTROL_SIGNAL_KEY)
        .query_async(&mut conn)
        .await?;

    let signal: Option<ControlSignalView> = match json {
        Some(ref j) => match serde_json::from_str::<ControlSignalView>(j) {
            Ok(s) => Some(s),
            Err(e) => {
                tracing::warn!("[control] failed to parse signal JSON: {e}");
                None
            }
        },
        None => None,
    };

    // Only paused when explicitly confirmed pause; everything else → not paused
    Ok(should_pause(signal.as_ref()).unwrap_or(false))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_pause_confirmed_pause_signal() {
        let signal = ControlSignalView {
            action: "pause".into(),
            target: "llm-worker".into(),
            confirmed: true,
        };
        assert_eq!(should_pause(Some(&signal)), Some(true));
    }

    #[test]
    fn should_pause_confirmed_resume_signal() {
        let signal = ControlSignalView {
            action: "resume".into(),
            target: "llm-worker".into(),
            confirmed: true,
        };
        assert_eq!(should_pause(Some(&signal)), Some(false));
    }

    #[test]
    fn should_pause_unconfirmed_signal_returns_none() {
        let signal = ControlSignalView {
            action: "pause".into(),
            target: "llm-worker".into(),
            confirmed: false,
        };
        assert_eq!(should_pause(Some(&signal)), None);
    }

    #[test]
    fn should_pause_none_returns_none() {
        assert_eq!(should_pause(None), None);
    }

    #[test]
    fn should_pause_unknown_action_returns_none() {
        let signal = ControlSignalView {
            action: "restart".into(),
            target: "llm-worker".into(),
            confirmed: true,
        };
        assert_eq!(should_pause(Some(&signal)), None);
    }

    #[test]
    fn parse_full_control_signal_json() {
        let json = r#"{
            "action": "pause",
            "target": "llm-worker",
            "operator": "admin",
            "created_at": "2025-01-01T00:00:00Z",
            "expires_at": null,
            "confirmed": true,
            "confirmation_token": null
        }"#;
        let view: ControlSignalView = serde_json::from_str(json).unwrap();
        assert_eq!(view.action, "pause");
        assert_eq!(view.target, "llm-worker");
        assert!(view.confirmed);
    }

    #[test]
    fn parse_resume_signal() {
        let json = r#"{
            "action": "resume",
            "target": "llm-worker",
            "operator": "ops",
            "created_at": "2025-06-01T12:00:00Z",
            "confirmed": true
        }"#;
        let view: ControlSignalView = serde_json::from_str(json).unwrap();
        assert_eq!(should_pause(Some(&view)), Some(false));
    }

    #[test]
    fn parse_missing_key_yields_none() {
        // Simulates the case where the Redis key doesn't exist
        let signal: Option<ControlSignalView> = None;
        assert_eq!(should_pause(signal.as_ref()), None);
    }

    #[test]
    fn parse_malformed_json_yields_none() {
        // Simulates the case where Redis returns garbage
        let result = serde_json::from_str::<ControlSignalView>("not json");
        assert!(result.is_err());
        // In the real code, this maps to signal=None → should_pause returns None
        assert_eq!(should_pause(None), None);
    }
}
