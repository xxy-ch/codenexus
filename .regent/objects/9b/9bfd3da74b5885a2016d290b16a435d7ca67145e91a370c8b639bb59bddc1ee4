use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Structural features extracted from source code.
/// Pure computation — no external API calls.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StructuralFeatures {
    pub cyclomatic_complexity: f64,
    pub lines_of_code: i32,
    pub token_count: i32,
    pub function_count: i32,
    pub max_nesting_depth: i32,
    pub has_recursion: bool,
    pub loop_count: i32,
    pub avg_loop_nesting: f64,
    pub distinct_operators: i32,
    pub distinct_operands: i32,
    pub halstead_volume: f64,
}

/// Extract structural features from source code.
/// Runs synchronously — designed to be called via `spawn_blocking`.
pub fn extract_features(source_code: &str, language: &str) -> Result<StructuralFeatures> {
    if source_code.trim().is_empty() {
        return Ok(StructuralFeatures {
            cyclomatic_complexity: 0.0,
            lines_of_code: 0,
            token_count: 0,
            function_count: 0,
            max_nesting_depth: 0,
            has_recursion: false,
            loop_count: 0,
            avg_loop_nesting: 0.0,
            distinct_operators: 0,
            distinct_operands: 0,
            halstead_volume: 0.0,
        });
    }

    let lines: Vec<&str> = source_code.lines().collect();
    let lines_of_code = lines
        .iter()
        .filter(|line| {
            let trimmed = line.trim();
            !trimmed.is_empty()
                && !trimmed.starts_with("//")
                && !trimmed.starts_with('#')
                && !trimmed.starts_with("--")
                && !trimmed.starts_with("/*")
        })
        .count() as i32;

    let function_count = count_functions(source_code, language);
    let max_nesting_depth = compute_max_nesting(source_code, language);
    let has_recursion = detect_recursion(source_code, language);
    let loop_metrics = compute_loop_metrics(source_code, language);
    let tokens: Vec<&str> = source_code.split_whitespace().collect();
    let token_count = tokens.len() as i32;

    let branch_keywords = [
        "if", "else", "for", "while", "case", "&&", "||", "?", "catch", "match", "elif", "except",
    ];
    let branch_count: i32 = branch_keywords
        .iter()
        .map(|kw| source_code.matches(kw).count() as i32)
        .sum();
    let cyclomatic_complexity = (branch_count + 1) as f64;

    let operators = [
        "+", "-", "*", "/", "=", "==", "!=", "<", ">", "<=", ">=", "++", "--", "&&", "||", "!",
        "&", "|", "^", "%", ":=",
    ];
    let mut distinct_ops = HashSet::new();
    let mut distinct_operands = HashSet::new();

    let mut length = 0i32;

    for op in &operators {
        let occurrences = source_code.matches(op).count() as i32;
        if occurrences > 0 {
            distinct_ops.insert(*op);
            length += occurrences;
        }
    }

    for token in &tokens {
        let clean = token
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '_')
            .collect::<String>();
        if !clean.is_empty() && !operators.iter().any(|op| *op == clean) {
            distinct_operands.insert(clean);
            length += 1;
        }
    }

    let distinct_operators = distinct_ops.len() as i32;
    let distinct_operands = distinct_operands.len() as i32;
    let vocabulary = distinct_operators + distinct_operands;
    let halstead_volume = if vocabulary > 0 && length > 0 {
        (length as f64) * (vocabulary as f64).log2()
    } else {
        0.0
    };

    Ok(StructuralFeatures {
        cyclomatic_complexity,
        lines_of_code,
        token_count,
        function_count,
        max_nesting_depth,
        has_recursion,
        loop_count: loop_metrics.count,
        avg_loop_nesting: loop_metrics.avg_nesting,
        distinct_operators,
        distinct_operands,
        halstead_volume,
    })
}

fn count_functions(source: &str, language: &str) -> i32 {
    let lang = language.to_ascii_lowercase();
    source
        .lines()
        .filter(|line| {
            let trimmed = line.trim_start();
            match lang.as_str() {
                "rust" => trimmed.starts_with("fn "),
                "python" => trimmed.starts_with("def "),
                "go" => trimmed.starts_with("func "),
                "javascript" | "js" | "typescript" | "ts" => {
                    trimmed.starts_with("function ")
                        || trimmed.contains(" => ")
                        || trimmed.starts_with("async function ")
                }
                "java" => {
                    trimmed.contains(" class ")
                        || trimmed.starts_with("public ")
                        || trimmed.starts_with("private ")
                        || trimmed.starts_with("protected ")
                }
                "c" | "cpp" | "c++" | "cc" => {
                    trimmed.contains('(') && trimmed.contains(')') && trimmed.ends_with('{')
                }
                _ => {
                    trimmed.starts_with("fn ")
                        || trimmed.starts_with("def ")
                        || trimmed.starts_with("func ")
                        || trimmed.starts_with("function ")
                }
            }
        })
        .count() as i32
}

fn compute_max_nesting(source: &str, language: &str) -> i32 {
    let lang = language.to_ascii_lowercase();
    if matches!(lang.as_str(), "python" | "py") {
        return compute_python_nesting(source);
    }

    let mut depth = 0i32;
    let mut max_depth = 0i32;
    for ch in source.chars() {
        match ch {
            '{' => {
                depth += 1;
                max_depth = max_depth.max(depth);
            }
            '}' => {
                depth = (depth - 1).max(0);
            }
            _ => {}
        }
    }
    max_depth
}

fn compute_python_nesting(source: &str) -> i32 {
    let mut stack: Vec<usize> = Vec::new();
    let mut max_depth = 0i32;

    for line in source.lines() {
        let trimmed = line.trim_end();
        let content = trimmed.trim_start();
        if content.is_empty() || content.starts_with('#') {
            continue;
        }
        let indent = trimmed.len().saturating_sub(content.len());

        while let Some(&last) = stack.last() {
            if indent <= last {
                stack.pop();
            } else {
                break;
            }
        }

        if content.ends_with(':') {
            stack.push(indent);
            max_depth = max_depth.max(stack.len() as i32);
        }
    }

    max_depth.max(1)
}

#[derive(Debug, Clone, Copy, PartialEq)]
struct LoopMetrics {
    count: i32,
    avg_nesting: f64,
}

fn compute_loop_metrics(source: &str, language: &str) -> LoopMetrics {
    let lang = language.to_ascii_lowercase();
    if matches!(lang.as_str(), "python" | "py") {
        return compute_python_loop_metrics(source);
    }

    let mut block_stack: Vec<bool> = Vec::new();
    let mut loop_depth = 0i32;
    let mut pending_loop_blocks = 0i32;
    let mut loop_count = 0i32;
    let mut total_loop_depth = 0i32;

    for line in source.lines() {
        let code = strip_inline_comment(line, &lang);
        let mut iter = code.char_indices().peekable();

        while let Some((index, ch)) = iter.next() {
            match ch {
                '{' => {
                    if pending_loop_blocks > 0 {
                        pending_loop_blocks -= 1;
                        block_stack.push(true);
                        loop_depth += 1;
                    } else {
                        block_stack.push(false);
                    }
                }
                '}' => {
                    if block_stack.pop().unwrap_or(false) {
                        loop_depth = (loop_depth - 1).max(0);
                    }
                }
                _ if is_identifier_start(ch) => {
                    let mut end = index + ch.len_utf8();
                    while let Some((next_index, next_ch)) = iter.peek().copied() {
                        if is_identifier_continue(next_ch) {
                            iter.next();
                            end = next_index + next_ch.len_utf8();
                        } else {
                            break;
                        }
                    }

                    let token = &code[index..end];
                    if is_loop_keyword(token, &lang) {
                        let nesting = loop_depth + pending_loop_blocks + 1;
                        loop_count += 1;
                        total_loop_depth += nesting;
                        pending_loop_blocks += 1;
                    }
                }
                _ => {}
            }
        }

        if code.trim_end().ends_with(';') {
            pending_loop_blocks = 0;
        }
    }

    LoopMetrics {
        count: loop_count,
        avg_nesting: average_loop_depth(total_loop_depth, loop_count),
    }
}

fn compute_python_loop_metrics(source: &str) -> LoopMetrics {
    let mut loop_indents: Vec<usize> = Vec::new();
    let mut loop_count = 0i32;
    let mut total_loop_depth = 0i32;

    for line in source.lines() {
        let code = strip_inline_comment(line, "python");
        let trimmed = code.trim_end();
        let content = trimmed.trim_start();
        if content.is_empty() || content.starts_with('#') {
            continue;
        }

        let indent = trimmed.len().saturating_sub(content.len());
        while let Some(&last) = loop_indents.last() {
            if indent <= last {
                loop_indents.pop();
            } else {
                break;
            }
        }

        if starts_with_python_loop_header(content) {
            let nesting = loop_indents.len() as i32 + 1;
            loop_count += 1;
            total_loop_depth += nesting;
            if content.ends_with(':') {
                loop_indents.push(indent);
            }
        }
    }

    LoopMetrics {
        count: loop_count,
        avg_nesting: average_loop_depth(total_loop_depth, loop_count),
    }
}

fn average_loop_depth(total_loop_depth: i32, loop_count: i32) -> f64 {
    if loop_count == 0 {
        0.0
    } else {
        total_loop_depth as f64 / loop_count as f64
    }
}

fn detect_recursion(source: &str, language: &str) -> bool {
    let function_names = collect_function_names(source, language);
    function_names.iter().any(|name| {
        let call_like_uses = count_identifier_followed_by_paren(source, name);
        let declaration_call_like_uses = source
            .lines()
            .filter(|line| line_declares_function_name(line, name, language))
            .filter(|line| count_identifier_followed_by_paren(line, name) > 0)
            .count();

        call_like_uses > declaration_call_like_uses
    })
}

fn collect_function_names(source: &str, language: &str) -> Vec<String> {
    source
        .lines()
        .filter_map(|line| collect_function_name_from_line(line, language))
        .collect()
}

fn collect_function_name_from_line(line: &str, language: &str) -> Option<String> {
    let lang = language.to_ascii_lowercase();
    let code = strip_inline_comment(line, &lang);
    let trimmed = code.trim_start();

    match lang.as_str() {
        "rust" => parse_rust_function_name(trimmed),
        "python" | "py" => parse_identifier_after_prefix(trimmed, "def "),
        "go" => parse_go_function_name(trimmed),
        "javascript" | "js" | "typescript" | "ts" => parse_javascript_function_name(trimmed),
        "c" | "cpp" | "c++" | "cc" | "java" => parse_c_style_function_name(trimmed),
        _ => parse_rust_function_name(trimmed)
            .or_else(|| parse_identifier_after_prefix(trimmed, "def "))
            .or_else(|| parse_go_function_name(trimmed))
            .or_else(|| parse_javascript_function_name(trimmed))
            .or_else(|| parse_c_style_function_name(trimmed)),
    }
}

fn line_declares_function_name(line: &str, name: &str, language: &str) -> bool {
    collect_function_name_from_line(line, language)
        .as_deref()
        .map(|declared| declared == name)
        .unwrap_or(false)
}

fn parse_rust_function_name(trimmed: &str) -> Option<String> {
    let without_visibility = trimmed
        .strip_prefix("pub ")
        .or_else(|| trimmed.strip_prefix("pub(crate) "))
        .or_else(|| trimmed.strip_prefix("pub(super) "))
        .unwrap_or(trimmed);
    parse_identifier_after_prefix(without_visibility, "fn ")
}

fn parse_go_function_name(trimmed: &str) -> Option<String> {
    let rest = trimmed.strip_prefix("func ")?.trim_start();
    if rest.starts_with('(') {
        let receiver_end = rest.find(')')?;
        first_identifier(rest[receiver_end + 1..].trim_start())
    } else {
        first_identifier(rest)
    }
}

fn parse_javascript_function_name(trimmed: &str) -> Option<String> {
    if let Some(name) = parse_identifier_after_prefix(trimmed, "async function ") {
        return Some(name);
    }
    if let Some(name) = parse_identifier_after_prefix(trimmed, "function ") {
        return Some(name);
    }

    if trimmed.contains("=>") {
        let before_assignment = trimmed.split('=').next()?.trim_end();
        return trailing_identifier(before_assignment);
    }

    None
}

fn parse_c_style_function_name(trimmed: &str) -> Option<String> {
    if !trimmed.contains('(') || !trimmed.contains('{') || starts_with_control_keyword(trimmed) {
        return None;
    }

    let before_paren = trimmed.split('(').next()?.trim_end();
    trailing_identifier(before_paren)
}

fn parse_identifier_after_prefix(trimmed: &str, prefix: &str) -> Option<String> {
    trimmed.strip_prefix(prefix).and_then(first_identifier)
}

fn first_identifier(input: &str) -> Option<String> {
    let mut identifier = String::new();
    for ch in input.chars() {
        if identifier.is_empty() {
            if is_identifier_start(ch) {
                identifier.push(ch);
            } else if ch.is_whitespace() {
                continue;
            } else {
                return None;
            }
        } else if is_identifier_continue(ch) {
            identifier.push(ch);
        } else {
            break;
        }
    }

    (!identifier.is_empty()).then_some(identifier)
}

fn trailing_identifier(input: &str) -> Option<String> {
    let chars: Vec<char> = input.chars().collect();
    let mut end = chars.len();
    while end > 0 && !is_identifier_continue(chars[end - 1]) {
        end -= 1;
    }

    let mut start = end;
    while start > 0 && is_identifier_continue(chars[start - 1]) {
        start -= 1;
    }

    if start < end && is_identifier_start(chars[start]) {
        Some(chars[start..end].iter().collect())
    } else {
        None
    }
}

fn count_identifier_followed_by_paren(source: &str, identifier: &str) -> usize {
    if identifier.is_empty() {
        return 0;
    }

    let mut count = 0usize;
    for (index, _) in source.match_indices(identifier) {
        let before = source[..index].chars().next_back();
        let after_index = index + identifier.len();
        let after = source[after_index..].chars().next();

        if before.map(is_identifier_continue).unwrap_or(false)
            || after.map(is_identifier_continue).unwrap_or(false)
        {
            continue;
        }

        if source[after_index..].trim_start().starts_with('(') {
            count += 1;
        }
    }

    count
}

fn strip_inline_comment<'a>(line: &'a str, language: &str) -> &'a str {
    let mut end = line.len();
    if let Some(index) = line.find("//") {
        end = end.min(index);
    }
    if matches!(language, "python" | "py") {
        if let Some(index) = line.find('#') {
            end = end.min(index);
        }
    }

    &line[..end]
}

fn starts_with_python_loop_header(content: &str) -> bool {
    content
        .strip_prefix("for ")
        .or_else(|| content.strip_prefix("while "))
        .is_some()
}

fn is_loop_keyword(token: &str, language: &str) -> bool {
    match language {
        "rust" => matches!(token, "for" | "while" | "loop"),
        "c" | "cpp" | "c++" | "cc" | "java" | "javascript" | "js" | "typescript" | "ts" => {
            matches!(token, "for" | "while" | "do")
        }
        _ => matches!(token, "for" | "while" | "loop"),
    }
}

fn starts_with_control_keyword(trimmed: &str) -> bool {
    ["if", "for", "while", "switch", "catch", "else", "do"]
        .iter()
        .any(|keyword| {
            trimmed == *keyword
                || trimmed
                    .strip_prefix(keyword)
                    .and_then(|rest| rest.chars().next())
                    .map(|ch| ch.is_whitespace() || ch == '(')
                    .unwrap_or(false)
        })
}

fn is_identifier_start(ch: char) -> bool {
    ch == '_' || ch.is_ascii_alphabetic()
}

fn is_identifier_continue(ch: char) -> bool {
    ch == '_' || ch.is_ascii_alphanumeric()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_nesting_and_functions() {
        let code = r#"
fn main() {
    if x > 0 {
        for i in 0..10 {
            println!("{}", i);
        }
    }
}
"#;
        let features = extract_features(code, "rust").unwrap();
        assert!(features.lines_of_code > 0);
        assert!(features.cyclomatic_complexity >= 1.0);
        assert!(features.max_nesting_depth >= 2);
        assert!(features.function_count >= 1);
    }

    #[test]
    fn handles_python_nesting() {
        let code = "def foo():\n    if x:\n        pass\n";
        let features = extract_features(code, "python").unwrap();
        assert!(features.max_nesting_depth >= 2);
        assert!(features.function_count >= 1);
    }

    #[test]
    fn empty_input_returns_zeroes() {
        let features = extract_features("", "c").unwrap();
        assert_eq!(features.lines_of_code, 0);
        assert_eq!(features.token_count, 0);
        assert_eq!(features.function_count, 0);
        assert!(!features.has_recursion);
        assert_eq!(features.loop_count, 0);
        assert_eq!(features.avg_loop_nesting, 0.0);
    }

    #[test]
    fn detects_direct_recursion() {
        let code = r#"
fn factorial(n: i32) -> i32 {
    if n <= 1 {
        1
    } else {
        n * factorial(n - 1)
    }
}
"#;
        let features = extract_features(code, "rust").unwrap();
        assert!(features.has_recursion);
        assert_eq!(features.loop_count, 0);
        assert_eq!(features.avg_loop_nesting, 0.0);
    }

    #[test]
    fn counts_loop_statements_and_average_loop_nesting() {
        let code = r#"
fn main() {
    for i in 0..10 {
        while keep_running() {
            loop {
                break;
            }
        }
    }
    while retry() {
        do_work();
    }
}
"#;
        let features = extract_features(code, "rust").unwrap();
        assert_eq!(features.loop_count, 4);
        assert!((features.avg_loop_nesting - 1.75).abs() < f64::EPSILON);
    }

    #[test]
    fn computes_python_loop_nesting() {
        let code = r#"
def search(items):
    for item in items:
        while item.ready:
            for child in item.children:
                print(child)
    while retry():
        pass
"#;
        let features = extract_features(code, "python").unwrap();
        assert_eq!(features.loop_count, 4);
        assert!((features.avg_loop_nesting - 1.75).abs() < f64::EPSILON);
    }
}
