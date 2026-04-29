use anyhow::Result;

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
/// Only explicitly allowed syscalls pass through. All others return EPERM.
/// Combined with PR_SET_NO_NEW_PRIVS and setuid(nobody), this prevents:
/// - Network access (no socket/connect/bind/sendto/recvfrom)
/// - Process creation with namespace isolation (clone CLONE_NEW*)
/// - Privilege escalation (no setuid/setgid)
/// - Resource limit bypass (no setrlimit)
/// - Filesystem mount operations
/// - Module loading, ptrace, reboot
pub fn apply_seccomp(_pid: u32) -> Result<()> {
    set_no_new_privs()?;

    #[cfg(target_os = "linux")]
    {
        let ctx = unsafe {
            libseccomp_sys::seccomp_init(libseccomp_sys::SCMP_ACT_ERRNO(libc::EPERM as u32))
        };
        if ctx.is_null() {
            return Err(anyhow::anyhow!("Failed to initialize seccomp context"));
        }

        // Allowed syscalls — minimum set for user program execution.
        // Thread creation (clone) is allowed but namespace flags will fail
        // because the process runs as nobody with no-new-privs.
        let allowed: &[libc::c_int] = &[
            // File I/O
            libc::SYS_read,
            libc::SYS_write,
            libc::SYS_close,
            libc::SYS_open,
            libc::SYS_openat,
            libc::SYS_stat,
            libc::SYS_fstat,
            libc::SYS_lstat,
            libc::SYS_newfstatat,
            libc::SYS_lseek,
            libc::SYS_pread64,
            libc::SYS_pwrite64,
            libc::SYS_dup,
            libc::SYS_dup2,
            libc::SYS_dup3,
            libc::SYS_pipe,
            libc::SYS_pipe2,
            libc::SYS_readlink,
            libc::SYS_readlinkat,
            libc::SYS_fcntl,
            libc::SYS_ioctl,
            libc::SYS_getdents64,
            // Memory management
            libc::SYS_mmap,
            libc::SYS_munmap,
            libc::SYS_mprotect,
            libc::SYS_brk,
            libc::SYS_madvise,
            // Process lifecycle
            libc::SYS_exit,
            libc::SYS_exit_group,
            libc::SYS_execve,
            libc::SYS_arch_prctl,
            libc::SYS_set_tid_address,
            libc::SYS_futex,
            libc::SYS_set_robust_list,
            libc::SYS_get_robust_list,
            libc::SYS_rseq,
            // Signals
            libc::SYS_rt_sigaction,
            libc::SYS_rt_sigprocmask,
            libc::SYS_sigaltstack,
            libc::SYS_rt_sigreturn,
            // Time
            libc::SYS_clock_gettime,
            libc::SYS_clock_nanosleep,
            libc::SYS_gettimeofday,
            libc::SYS_nanosleep,
            // System info
            libc::SYS_getrlimit,
            libc::SYS_sysinfo,
            libc::SYS_uname,
            libc::SYS_umask,
            libc::SYS_sched_yield,
            libc::SYS_getpid,
            libc::SYS_gettid,
            libc::SYS_getppid,
            libc::SYS_getuid,
            libc::SYS_getgid,
            libc::SYS_geteuid,
            libc::SYS_getegid,
            libc::SYS_getgroups,
            // Thread creation (namespace flags fail due to no privs)
            libc::SYS_clone,
            libc::SYS_clone3,
            // Access checks
            libc::SYS_access,
            libc::SYS_faccessat,
            // IPC (needed by Python, Node.js)
            libc::SYS_socketpair,
            libc::SYS_recvmsg,
            libc::SYS_sendmsg,
            // Event polling (needed by Python, Node.js runtimes)
            libc::SYS_epoll_create1,
            libc::SYS_epoll_ctl,
            libc::SYS_epoll_wait,
            libc::SYS_epoll_pwait,
            libc::SYS_eventfd2,
            libc::SYS_timerfd_create,
            libc::SYS_timerfd_settime,
            libc::SYS_timerfd_gettime,
            libc::SYS_poll,
            libc::SYS_ppoll,
            // Additional syscalls needed by runtimes
            libc::SYS_mkdir,
            libc::SYS_mknod,
            libc::SYS_unlink,
            libc::SYS_rename,
            libc::SYS_chmod,
            libc::SYS_fchmod,
            libc::SYS_ftruncate,
            libc::SYS_flock,
            libc::SYS_sync,
            libc::SYS_fsync,
            libc::SYS_fdatasync,
            libc::SYS_getcwd,
            libc::SYS_chdir,
            libc::SYS_fchdir,
            libc::SYS_writev,
            libc::SYS_readv,
            libc::SYS_pwritev,
            libc::SYS_preadv,
            libc::SYS_copy_file_range,
            libc::SYS_getrandom,
            libc::SYS_clock_getres,
            libc::SYS_getcpu,
            libc::SYS_sched_getaffinity,
            libc::SYS_sched_setaffinity,
            libc::SYS_mremap,
            libc::SYS_getrlimit,
            libc::SYS_prlimit64,
            libc::SYS_getrusage,
            libc::SYS_times,
            libc::SYS_getsid,
            libc::SYS_setsid,
            libc::SYS_getpgid,
            libc::SYS_setpgid,
            libc::SYS_wait4,
        ];

        for &syscall in allowed {
            let ret = unsafe {
                libseccomp_sys::seccomp_rule_add_exact(
                    ctx,
                    libseccomp_sys::SCMP_ACT_ALLOW,
                    syscall,
                    0,
                )
            };
            // Ignore ENOTSUP — syscall may not exist on this architecture.
            if ret != 0 && ret != -(libc::ENOTSUP as i32) {
                tracing::warn!("seccomp: failed to allow syscall {}: ret={}", syscall, ret);
            }
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
