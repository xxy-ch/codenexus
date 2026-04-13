use async_trait::async_trait;
use crate::error::AppError;
use uuid::Uuid;

/// Summary type for leaderboard entries.
#[derive(Debug, Clone)]
pub struct LeaderboardEntry {
    pub user_id: Uuid,
    pub username: String,
    pub organization_id: i64,
    pub total_score: i64,
    pub solved_count: i64,
    pub submissions_count: i64,
    pub rank: i64,
}

/// Filter for leaderboard queries
#[derive(Debug, Clone, Default)]
pub struct LeaderboardFilter {
    pub organization_id: Option<i64>,
    pub problem_id: Option<i64>,
    pub contest_id: Option<i64>,
    pub class_id: Option<i64>,
    pub limit: u32,
    pub offset: u32,
}

/// Summary of a best AC submission
#[derive(Debug, Clone)]
pub struct BestAcSubmission {
    pub submission_id: i64,
    pub runtime_ms: i32,
    pub memory_kb: i32,
    pub submitted_at: chrono::DateTime<chrono::Utc>,
}

/// Repository interface for leaderboard domain operations.
#[async_trait]
pub trait LeaderboardRepo: Send + Sync {
    async fn get_global(&self, filter: LeaderboardFilter) -> Result<Vec<LeaderboardEntry>, AppError>;
    async fn get_by_problem(&self, problem_id: i64, filter: LeaderboardFilter) -> Result<Vec<LeaderboardEntry>, AppError>;
    async fn get_by_contest(&self, contest_id: i64, filter: LeaderboardFilter) -> Result<Vec<LeaderboardEntry>, AppError>;
    async fn get_by_class(&self, class_id: i64, filter: LeaderboardFilter) -> Result<Vec<LeaderboardEntry>, AppError>;
    async fn get_best_ac_submission(&self, user_id: Uuid, problem_id: i64) -> Result<Option<BestAcSubmission>, AppError>;
    async fn get_user_rank(&self, user_id: Uuid, organization_id: i64) -> Result<Option<i64>, AppError>;
}
