use crate::models::*;
use crate::service::LeaderboardService;
use api_infra::middleware::auth::AuthExtractor;
use api_infra::state::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use shared::models::role::Role;
use uuid::Uuid;

fn is_admin(role: &str) -> bool {
    role.parse::<Role>()
        .map(|r| r.is_higher_or_equal(Role::CampusAdmin))
        .unwrap_or(false)
}

fn is_teacher_plus(role: &str) -> bool {
    role.parse::<Role>()
        .map(|r| r.is_higher_or_equal(Role::Teacher))
        .unwrap_or(false)
}

pub fn leaderboard_router() -> Router<AppState> {
    Router::new()
        .route("/global", get(get_global_leaderboard))
        .route("/school/:school_id", get(get_school_leaderboard))
        .route("/campus/:campus_id", get(get_campus_leaderboard))
        .route("/class/:class_id", get(get_class_leaderboard))
        .route("/user/:user_id/stats", get(get_user_stats))
        .route("/problem/:problem_id", get(get_problem_leaderboard))
}

/// Get global leaderboard.
/// SEC-03: Non-admin users see only their organization's leaderboard.
pub async fn get_global_leaderboard(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Query(query): Query<LeaderboardQuery>,
) -> Result<Json<LeaderboardResponse>, StatusCode> {
    // SEC-03: scope to user's organization unless admin
    let school_id = if is_admin(&claims.role) {
        None
    } else {
        Some(claims.school_id)
    };

    let service = LeaderboardService::new(state.db_pool.clone(), state.redis_pool.clone())
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let leaderboard = service
        .get_global_leaderboard(query, school_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(leaderboard))
}

/// Get school leaderboard -- claims.school_id must match, or admin
pub async fn get_school_leaderboard(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(school_id): Path<i64>,
    Query(query): Query<LeaderboardQuery>,
) -> Result<Json<LeaderboardResponse>, StatusCode> {
    // Visibility: claims.school_id == school_id OR admin
    if claims.school_id != school_id && !is_admin(&claims.role) {
        return Err(StatusCode::FORBIDDEN);
    }

    let service = LeaderboardService::new(state.db_pool.clone(), state.redis_pool.clone())
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let leaderboard = service
        .get_school_leaderboard(school_id, query)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(leaderboard))
}

/// Get campus leaderboard -- claims.campus_id must match AND same org, or admin
pub async fn get_campus_leaderboard(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(campus_id): Path<i64>,
    Query(query): Query<LeaderboardQuery>,
) -> Result<Json<LeaderboardResponse>, StatusCode> {
    // Visibility: claims.campus_id == Some(campus_id) OR admin
    if claims.campus_id != Some(campus_id) && !is_admin(&claims.role) {
        return Err(StatusCode::FORBIDDEN);
    }
    // Additional: verify campus belongs to user's org (prevent cross-tenant with shared campus IDs)
    let campus_org = sqlx::query_scalar::<_, i64>(
        "SELECT organization_id FROM classes WHERE campus_id = $1 LIMIT 1",
    )
    .bind(campus_id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if let Some(org_id) = campus_org {
        if org_id != claims.school_id && !is_admin(&claims.role) {
            return Err(StatusCode::FORBIDDEN);
        }
    }

    let service = LeaderboardService::new(state.db_pool.clone(), state.redis_pool.clone())
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let leaderboard = service
        .get_campus_leaderboard(campus_id, query)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(leaderboard))
}

/// Get class leaderboard -- user must be class member OR teacher/admin in same org
pub async fn get_class_leaderboard(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(class_id): Path<i64>,
    Query(query): Query<LeaderboardQuery>,
) -> Result<Json<LeaderboardResponse>, StatusCode> {
    // First: verify the class belongs to user's org
    let class_org =
        sqlx::query_scalar::<_, i64>("SELECT organization_id FROM classes WHERE id = $1")
            .bind(class_id)
            .fetch_optional(&state.db_pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match class_org {
        Some(org_id) if org_id == claims.school_id || is_admin(&claims.role) => {}
        Some(_) => return Err(StatusCode::FORBIDDEN),
        None => return Err(StatusCode::NOT_FOUND),
    }

    // Visibility: user is class member OR teacher/admin
    if !is_teacher_plus(&claims.role) && !is_admin(&claims.role) {
        // Student: verify enrollment via D-06 trait (no domain-classes dependency)
        let students = state
            .class_membership_checker
            .get_class_student_ids(class_id)
            .await
            .map_err(|_| StatusCode::NOT_FOUND)?;
        let is_member = students.contains(&claims.sub);
        if !is_member {
            return Err(StatusCode::FORBIDDEN);
        }
    }

    let service = LeaderboardService::new(state.db_pool.clone(), state.redis_pool.clone())
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let leaderboard = service
        .get_class_leaderboard(class_id, query)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(leaderboard))
}

/// Get user statistics -- own stats, or teacher/admin of same org
pub async fn get_user_stats(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(user_id): Path<Uuid>,
) -> Result<Json<UserStats>, StatusCode> {
    // Visibility: claims.sub == user_id OR teacher/admin of same org
    if claims.sub != user_id {
        if !is_teacher_plus(&claims.role) && !is_admin(&claims.role) {
            return Err(StatusCode::FORBIDDEN);
        }
        // Verify the target user belongs to the same organization
        let target_org =
            sqlx::query_scalar::<_, i64>("SELECT organization_id FROM users WHERE id = $1")
                .bind(user_id)
                .fetch_optional(&state.db_pool)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        match target_org {
            Some(org_id) if org_id == claims.school_id || is_admin(&claims.role) => {}
            Some(_) => return Err(StatusCode::FORBIDDEN),
            None => return Err(StatusCode::NOT_FOUND),
        }
    }

    let service = LeaderboardService::new(state.db_pool.clone(), state.redis_pool.clone())
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let stats = service
        .get_user_stats(user_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(stats))
}

/// Get problem leaderboard (fastest solvers).
/// SEC-03: Non-admin users see only solvers from their organization.
pub async fn get_problem_leaderboard(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(problem_id): Path<i64>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<ProblemLeaderboardEntry>>, StatusCode> {
    let limit: i64 = params
        .get("limit")
        .and_then(|l| l.parse().ok())
        .unwrap_or(10)
        .min(100);

    // SEC-03: scope to user's organization unless admin
    let school_id = if is_admin(&claims.role) {
        None
    } else {
        Some(claims.school_id)
    };

    let service = LeaderboardService::new(state.db_pool.clone(), state.redis_pool.clone())
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let leaderboard = service
        .get_problem_leaderboard(problem_id, limit, school_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(leaderboard))
}
