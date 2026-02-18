use super::{models::*, service::SubmissionService};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Deserialize;
use crate::AppState;
use crate::middleware::auth::AuthExtractor;

pub fn submissions_router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/", axum::routing::post(create_submission))
        .route("/", axum::routing::get(list_submissions))
        .route("/stats", axum::routing::get(get_submission_stats))
        .route("/:id", axum::routing::get(get_submission))
        .route("/:id/results", axum::routing::post(update_judge_result))
}

#[derive(Debug, Deserialize)]
struct ListSubmissionsQuery {
    problem_id: Option<i64>,
    status: Option<String>,
    language: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
}

async fn create_submission(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(req): Json<CreateSubmissionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = if let Some(redis_pool) = &state.redis_pool {
        SubmissionService::with_redis(state.db_pool, redis_pool.clone())
    } else {
        SubmissionService::new(state.db_pool)
    };
    let submission = service.create_submission(claims.sub, req).await?;
    Ok(Json(submission))
}

async fn list_submissions(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Query(query): Query<ListSubmissionsQuery>,
) -> Result<impl IntoResponse, AppError> {
    let service = SubmissionService::new(state.db_pool);
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.offset.unwrap_or(0);

    let (submissions, total) = service.list_submissions(
        claims.sub,
        query.problem_id,
        query.status,
        query.language,
        limit,
        offset,
    ).await?;

    Ok(Json(serde_json::json!({
        "submissions": submissions,
        "total": total,
        "limit": limit,
        "offset": offset,
    })))
}

async fn get_submission_stats(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<impl IntoResponse, AppError> {
    let service = SubmissionService::new(state.db_pool);
    let stats = service.get_user_submission_stats(claims.sub).await?;
    Ok(Json(stats))
}

async fn get_submission(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, AppError> {
    let service = SubmissionService::new(state.db_pool);
    let submission = service.get_submission(id, claims.sub).await?;
    Ok(Json(submission))
}

/// Judge result callback from judge-worker
/// This endpoint is called by the judge-worker after processing a submission
#[derive(Debug, Deserialize)]
pub struct JudgeResultCallback {
    pub submission_id: i64,
    pub status: String,
    pub score: Option<i32>,
    pub runtime_ms: Option<i32>,
    pub memory_kb: Option<i32>,
    pub test_case_results: Vec<TestCaseResultCallback>,
}

#[derive(Debug, Deserialize)]
pub struct TestCaseResultCallback {
    pub test_case_id: i64,
    pub status: String,
    pub expected_output: Option<String>,
    pub actual_output: Option<String>,
    pub error_message: Option<String>,
    pub runtime_ms: Option<i32>,
    pub memory_kb: Option<i32>,
}

async fn update_judge_result(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(result): Json<JudgeResultCallback>,
) -> Result<impl IntoResponse, AppError> {
    let service = SubmissionService::new(state.db_pool);

    // Update submission status and score
    service.update_judge_result(
        id,
        &result.status,
        result.score,
        result.runtime_ms,
        result.memory_kb,
    ).await?;

    // Store test case results
    for test_result in result.test_case_results {
        service.store_test_case_result(
            id,
            test_result.test_case_id,
            &test_result.status,
            test_result.expected_output,
            test_result.actual_output,
            test_result.error_message,
            test_result.runtime_ms,
            test_result.memory_kb,
        ).await?;
    }

    Ok(Json(serde_json::json!({
        "message": "Judge result updated successfully",
        "submission_id": id,
        "status": result.status,
    })))
}

#[derive(Debug)]
pub enum AppError {
    Auth(String),
    Submission(String),
    Database(String),
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::Auth(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::Submission(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Database(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        let body = Json(serde_json::json!({
            "error": message,
            "status": status.as_u16(),
        }));

        (status, body).into_response()
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::Internal(err.to_string())
    }
}