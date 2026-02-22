// Search module models
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Search query parameters
#[derive(Debug, Deserialize, ToSchema)]
pub struct SearchQuery {
    /// Search query string
    pub q: String,

    /// Content type filter (all, discussion, article)
    #[serde(default = "default_search_type")]
    pub r#type: String,

    /// Category filter (for articles)
    pub category: Option<String>,

    /// Tag filter
    pub tag: Option<String>,

    /// Author ID filter
    pub author_id: Option<String>,

    /// Sort order (relevance, latest, popular)
    #[serde(default = "default_search_sort")]
    pub sort: String,

    /// Page number
    #[serde(default = "default_page")]
    pub page: u32,

    /// Results per page
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_search_type() -> String {
    "all".to_string()
}

fn default_search_sort() -> String {
    "relevance".to_string()
}

fn default_page() -> u32 {
    1
}

fn default_limit() -> u32 {
    20
}

/// Search result item
#[derive(Debug, Serialize, ToSchema)]
#[serde(tag = "type")]
pub enum SearchResultItem {
    Discussion(DiscussionSearchResult),
    Article(ArticleSearchResult),
}

/// Discussion search result
#[derive(Debug, Serialize, ToSchema)]
pub struct DiscussionSearchResult {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub author_id: String,
    pub author_username: String,
    pub tags: Vec<String>,
    pub problem_id: Option<i64>,
    pub is_solved: bool,
    pub is_pinned: bool,
    pub reply_count: i64,
    pub like_count: i64,
    pub view_count: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub relevance_score: f32,
    pub highlighted_title: Option<String>,
    pub highlighted_content: Option<String>,
}

/// Article search result
#[derive(Debug, Serialize, ToSchema)]
pub struct ArticleSearchResult {
    pub id: i64,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub excerpt: String,
    pub author_id: String,
    pub author_username: String,
    pub tags: Vec<String>,
    pub category: Option<String>,
    pub is_featured: bool,
    pub is_published: bool,
    pub like_count: i64,
    pub comment_count: i64,
    pub view_count: i64,
    pub published_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub relevance_score: f32,
    pub highlighted_title: Option<String>,
    pub highlighted_content: Option<String>,
}

/// Search response
#[derive(Debug, Serialize, ToSchema)]
pub struct SearchResponse {
    pub query: String,
    pub results: Vec<SearchResultItem>,
    pub total_count: u64,
    pub discussion_count: u64,
    pub article_count: u64,
    pub page: u32,
    pub limit: u32,
    pub has_more: bool,
}

/// Search suggestion
#[derive(Debug, Serialize, ToSchema)]
pub struct SearchSuggestion {
    pub text: String,
    pub r#type: String, // "tag", "category", "recent"
    pub count: u64,
}

/// Search suggestions response
#[derive(Debug, Serialize, ToSchema)]
pub struct SearchSuggestionsResponse {
    pub query: String,
    pub suggestions: Vec<SearchSuggestion>,
}
