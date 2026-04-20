use super::models::*;
use super::service::SearchService;
use api_infra::middleware::auth::AuthExtractor;
use api_infra::middleware::tenant::TenantContext;
use api_infra::state::AppState;
use axum::{
    extract::{Query, State},
    Extension, Json, Router,
};
use shared::models::role::Role;

fn is_teacher_plus(role: &str) -> bool {
    role.parse::<Role>()
        .map(|r| r.is_higher_or_equal(Role::Teacher))
        .unwrap_or(false)
}

fn is_root(role: &str) -> bool {
    role.parse::<Role>()
        .map(|r| r == Role::Root)
        .unwrap_or(false)
}

pub async fn search(
    State(state): State<AppState>,
    Query(query): Query<SearchQuery>,
    auth: Option<AuthExtractor>,
    tenant_ctx: Option<Extension<TenantContext>>,
) -> Result<Json<SearchResponse>, axum::http::StatusCode> {
    let pool = state.db_pool.clone();
    let service = SearchService::with_redis(pool.clone(), &state.redis_url)
        .unwrap_or_else(|_| SearchService::new(pool));

    // Extract tenant info from claims if authenticated
    let (school_id, teacher_plus, root) = auth
        .as_ref()
        .map(|AuthExtractor(claims)| {
            (
                Some(claims.school_id),
                is_teacher_plus(&claims.role),
                is_root(&claims.role),
            )
        })
        .unwrap_or((None, false, false));

    // D-08: GradeAdmin grade scoping — must have grade assignment
    let grade_id = auth
        .as_ref()
        .and_then(|AuthExtractor(claims)| {
            if claims.role == "gradeadmin" {
                tenant_ctx.as_ref().map(|Extension(ctx)| ctx.grade_id)
            } else {
                None
            }
        })
        .flatten();

    // Reject gradeadmin without grade assignment (scope bypass)
    if let Some(AuthExtractor(claims)) = auth.as_ref() {
        if claims.role == "gradeadmin" && grade_id.is_none() {
            return Err(axum::http::StatusCode::FORBIDDEN);
        }
    }

    // Save recent search for authenticated users
    if let (Some(AuthExtractor(claims)), Some(q)) = (auth, query.q.as_ref()) {
        if !q.is_empty() {
            let _ = service.save_recent_search(claims.sub, q).await;
        }
    }

    service
        .search_tenant_aware(query, school_id, teacher_plus, root, grade_id)
        .await
        .map(Json)
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn search_suggestions(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
    auth: Option<AuthExtractor>,
) -> Result<Json<SearchSuggestionsResponse>, axum::http::StatusCode> {
    let query = params.get("q").map(String::as_str).unwrap_or("");

    let pool = state.db_pool.clone();
    let service = SearchService::with_redis(pool.clone(), &state.redis_url)
        .unwrap_or_else(|_| SearchService::new(pool));

    let (school_id, root) = auth
        .as_ref()
        .map(|AuthExtractor(claims)| {
            let is_root = is_root(&claims.role);
            if is_root {
                (None, true)
            } else {
                (Some(claims.school_id), false)
            }
        })
        .unwrap_or((None, false));

    service
        .get_suggestions(query, school_id, root)
        .await
        .map(Json)
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)
}

pub fn search_router() -> Router<AppState> {
    Router::new()
        .route("/", axum::routing::get(search))
        .route("/suggestions", axum::routing::get(search_suggestions))
}
