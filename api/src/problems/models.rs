use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Problem {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub difficulty: String,
    #[serde(default = "default_time_limit")]
    pub time_limit: i32,
    #[serde(default = "default_memory_limit")]
    pub memory_limit: i32,
    pub created_by: Option<Uuid>,
    pub organization_id: i64,
    #[serde(default)]
    pub is_public: bool,
    pub visibility: String,
    pub tags: Option<Vec<String>>,
    pub source_url: Option<String>,
    pub author_note: Option<String>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
}

fn default_time_limit() -> i32 { 5000 }
fn default_memory_limit() -> i32 { 256 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProblemRequest {
    pub title: String,
    pub description: String,
    pub difficulty: String,
    #[serde(default = "default_time_limit")]
    pub time_limit: i32,
    #[serde(default = "default_memory_limit")]
    pub memory_limit: i32,
    pub organization_id: i64,
    #[serde(default)]
    pub is_public: bool,
    #[serde(default = "default_visibility")]
    pub visibility: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub source_url: Option<String>,
    pub author_note: Option<String>,
}

fn default_visibility() -> String { "private".to_string() }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProblemRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub difficulty: Option<String>,
    pub time_limit: Option<i32>,
    pub memory_limit: Option<i32>,
    pub is_public: Option<bool>,
    pub visibility: Option<String>,
    pub tags: Option<Vec<String>>,
    pub source_url: Option<String>,
    pub author_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProblemsListResponse {
    pub problems: Vec<Problem>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProblemDetail {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub difficulty: String,
    pub time_limit: i32,
    pub memory_limit: i32,
    pub created_by: Option<Uuid>,
    pub organization_id: i64,
    pub is_public: bool,
    pub visibility: String,
    pub tags: Option<Vec<String>>,
    pub source_url: Option<String>,
    pub author_note: Option<String>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
    pub statistics: Option<ProblemStatistics>,
    pub test_case_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ProblemStatistics {
    pub problem_id: i64,
    pub total_submissions: i64,
    pub accepted_submissions: i64,
    pub acceptance_rate: Option<f64>,
    pub fastest_time_ms: Option<i32>,
    pub first_solver_id: Option<Uuid>,
    pub first_solved_at: Option<chrono::DateTime<chrono::Utc>>,
    pub last_solved_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListProblemsQuery {
    pub difficulty: Option<String>,
    pub visibility: Option<String>,
    pub search: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_public: Option<bool>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub sort_by: Option<String>, // 'created_at', 'title', 'difficulty', 'submissions'
    pub sort_order: Option<String>, // 'asc', 'desc'
}
