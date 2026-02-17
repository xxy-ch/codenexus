use tracing_subscriber::prelude::*;
use anyhow::Result;

mod compiler;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "judge_worker=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Judge worker starting...");

    // Test language support
    if let Some(lang) = compiler::language::get_language("python") {
        tracing::info!("Supported language: {} {}", lang.name, lang.version);
    }

    tracing::info!("Judge worker ready");
    Ok(())
}
