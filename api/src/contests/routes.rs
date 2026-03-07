use super::models::*;
use crate::middleware::auth::AuthExtractor;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    Json as JsonVec,
};
use crate::AppState;
use uuid::Uuid;

/// List contests with filtering
pub async fn list_contests(
    State(state): State<AppState>,
    Query(query): Query<ListContestsQuery>,
) -> Result<Json<ContestsListResponse>, StatusCode> {
    let service = crate::contests::service::ContestService::new(state.db_pool);

    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);

    let (contests, total) = service
        .list_contests(
            query.organization_id,
            query.campus_id,
            query.active,
            page,
            limit,
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ContestsListResponse {
        contests,
        total,
        page,
        limit,
    }))
}

/// Get contest details
pub async fn get_contest(
    State(state): State<AppState>,
    Path(contest_id): Path<i64>,
) -> Result<Json<ContestDetail>, StatusCode> {
    let service = crate::contests::service::ContestService::new(state.db_pool);

    let contest = service
        .get_contest(contest_id)
        .await
        .map_err(|err| {
            if err.to_string().contains("Contest not found") {
                StatusCode::NOT_FOUND
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            }
        })?;

    Ok(Json(contest))
}

/// Create a new contest
pub async fn create_contest(
    State(state): State<AppState>,
    AuthExtractor(_claims): AuthExtractor,
    Json(req): Json<CreateContestRequest>,
) -> Result<Json<Contest>, StatusCode> {
    let service = crate::contests::service::ContestService::new(state.db_pool);

    let contest = service
        .create_contest(req)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(contest))
}

/// Update a contest
pub async fn update_contest(
    State(state): State<AppState>,
    AuthExtractor(_claims): AuthExtractor,
    Path(contest_id): Path<i64>,
    Json(req): Json<UpdateContestRequest>,
) -> Result<Json<Contest>, StatusCode> {
    let service = crate::contests::service::ContestService::new(state.db_pool);

    let contest = service
        .update_contest(contest_id, req)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(contest))
}

/// Delete a contest
pub async fn delete_contest(
    State(state): State<AppState>,
    AuthExtractor(_claims): AuthExtractor,
    Path(contest_id): Path<i64>,
) -> Result<StatusCode, StatusCode> {
    let service = crate::contests::service::ContestService::new(state.db_pool);

    service
        .delete_contest(contest_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(StatusCode::NO_CONTENT)
}

/// Add problem to contest
pub async fn add_problem_to_contest(
    State(state): State<AppState>,
    AuthExtractor(_claims): AuthExtractor,
    Path(contest_id): Path<i64>,
    Json(req): Json<AddProblemToContestRequest>,
) -> Result<Json<ContestProblem>, StatusCode> {
    let service = crate::contests::service::ContestService::new(state.db_pool);

    let contest_problem = service
        .add_problem_to_contest(contest_id, req)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(contest_problem))
}

/// Get contest problems
pub async fn get_contest_problems(
    State(state): State<AppState>,
    Path(contest_id): Path<i64>,
) -> Result<Json<Vec<ContestProblemDetail>>, StatusCode> {
    let service = crate::contests::service::ContestService::new(state.db_pool);

    let problems = service
        .get_contest_problems(contest_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(problems))
}

/// Remove problem from contest
pub async fn remove_problem_from_contest(
    State(state): State<AppState>,
    AuthExtractor(_claims): AuthExtractor,
    Path((contest_id, problem_id)): Path<(i64, i64)>,
) -> Result<StatusCode, StatusCode> {
    let service = crate::contests::service::ContestService::new(state.db_pool);

    service
        .remove_problem_from_contest(contest_id, problem_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(StatusCode::NO_CONTENT)
}

/// Get contest rankings/standings
pub async fn get_contest_rankings(
    State(state): State<AppState>,
    Path(contest_id): Path<i64>,
) -> Result<Json<Vec<ContestRankingEntry>>, StatusCode> {
    let service = crate::contests::service::ContestService::new(state.db_pool);

    let rankings = service
        .get_contest_rankings(contest_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(rankings))
}

/// Get contest status
pub async fn get_contest_status(
    State(state): State<AppState>,
    Path(contest_id): Path<i64>,
) -> Result<Json<ContestStatus>, StatusCode> {
    let service = crate::contests::service::ContestService::new(state.db_pool);

    let status = service
        .get_contest_status(contest_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(status))
}

/// Register for contest
pub async fn register_for_contest(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(contest_id): Path<i64>,
) -> Result<Json<ContestParticipant>, StatusCode> {
    let service = crate::contests::service::ContestService::new(state.db_pool);

    let participant = service
        .register_for_contest(contest_id, claims.sub)
        .await
        .map_err(|e| {
            if e.to_string().contains("Already registered") {
                StatusCode::CONFLICT
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            }
        })?;

    Ok(Json(participant))
}

/// Get contest participants
pub async fn get_contest_participants(
    State(state): State<AppState>,
    Path(contest_id): Path<i64>,
) -> Result<Json<Vec<ContestParticipant>>, StatusCode> {
    let service = crate::contests::service::ContestService::new(state.db_pool);

    let participants = service
        .get_contest_participants(contest_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(participants))
}

/// Link submission to contest (internal use by judge system)
pub async fn link_submission(
    State(state): State<AppState>,
    Path((contest_id, submission_id)): Path<(i64, i64)>,
) -> Result<Json<ContestSubmission>, StatusCode> {
    let service = crate::contests::service::ContestService::new(state.db_pool);

    let contest_submission = service
        .link_submission_to_contest(contest_id, submission_id)
        .await
        .map_err(|e| {
            if e.to_string().contains("not active") {
                StatusCode::FORBIDDEN
            } else if e.to_string().contains("not found") {
                StatusCode::NOT_FOUND
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            }
        })?;

    Ok(Json(contest_submission))
}

pub fn contests_router() -> axum::Router<AppState> {
    use axum::routing::{get, post, put, delete};

    axum::Router::new()
        .route("/", get(list_contests).post(create_contest))
        .route("/:id", get(get_contest).put(update_contest).delete(delete_contest))
        .route(
            "/:id/problems",
            get(get_contest_problems).post(add_problem_to_contest),
        )
        .route(
            "/:id/problems/:problem_id",
            delete(remove_problem_from_contest),
        )
        .route("/:id/rankings", get(get_contest_rankings))
        .route("/:id/status", get(get_contest_status))
        .route("/:id/register", post(register_for_contest))
        .route("/:id/participants", get(get_contest_participants))
        .route("/:id/submissions/:submission_id", post(link_submission))
}
