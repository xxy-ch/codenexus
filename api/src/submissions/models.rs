use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Submission {
    pub id: i64,
    pub user_id: Uuid,
    pub problem_id: i64,
    pub code: String,
    pub language: String,
    pub status: String,
    pub score: Option<i32>,
    pub runtime_ms: Option<i32>,
    pub memory_kb: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SubmissionResult {
    pub id: i64,
    pub submission_id: i64,
    pub test_case_id: i64,
    pub status: String,
    pub expected_output: Option<String>,
    pub actual_output: Option<String>,
    pub error_message: Option<String>,
    pub runtime_ms: Option<i32>,
    pub memory_kb: Option<i32>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSubmissionRequest {
    pub problem_id: i64,
    pub code: String,
    pub language: String,
}

#[derive(Debug, Serialize)]
pub struct SubmissionResponse {
    pub id: i64,
    pub user_id: Uuid,
    pub problem_id: i64,
    pub code: String,
    pub language: String,
    pub status: String,
    pub score: Option<i32>,
    pub runtime_ms: Option<i32>,
    pub memory_kb: Option<i32>,
    pub test_cases: Vec<TestCaseResult>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct TestCaseResult {
    pub id: i64,
    pub status: String,
    pub expected_output: Option<String>,
    pub actual_output: Option<String>,
    pub error_message: Option<String>,
    pub runtime_ms: Option<i32>,
    pub memory_kb: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct SubmissionStats {
    pub total_submissions: i64,
    pub accepted_submissions: i64,
    pub acceptance_rate: f64,
    pub average_runtime: Option<f64>,
    pub average_memory: Option<f64>,
}

pub const SUBMISSION_STATUS: &[&str] = &[
    "pending",
    "running",
    "accepted",
    "wrong_answer",
    "time_limit_exceeded",
    "memory_limit_exceeded",
    "runtime_error",
    "compile_error",
    "system_error",
];

pub const LANGUAGE_CONFIG: &[(&str, &str, &str)] = &[
    ("python", "Python 3", "python3"),
    ("java", "Java", "java"),
    ("cpp", "C++", "g++"),
    ("c", "C", "gcc"),
    ("go", "Go", "go"),
    ("rust", "Rust", "rustc"),
    ("javascript", "JavaScript", "node"),
    ("typescript", "TypeScript", "ts-node"),
    ("ruby", "Ruby", "ruby"),
    ("php", "PHP", "php"),
];