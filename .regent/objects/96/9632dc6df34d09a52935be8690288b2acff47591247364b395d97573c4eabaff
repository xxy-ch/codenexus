use crate::models::*;
use crate::service::SubmissionService;
use api_infra::error::AppError;
use api_infra::middleware::auth::AuthExtractor;
use api_infra::state::AppState;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;

pub fn submissions_router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/", axum::routing::post(create_submission))
        .route("/", axum::routing::get(list_submissions))
        .route("/stats", axum::routing::get(get_submission_stats))
        .route("/:id", axum::routing::get(get_submission))
}

pub fn worker_results_router() -> axum::Router<AppState> {
    axum::Router::new().route("/:id/results", axum::routing::post(update_judge_result))
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
    let submission = service
        .create_submission(claims.sub, claims.school_id, req)
        .await?;
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

    let (submissions, total) = service
        .list_submissions(
            claims.sub,
            query.problem_id,
            query.status,
            query.language,
            limit,
            offset,
        )
        .await?;

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
    let submission = service.get_submission(id, claims.sub).await.map_err(|err| {
        if err.to_string().contains("Submission not found") {
            AppError::NotFound("Submission not found".to_string())
        } else {
            AppError::Internal(err.to_string())
        }
    })?;
    Ok(Json(submission))
}

/// Judge result callback from judge-worker
/// Secured via X-Worker-Secret header, path/body ID validation, state machine, and idempotency.
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
    headers: HeaderMap,
    Path(id): Path<i64>,
    Json(result): Json<JudgeResultCallback>,
) -> Result<impl IntoResponse, AppError> {
    // 1. Auth: verify X-Worker-Secret header (constant-time comparison)
    let provided_secret = headers
        .get("X-Worker-Secret")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let expected = state.worker_secret.as_bytes();
    let provided = provided_secret.as_bytes();
    let secret_valid = provided.len() == expected.len()
        && provided
            .iter()
            .zip(expected.iter())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
            == 0;
    if !secret_valid {
        return Err(AppError::Auth("Invalid or missing worker secret".into()));
    }

    // 2. Path/body ID match
    if id != result.submission_id {
        return Err(AppError::Validation(
            "Path ID does not match submission_id in body".into(),
        ));
    }

    let service = SubmissionService::new(state.db_pool);

    // 3. Map callback test cases into service-layer input structs.
    let test_case_inputs: Vec<crate::service::TestCaseResultInput> = result
        .test_case_results
        .iter()
        .map(|tc| crate::service::TestCaseResultInput {
            test_case_id: tc.test_case_id,
            status: tc.status.clone(),
            runtime_ms: tc.runtime_ms,
            memory_kb: tc.memory_kb,
        })
        .collect();

    // 4. Execute the entire update within a single transaction (SELECT FOR UPDATE → UPDATE → INSERT → COMMIT).
    match service
        .update_judge_result_transactional(
            id,
            &result.status,
            result.score,
            result.runtime_ms,
            result.memory_kb,
            &test_case_inputs,
        )
        .await
    {
        Ok(crate::service::JudgeUpdateOutcome::Updated) => Ok(Json(serde_json::json!({
            "message": "Judge result updated successfully",
            "submission_id": id,
            "status": result.status,
        }))),
        Ok(crate::service::JudgeUpdateOutcome::AlreadyProcessed) => Ok(Json(serde_json::json!({
            "message": "Judge result already processed (idempotent)",
            "submission_id": id,
            "status": SubmissionService::normalize_judge_status(&result.status),
        }))),
        Err(crate::service::JudgeUpdateError::NotFound) => {
            Err(AppError::Validation("Submission not found".into()))
        }
        Err(crate::service::JudgeUpdateError::TerminalState { current_status }) => {
            Err(AppError::Validation(format!(
                "Submission {} is in terminal state '{}' and cannot be overwritten",
                id, current_status
            )))
        }
        Err(crate::service::JudgeUpdateError::InvalidTransition {
            current_status,
            target_status,
        }) => Err(AppError::Validation(format!(
            "Invalid state transition from '{}' to '{}'",
            current_status, target_status
        ))),
        Err(crate::service::JudgeUpdateError::InvalidTestCaseStatus { status }) => Err(
            AppError::Validation(format!("Unsupported test case status: {}", status)),
        ),
        Err(crate::service::JudgeUpdateError::Database(err)) => {
            tracing::error!(submission_id = id, error = %err, "Database error during transactional judge result update");
            Err(AppError::Database(format!(
                "Failed to update judge result for submission {}: {}",
                id, err
            )))
        }
    }
}
