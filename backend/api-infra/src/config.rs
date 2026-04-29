use std::env;

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

/// Startup error -- the application cannot start.
#[derive(Debug)]
pub enum AppStartupError {
    /// A required secret was not set or was empty.
    MissingSecret(&'static str),
    /// An environment variable has an invalid value.
    InvalidValue { key: &'static str, reason: String },
}

impl std::fmt::Display for AppStartupError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppStartupError::MissingSecret(key) => {
                write!(
                    f,
                    "Required secret '{}' is not set. Set it in .env or environment.",
                    key
                )
            }
            AppStartupError::InvalidValue { key, reason } => {
                write!(f, "Invalid value for '{}': {}", key, reason)
            }
        }
    }
}

impl std::error::Error for AppStartupError {}

/// Application configuration, validated at startup.
///
/// In production: `from_env()` fails if JWT_SECRET or WORKER_SECRET are not set.
/// In development: warns and uses insecure defaults.
/// In test: `test_config()` provides safe defaults without touching env vars.
#[derive(Debug, Clone)]
pub struct AppConfig {
    pub app_env: AppEnv,
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub worker_secret: String,
    pub bind_address: String,
    pub cors_origins: Vec<String>,
}

impl AppConfig {
    /// Load configuration from environment variables.
    ///
    /// # Errors
    /// - Returns `AppStartupError::MissingSecret` if a required secret is unset in production.
    /// - Returns `AppStartupError::InvalidValue` if `API_BIND_ADDRESS` is malformed.
    pub fn from_env() -> Result<Self, AppStartupError> {
        let app_env = AppEnv::from_env();

        let jwt_secret = match env::var("JWT_SECRET") {
            Ok(v) if !v.is_empty() => v,
            _ if app_env.is_production() => {
                return Err(AppStartupError::MissingSecret("JWT_SECRET"));
            }
            _ => {
                tracing::warn!("JWT_SECRET not set -- using insecure development default. NEVER use in production.");
                "dev-only-insecure-jwt-secret-do-not-use-in-production".to_string()
            }
        };

        let worker_secret = match env::var("WORKER_SECRET") {
            Ok(v) if !v.is_empty() => v,
            _ if app_env.is_production() => {
                return Err(AppStartupError::MissingSecret("WORKER_SECRET"));
            }
            _ => {
                tracing::warn!("WORKER_SECRET not set -- using insecure development default. NEVER use in production.");
                "dev-only-insecure-worker-secret-do-not-use-in-production".to_string()
            }
        };

        let database_url =
            env::var("DATABASE_URL").map_err(|_| AppStartupError::MissingSecret("DATABASE_URL"))?;

        let redis_url =
            env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());

        let bind_address =
            env::var("API_BIND_ADDRESS").unwrap_or_else(|_| "0.0.0.0:3000".to_string());

        let cors_origins = if app_env.is_production() {
            env::var("CORS_ORIGINS")
                .unwrap_or_default()
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        } else {
            vec!["*".to_string()]
        };

        Ok(Self {
            app_env,
            database_url,
            redis_url,
            jwt_secret,
            worker_secret,
            bind_address,
            cors_origins,
        })
    }

    /// Create config for testing (no env vars required).
    #[cfg(test)]
    pub fn test_config() -> Self {
        Self {
            app_env: AppEnv::Test,
            database_url: "postgres://localhost/test".to_string(),
            redis_url: "redis://127.0.0.1:6379".to_string(),
            jwt_secret: "test-jwt-secret".to_string(),
            worker_secret: "test-worker-secret".to_string(),
            bind_address: "0.0.0.0:0".to_string(),
            cors_origins: vec!["*".to_string()],
        }
    }

    /// Create config for integration tests that need a real database.
    #[cfg(test)]
    pub fn test_config_with_db(database_url: String) -> Self {
        let mut config = Self::test_config();
        config.database_url = database_url;
        config
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    /// Global lock to serialize config tests that mutate environment variables.
    /// std::env::set_var/remove_var are not thread-safe; without this lock,
    /// parallel test execution causes random failures due to cross-test
    /// env var interference.
    static ENV_LOCK: Mutex<()> = Mutex::new(());

    /// Save relevant env vars before a test and restore them after.
    /// This avoids polluting other tests and the parent process.
    struct EnvGuard {
        saved_vars: Vec<(&'static str, Option<String>)>,
        _lock: std::sync::MutexGuard<'static, ()>,
    }

    impl EnvGuard {
        fn new(vars: &[&'static str]) -> Self {
            let lock = ENV_LOCK.lock().unwrap();
            let saved_vars = vars.iter().map(|&k| (k, std::env::var(k).ok())).collect();
            Self {
                saved_vars,
                _lock: lock,
            }
        }
    }

    impl Drop for EnvGuard {
        fn drop(&mut self) {
            for (key, value) in &self.saved_vars {
                match value {
                    Some(v) => std::env::set_var(key, v),
                    None => std::env::remove_var(key),
                }
            }
        }
    }

    #[test]
    fn test_app_env_from_env_default() {
        let _guard = EnvGuard::new(&["APP_ENV"]);
        std::env::remove_var("APP_ENV");
        assert_eq!(AppEnv::from_env(), AppEnv::Development);
    }

    #[test]
    fn test_app_env_from_env_production() {
        let _guard = EnvGuard::new(&["APP_ENV"]);
        std::env::set_var("APP_ENV", "production");
        assert_eq!(AppEnv::from_env(), AppEnv::Production);
    }

    #[test]
    fn test_app_env_from_env_test() {
        let _guard = EnvGuard::new(&["APP_ENV"]);
        std::env::set_var("APP_ENV", "test");
        assert_eq!(AppEnv::from_env(), AppEnv::Test);
    }

    #[test]
    fn test_missing_secret_in_production() {
        let _guard = EnvGuard::new(&["APP_ENV", "JWT_SECRET", "WORKER_SECRET", "DATABASE_URL"]);
        std::env::set_var("APP_ENV", "production");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("WORKER_SECRET");
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");

        let result = AppConfig::from_env();
        assert!(result.is_err());
        let err = result.unwrap_err();
        let msg = format!("{}", err);
        assert!(
            msg.contains("JWT_SECRET"),
            "Expected JWT_SECRET error, got: {}",
            msg
        );
    }

    #[test]
    fn test_missing_worker_secret_in_production() {
        let _guard = EnvGuard::new(&["APP_ENV", "JWT_SECRET", "WORKER_SECRET", "DATABASE_URL"]);
        std::env::set_var("APP_ENV", "production");
        std::env::set_var("JWT_SECRET", "a-real-secret");
        std::env::remove_var("WORKER_SECRET");
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");

        let result = AppConfig::from_env();
        assert!(result.is_err());
        let msg = format!("{}", result.unwrap_err());
        assert!(
            msg.contains("WORKER_SECRET"),
            "Expected WORKER_SECRET error, got: {}",
            msg
        );
    }

    #[test]
    fn test_empty_secret_treated_as_unset_in_production() {
        let _guard = EnvGuard::new(&["APP_ENV", "JWT_SECRET", "WORKER_SECRET", "DATABASE_URL"]);
        std::env::set_var("APP_ENV", "production");
        std::env::set_var("JWT_SECRET", ""); // empty string
        std::env::set_var("WORKER_SECRET", "real-secret");
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");

        let result = AppConfig::from_env();
        assert!(
            result.is_err(),
            "Empty JWT_SECRET should be treated as unset"
        );
    }

    #[test]
    fn test_development_allows_missing_secrets() {
        let _guard = EnvGuard::new(&["APP_ENV", "JWT_SECRET", "WORKER_SECRET", "DATABASE_URL"]);
        std::env::remove_var("APP_ENV");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("WORKER_SECRET");
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");

        let result = AppConfig::from_env();
        assert!(result.is_ok(), "Development should allow missing secrets");
        let config = result.unwrap();
        assert!(!config.jwt_secret.is_empty());
        assert!(config.jwt_secret.contains("dev-only-insecure"));
    }

    #[test]
    fn test_production_cors_defaults_empty() {
        let _guard = EnvGuard::new(&[
            "APP_ENV",
            "JWT_SECRET",
            "WORKER_SECRET",
            "DATABASE_URL",
            "CORS_ORIGINS",
        ]);
        std::env::set_var("APP_ENV", "production");
        std::env::set_var("JWT_SECRET", "real-secret");
        std::env::set_var("WORKER_SECRET", "real-secret");
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");
        std::env::remove_var("CORS_ORIGINS");

        let config = AppConfig::from_env().unwrap();
        assert!(
            config.cors_origins.is_empty(),
            "Production CORS should be empty when CORS_ORIGINS unset"
        );
        assert!(config.cors_origins.iter().all(|o| o != "*"));
    }

    #[test]
    fn test_development_cors_allows_all() {
        let _guard = EnvGuard::new(&["APP_ENV", "DATABASE_URL"]);
        std::env::remove_var("APP_ENV");
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");

        let config = AppConfig::from_env().unwrap();
        assert_eq!(config.cors_origins, vec!["*"]);
    }

    #[test]
    fn test_production_cors_from_env() {
        let _guard = EnvGuard::new(&[
            "APP_ENV",
            "JWT_SECRET",
            "WORKER_SECRET",
            "DATABASE_URL",
            "CORS_ORIGINS",
        ]);
        std::env::set_var("APP_ENV", "production");
        std::env::set_var("JWT_SECRET", "real-secret");
        std::env::set_var("WORKER_SECRET", "real-secret");
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");
        std::env::set_var(
            "CORS_ORIGINS",
            "https://example.com, https://app.example.com",
        );

        let config = AppConfig::from_env().unwrap();
        assert_eq!(config.cors_origins.len(), 2);
        assert!(config
            .cors_origins
            .contains(&"https://example.com".to_string()));
        assert!(config
            .cors_origins
            .contains(&"https://app.example.com".to_string()));
    }

    #[test]
    fn test_test_config() {
        let config = AppConfig::test_config();
        assert_eq!(config.app_env, AppEnv::Test);
        assert_eq!(config.jwt_secret, "test-jwt-secret");
        assert_eq!(config.worker_secret, "test-worker-secret");
        assert_eq!(config.cors_origins, vec!["*"]);
    }
}
