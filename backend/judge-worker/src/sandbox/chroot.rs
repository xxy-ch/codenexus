use anyhow::{Context, Result};
use nix::unistd::{chdir, chroot, setgid, setuid, Gid, Uid};
use std::{fs, path::Path, path::PathBuf};

const SANDBOX_USER: Uid = Uid::from_raw(1000);
const SANDBOX_GROUP: Gid = Gid::from_raw(1000);

pub struct ChrootEnvironment {
    pub root_path: PathBuf,
    pub original_pid: i32,
}

impl ChrootEnvironment {
    pub fn new(root_path: &Path, original_pid: i32) -> Result<Self> {
        if !root_path.exists() {
            fs::create_dir_all(root_path).with_context(|| {
                format!("Failed to create sandbox root directory: {:?}", root_path)
            })?;
        }

        let proc_path = root_path.join("proc");
        fs::create_dir_all(&proc_path)
            .with_context(|| format!("Failed to create proc directory: {:?}", proc_path))?;

        let sys_path = root_path.join("sys");
        fs::create_dir_all(&sys_path)
            .with_context(|| format!("Failed to create sys directory: {:?}", sys_path))?;

        Ok(Self {
            root_path: root_path.to_path_buf(),
            original_pid,
        })
    }

    pub fn setup(&self) -> Result<()> {
        chroot(&self.root_path)
            .with_context(|| format!("Failed to chroot to {:?}", self.root_path))?;
        chdir("/").with_context(|| "Failed to chdir to /")?;

        setuid(SANDBOX_USER).with_context(|| "Failed to set UID")?;
        setgid(SANDBOX_GROUP).with_context(|| "Failed to set GID")?;

        Ok(())
    }

    pub fn enter(&self) -> Result<()> {
        let uid = unsafe { libc::getuid() };
        let gid = unsafe { libc::getgid() };

        tracing::debug!("Dropped to UID={:?}, GID={:?}", uid, gid);

        Ok(())
    }
}

/// Drop privileges to the nobody user in a child process.
///
/// Called from pre_exec to ensure user-submitted code runs as an
/// unprivileged user, not root. Combined with no-new-privs and seccomp,
/// this prevents privilege escalation from submitted code.
///
/// Returns an error if privilege drop fails — the process will abort
/// rather than run as root.
pub fn drop_privileges_to_nobody() -> Result<()> {
    #[cfg(target_os = "linux")]
    {
        let current_uid = unsafe { libc::getuid() };
        let current_gid = unsafe { libc::getgid() };

        if current_uid != 0 {
            if current_gid == 0 {
                return Err(anyhow::anyhow!(
                    "Privilege drop verification failed: running with root group (uid={}, gid={})",
                    current_uid,
                    current_gid
                ));
            }
            tracing::debug!(
                "Child process already unprivileged (uid={}, gid={}); skipping setuid/setgid",
                current_uid,
                current_gid
            );
            return Ok(());
        }

        let nobody_uid = Uid::from_raw(65534);
        let nobody_gid = Gid::from_raw(65534);

        setgid(nobody_gid).with_context(|| "Failed to drop GID to nobody")?;
        setuid(nobody_uid).with_context(|| "Failed to drop UID to nobody")?;

        // Verify we actually dropped
        let uid = unsafe { libc::getuid() };
        let gid = unsafe { libc::getgid() };
        if uid == 0 || gid == 0 {
            return Err(anyhow::anyhow!(
                "Privilege drop verification failed: still running as root (uid={}, gid={})",
                uid,
                gid
            ));
        }

        tracing::debug!("Dropped privileges to nobody (uid={}, gid={})", uid, gid);
    }

    Ok(())
}
