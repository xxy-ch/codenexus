use anyhow::{Context, Result};
use std::{fs, path::Path, path::PathBuf};
use tracing::{debug, info, warn};

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
        let cgroup_root = resolve_cgroup_root()?;
        let cgroup_path = cgroup_root.join(cgroup_name);

        fs::create_dir_all(&cgroup_path)
            .with_context(|| format!("Failed to create cgroup directory: {:?}", cgroup_path))?;

        let controller_config = CgroupConfig {
            cpu_time_limit_ms: config.cpu_time_limit_ms,
            memory_limit_bytes: config.memory_limit_bytes,
            pids_max: config.pids_max,
        };

        Ok(Self {
            cgroup_path,
            config: controller_config,
        })
    }

    pub fn create(&self) -> Result<()> {
        info!("Creating cgroup at {:?}", self.cgroup_path);

        let cgroup_root = self
            .cgroup_path
            .parent()
            .context("Cgroup path must have a parent directory")?;
        enable_parent_controllers(cgroup_root)?;

        let cpu_period_us = 100_000_u64;
        let cpu_quota_us = self.config.cpu_time_limit_ms.max(1) * 1000;
        fs::write(
            self.cgroup_path.join("cpu.max"),
            format!("{} {}", cpu_quota_us, cpu_period_us),
        )
        .with_context(|| "Failed to set CPU quota")?;
        fs::write(
            self.cgroup_path.join("memory.max"),
            format!("{}", self.config.memory_limit_bytes),
        )
        .with_context(|| "Failed to set memory limit")?;
        fs::write(
            self.cgroup_path.join("pids.max"),
            format!("{}", self.config.pids_max),
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

    /// Get current memory usage in bytes from cgroup
    pub fn get_memory_usage(&self) -> Result<u64> {
        let memory_file = self.cgroup_path.join("memory.current");

        if !memory_file.exists() {
            return Ok(0);
        }

        let content = fs::read_to_string(&memory_file)
            .with_context(|| format!("Failed to read memory usage from {:?}", memory_file))?;

        let usage: u64 = content
            .trim()
            .parse()
            .with_context(|| "Failed to parse memory usage value")?;

        Ok(usage)
    }

    /// Get maximum memory usage in bytes from cgroup
    pub fn get_max_memory_usage(&self) -> Result<u64> {
        let memory_file = self.cgroup_path.join("memory.peak");

        if !memory_file.exists() {
            return Ok(0);
        }

        let content = fs::read_to_string(&memory_file)
            .with_context(|| format!("Failed to read max memory usage from {:?}", memory_file))?;

        let usage: u64 = content
            .trim()
            .parse()
            .with_context(|| "Failed to parse max memory usage value")?;

        Ok(usage)
    }

    /// Clean up cgroup directory
    pub fn destroy(&self) -> Result<()> {
        if self.cgroup_path.exists() {
            fs::remove_dir_all(&self.cgroup_path).with_context(|| {
                format!("Failed to remove cgroup directory: {:?}", self.cgroup_path)
            })?;
            debug!("Destroyed cgroup at {:?}", self.cgroup_path);
        }
        Ok(())
    }
}

fn resolve_cgroup_root() -> Result<PathBuf> {
    if let Ok(root) = std::env::var("OJ_CGROUP_ROOT") {
        return Ok(PathBuf::from(root));
    }

    let current = current_cgroup_path().unwrap_or_else(|| PathBuf::from("/"));
    if current == Path::new("/") {
        return Ok(Path::new("/sys/fs/cgroup/onlinejudge").to_path_buf());
    }

    let current = if current
        .file_name()
        .is_some_and(|name| name == "onlinejudge-worker")
    {
        current.parent().unwrap_or(Path::new("/")).to_path_buf()
    } else {
        current
    };
    let relative = current.strip_prefix("/").unwrap_or(&current);
    let container_root = Path::new("/sys/fs/cgroup").join(relative);
    prepare_delegated_cgroup_root(&container_root).or_else(|error| {
        warn!(
            "Failed to prepare delegated cgroup root at {:?}: {}",
            container_root, error
        );
        Ok(Path::new("/sys/fs/cgroup/onlinejudge").to_path_buf())
    })
}

fn current_cgroup_path() -> Option<PathBuf> {
    let content = fs::read_to_string("/proc/self/cgroup").ok()?;
    parse_unified_cgroup_path(&content)
}

fn parse_unified_cgroup_path(content: &str) -> Option<PathBuf> {
    content.lines().find_map(|line| {
        let mut fields = line.splitn(3, ':');
        let hierarchy = fields.next()?;
        let controllers = fields.next()?;
        let path = fields.next()?;

        if hierarchy == "0" && controllers.is_empty() && !path.is_empty() {
            Some(PathBuf::from(path))
        } else {
            None
        }
    })
}

fn prepare_delegated_cgroup_root(container_root: &Path) -> Result<PathBuf> {
    let worker_holder = container_root.join("onlinejudge-worker");
    let jobs_root = container_root.join("onlinejudge");

    fs::create_dir_all(&worker_holder)
        .with_context(|| format!("Failed to create worker holder cgroup: {:?}", worker_holder))?;
    fs::write(
        worker_holder.join("cgroup.procs"),
        std::process::id().to_string(),
    )
    .with_context(|| format!("Failed to move worker into {:?}", worker_holder))?;

    enable_parent_controllers(container_root)?;

    fs::create_dir_all(&jobs_root)
        .with_context(|| format!("Failed to create judge jobs cgroup root: {:?}", jobs_root))?;
    enable_parent_controllers(&jobs_root)?;

    Ok(jobs_root)
}

fn enable_parent_controllers(cgroup_root: &Path) -> Result<()> {
    let controllers_path = cgroup_root.join("cgroup.controllers");
    let subtree_control_path = cgroup_root.join("cgroup.subtree_control");

    if !controllers_path.exists() || !subtree_control_path.exists() {
        return Ok(());
    }

    let available = fs::read_to_string(&controllers_path)
        .with_context(|| format!("Failed to read {:?}", controllers_path))?;
    let enabled = fs::read_to_string(&subtree_control_path)
        .with_context(|| format!("Failed to read {:?}", subtree_control_path))?;
    let requested = ["cpu", "memory", "pids"]
        .iter()
        .filter(|controller| {
            available
                .split_whitespace()
                .any(|value| value == **controller)
        })
        .filter(|controller| {
            !enabled
                .split_whitespace()
                .any(|value| value.trim_start_matches('+') == **controller)
        })
        .map(|controller| format!("+{}", controller))
        .collect::<Vec<_>>();

    if requested.is_empty() {
        return Ok(());
    }

    fs::write(&subtree_control_path, requested.join(" "))
        .with_context(|| format!("Failed to enable cgroup controllers at {:?}", cgroup_root))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn parse_unified_cgroup_path_reads_v2_entry() {
        let parsed = parse_unified_cgroup_path("0::/docker/abc123\n1:name=systemd:/ignored\n");

        assert_eq!(parsed, Some(PathBuf::from("/docker/abc123")));
    }

    #[test]
    fn create_writes_cgroup_v2_limits() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("oj-cgroup-test-{}", unique));
        fs::create_dir_all(&root).unwrap();
        unsafe {
            std::env::set_var("OJ_CGROUP_ROOT", &root);
        }

        let controller = CgroupController::new(
            "case-1",
            &SandboxConfig {
                cpu_time_limit_ms: 250,
                memory_limit_bytes: 64 * 1024 * 1024,
                pids_max: 8,
                ..Default::default()
            },
        )
        .unwrap();

        controller.create().unwrap();

        assert_eq!(
            fs::read_to_string(root.join("case-1/cpu.max")).unwrap(),
            "250000 100000"
        );
        assert_eq!(
            fs::read_to_string(root.join("case-1/memory.max")).unwrap(),
            (64 * 1024 * 1024).to_string()
        );
        assert_eq!(
            fs::read_to_string(root.join("case-1/pids.max")).unwrap(),
            "8"
        );

        unsafe {
            std::env::remove_var("OJ_CGROUP_ROOT");
        }
        let _ = fs::remove_dir_all(root);
    }
}
