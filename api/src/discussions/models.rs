use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Discussion model
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Discussion {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub author_id: Uuid,
    pub problem_id: Option<i64>,
    pub contest_id: Option<i64>,
    pub tags: Vec<String>,
    pub is_pinned: bool,
    pub is_solved: bool,
    pub is_locked: bool,
    pub view_count: i64,
    pub reply_count: i64,
    pub like_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Discussion reply model
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DiscussionReply {
    pub id: i64,
    pub discussion_id: i64,
    pub parent_id: Option<i64>,
    pub content: String,
    pub author_id: Uuid,
    pub like_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Create discussion request
#[derive(Debug, Deserialize)]
pub struct CreateDiscussionRequest {
    pub title: String,
    pub content: String,
    pub problem_id: Option<i64>,
    pub contest_id: Option<i64>,
    pub tags: Vec<String>,
}

/// Update discussion request
#[derive(Debug, Deserialize)]
pub struct UpdateDiscussionRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_solved: Option<bool>,
    pub is_locked: Option<bool>,
}

/// Create reply request
#[derive(Debug, Deserialize)]
pub struct CreateReplyRequest {
    pub content: String,
    pub parent_id: Option<i64>,
}

/// Discussion filters
#[derive(Debug, Deserialize)]
pub struct DiscussionFilters {
    pub problem_id: Option<i64>,
    pub contest_id: Option<i64>,
    pub tags: Option<Vec<String>>,
    pub author_id: Option<Uuid>,
    pub is_pinned: Option<bool>,
    pub is_solved: Option<bool>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub sort: Option<String>, // 'recent', 'popular', 'unanswered'
}

/// Discussion list response
#[derive(Debug, Serialize)]
pub struct DiscussionListResponse {
    pub discussions: Vec<Discussion>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub pages: i64,
}

/// Discussion detail with replies
#[derive(Debug, Serialize)]
pub struct DiscussionDetail {
    pub discussion: Discussion,
    pub replies: Vec<DiscussionReply>,
}

/// Like request
#[derive(Debug, Deserialize)]
pub struct LikeRequest {
    pub target_type: String, // 'discussion' or 'reply'
    pub target_id: i64,
}
