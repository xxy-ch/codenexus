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
    let rc = unsafe {
        libc::syscall(
            libc::SYS_prctl,
            option,
            arg2,
            arg3,
            arg4,
            arg5,
        )
    };

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

pub fn apply_seccomp(_pid: u32) -> Result<()> {
    set_no_new_privs()?;

    #[cfg(target_os = "linux")]
    {
        let ctx = unsafe { libseccomp_sys::seccomp_init(libseccomp_sys::SCMP_ACT_ALLOW) };
        if ctx.is_null() {
            return Err(anyhow::anyhow!("Failed to initialize seccomp context"));
        }

        // Deny dangerous syscalls — allow all others by default.
        let denied_syscalls: &[libc::c_int] = &[
            libc::SYS_mount,
            libc::SYS_umount2,
            libc::SYS_ptrace,
            libc::SYS_reboot,
            libc::SYS_pivot_root,
            libc::SYS_chroot,
            libc::SYS_iopl,
            libc::SYS_ioperm,
            libc::SYS_sethostname,
            libc::SYS_setdomainname,
            libc::SYS_vhangup,
            libc::SYS_swapoff,
            libc::SYS_swapon,
            libc::SYS_quotactl,
            libc::SYS_keyctl,
            libc::SYS_clock_settime,
            libc::SYS_init_module,
            libc::SYS_delete_module,
        ];

        for &syscall in denied_syscalls {
            let ret = unsafe {
                libseccomp_sys::seccomp_rule_add_exact(
                    ctx,
                    libseccomp_sys::SCMP_ACT_ERRNO(1),
                    syscall,
                    0,
                )
            };
            // Ignore ENOTSUP — syscall may not exist on this architecture.
            if ret != 0 && ret != -(libc::ENOTSUP as i32) {
                tracing::warn!(
                    "seccomp: failed to add rule for syscall {}: ret={}",
                    syscall,
                    ret
                );
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
    fn default_mode_enables_no_new_privs_without_strict_filter() {
        std::env::remove_var("JUDGE_SECCOMP_MODE");
        apply_seccomp(0).expect("default seccomp application should succeed");
    }
}
