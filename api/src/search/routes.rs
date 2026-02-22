// Search API routes
use super::models::*;
use super::service::SearchService;
use crate::auth::middleware::jwt_auth;
use crate::db::Pool;
use axum::{
    extract::State,
    Json, Query,
};
use utoipa::Path;

/// Search state
#[derive(Clone)]
pub struct SearchState {
    pub pool: Pool,
}

/// Search endpoint
///
/// Performs full-text search across discussions and articles
#[utoipa::path(
    get,
    path = "/api/search",
    tag = "search",
    params(
        ("q" = String, Query, description = "Search query"),
        ("type" = Option<String>, Query, description = "Content type filter (all, discussion, article)"),
        ("category" = Option<String>, Query, description = "Category filter (for articles)"),
        ("tag" = Option<String>, Query, description = "Tag filter"),
        ("author_id" = Option<String>, Query, description = "Author ID filter"),
        ("sort" = Option<String>, Query, description = "Sort order (relevance, latest, popular)"),
        ("page" = Option<u32>, Query, description = "Page number"),
        ("limit" = Option<u32>, Query, description = "Results per page"),
    ),
    responses(
        (status = 200, description = "Search results", body = SearchResponse),
        (status = 400, description = "Invalid request"),
        (status = 500, description = "Internal server error"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn search(
    State(state): State<SearchState>,
    Query(query): Query<SearchQuery>,
) -> Result<Json<SearchResponse>, axum::http::StatusCode> {
    let service = SearchService::new(state.pool);

    match service.search(query).await {
        Ok(results) => Ok(Json(results)),
        Err(err) => {
            eprintln!("Search error: {:?}", err);
            Err(axum::http::StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Search suggestions endpoint
///
/// Get search suggestions including tags and categories
#[utoipa::path(
    get,
    path = "/api/search/suggestions",
    tag = "search",
    params(
        ("q" = String, Query, description = "Search query for suggestions"),
    ),
    responses(
        (status = 200, description = "Search suggestions", body = SearchSuggestionsResponse),
        (status = 400, description = "Invalid request"),
        (status = 500, description = "Internal server error"),
    )
)]
pub async fn search_suggestions(
    State(state): State<SearchState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<SearchSuggestionsResponse>, axum::http::StatusCode> {
    let query = params.get("q").map(|s| s.as_str()).unwrap_or("");
    let service = SearchService::new(state.pool);

    match service.get_suggestions(query, None).await {
        Ok(suggestions) => Ok(Json(suggestions)),
        Err(err) => {
            eprintln!("Search suggestions error: {:?}", err);
            Err(axum::http::StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Create search router
pub fn create_search_router(pool: Pool) -> axum::Router {
    let state = SearchState { pool };

    axum::Router::new()
        .route("/", axum::routing::get(search))
        .route("/suggestions", axum::routing::get(search_suggestions))
        .with_state(state)
}
