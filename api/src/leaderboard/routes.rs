use super::models::*;
use super::service::LeaderboardService;
use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    Router,
    routing::get,
};
use uuid::Uuid;

pub fn leaderboard_router() -> Router<AppState> {
    Router::new()
        .route("/global", get(get_global_leaderboard))
        .route("/school/:school_id", get(get_school_leaderboard))
        .route("/campus/:campus_id", get(get_campus_leaderboard))
        .route("/class/:class_id", get(get_class_leaderboard))
        .route("/user/:user_id/stats", get(get_user_stats))
        .route("/problem/:problem_id", get(get_problem_leaderboard))
}

/// Get global leaderboard
pub async fn get_global_leaderboard(
    State(state): State<AppState>,
    Query(query): Query<LeaderboardQuery>,
) -> Result<Json<LeaderboardResponse>, StatusCode> {
    let service = LeaderboardService::new(
        state.db_pool.clone(),
        &state.redis_url,
    ).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let leaderboard = service
        .get_global_leaderboard(query)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(leaderboard))
}

/// Get school leaderboard
pub async fn get_school_leaderboard(
    State(state): State<AppState>,
    Path(school_id): Path<i64>,
    Query(query): Query<LeaderboardQuery>,
) -> Result<Json<LeaderboardResponse>, StatusCode> {
    let service = LeaderboardService::new(
        state.db_pool.clone(),
        &state.redis_url,
    ).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let leaderboard = service
        .get_school_leaderboard(school_id, query)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(leaderboard))
}

/// Get campus leaderboard
pub async fn get_campus_leaderboard(
    State(state): State<AppState>,
    Path(campus_id): Path<i64>,
    Query(query): Query<LeaderboardQuery>,
) -> Result<Json<LeaderboardResponse>, StatusCode> {
    let service = LeaderboardService::new(
        state.db_pool.clone(),
        &state.redis_url,
    ).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let leaderboard = service
        .get_campus_leaderboard(campus_id, query)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(leaderboard))
}

/// Get class leaderboard
pub async fn get_class_leaderboard(
    State(state): State<AppState>,
    Path(class_id): Path<i64>,
    Query(query): Query<LeaderboardQuery>,
) -> Result<Json<LeaderboardResponse>, StatusCode> {
    let service = LeaderboardService::new(
        state.db_pool.clone(),
        &state.redis_url,
    ).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let leaderboard = service
        .get_class_leaderboard(class_id, query)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(leaderboard))
}

/// Get user statistics
pub async fn get_user_stats(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<UserStats>, StatusCode> {
    let service = LeaderboardService::new(
        state.db_pool.clone(),
        &state.redis_url,
    ).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let stats = service
        .get_user_stats(user_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(stats))
}

/// Get problem leaderboard (fastest solvers)
pub async fn get_problem_leaderboard(
    State(state): State<AppState>,
    Path(problem_id): Path<Uuid>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<ProblemLeaderboardEntry>>, StatusCode> {
    let limit: i64 = params
        .get("limit")
        .and_then(|l| l.parse().ok())
        .unwrap_or(10)
        .min(100);

    let service = LeaderboardService::new(
        state.db_pool.clone(),
        &state.redis_url,
    ).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let leaderboard = service
        .get_problem_leaderboard(problem_id, limit)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(leaderboard))
}
