use anyhow::Result;
use crate::db::{get_db_connection, TestCase};
use crate::queue::{SubmissionMessage, JudgeResult, TestCaseResult};
use std::process::Command;
use std::path::PathBuf;
use std::time::Duration;
use tokio::fs;
use tokio::time::timeout;
use tracing::{error, info, warn};

/// Get memory usage in kilobytes for a process ID
fn get_process_memory_kb(pid: u32) -> Option<i32> {
    let status_path = format!("/proc/{}/status", pid);

    if let Ok(content) = std::fs::read_to_string(&status_path) {
        for line in content.lines() {
            if line.starts_with("VmRSS:") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    if let Ok(kb) = parts[1].parse::<i32>() {
                        return Some(kb);
                    }
                }
            }
        }
    }

    None
}

/// Check if a process still exists
fn process_exists(pid: u32) -> bool {
    let pid_path = format!("/proc/{}", pid);
    std::path::Path::new(&pid_path).exists()
}

/// Process a submission and return judging result
///
/// Steps:
/// 1. Save source code to file
/// 2. Compile code (if needed)
/// 3. Execute in sandbox with test cases
/// 4. Compare outputs
/// 5. Return results
pub async fn process_submission(submission: &SubmissionMessage) -> Result<JudgeResult> {
    info!("Processing submission {}", submission.submission_id);

    let work_dir = create_work_dir(submission.submission_id).await?;
    let source_file = save_source_code(&work_dir, submission).await?;

    let test_cases = fetch_test_cases(submission.problem_id).await?;

    let mut final_status = "AC";
    let mut final_score = 100;
    let mut max_runtime_ms = 0i32;
    let mut max_memory_kb = 0i32;

    let mut test_case_results = Vec::new();

    if matches!(submission.language.as_str(), "c" | "cpp" | "rust" | "go" | "java") {
        match compile_code(&source_file, &submission.language, &work_dir).await {
            Ok(_) => {}
            Err(err) => {
                error!("Compilation failed: {}", err);
                return Ok(JudgeResult {
                    submission_id: submission.submission_id,
                    status: "CE".to_string(),
                    score: Some(0),
                    runtime_ms: None,
                    memory_kb: Some(262144),
                    test_case_results: vec![],
                });
            }
        }
    }

    let executable_path = if matches!(
        submission.language.as_str(),
        "c" | "cpp" | "rust" | "go" | "java"
    ) {
        Some(&source_file.with_extension(""))
    } else {
        None
    };

    for test_case in &test_cases {
        match run_test_case(submission, &source_file, executable_path, test_case, &work_dir).await {
            Ok(result) => {
                if result.status != "AC" && final_status == "AC" {
                    final_status = &result.status;
                }

                let score = if result.status == "AC" {
                    test_case.score
                } else {
                    0
                };

                final_score = final_score.saturating_sub(score);

                if let Some(runtime) = result.runtime_ms {
                    max_runtime_ms = max_runtime_ms.max(runtime);
                }

                if let Some(memory) = result.memory_kb {
                    max_memory_kb = max_memory_kb.max(memory);
                }

                test_case_results.push(result);
            }
            Err(err) => {
                error!("Error running test case {}: {}", test_case.id, err);
                test_case_results.push(TestCaseResult {
                    test_case_id: test_case.id,
                    status: "error".to_string(),
                    expected_output: Some(test_case.expected_output.clone()),
                    actual_output: None,
                    error_message: Some(err.to_string()),
                    runtime_ms: None,
                    memory_kb: Some(262144),
                });
                final_status = "error";
            }
        }
    }

    info!(
        "Submission {} completed with status: {} (score: {})",
        submission.submission_id, final_status, final_score
    );

    Ok(JudgeResult {
        submission_id: submission.submission_id,
        status: final_status.to_string(),
        score: Some(final_score),
        runtime_ms: Some(max_runtime_ms),
        memory_kb: Some(max_memory_kb),
        test_case_results,
    })
}

/// Create working directory for submission
async fn create_work_dir(submission_id: i64) -> Result<PathBuf> {
    let work_dir = PathBuf::from("/tmp/judge").join(format!("submission_{}", submission_id));

    if work_dir.exists() {
        fs::remove_dir_all(&work_dir).await?;
    }

    fs::create_dir_all(&work_dir).await?;

    setup_sandbox(&work_dir).await?;

    Ok(work_dir)
}

/// Setup sandbox environment
async fn setup_sandbox(work_dir: &PathBuf) -> Result<()> {
    fs::create_dir_all(work_dir.join("bin")).await?;
    fs::create_dir_all(work_dir.join("lib")).await?;
    fs::create_dir_all(work_dir.join("tmp")).await?;

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

pub async fn fetch_test_cases(problem_id: i64) -> Result<Vec<TestCase>> {
    let pool = get_db_connection().await?;

    let test_cases = sqlx::query_as!(
        TestCase,
        r#"
        SELECT id, input, expected_output, is_hidden, score
        FROM problems_test_cases
        WHERE problem_id = $1
        ORDER BY order ASC, id ASC
        "#
    )
    .bind(problem_id)
    .fetch_all(&pool)
    .await?;

    Ok(test_cases)
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
                .arg(source_file.with_extension(""))
                .current_dir(work_dir)
                .output()
                .await?
        }
        "cpp" => {
            Command::new("g++")
                .arg(source_file)
                .arg("-o")
                .arg(source_file.with_extension(""))
                .arg("-std=c++17")
                .arg("-O2")
                .current_dir(work_dir)
                .output()
                .await?
        }
        "rust" => {
            Command::new("rustc")
                .arg(source_file)
                .arg("-o")
                .arg(source_file.with_extension(""))
                .arg("--edition")
                .arg("2021")
                .current_dir(work_dir)
                .output()
                .await?
        }
        "go" => {
            Command::new("go")
                .arg("build")
                .arg("-o")
                .arg(source_file.with_extension(""))
                .arg(source_file)
                .current_dir(work_dir)
                .output()
                .await?
        }
        _ => {
            anyhow::bail!("Unsupported language for compilation: {}", language);
        }
    };

    if !output.status.success() {
        anyhow::bail!(
            "Compilation failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    Ok(source_file.with_extension(""))
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
            let mut cmd = Command::new("python3");
            cmd.arg(source_file)
                .current_dir(work_dir)
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped());

            let mut child = cmd.spawn()?;

            // Write input to stdin
            use tokio::io::AsyncWriteExt;
            let input_bytes = test_case.input.as_bytes();
            child.stdin.as_mut().unwrap().write_all(input_bytes).await?;

            // Wait for process completion with timeout
            let _ = timeout(Duration::from_millis(submission.time_limit_ms), child.wait_with_output()).await;
            child.kill().await?;

            Ok::<_, anyhow::Error>(tokio::process::Command::new("cat").output().await?)
        }
        _ if executable_path.is_some() => {
            let mut cmd = Command::new(executable_path.unwrap());
            cmd.current_dir(work_dir)
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped());

            let mut child = cmd.spawn()?;

            // Write input to stdin
            use tokio::io::AsyncWriteExt;
            let input_bytes = test_case.input.as_bytes();
            child.stdin.as_mut().unwrap().write_all(input_bytes).await?;

            // Wait for process completion with timeout
            let _ = timeout(Duration::from_millis(submission.time_limit_ms), child.wait_with_output()).await;
            child.kill().await?;

            Ok::<_, anyhow::Error>(tokio::process::Command::new("cat").output().await?)
        }
        _ => {
            return Ok(TestCaseResult {
                test_case_id: test_case.id,
                status: "error".to_string(),
                expected_output: Some(test_case.expected_output.clone()),
                actual_output: None,
                error_message: Some("Unsupported language".to_string()),
                runtime_ms: None,
                memory_kb: Some(262144),
            });
        }
    };

    let runtime_ms = start.elapsed().as_millis() as i32;

    let status = if runtime_ms > submission.time_limit_ms {
        "TLE"
    } else if output.stdout.trim() == test_case.expected_output.trim() {
        "AC"
    } else {
        "WA"
    };

    Ok(TestCaseResult {
        test_case_id: test_case.id,
        status: status.to_string(),
        expected_output: Some(test_case.expected_output.clone()),
        actual_output: Some(output.stdout),
        error_message: None,
        runtime_ms: Some(runtime_ms),
        memory_kb: Some(262144),
    })
}

#[tokio::test]
async fn test_process_submission() {
    let submission = SubmissionMessage {
        submission_id: 1,
        user_id: uuid::Uuid::new_v4(),
        problem_id: 1,
        language: "python3".to_string(),
        source_code: "print('Hello')".to_string(),
        time_limit_ms: 1000,
        memory_limit_kb: 128000,
    };

    let result = process_submission(&submission).await;
    let (child, memory_kb) = match output {
        Ok(child) => (child, 262144),
        Err(_) => return Err("Process spawn failed".into()),
    };
}
