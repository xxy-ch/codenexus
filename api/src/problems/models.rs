use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Problem {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub difficulty: String,
    #[serde(default = "default_time_limit")]
    pub time_limit: i32,
    #[serde(default = "default_memory_limit")]
    pub memory_limit: i32,
    pub created_by: Option<Uuid>,
    #[serde(default)]
    pub is_public: bool,
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProblemRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub difficulty: Option<String>,
    pub time_limit: Option<i32>,
    pub memory_limit: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProblemsListResponse {
    pub problems: Vec<Problem>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}
