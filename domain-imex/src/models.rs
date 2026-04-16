use serde::{Deserialize, Serialize};
use uuid::Uuid;

// --- Helper defaults ---

pub fn default_time_limit() -> i32 {
    5000
}

pub fn default_memory_limit() -> i32 {
    256
}

pub fn default_visibility() -> String {
    "private".to_string()
}

// --- Problem Import Types ---

/// Configuration deserialized from config.json inside each problem directory in a ZIP.
#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProblemConfig {
    pub title: String,
    pub difficulty: String,
    #[serde(default = "default_time_limit")]
    pub time_limit: i32,
    #[serde(default = "default_memory_limit")]
    pub memory_limit: i32,
    #[serde(default)]
    pub is_public: bool,
    #[serde(default = "default_visibility")]
    pub visibility: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub source_url: Option<String>,
    pub author_note: Option<String>,
    pub test_cases: Vec<ProblemTestCaseConfig>,
}

/// Test case reference within a ProblemConfig's config.json.
#[derive(Debug, Clone, Deserialize)]
pub struct ProblemTestCaseConfig {
    pub input_file: String,
    pub output_file: String,
    pub is_hidden: Option<bool>,
    pub score: Option<i32>,
    pub order: Option<i32>,
}

/// A test case file pair with raw bytes read from the ZIP.
#[derive(Debug, Clone)]
pub struct TestCaseFile {
    pub input: Vec<u8>,
    pub output: Vec<u8>,
    pub config: ProblemTestCaseConfig,
}

/// Status of a single import item after parsing/validation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImportItemStatus {
    Valid,
    Duplicate,
    Error,
}

/// One parsed problem from an uploaded ZIP archive.
#[derive(Debug, Clone)]
pub struct ProblemImportItem {
    pub slug: String,
    pub config: ProblemConfig,
    pub description: String,
    pub test_case_files: Vec<TestCaseFile>,
    pub status: ImportItemStatus,
    pub warning: Option<String>,
}

// --- User Import Types ---

/// One parsed row from an uploaded user CSV file.
#[derive(Debug, Clone)]
pub struct UserImportRow {
    pub username: String,
    pub role: String,
    pub campus_id: i64,
    pub display_name: String,
    pub email: Option<String>,
    pub status: ImportItemStatus,
    pub warning: Option<String>,
}

// --- Preview / Result Types ---

/// Item shown in the import preview.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewItem {
    pub title: String,
    pub difficulty: String,
    pub test_case_count: usize,
    pub status: String,
    pub warning: Option<String>,
}

/// User-specific item shown in the user import preview.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreviewItem {
    pub username: String,
    pub role: String,
    pub campus_id: i64,
    pub display_name: String,
    pub email: Option<String>,
    pub status: String,
    pub warning: Option<String>,
}

/// Warning raised during import parsing.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportWarning {
    pub item: String,
    pub reason: String,
}

/// Error raised during import parsing.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportError {
    pub item: String,
    pub reason: String,
}

/// Response returned when the user previews an import (before confirming).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportPreviewResponse {
    pub token: Uuid,
    pub total: usize,
    pub valid: usize,
    pub warnings: Vec<ImportWarning>,
    pub errors: Vec<ImportError>,
    pub preview_items: Vec<PreviewItem>,
}

/// Response returned when the user previews a user CSV import (before confirming).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserImportPreviewResponse {
    pub token: Uuid,
    pub total: usize,
    pub valid: usize,
    pub warnings: Vec<ImportWarning>,
    pub errors: Vec<ImportError>,
    pub preview_items: Vec<UserPreviewItem>,
}

/// Item successfully created during import execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatedItem {
    pub title: String,
    pub id: i64,
}

/// Item skipped during import execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkippedItem {
    pub item: String,
    pub reason: String,
}

/// Item that errored during import execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorItem {
    pub item: String,
    pub reason: String,
}

/// Response returned after import execution completes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResultResponse {
    pub total: usize,
    pub created: usize,
    pub skipped: usize,
    pub errors: usize,
    pub created_items: Vec<CreatedItem>,
    pub skipped_items: Vec<SkippedItem>,
    pub error_items: Vec<ErrorItem>,
}

/// Request to execute a previously previewed import.
#[derive(Debug, Clone, Deserialize)]
pub struct ImportExecuteRequest {
    pub token: Uuid,
}

// --- Cached Preview Types ---

/// Problem-specific import preview data cached server-side.
#[derive(Debug, Clone)]
pub struct ProblemImportPreview {
    pub items: Vec<ProblemImportItem>,
}

/// User-specific import preview data cached server-side.
#[derive(Debug, Clone)]
pub struct UserImportPreview {
    pub rows: Vec<UserImportRow>,
    pub default_password: String,
}

/// Union of cached preview data, discriminated by import type.
#[derive(Debug, Clone)]
pub enum CachedPreview {
    Problem(ProblemImportPreview),
    User(UserImportPreview),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn problem_config_deserializes_full_json() {
        let json = r#"{
            "title": "Two Sum",
            "difficulty": "easy",
            "time_limit": 3000,
            "memory_limit": 128,
            "is_public": true,
            "visibility": "public",
            "tags": ["array", "hash-table"],
            "source_url": "https://leetcode.com/problems/two-sum/",
            "author_note": "Classic problem",
            "test_cases": [
                {
                    "input_file": "testcases/1.in",
                    "output_file": "testcases/1.out",
                    "is_hidden": false,
                    "score": 50,
                    "order": 1
                },
                {
                    "input_file": "testcases/2.in",
                    "output_file": "testcases/2.out",
                    "is_hidden": true,
                    "score": 50,
                    "order": 2
                }
            ]
        }"#;

        let config: ProblemConfig = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(config.title, "Two Sum");
        assert_eq!(config.difficulty, "easy");
        assert_eq!(config.time_limit, 3000);
        assert_eq!(config.memory_limit, 128);
        assert!(config.is_public);
        assert_eq!(config.visibility, "public");
        assert_eq!(config.tags, vec!["array", "hash-table"]);
        assert_eq!(
            config.source_url,
            Some("https://leetcode.com/problems/two-sum/".to_string())
        );
        assert_eq!(config.author_note, Some("Classic problem".to_string()));
        assert_eq!(config.test_cases.len(), 2);
        assert_eq!(config.test_cases[0].input_file, "testcases/1.in");
        assert_eq!(config.test_cases[0].output_file, "testcases/1.out");
        assert_eq!(config.test_cases[0].is_hidden, Some(false));
        assert_eq!(config.test_cases[0].score, Some(50));
        assert_eq!(config.test_cases[0].order, Some(1));
    }

    #[test]
    fn problem_config_uses_defaults_for_missing_fields() {
        let json = r#"{
            "title": "Simple Problem",
            "difficulty": "medium",
            "test_cases": []
        }"#;

        let config: ProblemConfig = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(config.time_limit, 5000);
        assert_eq!(config.memory_limit, 256);
        assert!(!config.is_public);
        assert_eq!(config.visibility, "private");
        assert!(config.tags.is_empty());
        assert!(config.source_url.is_none());
        assert!(config.author_note.is_none());
    }

    #[test]
    fn problem_config_fails_without_title() {
        let json = r#"{
            "difficulty": "easy",
            "test_cases": []
        }"#;

        let result = serde_json::from_str::<ProblemConfig>(json);
        assert!(result.is_err(), "should fail without required field 'title'");
    }

    #[test]
    fn problem_config_rejects_unknown_fields() {
        let json = r#"{
            "title": "Test",
            "difficulty": "easy",
            "test_cases": [],
            "unknown_field": "value"
        }"#;

        let result = serde_json::from_str::<ProblemConfig>(json);
        assert!(
            result.is_err(),
            "should reject unknown fields due to deny_unknown_fields"
        );
    }

    #[test]
    fn import_preview_response_serializes_correctly() {
        let response = ImportPreviewResponse {
            token: Uuid::new_v4(),
            total: 5,
            valid: 3,
            warnings: vec![ImportWarning {
                item: "Problem A".to_string(),
                reason: "Duplicate title".to_string(),
            }],
            errors: vec![ImportError {
                item: "Problem B".to_string(),
                reason: "Missing test case".to_string(),
            }],
            preview_items: vec![PreviewItem {
                title: "Two Sum".to_string(),
                difficulty: "easy".to_string(),
                test_case_count: 2,
                status: "valid".to_string(),
                warning: None,
            }],
        };

        let json = serde_json::to_value(&response).expect("should serialize");
        assert_eq!(json["total"], 5);
        assert_eq!(json["valid"], 3);
        assert_eq!(json["warnings"].as_array().unwrap().len(), 1);
        assert_eq!(json["errors"].as_array().unwrap().len(), 1);
        assert_eq!(json["preview_items"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn import_result_response_serializes_correctly() {
        let response = ImportResultResponse {
            total: 5,
            created: 3,
            skipped: 1,
            errors: 1,
            created_items: vec![
                CreatedItem {
                    title: "Two Sum".to_string(),
                    id: 1,
                },
                CreatedItem {
                    title: "Add Two Numbers".to_string(),
                    id: 2,
                },
            ],
            skipped_items: vec![SkippedItem {
                item: "Duplicate Problem".to_string(),
                reason: "Title already exists".to_string(),
            }],
            error_items: vec![ErrorItem {
                item: "Bad Problem".to_string(),
                reason: "Missing description".to_string(),
            }],
        };

        let json = serde_json::to_value(&response).expect("should serialize");
        assert_eq!(json["total"], 5);
        assert_eq!(json["created"], 3);
        assert_eq!(json["skipped"], 1);
        assert_eq!(json["errors"], 1);
        assert_eq!(json["created_items"].as_array().unwrap().len(), 2);
        assert_eq!(json["skipped_items"].as_array().unwrap().len(), 1);
        assert_eq!(json["error_items"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn cached_preview_enum_works() {
        let problem_preview = CachedPreview::Problem(ProblemImportPreview {
            items: vec![ProblemImportItem {
                slug: "two-sum".to_string(),
                config: ProblemConfig {
                    title: "Two Sum".to_string(),
                    difficulty: "easy".to_string(),
                    time_limit: 5000,
                    memory_limit: 256,
                    is_public: false,
                    visibility: "private".to_string(),
                    tags: vec![],
                    source_url: None,
                    author_note: None,
                    test_cases: vec![],
                },
                description: "Find two numbers".to_string(),
                test_case_files: vec![],
                status: ImportItemStatus::Valid,
                warning: None,
            }],
        });

        match problem_preview {
            CachedPreview::Problem(p) => assert_eq!(p.items.len(), 1),
            CachedPreview::User(_) => panic!("expected Problem variant"),
        }
    }
}
