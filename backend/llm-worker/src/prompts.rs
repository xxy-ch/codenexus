//! Prompt templates for LLM-powered code analysis.
//!
//! Generates structured prompts for code review and teaching card production.

use serde_json::json;

/// Build the system prompt for code review / teaching card generation.
pub fn system_prompt() -> String {
    include_str!("prompts/system.txt").to_string()
}

/// Build a user-level prompt for analyzing a submission.
///
/// The prompt includes problem context and the student's source code,
/// instructing the LLM to produce structured teaching insights.
pub fn code_review_prompt(
    problem_title: &str,
    problem_description: &str,
    difficulty: Option<&str>,
    language: &str,
    source_code: &str,
) -> String {
    let difficulty_line = difficulty
        .map(|d| format!("Difficulty: {d}\n"))
        .unwrap_or_default();

    format!(
        r#"## Problem: {problem_title}
{difficulty_line}
### Problem Description
{problem_description}

### Student's Code ({language})
```{language}
{source_code}
```

---

Analyze this submission and produce a JSON object with the following structure:

{schema}

Requirements:
- Respond with ONLY valid JSON, no markdown fences.
- The `insights` array must contain 1-3 actionable teaching insights.
- Each insight should reference specific code patterns in the student's solution.
- The `suggestions` array should contain concrete improvement steps.
- The `complexity` object should estimate time and space complexity."#,
        schema = json!({
            "title": "Brief descriptive title for the analysis",
            "insights": [
                {
                    "type": "pattern | anti_pattern | optimization | style",
                    "description": "What the student did and why it matters",
                    "code_reference": "Line or block reference"
                }
            ],
            "suggestions": [
                "Specific improvement suggestion"
            ],
            "complexity": {
                "time": "O(?)",
                "space": "O(?)"
            },
            "overall_quality": "excellent | good | fair | needs_improvement"
        })
        .to_string()
    )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn system_prompt_is_non_empty() {
        let prompt = system_prompt();
        assert!(!prompt.is_empty(), "system prompt should not be empty");
        assert!(prompt.to_lowercase().contains("json") || prompt.contains("JSON"));
    }

    #[test]
    fn code_review_prompt_contains_problem_info() {
        let prompt = code_review_prompt(
            "Two Sum",
            "Find two numbers that add up to target.",
            Some("Easy"),
            "python",
            "def two_sum(nums, target):\n    pass",
        );
        assert!(prompt.contains("Two Sum"), "should contain problem title");
        assert!(prompt.contains("Find two numbers"), "should contain problem description");
        assert!(prompt.contains("Easy"), "should contain difficulty");
        assert!(prompt.contains("python"), "should contain language");
        assert!(prompt.contains("def two_sum"), "should contain source code");
    }

    #[test]
    fn code_review_prompt_without_difficulty() {
        let prompt = code_review_prompt(
            "Binary Search",
            "Implement binary search.",
            None,
            "rust",
            "fn binary_search(arr: &[i32], target: i32) -> Option<usize> { None }",
        );
        assert!(prompt.contains("Binary Search"));
        assert!(!prompt.contains("Difficulty:"), "should omit difficulty line when None");
        assert!(prompt.contains("rust"));
    }

    #[test]
    fn code_review_prompt_contains_json_schema() {
        let prompt = code_review_prompt(
            "Test",
            "Test desc",
            None,
            "java",
            "class Solution {}",
        );
        assert!(prompt.contains("insights"), "should specify insights field");
        assert!(prompt.contains("suggestions"), "should specify suggestions field");
        assert!(prompt.contains("complexity"), "should specify complexity field");
        assert!(prompt.contains("overall_quality"), "should specify overall_quality field");
    }

    #[test]
    fn code_review_prompt_contains_instructions() {
        let prompt = code_review_prompt(
            "Test",
            "Test desc",
            Some("Medium"),
            "cpp",
            "int main() {}",
        );
        assert!(prompt.contains("ONLY valid JSON"), "should instruct JSON-only output");
        assert!(prompt.contains("1-3 actionable"), "should specify insight count range");
    }

    #[test]
    fn code_review_prompt_preserves_multiline_code() {
        let code = "line1\nline2\nline3\n    indented_line";
        let prompt = code_review_prompt("P", "D", None, "go", code);
        assert!(prompt.contains("line1\nline2"), "should preserve newlines in code");
        assert!(prompt.contains("    indented_line"), "should preserve indentation");
    }
}
