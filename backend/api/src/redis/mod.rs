use deadpool_redis::{Config, Pool, Runtime};

/// Creates a Redis connection pool with configurable options.
///
/// # Arguments
/// * `redis_url` - Connection string for Redis (e.g., "redis://localhost:6379")
///
/// # Returns
/// A configured `Pool` instance.
///
/// # Errors
/// Returns an error if the connection string is invalid or Redis is unreachable.
pub async fn create_pool(redis_url: &str) -> Result<Pool, deadpool_redis::CreatePoolError> {
    let cfg = Config::from_url(redis_url);
    cfg.create_pool(Some(Runtime::Tokio1))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_pool_invalid_url() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(async { create_pool("invalid://url").await });
        assert!(result.is_err(), "Expected error for invalid REDIS_URL");
    }
}
