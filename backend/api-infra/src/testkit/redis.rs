use anyhow::Result;
use deadpool_redis::Pool as RedisPool;
use testcontainers::core::IntoContainerPort;
use testcontainers::runners::AsyncRunner;

/// A Redis test container managed by testcontainers.
pub struct RedisTestContainer {
    container: testcontainers::ContainerAsync<testcontainers::GenericImage>,
}

impl RedisTestContainer {
    /// Start a new Redis test container.
    pub async fn start() -> Result<Self> {
        let container = testcontainers::GenericImage::new("redis", "7-alpine")
            .with_exposed_port(6379_u16.tcp())
            .start()
            .await?;
        Ok(Self { container })
    }

    /// Get the connection URL for this container.
    pub async fn connection_url(&self) -> String {
        let port = self
            .container
            .get_host_port_ipv4(6379)
            .await
            .expect("Failed to get Redis port");
        format!("redis://127.0.0.1:{port}")
    }

    /// Create a connection pool for this container.
    pub async fn create_pool(&self) -> Result<RedisPool> {
        let url = self.connection_url().await;
        let config = deadpool_redis::Config::from_url(&url);
        let pool = config.create_pool(Some(deadpool_redis::Runtime::Tokio1))?;
        Ok(pool)
    }
}
