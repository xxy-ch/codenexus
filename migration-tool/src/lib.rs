pub mod id_map;
pub mod mapper;
pub mod migrator;
pub mod models;
pub mod parser;
pub mod password;
pub mod test_cases;

use anyhow::Result;
use clap::Parser;
use std::process;

/// Migrate UOJ data to AlgoMaster PostgreSQL database.
#[derive(Parser, Debug)]
#[command(name = "uoj-migrate", about = "Migrate UOJ data to AlgoMaster")]
pub struct Cli {
    /// Path to UOJ MySQL dump file
    #[arg(long)]
    pub dump_file: String,

    /// PostgreSQL connection string
    #[arg(long, env = "DATABASE_URL")]
    pub database_url: String,

    /// Path to UOJ test case directory (D-10-1)
    #[arg(long)]
    pub test_case_dir: Option<String>,

    /// Existing organization ID to assign migrated data to (D-10-4)
    #[arg(long)]
    pub org_id: Option<i64>,

    /// Create a default organization for migrated data (D-10-4)
    #[arg(long)]
    pub create_default_org: bool,
}

/// Validate CLI arguments and run the migration.
pub async fn run(cli: Cli) -> Result<()> {
    // Validate that at least one of --org-id or --create-default-org is provided
    if cli.org_id.is_none() && !cli.create_default_org {
        eprintln!("Error: either --org-id or --create-default-org must be provided");
        process::exit(1);
    }

    // D-10-4: When both --org-id and --create-default-org are provided,
    // --org-id takes precedence (--create-default-org is ignored).
    if cli.org_id.is_some() && cli.create_default_org {
        tracing::info!(
            "Both --org-id and --create-default-org provided. Using --org-id={}",
            cli.org_id.unwrap()
        );
    }

    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    tracing::info!("Migration tool started");

    // Connect to PostgreSQL
    let pool = sqlx::PgPool::connect(&cli.database_url).await?;
    tracing::info!("Connected to PostgreSQL");

    // Read and parse the dump file
    let content = std::fs::read_to_string(&cli.dump_file)?;
    let dump = parser::parse_dump(&content);

    let table_count = dump.tables.len();
    let total_rows: usize = dump.tables.values().map(|rows| rows.len()).sum();
    tracing::info!(
        "Parsed dump: {} tables, {} total rows",
        table_count,
        total_rows
    );

    for (table_name, rows) in &dump.tables {
        tracing::info!("  Table '{}': {} rows", table_name, rows.len());
    }

    // Verify database is reachable
    let row: (i64,) = sqlx::query_as("SELECT 1").fetch_one(&pool).await?;
    tracing::info!("Database ping successful: {}", row.0);

    // Migrate or validate organization (D-10-4)
    let (org_id, campus_id) = migrator::Migrator::migrate_organization(&cli, &pool).await?;

    // Create migrator and run full pipeline
    let mut migrator = migrator::Migrator::new(
        pool,
        dump,
        org_id,
        campus_id,
        cli.test_case_dir.clone(),
    )
    .await?;

    migrator.run().await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cli_parses_all_flags() {
        let cli = Cli::try_parse_from([
            "uoj-migrate",
            "--dump-file", "/path/to/dump.sql",
            "--database-url", "postgres://localhost/db",
            "--test-case-dir", "/path/to/tests",
            "--org-id", "42",
        ]).unwrap();

        assert_eq!(cli.dump_file, "/path/to/dump.sql");
        assert_eq!(cli.database_url, "postgres://localhost/db");
        assert_eq!(cli.test_case_dir, Some("/path/to/tests".to_string()));
        assert_eq!(cli.org_id, Some(42));
        assert!(!cli.create_default_org);
    }

    #[test]
    fn cli_parses_create_default_org() {
        let cli = Cli::try_parse_from([
            "uoj-migrate",
            "--dump-file", "/path/to/dump.sql",
            "--database-url", "postgres://localhost/db",
            "--create-default-org",
        ]).unwrap();

        assert!(cli.create_default_org);
        assert!(cli.org_id.is_none());
    }

    #[test]
    fn cli_parses_minimal_flags_with_org_id() {
        let cli = Cli::try_parse_from([
            "uoj-migrate",
            "--dump-file", "/path/to/dump.sql",
            "--database-url", "postgres://localhost/db",
            "--org-id", "1",
        ]).unwrap();

        assert_eq!(cli.org_id, Some(1));
        assert!(cli.test_case_dir.is_none());
    }

    #[test]
    fn cli_env_var_for_database_url() {
        let cli = Cli::try_parse_from([
            "uoj-migrate",
            "--dump-file", "/path/to/dump.sql",
            "--database-url", "postgres://env/db",
            "--org-id", "1",
        ]).unwrap();

        assert_eq!(cli.database_url, "postgres://env/db");
    }

    #[test]
    fn cli_missing_dump_file_fails() {
        let result = Cli::try_parse_from([
            "uoj-migrate",
            "--database-url", "postgres://localhost/db",
            "--org-id", "1",
        ]);
        assert!(result.is_err());
    }

    #[test]
    fn cli_missing_database_url_fails() {
        let result = Cli::try_parse_from([
            "uoj-migrate",
            "--dump-file", "/path/to/dump.sql",
            "--org-id", "1",
        ]);
        assert!(result.is_err());
    }

    #[test]
    fn cli_org_id_and_create_default_org_both_allowed() {
        // D-10-4: Both flags are allowed; --org-id takes precedence at runtime.
        let cli = Cli::try_parse_from([
            "uoj-migrate",
            "--dump-file", "/path/to/dump.sql",
            "--database-url", "postgres://localhost/db",
            "--org-id", "1",
            "--create-default-org",
        ]).unwrap();

        assert_eq!(cli.org_id, Some(1));
        assert!(cli.create_default_org);
    }
}
