//! Control-plane signal types, Redis key convention, and target allowlist.
//!
//! Defines the data model for control signals (pause/resume/restart) that
//! are written to Redis for downstream services to read. All control
//! actions require a two-step confirmation flow:
//!   1. POST creates a pending signal (`confirmed: false`).
//!   2. POST confirms the signal (`confirmed: true`).
//!
//! Redis key convention: `control:signal:{target}` → JSON ControlSignal.
//! Auto-recovery sets an `expires_at`; the recovery task clears expired
//! signals after a configurable timeout (default 30 min).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Allowed targets
// ---------------------------------------------------------------------------

/// Services that accept control signals. Only these targets are valid;
/// any other value must be rejected by the API layer (T02).
pub const ALLOWED_TARGETS: &[&str] = &[
    "api",
    "judge-worker",
    "llm-worker",
    "domain-analysis",
    "monitor",
];

/// Check whether a target is on the allowlist.
pub fn is_valid_target(target: &str) -> bool {
    ALLOWED_TARGETS.contains(&target)
}

// ---------------------------------------------------------------------------
// Control action
// ---------------------------------------------------------------------------

/// Control actions that can be applied to a service.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ControlAction {
    Pause,
    Resume,
    Restart,
}

impl ControlAction {
    /// All valid action variants, used for validation in the API layer.
    pub const ALL: &[ControlAction] = &[
        ControlAction::Pause,
        ControlAction::Resume,
        ControlAction::Restart,
    ];

    /// Return the string representation used in Redis and JSON.
    pub fn as_str(&self) -> &'static str {
        match self {
            ControlAction::Pause => "pause",
            ControlAction::Resume => "resume",
            ControlAction::Restart => "restart",
        }
    }
}

impl std::fmt::Display for ControlAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::str::FromStr for ControlAction {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pause" => Ok(ControlAction::Pause),
            "resume" => Ok(ControlAction::Resume),
            "restart" => Ok(ControlAction::Restart),
            other => Err(format!(
                "invalid control action '{}', expected one of: pause, resume, restart",
                other
            )),
        }
    }
}

// ---------------------------------------------------------------------------
// Control signal (stored as JSON in Redis)
// ---------------------------------------------------------------------------

/// A control signal written to Redis under `control:signal:{target}`.
///
/// The signal is created pending (`confirmed: false`) and must be
/// confirmed before the target service should act on it. Signals with
/// an `expires_at` in the past are eligible for auto-recovery (T03).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ControlSignal {
    /// The control action to apply.
    pub action: ControlAction,
    /// The service being controlled (must be on the allowlist).
    pub target: String,
    /// Who initiated the action (username or system identifier).
    pub operator: String,
    /// When the signal was created.
    pub created_at: DateTime<Utc>,
    /// When the signal should auto-expire and be cleared by the recovery task.
    /// `None` means no auto-expiry (permanent until explicitly cleared).
    pub expires_at: Option<DateTime<Utc>>,
    /// Whether the signal has been confirmed (two-step flow).
    pub confirmed: bool,
    /// Confirmation token (UUID v4). Generated on creation; used to verify
    /// the second step of the two-step confirmation flow. `None` after
    /// confirmation (cleared so it cannot be reused).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confirmation_token: Option<String>,
}

impl ControlSignal {
    /// Build the Redis key for a given target.
    ///
    /// Convention: `control:signal:{target}`
    pub fn redis_key(target: &str) -> String {
        format!("control:signal:{target}")
    }

    /// Check if this signal has expired (expires_at is in the past).
    pub fn is_expired(&self, now: DateTime<Utc>) -> bool {
        self.expires_at
            .map(|exp| now >= exp)
            .unwrap_or(false)
    }

    /// Serialize to JSON for Redis storage.
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }

    /// Deserialize from JSON stored in Redis.
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }
}

// ---------------------------------------------------------------------------
// Default auto-recovery timeout
// ---------------------------------------------------------------------------

/// Default timeout after which a control signal auto-expires (30 minutes).
pub const DEFAULT_SIGNAL_TIMEOUT_SECS: u64 = 30 * 60;

/// Default signal timeout as a `chrono::Duration`.
pub fn default_signal_timeout() -> chrono::Duration {
    chrono::Duration::seconds(DEFAULT_SIGNAL_TIMEOUT_SECS as i64)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn allowed_targets_contains_all_services() {
        assert!(is_valid_target("api"));
        assert!(is_valid_target("judge-worker"));
        assert!(is_valid_target("llm-worker"));
        assert!(is_valid_target("domain-analysis"));
        assert!(is_valid_target("monitor"));
        assert!(!is_valid_target("unknown-service"));
        assert!(!is_valid_target(""));
    }

    #[test]
    fn control_action_roundtrip_str() {
        for action in ControlAction::ALL {
            let s = action.as_str();
            let parsed: ControlAction = s.parse().unwrap();
            assert_eq!(*action, parsed);
        }
    }

    #[test]
    fn control_action_invalid_string() {
        let err = "explode".parse::<ControlAction>().unwrap_err();
        assert!(err.contains("invalid control action"));
        assert!(err.contains("explode"));
    }

    #[test]
    fn control_action_serde_roundtrip() {
        for action in ControlAction::ALL {
            let json = serde_json::to_string(action).unwrap();
            let parsed: ControlAction = serde_json::from_str(&json).unwrap();
            assert_eq!(*action, parsed);
        }
    }

    #[test]
    fn control_action_serde_renames_to_lowercase() {
        assert_eq!(
            serde_json::to_string(&ControlAction::Pause).unwrap(),
            "\"pause\""
        );
        assert_eq!(
            serde_json::to_string(&ControlAction::Resume).unwrap(),
            "\"resume\""
        );
        assert_eq!(
            serde_json::to_string(&ControlAction::Restart).unwrap(),
            "\"restart\""
        );
    }

    #[test]
    fn control_action_display() {
        assert_eq!(format!("{}", ControlAction::Pause), "pause");
        assert_eq!(format!("{}", ControlAction::Resume), "resume");
        assert_eq!(format!("{}", ControlAction::Restart), "restart");
    }

    #[test]
    fn redis_key_format() {
        assert_eq!(ControlSignal::redis_key("api"), "control:signal:api");
        assert_eq!(
            ControlSignal::redis_key("judge-worker"),
            "control:signal:judge-worker"
        );
    }

    #[test]
    fn signal_is_expired_when_past_expires_at() {
        let now = Utc::now();
        let signal = ControlSignal {
            action: ControlAction::Pause,
            target: "api".to_string(),
            operator: "admin".to_string(),
            created_at: now - chrono::Duration::minutes(35),
            expires_at: Some(now - chrono::Duration::minutes(5)),
            confirmed: true,
            confirmation_token: None,
        };
        assert!(signal.is_expired(now));
    }

    #[test]
    fn signal_not_expired_when_no_expiry() {
        let now = Utc::now();
        let signal = ControlSignal {
            action: ControlAction::Pause,
            target: "api".to_string(),
            operator: "admin".to_string(),
            created_at: now,
            expires_at: None,
            confirmed: true,
            confirmation_token: None,
        };
        assert!(!signal.is_expired(now));
    }

    #[test]
    fn signal_not_expired_when_future() {
        let now = Utc::now();
        let signal = ControlSignal {
            action: ControlAction::Pause,
            target: "api".to_string(),
            operator: "admin".to_string(),
            created_at: now,
            expires_at: Some(now + chrono::Duration::minutes(25)),
            confirmed: true,
            confirmation_token: None,
        };
        assert!(!signal.is_expired(now));
    }

    #[test]
    fn signal_json_roundtrip() {
        let now = Utc::now();
        let signal = ControlSignal {
            action: ControlAction::Restart,
            target: "judge-worker".to_string(),
            operator: "ops-bot".to_string(),
            created_at: now,
            expires_at: Some(now + default_signal_timeout()),
            confirmed: false,
            confirmation_token: Some("test-token-123".to_string()),
        };
        let json = signal.to_json().unwrap();
        let parsed = ControlSignal::from_json(&json).unwrap();
        assert_eq!(signal, parsed);
    }

    #[test]
    fn signal_json_structure() {
        let now = Utc::now();
        let signal = ControlSignal {
            action: ControlAction::Pause,
            target: "api".to_string(),
            operator: "admin".to_string(),
            created_at: now,
            expires_at: None,
            confirmed: true,
            confirmation_token: None,
        };
        let json = signal.to_json().unwrap();
        let val: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(val["action"], "pause");
        assert_eq!(val["target"], "api");
        assert_eq!(val["operator"], "admin");
        assert_eq!(val["confirmed"], true);
        assert!(val["expires_at"].is_null());
        assert!(val["created_at"].is_string());
        // confirmation_token is None, so skip_serializing_if should omit it
        assert!(val.get("confirmation_token").is_none());
    }

    #[test]
    fn default_signal_timeout_is_30_minutes() {
        assert_eq!(DEFAULT_SIGNAL_TIMEOUT_SECS, 1800);
        let dur = default_signal_timeout();
        assert_eq!(dur.num_seconds(), 1800);
    }
}
