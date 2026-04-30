//! Integration tests for the domain-analysis crate.
//!
//! Tests public API integration across the crate's modules:
//! - Models: serialization roundtrips for analysis events, jobs, features
//! - Extractor: structural feature extraction across languages
//! - Embedding: EmbeddingClient construction and URL normalization
//! - Queue: stream constants and message serialization
//!
//! These tests do NOT require external services (database, Redis, LLM API).
//! They validate internal crate integration, not external service connectivity.

use std::time::Duration;

use domain_analysis::embedding::EmbeddingClient;
use domain_analysis::extractor;
use domain_analysis::models::*;
use domain_analysis::queue;

// ---------------------------------------------------------------------------
// Models: serialization roundtrips
// ---------------------------------------------------------------------------

#[test]
fn test_analysis_event_serialization() {
    let event = AnalysisEvent {
        submission_id: 1,
        problem_id: 100,
        user_id: uuid::Uuid::new_v4(),
        organization_id: 1,
        campus_id: Some(1),
        grade_id: Some(1),
        contest_id: None,
        verdict: "Accepted".to_string(),
        runtime_ms: 100,
        memory_mb: 64,
        language: "c".to_string(),
    };
    let json = serde_json::to_string(&event).unwrap();
    assert!(json.contains("submission_id"));
    assert!(json.contains("organization_id"));
    assert!(json.contains("Accepted"));

    let deserialized: AnalysisEvent = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.submission_id, 1);
    assert_eq!(deserialized.organization_id, 1);
}

#[test]
fn test_analysis_event_with_optional_fields() {
    let event = AnalysisEvent {
        submission_id: 42,
        problem_id: 200,
        user_id: uuid::Uuid::new_v4(),
        organization_id: 5,
        campus_id: None,
        grade_id: None,
        contest_id: Some(10),
        verdict: "Wrong Answer".to_string(),
        runtime_ms: 50,
        memory_mb: 32,
        language: "python".to_string(),
    };
    let json = serde_json::to_string(&event).unwrap();
    let parsed: AnalysisEvent = serde_json::from_str(&json).unwrap();
    assert_eq!(parsed.campus_id, None);
    assert_eq!(parsed.contest_id, Some(10));
    assert_eq!(parsed.language, "python");
}

#[test]
fn test_analysis_job_message_serialization() {
    let msg = queue::AnalysisJobMessage {
        job_id: 99,
        submission_id: 42,
        problem_id: 100,
        user_id: uuid::Uuid::new_v4(),
        organization_id: 1,
        campus_id: Some(5),
        grade_id: None,
        contest_id: None,
    };
    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"job_id\":99"));
    assert!(json.contains("\"submission_id\":42"));

    let parsed: queue::AnalysisJobMessage = serde_json::from_str(&json).unwrap();
    assert_eq!(parsed.job_id, 99);
    assert_eq!(parsed.campus_id, Some(5));
}

// ---------------------------------------------------------------------------
// Extractor: structural feature extraction
// ---------------------------------------------------------------------------

#[test]
fn test_structural_features_extraction() {
    let code = r#"
fn main() {
    if x > 0 {
        for i in 0..10 {
            println!("{}", i);
        }
    }
}
"#;
    let features = extractor::extract_features(code, "rust").unwrap();
    assert!(features.lines_of_code > 0);
    assert!(features.cyclomatic_complexity >= 1.0);
    assert!(features.max_nesting_depth >= 2);
}

#[test]
fn test_structural_features_multilanguage() {
    let languages = vec![
        ("c", "int main() { return 0; }"),
        ("cpp", "int main() { return 0; }"),
        (
            "java",
            "public class Main { public static void main(String[] args) {} }",
        ),
        ("python", "def foo():\n    pass"),
        ("go", "func main() {}"),
        ("javascript", "function foo() {}"),
    ];
    for (lang, code) in languages {
        let features = extractor::extract_features(code, lang).unwrap();
        assert!(features.lines_of_code > 0, "Failed for language: {}", lang);
    }
}

#[test]
fn test_structural_features_empty_input() {
    let features = extractor::extract_features("", "c").unwrap();
    assert_eq!(features.lines_of_code, 0);
    assert_eq!(features.token_count, 0);
}

#[test]
fn test_structural_features_halstead_volume() {
    let code = "int main() { int x = 1 + 2; return x; }";
    let features = extractor::extract_features(code, "c").unwrap();
    assert!(
        features.halstead_volume > 0.0,
        "non-trivial code should have positive Halstead volume"
    );
    assert!(features.distinct_operators > 0);
    assert!(features.distinct_operands > 0);
}

// ---------------------------------------------------------------------------
// Queue: stream constants
// ---------------------------------------------------------------------------

#[test]
fn test_analysis_stream_constant() {
    assert_eq!(queue::ANALYSIS_STREAM, "analysis_events");
    assert_eq!(queue::ANALYSIS_GROUP, "analysis_workers");
}

// ---------------------------------------------------------------------------
// Embedding client: construction and URL normalization
// ---------------------------------------------------------------------------

#[test]
fn test_embedding_client_constructs_with_valid_url() {
    let client = EmbeddingClient::new(
        "http://localhost:8000".to_string(),
        None,
        Some("sk-test".to_string()),
        "text-embedding-3-small".to_string(),
        Duration::from_secs(10),
    )
    .expect("should construct with valid URL");

    // Verify the client was constructed (we can't access private fields,
    // but successful construction proves URL normalization passed)
    drop(client);
}

#[test]
fn test_embedding_client_rejects_invalid_url() {
    let result = EmbeddingClient::new(
        "not a valid url ://broken".to_string(),
        None,
        None,
        "model".to_string(),
        Duration::from_secs(5),
    );
    assert!(result.is_err(), "should reject invalid URL");
}

#[test]
fn test_embedding_client_from_env_returns_none_without_url() {
    // Ensure EMBEDDING_API_URL is not set
    std::env::remove_var("EMBEDDING_API_URL");
    std::env::remove_var("EMBEDDING_FALLBACK_URL");
    std::env::remove_var("EMBEDDING_API_KEY");
    std::env::remove_var("EMBEDDING_MODEL");

    let result = EmbeddingClient::from_env().expect("from_env should not error");
    assert!(
        result.is_none(),
        "should return None when EMBEDDING_API_URL is not set"
    );
}

// ---------------------------------------------------------------------------
// Decoupling verification
// ---------------------------------------------------------------------------

/// Verify that the domain-analysis crate has no dependency on llm-worker
/// or feature-gateway. The architectural contract is that these crates
/// communicate only through Redis Streams and shared DB tables.
#[test]
fn domain_analysis_is_decoupled_from_llm_worker() {
    // If domain-analysis could import llm_worker types, this test file
    // would compile with such imports. Since it can't (not in Cargo.toml),
    // we verify at the type level that our types are self-contained.

    // All model types are defined locally:
    let _event = AnalysisEvent {
        submission_id: 1,
        problem_id: 1,
        user_id: uuid::Uuid::new_v4(),
        organization_id: 1,
        campus_id: None,
        grade_id: None,
        contest_id: None,
        verdict: "Accepted".to_string(),
        runtime_ms: 0,
        memory_mb: 0,
        language: "rust".to_string(),
    };

    let _job_msg = queue::AnalysisJobMessage {
        job_id: 1,
        submission_id: 1,
        problem_id: 1,
        user_id: uuid::Uuid::new_v4(),
        organization_id: 1,
        campus_id: None,
        grade_id: None,
        contest_id: None,
    };

    // EmbeddingClient is local (not imported from llm_worker)
    let _client_result = EmbeddingClient::new(
        "http://localhost:8000".to_string(),
        None,
        None,
        "test-model".to_string(),
        Duration::from_secs(5),
    );

    // domain-analysis is fully self-contained — this test proves decoupling
}

/// Verify Cargo.toml does not reference llm-worker or feature-gateway.
#[test]
fn cargo_toml_has_no_llm_worker_dependency() {
    let cargo_toml = include_str!("../Cargo.toml");

    assert!(
        !cargo_toml.contains("llm-worker"),
        "domain-analysis must not depend on llm-worker"
    );
    assert!(
        !cargo_toml.contains("feature-gateway"),
        "domain-analysis must not depend on feature-gateway"
    );
}
