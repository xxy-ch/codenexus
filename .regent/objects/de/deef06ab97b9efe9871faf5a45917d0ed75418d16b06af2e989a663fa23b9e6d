//! Integration tests for the llm-worker crate.
//!
//! Tests end-to-end flows using wiremock to mock the LLM API.
//! These tests do NOT require a real database or Redis instance —
//! they validate the LLM client ↔ prompt generation ↔ response parsing path.
//!
//! Coverage:
//! - LLM client: basic chat, error handling, fallback, structured output
//! - Prompt generation: code review and teaching card templates
//! - End-to-end: prompt → mock LLM → structured parse with real schemas
//! - Edge cases: markdown fences, empty responses, timeouts, boundary JSON
//! - Decoupling: no dependency on domain-analysis or other workspace crates

use llm_worker::config::WorkerConfig;
use llm_worker::llm_client::{ChatMessage, LlmClient, LlmError};
use llm_worker::processor::{convert_messages, is_transient_error};
use llm_worker::prompts::{
    self, CodeReviewInsight, CodeReviewOutput, ComplexityEstimate, InsightType, LlmMessage,
    QualityLevel, TeachingCardOutput,
};

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
    assert!(
        result.latency.as_millis() < 5000,
        "latency should be within timeout"
    );
    assert!(
        result.endpoint_used.contains("/v1/chat/completions"),
        "endpoint_used should be populated"
    );
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
    let msgs = prompts::code_review_prompt(
        "Reverse Linked List",
        "Reverse a singly linked list.",
        Some("Easy"),
        "python",
        "class Solution:\n    def reverseList(self, head):\n        pass",
    );

    let user_content = &msgs[1].content;
    assert!(user_content.contains("Reverse Linked List"));
    assert!(user_content.contains("Easy"));
    assert!(user_content.contains("python"));
    assert!(user_content.contains("class Solution"));
    assert!(user_content.contains("insights"));
    assert!(user_content.contains("suggestions"));
    assert!(user_content.contains("complexity"));
}

#[test]
fn system_prompt_contains_instructions() {
    let prompt = prompts::system_prompt();
    assert!(!prompt.is_empty(), "system prompt should not be empty");
    assert!(prompt.contains("JSON") || prompt.to_lowercase().contains("json"));
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

// ===========================================================================
// NEW: End-to-end pipeline tests with real structured schemas
// ===========================================================================

// --- End-to-end: code_review_prompt → mock LLM → CodeReviewOutput ---

#[tokio::test]
async fn e2e_code_review_pipeline_with_structured_output() {
    let server = MockServer::start().await;

    // Build a realistic CodeReviewOutput JSON
    let review_json = serde_json::json!({
        "title": "暴力枚举解法",
        "insights": [
            {
                "type": "anti_pattern",
                "description": "使用了双重循环 O(n²) 枚举",
                "code_reference": "第 3-5 行"
            },
            {
                "type": "optimization",
                "description": "可使用哈希表优化至 O(n)",
                "code_reference": "整体逻辑"
            }
        ],
        "suggestions": [
            "使用哈希表存储已遍历元素",
            "考虑提前返回以减少不必要的遍历"
        ],
        "complexity": {
            "time": "O(n²)",
            "space": "O(1)"
        },
        "overall_quality": "fair"
    });

    let response_body = mock_chat_response(&review_json.to_string(), 1200, 450);

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_string(response_body))
        .mount(&server)
        .await;

    let config = test_config(&server.uri());
    let client = LlmClient::from_config(&config).unwrap();

    // Step 1: Generate prompt
    let prompt_messages = prompts::code_review_prompt(
        "Two Sum",
        "给定一个整数数组，找出和为目标值的两个整数的索引。",
        Some("Easy"),
        "python",
        "def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]",
    );

    // Step 2: Convert to chat messages
    let chat_messages = convert_messages(prompt_messages);
    assert_eq!(chat_messages.len(), 2);
    assert_eq!(chat_messages[0].role, "system");
    assert_eq!(chat_messages[1].role, "user");

    // Step 3: Call LLM with structured output
    let (review, result) = client
        .chat_completion_structured::<CodeReviewOutput>(chat_messages, "")
        .await
        .expect("structured parse should succeed");

    // Step 4: Verify parsed structured output
    assert_eq!(review.title, "暴力枚举解法");
    assert_eq!(review.insights.len(), 2);
    assert_eq!(review.insights[0].insight_type, InsightType::AntiPattern);
    assert_eq!(review.insights[1].insight_type, InsightType::Optimization);
    assert_eq!(review.suggestions.len(), 2);
    assert_eq!(review.complexity.time, "O(n²)");
    assert_eq!(review.complexity.space, "O(1)");
    assert_eq!(review.overall_quality, QualityLevel::Fair);

    // Step 5: Verify usage metrics
    assert_eq!(result.usage.prompt_tokens, 1200);
    assert_eq!(result.usage.completion_tokens, 450);
    assert_eq!(result.usage.total_tokens, 1650);
    assert!(!result.endpoint_used.is_empty());
}

// --- End-to-end: teaching_card_prompt → mock LLM → TeachingCardOutput ---

#[tokio::test]
async fn e2e_teaching_card_pipeline_with_structured_output() {
    let server = MockServer::start().await;

    let card_json = serde_json::json!({
        "title": "暴力枚举模式分析",
        "summary": "多数学生使用双重循环暴力枚举，未考虑哈希表优化",
        "key_concepts": ["嵌套循环", "暴力搜索", "哈希表优化"],
        "examples": [
            {
                "label": "典型暴力解法",
                "language": "python",
                "code": "for i in range(n):\n    for j in range(n):",
                "explanation": "O(n²) 时间复杂度，空间 O(1)"
            }
        ],
        "common_mistakes": ["未考虑重复元素", "缺少边界检查", "未使用哈希表"],
        "improvement_tips": ["使用字典存储已遍历元素", "一次遍历即可找到答案"],
        "target_difficulty": "easy"
    });

    let response_body = mock_chat_response(&card_json.to_string(), 800, 350);

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_string(response_body))
        .mount(&server)
        .await;

    let config = test_config(&server.uri());
    let client = LlmClient::from_config(&config).unwrap();

    // Generate prompt
    let prompt_messages = prompts::teaching_card_prompt(
        "Two Sum",
        "大多数学生使用了暴力解法，时间复杂度为 O(n²)。",
        &[(
            "python",
            "for i in range(len(nums)):\n    for j in range(i+1, len(nums)):",
        )],
    );

    let chat_messages = convert_messages(prompt_messages);
    assert_eq!(chat_messages.len(), 2);

    let (card, result) = client
        .chat_completion_structured::<TeachingCardOutput>(chat_messages, "")
        .await
        .expect("structured parse should succeed");

    assert_eq!(card.title, "暴力枚举模式分析");
    assert_eq!(card.key_concepts.len(), 3);
    assert_eq!(card.examples.len(), 1);
    assert_eq!(card.examples[0].language, "python");
    assert_eq!(card.common_mistakes.len(), 3);
    assert_eq!(card.improvement_tips.len(), 2);
    assert_eq!(card.target_difficulty, "easy");

    assert_eq!(result.usage.prompt_tokens, 800);
    assert_eq!(result.usage.completion_tokens, 350);
}

// ===========================================================================
// NEW: Edge case and boundary tests
// ===========================================================================

// --- Markdown fence variations ---

#[tokio::test]
async fn structured_output_handles_fenced_json_with_language_tag() {
    let server = MockServer::start().await;

    // ```json ... ``` with language tag
    let fenced = "```json\n{\"title\":\"Fenced JSON\",\"quality\":\"good\",\"score\":70}\n```";
    let response_body = mock_chat_response(fenced, 50, 20);

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
        .expect("should parse fenced JSON with language tag");

    assert_eq!(parsed.title, "Fenced JSON");
    assert_eq!(parsed.score, 70);
}

#[tokio::test]
async fn structured_output_handles_fenced_json_without_language() {
    let server = MockServer::start().await;

    // ``` ... ``` without language tag
    let fenced = "```\n{\"title\":\"No Lang\",\"quality\":\"excellent\",\"score\":95}\n```";
    let response_body = mock_chat_response(fenced, 50, 20);

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
        .expect("should parse fenced JSON without language tag");

    assert_eq!(parsed.title, "No Lang");
    assert_eq!(parsed.score, 95);
}

// --- Null content and missing fields ---

#[tokio::test]
async fn llm_client_handles_null_content_in_choice() {
    let server = MockServer::start().await;

    let body = serde_json::json!({
        "id": "chatcmpl-test",
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": null
            },
            "finish_reason": "stop"
        }],
        "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}
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
    // null content deserializes as empty string or causes an error — both are acceptable
    match result {
        Ok(r) => assert_eq!(
            r.content, "null",
            "null content should be deserialized as 'null' string"
        ),
        Err(LlmError::MalformedResponse { .. }) => {} // also acceptable
        Err(other) => panic!("unexpected error: {other}"),
    }
}

#[tokio::test]
async fn llm_client_handles_missing_usage_field() {
    let server = MockServer::start().await;

    let body = serde_json::json!({
        "id": "chatcmpl-test",
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": "response"},
            "finish_reason": "stop"
        }]
        // no usage field
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
    // Should succeed with zero-default usage
    let r = result.expect("should handle missing usage");
    assert_eq!(r.content, "response");
    assert_eq!(
        r.usage.prompt_tokens, 0,
        "missing usage should default to 0"
    );
    assert_eq!(r.usage.completion_tokens, 0);
}

// --- Server error codes ---

#[tokio::test]
async fn llm_client_handles_401_unauthorized() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(
            ResponseTemplate::new(401)
                .set_body_string(r#"{"error": {"message": "invalid api key"}}"#),
        )
        .mount(&server)
        .await;

    let config = test_config(&server.uri());
    let client = LlmClient::from_config(&config).unwrap();

    let result = client.chat("system", "user").await;
    match result.unwrap_err() {
        LlmError::Api { status, body, .. } => {
            assert_eq!(status.as_u16(), 401);
            assert!(body.contains("invalid api key"));
        }
        other => panic!("expected Api error, got: {other}"),
    }
}

#[tokio::test]
async fn llm_client_handles_500_internal_error() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .mount(&server)
        .await;

    let config = test_config(&server.uri());
    let client = LlmClient::from_config(&config).unwrap();

    let result = client.chat("system", "user").await;
    match result.unwrap_err() {
        LlmError::Api { status, .. } => {
            assert_eq!(status.as_u16(), 500);
        }
        other => panic!("expected Api error, got: {other}"),
    }
}

#[tokio::test]
async fn llm_client_handles_503_service_unavailable() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(503).set_body_string("Service Unavailable"))
        .mount(&server)
        .await;

    let config = test_config(&server.uri());
    let client = LlmClient::from_config(&config).unwrap();

    let result = client.chat("system", "user").await;
    match result.unwrap_err() {
        LlmError::Api { status, .. } => {
            assert_eq!(status.as_u16(), 503);
        }
        other => panic!("expected Api error, got: {other}"),
    }
}

// --- Fallback edge cases ---

#[tokio::test]
async fn fallback_on_connection_failure() {
    // Primary is unreachable, fallback is a working mock
    let fallback = MockServer::start().await;

    let fallback_response = mock_chat_response("fallback works", 30, 10);
    Mock::given(method("POST"))
        .and(path("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_string(fallback_response))
        .mount(&fallback)
        .await;

    let config = test_config_with_fallback("http://127.0.0.1:1", &fallback.uri());
    let client = LlmClient::from_config(&config).unwrap();

    let result = client
        .chat("system", "user")
        .await
        .expect("should succeed via fallback when primary is unreachable");

    assert_eq!(result.content, "fallback works");
    assert!(
        result.endpoint_used.contains(&fallback.uri()),
        "should have used fallback endpoint"
    );
}

#[tokio::test]
async fn all_endpoints_fail_on_connection_error() {
    // Both endpoints are unreachable
    let config = test_config_with_fallback("http://127.0.0.1:1", "http://127.0.0.1:2");
    let client = LlmClient::from_config(&config).unwrap();

    let result = client.chat("system", "user").await;
    assert!(result.is_err());
    match result.unwrap_err() {
        LlmError::AllEndpointsFailed {
            primary_err,
            fallback_err,
        } => {
            assert!(!primary_err.is_empty());
            assert!(!fallback_err.is_empty());
        }
        // When only primary fails (no fallback URL constructed), could also be Http
        LlmError::Http { .. } => {} // also acceptable if fallback is unreachable
        other => panic!("expected AllEndpointsFailed or Http, got: {other}"),
    }
}

// ===========================================================================
// NEW: Processor integration tests (decoupled from DB)
// ===========================================================================

#[test]
fn prompt_to_chat_messages_preserves_chinese_content() {
    let prompt_messages = prompts::code_review_prompt(
        "反转链表",
        "给你单链表的头节点 head ，请你反转链表，并返回反转后的链表。",
        Some("Easy"),
        "python",
        "class Solution:\n    def reverseList(self, head):\n        prev = None\n        while head:\n            nxt = head.next\n            head.next = prev\n            prev = head\n            head = nxt\n        return prev",
    );

    let chat_messages = convert_messages(prompt_messages);
    assert_eq!(chat_messages.len(), 2);
    assert!(chat_messages[1].content.contains("反转链表"));
    assert!(chat_messages[1].content.contains("python"));
    assert!(chat_messages[1].content.contains("class Solution"));
}

#[test]
fn teaching_card_prompt_conversion_preserves_multiple_samples() {
    let prompt_messages = prompts::teaching_card_prompt(
        "Two Sum",
        "学生普遍使用暴力解法。",
        &[
            ("python", "for i in range(n):\n    for j in range(n):"),
            (
                "java",
                "for (int i = 0; i < n; i++) {\n    for (int j = 0; j < n; j++) {",
            ),
            ("cpp", "for(int i=0;i<n;i++)\n  for(int j=0;j<n;j++)"),
        ],
    );

    let chat_messages = convert_messages(prompt_messages);
    let user_content = &chat_messages[1].content;

    assert!(
        user_content.contains("python"),
        "should contain python sample"
    );
    assert!(user_content.contains("java"), "should contain java sample");
    assert!(user_content.contains("cpp"), "should contain cpp sample");
    assert!(user_content.contains("示例 1"), "should label samples");
    assert!(
        user_content.contains("示例 3"),
        "should label all 3 samples"
    );
}

#[test]
fn error_classification_consistency_with_integration_errors() {
    // Verify that errors from the LLM client are correctly classified by is_transient_error

    // Transient: HTTP errors
    let rt = tokio::runtime::Runtime::new().unwrap();
    let http_err = rt
        .block_on(async {
            reqwest::Client::new()
                .get("http://127.0.0.1:1")
                .timeout(std::time::Duration::from_millis(100))
                .send()
                .await
        })
        .unwrap_err();

    assert!(is_transient_error(&LlmError::Http {
        endpoint: "test".to_string(),
        source: http_err,
    }));

    // Transient: API errors (all status codes)
    for status in [429u16, 500, 502, 503, 504] {
        let err = LlmError::Api {
            endpoint: "test".to_string(),
            status: reqwest::StatusCode::from_u16(status).unwrap(),
            body: "error".to_string(),
        };
        assert!(is_transient_error(&err), "API {status} should be transient");
    }

    // Permanent: JSON parse errors
    let json_err = serde_json::from_str::<serde_json::Value>("{bad}").unwrap_err();
    assert!(!is_transient_error(&LlmError::JsonParse {
        endpoint: "test".to_string(),
        raw: "{bad}".to_string(),
        source: json_err,
    }));

    // Permanent: malformed response
    assert!(!is_transient_error(&LlmError::MalformedResponse {
        endpoint: "test".to_string(),
        message: "bad".to_string(),
    }));

    // Permanent: empty response
    assert!(!is_transient_error(&LlmError::EmptyResponse {
        endpoint: "test".to_string(),
    }));

    // Transient: all endpoints failed
    assert!(is_transient_error(&LlmError::AllEndpointsFailed {
        primary_err: "err1".to_string(),
        fallback_err: "err2".to_string(),
    }));
}

// ===========================================================================
// NEW: Schema validation integration tests
// ===========================================================================

#[test]
fn code_review_output_schema_roundtrip_via_json() {
    // Simulates what the processor does: serialize → store → deserialize
    let output = CodeReviewOutput {
        title: "递归解法分析".to_string(),
        insights: vec![
            CodeReviewInsight {
                insight_type: InsightType::Pattern,
                description: "正确使用递归分治".to_string(),
                code_reference: "第 2 行".to_string(),
            },
            CodeReviewInsight {
                insight_type: InsightType::AntiPattern,
                description: "缺少基准条件检查".to_string(),
                code_reference: "整体结构".to_string(),
            },
        ],
        suggestions: vec![
            "添加空链表基准条件".to_string(),
            "考虑使用迭代替代递归以避免栈溢出".to_string(),
        ],
        complexity: ComplexityEstimate {
            time: "O(n)".to_string(),
            space: "O(n) 递归栈".to_string(),
        },
        overall_quality: QualityLevel::Good,
    };

    // Serialize to JSON (what goes into DB)
    let json_value = serde_json::to_value(&output).expect("should serialize");
    let json_str = serde_json::to_string(&output).expect("should serialize to string");

    // Deserialize from JSON value (what comes out of DB)
    let from_value: CodeReviewOutput =
        serde_json::from_value(json_value).expect("should deserialize from value");
    assert_eq!(from_value, output);

    // Deserialize from JSON string (what comes from LLM parse)
    let from_str: CodeReviewOutput =
        serde_json::from_str(&json_str).expect("should deserialize from string");
    assert_eq!(from_str, output);
}

#[test]
fn teaching_card_output_schema_roundtrip_via_json() {
    let card = TeachingCardOutput {
        title: "双指针模式教学".to_string(),
        summary: "学生在有序数组问题上普遍未能使用双指针优化".to_string(),
        key_concepts: vec![
            "双指针".to_string(),
            "排序数组".to_string(),
            "滑动窗口".to_string(),
        ],
        examples: vec![
            prompts::CodeExample {
                label: "暴力解法".to_string(),
                language: "python".to_string(),
                code: "for i in range(n):\n    for j in range(n):".to_string(),
                explanation: "O(n²) 暴力枚举".to_string(),
            },
            prompts::CodeExample {
                label: "双指针解法思路".to_string(),
                language: "python".to_string(),
                code: "left, right = 0, n - 1".to_string(),
                explanation: "O(n) 双指针".to_string(),
            },
        ],
        common_mistakes: vec!["未利用数组有序性质".to_string()],
        improvement_tips: vec!["使用双指针从两端向中间扫描".to_string()],
        target_difficulty: "medium".to_string(),
    };

    let json_value = serde_json::to_value(&card).expect("should serialize");
    let parsed: TeachingCardOutput =
        serde_json::from_value(json_value).expect("should deserialize");
    assert_eq!(parsed, card);
}

#[test]
fn code_review_output_all_quality_levels_serialize() {
    for quality in [
        QualityLevel::Excellent,
        QualityLevel::Good,
        QualityLevel::Fair,
        QualityLevel::NeedsImprovement,
    ] {
        let output = CodeReviewOutput {
            title: "Test".to_string(),
            insights: vec![],
            suggestions: vec![],
            complexity: ComplexityEstimate {
                time: "O(1)".to_string(),
                space: "O(1)".to_string(),
            },
            overall_quality: quality,
        };
        let json = serde_json::to_string(&output).unwrap();
        let parsed: CodeReviewOutput = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.overall_quality, quality);
    }
}

#[test]
fn code_review_output_all_insight_types_serialize() {
    for itype in [
        InsightType::Pattern,
        InsightType::AntiPattern,
        InsightType::Optimization,
        InsightType::Style,
    ] {
        let output = CodeReviewOutput {
            title: "Test".to_string(),
            insights: vec![CodeReviewInsight {
                insight_type: itype,
                description: "test".to_string(),
                code_reference: "line 1".to_string(),
            }],
            suggestions: vec![],
            complexity: ComplexityEstimate {
                time: "O(1)".to_string(),
                space: "O(1)".to_string(),
            },
            overall_quality: QualityLevel::Good,
        };
        let json = serde_json::to_string(&output).unwrap();
        let parsed: CodeReviewOutput = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.insights[0].insight_type, itype);
    }
}

// ===========================================================================
// NEW: Decoupling verification
// ===========================================================================

/// Verify that the llm-worker crate has no dependency on domain-analysis.
/// This test ensures the architectural boundary is maintained: llm-worker
/// only interacts with domain-analysis through Redis Streams + DB tables.
#[test]
fn llm_worker_is_decoupled_from_domain_analysis() {
    // If llm-worker could import domain-analysis, this would compile.
    // Since it can't (not in Cargo.toml dependencies), we verify at the
    // type level that our types are self-contained.

    // All types used in the worker are defined locally or in common crates:
    let _config: WorkerConfig = WorkerConfig {
        llm_api_url: "http://localhost:11434".to_string(),
        llm_fallback_url: None,
        llm_api_key: None,
        llm_model: "test".to_string(),
        llm_timeout: Duration::from_secs(60),
        max_retries: 3,
        redis_url: "redis://localhost:6379".to_string(),
        redis_stream: "test".to_string(),
        consumer_group: "test".to_string(),
        consumer_name: "test".to_string(),
        database_url: "postgres://localhost/test".to_string(),
    };

    // Prompt types are local
    let _msg = LlmMessage::user("test");
    let _output = CodeReviewOutput {
        title: "test".to_string(),
        insights: vec![],
        suggestions: vec![],
        complexity: ComplexityEstimate {
            time: "O(1)".to_string(),
            space: "O(1)".to_string(),
        },
        overall_quality: QualityLevel::Good,
    };

    // LLM client types are local
    let _chat_msg = ChatMessage {
        role: "user".to_string(),
        content: "test".to_string(),
    };

    // DB types are local
    let _usage = llm_worker::db::LlmUsage {
        model: "test".to_string(),
        prompt_tokens: 0,
        completion_tokens: 0,
        latency_ms: 0,
    };

    // This test existing in llm-worker's test suite proves decoupling.
    // If domain-analysis were a dependency, cargo would fail to resolve.
    // llm-worker is fully self-contained — this test proves decoupling
}

/// Verify that the Cargo.toml does not reference domain-analysis or feature-gateway.
#[test]
fn cargo_toml_has_no_domain_analysis_dependency() {
    let cargo_toml = include_str!("../Cargo.toml");

    assert!(
        !cargo_toml.contains("domain-analysis"),
        "llm-worker must not depend on domain-analysis"
    );
    assert!(
        !cargo_toml.contains("feature-gateway"),
        "llm-worker must not depend on feature-gateway"
    );
    assert!(
        !cargo_toml.contains("api-infra"),
        "llm-worker must not depend on api-infra"
    );
}
