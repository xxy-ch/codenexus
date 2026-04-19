use std::io::Write;

use anyhow::Result;
use serde::Serialize;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

/// Export configuration for a problem, used to serialize config.json inside the ZIP.
#[derive(Debug, Clone, Serialize)]
pub struct ProblemExportConfig {
    pub title: String,
    pub difficulty: String,
    pub time_limit: i32,
    pub memory_limit: i32,
    pub is_public: bool,
    pub visibility: String,
    pub tags: Vec<String>,
    pub source_url: Option<String>,
    pub author_note: Option<String>,
    pub test_cases: Vec<ProblemExportTestCase>,
}

/// Test case entry in the export config.json.
#[derive(Debug, Clone, Serialize)]
pub struct ProblemExportTestCase {
    pub input_file: String,
    pub output_file: String,
    pub is_hidden: bool,
    pub score: i32,
    pub order: i32,
}

/// A test case for export, containing the actual data.
#[derive(Debug, Clone)]
pub struct ExportTestCase {
    pub input: String,
    pub expected_output: String,
    pub is_hidden: bool,
    pub score: i32,
    pub order: i32,
}

/// Minimal problem data needed for export.
/// The route handler will map from domain_problems::models::Problem to this.
#[derive(Debug, Clone)]
pub struct ExportProblem {
    pub title: String,
    pub description: String,
    pub difficulty: String,
    pub time_limit: i32,
    pub memory_limit: i32,
    pub is_public: bool,
    pub visibility: String,
    pub tags: Vec<String>,
    pub source_url: Option<String>,
    pub author_note: Option<String>,
}

/// Build a ZIP archive containing exported problem data.
///
/// Structure:
/// ```text
/// problems/{slug}/config.json
/// problems/{slug}/problem.md
/// problems/{slug}/testcases/{order}.in
/// problems/{slug}/testcases/{order}.out
/// ```
pub fn build_problem_zip(
    problem: &ExportProblem,
    test_cases: &[ExportTestCase],
) -> Result<Vec<u8>> {
    let buf = std::io::Cursor::new(Vec::new());
    let mut writer = ZipWriter::new(buf);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let slug = slugify(&problem.title);

    // Write config.json
    let export_tc: Vec<ProblemExportTestCase> = test_cases
        .iter()
        .map(|tc| ProblemExportTestCase {
            input_file: format!("testcases/{}.in", tc.order),
            output_file: format!("testcases/{}.out", tc.order),
            is_hidden: tc.is_hidden,
            score: tc.score,
            order: tc.order,
        })
        .collect();

    let export_config = ProblemExportConfig {
        title: problem.title.clone(),
        difficulty: problem.difficulty.clone(),
        time_limit: problem.time_limit,
        memory_limit: problem.memory_limit,
        is_public: problem.is_public,
        visibility: problem.visibility.clone(),
        tags: problem.tags.clone(),
        source_url: problem.source_url.clone(),
        author_note: problem.author_note.clone(),
        test_cases: export_tc,
    };

    let config_path = format!("problems/{}/config.json", slug);
    let config_json = serde_json::to_string_pretty(&export_config)?;
    writer.start_file(&config_path, options.clone())?;
    writer.write_all(config_json.as_bytes())?;

    // Write problem.md
    let md_path = format!("problems/{}/problem.md", slug);
    writer.start_file(&md_path, options.clone())?;
    writer.write_all(problem.description.as_bytes())?;

    // Write test case files
    for tc in test_cases {
        let in_path = format!("problems/{}/testcases/{}.in", slug, tc.order);
        writer.start_file(&in_path, options.clone())?;
        writer.write_all(tc.input.as_bytes())?;

        let out_path = format!("problems/{}/testcases/{}.out", slug, tc.order);
        writer.start_file(&out_path, options.clone())?;
        writer.write_all(tc.expected_output.as_bytes())?;
    }

    let result = writer.finish()?;
    Ok(result.into_inner())
}

/// Convert a slug from a problem title: lowercase, replace spaces with hyphens,
/// strip non-alphanumeric characters (except hyphens).
pub fn slugify(title: &str) -> String {
    title
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() {
                c
            } else if c == ' ' || c == '_' {
                '-'
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ImportItemStatus;
    use crate::problem_import::parse_problem_zip;
    use std::collections::HashSet;
    use std::io::Read;

    fn make_test_problem() -> ExportProblem {
        ExportProblem {
            title: "Two Sum".to_string(),
            description: "Find two numbers that add up to the target.".to_string(),
            difficulty: "easy".to_string(),
            time_limit: 3000,
            memory_limit: 128,
            is_public: true,
            visibility: "public".to_string(),
            tags: vec!["array".to_string(), "hash-table".to_string()],
            source_url: Some("https://leetcode.com/problems/two-sum/".to_string()),
            author_note: Some("Classic problem".to_string()),
        }
    }

    fn make_test_cases() -> Vec<ExportTestCase> {
        vec![
            ExportTestCase {
                input: "2 7\n9\n".to_string(),
                expected_output: "0 1\n".to_string(),
                is_hidden: false,
                score: 50,
                order: 1,
            },
            ExportTestCase {
                input: "3 6\n9\n".to_string(),
                expected_output: "1 2\n".to_string(),
                is_hidden: true,
                score: 50,
                order: 2,
            },
        ]
    }

    #[test]
    fn build_problem_zip_creates_valid_archive() {
        let problem = make_test_problem();
        let test_cases = make_test_cases();
        let zip_bytes = build_problem_zip(&problem, &test_cases).unwrap();

        let cursor = std::io::Cursor::new(zip_bytes.as_slice());
        let mut archive = zip::ZipArchive::new(cursor).unwrap();

        assert!(archive.by_name("problems/two-sum/config.json").is_ok());
        assert!(archive.by_name("problems/two-sum/problem.md").is_ok());
        assert!(archive.by_name("problems/two-sum/testcases/1.in").is_ok());
        assert!(archive.by_name("problems/two-sum/testcases/1.out").is_ok());
        assert!(archive.by_name("problems/two-sum/testcases/2.in").is_ok());
        assert!(archive.by_name("problems/two-sum/testcases/2.out").is_ok());
    }

    #[test]
    fn build_problem_zip_config_has_correct_fields() {
        let problem = make_test_problem();
        let test_cases = make_test_cases();
        let zip_bytes = build_problem_zip(&problem, &test_cases).unwrap();

        let cursor = std::io::Cursor::new(zip_bytes.as_slice());
        let mut archive = zip::ZipArchive::new(cursor).unwrap();

        let mut config_file = archive.by_name("problems/two-sum/config.json").unwrap();
        let mut config_json = String::new();
        config_file.read_to_string(&mut config_json).unwrap();

        let config: serde_json::Value = serde_json::from_str(&config_json).unwrap();
        assert_eq!(config["title"], "Two Sum");
        assert_eq!(config["difficulty"], "easy");
        assert_eq!(config["time_limit"], 3000);
        assert_eq!(config["memory_limit"], 128);
        assert_eq!(config["is_public"], true);
        assert_eq!(config["visibility"], "public");
        assert_eq!(config["tags"].as_array().unwrap().len(), 2);
        assert_eq!(config["test_cases"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn build_problem_zip_test_case_content() {
        let problem = make_test_problem();
        let test_cases = make_test_cases();
        let zip_bytes = build_problem_zip(&problem, &test_cases).unwrap();

        let cursor = std::io::Cursor::new(zip_bytes.as_slice());
        let mut archive = zip::ZipArchive::new(cursor).unwrap();

        {
            let mut in_file = archive.by_name("problems/two-sum/testcases/1.in").unwrap();
            let mut in_content = String::new();
            in_file.read_to_string(&mut in_content).unwrap();
            assert_eq!(in_content, "2 7\n9\n");
        }

        {
            let mut out_file = archive.by_name("problems/two-sum/testcases/1.out").unwrap();
            let mut out_content = String::new();
            out_file.read_to_string(&mut out_content).unwrap();
            assert_eq!(out_content, "0 1\n");
        }
    }

    #[test]
    fn round_trip_export_then_import() {
        let problem = make_test_problem();
        let test_cases = make_test_cases();
        let zip_bytes = build_problem_zip(&problem, &test_cases).unwrap();

        let skip = HashSet::new();
        let items = parse_problem_zip(&zip_bytes, &skip).unwrap();

        assert_eq!(items.len(), 1);
        let item = &items[0];

        assert_eq!(item.slug, "two-sum");
        assert_eq!(item.config.title, "Two Sum");
        assert_eq!(item.config.difficulty, "easy");
        assert_eq!(item.config.time_limit, 3000);
        assert_eq!(item.config.memory_limit, 128);
        assert!(item.config.is_public);
        assert_eq!(item.config.visibility, "public");
        assert_eq!(item.config.tags, vec!["array", "hash-table"]);
        assert_eq!(
            item.config.source_url,
            Some("https://leetcode.com/problems/two-sum/".to_string())
        );
        assert_eq!(item.config.author_note, Some("Classic problem".to_string()));
        assert_eq!(item.description, "Find two numbers that add up to the target.");
        assert_eq!(item.test_case_files.len(), 2);
        assert_eq!(item.status, ImportItemStatus::Valid);

        // Verify test case content round-trips
        let tc_req = crate::problem_import::convert_to_test_cases(item);
        assert_eq!(tc_req.test_cases.len(), 2);
        assert_eq!(tc_req.test_cases[0].input, "2 7\n9\n");
        assert_eq!(tc_req.test_cases[0].expected_output, "0 1\n");
        assert_eq!(tc_req.test_cases[0].is_hidden, Some(false));
        assert_eq!(tc_req.test_cases[0].score, Some(50));
        assert_eq!(tc_req.test_cases[0].order, Some(1));
        assert_eq!(tc_req.test_cases[1].input, "3 6\n9\n");
        assert_eq!(tc_req.test_cases[1].expected_output, "1 2\n");
        assert_eq!(tc_req.test_cases[1].is_hidden, Some(true));
        assert_eq!(tc_req.test_cases[1].score, Some(50));
    }

    #[test]
    fn slugify_converts_title() {
        assert_eq!(slugify("Two Sum"), "two-sum");
        assert_eq!(slugify("Add Two Numbers"), "add-two-numbers");
        assert_eq!(slugify("A+B Problem"), "a-b-problem");
    }

    #[test]
    fn build_problem_zip_with_no_test_cases() {
        let problem = ExportProblem {
            title: "Simple".to_string(),
            description: "Simple problem".to_string(),
            difficulty: "easy".to_string(),
            time_limit: 5000,
            memory_limit: 256,
            is_public: false,
            visibility: "private".to_string(),
            tags: vec![],
            source_url: None,
            author_note: None,
        };

        let zip_bytes = build_problem_zip(&problem, &[]).unwrap();

        let cursor = std::io::Cursor::new(zip_bytes.as_slice());
        let mut archive = zip::ZipArchive::new(cursor).unwrap();

        assert!(archive.by_name("problems/simple/config.json").is_ok());
        assert!(archive.by_name("problems/simple/problem.md").is_ok());
        assert!(archive.by_name("problems/simple/testcases/1.in").is_err());
    }
}
