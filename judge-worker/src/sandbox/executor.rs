use anyhow::{Context, Result};
use nix::mount::mount;
use nix::unistd::{setgid, setuid, Gid};
use std::{path::Path, process::Command, time::Duration};

use crate::sandbox::{cgroups::CgroupController, chroot::ChrootEnvironment, SandboxConfig};

const SANDBOX_USER: Gid = Gid::from_raw(1000);
const SANDBOX_GROUP: Gid = Gid::from_raw(1000);

pub struct ExecutionResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub timed_out: bool,
}

pub struct SandboxExecutor {
    chroot_env: chroot::ChrootEnvironment,
    cgroup: cgroups::CgroupController,
    config: SandboxConfig,
}

impl SandboxExecutor {
    pub fn new(
        chroot_env: chroot::ChrootEnvironment,
        cgroup: cgroups::CgroupController,
        config: SandboxConfig,
    ) -> Self {
        Self {
            chroot_env,
            cgroup,
            config,
        }
    }

    pub fn execute_sandboxed(
        &self,
        program: &str,
        args: &[&str],
        timeout_ms: u64,
    ) -> Result<ExecutionResult> {
        info!(
            "Executing sandboxed: program={}, args={:?}, timeout={}ms",
            program, args, timeout_ms
        );

        let child = Command::new(program)
            .args(args)
            .pre_exec(move || unsafe {
                setuid(SANDBOX_USER)?;
                setgid(SANDBOX_GROUP)?;
                self.chroot_env.enter()?;
                Ok(())
            })
            .spawn()
            .context("Failed to spawn child process")?;

        let pid = child.id();

        self.cgroup
            .add_process(pid)
            .context("Failed to add process to cgroup")?;

        crate::sandbox::seccomp::apply_seccomp().context("Failed to apply seccomp")?;

        let duration = Duration::from_millis(timeout_ms as u64);

        let output = match child.wait_timeout(duration) {
            Ok(status) if status.success() => ExecutionResult {
                exit_code: status.code().unwrap_or(-1),
                stdout: String::from_utf8_lossy(&status.stdout),
                stderr: String::from_utf8_lossy(&status.stderr),
                timed_out: false,
            },
            Err(e) if e.kind() == std::io::ErrorKind::TimedOut => {
                unsafe {
                    libc::kill(pid, libc::SIGKILL);
                }
                ExecutionResult {
                    exit_code: -1,
                    stdout: String::new(),
                    stderr: String::new(),
                    timed_out: true,
                }
            }
            Err(e) => ExecutionResult {
                exit_code: -1,
                stdout: String::new(),
                stderr: e.to_string(),
                timed_out: false,
            },
        };

        self.cgroup
            .remove_process(pid)
            .context("Failed to remove process from cgroup")?;

        crate::sandbox::seccomp::cleanup_seccomp();

        self.chroot_env
            .restore()
            .context("Failed to restore chroot")?;

        info!(
            "Execution completed: exit_code={}, timed_out={}",
            output.exit_code, output.timed_out
        );

        Ok(output)
    }
}
