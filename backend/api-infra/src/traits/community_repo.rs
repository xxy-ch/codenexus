use crate::error::AppError;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// Summary type for discussion references.
#[derive(Debug, Clone)]
pub struct DiscussionSummary {
    pub id: i64,
    pub problem_id: i64,
    pub user_id: Uuid,
    pub content: String,
    pub is_pinned: bool,
    pub created_at: DateTime<Utc>,
    pub reply_count: i64,
}

/// Summary type for blog article references.
#[derive(Debug, Clone)]
pub struct BlogArticleSummary {
    pub id: i64,
    pub author_id: Uuid,
    pub title: String,
    pub content: String,
    pub is_published: bool,
    pub organization_id: i64,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Summary of a conversation
#[derive(Debug, Clone)]
pub struct ConversationSummary {
    pub other_user_id: Uuid,
    pub other_username: String,
    pub last_message: Option<String>,
    pub last_message_at: Option<DateTime<Utc>>,
    pub unread_count: i64,
}

/// Summary of a direct message
#[derive(Debug, Clone)]
pub struct MessageSummary {
    pub id: i64,
    pub sender_id: Uuid,
    pub receiver_id: Uuid,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub is_read: bool,
}

/// Input for creating a discussion
#[derive(Debug, Clone)]
pub struct CreateDiscussionInput {
    pub problem_id: i64,
    pub user_id: Uuid,
    pub content: String,
    pub parent_id: Option<i64>,
}

/// Input for creating a blog article
#[derive(Debug, Clone)]
pub struct CreateBlogArticleInput {
    pub author_id: Uuid,
    pub title: String,
    pub content: String,
    pub is_published: bool,
    pub organization_id: i64,
    pub tags: Vec<String>,
}

/// Input for creating a direct message
#[derive(Debug, Clone)]
pub struct CreateMessageInput {
    pub sender_id: Uuid,
    pub receiver_id: Uuid,
    pub content: String,
}

/// Filter for listing discussions
#[derive(Debug, Clone, Default)]
pub struct DiscussionFilter {
    pub problem_id: Option<i64>,
    pub user_id: Option<Uuid>,
    pub limit: u32,
    pub offset: u32,
}

/// Filter for listing blog articles
#[derive(Debug, Clone, Default)]
pub struct BlogFilter {
    pub organization_id: Option<i64>,
    pub author_id: Option<Uuid>,
    pub is_published: Option<bool>,
    pub tag: Option<String>,
    pub limit: u32,
    pub offset: u32,
}

/// Repository interface for community domain operations (discussions, blogs, messages).
#[async_trait]
pub trait CommunityRepo: Send + Sync {
    // Discussions
    async fn create_discussion(&self, input: CreateDiscussionInput) -> Result<i64, AppError>;
    async fn find_discussion_by_id(&self, id: i64) -> Result<Option<DiscussionSummary>, AppError>;
    async fn list_discussions(
        &self,
        filter: DiscussionFilter,
    ) -> Result<Vec<DiscussionSummary>, AppError>;
    async fn delete_discussion(&self, id: i64) -> Result<(), AppError>;

    // Blog articles
    async fn create_article(&self, input: CreateBlogArticleInput) -> Result<i64, AppError>;
    async fn find_article_by_id(&self, id: i64) -> Result<Option<BlogArticleSummary>, AppError>;
    async fn list_articles(&self, filter: BlogFilter) -> Result<Vec<BlogArticleSummary>, AppError>;
    async fn update_article(
        &self,
        id: i64,
        input: serde_json::Value,
    ) -> Result<BlogArticleSummary, AppError>;
    async fn delete_article(&self, id: i64) -> Result<(), AppError>;

    // Direct messages
    async fn send_message(&self, input: CreateMessageInput) -> Result<i64, AppError>;
    async fn list_conversations(&self, user_id: Uuid)
        -> Result<Vec<ConversationSummary>, AppError>;
    async fn list_messages(
        &self,
        user_id: Uuid,
        other_user_id: Uuid,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<MessageSummary>, AppError>;
}
