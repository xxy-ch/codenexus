//! Integration tests for the llm-worker crate.
//!
//! Tests end-to-end flows using wiremock to mock the LLM API.
//! These tests do NOT require a real database or Redis instance —
//! they validate the LLM client ↔ prompt generation ↔ response parsing path.

use llm_worker::config::WorkerConfig;
use llm_worker::llm_client::{ChatMessage, LlmClient, LlmError};
use llm_worker::prompts;

use std::time::Duration;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

/// Helper to build a test config pointing at a mock server.
fn test_config(mock_url: &str) -> WorkerConfig {
    WorkerConfig {
        llm_api_url: mock_url.to_string(),
        llm_fallback_url: None,
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

/// Helper to build a test config with a fallback URL.
fn test_config_with_fallback(primary_url: &str, fallback_url: &str) -> WorkerConfig {
    WorkerConfig {
        llm_api_url: primary_url.to_string(),
        llm_fallback_url: Some(fallback_url.to_string()),
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
// LLM Client — basic chat tests
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
    assert!(result.endpoint_used.contains("/v1/chat/completions"), "endpoint_used should be populated");
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
// chat_completion() with arbitrary messages
// ---------------------------------------------------------------------------

#[tokio::test]
async fn chat_completion_with_multiple_messages() {
    let server = MockServer::start().await;

    let response_body = mock_chat_response("I understand the context", 80, 20);

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_string(response_body))
        .mount(&server)
        .await;

    let config = test_config(&server.uri());
    let client = LlmClient::from_config(&config).unwrap();

    let messages = vec![
        ChatMessage {
            role: "user".to_string(),
            content: "Here is the problem description.".to_string(),
        },
        ChatMessage {
            role: "assistant".to_string(),
            content: "Got it, what's the submission?".to_string(),
        },
        ChatMessage {
            role: "user".to_string(),
            content: "Here is my code: print('hello')".to_string(),
        },
    ];

    let result = client
        .chat_completion(messages, "You are a code reviewer.")
        .await
        .expect("should succeed with multi-turn messages");

    assert_eq!(result.content, "I understand the context");
    assert_eq!(result.usage.prompt_tokens, 80);
}

// ---------------------------------------------------------------------------
// Automatic fallback tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn fallback_on_primary_failure() {
    let primary = MockServer::start().await;
    let fallback = MockServer::start().await;

    // Primary returns 500
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("internal error"))
        .mount(&primary)
        .await;

    // Fallback returns success
    let fallback_response = mock_chat_response("fallback answer", 50, 25);
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_string(fallback_response))
        .mount(&fallback)
        .await;

    let config = test_config_with_fallback(&primary.uri(), &fallback.uri());
    let client = LlmClient::from_config(&config).unwrap();

    let result = client
        .chat("system", "user")
        .await
        .expect("should succeed via fallback");

    assert_eq!(result.content, "fallback answer");
    assert_eq!(result.usage.prompt_tokens, 50);
    // endpoint_used should point to the fallback
    assert!(
        result.endpoint_used.contains(&fallback.uri()),
        "should have used fallback endpoint, got: {}",
        result.endpoint_used
    );
}

#[tokio::test]
async fn all_endpoints_failed_when_both_fail() {
    let primary = MockServer::start().await;
    let fallback = MockServer::start().await;

    // Both return errors
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("primary error"))
        .mount(&primary)
        .await;

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(503).set_body_string("fallback error"))
        .mount(&fallback)
        .await;

    let config = test_config_with_fallback(&primary.uri(), &fallback.uri());
    let client = LlmClient::from_config(&config).unwrap();

    let result = client.chat("system", "user").await;
    assert!(result.is_err());
    match result.unwrap_err() {
        LlmError::AllEndpointsFailed {
            primary_err,
            fallback_err,
        } => {
            assert!(primary_err.contains("500"), "primary_err: {primary_err}");
            assert!(fallback_err.contains("503"), "fallback_err: {fallback_err}");
        }
        other => panic!("expected AllEndpointsFailed, got: {other}"),
    }
}

#[tokio::test]
async fn no_fallback_returns_primary_error() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(429).set_body_string("rate limited"))
        .mount(&server)
        .await;

    let config = test_config(&server.uri()); // no fallback
    let client = LlmClient::from_config(&config).unwrap();

    let result = client.chat("system", "user").await;
    assert!(result.is_err());
    // Should NOT be AllEndpointsFailed — just the direct Api error
    match result.unwrap_err() {
        LlmError::Api { status, .. } => {
            assert_eq!(status.as_u16(), 429);
        }
        other => panic!("expected Api error, got: {other}"),
    }
}

// ---------------------------------------------------------------------------
// chat_completion_structured<T> tests
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Deserialize, PartialEq)]
struct TestAnalysis {
    title: String,
    quality: String,
    score: i32,
}

#[tokio::test]
async fn structured_output_parses_json() {
    let server = MockServer::start().await;

    let json_response = r#"{"title":"Good Code","quality":"excellent","score":85}"#;
    let response_body = mock_chat_response(json_response, 100, 40);

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_string(response_body))
        .mount(&server)
        .await;

    let config = test_config(&server.uri());
    let client = LlmClient::from_config(&config).unwrap();

    let messages = vec![ChatMessage {
        role: "user".to_string(),
        content: "Analyze this code.".to_string(),
    }];

    let (parsed, result) = client
        .chat_completion_structured::<TestAnalysis>(messages, "You are a code reviewer.")
        .await
        .expect("structured parse should succeed");

    assert_eq!(parsed.title, "Good Code");
    assert_eq!(parsed.quality, "excellent");
    assert_eq!(parsed.score, 85);
    assert_eq!(result.usage.prompt_tokens, 100);
}

#[tokio::test]
async fn structured_output_strips_markdown_fences() {
    let server = MockServer::start().await;

    // LLM wraps JSON in ```json ... ``` fences
    let fenced = "```json\n{\"title\":\"Fenced\",\"quality\":\"good\",\"score\":70}\n```";
    let response_body = mock_chat_response(fenced, 80, 30);

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_string(response_body))
        .mount(&server)
        .await;

    let config = test_config(&server.uri());
    let client = LlmClient::from_config(&config).unwrap();

    let messages = vec![ChatMessage {
        role: "user".to_string(),
        content: "Analyze.".to_string(),
    }];

    let (parsed, _) = client
        .chat_completion_structured::<TestAnalysis>(messages, "Review")
        .await
        .expect("should parse fenced JSON");

    assert_eq!(parsed.title, "Fenced");
    assert_eq!(parsed.score, 70);
}

#[tokio::test]
async fn structured_output_returns_json_parse_error() {
    let server = MockServer::start().await;

    // Invalid JSON content
    let response_body = mock_chat_response("This is not JSON at all", 50, 20);

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_string(response_body))
        .mount(&server)
        .await;

    let config = test_config(&server.uri());
    let client = LlmClient::from_config(&config).unwrap();

    let messages = vec![ChatMessage {
        role: "user".to_string(),
        content: "Analyze.".to_string(),
    }];

    let result = client
        .chat_completion_structured::<TestAnalysis>(messages, "Review")
        .await;

    assert!(result.is_err());
    match result.unwrap_err() {
        LlmError::JsonParse { raw, .. } => {
            assert_eq!(raw, "This is not JSON at all");
        }
        other => panic!("expected JsonParse error, got: {other}"),
    }
}

#[tokio::test]
async fn structured_output_uses_fallback() {
    let primary = MockServer::start().await;
    let fallback = MockServer::start().await;

    // Primary fails
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("error"))
        .mount(&primary)
        .await;

    // Fallback returns valid JSON
    let json_response = r#"{"title":"Fallback","quality":"ok","score":50}"#;
    let response_body = mock_chat_response(json_response, 60, 30);
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_string(response_body))
        .mount(&fallback)
        .await;

    let config = test_config_with_fallback(&primary.uri(), &fallback.uri());
    let client = LlmClient::from_config(&config).unwrap();

    let messages = vec![ChatMessage {
        role: "user".to_string(),
        content: "Analyze.".to_string(),
    }];

    let (parsed, result) = client
        .chat_completion_structured::<TestAnalysis>(messages, "Review")
        .await
        .expect("structured should work via fallback");

    assert_eq!(parsed.title, "Fallback");
    assert!(
        result.endpoint_used.contains(&fallback.uri()),
        "should have used fallback"
    );
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
        LlmError::JsonParse {
            endpoint: "http://test/api".to_string(),
            raw: "not json".to_string(),
            source: serde_json::from_str::<serde_json::Value>("bad").unwrap_err(),
        },
        LlmError::AllEndpointsFailed {
            primary_err: "conn refused".to_string(),
            fallback_err: "timeout".to_string(),
        },
    ];

    for err in &errors {
        let display = format!("{err}");
        assert!(!display.is_empty(), "error display should not be empty");
    }
}
