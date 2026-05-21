/// Pure field-mapping functions for converting UOJ source data values
/// into AlgoMaster target values. All functions are stateless and unit-testable.
///
/// Map UOJ usergroup to AlgoMaster role (D-10-10).
///
/// - 'U' -> "student" (regular user)
/// - 'S' -> "student" (another regular user tier)
/// - 'B' -> None (banned, skip migration)
pub fn map_usergroup_to_role(usergroup: &str) -> Option<&'static str> {
    match usergroup {
        "U" | "S" => Some("student"),
        _ => None,
    }
}

/// Map UOJ language string to AlgoMaster language (D-10-8).
///
/// Returns None for languages AlgoMaster does not support (Java, Python2, Go).
/// These submissions will be skipped during migration.
pub fn map_language(lang: &str) -> Option<&'static str> {
    match lang {
        "C" => Some("c"),
        "C++" | "C++11" | "C++17" | "C++20" => Some("cpp"),
        "Python3" => Some("python3"),
        _ => None,
    }
}

/// Map UOJ submission result string to AlgoMaster (status, verdict) pair.
///
/// Returns (status, Some(verdict)) for judged submissions,
/// (status, None) for queued/pending or when verdict is not applicable.
pub fn map_status_verdict(result: Option<&str>) -> (&'static str, Option<&'static str>) {
    match result {
        Some("Accepted") => ("judged", Some("ac")),
        Some("Wrong Answer") => ("judged", Some("wa")),
        Some("Runtime Error") => ("judged", Some("rte")),
        Some("Time Limit Exceeded") => ("judged", Some("tle")),
        Some("Memory Limit Exceeded") => ("judged", Some("mle")),
        Some("Output Limit Exceeded") => ("judged", Some("ole")),
        Some("Compile Error") => ("failed", Some("ce")),
        Some("System Error") => ("failed", Some("ie")),
        Some("") | None => ("queued", None),
        Some(other) => {
            tracing::warn!("Unknown UOJ result verdict: {}, treating as queued", other);
            ("queued", None)
        }
    }
}

/// Generate a URL-friendly slug from a title and ID.
///
/// Lowercases, replaces non-alphanumeric characters with hyphens, collapses
/// consecutive hyphens, strips leading/trailing hyphens, and appends "-{id}".
pub fn generate_slug(title: &str, id: i64) -> String {
    let mut slug = String::new();
    let mut prev_hyphen = true; // suppress leading hyphens

    for ch in title.to_lowercase().chars() {
        if ch.is_alphanumeric() {
            slug.push(ch);
            prev_hyphen = false;
        } else if !prev_hyphen {
            slug.push('-');
            prev_hyphen = true;
        }
    }

    // Strip trailing hyphen
    if slug.ends_with('-') {
        slug.pop();
    }

    slug.push('-');
    slug.push_str(&id.to_string());
    slug
}

/// Generate a synthetic email for users whose original email is empty or duplicated.
pub fn generate_synthetic_email(username: &str) -> String {
    format!("{}@migrated.uoj.local", username)
}

/// Parse extra_config JSON to extract time_limit (ms) and memory_limit (MB -> KB).
///
/// UOJ stores: `{"time_limit": 1000, "memory_limit": 256}`
/// Returns (time_limit_ms, memory_limit_kb). Defaults: (1000, 256000).
pub fn parse_extra_config(json_str: &Option<String>) -> (i32, i32) {
    let default = (1000, 256000);

    let json_str = match json_str {
        Some(s) if !s.is_empty() && s != "NULL" => s,
        _ => return default,
    };

    let val: serde_json::Value = match serde_json::from_str(json_str) {
        Ok(v) => v,
        Err(_) => return default,
    };

    let obj = match val.as_object() {
        Some(o) => o,
        None => return default,
    };

    let time_limit = obj
        .get("time_limit")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32)
        .unwrap_or(default.0);

    // UOJ stores memory_limit in MB; AlgoMaster expects KB
    let memory_limit = obj
        .get("memory_limit")
        .and_then(|v| v.as_i64())
        .map(|v| (v * 1024) as i32)
        .unwrap_or(default.1);

    (time_limit, memory_limit)
}

/// Map UOJ is_hidden boolean to AlgoMaster visibility string.
pub fn map_visibility(is_hidden: bool) -> &'static str {
    if is_hidden {
        "private"
    } else {
        "public"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- map_usergroup_to_role ---

    #[test]
    fn usergroup_u_maps_to_student() {
        assert_eq!(map_usergroup_to_role("U"), Some("student"));
    }

    #[test]
    fn usergroup_s_maps_to_student() {
        assert_eq!(map_usergroup_to_role("S"), Some("student"));
    }

    #[test]
    fn usergroup_b_returns_none() {
        assert_eq!(map_usergroup_to_role("B"), None);
    }

    #[test]
    fn usergroup_unknown_returns_none() {
        assert_eq!(map_usergroup_to_role("X"), None);
    }

    // --- map_language ---

    #[test]
    fn c_maps_to_c() {
        assert_eq!(map_language("C"), Some("c"));
    }

    #[test]
    fn cpp_variants_map_to_cpp() {
        assert_eq!(map_language("C++"), Some("cpp"));
        assert_eq!(map_language("C++11"), Some("cpp"));
        assert_eq!(map_language("C++17"), Some("cpp"));
        assert_eq!(map_language("C++20"), Some("cpp"));
    }

    #[test]
    fn python3_maps_to_python3() {
        assert_eq!(map_language("Python3"), Some("python3"));
    }

    #[test]
    fn java_returns_none() {
        assert_eq!(map_language("Java8"), None);
        assert_eq!(map_language("Java11"), None);
        assert_eq!(map_language("Java17"), None);
    }

    #[test]
    fn python2_returns_none() {
        assert_eq!(map_language("Python2"), None);
    }

    #[test]
    fn unknown_language_returns_none() {
        assert_eq!(map_language("Go"), None);
    }

    // --- map_status_verdict ---

    #[test]
    fn accepted_maps_correctly() {
        let (status, verdict) = map_status_verdict(Some("Accepted"));
        assert_eq!(status, "judged");
        assert_eq!(verdict, Some("ac"));
    }

    #[test]
    fn wrong_answer_maps_correctly() {
        let (status, verdict) = map_status_verdict(Some("Wrong Answer"));
        assert_eq!(status, "judged");
        assert_eq!(verdict, Some("wa"));
    }

    #[test]
    fn runtime_error_maps_correctly() {
        let (status, verdict) = map_status_verdict(Some("Runtime Error"));
        assert_eq!(status, "judged");
        assert_eq!(verdict, Some("rte"));
    }

    #[test]
    fn time_limit_maps_correctly() {
        let (status, verdict) = map_status_verdict(Some("Time Limit Exceeded"));
        assert_eq!(status, "judged");
        assert_eq!(verdict, Some("tle"));
    }

    #[test]
    fn memory_limit_maps_correctly() {
        let (status, verdict) = map_status_verdict(Some("Memory Limit Exceeded"));
        assert_eq!(status, "judged");
        assert_eq!(verdict, Some("mle"));
    }

    #[test]
    fn output_limit_maps_correctly() {
        let (status, verdict) = map_status_verdict(Some("Output Limit Exceeded"));
        assert_eq!(status, "judged");
        assert_eq!(verdict, Some("ole"));
    }

    #[test]
    fn compile_error_maps_to_failed() {
        let (status, verdict) = map_status_verdict(Some("Compile Error"));
        assert_eq!(status, "failed");
        assert_eq!(verdict, Some("ce"));
    }

    #[test]
    fn system_error_maps_to_failed() {
        let (status, verdict) = map_status_verdict(Some("System Error"));
        assert_eq!(status, "failed");
        assert_eq!(verdict, Some("ie"));
    }

    #[test]
    fn empty_result_maps_to_queued() {
        let (status, verdict) = map_status_verdict(Some(""));
        assert_eq!(status, "queued");
        assert_eq!(verdict, None);
    }

    #[test]
    fn none_result_maps_to_queued() {
        let (status, verdict) = map_status_verdict(None);
        assert_eq!(status, "queued");
        assert_eq!(verdict, None);
    }

    #[test]
    fn unknown_result_maps_to_queued() {
        let (status, verdict) = map_status_verdict(Some("Something Weird"));
        assert_eq!(status, "queued");
        assert_eq!(verdict, None);
    }

    // --- generate_slug ---

    #[test]
    fn simple_title_generates_slug() {
        assert_eq!(generate_slug("Hello World", 1), "hello-world-1");
    }

    #[test]
    fn special_characters_replaced() {
        assert_eq!(generate_slug("A + B Problem!", 42), "a-b-problem-42");
    }

    #[test]
    fn consecutive_non_alnum_collapses() {
        assert_eq!(generate_slug("Test   --- Case", 5), "test-case-5");
    }

    #[test]
    fn leading_trailing_specials_stripped() {
        assert_eq!(generate_slug("!!!Hello!!!", 99), "hello-99");
    }

    #[test]
    fn chinese_title_preserved() {
        // Chinese characters are alphanumeric per Unicode, kept as-is
        let slug = generate_slug("测试题目", 10);
        assert!(slug.ends_with("-10"));
    }

    #[test]
    fn empty_title_just_id() {
        assert_eq!(generate_slug("", 7), "-7");
    }

    // --- generate_synthetic_email ---

    #[test]
    fn synthetic_email_format() {
        assert_eq!(
            generate_synthetic_email("alice"),
            "alice@migrated.uoj.local"
        );
    }

    #[test]
    fn synthetic_email_with_underscore() {
        assert_eq!(
            generate_synthetic_email("test_user"),
            "test_user@migrated.uoj.local"
        );
    }

    // --- parse_extra_config ---

    #[test]
    fn valid_config_parsed() {
        let json =
            Some(r#"{"view_content_type":"ALL","time_limit":2000,"memory_limit":512}"#.to_string());
        let (time, mem) = parse_extra_config(&json);
        assert_eq!(time, 2000);
        assert_eq!(mem, 524288); // 512 * 1024
    }

    #[test]
    fn defaults_when_none() {
        let (time, mem) = parse_extra_config(&None);
        assert_eq!(time, 1000);
        assert_eq!(mem, 256000);
    }

    #[test]
    fn defaults_when_empty_string() {
        let (time, mem) = parse_extra_config(&Some(String::new()));
        assert_eq!(time, 1000);
        assert_eq!(mem, 256000);
    }

    #[test]
    fn defaults_when_null_string() {
        let (time, mem) = parse_extra_config(&Some("NULL".to_string()));
        assert_eq!(time, 1000);
        assert_eq!(mem, 256000);
    }

    #[test]
    fn defaults_when_invalid_json() {
        let (time, mem) = parse_extra_config(&Some("not json".to_string()));
        assert_eq!(time, 1000);
        assert_eq!(mem, 256000);
    }

    #[test]
    fn defaults_when_missing_fields() {
        let (time, mem) = parse_extra_config(&Some(r#"{"other": "value"}"#.to_string()));
        assert_eq!(time, 1000);
        assert_eq!(mem, 256000);
    }

    #[test]
    fn partial_config_uses_defaults() {
        let (time, mem) = parse_extra_config(&Some(r#"{"time_limit": 3000}"#.to_string()));
        assert_eq!(time, 3000);
        assert_eq!(mem, 256000); // default
    }

    // --- map_visibility ---

    #[test]
    fn hidden_maps_to_private() {
        assert_eq!(map_visibility(true), "private");
    }

    #[test]
    fn visible_maps_to_public() {
        assert_eq!(map_visibility(false), "public");
    }

    // --- Phase 10 evidence gap: migration_mapping_preserves_critical_fields ---

    #[test]
    fn test_migration_mapping_preserves_critical_fields() {
        // 1. map_usergroup_to_role: "U" -> "student"
        assert_eq!(
            map_usergroup_to_role("U"),
            Some("student"),
            "UOJ usergroup 'U' must map to AlgoMaster role 'student'"
        );

        // 2. map_usergroup_to_role: "B" -> None (banned users are skipped during migration)
        assert_eq!(
            map_usergroup_to_role("B"),
            None,
            "UOJ usergroup 'B' (banned) must return None so migration skips it"
        );

        // 3. generate_synthetic_email: must contain @ sign
        let email = generate_synthetic_email("testuser");
        assert!(
            email.contains('@'),
            "synthetic email must contain '@': got {email}"
        );
        assert!(
            email.starts_with("testuser@"),
            "synthetic email must start with the username: got {email}"
        );

        // 4. map_language: supported and unsupported languages
        // Supported: C, C++, Python3
        assert_eq!(map_language("C"), Some("c"), "C must map to 'c'");
        assert_eq!(map_language("C++"), Some("cpp"), "C++ must map to 'cpp'");
        assert_eq!(
            map_language("C++17"),
            Some("cpp"),
            "C++17 must map to 'cpp'"
        );
        assert_eq!(
            map_language("Python3"),
            Some("python3"),
            "Python3 must map to 'python3'"
        );

        // Unsupported: Java, Go, JavaScript -> None (skipped during migration)
        assert_eq!(
            map_language("Java8"),
            None,
            "Java must return None (not supported)"
        );
        assert_eq!(
            map_language("Go"),
            None,
            "Go must return None (not supported)"
        );
        assert_eq!(
            map_language("JavaScript"),
            None,
            "JavaScript must return None (not supported)"
        );

        // 5. map_status_verdict: Accepted and Wrong Answer
        let (status, verdict) = map_status_verdict(Some("Accepted"));
        assert_eq!(status, "judged");
        assert_eq!(verdict, Some("ac"));

        let (status, verdict) = map_status_verdict(Some("Wrong Answer"));
        assert_eq!(status, "judged");
        assert_eq!(verdict, Some("wa"));
    }
}
