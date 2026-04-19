use crate::error::AppError;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// Summary type for contest references.
#[derive(Debug, Clone)]
pub struct ContestSummary {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub rules: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub freeze_minutes: Option<i32>,
    pub created_by: Uuid,
    pub status: String,
}

/// Input for creating a contest
#[derive(Debug, Clone)]
pub struct CreateContestInput {
    pub name: String,
    pub description: Option<String>,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub rules: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub freeze_minutes: Option<i32>,
    pub created_by: Uuid,
}

/// Filter for listing contests
#[derive(Debug, Clone, Default)]
pub struct ContestFilter {
    pub organization_id: Option<i64>,
    pub status: Option<String>,
    pub limit: u32,
    pub offset: u32,
}

/// Summary of a contest problem
#[derive(Debug, Clone)]
pub struct ContestProblemSummary {
    pub contest_id: i64,
    pub problem_id: i64,
    pub order: i32,
    pub title: String,
    pub difficulty: String,
}

/// Repository interface for contest domain operations.
#[async_trait]
pub trait ContestRepo: Send + Sync {
    async fn find_by_id(&self, id: i64) -> Result<Option<ContestSummary>, AppError>;
    async fn create(&self, input: CreateContestInput) -> Result<i64, AppError>;
    async fn update(&self, id: i64, input: serde_json::Value) -> Result<ContestSummary, AppError>;
    async fn delete(&self, id: i64) -> Result<(), AppError>;
    async fn list(&self, filter: ContestFilter) -> Result<Vec<ContestSummary>, AppError>;
    async fn register_participant(&self, contest_id: i64, user_id: Uuid) -> Result<(), AppError>;
    async fn unregister_participant(&self, contest_id: i64, user_id: Uuid) -> Result<(), AppError>;
    async fn is_participant(&self, contest_id: i64, user_id: Uuid) -> Result<bool, AppError>;
    async fn list_participants(&self, contest_id: i64) -> Result<Vec<Uuid>, AppError>;
    async fn add_problem(
        &self,
        contest_id: i64,
        problem_id: i64,
        order: i32,
    ) -> Result<(), AppError>;
    async fn list_problems(&self, contest_id: i64) -> Result<Vec<ContestProblemSummary>, AppError>;
}
