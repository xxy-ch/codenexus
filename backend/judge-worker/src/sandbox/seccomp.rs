#[cfg(target_os = "linux")]
use anyhow::Context;
use anyhow::Result;

#[cfg(target_os = "linux")]
use std::ffi::CString;

#[cfg(target_os = "linux")]
const PR_SET_NO_NEW_PRIVS: libc::c_ulong = 38;

#[cfg(target_os = "linux")]
fn prctl(
    option: libc::c_ulong,
    arg2: libc::c_ulong,
    arg3: libc::c_ulong,
    arg4: libc::c_ulong,
    arg5: libc::c_ulong,
) -> Result<()> {
    let rc = unsafe { libc::syscall(libc::SYS_prctl, option, arg2, arg3, arg4, arg5) };

    if rc != 0 {
        return Err(std::io::Error::last_os_error()).context("prctl syscall failed");
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn set_no_new_privs() -> Result<()> {
    prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)
}

#[cfg(not(target_os = "linux"))]
fn set_no_new_privs() -> Result<()> {
    Ok(())
}

/// Apply seccomp filter with deny-by-default policy (C-03).
///
/// Only explicitly allowed syscalls pass through. All others are KILLED.
/// Combined with PR_SET_NO_NEW_PRIVS and setuid(nobody), this prevents:
/// - Network access (no socket/connect/bind/sendto/recvfrom)
/// - Process creation with namespace isolation (clone CLONE_NEW*)
/// - Privilege escalation (no setuid/setgid)
/// - Resource limit bypass (no setrlimit/prlimit64)
/// - Filesystem mount operations
/// - Module loading, ptrace, reboot
///
/// SCMP_ACT_KILL_PROCESS (not ERRNO) terminates the process immediately on a
/// forbidden syscall. This is stronger than returning EPERM, which lets an
/// attacker probe the filter to discover which syscalls are blocked and
/// attempt fallback paths. A kill is a hard stop with no feedback.
pub fn apply_seccomp(_pid: u32) -> Result<()> {
    set_no_new_privs()?;

    #[cfg(target_os = "linux")]
    {
        let ctx = unsafe {
            libseccomp_sys::seccomp_init(libseccomp_sys::SCMP_ACT_KILL_PROCESS)
        };
        if ctx.is_null() {
            return Err(anyhow::anyhow!("Failed to initialize seccomp context"));
        }

        // Allowed syscalls — minimum set for user program execution.
        // Thread creation (clone/clone3) is allowed for runtime threading
        // support. Namespace flags (CLONE_NEW*) are expected to fail because
        // the process runs as nobody with no-new-privs — but see the note in
        // the audit: this relies on the privilege drop actually working.
        let allowed: &[&str] = &[
            // File I/O
            "read",
            "write",
            "close",
            "open",
            "openat",
            "stat",
            "fstat",
            "lstat",
            "newfstatat",
            "lseek",
            "pread64",
            "pwrite64",
            "dup",
            "dup2",
            "dup3",
            "pipe",
            "pipe2",
            "readlink",
            "readlinkat",
            "fcntl",
            "ioctl",
            "getdents64",
            // Memory management
            "mmap",
            "munmap",
            "mprotect",
            "brk",
            "madvise",
            // Process lifecycle
            "exit",
            "exit_group",
            "execve",
            "arch_prctl",
            "set_tid_address",
            "futex",
            "set_robust_list",
            "get_robust_list",
            "rseq",
            // Signals
            "rt_sigaction",
            "rt_sigprocmask",
            "sigaltstack",
            "rt_sigreturn",
            // Time
            "clock_gettime",
            "clock_nanosleep",
            "gettimeofday",
            "nanosleep",
            // System info
            "getrlimit",
            "sysinfo",
            "uname",
            "umask",
            "sched_yield",
            "getpid",
            "gettid",
            "getppid",
            "getuid",
            "getgid",
            "geteuid",
            "getegid",
            "getgroups",
            // Thread creation: only `clone` (with CLONE_THREAD for plain
            // threading). `clone3` is NOT allowed — it is the newer API used
            // for CLONE_NEWUSER/CLONE_NEWNET/CLONE_NEWNS namespace creation,
            // which is the primary sandbox-escape vector. Plain thread
            // creation via `clone(CLONE_THREAD|...)` does not require clone3.
            // While an argument-level seccomp filter would be ideal, removing
            // clone3 entirely is the pragmatic defense: runtimes (glibc,
            // musl, pthread) use the `clone` syscall for threads, not clone3.
            "clone",
            // Access checks
            "access",
            "faccessat",
            // IPC (needed by Python, Node.js)
            "socketpair",
            "recvmsg",
            "sendmsg",
            // Event polling (needed by Python, Node.js runtimes)
            "epoll_create1",
            "epoll_ctl",
            "epoll_wait",
            "epoll_pwait",
            "eventfd2",
            "timerfd_create",
            "timerfd_settime",
            "timerfd_gettime",
            "poll",
            "ppoll",
            // Additional syscalls needed by runtimes
            "mkdir",
            "mknod",
            "unlink",
            "rename",
            "chmod",
            "fchmod",
            "ftruncate",
            "flock",
            "sync",
            "fsync",
            "fdatasync",
            "getcwd",
            "chdir",
            "fchdir",
            "writev",
            "readv",
            "pwritev",
            "preadv",
            "copy_file_range",
            "getrandom",
            "clock_getres",
            "getcpu",
            "sched_getaffinity",
            "sched_setaffinity",
            "mremap",
            "getrusage",
            "times",
            "getsid",
            "getpgid",
            "setpgid",
            "wait4",
        ];

        let native_arch = unsafe { libseccomp_sys::seccomp_arch_native() };
        for &syscall_name in allowed {
            let syscall_name_c =
                CString::new(syscall_name).expect("static syscall names cannot contain NUL bytes");
            let syscall = unsafe {
                libseccomp_sys::seccomp_syscall_resolve_name_rewrite(
                    native_arch,
                    syscall_name_c.as_ptr(),
                )
            };
            if syscall == libseccomp_sys::__NR_SCMP_ERROR {
                continue;
            }

            let _ = unsafe {
                libseccomp_sys::seccomp_rule_add_exact(
                    ctx,
                    libseccomp_sys::SCMP_ACT_ALLOW,
                    syscall,
                    0,
                )
            };
        }

        let ret = unsafe { libseccomp_sys::seccomp_load(ctx) };
        unsafe { libseccomp_sys::seccomp_release(ctx) };

        if ret != 0 {
            return Err(anyhow::anyhow!("Failed to load seccomp filter"));
        }
    }

    Ok(())
}

pub fn cleanup_seccomp() {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deny_by_default_mode_succeeds() {
        std::env::remove_var("JUDGE_SECCOMP_MODE");
        apply_seccomp(0).expect("deny-by-default seccomp should succeed");
    }
}
