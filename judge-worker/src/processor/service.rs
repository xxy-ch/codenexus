use crate::db::{get_db_connection, TestCase};
use crate::queue::{JudgeResult, SubmissionMessage, TestCaseResult};
use anyhow::{Context, Result};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Instant;
use tokio::fs;
use tokio::process::Command;
use tokio::time::{timeout, Duration};
use tracing::{error, info};

const DEFAULT_MEMORY_KB: i32 = 262_144;

struct ExecutionOutput {
    status: String,
    stdout: String,
    stderr: String,
    runtime_ms: i32,
    memory_kb: i32,
}

pub async fn process_submission(submission: &SubmissionMessage) -> Result<JudgeResult> {
    info!("Processing submission {}", submission.submission_id);

    let work_dir = create_work_dir(submission.submission_id).await?;
    let source_file = save_source_code(&work_dir, submission).await?;
    let test_cases = fetch_test_cases(submission.problem_id).await?;

    if test_cases.is_empty() {
        return Ok(JudgeResult {
            submission_id: submission.submission_id,
            status: "runtime_error".to_string(),
            score: Some(0),
            runtime_ms: None,
            memory_kb: Some(DEFAULT_MEMORY_KB),
            test_case_results: vec![],
        });
    }

    let executable_path = match submission.language.as_str() {
        "c" | "cpp" | "rust" | "go" | "java" => {
            match compile_code(&source_file, &submission.language, &work_dir).await {
                Ok(path) => Some(path),
                Err(err) => {
                    error!("Compilation failed for submission {}: {}", submission.submission_id, err);
                    return Ok(JudgeResult {
                        submission_id: submission.submission_id,
                        status: "compilation_error".to_string(),
                        score: Some(0),
                        runtime_ms: None,
                        memory_kb: Some(DEFAULT_MEMORY_KB),
                        test_case_results: vec![],
                    });
                }
            }
        }
        _ => None,
    };

    let mut final_status = "accepted".to_string();
    let mut passed_score: i32 = 0;
    let mut max_runtime_ms = 0;
    let mut max_memory_kb = 0;
    let mut test_case_results = Vec::with_capacity(test_cases.len());

    for test_case in &test_cases {
        let result = run_test_case(submission, &source_file, executable_path.as_deref(), test_case, &work_dir).await?;

        if result.status != "accepted" && final_status == "accepted" {
            final_status = result.status.clone();
        }

        if result.status == "accepted" {
            passed_score += test_case.score;
        }

        max_runtime_ms = max_runtime_ms.max(result.runtime_ms.unwrap_or_default());
        max_memory_kb = max_memory_kb.max(result.memory_kb.unwrap_or(DEFAULT_MEMORY_KB));
        test_case_results.push(result);
    }

    info!(
        "Submission {} completed with status {} and score {}",
        submission.submission_id, final_status, passed_score
    );

    Ok(JudgeResult {
        submission_id: submission.submission_id,
        status: final_status,
        score: Some(passed_score),
        runtime_ms: Some(max_runtime_ms),
        memory_kb: Some(max_memory_kb.max(DEFAULT_MEMORY_KB)),
        test_case_results,
    })
}

async fn create_work_dir(submission_id: i64) -> Result<PathBuf> {
    let work_dir = PathBuf::from("/tmp/judge").join(format!("submission_{}", submission_id));

    if work_dir.exists() {
        fs::remove_dir_all(&work_dir).await?;
    }

    fs::create_dir_all(&work_dir).await?;
    Ok(work_dir)
}

async fn save_source_code(work_dir: &PathBuf, submission: &SubmissionMessage) -> Result<PathBuf> {
    let filename = match submission.language.as_str() {
        "python3" => "solution.py",
        "javascript" => "solution.js",
        "c" => "solution.c",
        "cpp" => "solution.cpp",
        "java" => "Main.java",
        "rust" => "solution.rs",
        "go" => "main.go",
        _ => "solution.txt",
    };

    let file_path = work_dir.join(filename);
    fs::write(&file_path, &submission.source_code).await?;
    Ok(file_path)
}

pub async fn fetch_test_cases(problem_id: i64) -> Result<Vec<TestCase>> {
    let pool = get_db_connection().await?;

    let test_cases = sqlx::query_as::<_, TestCase>(
        r#"
        SELECT id, input, expected_output, is_hidden, score
        FROM problems_test_cases
        WHERE problem_id = $1
        ORDER BY id ASC
        "#,
    )
    .bind(problem_id)
    .fetch_all(&pool)
    .await?;

    Ok(test_cases)
}

async fn compile_code(source_file: &Path, language: &str, work_dir: &Path) -> Result<PathBuf> {
    let output_path = match language {
        "java" => work_dir.join("Main.class"),
        _ => work_dir.join("solution_bin"),
    };

    let output = match language {
        "c" => Command::new("gcc")
            .arg(source_file)
            .arg("-O2")
            .arg("-o")
            .arg(&output_path)
            .current_dir(work_dir)
            .output()
            .await?,
        "cpp" => Command::new("g++")
            .arg(source_file)
            .arg("-O2")
            .arg("-std=c++17")
            .arg("-o")
            .arg(&output_path)
            .current_dir(work_dir)
            .output()
            .await?,
        "rust" => Command::new("rustc")
            .arg(source_file)
            .arg("-O")
            .arg("-o")
            .arg(&output_path)
            .current_dir(work_dir)
            .output()
            .await?,
        "go" => Command::new("go")
            .arg("build")
            .arg("-o")
            .arg(&output_path)
            .arg(source_file)
            .current_dir(work_dir)
            .output()
            .await?,
        "java" => Command::new("javac")
            .arg(source_file)
            .current_dir(work_dir)
            .output()
            .await?,
        _ => anyhow::bail!("Unsupported compiled language: {}", language),
    };

    if !output.status.success() {
        anyhow::bail!(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(output_path)
}

async fn run_test_case(
    submission: &SubmissionMessage,
    source_file: &Path,
    executable_path: Option<&Path>,
    test_case: &TestCase,
    work_dir: &Path,
) -> Result<TestCaseResult> {
    let output = execute_program(submission, source_file, executable_path, &test_case.input, work_dir).await?;

    let status = if output.status != "accepted" {
        output.status.clone()
    } else if normalize_output(&output.stdout) == normalize_output(&test_case.expected_output) {
        "accepted".to_string()
    } else {
        "wrong_answer".to_string()
    };

    let error_message = match status.as_str() {
        "runtime_error" | "compilation_error" => Some(output.stderr.clone()),
        _ if output.stderr.trim().is_empty() => None,
        _ => Some(output.stderr.clone()),
    };

    Ok(TestCaseResult {
        test_case_id: test_case.id,
        status,
        expected_output: Some(test_case.expected_output.clone()),
        actual_output: Some(output.stdout),
        error_message,
        runtime_ms: Some(output.runtime_ms),
        memory_kb: Some(output.memory_kb),
    })
}

async fn execute_program(
    submission: &SubmissionMessage,
    source_file: &Path,
    executable_path: Option<&Path>,
    input: &str,
    work_dir: &Path,
) -> Result<ExecutionOutput> {
    // Each submission gets its own unique work_dir (created via create_work_dir using
    // submission_id), so these I/O filenames are isolated per-submission. This is safe
    // for concurrent processing — no two submissions will clobber each other's files.
    let input_path = work_dir.join("stdin.txt");
    let stdout_path = work_dir.join("stdout.txt");
    let stderr_path = work_dir.join("stderr.txt");

    fs::write(&input_path, input).await?;

    let stdin = std::fs::File::open(&input_path)?;
    let stdout = std::fs::File::create(&stdout_path)?;
    let stderr = std::fs::File::create(&stderr_path)?;

    let mut command = build_runtime_command(submission, source_file, executable_path, work_dir)?;
    unsafe {
        command.pre_exec(|| {
            crate::sandbox::seccomp::apply_seccomp(0)
                .map_err(|err| std::io::Error::other(err.to_string()))
        });
    }
    command
        .stdin(Stdio::from(stdin))
        .stdout(Stdio::from(stdout))
        .stderr(Stdio::from(stderr));

    let started = Instant::now();
    let mut child = command.spawn().context("Failed to start submission process")?;

    let wait_result = timeout(
        Duration::from_millis(submission.time_limit_ms.max(1)),
        child.wait(),
    )
    .await;

    let runtime_ms = started.elapsed().as_millis() as i32;

    // Measure actual peak memory usage via getrusage(RUSAGE_CHILDREN).
    // This returns the max resident set size (in KB on Linux) of any child process.
    let memory_kb = {
        let mut usage: libc::rusage = unsafe { std::mem::zeroed() };
        let ret = unsafe { libc::getrusage(libc::RUSAGE_CHILDREN, &mut usage) };
        if ret == 0 {
            // On Linux ru_maxrss is in KB; on macOS it is in bytes.
            #[cfg(target_os = "linux")]
            {
                usage.ru_maxrss as i32
            }
            #[cfg(not(target_os = "linux"))]
            {
                (usage.ru_maxrss / 1024) as i32
            }
        } else {
            // Fallback to the configured memory limit if getrusage fails
            DEFAULT_MEMORY_KB.min((submission.memory_limit_mb.saturating_mul(1024)) as i32)
        }
    }
    .max(0);

    let process_status = match wait_result {
        Ok(status) => status.context("Failed to wait for submission process")?,
        Err(_) => {
            let _ = child.kill().await;
            let _ = child.wait().await;
            return Ok(ExecutionOutput {
                status: "time_limit_exceeded".to_string(),
                stdout: fs::read_to_string(&stdout_path).await.unwrap_or_default(),
                stderr: fs::read_to_string(&stderr_path).await.unwrap_or_default(),
                runtime_ms,
                memory_kb,
            });
        }
    };

    let stdout = fs::read_to_string(&stdout_path).await.unwrap_or_default();
    let stderr = fs::read_to_string(&stderr_path).await.unwrap_or_default();

    let status = if process_status.success() {
        "accepted"
    } else {
        "runtime_error"
    };

    Ok(ExecutionOutput {
        status: status.to_string(),
        stdout,
        stderr,
        runtime_ms,
        memory_kb,
    })
}

fn build_runtime_command(
    submission: &SubmissionMessage,
    source_file: &Path,
    executable_path: Option<&Path>,
    work_dir: &Path,
) -> Result<Command> {
    let mut command = match submission.language.as_str() {
        "python3" => {
            let mut command = Command::new("python3");
            command.arg(source_file);
            command
        }
        "javascript" => {
            let mut command = Command::new("node");
            command.arg(source_file);
            command
        }
        "java" => {
            let mut command = Command::new("java");
            command.arg("-cp").arg(work_dir).arg("Main");
            command
        }
        "c" | "cpp" | "rust" | "go" => {
            let executable = executable_path.context("Missing executable path")?;
            Command::new(executable)
        }
        other => anyhow::bail!("Unsupported language: {}", other),
    };

    command.current_dir(work_dir);
    Ok(command)
}

fn normalize_output(output: &str) -> String {
    output.lines().map(str::trim_end).collect::<Vec<_>>().join("\n").trim().to_string()
}
