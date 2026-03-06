use anyhow::Result;
use redis::Client;
use std::env;
use tracing::{error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod compiler;
mod processor;
mod queue;
mod db;
mod sandbox;

use queue::consumer;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "judge_worker=debug,redis=warn".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Judge worker starting...");

    // Load configuration
    let redis_url = env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://127.0.0.1/".to_string());
    let api_url = env::var("API_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:3000".to_string());
    let stream_name = env::var("SUBMISSION_STREAM")
        .unwrap_or_else(|_| "submissions".to_string());
    let group_name = env::var("CONSUMER_GROUP")
        .unwrap_or_else(|_| "judge_workers".to_string());
    let consumer_name = env::var("CONSUMER_NAME")
        .unwrap_or_else(|_| format!("worker-{}", uuid::Uuid::new_v4()));

    info!("Connecting to Redis at {}", redis_url);
    let redis_client = Client::open(redis_url)?;

    // Ensure consumer group exists
    info!(
        "Setting up consumer group '{}' on stream '{}'",
        group_name, stream_name
    );
    consumer::ensure_consumer_group(&redis_client, &stream_name, &group_name).await?;

    info!("Judge worker ready with consumer name: {}", consumer_name);
    info!("Connected to API at: {}", api_url);

    // Enter main processing loop
    run_processing_loop(
        redis_client,
        &stream_name,
        &group_name,
        &consumer_name,
        &api_url,
    )
    .await
}

async fn run_processing_loop(
    redis_client: Client,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
    api_url: &str,
) -> Result<()> {
    info!("Starting main processing loop");

    loop {
        // Block for up to 5 seconds waiting for messages
        match consume_and_process(
            &redis_client,
            stream_name,
            group_name,
            consumer_name,
            api_url,
            Some(5000),
        )
        .await
        {
            Ok(count) => {
                if count > 0 {
                    info!("Processed {} submission(s)", count);
                }
            }
            Err(e) => {
                error!("Error processing submission: {}", e);
                // Continue processing despite errors
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            }
        }
    }
}

async fn consume_and_process(
    redis_client: &Client,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
    api_url: &str,
    block_ms: Option<u64>,
) -> Result<usize> {
    // Consume messages from queue
    let messages = consumer::consume_submission(
        redis_client,
        stream_name,
        group_name,
        consumer_name,
        block_ms,
    )
    .await?;

    if messages.is_empty() {
        return Ok(0);
    }

    // Process each message
    let mut processed = 0;
    for (message_id, submission) in messages {
        info!(
            "Processing submission {} (message ID: {})",
            submission.submission_id, message_id
        );

        // Process the submission
        let result = processor::service::process_submission(&submission).await;

        // Send result back to API
        match result {
            Ok(judge_result) => {
                if let Err(e) = send_result_to_api(api_url, &judge_result).await {
                    error!(
                        "Failed to send result for submission {}: {}",
                        submission.submission_id, e
                    );
                    // Don't acknowledge if sending failed
                    continue;
                }

                // Acknowledge the message
                match consumer::acknowledge_submission(
                    redis_client,
                    stream_name,
                    group_name,
                    &message_id,
                )
                .await
                {
                    Ok(_) => {
                        info!(
                            "Submission {} completed and acknowledged",
                            submission.submission_id
                        );
                        processed += 1;
                    }
                    Err(e) => {
                        warn!(
                            "Failed to acknowledge submission {}: {}",
                            submission.submission_id, e
                        );
                    }
                }
            }
            Err(e) => {
                error!(
                    "Failed to process submission {}: {}",
                    submission.submission_id, e
                );
                // Still acknowledge to avoid infinite retries
                let _ = consumer::acknowledge_submission(
                    redis_client,
                    stream_name,
                    group_name,
                    &message_id,
                )
                .await;
            }
        }
    }

    Ok(processed)
}

async fn send_result_to_api(api_url: &str, result: &queue::JudgeResult) -> Result<()> {
    use reqwest::Client;

    let client = Client::new();
    let url = format!("{}/submissions/{}/results", api_url, result.submission_id);

    let response = client
        .post(&url)
        .json(result)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to send result to API: {}", e))?;

    if response.status().is_success() {
        Ok(())
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!(
            "API returned error status {}: {}",
            status,
            body
        );
    }
}
