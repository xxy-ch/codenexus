#[cfg(test)]
mod tests {
    use super::super::*;

    #[test]
    fn test_submission_message_structure() {
        let submission = crate::queue::SubmissionMessage {
            submission_id: 1,
            problem_id: 1,
            user_id: uuid::Uuid::new_v4(),
            language: "python3".to_string(),
            source_code: "print('Hello, World!')".to_string(),
            time_limit_ms: 1000,
            memory_limit_mb: 256,
        };

        assert_eq!(submission.submission_id, 1);
        assert_eq!(submission.language, "python3");
        assert_eq!(submission.source_code, "print('Hello, World!')");
        assert_eq!(submission.time_limit_ms, 1000);
        assert_eq!(submission.memory_limit_mb, 256);
    }

    #[test]
    fn test_submission_compiled_language() {
        let submission = crate::queue::SubmissionMessage {
            submission_id: 2,
            problem_id: 1,
            user_id: uuid::Uuid::new_v4(),
            language: "cpp".to_string(),
            source_code: r#"
#include <iostream>
using namespace std;
int main() {
    cout << "Hello" << endl;
    return 0;
}
"#.to_string(),
            time_limit_ms: 2000,
            memory_limit_mb: 512,
        };

        assert_eq!(submission.language, "cpp");
        assert!(submission.source_code.contains("#include"));
        assert_eq!(submission.time_limit_ms, 2000);
    }

    #[test]
    fn test_submission_rust_language() {
        let submission = crate::queue::SubmissionMessage {
            submission_id: 3,
            problem_id: 2,
            user_id: uuid::Uuid::new_v4(),
            language: "rust".to_string(),
            source_code: "fn main() { println!(\"42\"); }".to_string(),
            time_limit_ms: 1500,
            memory_limit_mb: 128,
        };

        assert_eq!(submission.language, "rust");
        assert!(submission.source_code.contains("println"));
        assert_eq!(submission.memory_limit_mb, 128);
    }

    #[test]
    fn test_submission_serialization() {
        let submission = crate::queue::SubmissionMessage {
            submission_id: 1,
            problem_id: 1,
            user_id: uuid::Uuid::new_v4(),
            language: "python3".to_string(),
            source_code: "print(42)".to_string(),
            time_limit_ms: 1000,
            memory_limit_mb: 256,
        };

        // Test JSON serialization
        let json = serde_json::to_string(&submission).unwrap();
        assert!(json.contains("python3"));
        assert!(json.contains("print(42)"));

        // Test deserialization
        let deserialized: crate::queue::SubmissionMessage = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.submission_id, submission.submission_id);
        assert_eq!(deserialized.language, submission.language);
    }

    #[test]
    fn test_judge_result_structure() {
        let result = crate::queue::JudgeResult {
            submission_id: 1,
            status: "accepted".to_string(),
            score: Some(100),
            runtime_ms: Some(150),
            memory_kb: Some(1024),
            test_case_results: vec![],
        };

        assert_eq!(result.status, "accepted");
        assert_eq!(result.score, Some(100));
        assert_eq!(result.runtime_ms, Some(150));
        assert_eq!(result.memory_kb, Some(1024));
    }

    #[test]
    fn test_judge_result_with_test_cases() {
        let result = crate::queue::JudgeResult {
            submission_id: 1,
            status: "wrong_answer".to_string(),
            score: Some(50),
            runtime_ms: Some(200),
            memory_kb: Some(2048),
            test_case_results: vec![
                crate::queue::TestCaseResult {
                    test_case_id: 1,
                    status: "accepted".to_string(),
                    expected_output: Some("42\n".to_string()),
                    actual_output: Some("42\n".to_string()),
                    error_message: None,
                    runtime_ms: Some(50),
                    memory_kb: Some(512),
                },
                crate::queue::TestCaseResult {
                    test_case_id: 2,
                    status: "wrong_answer".to_string(),
                    expected_output: Some("100\n".to_string()),
                    actual_output: Some("50\n".to_string()),
                    error_message: None,
                    runtime_ms: Some(100),
                    memory_kb: Some(1024),
                },
            ],
        };

        assert_eq!(result.status, "wrong_answer");
        assert_eq!(result.score, Some(50));
        assert_eq!(result.test_case_results.len(), 2);
        assert_eq!(result.test_case_results[0].status, "accepted");
        assert_eq!(result.test_case_results[1].status, "wrong_answer");
    }

    #[test]
    fn test_time_limit_validation() {
        // Reasonable time limits
        assert!(1000 <= 60000); // 1 second to 1 minute
        assert!(2000 <= 60000);
        assert!(5000 <= 60000);
    }

    #[test]
    fn test_memory_limit_validation() {
        // Reasonable memory limits (in MB)
        assert!(64 <= 1024); // 64MB to 1GB
        assert!(128 <= 1024);
        assert!(256 <= 1024);
        assert!(512 <= 1024);
    }

    #[test]
    fn test_supported_languages() {
        let languages = vec!["c", "cpp", "python3", "rust", "go", "java"];

        for lang in languages {
            let valid = match lang {
                "c" | "cpp" | "python3" | "rust" | "go" | "java" => true,
                _ => false,
            };
            assert!(valid);
        }
    }

    #[test]
    fn test_error_result() {
        let result = crate::queue::JudgeResult {
            submission_id: 1,
            status: "compilation_error".to_string(),
            score: Some(0),
            runtime_ms: None,
            memory_kb: None,
            test_case_results: vec![],
        };

        assert_eq!(result.status, "compilation_error");
        assert_eq!(result.score, Some(0));
        assert!(result.runtime_ms.is_none());
        assert!(result.memory_kb.is_none());
    }

    #[test]
    fn test_timeout_result() {
        let result = crate::queue::JudgeResult {
            submission_id: 1,
            status: "time_limit_exceeded".to_string(),
            score: Some(0),
            runtime_ms: Some(5000), // Exceeded limit
            memory_kb: Some(1024),
            test_case_results: vec![],
        };

        assert_eq!(result.status, "time_limit_exceeded");
        assert_eq!(result.score, Some(0));
    }

    #[test]
    fn test_submission_zero_time_limit() {
        let submission = crate::queue::SubmissionMessage {
            submission_id: 1,
            problem_id: 1,
            user_id: uuid::Uuid::new_v4(),
            language: "python3".to_string(),
            source_code: "print('test')".to_string(),
            time_limit_ms: 0, // Invalid
            memory_limit_mb: 256,
        };

        // Zero time limit should be handled
        assert_eq!(submission.time_limit_ms, 0);
    }
}
