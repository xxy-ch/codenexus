use crate::error::AppError;
use async_trait::async_trait;
use uuid::Uuid;

/// Service interface for cross-domain submission queries.
/// Used by leaderboard and notification modules to query submission data.
#[async_trait]
pub trait SubmissionService: Send + Sync {
    /// Get the total number of submissions by a user.
    async fn get_user_submission_count(&self, user_id: Uuid) -> Result<i64, AppError>;
    /// Get the number of accepted (AC) submissions by a user.
    async fn get_user_accepted_count(&self, user_id: Uuid) -> Result<i64, AppError>;
    /// Check if a user has an accepted submission for a specific problem.
    async fn has_accepted_submission(
        &self,
        user_id: Uuid,
        problem_id: i64,
    ) -> Result<bool, AppError>;
}
