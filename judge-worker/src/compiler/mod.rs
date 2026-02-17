pub mod language;
pub mod config;

use anyhow::{anyhow, Context, Result};

pub struct LanguageConfig {
    pub name: String,
    pub display_name: String,
    pub compiler_path: String,
    pub compilation_timeout_ms: u64,
    pub runtime_timeout_ms: u64,
    pub memory_limit_mb: u64,
    pub time_limit_ms: Option<u64>,
    pub max_processes: Option<u32>,
}

pub fn get_language(name: &str) -> Result<LanguageConfig> {
    match name {
        "python3" => Ok(LanguageConfig {
            name: "Python 3".to_string(),
            display_name: "Python 3.11".to_string(),
            compiler_path: "/usr/bin/python3".to_string(),
            compilation_timeout_ms: 10000,
            runtime_timeout_ms: 5000,
            memory_limit_mb: 512,
            time_limit_ms: Some(5000),
            max_processes: None,
        }),
        "cpp" => Ok(LanguageConfig {
            name: "C++".to_string(),
            display_name: "C++17".to_string(),
            compiler_path: "/usr/bin/g++".to_string(),
            compilation_timeout_ms: 30000,
            runtime_timeout_ms: 5000,
            memory_limit_mb: 512,
            time_limit_ms: Some(5000),
            max_processes: None,
        }),
        "c" => Ok(LanguageConfig {
            name: "C11".to_string(),
            display_name: "C11 (GCC 11)".to_string(),
            compiler_path: "/usr/bin/gcc".to_string(),
            compilation_timeout_ms: 30000,
            runtime_timeout_ms: 5000,
            memory_limit_mb: 512,
            time_limit_ms: Some(5000),
            max_processes: None,
        }),
        _ => Err(anyhow!("Unsupported language: {}", name)),
    }
}

impl Default for LanguageConfig {
    fn default() -> Self {
        Self {
            name: "".to_string(),
            display_name: "".to_string(),
            compiler_path: "".to_string(),
            compilation_timeout_ms: 10000,
            runtime_timeout_ms: 5000,
            memory_limit_mb: 256,
            time_limit_ms: None,
            max_processes: None,
        }
    }
}

pub struct CompilationRequest<'a> {
    pub source_code: &'a str,
    pub language_config: &'a LanguageConfig,
    pub input_path: Option<&'a str>,
    pub output_path: Option<&'a str>,
}

pub struct CompilationResult {
    pub success: bool,
    pub output: String,
    pub error_message: Option<String>,
    pub exit_code: Option<i32>,
}

pub fn compile_code(request: CompilationRequest) -> Result<CompilationResult> {
    let mut cmd = std::process::Command::new(&request.language_config.compiler_path);

    cmd.arg("-c")
        .args(["-Wall", "-Werror", "-O2"])
        .arg("-o")
        .arg("output.bin");

    if let Some(input) = request.input_path {
        cmd.arg(input);
    }

    let output = cmd.output()
        .context("Failed to execute compiler")?;

    let result = output.status;
    let error_message = if result.success() {
        None
    } else {
        Some(String::from_utf8_lossy(&output.stderr).to_string())
    };

    Ok(CompilationResult {
        success: result.success(),
        output: String::from_utf8_lossy(&output.stdout).to_string(),
        error_message,
        exit_code: result.code(),
    })
}
