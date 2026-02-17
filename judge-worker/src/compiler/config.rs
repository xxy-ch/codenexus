use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompilerConfig {
    pub timeout_ms: u64,
    pub memory_limit_mb: u64,
    pub max_output_size_mb: u64,
    pub enable_network: bool,
    pub max_processes: u32,
}

impl Default for CompilerConfig {
    fn default() -> Self {
        Self {
            timeout_ms: 30000,
            memory_limit_mb: 1024,
            max_output_size_mb: 10,
            enable_network: false,
            max_processes: 100,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxConfig {
    pub container_name: String,
    pub image_name: String,
    pub cpu_quota: u64,
    pub memory_limit: String,
    pub network_mode: String,
    pub read_only: bool,
}

impl Default for SandboxConfig {
    fn default() -> Self {
        Self {
            container_name: "judge-sandbox".to_string(),
            image_name: "judge-runtime:latest".to_string(),
            cpu_quota: 100000,
            memory_limit: "512m".to_string(),
            network_mode: "none".to_string(),
            read_only: true,
        }
    }
}
