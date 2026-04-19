use crate::error::AppError;
use async_trait::async_trait;
use uuid::Uuid;

/// Service interface for cross-domain notification operations.
/// Used by submissions, contests, and community modules to send notifications.
#[async_trait]
pub trait NotificationService: Send + Sync {
    /// Send an in-app notification to a user.
    async fn send_notification(
        &self,
        user_id: Uuid,
        title: String,
        message: String,
        notification_type: String,
    ) -> Result<(), AppError>;
    /// Send a notification to multiple users.
    async fn send_bulk_notification(
        &self,
        user_ids: &[Uuid],
        title: String,
        message: String,
        notification_type: String,
    ) -> Result<(), AppError>;
    /// Mark a notification as read.
    async fn mark_as_read(&self, notification_id: i64, user_id: Uuid) -> Result<(), AppError>;
    /// Get unread notification count for a user.
    async fn get_unread_count(&self, user_id: Uuid) -> Result<i64, AppError>;
}
