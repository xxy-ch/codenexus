use super::models::*;
use super::service::SearchService;
use crate::middleware::auth::AuthExtractor;
use axum::{
    extract::{Query, State},
    Json, Router,
};

pub async fn search(
    State(state): State<crate::AppState>,
    Query(query): Query<SearchQuery>,
    auth: Option<AuthExtractor>,
) -> Result<Json<SearchResponse>, axum::http::StatusCode> {
    let pool = state.db_pool.clone();
    let service = SearchService::with_redis(pool.clone(), &state.redis_url)
        .unwrap_or_else(|_| SearchService::new(pool));

    if let (Some(auth), Some(q)) = (auth, query.q.as_ref()) {
        if !q.is_empty() {
            let _ = service.save_recent_search(auth.0.sub, q).await;
        }
    }

    service
        .search(query)
        .await
        .map(Json)
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn search_suggestions(
    State(state): State<crate::AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
    auth: Option<AuthExtractor>,
) -> Result<Json<SearchSuggestionsResponse>, axum::http::StatusCode> {
    let query = params.get("q").map(String::as_str).unwrap_or("");
    let user_id = auth.as_ref().map(|claims| claims.0.sub.to_string());

    let pool = state.db_pool.clone();
    let service = SearchService::with_redis(pool.clone(), &state.redis_url)
        .unwrap_or_else(|_| SearchService::new(pool));

    service
        .get_suggestions(query, user_id.as_deref())
        .await
        .map(Json)
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)
}

pub fn create_search_router(_pool: sqlx::PgPool, _redis_url: String) -> Router<crate::AppState> {
    Router::new()
        .route("/", axum::routing::get(search))
        .route("/suggestions", axum::routing::get(search_suggestions))
}
