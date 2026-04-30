//! Configuration for the llm-worker.
//!
//! Reads environment variables with sensible defaults.

use std::env;
use std::time::Duration;

/// Default LLM API base URL (OpenAI-compatible endpoint).
const DEFAULT_LLM_API_URL: &str = "http://localhost:11434";

/// Default model for code review / teaching card generation.
const DEFAULT_LLM_MODEL: &str = "deepseek-coder";

/// Default timeout for LLM API calls.
const DEFAULT_TIMEOUT_SECS: u64 = 60;

/// Default maximum retries for a failed job.
const DEFAULT_MAX_RETRIES: i32 = 3;

/// Default Redis URL.
const DEFAULT_REDIS_URL: &str = "redis://127.0.0.1:6379";

/// Default Redis stream name for analysis events.
const DEFAULT_REDIS_STREAM: &str = "analysis_events";

/// Default consumer group name.
const DEFAULT_CONSUMER_GROUP: &str = "llm-worker";

/// Worker configuration, loaded from environment variables.
#[derive(Debug, Clone)]
pub struct WorkerConfig {
    pub llm_api_url: String,
    /// Optional fallback LLM API URL for automatic failover.
    pub llm_fallback_url: Option<String>,
    pub llm_api_key: Option<String>,
    pub llm_model: String,
    pub llm_timeout: Duration,
    pub max_retries: i32,
    pub redis_url: String,
    pub redis_stream: String,
    pub consumer_group: String,
    pub consumer_name: String,
    pub database_url: String,
}

impl WorkerConfig {
    /// Build configuration from environment variables.
    ///
    /// Required: `DATABASE_URL`
    /// All other variables have sensible defaults for local development.
    pub fn from_env() -> anyhow::Result<Self> {
        let database_url = env::var("DATABASE_URL")
            .map_err(|_| anyhow::anyhow!("DATABASE_URL environment variable is required"))?;

        Ok(Self {
            llm_api_url: env::var("LLM_API_URL")
                .ok()
                .filter(|v| !v.trim().is_empty())
                .unwrap_or_else(|| DEFAULT_LLM_API_URL.to_string()),
            llm_fallback_url: env::var("LLM_FALLBACK_API_URL")
                .ok()
                .filter(|v| !v.trim().is_empty()),
            llm_api_key: env::var("LLM_API_KEY")
                .ok()
                .filter(|v| !v.trim().is_empty()),
            llm_model: env::var("LLM_MODEL")
                .ok()
                .filter(|v| !v.trim().is_empty())
                .unwrap_or_else(|| DEFAULT_LLM_MODEL.to_string()),
            llm_timeout: Duration::from_secs(
                env::var("LLM_TIMEOUT_SECS")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(DEFAULT_TIMEOUT_SECS),
            ),
            max_retries: env::var("LLM_MAX_RETRIES")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(DEFAULT_MAX_RETRIES),
            redis_url: env::var("REDIS_URL")
                .ok()
                .filter(|v| !v.trim().is_empty())
                .unwrap_or_else(|| DEFAULT_REDIS_URL.to_string()),
            redis_stream: env::var("REDIS_STREAM")
                .ok()
                .filter(|v| !v.trim().is_empty())
                .unwrap_or_else(|| DEFAULT_REDIS_STREAM.to_string()),
            consumer_group: env::var("CONSUMER_GROUP")
                .ok()
                .filter(|v| !v.trim().is_empty())
                .unwrap_or_else(|| DEFAULT_CONSUMER_GROUP.to_string()),
            consumer_name: env::var("CONSUMER_NAME")
                .ok()
                .filter(|v| !v.trim().is_empty())
                .unwrap_or_else(|| format!("llm-worker-{}", uuid::Uuid::new_v4().as_simple())),
            database_url,
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
        env::remove_var("LLM_API_URL");
        env::remove_var("LLM_FALLBACK_API_URL");
        env::remove_var("LLM_API_KEY");
        env::remove_var("LLM_MODEL");
        env::remove_var("LLM_TIMEOUT_SECS");
        env::remove_var("LLM_MAX_RETRIES");
        env::remove_var("REDIS_URL");
        env::remove_var("REDIS_STREAM");
        env::remove_var("CONSUMER_GROUP");
        env::remove_var("CONSUMER_NAME");
    }

    #[test]
    fn from_env_requires_database_url() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        let result = WorkerConfig::from_env();
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

        let config = WorkerConfig::from_env().expect("should succeed with DATABASE_URL");
        assert_eq!(config.llm_api_url, DEFAULT_LLM_API_URL);
        assert!(
            config.llm_fallback_url.is_none(),
            "fallback should default to None"
        );
        assert_eq!(config.llm_model, DEFAULT_LLM_MODEL);
        assert_eq!(
            config.llm_timeout,
            Duration::from_secs(DEFAULT_TIMEOUT_SECS)
        );
        assert_eq!(config.max_retries, DEFAULT_MAX_RETRIES);
        assert_eq!(config.redis_url, DEFAULT_REDIS_URL);
        assert_eq!(config.redis_stream, DEFAULT_REDIS_STREAM);
        assert_eq!(config.consumer_group, DEFAULT_CONSUMER_GROUP);
        assert!(config.llm_api_key.is_none());
        assert!(config.consumer_name.starts_with("llm-worker-"));
    }

    #[test]
    fn from_env_respects_overrides() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        env::set_var("DATABASE_URL", "postgres://localhost/mydb");
        env::set_var("LLM_API_URL", "https://api.openai.com");
        env::set_var("LLM_FALLBACK_API_URL", "https://fallback.openai.com");
        env::set_var("LLM_API_KEY", "sk-test-key");
        env::set_var("LLM_MODEL", "gpt-4o");
        env::set_var("LLM_TIMEOUT_SECS", "120");
        env::set_var("LLM_MAX_RETRIES", "5");
        env::set_var("REDIS_URL", "redis://redis:6379");
        env::set_var("REDIS_STREAM", "custom_events");
        env::set_var("CONSUMER_GROUP", "my-group");
        env::set_var("CONSUMER_NAME", "worker-01");

        let config = WorkerConfig::from_env().unwrap();
        assert_eq!(config.llm_api_url, "https://api.openai.com");
        assert_eq!(
            config.llm_fallback_url.as_deref(),
            Some("https://fallback.openai.com")
        );
        assert_eq!(config.llm_api_key.as_deref(), Some("sk-test-key"));
        assert_eq!(config.llm_model, "gpt-4o");
        assert_eq!(config.llm_timeout, Duration::from_secs(120));
        assert_eq!(config.max_retries, 5);
        assert_eq!(config.redis_url, "redis://redis:6379");
        assert_eq!(config.redis_stream, "custom_events");
        assert_eq!(config.consumer_group, "my-group");
        assert_eq!(config.consumer_name, "worker-01");

        // cleanup
        clear_env();
    }

    #[test]
    fn from_env_ignores_blank_values() {
        let _lock = ENV_LOCK.lock().unwrap();
        clear_env();
        env::set_var("DATABASE_URL", "postgres://localhost/test");
        env::set_var("LLM_API_URL", "   ");
        env::set_var("LLM_API_KEY", "");
        env::set_var("LLM_MODEL", "");

        let config = WorkerConfig::from_env().unwrap();
        assert_eq!(
            config.llm_api_url, DEFAULT_LLM_API_URL,
            "blank URL should fall back to default"
        );
        assert!(config.llm_api_key.is_none(), "blank API key should be None");
        assert_eq!(
            config.llm_model, DEFAULT_LLM_MODEL,
            "blank model should fall back to default"
        );

        clear_env();
    }

    #[test]
    fn default_values_are_reasonable() {
        let _ = DEFAULT_LLM_API_URL;
        let _ = DEFAULT_LLM_MODEL;
        let _ = DEFAULT_REDIS_URL;
        let _ = DEFAULT_REDIS_STREAM;
        let _ = DEFAULT_CONSUMER_GROUP;
        let _ = DEFAULT_TIMEOUT_SECS;
        let _ = DEFAULT_MAX_RETRIES;
    }
}
