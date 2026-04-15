use crate::models::*;
use crate::service::ContestService;
use api_infra::middleware::auth::AuthExtractor;
use api_infra::state::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use shared::models::role::Role;

fn require_teacher_plus(role: &str) -> Result<Role, StatusCode> {
    let role = role.parse::<Role>().map_err(|_| StatusCode::FORBIDDEN)?;
    if !role.is_higher_or_equal(Role::Teacher) {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(role)
}

fn is_admin(role: &str) -> bool {
    role.parse::<Role>()
        .map(|r| r.is_higher_or_equal(Role::OrganizationAdmin))
        .unwrap_or(false)
}

/// Verify tenant scope for a contest.
async fn verify_contest_tenant(
    service: &ContestService,
    contest_id: i64,
    school_id: i64,
) -> Result<ContestDetail, StatusCode> {
    let contest = service.get_contest(contest_id).await.map_err(|err| {
        if err.to_string().contains("Contest not found") {
            StatusCode::NOT_FOUND
        } else {
            StatusCode::INTERNAL_SERVER_ERROR
        }
    })?;
    if contest.organization_id != school_id {
        return Err(StatusCode::NOT_FOUND);
    }
    Ok(contest)
}

/// List contests with filtering — tenant-scoped to user's organization
pub async fn list_contests(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Query(mut query): Query<ListContestsQuery>,
) -> Result<Json<ContestsListResponse>, StatusCode> {
    // Tenant: force organization_id from claims
    query.organization_id = Some(claims.school_id);
    let service = ContestService::new(state.db_pool);

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

/// Get contest details — tenant-scoped
pub async fn get_contest(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(contest_id): Path<i64>,
) -> Result<Json<ContestDetail>, StatusCode> {
    let service = ContestService::new(state.db_pool);
    let contest = verify_contest_tenant(&service, contest_id, claims.school_id).await?;
    Ok(Json(contest))
}

/// Create a new contest — teacher_plus, tenant-scoped
pub async fn create_contest(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(mut req): Json<CreateContestRequest>,
) -> Result<Json<Contest>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    // Tenant: force organization_id from claims
    req.organization_id = claims.school_id;
    let service = ContestService::new(state.db_pool);

    let contest = service
        .create_contest(req)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(contest))
}

/// Update a contest — teacher_plus + tenant scope
pub async fn update_contest(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(contest_id): Path<i64>,
    Json(req): Json<UpdateContestRequest>,
) -> Result<Json<Contest>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let service = ContestService::new(state.db_pool);
    verify_contest_tenant(&service, contest_id, claims.school_id).await?;

    let contest = service
        .update_contest(contest_id, req)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(contest))
}

/// Delete a contest — teacher_plus + tenant scope
pub async fn delete_contest(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(contest_id): Path<i64>,
) -> Result<StatusCode, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let service = ContestService::new(state.db_pool);
    verify_contest_tenant(&service, contest_id, claims.school_id).await?;

    service
        .delete_contest(contest_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(StatusCode::NO_CONTENT)
}

/// Add problem to contest — teacher_plus + tenant scope
pub async fn add_problem_to_contest(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(contest_id): Path<i64>,
    Json(req): Json<AddProblemToContestRequest>,
) -> Result<Json<ContestProblem>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let service = ContestService::new(state.db_pool);
    verify_contest_tenant(&service, contest_id, claims.school_id).await?;

    let contest_problem = service
        .add_problem_to_contest(contest_id, req)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(contest_problem))
}

/// Get contest problems — tenant-scoped
pub async fn get_contest_problems(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(contest_id): Path<i64>,
) -> Result<Json<Vec<ContestProblemDetail>>, StatusCode> {
    let service = ContestService::new(state.db_pool);
    verify_contest_tenant(&service, contest_id, claims.school_id).await?;

    let problems = service
        .get_contest_problems(contest_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(problems))
}

/// Remove problem from contest — teacher_plus + tenant scope
pub async fn remove_problem_from_contest(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path((contest_id, problem_id)): Path<(i64, i64)>,
) -> Result<StatusCode, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let service = ContestService::new(state.db_pool);
    verify_contest_tenant(&service, contest_id, claims.school_id).await?;

    service
        .remove_problem_from_contest(contest_id, problem_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(StatusCode::NO_CONTENT)
}

/// Get contest rankings/standings — tenant-scoped
pub async fn get_contest_rankings(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(contest_id): Path<i64>,
) -> Result<Json<Vec<ContestRankingEntry>>, StatusCode> {
    let service = ContestService::new(state.db_pool);
    verify_contest_tenant(&service, contest_id, claims.school_id).await?;

    let rankings = service
        .get_contest_rankings(contest_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(rankings))
}

/// Get contest status — tenant-scoped
pub async fn get_contest_status(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(contest_id): Path<i64>,
) -> Result<Json<ContestStatus>, StatusCode> {
    let service = ContestService::new(state.db_pool);
    verify_contest_tenant(&service, contest_id, claims.school_id).await?;

    let status = service
        .get_contest_status(contest_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(status))
}

/// Register for contest — any authenticated user, tenant-scoped
pub async fn register_for_contest(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(contest_id): Path<i64>,
) -> Result<Json<ContestParticipant>, StatusCode> {
    let service = ContestService::new(state.db_pool);
    // Verify tenant scope before registering
    verify_contest_tenant(&service, contest_id, claims.school_id).await?;

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

/// Get contest participants — teacher/admin only, tenant-scoped
pub async fn get_contest_participants(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(contest_id): Path<i64>,
) -> Result<Json<Vec<ContestParticipant>>, StatusCode> {
    // Only teachers/admins can view full participant list
    if !is_admin(&claims.role) {
        require_teacher_plus(&claims.role)?;
    }
    let service = ContestService::new(state.db_pool);
    verify_contest_tenant(&service, contest_id, claims.school_id).await?;

    let participants = service
        .get_contest_participants(contest_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(participants))
}

/// Link submission to contest — teacher_plus only, tenant-scoped
pub async fn link_submission(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path((contest_id, submission_id)): Path<(i64, i64)>,
) -> Result<Json<ContestSubmission>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let service = ContestService::new(state.db_pool);
    verify_contest_tenant(&service, contest_id, claims.school_id).await?;

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
    use axum::routing::{delete, get, post};

    axum::Router::new()
        .route("/", get(list_contests).post(create_contest))
        .route(
            "/:id",
            get(get_contest).put(update_contest).delete(delete_contest),
        )
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
