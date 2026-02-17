use anyhow::{Context, Result};
use libseccomp::{ScmpAction, ScmpFilterContext, ScmpSyscall};
use std::os::unix::io::RawFd;
use tracing::{info, warn};

const SECCOMP_ALLOW: u32 = 0x7FFF0000;

pub fn apply_seccomp() -> Result<()> {
    let mut filter = ScmpFilterContext::new_filter(ScmpAction::Allow)
        .context("Failed to create seccomp filter")?;

    let allowed_syscalls = [
        "read",
        "write",
        "exit",
        "exit_group",
        "fstat",
        "lstat",
        "fstat",
        "mmap",
        "mprotect",
        "brk",
        "rt_sigaction",
        "rt_sigprocmask",
        "arch_prctl",
        "close",
        "execve",
        "access",
        "open",
        "stat",
        "lstat",
        "fstat",
        "getrlimit",
        "gettimeofday",
    ];

    for name in allowed_syscalls {
        filter
            .add_rule(ScmpAction::Allow, ScmpSyscall::from_name(name)?, &[])
            .with_context(|| format!("Failed to add syscall rule: {}", name))?;
    }

    let blocked_syscalls = [
        "socket",
        "connect",
        "bind",
        "listen",
        "accept",
        "send",
        "sendto",
        "recvfrom",
        "recvmsg",
        "shutdown",
        "getpeername",
    ];

    for name in blocked_syscalls {
        filter
            .add_rule(ScmpAction::KillProcess, ScmpSyscall::from_name(name)?, &[])
            .with_context(|| format!("Failed to block syscall: {}", name))?;
    }

    filter.load().context("Failed to load seccomp filter")?;

    unsafe {
        if libc::prctl(libc::PR_SET_SECCOMP, &filter) != 0 {
            let error = std::io::Error::last_os_error();
            let errno = error.raw_os_error();
            warn!("prctl failed: errno={}, description={:?}", errno, error);
            return Err(anyhow::anyhow!("Failed to apply seccomp: {}", error));
        }
    }

    info!(
        "Applied seccomp filter: {} allowed syscalls, {} blocked",
        allowed_syscalls.len(),
        blocked_syscalls.len()
    );

    Ok(())
}

pub fn cleanup_seccomp() {
    unsafe {
        libc::prctl(libc::PR_SET_SECCOMP, &Default::default());
    }
}
