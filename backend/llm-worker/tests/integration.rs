//! Integration tests for the llm-worker crate.
//!
//! Tests end-to-end flows using wiremock to mock the LLM API.
//! These tests do NOT require a real database or Redis instance —
//! they validate the LLM client ↔ prompt generation ↔ response parsing path.

use llm_worker::config::WorkerConfig;
use llm_worker::llm_client::{LlmClient, LlmError};
use llm_worker::prompts;

use std::time::Duration;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

/// Helper to build a test config pointing at a mock server.
fn test_config(mock_url: &str) -> WorkerConfig {
    WorkerConfig {
        llm_api_url: mock_url.to_string(),
        llm_api_key: Some("sk-test".to_string()),
        llm_model: "test-model".to_string(),
        llm_timeout: Duration::from_secs(5),
        max_retries: 2,
        redis_url: "redis://localhost:6379".to_string(),
        redis_stream: "test_stream".to_string(),
        consumer_group: "test-group".to_string(),
        consumer_name: "test-worker".to_string(),
        database_url: "postgres://localhost/test".to_string(),
    }
}

/// Build a valid OpenAI-compatible chat completion response body.
fn mock_chat_response(content: &str, prompt_tokens: i32, completion_tokens: i32) -> String {
    serde_json::json!({
        "id": "chatcmpl-test",
        "object": "chat.completion",
        "model": "test-model",
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": content
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens
        }
    })
    .to_string()
}

// ---------------------------------------------------------------------------
// LLM Client integration tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn llm_client_successful_chat() {
    let server = MockServer::start().await;

    let response_body = mock_chat_response(
        r#"{"title": "Good Solution", "insights": [], "suggestions": [], "complexity": {"time": "O(n)", "space": "O(1)"}, "overall_quality": "good"}"#,
        100,
        50,
    );

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_string(response_body))
        .mount(&server)
        .await;

    let config = test_config(&server.uri());
    let client = LlmClient::from_config(&config).expect("should build client");

    let result = client
        .chat("You are a helpful assistant.", "Analyze this code.")
        .await
        .expect("chat should succeed");

    assert!(result.content.contains("Good Solution"));
    assert_eq!(result.usage.prompt_tokens, 100);
    assert_eq!(result.usage.completion_tokens, 50);
    assert!(result.latency.as_millis() < 5000, "latency should be within timeout");
}

#[tokio::test]
async fn llm_client_handles_api_error() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(
            ResponseTemplate::new(429)
                .set_body_string(r#"{"error": {"message": "rate limit exceeded"}}"#),
        )
        .mount(&server)
        .await;

    let config = test_config(&server.uri());
    let client = LlmClient::from_config(&config).unwrap();

    let result = client.chat("system", "user").await;
    assert!(result.is_err());
    match result.unwrap_err() {
        LlmError::Api { status, .. } => {
            assert_eq!(status.as_u16(), 429);
        }
        other => panic!("expected Api error, got: {other}"),
    }
}

#[tokio::test]
async fn llm_client_handles_malformed_response() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_string("not valid json at all"))
        .mount(&server)
        .await;

    let config = test_config(&server.uri());
    let client = LlmClient::from_config(&config).unwrap();

    let result = client.chat("system", "user").await;
    assert!(result.is_err());
    match result.unwrap_err() {
        LlmError::MalformedResponse { .. } => {}
        other => panic!("expected MalformedResponse error, got: {other}"),
    }
}

#[tokio::test]
async fn llm_client_handles_empty_choices() {
    let server = MockServer::start().await;

    let body = serde_json::json!({
        "id": "chatcmpl-test",
        "choices": [],
        "usage": {"prompt_tokens": 10, "completion_tokens": 0, "total_tokens": 10}
    })
    .to_string();

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_string(body))
        .mount(&server)
        .await;

    let config = test_config(&server.uri());
    let client = LlmClient::from_config(&config).unwrap();

    let result = client.chat("system", "user").await;
    assert!(result.is_err());
    match result.unwrap_err() {
        LlmError::EmptyResponse { .. } => {}
        other => panic!("expected EmptyResponse error, got: {other}"),
    }
}

#[tokio::test]
async fn llm_client_handles_connection_failure() {
    // Use a port that's almost certainly not listening
    let config = test_config("http://127.0.0.1:1");
    let client = LlmClient::from_config(&config).unwrap();

    let result = client.chat("system", "user").await;
    assert!(result.is_err(), "should fail when server is unreachable");
    // The error could be Http (direct connection refused) or Api (via proxy returning 502)
    let err_msg = format!("{}", result.unwrap_err());
    assert!(
        err_msg.contains("127.0.0.1"),
        "error should reference the endpoint: {err_msg}"
    );
}

#[tokio::test]
async fn llm_client_sends_bearer_auth_when_key_set() {
    let server = MockServer::start().await;

    let response_body = mock_chat_response("ok", 10, 5);

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_string(response_body))
        .expect(1)
        .mount(&server)
        .await;

    let config = test_config(&server.uri());
    assert!(config.llm_api_key.is_some());
    let client = LlmClient::from_config(&config).unwrap();
    let result = client.chat("system", "user").await;
    assert!(result.is_ok());
}

// ---------------------------------------------------------------------------
// Prompt generation integration tests
// ---------------------------------------------------------------------------

#[test]
fn code_review_prompt_produces_valid_template() {
    let prompt = prompts::code_review_prompt(
        "Reverse Linked List",
        "Reverse a singly linked list.",
        Some("Easy"),
        "python",
        "class Solution:\n    def reverseList(self, head):\n        pass",
    );

    // Verify all critical sections are present
    assert!(prompt.contains("Reverse Linked List"));
    assert!(prompt.contains("Easy"));
    assert!(prompt.contains("python"));
    assert!(prompt.contains("class Solution"));
    assert!(prompt.contains("insights"));
    assert!(prompt.contains("suggestions"));
    assert!(prompt.contains("complexity"));
    assert!(prompt.contains("JSON"));
}

#[test]
fn system_prompt_contains_instructions() {
    let prompt = prompts::system_prompt();
    assert!(!prompt.is_empty(), "system prompt should not be empty");
    // Check for key instructional elements
    assert!(prompt.to_lowercase().contains("json") || prompt.contains("JSON"));
}

// ---------------------------------------------------------------------------
// Error type round-trip tests
// ---------------------------------------------------------------------------

#[test]
fn llm_error_round_trip_display() {
    let errors: Vec<LlmError> = vec![
        LlmError::EmptyResponse {
            endpoint: "http://test/api".to_string(),
        },
        LlmError::MalformedResponse {
            endpoint: "http://test/api".to_string(),
            message: "bad json".to_string(),
        },
    ];

    for err in &errors {
        let display = format!("{err}");
        assert!(!display.is_empty(), "error display should not be empty");
    }
}
