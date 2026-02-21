use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Article model
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Article {
    pub id: i64,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub summary: Option<String>,
    pub cover_image: Option<String>,
    pub author_id: Uuid,
    pub tags: Vec<String>,
    pub category: String,
    pub is_published: bool,
    pub is_featured: bool,
    pub view_count: i64,
    pub like_count: i64,
    pub comment_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
}

/// Article comment model
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ArticleComment {
    pub id: i64,
    pub article_id: i64,
    pub parent_id: Option<i64>,
    pub content: String,
    pub author_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Create article request
#[derive(Debug, Deserialize)]
pub struct CreateArticleRequest {
    pub title: String,
    pub content: String,
    pub summary: Option<String>,
    pub cover_image: Option<String>,
    pub tags: Vec<String>,
    pub category: Option<String>,
    pub is_published: Option<bool>,
    pub is_featured: Option<bool>,
}

/// Update article request
#[derive(Debug, Deserialize)]
pub struct UpdateArticleRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub summary: Option<String>,
    pub cover_image: Option<String>,
    pub tags: Option<Vec<String>>,
    pub category: Option<String>,
    pub is_published: Option<bool>,
    pub is_featured: Option<bool>,
}

/// Article filters
#[derive(Debug, Deserialize)]
pub struct ArticleFilters {
    pub author_id: Option<Uuid>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_published: Option<bool>,
    pub is_featured: Option<bool>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub sort: Option<String>, // 'recent', 'popular', 'trending'
}

/// Article list response
#[derive(Debug, Serialize)]
pub struct ArticleListResponse {
    pub articles: Vec<Article>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub pages: i64,
}

/// Article detail with comments
#[derive(Debug, Serialize)]
pub struct ArticleDetail {
    pub article: Article,
    pub comments: Vec<ArticleComment>,
}

/// Create comment request
#[derive(Debug, Deserialize)]
pub struct CreateCommentRequest {
    pub content: String,
    pub parent_id: Option<i64>,
}

/// Like request
#[derive(Debug, Deserialize)]
pub struct LikeRequest {
    pub target_type: String, // 'article' or 'comment'
    pub target_id: i64,
}
