use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Clone)]
pub struct SearchQuery {
    pub q: Option<String>,
    #[serde(default = "default_search_type", rename = "type")]
    pub r#type: String,
    pub category: Option<String>,
    pub tag: Option<String>,
    pub author_id: Option<String>,
    #[serde(default = "default_sort")]
    pub sort: String,
    #[serde(default = "default_page")]
    pub page: u32,
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_search_type() -> String {
    "all".to_string()
}

fn default_page() -> u32 {
    1
}

fn default_limit() -> u32 {
    20
}

fn default_sort() -> String {
    "relevance".to_string()
}

#[derive(Debug, Serialize)]
pub struct SearchResultItem {
    pub id: i64,
    pub title: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub slug: Option<String>,
    pub author_id: Option<String>,
    pub author_username: String,
    pub tags: Vec<String>,
    pub category: Option<String>,
    pub difficulty: Option<String>,
    pub problem_id: Option<i64>,
    pub is_solved: Option<bool>,
    pub is_pinned: Option<bool>,
    pub is_featured: Option<bool>,
    pub is_published: Option<bool>,
    pub reply_count: Option<i64>,
    pub like_count: i64,
    pub comment_count: Option<i64>,
    pub view_count: i64,
    pub created_at: String,
    pub published_at: Option<String>,
    pub relevance_score: f64,
    pub highlighted_title: Option<String>,
    pub highlighted_content: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub query: String,
    pub results: Vec<SearchResultItem>,
    pub total_count: u64,
    pub problem_count: u64,
    pub discussion_count: u64,
    pub article_count: u64,
    pub page: u32,
    pub limit: u32,
    pub has_more: bool,
}

#[derive(Debug, Serialize)]
pub struct SearchSuggestion {
    pub text: String,
    #[serde(rename = "type")]
    pub suggestion_type: String,
    pub count: u64,
}

#[derive(Debug, Serialize)]
pub struct SearchSuggestionsResponse {
    pub query: String,
    pub suggestions: Vec<SearchSuggestion>,
}
