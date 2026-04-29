use anyhow::Result;
use sqlx::PgPool;
use std::net::TcpListener;
use testcontainers::core::IntoContainerPort;
use testcontainers::runners::AsyncRunner;
use testcontainers::ImageExt;

/// A PostgreSQL test container managed by testcontainers.
pub struct PgTestContainer {
    container: testcontainers::ContainerAsync<testcontainers_modules::postgres::Postgres>,
}

fn pick_free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .expect("failed to reserve an ephemeral port")
        .local_addr()
        .expect("failed to read reserved port")
        .port()
}

impl PgTestContainer {
    /// Start a new PostgreSQL test container.
    pub async fn start() -> Result<Self> {
        let host_port = pick_free_port();
        let container = testcontainers_modules::postgres::Postgres::default()
            .with_mapped_port(host_port, 5432_u16.tcp())
            .start()
            .await?;
        Ok(Self { container })
    }

    /// Get the connection URL for this container.
    pub async fn connection_url(&self) -> String {
        let port = self
            .container
            .get_host_port_ipv4(5432_u16.tcp())
            .await
            .expect("Failed to get PG port");
        format!("postgres://postgres:postgres@127.0.0.1:{port}/postgres")
    }

    /// Create a connection pool for this container.
    pub async fn create_pool(&self) -> Result<PgPool> {
        let url = self.connection_url().await;
        let pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(5)
            .connect(&url)
            .await?;
        Ok(pool)
    }
}
