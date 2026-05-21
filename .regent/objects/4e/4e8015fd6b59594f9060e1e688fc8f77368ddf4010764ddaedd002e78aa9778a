//! Configuration for the monitor-server.
//!
//! Reads environment variables with sensible defaults.
//! Follows the same pattern as llm-worker config.
//!
//! In production (`APP_ENV=production`), `MONITOR_API_KEY` is mandatory —
//! the server will refuse to start without it. Development mode allows
//! no-auth with a warning.

use std::env;

// ---------------------------------------------------------------------------
// AppEnv — duplicated locally per MEM049 (monitor-server is independent)
// ---------------------------------------------------------------------------

/// Application environment mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppEnv {
    Production,
    Development,
    Test,
}

impl AppEnv {
    /// Read APP_ENV from environment. Defaults to Development if unset or invalid.
    pub fn from_env() -> Self {
        match env::var("APP_ENV").as_deref() {
            Ok("production") => AppEnv::Production,
            Ok("test") => AppEnv::Test,
            _ => AppEnv::Development,
        }
    }

    pub fn is_production(&self) -> bool {
        matches!(self, AppEnv::Production)
    }

    pub fn is_test(&self) -> bool {
        matches!(self, AppEnv::Test)
    }
}

/// Default Redis URL.
const DEFAULT_REDIS_URL: &str = "redis://127.0.0.1:6379";

/// Default bind address for the HTTP server.
const DEFAULT_BIND_ADDR: &str = "0.0.0.0:9090";

/// Default auto-recovery timeout for control signals (30 minutes).
const DEFAULT_SIGNAL_TIMEOUT_SECS: u64 = 30 * 60;

/// Default interval between recovery scans (60 seconds).
const DEFAULT_RECOVERY_SCAN_INTERVAL_SECS: u64 = 60;

/// Default WebSocket broadcast push interval (5 seconds).
const DEFAULT_PUSH_INTERVAL_SECS: u64 = 5;

/// Server configuration, loaded from environment variables.
#[derive(Debug, Clone)]
pub struct ServerConfig {
    /// Detected application environment.
    pub app_env: AppEnv,
    pub database_url: String,
    pub redis_url: String,
    pub bind_addr: String,
    /// How long before a control signal auto-expires (seconds).
    /// Controls both the `expires_at` field and the recovery task threshold.
    pub signal_timeout_secs: u64,
    /// How often the recovery task scans for expired signals (seconds).
    pub recovery_scan_interval_secs: u64,
    /// How often the WebSocket broadcast task pushes snapshots (seconds).
    pub push_interval_secs: u64,
    /// API key for control-plane authentication. If empty or missing, auth is
    /// disabled (local dev mode). **Production must set a strong key.**
    pub monitor_api_key: Option<String>,
}

impl ServerConfig {
    /// Build configuration from environment variables.
    ///
    /// Required: `DATABASE_URL`
    /// Required in production: `MONITOR_API_KEY`
    /// All other variables have sensible defaults for local development.
    pub fn from_env() -> anyhow::Result<Self> {
        let app_env = AppEnv::from_env();

        let database_url = env::var("DATABASE_URL")
            .map_err(|_| anyhow::anyhow!("DATABASE_URL environment variable is required"))?;

        let monitor_api_key = env::var("MONITOR_API_KEY")
            .ok()
            .filter(|v| !v.trim().is_empty());

        // Production: refuse to start without an API key
        if app_env.is_production() && monitor_api_key.is_none() {
            anyhow::bail!(
                "MONITOR_API_KEY is required in production (APP_ENV=production). \
                 Set a strong API key before starting monitor-server."
            );
        }

        Ok(Self {
            app_env,
            database_url,
            redis_url: env::var("REDIS_URL")
                .ok()
                .filter(|v| !v.trim().is_empty())
                .unwrap_or_else(|| DEFAULT_REDIS_URL.to_string()),
            bind_addr: env::var("MONITOR_BIND_ADDR")
                .ok()
                .filter(|v| !v.trim().is_empty())
                .unwrap_or_else(|| DEFAULT_BIND_ADDR.to_string()),
            signal_timeout_secs: env::var("SIGNAL_TIMEOUT_SECS")
                .ok()
                .and_then(|v| v.trim().parse().ok())
                .unwrap_or(DEFAULT_SIGNAL_TIMEOUT_SECS),
            recovery_scan_interval_secs: env::var("RECOVERY_SCAN_INTERVAL_SECS")
                .ok()
                .and_then(|v| v.trim().parse().ok())
                .unwrap_or(DEFAULT_RECOVERY_SCAN_INTERVAL_SECS),
            push_interval_secs: env::var("PUSH_INTERVAL_SECS")
                .ok()
                .and_then(|v| v.trim().parse().ok())
                .unwrap_or(DEFAULT_PUSH_INTERVAL_SECS),
            monitor_api_key,
        })
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    /// Lock to serialize tests that mutate environment variables.
    static ENV_LOCK: Mutex<()> = Mutex::new(());

    fn clear_env() {
        env::remove_var("APP_ENV");
        env::remove_var("DATABASE_URL");
        env::remove_var("REDIS_URL");
        env::remove_var("MONITOR_BIND_ADDR");
        env::remove_var("SIGNAL_TIMEOUT_SECS");
        env::remove_var("RECOVERY_SCAN_INTERVAL_SECS");
        env::remove_var("PUSH_INTERVAL_SECS");
        env::remove_var("MONITOR_API_KEY");
    }

    #[test]
    fn from_env_requires_database_url() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        let result = ServerConfig::from_env();
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(
            err_msg.contains("DATABASE_URL"),
            "error should mention DATABASE_URL, got: {err_msg}"
        );
    }

    #[test]
    fn from_env_applies_defaults() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        env::set_var("DATABASE_URL", "postgres://localhost/test");

        let config = ServerConfig::from_env().expect("should succeed with DATABASE_URL");
        assert_eq!(config.redis_url, DEFAULT_REDIS_URL);
        assert_eq!(config.bind_addr, DEFAULT_BIND_ADDR);
        assert_eq!(config.signal_timeout_secs, DEFAULT_SIGNAL_TIMEOUT_SECS);
        assert_eq!(
            config.recovery_scan_interval_secs,
            DEFAULT_RECOVERY_SCAN_INTERVAL_SECS
        );
        assert_eq!(config.push_interval_secs, DEFAULT_PUSH_INTERVAL_SECS);
        assert!(config.monitor_api_key.is_none());

        clear_env();
    }

    #[test]
    fn from_env_respects_overrides() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        env::set_var("DATABASE_URL", "postgres://localhost/mydb");
        env::set_var("REDIS_URL", "redis://redis:6379");
        env::set_var("MONITOR_BIND_ADDR", "127.0.0.1:8080");
        env::set_var("SIGNAL_TIMEOUT_SECS", "600");
        env::set_var("RECOVERY_SCAN_INTERVAL_SECS", "30");
        env::set_var("PUSH_INTERVAL_SECS", "3");
        env::set_var("MONITOR_API_KEY", "test-secret-key");

        let config = ServerConfig::from_env().unwrap();
        assert_eq!(config.redis_url, "redis://redis:6379");
        assert_eq!(config.bind_addr, "127.0.0.1:8080");
        assert_eq!(config.signal_timeout_secs, 600);
        assert_eq!(config.recovery_scan_interval_secs, 30);
        assert_eq!(config.push_interval_secs, 3);
        assert_eq!(config.monitor_api_key.as_deref(), Some("test-secret-key"));

        clear_env();
    }

    #[test]
    fn from_env_ignores_blank_values() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        env::set_var("DATABASE_URL", "postgres://localhost/test");
        env::set_var("REDIS_URL", "   ");
        env::set_var("MONITOR_BIND_ADDR", "");
        env::set_var("SIGNAL_TIMEOUT_SECS", "  ");
        env::set_var("RECOVERY_SCAN_INTERVAL_SECS", "abc");
        env::set_var("MONITOR_API_KEY", "  ");

        let config = ServerConfig::from_env().unwrap();
        assert_eq!(config.redis_url, DEFAULT_REDIS_URL);
        assert_eq!(config.bind_addr, DEFAULT_BIND_ADDR);
        // Non-parseable values fall back to defaults
        assert_eq!(config.signal_timeout_secs, DEFAULT_SIGNAL_TIMEOUT_SECS);
        assert_eq!(
            config.recovery_scan_interval_secs,
            DEFAULT_RECOVERY_SCAN_INTERVAL_SECS
        );
        assert_eq!(config.push_interval_secs, DEFAULT_PUSH_INTERVAL_SECS);
        assert!(config.monitor_api_key.is_none());

        clear_env();
    }

    // ----- Production enforcement tests -----

    #[test]
    fn production_refuses_missing_api_key() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        env::set_var("APP_ENV", "production");
        env::set_var("DATABASE_URL", "postgres://localhost/test");
        // MONITOR_API_KEY intentionally not set

        let result = ServerConfig::from_env();
        assert!(
            result.is_err(),
            "Should fail without MONITOR_API_KEY in production"
        );
        let err_msg = result.unwrap_err().to_string();
        assert!(
            err_msg.contains("MONITOR_API_KEY"),
            "Error should mention MONITOR_API_KEY, got: {err_msg}"
        );
        assert!(
            err_msg.contains("production"),
            "Error should mention production, got: {err_msg}"
        );

        clear_env();
    }

    #[test]
    fn production_refuses_blank_api_key() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        env::set_var("APP_ENV", "production");
        env::set_var("DATABASE_URL", "postgres://localhost/test");
        env::set_var("MONITOR_API_KEY", "   ");

        let result = ServerConfig::from_env();
        assert!(
            result.is_err(),
            "Blank MONITOR_API_KEY should fail in production"
        );

        clear_env();
    }

    #[test]
    fn production_accepts_with_api_key() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        env::set_var("APP_ENV", "production");
        env::set_var("DATABASE_URL", "postgres://localhost/test");
        env::set_var("MONITOR_API_KEY", "a-real-production-key");

        let config = ServerConfig::from_env().unwrap();
        assert_eq!(config.app_env, AppEnv::Production);
        assert_eq!(
            config.monitor_api_key.as_deref(),
            Some("a-real-production-key")
        );

        clear_env();
    }

    #[test]
    fn development_allows_missing_api_key() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        // APP_ENV unset => defaults to Development
        env::set_var("DATABASE_URL", "postgres://localhost/test");
        // MONITOR_API_KEY intentionally not set

        let config = ServerConfig::from_env().unwrap();
        assert_eq!(config.app_env, AppEnv::Development);
        assert!(config.monitor_api_key.is_none());

        clear_env();
    }

    #[test]
    fn test_mode_allows_missing_api_key() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        env::set_var("APP_ENV", "test");
        env::set_var("DATABASE_URL", "postgres://localhost/test");

        let config = ServerConfig::from_env().unwrap();
        assert_eq!(config.app_env, AppEnv::Test);
        assert!(config.monitor_api_key.is_none());

        clear_env();
    }

    #[test]
    fn app_env_defaults_to_development() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        assert_eq!(AppEnv::from_env(), AppEnv::Development);
    }

    #[test]
    fn app_env_reads_production() {
        let _lock = ENV_LOCK.lock().unwrap();
        env::set_var("APP_ENV", "production");
        assert_eq!(AppEnv::from_env(), AppEnv::Production);
        env::remove_var("APP_ENV");
    }

    #[test]
    fn app_env_reads_test() {
        let _lock = ENV_LOCK.lock().unwrap();
        env::set_var("APP_ENV", "test");
        assert_eq!(AppEnv::from_env(), AppEnv::Test);
        env::remove_var("APP_ENV");
    }
}
