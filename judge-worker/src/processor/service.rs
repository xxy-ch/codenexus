use anyhow::Result;
use crate::queue::{SubmissionMessage, JudgeResult, TestCaseResult};
use std::process::Command;
use std::path::PathBuf;
use std::time::Duration;
use tokio::fs;
use tracing::{error, info, warn};

/// Process a submission and return the judging result
///
/// Steps:
/// 1. Save source code to file
/// 2. Compile the code (if needed)
/// 3. Execute in sandbox with test cases
/// 4. Compare outputs
/// 5. Return results
pub async fn process_submission(submission: &SubmissionMessage) -> Result<JudgeResult> {
    info!(
        "Processing submission {} for problem {} (language: {})",
        submission.submission_id,
        submission.problem_id,
        submission.language
    );

    // Create working directory for this submission
    let work_dir = create_work_dir(submission.submission_id).await?;

    // Save source code
    let source_file = save_source_code(&work_dir, submission).await?;

    // Get test cases for this problem
    let test_cases = fetch_test_cases(submission.problem_id).await?;

    if test_cases.is_empty() {
        warn!("No test cases found for problem {}", submission.problem_id);
        return Ok(JudgeResult {
            submission_id: submission.submission_id,
            status: "error".to_string(),
            score: Some(0),
            runtime_ms: None,
            memory_kb: None,
            test_case_results: vec![],
        });
    }

    // Compile if needed
    let executable_path = match submission.language.as_str() {
        "c" | "cpp" | "rust" | "go" => {
            match compile_code(&source_file, &submission.language, &work_dir).await {
                Ok(path) => Some(path),
                Err(e) => {
                    return Ok(JudgeResult {
                        submission_id: submission.submission_id,
                        status: "compilation_error".to_string(),
                        score: Some(0),
                        runtime_ms: None,
                        memory_kb: None,
                        test_case_results: vec![],
                    });
                }
            }
        }
        _ => None, // Interpreted languages
    };

    let mut all_passed = true;
    let mut total_score = 0;
    let mut max_score = 0;
    let mut test_case_results = Vec::new();
    let mut max_runtime_ms = 0;
    let mut max_memory_kb = 0;

    // Run each test case
    for (index, test_case) in test_cases.iter().enumerate() {
        info!(
            "Running test case {} for submission {}",
            index + 1,
            submission.submission_id
        );

        let result = run_test_case(
            submission,
            &source_file,
            executable_path.as_ref(),
            test_case,
            &work_dir,
        ).await?;

        max_score += test_case.score;

        if result.status == "accepted" {
            total_score += test_case.score;
        } else {
            all_passed = false;
        }

        if let Some(rt) = result.runtime_ms {
            max_runtime_ms = max_runtime_ms.max(rt);
        }
        if let Some(mem) = result.memory_kb {
            max_memory_kb = max_memory_kb.max(mem);
        }

        test_case_results.push(result);
    }

    // Determine overall status
    let final_status = if all_passed {
        "accepted".to_string()
    } else if total_score > 0 {
        "partial".to_string()
    } else {
        "wrong_answer".to_string()
    };

    // Calculate final score as percentage
    let final_score = if max_score > 0 {
        (total_score * 100) / max_score
    } else {
        0
    };

    // Cleanup
    let _ = cleanup_work_dir(&work_dir).await;

    info!(
        "Submission {} completed with status: {} (score: {})",
        submission.submission_id, final_status, final_score
    );

    Ok(JudgeResult {
        submission_id: submission.submission_id,
        status: final_status,
        score: Some(final_score),
        runtime_ms: Some(max_runtime_ms),
        memory_kb: Some(max_memory_kb),
        test_case_results,
    })
}

/// Create working directory for submission
async fn create_work_dir(submission_id: i64) -> Result<PathBuf> {
    let work_dir = PathBuf::from("/tmp/judge").join(format!("submission_{}", submission_id));

    // Clean up if exists
    if work_dir.exists() {
        fs::remove_dir_all(&work_dir).await?;
    }

    fs::create_dir_all(&work_dir).await?;

    // Set up sandbox (chroot)
    setup_sandbox(&work_dir).await?;

    Ok(work_dir)
}

/// Setup sandbox environment
async fn setup_sandbox(work_dir: &PathBuf) -> Result<()> {
    // Create necessary directories in sandbox
    fs::create_dir_all(work_dir.join("bin")).await?;
    fs::create_dir_all(work_dir.join("lib")).await?;
    fs::create_dir_all(work_dir.join("tmp")).await?;

    // Copy necessary system libraries (simplified)
    // In production, use proper chroot and cgroups

    Ok(())
}

/// Save source code to file
async fn save_source_code(
    work_dir: &PathBuf,
    submission: &SubmissionMessage,
) -> Result<PathBuf> {
    let extension = match submission.language.as_str() {
        "python3" => "py",
        "c" => "c",
        "cpp" => "cpp",
        "java" => "java",
        "rust" => "rs",
        "go" => "go",
        "javascript" => "js",
        _ => "txt",
    };

    let filename = format!("solution.{}", extension);
    let file_path = work_dir.join(&filename);

    fs::write(&file_path, &submission.source_code).await?;

    Ok(file_path)
}

/// Fetch test cases for problem
async fn fetch_test_cases(problem_id: i64) -> Result<Vec<TestCase>> {
    // TODO: Fetch from API or database
    // For now, return a dummy test case
    Ok(vec![
        TestCase {
            id: 1,
            input: "2 7 11 15\n9\n".to_string(),
            expected_output: "0 1\n".to_string(),
            is_hidden: false,
            score: 10,
        }
    ])
}

/// Compile code
async fn compile_code(
    source_file: &PathBuf,
    language: &str,
    work_dir: &PathBuf,
) -> Result<PathBuf> {
    use tokio::process::Command;

    let output = match language {
        "c" => {
            Command::new("gcc")
                .arg(source_file)
                .arg("-o")
                .arg(work_dir.join("solution"))
                .output()
                .await?
        }
        "cpp" => {
            Command::new("g++")
                .arg(source_file)
                .arg("-o")
                .arg(work_dir.join("solution"))
                .arg("-std=c++17")
                .arg("-O2")
                .output()
                .await?
        }
        "rust" => {
            Command::new("rustc")
                .arg(source_file)
                .arg("-o")
                .arg(work_dir.join("solution"))
                .arg("-O")
                .output()
                .await?
        }
        "go" => {
            Command::new("go")
                .arg("build")
                .arg("-o")
                .arg(work_dir.join("solution"))
                .arg(source_file)
                .output()
                .await?
        }
        _ => {
            return Err(anyhow::anyhow!("Compilation not supported for language: {}", language));
        }
    };

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("Compilation failed: {}", error));
    }

    Ok(work_dir.join("solution"))
}

/// Run a single test case
async fn run_test_case(
    submission: &SubmissionMessage,
    source_file: &PathBuf,
    executable_path: Option<&PathBuf>,
    test_case: &TestCase,
    work_dir: &PathBuf,
) -> Result<TestCaseResult> {
    use tokio::process::Command;
    use tokio::time::timeout;

    let start = std::time::Instant::now();

    let output = match submission.language.as_str() {
        "python3" => {
            timeout(
                Duration::from_millis(submission.time_limit_ms),
                Command::new("python3")
                    .arg(source_file)
                    .current_dir(work_dir)
                    .stdin(std::process::Stdio::piped())
                    .stdout(std::process::Stdio::piped())
                    .stderr(std::process::Stdio::piped())
                    .output()
            )
            .await
        }
        _ if executable_path.is_some() => {
            timeout(
                Duration::from_millis(submission.time_limit_ms),
                Command::new(executable_path.unwrap())
                    .current_dir(work_dir)
                    .stdin(std::process::Stdio::piped())
                    .stdout(std::process::Stdio::piped())
                    .stderr(std::process::Stdio::piped())
                    .output()
            )
            .await
        }
        _ => {
            return Ok(TestCaseResult {
                test_case_id: test_case.id,
                status: "error".to_string(),
                expected_output: Some(test_case.expected_output.clone()),
                actual_output: None,
                error_message: Some("Unsupported language".to_string()),
                runtime_ms: None,
                memory_kb: None,
            });
        }
    };

    let elapsed = start.elapsed();

    match output {
        Ok(Ok(result)) => {
            let stdout = String::from_utf8_lossy(&result.stdout);
            let stderr = String::from_utf8_lossy(&result.stderr);
            let runtime_ms = elapsed.as_millis() as i32;

            // Check for timeout
            if !result.status.success() {
                return Ok(TestCaseResult {
                    test_case_id: test_case.id,
                    status: "runtime_error".to_string(),
                    expected_output: Some(test_case.expected_output.clone()),
                    actual_output: Some(stdout.to_string()),
                    error_message: Some(stderr.to_string()),
                    runtime_ms: Some(runtime_ms),
                    memory_kb: None,
                });
            }

            // Compare outputs
            let normalized_expected = normalize_output(&test_case.expected_output);
            let normalized_actual = normalize_output(&stdout);

            if normalized_expected == normalized_actual {
                Ok(TestCaseResult {
                    test_case_id: test_case.id,
                    status: "accepted".to_string(),
                    expected_output: Some(test_case.expected_output.clone()),
                    actual_output: Some(stdout.to_string()),
                    error_message: None,
                    runtime_ms: Some(runtime_ms),
                    memory_kb: None, // TODO: Implement memory tracking
                })
            } else {
                Ok(TestCaseResult {
                    test_case_id: test_case.id,
                    status: "wrong_answer".to_string(),
                    expected_output: Some(test_case.expected_output.clone()),
                    actual_output: Some(stdout.to_string()),
                    error_message: Some("Output mismatch".to_string()),
                    runtime_ms: Some(runtime_ms),
                    memory_kb: None,
                })
            }
        }
        Ok(Err(_)) | Err(_) => {
            // Timeout or other error
            Ok(TestCaseResult {
                test_case_id: test_case.id,
                status: "time_limit_exceeded".to_string(),
                expected_output: Some(test_case.expected_output.clone()),
                actual_output: None,
                error_message: Some("Time limit exceeded".to_string()),
                runtime_ms: Some(submission.time_limit_ms as i32),
                memory_kb: None,
            })
        }
    }
}

/// Normalize output for comparison
fn normalize_output(output: &str) -> String {
    output
        .trim()
        .lines()
        .map(|line| line.trim())
        .collect::<Vec<_>>()
        .join("\n")
}

/// Cleanup working directory
async fn cleanup_work_dir(work_dir: &PathBuf) -> Result<()> {
    let _ = fs::remove_dir_all(work_dir).await;
    Ok(())
}

/// Test case data
#[derive(Debug, Clone)]
struct TestCase {
    id: i64,
    input: String,
    expected_output: String,
    is_hidden: bool,
    score: i32,
}
