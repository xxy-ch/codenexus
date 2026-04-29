use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisJob {
    pub id: i64,
    pub submission_id: i64,
    pub problem_id: i64,
    pub user_id: Uuid,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
    pub contest_id: Option<i64>,
    pub status: String,
    pub error_message: Option<String>,
    pub llm_model: Option<String>,
    pub prompt_tokens: Option<i32>,
    pub completion_tokens: Option<i32>,
    pub latency_ms: Option<i32>,
    pub retry_count: Option<i32>,
    pub max_retries: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisSubmissionFeatures {
    pub id: i64,
    pub submission_id: i64,
    pub organization_id: i64,
    pub cyclomatic_complexity: Option<f64>,
    pub lines_of_code: Option<i32>,
    pub token_count: Option<i32>,
    pub function_count: Option<i32>,
    pub nesting_depth: Option<i32>,
    pub has_recursion: Option<bool>,
    pub loop_count: Option<i32>,
    pub avg_loop_nesting: Option<f64>,
    pub distinct_operators: Option<i32>,
    pub distinct_operands: Option<i32>,
    pub halstead_volume: Option<f64>,
    pub embedding_vector: Option<sqlx::types::Json<Vec<f64>>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisSolutionCluster {
    pub id: i64,
    pub problem_id: i64,
    pub organization_id: i64,
    pub cluster_name: Option<String>,
    pub centroid_embedding: Option<sqlx::types::Json<Vec<f64>>>,
    pub member_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisClusterMember {
    pub id: i64,
    pub cluster_id: i64,
    pub submission_id: i64,
    pub organization_id: i64,
    pub distance_to_centroid: Option<f64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisTeachingCard {
    pub id: i64,
    pub problem_id: i64,
    pub organization_id: i64,
    pub card_type: String,
    pub title: String,
    pub content: sqlx::types::Json<serde_json::Value>,
    pub source_cluster_ids: Vec<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisClassSnapshot {
    pub id: i64,
    pub class_id: i64,
    pub organization_id: i64,
    pub snapshot_date: NaiveDate,
    pub cognition_profile: sqlx::types::Json<serde_json::Value>,
    pub student_count: i32,
    pub avg_complexity: Option<f64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisFlag {
    pub id: i64,
    pub organization_id: i64,
    pub flag_key: String,
    pub scope: String,
    pub scope_id: Option<i64>,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewAnalysisJob {
    pub submission_id: i64,
    pub problem_id: i64,
    pub user_id: Uuid,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
    pub contest_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisEvent {
    pub submission_id: i64,
    pub problem_id: i64,
    pub user_id: Uuid,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
    pub contest_id: Option<i64>,
    pub verdict: String,
    pub runtime_ms: i64,
    pub memory_mb: i64,
    pub language: String,
}

/// Submission metadata needed to create an analysis job.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct SubmissionMeta {
    pub user_id: Uuid,
    pub problem_id: i64,
    pub organization_id: i64,
}
