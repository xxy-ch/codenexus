use async_trait::async_trait;
use crate::error::AppError;

/// A single search result item.
#[derive(Debug, Clone)]
pub struct SearchResultItem {
    pub id: String,
    pub title: String,
    pub content: String,
    pub item_type: String,  // "problem", "discussion", "blog", "contest"
    pub score: f64,
    pub organization_id: i64,
}

/// Search results with pagination.
#[derive(Debug, Clone)]
pub struct SearchResults {
    pub results: Vec<SearchResultItem>,
    pub total: i64,
    pub page: i32,
    pub limit: i32,
}

/// Filter for search queries
#[derive(Debug, Clone)]
pub struct SearchFilter {
    pub query: String,
    pub item_type: Option<String>,
    pub category: Option<String>,
    pub tag: Option<String>,
    pub author_id: Option<uuid::Uuid>,
    pub sort: String,
    pub page: i32,
    pub limit: i32,
}

/// Repository interface for search domain operations.
#[async_trait]
pub trait SearchRepo: Send + Sync {
    async fn search(&self, filter: SearchFilter, organization_id: Option<i64>, is_teacher: bool) -> Result<SearchResults, AppError>;
    async fn index_problem(&self, problem_id: i64, title: &str, content: &str, organization_id: i64) -> Result<(), AppError>;
    async fn index_discussion(&self, discussion_id: i64, problem_id: i64, content: &str, organization_id: i64) -> Result<(), AppError>;
    async fn index_article(&self, article_id: i64, title: &str, content: &str, organization_id: i64) -> Result<(), AppError>;
    async fn remove_index(&self, item_type: &str, item_id: i64) -> Result<(), AppError>;
}
