use anyhow::{Context, Result};
use nix::unistd::{chdir, chroot, setgid, setuid, Gid};
use std::{fs, path::Path};

const SANDBOX_USER: Gid = Gid::from_raw(1000);
const SANDBOX_GROUP: Gid = Gid::from_raw(1000);
const SANDBOX_ROOT: &Path = Path::new("/var/lib/onlinejudge/sandbox");

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
        fs::create_dir_all(proc_path)
            .with_context(|| format!("Failed to create proc directory: {:?}", proc_path))?;

        let sys_path = root_path.join("sys");
        fs::create_dir_all(sys_path)
            .with_context(|| format!("Failed to create sys directory: {:?}", sys_path))?;

        Ok(Self {
            root_path: root_path.clone(),
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

pub fn drop_privileges() {
    unsafe {
        libc::seteuid(0);
        libc::setegid(0);
    }
}
