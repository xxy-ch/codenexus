use anyhow::{Context, Result};
use std::{fs, io::Write, path::Path, path::PathBuf, time::Duration};
use tracing::{debug, error, info};

use crate::sandbox::SandboxConfig;

#[derive(Debug, Clone)]
pub struct CgroupConfig {
    pub cpu_time_limit_ms: u64,
    pub memory_limit_bytes: u64,
    pub pids_max: u32,
}

pub struct CgroupController {
    cgroup_path: PathBuf,
    config: CgroupConfig,
}

impl CgroupController {
    pub fn new(cgroup_name: &str, config: &SandboxConfig) -> Result<Self> {
        let cgroup_path = Path::new("/sys/fs/cgroup/onlinejudge").join(cgroup_name);

        fs::create_dir_all(&cgroup_path)
            .with_context(|| format!("Failed to create cgroup directory: {:?}", cgroup_path))?;

        let controller_config = CgroupConfig {
            cpu_time_limit_ms: config.cpu_time_limit_ms,
            memory_limit_bytes: config.memory_limit_bytes,
            pids_max: config.pids_max,
        };

        Ok(Self { cgroup_path, config: controller_config })
    }

    pub fn create(&self) -> Result<()> {
        info!("Creating cgroup at {:?}", self.cgroup_path);

        let cpu_quota = self.config.cpu_time_limit_ms * 1000 / 20000;

        fs::write(self.cgroup_path.join("cgroup.type"), "0")
            .with_context(|| "Failed to set cgroup type")?;
        fs::write(
            self.cgroup_path.join("cgroup.controllers"),
            "cpu,memory,pids",
        )
        .with_context(|| "Failed to set cgroup controllers")?;
        fs::write(self.cgroup_path.join("cpu.max"), &format!("{}", cpu_quota))
            .with_context(|| "Failed to set CPU quota")?;
        fs::write(
            self.cgroup_path.join("memory.max"),
            &format!("{}", self.config.memory_limit_bytes),
        )
        .with_context(|| "Failed to set memory limit")?;
        fs::write(
            self.cgroup_path.join("pids.max"),
            &format!("{}", self.config.pids_max),
        )
        .with_context(|| "Failed to set PIDs max")?;

        info!(
            "Created cgroup with CPU quota={}ms, memory={}MB, pids_max={}",
            self.config.cpu_time_limit_ms,
            self.config.memory_limit_bytes / (1024 * 1024),
            self.config.pids_max
        );

        Ok(())
    }

    pub fn add_process(&self, pid: i32) -> Result<()> {
        let pid_str = pid.to_string();
        fs::write(self.cgroup_path.join("cgroup.procs"), &pid_str)
            .with_context(|| format!("Failed to add process {} to cgroup", pid))?;

        debug!("Added process {} to cgroup", pid);
        Ok(())
    }

    pub fn remove_process(&self, pid: i32) -> Result<()> {
        let pid_str = pid.to_string();
        fs::write(self.cgroup_path.join("cgroup.procs"), &pid_str)
            .with_context(|| format!("Failed to remove process {} from cgroup", pid))?;

        debug!("Removed process {} from cgroup", pid);
        Ok(())
    }
}
