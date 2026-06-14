use crate::db::{get_db_connection, TestCase};
use crate::queue::{JudgeResult, SubmissionMessage, TestCaseResult};
use anyhow::{Context, Result};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Instant;
use tokio::fs;
use tokio::process::Command;
use tokio::time::{timeout, Duration};
use tracing::{error, info, warn};

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
    let result = process_submission_inner(submission, &work_dir).await;

    // Best-effort cleanup of workdir — failure to remove should not fail the submission.
    if let Err(e) = fs::remove_dir_all(&work_dir).await {
        warn!(
            "Failed to clean up workdir {:?} for submission {}: {}",
            work_dir, submission.submission_id, e
        );
    } else {
        info!(
            "Cleaned up workdir for submission {}",
            submission.submission_id
        );
    }

    // Clean up chroot rootfs directories (sibling dirs named rootfs-*).
    #[cfg(target_os = "linux")]
    {
        if let Some(parent) = work_dir.parent() {
            if let Ok(entries) = fs::read_dir(parent).await {
                use futures::stream::StreamExt;
                let mut entries = Box::pin(entries);
                while let Some(Ok(entry)) = entries.next().await {
                    let name = entry.file_name();
                    if name.to_string_lossy().starts_with("rootfs-") {
                        let _ = fs::remove_dir_all(entry.path()).await;
                    }
                }
            }
        }
    }

    result
}

async fn process_submission_inner(
    submission: &SubmissionMessage,
    work_dir: &Path,
) -> Result<JudgeResult> {
    let source_file = save_source_code(work_dir, submission).await?;
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
            match compile_code(&source_file, &submission.language, work_dir).await {
                Ok(path) => Some(path),
                Err(err) => {
                    error!(
                        "Compilation failed for submission {}: {}",
                        submission.submission_id, err
                    );
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
        let result = run_test_case(
            submission,
            &source_file,
            executable_path.as_deref(),
            test_case,
            work_dir,
        )
        .await?;

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
    let judge_root = PathBuf::from("/tmp/judge");

    // Ensure the judge root exists before tightening its permissions.
    fs::create_dir_all(&judge_root).await?;

    // SECURITY (P17): Lock the judge root to owner-only so sandboxed user code
    // (nobody) cannot enumerate sibling submission directories. Without this,
    // /tmp/judge defaults to 0o755 and any sandboxed process can list every
    // submission_* entry and open other submissions' source files (which are
    // 0o644 so the nobody runner itself can read them). 0o700 = owner rwx only.
    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&judge_root, std::fs::Permissions::from_mode(0o700)).await?;
    }

    // SECURITY (P17): Append an unpredictable nonce to the directory name.
    // All submissions share the nobody uid, so file permissions alone cannot
    // isolate them — DAC cannot distinguish one nobody process from another.
    // Combined with the 0o700 judge root above, an unpredictable name means a
    // sandboxed process can neither list nor guess the path of another
    // submission, blocking trivial cross-submission source disclosure.
    // Note: residual risk remains via /proc (a same-uid process may read a
    // running peer's cwd); full isolation additionally requires per-uid or
    // mount-namespace sandboxing, tracked separately.
    let work_dir = judge_root.join(format!(
        "submission_{}-{}",
        submission_id,
        uuid::Uuid::new_v4().simple()
    ));

    if work_dir.exists() {
        fs::remove_dir_all(&work_dir).await?;
    }

    fs::create_dir_all(&work_dir).await?;

    // SECURITY (C-01): Restrict work_dir permissions so user code (nobody)
    // can access its own submission but not other submissions.
    // 0o711 = owner rwx + group/other execute-only (traverse dir, not list)
    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&work_dir, std::fs::Permissions::from_mode(0o711)).await?;
    }

    Ok(work_dir)
}

async fn save_source_code(work_dir: &Path, submission: &SubmissionMessage) -> Result<PathBuf> {
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
        SELECT id, input, output AS expected_output, is_secret AS is_hidden, points AS score
        FROM test_cases
        WHERE problem_id = $1
        ORDER BY order_index ASC, id ASC
        "#,
    )
    .bind(problem_id)
    .fetch_all(pool)
    .await?;

    Ok(test_cases)
}

async fn compile_code(source_file: &Path, language: &str, work_dir: &Path) -> Result<PathBuf> {
    let output_path = match language {
        "java" => work_dir.join("Main.class"),
        _ => work_dir.join("solution_bin"),
    };

    // C-04: Create cgroup for compilation with resource limits.
    // SECURITY: Hard error on failure — compiling untrusted code without
    // resource limits allows a malicious source to exhaust host resources.
    #[cfg(target_os = "linux")]
    let compile_cgroup = {
        let cg = crate::sandbox::cgroups::CgroupController::new(
            &format!(
                "compile-{}-{}",
                std::process::id(),
                source_file
                    .parent()
                    .and_then(|p| p.file_name())
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
            ),
            &crate::sandbox::SandboxConfig {
                cpu_time_limit_ms: 30_000,             // 30 second compile timeout
                memory_limit_bytes: 512 * 1024 * 1024, // 512MB
                pids_max: 16,
                ..Default::default()
            },
        )
        .context("Compile cgroup initialization failed — refusing to compile without resource limits")?;
        cg.create().with_context(|| {
            "Compile cgroup creation failed — refusing to compile without resource limits"
        })?;
        Some(cg)
    };

    #[cfg(not(target_os = "linux"))]
    let compile_cgroup: Option<crate::sandbox::cgroups::CgroupController> = None;

    let mut command = match language {
        "c" => {
            let mut cmd = Command::new("gcc");
            cmd.arg(source_file).arg("-O2").arg("-o").arg(&output_path);
            cmd
        }
        "cpp" => {
            let mut cmd = Command::new("g++");
            cmd.arg(source_file)
                .arg("-O2")
                .arg("-std=c++17")
                .arg("-o")
                .arg(&output_path);
            cmd
        }
        "rust" => {
            let mut cmd = Command::new("rustc");
            cmd.arg(source_file).arg("-O").arg("-o").arg(&output_path);
            cmd
        }
        "go" => {
            let mut cmd = Command::new("go");
            cmd.arg("build")
                .arg("-o")
                .arg(&output_path)
                .arg(source_file);
            cmd
        }
        "java" => {
            let mut cmd = Command::new("javac");
            cmd.arg(source_file);
            cmd
        }
        _ => anyhow::bail!("Unsupported compiled language: {}", language),
    };

    command.current_dir(work_dir);

    // Apply seccomp and privilege drop to compilation subprocess too (C-04)
    unsafe {
        command.pre_exec(|| {
            // Apply RLIMITs for compilation too (compiler can also exhaust resources).
            crate::sandbox::chroot::apply_rlimits()
                .map_err(|err| std::io::Error::other(err.to_string()))?;
            crate::sandbox::chroot::drop_privileges_to_nobody()
                .map_err(|err| std::io::Error::other(err.to_string()))?;
            crate::sandbox::seccomp::apply_seccomp(0)
                .map_err(|err| std::io::Error::other(err.to_string()))
        });
    }

    let mut child = command.spawn().context("Failed to start compiler")?;

    // Move compiler into cgroup for resource limiting
    if let (Some(ref cg), Some(pid)) = (&compile_cgroup, child.id()) {
        if let Err(e) = cg.add_process(pid as i32) {
            tracing::error!("Failed to add compiler to cgroup: {} — killing process", e);
            unsafe { libc::kill(pid as i32, libc::SIGKILL); }
            let _ = child.wait().await;
            return Err(anyhow::anyhow!(
                "Failed to assign compiler to cgroup — refusing to compile without resource limits: {}",
                e
            ));
        }
    }

    let output = timeout(Duration::from_secs(30), child.wait())
        .await
        .context("Compilation timed out")?
        .context("Failed to wait for compiler")?;

    // Cleanup compile cgroup
    if let Some(cg) = compile_cgroup {
        let _ = cg.destroy();
    }

    if !output.success() {
        anyhow::bail!("Compilation failed");
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
    let output = execute_program(
        submission,
        source_file,
        executable_path,
        &test_case.input,
        work_dir,
    )
    .await?;

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

    // SECURITY: Enforce hard time limit cap to prevent resource exhaustion.
    // Even if a problem is misconfigured with an extreme time_limit, the worker
    // will not wait longer than 30 seconds per submission.
    const MAX_TIME_LIMIT_MS: u64 = 30_000;
    let effective_time_limit = submission.time_limit_ms.min(MAX_TIME_LIMIT_MS).max(1);

    // Create cgroup for resource limiting (Linux only).
    // SECURITY: Cgroup creation failure is a HARD error — we refuse to run
    // untrusted user code without CPU/memory/PID limits. Previously a .ok()
    // downgrade let the submission proceed unsandboxed with only a warning,
    // which silently removed all resource controls.
    #[cfg(target_os = "linux")]
    let cgroup = {
        let cg = crate::sandbox::cgroups::CgroupController::new(
            &format!("judge-{}-{}", std::process::id(), submission.submission_id),
            &crate::sandbox::SandboxConfig {
                cpu_time_limit_ms: effective_time_limit,
                memory_limit_bytes: submission.memory_limit_mb * 1024 * 1024,
                pids_max: 64,
                ..Default::default()
            },
        )
        .context("Cgroup controller initialization failed — refusing to run without resource limits")?;
        cg.create()
            .with_context(|| "Cgroup creation failed — refusing to run without resource limits")?;
        Some(cg)
    };

    #[cfg(not(target_os = "linux"))]
    let cgroup: Option<crate::sandbox::cgroups::CgroupController> = {
        tracing::warn!("Cgroups not available on this platform — running without resource limits (development only)");
        None
    };

    // Prepare chroot rootfs in the parent process (requires root for setup).
    // The child enters the chroot in pre_exec before exec'ing user code.
    #[cfg(target_os = "linux")]
    let chroot_rootfs = {
        match crate::sandbox::chroot::prepare_chroot_rootfs(&work_dir) {
            Ok(rootfs) => Some(rootfs),
            Err(e) => {
                tracing::error!(
                    "Failed to prepare chroot rootfs: {} — refusing to run without filesystem isolation",
                    e
                );
                return Err(e.context("Chroot rootfs preparation failed"));
            }
        }
    };
    #[cfg(not(target_os = "linux"))]
    let _chroot_rootfs: Option<std::path::PathBuf> = None;

    let mut command = build_runtime_command(submission, source_file, executable_path, work_dir)?;
    // Adjust the command to run from the chroot's /work path.
    #[cfg(target_os = "linux")]
    if let Some(ref rootfs) = chroot_rootfs {
        // The executable and source paths must be relative to the chroot root.
        command.current_dir(rootfs.join("work"));
        // Thread the rootfs path to pre_exec via env var (closures can't
        // capture it because Command is consumed by spawn).
        command.env("JUDGE_CHROOT_ROOTFS", rootfs);
    }

    unsafe {
        command.pre_exec(|| {
            // Enter the chroot BEFORE dropping privileges (chroot requires root).
            #[cfg(target_os = "linux")]
            {
                // rootfs path is passed via an environment variable because
                // pre_exec closures capture by move but Command is already
                // consumed — we use an env var to thread the path through.
                if let Ok(rootfs) = std::env::var("JUDGE_CHROOT_ROOTFS") {
                    crate::sandbox::chroot::enter_chroot(std::path::Path::new(&rootfs))
                        .map_err(|err| std::io::Error::other(err.to_string()))?;
                }
            }

            // Apply hard RLIMITs BEFORE dropping privileges.
            crate::sandbox::chroot::apply_rlimits()
                .map_err(|err| std::io::Error::other(err.to_string()))?;

            // Drop privileges to nobody.
            crate::sandbox::chroot::drop_privileges_to_nobody()
                .map_err(|err| std::io::Error::other(err.to_string()))?;

            // Apply deny-by-default seccomp filter.
            crate::sandbox::seccomp::apply_seccomp(0)
                .map_err(|err| std::io::Error::other(err.to_string()))
        });
    }
    command
        .stdin(Stdio::from(stdin))
        .stdout(Stdio::from(stdout))
        .stderr(Stdio::from(stderr));

    let started = Instant::now();
    let mut child = command
        .spawn()
        .context("Failed to start submission process")?;

    if let (Some(ref cg), Some(pid)) = (&cgroup, child.id()) {
        // SECURITY: add_process failure must NOT be silently ignored.
        // Previously `let _ =` swallowed the error, allowing the submission
        // to run with no CPU/memory/PID limits. If this fails we kill the
        // child immediately and return an error.
        if let Err(e) = cg.add_process(pid as i32) {
            tracing::error!(
                "Failed to add submission {} to cgroup: {} — killing process",
                submission.submission_id,
                e
            );
            // Best-effort kill the orphaned child to avoid running unsandboxed.
            unsafe { libc::kill(pid as i32, libc::SIGKILL); }
            let _ = child.wait().await;
            return Err(anyhow::anyhow!(
                "Failed to assign submission to cgroup — refusing to run without resource limits: {}",
                e
            ));
        }
    }

    let wait_result = timeout(
        Duration::from_millis(effective_time_limit),
        child.wait(),
    )
    .await;

    let runtime_ms = started.elapsed().as_millis() as i32;

    // Get memory usage from cgroup memory.peak — this is the per-submission accurate reading.
    // Do NOT fall back to getrusage(RUSAGE_CHILDREN) — it is cumulative across ALL children
    // since process start, so concurrent submissions would read each other's memory usage.
    let cgroup_memory_kb = cgroup
        .as_ref()
        .and_then(|cg| cg.get_max_memory_usage().ok())
        .map(|bytes| (bytes / 1024) as i32)
        .unwrap_or(0);

    // When cgroup returns 0 (e.g. kernel < 4.5 missing memory.peak), fall back to the
    // configured memory limit as a conservative estimate rather than cumulative getrusage.
    let memory_kb = if cgroup_memory_kb > 0 {
        cgroup_memory_kb
    } else {
        tracing::debug!(
            "cgroup memory.peak returned 0 for submission {}, falling back to memory limit estimate",
            submission.submission_id
        );
        (submission.memory_limit_mb * 1024) as i32
    };

    // Always clean up the cgroup.
    if let Some(cg) = cgroup {
        let _ = cg.destroy();
    }

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
    output
        .lines()
        .map(str::trim_end)
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}
