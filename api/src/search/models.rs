use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Clone)]
pub struct SearchQuery {
    pub q: Option<String>,
    #[serde(default = "default_search_type", rename = "type")]
    pub r#type: String,
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

#[derive(Debug, Serialize)]
pub struct SearchResultItem {
    pub id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub item_type: String,
}

#[derive(Debug, Serialize)]
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
