use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    #[serde(rename = "type")]
    pub notification_type: NotificationType,
    pub title: String,
    pub content: String,
    pub link: Option<String>,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,

    // Optional foreign keys
    pub actor_id: Option<Uuid>,
    pub discussion_id: Option<Uuid>,
    pub article_id: Option<Uuid>,
    pub comment_id: Option<Uuid>,

    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
pub enum NotificationType {
    Reply,
    Comment,
    Like,
    System,
    Mention,
}

#[derive(Debug, Deserialize)]
pub struct ListNotificationsQuery {
    pub unread_only: Option<bool>,
    pub notification_type: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct MarkAsReadRequest {
    pub notification_ids: Vec<Uuid>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct NotificationSettings {
    pub user_id: Option<Uuid>,
    pub email_notifications: bool,
    pub reply_notifications: bool,
    pub comment_notifications: bool,
    pub like_notifications: bool,
    pub mention_notifications: bool,
    pub system_notifications: bool,
    pub digest_mode: String,
}

#[derive(Debug, Serialize)]
pub struct NotificationStatsResponse {
    pub total_count: i64,
    pub unread_count: i64,
    pub by_type: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct NotificationsListResponse {
    pub notifications: Vec<Notification>,
    pub total: i64,
    pub unread_count: i64,
    pub limit: i64,
    pub offset: i64,
}
