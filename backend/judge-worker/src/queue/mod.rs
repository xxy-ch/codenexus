pub mod consumer;
pub mod dlq;
pub mod producer;
pub mod recovery;

use serde::{Deserialize, Serialize};

/// Submission message received from judge queue
/// Must match API's SubmissionMessage structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmissionMessage {
    pub submission_id: i64,
    pub problem_id: i64,
    pub user_id: uuid::Uuid,
    pub language: String,
    pub source_code: String,
    pub time_limit_ms: u64,
    pub memory_limit_mb: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub contest_id: Option<i64>,
}

/// Judging result to send back to API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JudgeResult {
    pub submission_id: i64,
    pub status: String,
    pub score: Option<i32>,
    pub runtime_ms: Option<i32>,
    pub memory_kb: Option<i32>,
    pub test_case_results: Vec<TestCaseResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCaseResult {
    pub test_case_id: i64,
    pub status: String,
    pub expected_output: Option<String>,
    pub actual_output: Option<String>,
    pub error_message: Option<String>,
    pub runtime_ms: Option<i32>,
    pub memory_kb: Option<i32>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_serialization() {
        let msg = SubmissionMessage {
            submission_id: 123,
            problem_id: 456,
            user_id: uuid::Uuid::new_v4(),
            language: "python3".to_string(),
            source_code: "print('hello')".to_string(),
            time_limit_ms: 1000,
            memory_limit_mb: 256,
            contest_id: None,
        };

        let serialized = serde_json::to_string(&msg).unwrap();
        let deserialized: SubmissionMessage = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.submission_id, msg.submission_id);
        assert_eq!(deserialized.problem_id, msg.problem_id);
        assert_eq!(deserialized.language, msg.language);
    }

    /// Regression test: contest_id must survive round-trip serialization.
    /// This ensures contest submissions retain their contest association through
    /// the full queue lifecycle (enqueue -> DLQ -> retry).
    #[test]
    fn test_message_contest_id_round_trip() {
        let msg = SubmissionMessage {
            submission_id: 42,
            problem_id: 200,
            user_id: uuid::Uuid::new_v4(),
            language: "cpp".to_string(),
            source_code: "int main() {}".to_string(),
            time_limit_ms: 2000,
            memory_limit_mb: 512,
            contest_id: Some(99),
        };

        let serialized = serde_json::to_string(&msg).unwrap();
        assert!(serialized.contains("\"contest_id\":99"), "contest_id must appear in JSON");

        let deserialized: SubmissionMessage = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.contest_id, Some(99));
    }

    /// Verify backward compat: deserializing JSON without contest_id produces None.
    #[test]
    fn test_message_backward_compat_no_contest_id() {
        let json = r#"{
            "submission_id": 1,
            "problem_id": 2,
            "user_id": "00000000-0000-0000-0000-000000000001",
            "language": "python3",
            "source_code": "pass",
            "time_limit_ms": 1000,
            "memory_limit_mb": 256
        }"#;

        let msg: SubmissionMessage = serde_json::from_str(json).unwrap();
        assert_eq!(msg.submission_id, 1);
        assert!(msg.contest_id.is_none());
    }

    #[test]
    fn test_result_serialization() {
        let result = JudgeResult {
            submission_id: 123,
            status: "accepted".to_string(),
            score: Some(100),
            runtime_ms: Some(150),
            memory_kb: Some(1024),
            test_case_results: vec![],
        };

        let serialized = serde_json::to_string(&result).unwrap();
        let deserialized: JudgeResult = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.submission_id, result.submission_id);
        assert_eq!(deserialized.status, result.status);
    }
}
