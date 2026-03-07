use anyhow::Result;
use std::env;

#[cfg(target_os = "linux")]
const PR_SET_NO_NEW_PRIVS: libc::c_ulong = 38;
#[cfg(target_os = "linux")]
const PR_SET_SECCOMP: libc::c_ulong = 22;

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

#[cfg(target_os = "linux")]
fn enable_strict_seccomp() -> Result<()> {
    prctl(
        PR_SET_SECCOMP,
        libseccomp_sys::SECCOMP_MODE_STRICT as libc::c_ulong,
        0,
        0,
        0,
    )
}

#[cfg(not(target_os = "linux"))]
fn enable_strict_seccomp() -> Result<()> {
    Ok(())
}

pub fn apply_seccomp(_pid: u32) -> Result<()> {
    set_no_new_privs()?;

    match env::var("JUDGE_SECCOMP_MODE").ok().as_deref() {
        Some("strict") => enable_strict_seccomp(),
        _ => Ok(()),
    }
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
