use sqlx::migrate::Migrator;

/// Embedded SQLx migrator for database schema
///
/// This migrator is included at compile time from migrations directory
/// Run with `MIGRATOR.run(&pool).await.expect("Failed to run migrations")`
pub static MIGRATOR: Migrator = sqlx::migrate!();

#[cfg(test)]
mod tests {
    use super::*;

    #[ignore]
    #[tokio::test]
    async fn test_migrations_load() {
        let _ = MIGRATOR;
    }
}
