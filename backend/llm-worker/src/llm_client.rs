//! LLM API client for the llm-worker.
//!
//! Provides an OpenAI-compatible chat completion client with configurable
//! base URL, API key, model, and timeout.

use std::fmt;
use std::time::{Duration, Instant};

use anyhow::Result;
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};

use crate::config::WorkerConfig;

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/// Errors that can occur during LLM API calls.
#[derive(Debug)]
pub enum LlmError {
    /// HTTP transport error (connection refused, timeout, DNS failure, etc.).
    Http { endpoint: String, source: reqwest::Error },
    /// The API returned a non-2xx status code.
    Api { endpoint: String, status: StatusCode, body: String },
    /// The response body could not be parsed.
    MalformedResponse { endpoint: String, message: String },
    /// The response contained no choices.
    EmptyResponse { endpoint: String },
}

impl fmt::Display for LlmError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Http { endpoint, source } => {
                write!(f, "LLM HTTP error for {endpoint}: {source}")
            }
            Self::Api { endpoint, status, body } => {
                write!(f, "LLM API error for {endpoint}: status {status}, body: {body}")
            }
            Self::MalformedResponse { endpoint, message } => {
                write!(f, "LLM malformed response from {endpoint}: {message}")
            }
            Self::EmptyResponse { endpoint } => {
                write!(f, "LLM returned no choices from {endpoint}")
            }
        }
    }
}

impl std::error::Error for LlmError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Http { source, .. } => Some(source),
            _ => None,
        }
    }
}

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

/// OpenAI-compatible chat completion request.
#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// OpenAI-compatible chat completion response.
#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
    usage: Option<ChatUsage>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ChatUsage {
    pub prompt_tokens: i32,
    pub completion_tokens: i32,
    pub total_tokens: i32,
}

/// Result of a successful LLM chat completion call.
#[derive(Debug, Clone)]
pub struct LlmResult {
    pub content: String,
    pub model: String,
    pub usage: ChatUsage,
    pub latency: Duration,
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/// An OpenAI-compatible LLM chat completion client.
#[derive(Debug, Clone)]
pub struct LlmClient {
    base_url: String,
    api_key: Option<String>,
    model: String,
    http: Client,
}

impl LlmClient {
    /// Build a new client from the worker configuration.
    pub fn from_config(config: &WorkerConfig) -> Result<Self> {
        let http = Client::builder()
            .timeout(config.llm_timeout)
            .build()
            .map_err(|e| anyhow::anyhow!("failed to build HTTP client: {e}"))?;

        Ok(Self {
            base_url: config.llm_api_url.trim_end_matches('/').to_string(),
            api_key: config.llm_api_key.clone(),
            model: config.llm_model.clone(),
            http,
        })
    }

    /// Build the full chat completion URL.
    pub fn chat_url(&self) -> String {
        format!("{}/v1/chat/completions", self.base_url)
    }

    /// Send a chat completion request with a single system + user message pair.
    pub async fn chat(
        &self,
        system_prompt: &str,
        user_message: &str,
    ) -> std::result::Result<LlmResult, LlmError> {
        let start = Instant::now();
        let url = self.chat_url();

        let request = ChatRequest {
            model: self.model.clone(),
            messages: vec![
                ChatMessage {
                    role: "system".to_string(),
                    content: system_prompt.to_string(),
                },
                ChatMessage {
                    role: "user".to_string(),
                    content: user_message.to_string(),
                },
            ],
            temperature: 0.3,
        };

        let mut builder = self.http.post(&url).json(&request);
        if let Some(ref key) = self.api_key {
            builder = builder.bearer_auth(key);
        }

        let response = builder.send().await.map_err(|source| LlmError::Http {
            endpoint: url.clone(),
            source,
        })?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_else(|e| format!("<failed to read body: {e}>"));
            return Err(LlmError::Api {
                endpoint: url,
                status,
                body,
            });
        }

        let body = response.text().await.map_err(|source| LlmError::Http {
            endpoint: url.clone(),
            source,
        })?;

        let parsed: ChatResponse =
            serde_json::from_str(&body).map_err(|source| LlmError::MalformedResponse {
                endpoint: url.clone(),
                message: format!("{source}"),
            })?;

        let choice = parsed.choices.into_iter().next().ok_or_else(|| LlmError::EmptyResponse {
            endpoint: url,
        })?;

        let usage = parsed.usage.unwrap_or(ChatUsage {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
        });

        Ok(LlmResult {
            content: choice.message.content,
            model: self.model.clone(),
            usage,
            latency: start.elapsed(),
        })
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::WorkerConfig;

    fn test_config() -> WorkerConfig {
        WorkerConfig {
            llm_api_url: "https://api.example.com".to_string(),
            llm_api_key: Some("sk-test".to_string()),
            llm_model: "test-model".to_string(),
            llm_timeout: Duration::from_secs(30),
            max_retries: 3,
            redis_url: "redis://localhost:6379".to_string(),
            redis_stream: "test_stream".to_string(),
            consumer_group: "test-group".to_string(),
            consumer_name: "test-worker".to_string(),
            database_url: "postgres://localhost/test".to_string(),
        }
    }

    #[test]
    fn from_config_builds_client() {
        let config = test_config();
        let client = LlmClient::from_config(&config).expect("should build client");
        assert_eq!(client.base_url, "https://api.example.com");
        assert_eq!(client.model, "test-model");
        assert_eq!(client.api_key.as_deref(), Some("sk-test"));
    }

    #[test]
    fn chat_url_joins_correctly() {
        let config = test_config();
        let client = LlmClient::from_config(&config).unwrap();
        assert_eq!(client.chat_url(), "https://api.example.com/v1/chat/completions");
    }

    #[test]
    fn chat_url_strips_trailing_slash() {
        let mut config = test_config();
        config.llm_api_url = "https://api.example.com/".to_string();
        let client = LlmClient::from_config(&config).unwrap();
        assert_eq!(client.chat_url(), "https://api.example.com/v1/chat/completions");
    }

    #[test]
    fn client_works_without_api_key() {
        let mut config = test_config();
        config.llm_api_key = None;
        let client = LlmClient::from_config(&config).expect("should build without API key");
        assert!(client.api_key.is_none());
    }

    #[test]
    fn llm_error_display_formats() {
        let err = LlmError::EmptyResponse {
            endpoint: "https://api.test.com/v1/chat/completions".to_string(),
        };
        let msg = format!("{err}");
        assert!(msg.contains("no choices"));
        assert!(msg.contains("api.test.com"));
    }
}
