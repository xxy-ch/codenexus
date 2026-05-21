use crate::error::AppError;
use async_trait::async_trait;
use uuid::Uuid;

/// Summary type for submission references.
#[derive(Debug, Clone)]
pub struct SubmissionSummary {
    pub id: i64,
    pub user_id: Uuid,
    pub problem_id: i64,
    pub contest_id: Option<i64>,
    pub status: String,
    pub score: Option<i32>,
    pub runtime_ms: Option<i32>,
    pub memory_kb: Option<i32>,
    pub language: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Input for creating a submission
#[derive(Debug, Clone)]
pub struct CreateSubmissionInput {
    pub user_id: Uuid,
    pub problem_id: i64,
    pub contest_id: Option<i64>,
    pub language: String,
    pub code: String,
}

/// Input for saving a test case result
#[derive(Debug, Clone)]
pub struct TestCaseResultInput {
    pub test_case_id: i64,
    pub status: String,
    pub time_ms: Option<i32>,
    pub memory_kb: Option<i32>,
    pub output: Option<String>,
    pub error_message: Option<String>,
}

/// Filter for listing submissions
#[derive(Debug, Clone, Default)]
pub struct SubmissionFilter {
    pub user_id: Option<Uuid>,
    pub problem_id: Option<i64>,
    pub contest_id: Option<i64>,
    pub status: Option<String>,
    pub organization_id: Option<i64>,
    pub limit: u32,
    pub offset: u32,
}

/// Repository interface for submission domain operations.
#[async_trait]
pub trait SubmissionRepo: Send + Sync {
    async fn find_by_id(&self, id: i64) -> Result<Option<SubmissionSummary>, AppError>;
    async fn create(&self, input: CreateSubmissionInput) -> Result<i64, AppError>;
    async fn update_status(
        &self,
        id: i64,
        status: &str,
        score: Option<i32>,
        runtime_ms: Option<i32>,
        memory_kb: Option<i32>,
    ) -> Result<(), AppError>;
    async fn list(&self, filter: SubmissionFilter) -> Result<Vec<SubmissionSummary>, AppError>;
    async fn count_by_user(&self, user_id: Uuid) -> Result<i64, AppError>;
    async fn count_by_problem(&self, problem_id: i64) -> Result<i64, AppError>;
    async fn get_user_submission_count(&self, user_id: Uuid) -> Result<i64, AppError>;
    async fn save_test_case_results(
        &self,
        submission_id: i64,
        results: Vec<TestCaseResultInput>,
    ) -> Result<(), AppError>;
}
