pub mod chroot;
pub mod cgroups;
// pub mod seccomp; // TODO: Requires libseccomp-sys dependency

use anyhow::Result;

pub struct SandboxConfig {
    pub sandbox_root: std::path::PathBuf,
    pub cpu_time_limit_ms: u64,
    pub memory_limit_bytes: u64,
    pub pids_max: u32,
}

impl Default for SandboxConfig {
    fn default() -> Self {
        Self {
            sandbox_root: std::path::PathBuf::from("/var/lib/onlinejudge/sandbox"),
            cpu_time_limit_ms: 2000,
            memory_limit_bytes: 268_435_456,
            pids_max: 64,
        }
    }
}

pub fn create_sandbox(config: SandboxConfig) -> Result<(cgroups::CgroupController, chroot::ChrootEnvironment)> {
    let chroot_env = chroot::ChrootEnvironment::new(&config.sandbox_root, 1)?;
    let cgroup_ctrl = cgroups::CgroupController::new(&format!("judge-worker-{}", std::process::id()), &config)?;

    Ok((cgroup_ctrl, chroot_env))
}
