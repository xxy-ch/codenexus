//! Sandbox executor — deprecated.
//!
//! The actual sandboxed execution is in `crate::processor::service::execute_program()`.
//! This module is kept only for the `ExecutionResult` type reference.

use anyhow::Result;

pub struct ExecutionResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub timed_out: bool,
}
