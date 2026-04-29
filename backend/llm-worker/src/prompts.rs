//! Prompt templates for LLM-powered code analysis.
//!
//! Defines:
//! - `LlmMessage`: zero-dependency message type (role + content)
//! - Structured output schemas: `CodeReviewOutput`, `TeachingCardOutput`
//! - Prompt builders: `code_review_prompt`, `teaching_card_prompt`
//!
//! All prompt templates are pure functions with zero external dependencies.

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Message type (zero external deps — no import from llm_client)
// ---------------------------------------------------------------------------

/// A single message in the LLM conversation.
///
/// Owned `String` fields so callers never need to manage lifetimes.
/// The processor converts these into `llm_client::ChatMessage` before
/// sending the request.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LlmMessage {
    pub role: String,
    pub content: String,
}

impl LlmMessage {
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: "system".to_string(),
            content: content.into(),
        }
    }

    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: "user".to_string(),
            content: content.into(),
        }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: "assistant".to_string(),
            content: content.into(),
        }
    }
}

// ---------------------------------------------------------------------------
// Structured output schemas
// ---------------------------------------------------------------------------

/// Schema for the LLM's code review response.
///
/// The LLM must produce valid JSON matching this structure. Each field
/// is `Option`-wrapped so that partial parses don't fail entirely.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CodeReviewOutput {
    /// Brief descriptive title for the analysis.
    pub title: String,
    /// 1–3 actionable teaching insights.
    pub insights: Vec<CodeReviewInsight>,
    /// Concrete improvement suggestions.
    pub suggestions: Vec<String>,
    /// Estimated time and space complexity.
    pub complexity: ComplexityEstimate,
    /// Overall quality assessment.
    pub overall_quality: QualityLevel,
}

/// A single teaching insight within a code review.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CodeReviewInsight {
    /// Category of the insight.
    #[serde(rename = "type")]
    pub insight_type: InsightType,
    /// What the student did and why it matters.
    pub description: String,
    /// Reference to specific code location.
    pub code_reference: String,
}

/// Category of a teaching insight.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InsightType {
    Pattern,
    AntiPattern,
    Optimization,
    Style,
}

/// Estimated algorithmic complexity.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ComplexityEstimate {
    /// Time complexity, e.g. "O(n log n)".
    pub time: String,
    /// Space complexity, e.g. "O(n)".
    pub space: String,
}

/// Overall quality assessment level.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QualityLevel {
    Excellent,
    Good,
    Fair,
    NeedsImprovement,
}

/// Schema for the LLM's teaching card response (cluster-based).
///
/// Produced when analysing a group of submissions that share a common
/// pattern or anti-pattern.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TeachingCardOutput {
    /// Title of the teaching card.
    pub title: String,
    /// One-paragraph summary of the cluster pattern.
    pub summary: String,
    /// Key concepts demonstrated by the cluster.
    pub key_concepts: Vec<String>,
    /// Representative code snippets from the cluster.
    pub examples: Vec<CodeExample>,
    /// Common mistakes found in the cluster.
    pub common_mistakes: Vec<String>,
    /// Improvement suggestions for students in this cluster.
    pub improvement_tips: Vec<String>,
    /// Difficulty level this card targets.
    pub target_difficulty: String,
}

/// A representative code example within a teaching card.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CodeExample {
    /// Short label for the example.
    pub label: String,
    /// Programming language.
    pub language: String,
    /// Source code snippet.
    pub code: String,
    /// Why this example is notable.
    pub explanation: String,
}

// ---------------------------------------------------------------------------
// JSON schema strings (embedded in prompts for structured output)
// ---------------------------------------------------------------------------

/// Return the JSON schema description for `CodeReviewOutput`.
///
/// This is embedded directly in the prompt text rather than sent as a
/// separate schema parameter, because the OpenAI-compatible API we target
/// does not always support structured output natively.
fn code_review_schema_json() -> String {
    serde_json::json!({
        "title": "简要描述性标题",
        "insights": [
            {
                "type": "pattern | anti_pattern | optimization | style",
                "description": "学生做了什么以及为什么重要",
                "code_reference": "代码行或块的引用"
            }
        ],
        "suggestions": [
            "具体的改进建议"
        ],
        "complexity": {
            "time": "O(?)",
            "space": "O(?)"
        },
        "overall_quality": "excellent | good | fair | needs_improvement"
    })
    .to_string()
}

/// Return the JSON schema description for `TeachingCardOutput`.
fn teaching_card_schema_json() -> String {
    serde_json::json!({
        "title": "教学卡片标题",
        "summary": "一段概述，描述该聚类中的主要模式",
        "key_concepts": ["关键概念1", "关键概念2"],
        "examples": [
            {
                "label": "示例标签",
                "language": "编程语言",
                "code": "代码片段",
                "explanation": "解释为什么这个示例值得注意"
            }
        ],
        "common_mistakes": ["常见错误1", "常见错误2"],
        "improvement_tips": ["改进建议1", "改进建议2"],
        "target_difficulty": "easy | medium | hard"
    })
    .to_string()
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

/// Load the system prompt (Chinese, with safety constraints).
///
/// Reads from `prompts/system.txt` at compile time via `include_str!`.
pub fn system_prompt() -> String {
    include_str!("prompts/system.txt").to_string()
}

/// Build the message sequence for a code review analysis.
///
/// Returns a `Vec<LlmMessage>` containing the system prompt and a
/// user message with the full problem context and student source code.
/// The LLM is instructed to respond with JSON matching `CodeReviewOutput`.
pub fn code_review_prompt(
    problem_title: &str,
    problem_description: &str,
    difficulty: Option<&str>,
    language: &str,
    source_code: &str,
) -> Vec<LlmMessage> {
    let difficulty_line = difficulty
        .map(|d| format!("难度：{d}\n"))
        .unwrap_or_default();

    let user_content = format!(
        r#"## 题目：{problem_title}
{difficulty_line}
### 题目描述
{problem_description}

### 学生代码（{language}）
```{language}
{source_code}
```

---

请分析这份提交并生成符合以下结构的 JSON 对象：

{schema}

要求：
- 仅输出合法 JSON，不要包含 Markdown 代码围栏。
- `insights` 数组必须包含 1-3 条具有可操作性的教学洞察。
- 每条洞察应引用学生代码中的具体模式。
- `suggestions` 数组应包含具体的改进步骤。
- `complexity` 对象应估算时间和空间复杂度。
- 不得直接给出题目的完整解法。"#,
        schema = code_review_schema_json()
    );

    vec![
        LlmMessage::system(system_prompt()),
        LlmMessage::user(user_content),
    ]
}

/// Build the message sequence for a cluster-based teaching card.
///
/// Used when the domain-analysis pipeline has grouped multiple submissions
/// into a cluster and wants the LLM to produce a reusable teaching card
/// summarizing the common pattern or anti-pattern.
///
/// Returns a `Vec<LlmMessage>` with system + user messages. The LLM is
/// instructed to respond with JSON matching `TeachingCardOutput`.
pub fn teaching_card_prompt(
    problem_title: &str,
    cluster_summary: &str,
    sample_codes: &[(&str, &str)],
) -> Vec<LlmMessage> {
    let code_samples = sample_codes
        .iter()
        .enumerate()
        .map(|(i, (lang, code))| {
            format!(
                "#### 示例 {}（{lang}）\n```{lang}\n{code}\n```",
                i + 1
            )
        })
        .collect::<Vec<_>>()
        .join("\n\n");

    let user_content = format!(
        r#"## 题目：{problem_title}

### 聚类摘要
{cluster_summary}

### 代表性代码示例
{code_samples}

---

请基于以上聚类信息生成一张教学卡片，输出符合以下结构的 JSON 对象：

{schema}

要求：
- 仅输出合法 JSON，不要包含 Markdown 代码围栏。
- `summary` 应为一段简洁的中文概述。
- `key_concepts` 列出 2-5 个核心概念。
- `examples` 从代表性代码中选取，并标注其教学意义。
- `common_mistakes` 列出该聚类中学生的典型错误。
- `improvement_tips` 提供针对性改进建议，但不直接给出完整解法。
- `target_difficulty` 标注该教学卡片的目标难度。"#,
        schema = teaching_card_schema_json()
    );

    vec![
        LlmMessage::system(system_prompt()),
        LlmMessage::user(user_content),
    ]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // -- LlmMessage helpers --

    #[test]
    fn llm_message_helpers() {
        let sys = LlmMessage::system("you are helpful");
        assert_eq!(sys.role, "system");
        assert_eq!(sys.content, "you are helpful");

        let usr = LlmMessage::user("hello");
        assert_eq!(usr.role, "user");

        let ast = LlmMessage::assistant("hi there");
        assert_eq!(ast.role, "assistant");
    }

    // -- System prompt --

    #[test]
    fn system_prompt_is_non_empty_and_chinese() {
        let prompt = system_prompt();
        assert!(!prompt.is_empty(), "system prompt should not be empty");
        // Contains Chinese characters
        assert!(
            prompt.chars().any(|c| '\u{4e00}' <= c && c <= '\u{9fff}'),
            "system prompt should contain Chinese characters"
        );
        // Contains safety constraint
        assert!(
            prompt.contains("不得") || prompt.contains("安全"),
            "system prompt should contain safety constraints"
        );
    }

    // -- code_review_prompt --

    #[test]
    fn code_review_prompt_returns_two_messages() {
        let msgs = code_review_prompt(
            "Two Sum",
            "Find two numbers that add up to target.",
            Some("Easy"),
            "python",
            "def two_sum(nums, target):\n    pass",
        );
        assert_eq!(msgs.len(), 2, "should return system + user messages");
        assert_eq!(msgs[0].role, "system");
        assert_eq!(msgs[1].role, "user");
    }

    #[test]
    fn code_review_prompt_contains_problem_info() {
        let msgs = code_review_prompt(
            "Two Sum",
            "Find two numbers that add up to target.",
            Some("Easy"),
            "python",
            "def two_sum(nums, target):\n    pass",
        );
        let user = &msgs[1].content;
        assert!(user.contains("Two Sum"), "should contain problem title");
        assert!(user.contains("Find two numbers"), "should contain problem description");
        assert!(user.contains("Easy"), "should contain difficulty");
        assert!(user.contains("python"), "should contain language");
        assert!(user.contains("def two_sum"), "should contain source code");
    }

    #[test]
    fn code_review_prompt_without_difficulty() {
        let msgs = code_review_prompt(
            "Binary Search",
            "Implement binary search.",
            None,
            "rust",
            "fn binary_search() {}",
        );
        let user = &msgs[1].content;
        assert!(user.contains("Binary Search"));
        assert!(!user.contains("难度："), "should omit difficulty when None");
        assert!(user.contains("rust"));
    }

    #[test]
    fn code_review_prompt_contains_json_schema() {
        let msgs = code_review_prompt("Test", "Test desc", None, "java", "class Solution {}");
        let user = &msgs[1].content;
        assert!(user.contains("insights"), "should specify insights field");
        assert!(user.contains("suggestions"), "should specify suggestions field");
        assert!(user.contains("complexity"), "should specify complexity field");
        assert!(user.contains("overall_quality"), "should specify overall_quality field");
    }

    #[test]
    fn code_review_prompt_contains_safety_constraint() {
        let msgs = code_review_prompt("Test", "Test desc", Some("Medium"), "cpp", "int main() {}");
        let user = &msgs[1].content;
        assert!(
            user.contains("不得直接给出题目的完整解法"),
            "should include safety constraint about not giving full solutions"
        );
    }

    #[test]
    fn code_review_prompt_preserves_multiline_code() {
        let code = "line1\nline2\nline3\n    indented_line";
        let msgs = code_review_prompt("P", "D", None, "go", code);
        let user = &msgs[1].content;
        assert!(user.contains("line1\nline2"), "should preserve newlines in code");
        assert!(user.contains("    indented_line"), "should preserve indentation");
    }

    #[test]
    fn code_review_prompt_is_chinese() {
        let msgs = code_review_prompt("测试题", "描述", None, "python", "pass");
        let user = &msgs[1].content;
        assert!(user.contains("题目"), "should contain Chinese heading");
        assert!(user.contains("学生代码"), "should contain Chinese code section");
        assert!(user.contains("要求"), "should contain Chinese requirements");
    }

    // -- teaching_card_prompt --

    #[test]
    fn teaching_card_prompt_returns_two_messages() {
        let msgs = teaching_card_prompt(
            "Two Sum",
            "大多数学生使用了暴力解法。",
            &[("python", "for i in range(n):\n    for j in range(n):")],
        );
        assert_eq!(msgs.len(), 2, "should return system + user messages");
        assert_eq!(msgs[0].role, "system");
        assert_eq!(msgs[1].role, "user");
    }

    #[test]
    fn teaching_card_prompt_contains_cluster_info() {
        let msgs = teaching_card_prompt(
            "Binary Search",
            "部分学生未处理空数组边界。",
            &[
                ("rust", "fn search(arr: &[i32]) -> i32 { 0 }"),
                ("python", "def search(arr): return 0"),
            ],
        );
        let user = &msgs[1].content;
        assert!(user.contains("Binary Search"), "should contain problem title");
        assert!(user.contains("未处理空数组边界"), "should contain cluster summary");
        assert!(user.contains("fn search"), "should contain first sample code");
        assert!(user.contains("def search"), "should contain second sample code");
    }

    #[test]
    fn teaching_card_prompt_contains_json_schema() {
        let msgs = teaching_card_prompt(
            "Test",
            "Summary",
            &[("go", "func main() {}")],
        );
        let user = &msgs[1].content;
        assert!(user.contains("title"), "should specify title field");
        assert!(user.contains("summary"), "should specify summary field");
        assert!(user.contains("key_concepts"), "should specify key_concepts field");
        assert!(user.contains("examples"), "should specify examples field");
        assert!(user.contains("common_mistakes"), "should specify common_mistakes field");
        assert!(user.contains("improvement_tips"), "should specify improvement_tips field");
    }

    #[test]
    fn teaching_card_prompt_is_chinese() {
        let msgs = teaching_card_prompt("测试", "摘要", &[("python", "pass")]);
        let user = &msgs[1].content;
        assert!(user.contains("题目"), "should contain Chinese heading");
        assert!(user.contains("聚类摘要"), "should contain Chinese cluster heading");
        assert!(user.contains("教学卡片"), "should mention teaching card in Chinese");
    }

    #[test]
    fn teaching_card_prompt_with_empty_samples() {
        let msgs = teaching_card_prompt("Test", "Summary", &[]);
        let user = &msgs[1].content;
        assert!(user.contains("Test"), "should still work with no code samples");
        // Should still have the schema section
        assert!(user.contains("key_concepts"));
    }

    // -- Schema serialization roundtrips --

    #[test]
    fn code_review_output_deserializes_from_realistic_json() {
        let json = serde_json::json!({
            "title": "暴力法解决 Two Sum",
            "insights": [
                {
                    "type": "anti_pattern",
                    "description": "使用了 O(n²) 暴力枚举",
                    "code_reference": "第 3-5 行的双重循环"
                }
            ],
            "suggestions": ["考虑使用哈希表优化到 O(n)"],
            "complexity": {
                "time": "O(n²)",
                "space": "O(1)"
            },
            "overall_quality": "fair"
        });

        let output: CodeReviewOutput = serde_json::from_value(json).expect("should deserialize");
        assert_eq!(output.title, "暴力法解决 Two Sum");
        assert_eq!(output.insights.len(), 1);
        assert_eq!(output.insights[0].insight_type, InsightType::AntiPattern);
        assert_eq!(output.suggestions.len(), 1);
        assert_eq!(output.complexity.time, "O(n²)");
        assert_eq!(output.overall_quality, QualityLevel::Fair);
    }

    #[test]
    fn code_review_output_serializes_and_roundtrips() {
        let output = CodeReviewOutput {
            title: "Test Review".to_string(),
            insights: vec![CodeReviewInsight {
                insight_type: InsightType::Pattern,
                description: "Good use of hash map".to_string(),
                code_reference: "line 5".to_string(),
            }],
            suggestions: vec!["Consider early return".to_string()],
            complexity: ComplexityEstimate {
                time: "O(n)".to_string(),
                space: "O(n)".to_string(),
            },
            overall_quality: QualityLevel::Good,
        };

        let json = serde_json::to_string(&output).expect("should serialize");
        let parsed: CodeReviewOutput = serde_json::from_str(&json).expect("should roundtrip");
        assert_eq!(output, parsed);
    }

    #[test]
    fn teaching_card_output_deserializes_from_realistic_json() {
        let json = serde_json::json!({
            "title": "暴力枚举模式",
            "summary": "多数学生使用双重循环暴力枚举",
            "key_concepts": ["嵌套循环", "暴力搜索"],
            "examples": [
                {
                    "label": "典型暴力解法",
                    "language": "python",
                    "code": "for i in range(n):\n    for j in range(n):",
                    "explanation": "O(n²) 时间复杂度"
                }
            ],
            "common_mistakes": ["未考虑重复元素", "缺少边界检查"],
            "improvement_tips": ["使用哈希表优化", "考虑排序后双指针"],
            "target_difficulty": "easy"
        });

        let card: TeachingCardOutput = serde_json::from_value(json).expect("should deserialize");
        assert_eq!(card.title, "暴力枚举模式");
        assert_eq!(card.key_concepts.len(), 2);
        assert_eq!(card.examples.len(), 1);
        assert_eq!(card.examples[0].language, "python");
        assert_eq!(card.common_mistakes.len(), 2);
        assert_eq!(card.target_difficulty, "easy");
    }

    #[test]
    fn teaching_card_output_roundtrips() {
        let card = TeachingCardOutput {
            title: "Test Card".to_string(),
            summary: "Test summary".to_string(),
            key_concepts: vec!["concept1".to_string()],
            examples: vec![CodeExample {
                label: "Example 1".to_string(),
                language: "rust".to_string(),
                code: "fn main() {}".to_string(),
                explanation: "Basic example".to_string(),
            }],
            common_mistakes: vec!["mistake1".to_string()],
            improvement_tips: vec!["tip1".to_string()],
            target_difficulty: "medium".to_string(),
        };

        let json = serde_json::to_string(&card).expect("should serialize");
        let parsed: TeachingCardOutput = serde_json::from_str(&json).expect("should roundtrip");
        assert_eq!(card, parsed);
    }

    #[test]
    fn insight_type_serialization_variants() {
        let types = vec![
            (InsightType::Pattern, "pattern"),
            (InsightType::AntiPattern, "anti_pattern"),
            (InsightType::Optimization, "optimization"),
            (InsightType::Style, "style"),
        ];
        for (it, expected) in types {
            let json = serde_json::to_string(&it).unwrap();
            assert_eq!(json, format!("\"{expected}\""), "insight type should serialize as {expected}");
            let parsed: InsightType = serde_json::from_str(&json).unwrap();
            assert_eq!(parsed, it, "should roundtrip");
        }
    }

    #[test]
    fn quality_level_serialization_variants() {
        let levels = vec![
            (QualityLevel::Excellent, "excellent"),
            (QualityLevel::Good, "good"),
            (QualityLevel::Fair, "fair"),
            (QualityLevel::NeedsImprovement, "needs_improvement"),
        ];
        for (ql, expected) in levels {
            let json = serde_json::to_string(&ql).unwrap();
            assert_eq!(json, format!("\"{expected}\""));
            let parsed: QualityLevel = serde_json::from_str(&json).unwrap();
            assert_eq!(parsed, ql);
        }
    }

    #[test]
    fn complexity_estimate_handles_big_o_notation() {
        let est = ComplexityEstimate {
            time: "O(n log n)".to_string(),
            space: "O(n)".to_string(),
        };
        let json = serde_json::to_string(&est).unwrap();
        let parsed: ComplexityEstimate = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.time, "O(n log n)");
        assert_eq!(parsed.space, "O(n)");
    }

    #[test]
    fn code_example_roundtrip() {
        let ex = CodeExample {
            label: "Binary Search".to_string(),
            language: "cpp".to_string(),
            code: "int mid = lo + (hi - lo) / 2;".to_string(),
            explanation: "Avoids overflow".to_string(),
        };
        let json = serde_json::to_string(&ex).unwrap();
        let parsed: CodeExample = serde_json::from_str(&json).unwrap();
        assert_eq!(ex, parsed);
    }
}
