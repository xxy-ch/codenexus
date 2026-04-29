/// Filesystem test case reader for UOJ problems.
///
/// Per D-10-1, UOJ stores test cases on the filesystem in the structure:
/// ```text
/// {test_case_dir}/{problem_id}/in/1.txt
/// {test_case_dir}/{problem_id}/out/1.txt
/// ```
///
/// Starts at N=1, increments until either input or output file is missing.
/// Returns an empty Vec (no error) if the problem directory doesn't exist.
use std::path::Path;

use anyhow::Result;

/// A single test case read from the filesystem.
pub struct TestCase {
    pub input: String,
    pub output: String,
    pub order_index: i32,
}

/// Read test cases from the filesystem for a given problem.
///
/// Returns an empty Vec (with a warning log) if the problem directory
/// doesn't exist -- problems without test case files are not an error.
pub fn read_test_cases(test_case_dir: &Path, problem_id: i64) -> Result<Vec<TestCase>> {
    let problem_dir = test_case_dir.join(problem_id.to_string());
    if !problem_dir.exists() {
        tracing::warn!("No test case directory for problem {}", problem_id);
        return Ok(Vec::new());
    }

    let in_dir = problem_dir.join("in");
    let out_dir = problem_dir.join("out");
    let mut cases = Vec::new();
    let mut idx = 1;

    loop {
        let input_path = in_dir.join(format!("{}.txt", idx));
        let output_path = out_dir.join(format!("{}.txt", idx));

        if !input_path.exists() || !output_path.exists() {
            break;
        }

        let input = std::fs::read_to_string(&input_path)?;
        let output = std::fs::read_to_string(&output_path)?;

        cases.push(TestCase {
            input,
            output,
            order_index: idx,
        });

        idx += 1;
    }

    tracing::info!("Read {} test cases for problem {}", cases.len(), problem_id);

    Ok(cases)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// Helper to create a temp directory structure for test cases.
    struct TempTestCaseDir {
        base: tempfile::TempDir,
    }

    impl TempTestCaseDir {
        fn new() -> Self {
            Self {
                base: tempfile::tempdir().unwrap(),
            }
        }

        fn path(&self) -> &Path {
            self.base.path()
        }

        /// Create test case files for a given problem: in/N.txt and out/N.txt.
        fn add_test_case(&self, problem_id: i64, index: i32, input: &str, output: &str) {
            let problem_dir = self.path().join(problem_id.to_string());
            let in_dir = problem_dir.join("in");
            let out_dir = problem_dir.join("out");
            fs::create_dir_all(&in_dir).unwrap();
            fs::create_dir_all(&out_dir).unwrap();
            fs::write(in_dir.join(format!("{}.txt", index)), input).unwrap();
            fs::write(out_dir.join(format!("{}.txt", index)), output).unwrap();
        }
    }

    #[test]
    fn returns_3_test_cases_when_files_exist() {
        let dir = TempTestCaseDir::new();
        dir.add_test_case(42, 1, "input 1", "output 1");
        dir.add_test_case(42, 2, "input 2", "output 2");
        dir.add_test_case(42, 3, "input 3", "output 3");

        let cases = read_test_cases(dir.path(), 42).unwrap();
        assert_eq!(cases.len(), 3);

        assert_eq!(cases[0].input, "input 1");
        assert_eq!(cases[0].output, "output 1");
        assert_eq!(cases[0].order_index, 1);

        assert_eq!(cases[1].input, "input 2");
        assert_eq!(cases[1].output, "output 2");
        assert_eq!(cases[1].order_index, 2);

        assert_eq!(cases[2].input, "input 3");
        assert_eq!(cases[2].output, "output 3");
        assert_eq!(cases[2].order_index, 3);
    }

    #[test]
    fn returns_empty_vec_when_directory_does_not_exist() {
        let dir = TempTestCaseDir::new();
        // No test cases added for problem 999

        let cases = read_test_cases(dir.path(), 999).unwrap();
        assert!(cases.is_empty());
    }

    #[test]
    fn stops_at_first_missing_pair() {
        let dir = TempTestCaseDir::new();
        dir.add_test_case(7, 1, "in1", "out1");
        // N=2 is missing
        dir.add_test_case(7, 3, "in3", "out3"); // this should NOT be read

        let cases = read_test_cases(dir.path(), 7).unwrap();
        assert_eq!(cases.len(), 1);
        assert_eq!(cases[0].order_index, 1);
        assert_eq!(cases[0].input, "in1");
    }

    #[test]
    fn missing_output_file_stops_reading() {
        let dir = TempTestCaseDir::new();
        let problem_dir = dir.path().join("10");
        let in_dir = problem_dir.join("in");
        let out_dir = problem_dir.join("out");
        fs::create_dir_all(&in_dir).unwrap();
        fs::create_dir_all(&out_dir).unwrap();

        // Only input exists, no output
        fs::write(in_dir.join("1.txt"), "input only").unwrap();

        let cases = read_test_cases(dir.path(), 10).unwrap();
        assert!(cases.is_empty());
    }

    #[test]
    fn test_case_content_with_multiline_input() {
        let dir = TempTestCaseDir::new();
        dir.add_test_case(5, 1, "3\n1 2 3\n", "6\n");

        let cases = read_test_cases(dir.path(), 5).unwrap();
        assert_eq!(cases.len(), 1);
        assert_eq!(cases[0].input, "3\n1 2 3\n");
        assert_eq!(cases[0].output, "6\n");
    }
}
