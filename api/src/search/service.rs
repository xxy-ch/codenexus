use super::models::*;
use anyhow::Result;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct SearchService {
    _pool: PgPool,
    _redis_url: Option<String>,
}

impl SearchService {
    pub fn new(pool: PgPool) -> Self {
        Self {
            _pool: pool,
            _redis_url: None,
        }
    }

    pub fn with_redis(pool: PgPool, redis_url: &str) -> Result<Self> {
        Ok(Self {
            _pool: pool,
            _redis_url: Some(redis_url.to_string()),
        })
    }

    pub async fn save_recent_search(&self, _user_id: Uuid, _q: &str) -> Result<()> {
        Ok(())
    }

    pub async fn search(&self, query: SearchQuery) -> Result<SearchResponse> {
        let q = query.q.unwrap_or_default();

        Ok(SearchResponse {
            query: q,
            results: Vec::new(),
            total_count: 0,
            discussion_count: 0,
            article_count: 0,
            page: query.page,
            limit: query.limit,
            has_more: false,
        })
    }

    pub async fn get_suggestions(&self, query: &str, _user_id: Option<&str>) -> Result<SearchSuggestionsResponse> {
        Ok(SearchSuggestionsResponse {
            query: query.to_string(),
            suggestions: Vec::new(),
        })
    }
}
