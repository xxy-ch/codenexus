use anyhow::Result;
use clap::Parser;

#[tokio::main]
async fn main() -> Result<()> {
    let cli = migration_tool::Cli::parse();
    migration_tool::run(cli).await
}
