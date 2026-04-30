//! Configuration for the monitor-server.
//!
//! Reads environment variables with sensible defaults.
//! Follows the same pattern as llm-worker config.

use std::env;

/// Default Redis URL.
const DEFAULT_REDIS_URL: &str = "redis://127.0.0.1:6379";

/// Default bind address for the HTTP server.
const DEFAULT_BIND_ADDR: &str = "0.0.0.0:9090";

/// Server configuration, loaded from environment variables.
#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub database_url: String,
    pub redis_url: String,
    pub bind_addr: String,
}

impl ServerConfig {
    /// Build configuration from environment variables.
    ///
    /// Required: `DATABASE_URL`
    /// All other variables have sensible defaults for local development.
    pub fn from_env() -> anyhow::Result<Self> {
        let database_url = env::var("DATABASE_URL")
            .map_err(|_| anyhow::anyhow!("DATABASE_URL environment variable is required"))?;

        Ok(Self {
            database_url,
            redis_url: env::var("REDIS_URL")
                .ok()
                .filter(|v| !v.trim().is_empty())
                .unwrap_or_else(|| DEFAULT_REDIS_URL.to_string()),
            bind_addr: env::var("MONITOR_BIND_ADDR")
                .ok()
                .filter(|v| !v.trim().is_empty())
                .unwrap_or_else(|| DEFAULT_BIND_ADDR.to_string()),
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
        env::remove_var("DATABASE_URL");
        env::remove_var("REDIS_URL");
        env::remove_var("MONITOR_BIND_ADDR");
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

        clear_env();
    }

    #[test]
    fn from_env_respects_overrides() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        env::set_var("DATABASE_URL", "postgres://localhost/mydb");
        env::set_var("REDIS_URL", "redis://redis:6379");
        env::set_var("MONITOR_BIND_ADDR", "127.0.0.1:8080");

        let config = ServerConfig::from_env().unwrap();
        assert_eq!(config.redis_url, "redis://redis:6379");
        assert_eq!(config.bind_addr, "127.0.0.1:8080");

        clear_env();
    }

    #[test]
    fn from_env_ignores_blank_values() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        env::set_var("DATABASE_URL", "postgres://localhost/test");
        env::set_var("REDIS_URL", "   ");
        env::set_var("MONITOR_BIND_ADDR", "");

        let config = ServerConfig::from_env().unwrap();
        assert_eq!(config.redis_url, DEFAULT_REDIS_URL);
        assert_eq!(config.bind_addr, DEFAULT_BIND_ADDR);

        clear_env();
    }
}
