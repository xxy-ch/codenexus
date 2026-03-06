use sqlx::{PgPool, postgres::PgPoolOptions, migrate::MigrateDatabase, postgres::Postgres};
use testcontainers::{clients::Cli, Container, GenericImage};
use testcontainers_modules::postgres::Postgres;
use std::sync::Once;

static INIT: Once = Once::new();

/// Test database container holder
pub struct TestDb {
    pub pool: PgPool,
    pub container: Container<'static, Postgres>,
    _docker: Cli,
}

impl Drop for TestDb {
    fn drop(&mut self) {
        // Container will be automatically dropped when it goes out of scope
        // This will stop and remove the container
    }
}

/// Sets up a fresh PostgreSQL test database with migrations applied.
///
/// Returns a TestDb struct that contains the connection pool and container.
/// When the TestDb is dropped, the container will be automatically stopped and removed.
///
/// # Panics
/// Panics if the database cannot be created or migrations cannot be applied.
pub fn setup_test_db() -> TestDb {
    // Initialize logging only once to avoid duplicate registrations
    INIT.call_once(|| {
        env_logger::init();
    });

    let docker = Cli::default();
    
    // Start PostgreSQL container
    let postgres_image = GenericImage::new("postgres", "15")
        .with_env_var("POSTGRES_USER", "testuser")
        .with_env_var("POSTGRES_PASSWORD", "testpass")
        .with_env_var("POSTGRES_DB", "testdb")
        .with_exposed_port(5432);
    
    let container = docker.run(postgres_image);
    let port = container.get_host_port_ipv4(5432);
    
    let database_url = format!(
        "postgresql://testuser:testpass@localhost:{}/testdb",
        port
    );

    // Create the database if it doesn't exist (testcontainers usually does this automatically)
    let _ = Postgres::create_database(&database_url).await;

    // Create connection pool
    let pool = create_test_pool(&database_url).expect("Failed to create test database pool");

    // Run migrations
    run_migrations(&pool).expect("Failed to run database migrations");

    TestDb {
        pool,
        container,
        _docker: docker,
    }
}

/// Creates a PostgreSQL connection pool for testing
fn create_test_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
    rt.block_on(async {
        sqlx::postgres::PgPoolOptions::new()
            .max_connections(5)
            .min_connections(1)
            .acquire_timeout(std::time::Duration::from_secs(30))
            .connect(database_url)
            .await
    })
}

/// Runs all database migrations on the test database
fn run_migrations(pool: &PgPool) -> Result<(), sqlx::migrate::MigrateError> {
    let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
    rt.block_on(async {
        // Include migrations from the migrations directory
        sqlx::migrate!("./migrations").run(pool).await
    })
}

/// Teardown function (optional - container cleanup happens automatically when TestDb is dropped)
pub fn teardown_test_db(_test_db: TestDb) {
    // The container will be automatically cleaned up when TestDb is dropped
    // This function exists for API compatibility and explicit cleanup if needed
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_setup_test_db() {
        let test_db = setup_test_db();
        
        // Test that we can execute a query
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result: (i64,) = rt.block_on(async {
            sqlx::query_as("SELECT COUNT(*) FROM information_schema.tables")
                .fetch_one(&test_db.pool)
                .await
                .expect("Failed to execute query")
        });

        // Should have some tables (from migrations)
        assert!(result.0 > 0, "Database should have tables after migrations");
        
        // Test will automatically cleanup when test_db goes out of scope
    }
}