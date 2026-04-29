use domain_analysis::extractor;
use domain_analysis::models::*;
use domain_analysis::queue;

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
fn test_analysis_stream_constant() {
    assert_eq!(queue::ANALYSIS_STREAM, "analysis_events");
    assert_eq!(queue::ANALYSIS_GROUP, "analysis_workers");
}
