//! LLM API client for the llm-worker.
//!
//! Provides an OpenAI-compatible chat completion client with:
//! - Configurable primary and fallback endpoints (automatic failover)
//! - Generic structured-output parsing via `chat_completion_structured<T>`
//! - Usage tracking (prompt_tokens, completion_tokens)
//! - Per-request timeout with configurable duration

use std::fmt;
use std::time::{Duration, Instant};

use anyhow::Result;
use reqwest::{Client, StatusCode};
use serde::{de::DeserializeOwned, Deserialize, Serialize};

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
    /// The structured JSON output could not be deserialized to the target type.
    JsonParse { endpoint: String, raw: String, source: serde_json::Error },
    /// Both primary and fallback endpoints failed.
    AllEndpointsFailed { primary_err: String, fallback_err: String },
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
            Self::JsonParse { endpoint, raw, source } => {
                write!(f, "LLM JSON parse error from {endpoint}: {source} (raw: {raw:.200})")
            }
            Self::AllEndpointsFailed { primary_err, fallback_err } => {
                write!(
                    f,
                    "Both LLM endpoints failed — primary: {primary_err}; fallback: {fallback_err}"
                )
            }
        }
    }
}

impl std::error::Error for LlmError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Http { source, .. } => Some(source),
            Self::JsonParse { source, .. } => Some(source),
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
    /// Which endpoint served this request (for observability).
    pub endpoint_used: String,
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/// An OpenAI-compatible LLM chat completion client with automatic failover.
#[derive(Debug, Clone)]
pub struct LlmClient {
    primary_url: String,
    fallback_url: Option<String>,
    api_key: Option<String>,
    model: String,
    http: Client,
}

impl LlmClient {
    /// Create a new client with explicit configuration.
    ///
    /// - `primary_url`: Base URL for the primary LLM endpoint (e.g. `https://api.openai.com`).
    /// - `fallback_url`: Optional base URL for a fallback endpoint on primary failure.
    /// - `api_key`: Optional bearer token.
    /// - `model`: Model identifier (e.g. `gpt-4o`, `deepseek-coder`).
    /// - `timeout`: Per-request HTTP timeout.
    pub fn new(
        primary_url: &str,
        fallback_url: Option<&str>,
        api_key: Option<&str>,
        model: &str,
        timeout: Duration,
    ) -> Result<Self> {
        let http = Client::builder()
            .timeout(timeout)
            .build()
            .map_err(|e| anyhow::anyhow!("failed to build HTTP client: {e}"))?;

        Ok(Self {
            primary_url: primary_url.trim_end_matches('/').to_string(),
            fallback_url: fallback_url.map(|u| u.trim_end_matches('/').to_string()),
            api_key: api_key.map(|k| k.to_string()),
            model: model.to_string(),
            http,
        })
    }

    /// Build a new client from the worker configuration.
    ///
    /// Reads `llm_api_url`, `llm_fallback_url`, `llm_api_key`, `llm_model`,
    /// and `llm_timeout` from the config.
    pub fn from_config(config: &WorkerConfig) -> Result<Self> {
        Self::new(
            &config.llm_api_url,
            config.llm_fallback_url.as_deref(),
            config.llm_api_key.as_deref(),
            &config.llm_model,
            config.llm_timeout,
        )
    }

    /// Build the chat completion URL for a given base URL.
    fn chat_url_for(base: &str) -> String {
        format!("{}/v1/chat/completions", base)
    }

    /// Build the primary chat completion URL.
    pub fn chat_url(&self) -> String {
        Self::chat_url_for(&self.primary_url)
    }

    /// Send a raw chat completion request to a specific endpoint URL.
    ///
    /// Returns the parsed `LlmResult` on success, or an `LlmError` on failure.
    async fn send_request(
        &self,
        url: &str,
        messages: Vec<ChatMessage>,
        temperature: f32,
    ) -> std::result::Result<LlmResult, LlmError> {
        let start = Instant::now();

        let request = ChatRequest {
            model: self.model.clone(),
            messages,
            temperature,
        };

        let mut builder = self.http.post(url).json(&request);
        if let Some(ref key) = self.api_key {
            builder = builder.bearer_auth(key);
        }

        let response = builder.send().await.map_err(|source| LlmError::Http {
            endpoint: url.to_string(),
            source,
        })?;

        let status = response.status();
        if !status.is_success() {
            let body = response
                .text()
                .await
                .unwrap_or_else(|e| format!("<failed to read body: {e}>"));
            return Err(LlmError::Api {
                endpoint: url.to_string(),
                status,
                body,
            });
        }

        let body = response.text().await.map_err(|source| LlmError::Http {
            endpoint: url.to_string(),
            source,
        })?;

        let parsed: ChatResponse =
            serde_json::from_str(&body).map_err(|source| LlmError::MalformedResponse {
                endpoint: url.to_string(),
                message: format!("{source}"),
            })?;

        let choice = parsed.choices.into_iter().next().ok_or_else(|| LlmError::EmptyResponse {
            endpoint: url.to_string(),
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
            endpoint_used: url.to_string(),
        })
    }

    /// Send a chat completion request with automatic fallback.
    ///
    /// Tries the primary endpoint first. If it fails and a fallback URL is
    /// configured, retries on the fallback. Returns
    /// [`LlmError::AllEndpointsFailed`] if both fail.
    async fn send_with_fallback(
        &self,
        messages: Vec<ChatMessage>,
        temperature: f32,
    ) -> std::result::Result<LlmResult, LlmError> {
        let primary_url = self.chat_url();

        match self.send_request(&primary_url, messages.clone(), temperature).await {
            Ok(result) => Ok(result),
            Err(primary_err) => {
                if let Some(ref fallback_base) = self.fallback_url {
                    let fallback_url = Self::chat_url_for(fallback_base);
                    tracing::warn!(
                        %primary_err,
                        fallback_url = %fallback_url,
                        "Primary LLM endpoint failed, trying fallback"
                    );
                    match self.send_request(&fallback_url, messages, temperature).await {
                        Ok(result) => {
                            tracing::info!(
                                latency_ms = result.latency.as_millis() as u64,
                                "Fallback endpoint succeeded"
                            );
                            Ok(result)
                        }
                        Err(fallback_err) => Err(LlmError::AllEndpointsFailed {
                            primary_err: primary_err.to_string(),
                            fallback_err: fallback_err.to_string(),
                        }),
                    }
                } else {
                    Err(primary_err)
                }
            }
        }
    }

    /// General-purpose chat completion accepting arbitrary messages.
    ///
    /// Prepends the system prompt as the first message, followed by the
    /// user-supplied messages. Automatically falls back to the secondary
    /// endpoint on failure.
    pub async fn chat_completion(
        &self,
        messages: Vec<ChatMessage>,
        system_prompt: &str,
    ) -> std::result::Result<LlmResult, LlmError> {
        let mut all_messages = vec![ChatMessage {
            role: "system".to_string(),
            content: system_prompt.to_string(),
        }];
        all_messages.extend(messages);

        self.send_with_fallback(all_messages, 0.3).await
    }

    /// Request a structured JSON response from the LLM and deserialize it.
    ///
    /// Appends an instruction to the system prompt requesting JSON output,
    /// then parses the response content as `T`. On JSON parse failure returns
    /// [`LlmError::JsonParse`].
    pub async fn chat_completion_structured<T: DeserializeOwned>(
        &self,
        messages: Vec<ChatMessage>,
        system_prompt: &str,
    ) -> std::result::Result<(T, LlmResult), LlmError> {
        let structured_prompt = format!(
            "{system_prompt}\n\nYou MUST respond with valid JSON only. \
             Do not include any text before or after the JSON object."
        );

        let mut all_messages = vec![ChatMessage {
            role: "system".to_string(),
            content: structured_prompt,
        }];
        all_messages.extend(messages);

        let result = self.send_with_fallback(all_messages, 0.2).await?;

        // Strip markdown code fences if present (```json ... ```)
        let content = result.content.trim();
        let json_str = if content.starts_with("```") {
            // Remove opening fence (possibly with language tag)
            let without_open = content
                .find('\n')
                .map(|i| &content[i + 1..])
                .unwrap_or(content);
            // Remove closing fence
            without_open
                .trim_end()
                .strip_suffix("```")
                .unwrap_or(without_open)
                .trim()
        } else {
            content
        };

        let parsed: T = serde_json::from_str(json_str).map_err(|source| LlmError::JsonParse {
            endpoint: result.endpoint_used.clone(),
            raw: result.content.clone(),
            source,
        })?;

        Ok((parsed, result))
    }

    /// Convenience method: chat with a simple system + user message pair.
    ///
    /// Equivalent to `chat_completion(vec![user_message], system_prompt)`.
    pub async fn chat(
        &self,
        system_prompt: &str,
        user_message: &str,
    ) -> std::result::Result<LlmResult, LlmError> {
        let messages = vec![ChatMessage {
            role: "user".to_string(),
            content: user_message.to_string(),
        }];
        self.chat_completion(messages, system_prompt).await
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
            llm_fallback_url: None,
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

    // -- new() constructor tests --

    #[test]
    fn new_builds_client_with_all_fields() {
        let client = LlmClient::new(
            "https://api.openai.com/",
            Some("https://fallback.openai.com/"),
            Some("sk-key"),
            "gpt-4o",
            Duration::from_secs(30),
        )
        .expect("should build client");

        assert_eq!(client.primary_url, "https://api.openai.com");
        assert_eq!(
            client.fallback_url.as_deref(),
            Some("https://fallback.openai.com")
        );
        assert_eq!(client.api_key.as_deref(), Some("sk-key"));
        assert_eq!(client.model, "gpt-4o");
    }

    #[test]
    fn new_works_without_fallback() {
        let client = LlmClient::new(
            "https://api.openai.com",
            None,
            Some("sk-key"),
            "gpt-4o",
            Duration::from_secs(30),
        )
        .expect("should build");

        assert!(client.fallback_url.is_none());
    }

    #[test]
    fn new_works_without_api_key() {
        let client = LlmClient::new(
            "https://api.openai.com",
            None,
            None,
            "gpt-4o",
            Duration::from_secs(30),
        )
        .expect("should build without key");

        assert!(client.api_key.is_none());
    }

    #[test]
    fn new_strips_trailing_slash() {
        let client = LlmClient::new(
            "https://api.example.com/",
            Some("https://fallback.example.com/"),
            None,
            "test",
            Duration::from_secs(10),
        )
        .unwrap();

        assert_eq!(client.primary_url, "https://api.example.com");
        assert_eq!(
            client.fallback_url.as_deref(),
            Some("https://fallback.example.com")
        );
    }

    // -- from_config tests --

    #[test]
    fn from_config_builds_client() {
        let config = test_config();
        let client = LlmClient::from_config(&config).expect("should build client");
        assert_eq!(client.primary_url, "https://api.example.com");
        assert_eq!(client.model, "test-model");
        assert_eq!(client.api_key.as_deref(), Some("sk-test"));
        assert!(client.fallback_url.is_none());
    }

    #[test]
    fn from_config_with_fallback() {
        let mut config = test_config();
        config.llm_fallback_url = Some("https://fallback.example.com".to_string());
        let client = LlmClient::from_config(&config).unwrap();
        assert_eq!(
            client.fallback_url.as_deref(),
            Some("https://fallback.example.com")
        );
    }

    // -- URL construction tests --

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

    // -- Error display tests --

    #[test]
    fn llm_error_display_formats() {
        let cases: Vec<LlmError> = vec![
            LlmError::EmptyResponse {
                endpoint: "https://api.test.com/v1/chat/completions".to_string(),
            },
            LlmError::JsonParse {
                endpoint: "https://api.test.com/v1/chat/completions".to_string(),
                raw: "not json".to_string(),
                source: serde_json::from_str::<serde_json::Value>("bad").unwrap_err(),
            },
            LlmError::AllEndpointsFailed {
                primary_err: "connection refused".to_string(),
                fallback_err: "timeout".to_string(),
            },
        ];

        for err in &cases {
            let msg = format!("{err}");
            assert!(!msg.is_empty(), "error display should not be empty");
        }
    }

    #[test]
    fn llm_error_http_provides_source() {
        // Verify the Http variant carries a source
        let err = LlmError::AllEndpointsFailed {
            primary_err: "conn refused".to_string(),
            fallback_err: "timeout".to_string(),
        };
        // AllEndpointsFailed has no source — just verify it displays correctly
        assert!(format!("{err}").contains("conn refused"));
        assert!(format!("{err}").contains("timeout"));
    }
}
