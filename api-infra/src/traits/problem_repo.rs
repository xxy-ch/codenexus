use async_trait::async_trait;
use crate::error::AppError;
use uuid::Uuid;

/// Summary type for cross-domain problem references.
/// Full `Problem` model lives in the domain crate.
#[derive(Debug, Clone)]
pub struct ProblemSummary {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub difficulty: String,
    pub time_limit_ms: i32,
    pub memory_limit_kb: i32,
    pub visibility: String,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub author_id: Option<Uuid>,
    pub tags: Vec<String>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Input for creating a problem
#[derive(Debug, Clone)]
pub struct CreateProblemInput {
    pub title: String,
    pub description: String,
    pub difficulty: String,
    pub time_limit_ms: i32,
    pub memory_limit_kb: i32,
    pub visibility: String,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub author_id: Uuid,
    pub tags: Vec<String>,
}

/// Input for creating a test case
#[derive(Debug, Clone)]
pub struct CreateTestCaseInput {
    pub problem_id: i64,
    pub input: String,
    pub expected_output: String,
    pub is_sample: bool,
    pub score: Option<i32>,
}

/// Summary of a test case
#[derive(Debug, Clone)]
pub struct TestCaseSummary {
    pub id: i64,
    pub problem_id: i64,
    pub input: String,
    pub expected_output: String,
    pub is_sample: bool,
    pub score: Option<i32>,
}

/// Filter for listing problems
#[derive(Debug, Clone, Default)]
pub struct ProblemFilter {
    pub organization_id: Option<i64>,
    pub visibility: Option<String>,
    pub difficulty: Option<String>,
    pub tag: Option<String>,
    pub search: Option<String>,
    pub limit: u32,
    pub offset: u32,
}

/// Repository interface for problem domain operations.
#[async_trait]
pub trait ProblemRepo: Send + Sync {
    async fn find_by_id(&self, id: i64) -> Result<Option<ProblemSummary>, AppError>;
    async fn find_by_ids(&self, ids: &[i64]) -> Result<Vec<ProblemSummary>, AppError>;
    async fn exists(&self, id: i64) -> Result<bool, AppError>;
    async fn create(&self, input: CreateProblemInput) -> Result<i64, AppError>;
    async fn update(&self, id: i64, input: serde_json::Value) -> Result<ProblemSummary, AppError>;
    async fn delete(&self, id: i64) -> Result<(), AppError>;
    async fn list(&self, filter: ProblemFilter) -> Result<Vec<ProblemSummary>, AppError>;
    async fn count_by_organization(&self, organization_id: i64) -> Result<i64, AppError>;
    async fn add_test_case(&self, problem_id: i64, input: CreateTestCaseInput) -> Result<i64, AppError>;
    async fn get_test_cases(&self, problem_id: i64) -> Result<Vec<TestCaseSummary>, AppError>;
}
