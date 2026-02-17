use super::{models::*, service::SubmissionService};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;
use crate::AppState;

pub fn submissions_router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/", axum::routing::post(create_submission))
        .route("/", axum::routing::get(list_submissions))
        .route("/stats", axum::routing::get(get_submission_stats))
        .route("/:id", axum::routing::get(get_submission))
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
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateSubmissionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = extract_user_id_from_headers(&headers)?;
    let service = SubmissionService::new(state.db_pool);
    let submission = service.create_submission(user_id, req).await?;
    Ok(Json(submission))
}

async fn list_submissions(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Query(query): Query<ListSubmissionsQuery>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = extract_user_id_from_headers(&headers)?;
    let service = SubmissionService::new(state.db_pool);
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.offset.unwrap_or(0);

    let (submissions, total) = service.list_submissions(
        user_id,
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
    headers: axum::http::HeaderMap,
) -> Result<impl IntoResponse, AppError> {
    let user_id = extract_user_id_from_headers(&headers)?;
    let service = SubmissionService::new(state.db_pool);
    let stats = service.get_user_submission_stats(user_id).await?;
    Ok(Json(stats))
}

async fn get_submission(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = extract_user_id_from_headers(&headers)?;
    let service = SubmissionService::new(state.db_pool);
    let submission = service.get_submission(id, user_id).await?;
    Ok(Json(submission))
}

fn extract_user_id_from_headers(headers: &axum::http::HeaderMap) -> Result<Uuid, AppError> {
    let auth_header = headers
        .get("authorization")
        .ok_or_else(|| AppError::Auth("Missing authorization header".to_string()))?;

    let token = auth_header
        .to_str()
        .map_err(|_| AppError::Auth("Invalid authorization header".to_string()))?
        .strip_prefix("Bearer ")
        .ok_or_else(|| AppError::Auth("Invalid authorization format".to_string()))?;

    Uuid::parse_str(token).map_err(|_| AppError::Auth("Invalid token".to_string()))
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