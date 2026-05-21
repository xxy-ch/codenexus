use std::collections::{HashMap, HashSet};
use std::io::Read;

use crate::models::{ImportItemStatus, ProblemConfig, ProblemImportItem, TestCaseFile};
use crate::security::{validate_zip_archive, validate_zip_entry, MAX_ARCHIVE_SIZE, MAX_FILE_SIZE};

use domain_problems::models::CreateProblemRequest;
use domain_problems::test_cases::{BatchImportTestCasesRequest, CreateTestCaseRequest};
use zip::ZipArchive;

/// Parse a ZIP archive containing problem definitions.
///
/// Expected structure:
/// ```text
/// problems/
///   {slug}/
///     config.json       -- ProblemConfig fields
///     problem.md         -- problem description
///     testcases/
///       1.in, 1.out     -- test case input/output files
/// ```
///
/// Returns a Vec of ProblemImportItem, one per problem directory found.
/// Items with parsing errors or missing files get `ImportItemStatus::Error`.
/// Items whose title matches an entry in `skip_titles` get `ImportItemStatus::Duplicate`.
pub fn parse_problem_zip(
    zip_bytes: &[u8],
    skip_titles: &HashSet<String>,
) -> Result<Vec<ProblemImportItem>, anyhow::Error> {
    let cursor = std::io::Cursor::new(zip_bytes);
    let mut archive = ZipArchive::new(cursor)?;

    let entry_count = archive.len();
    validate_zip_archive(entry_count, 0)?; // check entry count only

    // Single pass: validate entries, read contents, and track actual sizes.
    // Incremental size checks bail early before more memory is consumed.
    let mut file_contents: HashMap<String, Vec<u8>> = HashMap::new();
    let mut total_raw_size: usize = 0;
    for i in 0..entry_count {
        let file = archive.by_index(i)?;
        let name = file.name().to_string();
        let declared_size = file.size() as usize;
        let is_symlink = file.is_symlink();
        validate_zip_entry(&name, file.size(), is_symlink)?;

        // Pre-check: if declared sizes already exceed budget, skip reading
        if total_raw_size.saturating_add(declared_size) > MAX_ARCHIVE_SIZE {
            return Err(anyhow::anyhow!(
                "Archive uncompressed size exceeds limit ({} + {} bytes)",
                total_raw_size,
                declared_size
            ));
        }

        // Hard-cap per-file read to catch metadata-lies zip bombs
        let mut buf = Vec::with_capacity(declared_size.min(MAX_FILE_SIZE as usize));
        file.take(MAX_FILE_SIZE + 1).read_to_end(&mut buf)?;
        if buf.len() > MAX_FILE_SIZE as usize {
            return Err(anyhow::anyhow!(
                "File '{}' exceeded per-file size limit",
                name
            ));
        }

        // Incremental actual-size check: bail immediately if budget exceeded
        total_raw_size += buf.len();
        if total_raw_size > MAX_ARCHIVE_SIZE {
            return Err(anyhow::anyhow!(
                "Archive actual uncompressed size exceeds limit ({} bytes)",
                total_raw_size
            ));
        }
        file_contents.insert(name, buf);
    }

    // Find all config.json entries matching problems/*/config.json
    let config_paths: Vec<String> = file_contents
        .keys()
        .filter(|p| {
            let p = p.trim_end_matches('/');
            p.starts_with("problems/") && p.ends_with("/config.json") && p.matches('/').count() == 2
        })
        .cloned()
        .collect();

    let mut items = Vec::new();

    for config_path in &config_paths {
        // Extract slug from path: "problems/{slug}/config.json"
        let slug = config_path
            .trim_start_matches("problems/")
            .trim_end_matches("/config.json")
            .to_string();

        // Read config.json bytes
        let config_bytes = match file_contents.get(config_path) {
            Some(b) => b,
            None => {
                items.push(make_error_item(&slug, "Failed to read config.json"));
                continue;
            }
        };

        let config_json = String::from_utf8_lossy(config_bytes);

        // Parse config.json
        let config: ProblemConfig = match serde_json::from_str(&config_json) {
            Ok(c) => c,
            Err(e) => {
                items.push(make_error_item(
                    &slug,
                    &format!("Invalid config.json: {}", e),
                ));
                continue;
            }
        };

        // Validate difficulty
        let valid_difficulties = ["easy", "medium", "hard"];
        if !valid_difficulties.contains(&config.difficulty.as_str()) {
            items.push(make_error_item(
                &slug,
                &format!("Invalid difficulty: '{}'", config.difficulty),
            ));
            continue;
        }

        // Read problem.md
        let md_path = format!("problems/{}/problem.md", slug);
        let description = match file_contents.get(&md_path) {
            Some(bytes) => String::from_utf8_lossy(bytes).to_string(),
            None => {
                items.push(make_error_item(
                    &slug,
                    &format!("Missing problem.md at {}", md_path),
                ));
                continue;
            }
        };

        // Read test case files
        let mut test_case_files = Vec::new();
        let mut missing_files = false;

        for tc_config in &config.test_cases {
            let input_path = if tc_config.input_file.starts_with("testcases/") {
                format!("problems/{}/{}", slug, tc_config.input_file)
            } else {
                format!("problems/{}/testcases/{}", slug, tc_config.input_file)
            };

            let output_path = if tc_config.output_file.starts_with("testcases/") {
                format!("problems/{}/{}", slug, tc_config.output_file)
            } else {
                format!("problems/{}/testcases/{}", slug, tc_config.output_file)
            };

            let input_bytes = match file_contents.get(&input_path) {
                Some(b) => b.clone(),
                None => {
                    items.push(make_error_item(
                        &slug,
                        &format!("Missing test case file: {}", input_path),
                    ));
                    missing_files = true;
                    break;
                }
            };

            let output_bytes = match file_contents.get(&output_path) {
                Some(b) => b.clone(),
                None => {
                    items.push(make_error_item(
                        &slug,
                        &format!("Missing test case file: {}", output_path),
                    ));
                    missing_files = true;
                    break;
                }
            };

            test_case_files.push(TestCaseFile {
                input: input_bytes,
                output: output_bytes,
                config: tc_config.clone(),
            });
        }

        if missing_files {
            continue;
        }

        // Check duplicate title
        let (status, warning) = if skip_titles.contains(&config.title) {
            (
                ImportItemStatus::Duplicate,
                Some("Problem with this title already exists in your organization".to_string()),
            )
        } else {
            (ImportItemStatus::Valid, None)
        };

        items.push(ProblemImportItem {
            slug,
            config,
            description,
            test_case_files,
            status,
            warning,
        });
    }

    Ok(items)
}

/// Convert a parsed ProblemImportItem into a CreateProblemRequest for the problems domain.
pub fn convert_to_create_request(
    item: &ProblemImportItem,
    organization_id: i64,
) -> CreateProblemRequest {
    CreateProblemRequest {
        title: item.config.title.clone(),
        description: item.description.clone(),
        difficulty: item.config.difficulty.clone(),
        time_limit: item.config.time_limit,
        memory_limit: item.config.memory_limit,
        organization_id,
        is_public: item.config.is_public,
        visibility: item.config.visibility.clone(),
        tags: item.config.tags.clone(),
        source_url: item.config.source_url.clone(),
        author_note: item.config.author_note.clone(),
    }
}

/// Convert parsed TestCaseFiles into a BatchImportTestCasesRequest.
pub fn convert_to_test_cases(item: &ProblemImportItem) -> BatchImportTestCasesRequest {
    BatchImportTestCasesRequest {
        test_cases: item
            .test_case_files
            .iter()
            .enumerate()
            .map(|(i, tcf)| CreateTestCaseRequest {
                input: String::from_utf8_lossy(&tcf.input).to_string(),
                expected_output: String::from_utf8_lossy(&tcf.output).to_string(),
                is_hidden: tcf.config.is_hidden,
                score: tcf.config.score,
                order: tcf.config.order.or(Some(i as i32)),
            })
            .collect(),
    }
}

/// Helper: create an error ProblemImportItem.
fn make_error_item(slug: &str, reason: &str) -> ProblemImportItem {
    ProblemImportItem {
        slug: slug.to_string(),
        config: empty_config(slug),
        description: String::new(),
        test_case_files: vec![],
        status: ImportItemStatus::Error,
        warning: Some(reason.to_string()),
    }
}

/// Helper: create an empty ProblemConfig placeholder for error items.
fn empty_config(slug: &str) -> ProblemConfig {
    ProblemConfig {
        title: slug.to_string(),
        difficulty: "easy".to_string(),
        time_limit: 5000,
        memory_limit: 256,
        is_public: false,
        visibility: "private".to_string(),
        tags: vec![],
        source_url: None,
        author_note: None,
        test_cases: vec![],
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ProblemTestCaseConfig;
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;

    /// Helper to build a ZIP in memory with the given entries.
    fn build_zip(entries: &[(&str, &[u8])]) -> Vec<u8> {
        let buf = std::io::Cursor::new(Vec::new());
        let mut writer = ZipWriter::new(buf);
        let options =
            SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

        for (path, data) in entries {
            writer.start_file(*path, options).unwrap();
            writer.write_all(data).unwrap();
        }

        writer.finish().unwrap().into_inner()
    }

    fn make_config_json(title: &str, difficulty: &str, test_cases: &[(&str, &str)]) -> String {
        let tc_json: Vec<String> = test_cases
            .iter()
            .enumerate()
            .map(|(i, _)| {
                format!(
                    r#"{{"input_file": "testcases/{}.in", "output_file": "testcases/{}.out", "is_hidden": false, "score": 50, "order": {}}}"#,
                    i + 1,
                    i + 1,
                    i + 1
                )
            })
            .collect();

        format!(
            r#"{{"title": "{}", "difficulty": "{}", "test_cases": [{}]}}"#,
            title,
            difficulty,
            tc_json.join(", ")
        )
    }

    #[test]
    fn parses_valid_zip_with_single_problem() {
        let config = make_config_json("Two Sum", "easy", &[("2 7", "0 1"), ("3 6", "1 2")]);
        let zip_bytes = build_zip(&[
            ("problems/two-sum/config.json", config.as_bytes()),
            (
                "problems/two-sum/problem.md",
                b"Find two numbers that add up to target.",
            ),
            ("problems/two-sum/testcases/1.in", b"2 7\n"),
            ("problems/two-sum/testcases/1.out", b"0 1\n"),
            ("problems/two-sum/testcases/2.in", b"3 6\n"),
            ("problems/two-sum/testcases/2.out", b"1 2\n"),
        ]);

        let skip = HashSet::new();
        let items = parse_problem_zip(&zip_bytes, &skip).unwrap();

        assert_eq!(items.len(), 1);
        let item = &items[0];
        assert_eq!(item.slug, "two-sum");
        assert_eq!(item.config.title, "Two Sum");
        assert_eq!(item.config.difficulty, "easy");
        assert_eq!(item.description, "Find two numbers that add up to target.");
        assert_eq!(item.test_case_files.len(), 2);
        assert_eq!(item.status, ImportItemStatus::Valid);
        assert!(item.warning.is_none());
    }

    #[test]
    fn parses_valid_zip_with_multiple_problems() {
        let config1 = make_config_json("Two Sum", "easy", &[("a", "b")]);
        let config2 = make_config_json("Add Two Numbers", "medium", &[]);

        let zip_bytes = build_zip(&[
            ("problems/two-sum/config.json", config1.as_bytes()),
            ("problems/two-sum/problem.md", b"Problem 1"),
            ("problems/two-sum/testcases/1.in", b"a\n"),
            ("problems/two-sum/testcases/1.out", b"b\n"),
            ("problems/add-two/config.json", config2.as_bytes()),
            ("problems/add-two/problem.md", b"Problem 2"),
        ]);

        let skip = HashSet::new();
        let items = parse_problem_zip(&zip_bytes, &skip).unwrap();

        assert_eq!(items.len(), 2);

        let two_sum = items
            .iter()
            .find(|i| i.slug == "two-sum")
            .expect("two-sum item");
        assert_eq!(two_sum.status, ImportItemStatus::Valid);
        assert_eq!(two_sum.config.title, "Two Sum");

        let add_two = items
            .iter()
            .find(|i| i.slug == "add-two")
            .expect("add-two item");
        assert_eq!(add_two.status, ImportItemStatus::Valid);
        assert_eq!(add_two.config.title, "Add Two Numbers");
    }

    #[test]
    fn rejects_zip_with_path_traversal() {
        let zip_bytes = build_zip(&[
            ("../../etc/passwd", b"root:x:0:0\n"),
            (
                "problems/two-sum/config.json",
                make_config_json("T", "easy", &[]).as_bytes(),
            ),
            ("problems/two-sum/problem.md", b"desc"),
        ]);

        let skip = HashSet::new();
        let result = parse_problem_zip(&zip_bytes, &skip);
        assert!(result.is_err());
    }

    #[test]
    fn marks_duplicate_title() {
        let config = make_config_json("Two Sum", "easy", &[]);
        let zip_bytes = build_zip(&[
            ("problems/two-sum/config.json", config.as_bytes()),
            ("problems/two-sum/problem.md", b"description"),
        ]);

        let mut skip = HashSet::new();
        skip.insert("Two Sum".to_string());

        let items = parse_problem_zip(&zip_bytes, &skip).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].status, ImportItemStatus::Duplicate);
        assert!(items[0].warning.is_some());
        assert!(items[0]
            .warning
            .as_ref()
            .unwrap()
            .contains("already exists"));
    }

    #[test]
    fn marks_error_for_invalid_difficulty() {
        let config = r#"{"title": "Test", "difficulty": "insane", "test_cases": []}"#;
        let zip_bytes = build_zip(&[
            ("problems/test/config.json", config.as_bytes()),
            ("problems/test/problem.md", b"description"),
        ]);

        let skip = HashSet::new();
        let items = parse_problem_zip(&zip_bytes, &skip).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].status, ImportItemStatus::Error);
        assert!(items[0]
            .warning
            .as_ref()
            .unwrap()
            .contains("Invalid difficulty"));
    }

    #[test]
    fn marks_error_for_invalid_config_json() {
        let zip_bytes = build_zip(&[
            ("problems/test/config.json", b"not valid json{{"),
            ("problems/test/problem.md", b"description"),
        ]);

        let skip = HashSet::new();
        let items = parse_problem_zip(&zip_bytes, &skip).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].status, ImportItemStatus::Error);
    }

    #[test]
    fn marks_error_for_missing_problem_md() {
        let config = make_config_json("Test", "easy", &[]);
        let zip_bytes = build_zip(&[("problems/test/config.json", config.as_bytes())]);

        let skip = HashSet::new();
        let items = parse_problem_zip(&zip_bytes, &skip).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].status, ImportItemStatus::Error);
        assert!(items[0]
            .warning
            .as_ref()
            .unwrap()
            .contains("Missing problem.md"));
    }

    #[test]
    fn marks_error_for_missing_test_case_file() {
        let config = make_config_json("Test", "easy", &[("a", "b")]);
        let zip_bytes = build_zip(&[
            ("problems/test/config.json", config.as_bytes()),
            ("problems/test/problem.md", b"description"),
            // Intentionally NOT including testcases/1.in and testcases/1.out
        ]);

        let skip = HashSet::new();
        let items = parse_problem_zip(&zip_bytes, &skip).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].status, ImportItemStatus::Error);
        assert!(items[0]
            .warning
            .as_ref()
            .unwrap()
            .contains("Missing test case file"));
    }

    #[test]
    fn convert_to_create_request_maps_fields() {
        let item = ProblemImportItem {
            slug: "two-sum".to_string(),
            config: ProblemConfig {
                title: "Two Sum".to_string(),
                difficulty: "easy".to_string(),
                time_limit: 3000,
                memory_limit: 128,
                is_public: true,
                visibility: "public".to_string(),
                tags: vec!["array".to_string()],
                source_url: Some("https://example.com".to_string()),
                author_note: Some("note".to_string()),
                test_cases: vec![],
            },
            description: "Find two numbers.".to_string(),
            test_case_files: vec![],
            status: ImportItemStatus::Valid,
            warning: None,
        };

        let req = convert_to_create_request(&item, 42);
        assert_eq!(req.title, "Two Sum");
        assert_eq!(req.description, "Find two numbers.");
        assert_eq!(req.difficulty, "easy");
        assert_eq!(req.time_limit, 3000);
        assert_eq!(req.memory_limit, 128);
        assert_eq!(req.organization_id, 42);
        assert!(req.is_public);
        assert_eq!(req.visibility, "public");
        assert_eq!(req.tags, vec!["array"]);
        assert_eq!(req.source_url, Some("https://example.com".to_string()));
        assert_eq!(req.author_note, Some("note".to_string()));
    }

    #[test]
    fn convert_to_test_cases_maps_bytes() {
        let item = ProblemImportItem {
            slug: "test".to_string(),
            config: ProblemConfig {
                title: "Test".to_string(),
                difficulty: "easy".to_string(),
                time_limit: 5000,
                memory_limit: 256,
                is_public: false,
                visibility: "private".to_string(),
                tags: vec![],
                source_url: None,
                author_note: None,
                test_cases: vec![ProblemTestCaseConfig {
                    input_file: "testcases/1.in".to_string(),
                    output_file: "testcases/1.out".to_string(),
                    is_hidden: Some(true),
                    score: Some(100),
                    order: Some(1),
                }],
            },
            description: "desc".to_string(),
            test_case_files: vec![TestCaseFile {
                input: b"hello\n".to_vec(),
                output: b"world\n".to_vec(),
                config: ProblemTestCaseConfig {
                    input_file: "testcases/1.in".to_string(),
                    output_file: "testcases/1.out".to_string(),
                    is_hidden: Some(true),
                    score: Some(100),
                    order: Some(1),
                },
            }],
            status: ImportItemStatus::Valid,
            warning: None,
        };

        let req = convert_to_test_cases(&item);
        assert_eq!(req.test_cases.len(), 1);
        assert_eq!(req.test_cases[0].input, "hello\n");
        assert_eq!(req.test_cases[0].expected_output, "world\n");
        assert_eq!(req.test_cases[0].is_hidden, Some(true));
        assert_eq!(req.test_cases[0].score, Some(100));
        assert_eq!(req.test_cases[0].order, Some(1));
    }
}
