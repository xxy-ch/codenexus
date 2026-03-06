use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::middleware::auth::AuthExtractor;
use crate::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct SimilarityScanConfig {
    pub enabled: bool,
    pub language: String,
    pub threshold: f64,
    pub min_token_length: i32,
    pub window_size: i32,
    pub ignore_comments: bool,
    pub ignore_whitespace: bool,
    pub max_reports_per_run: i32,
}

#[derive(Debug, Serialize)]
pub struct PlagiarismPair {
    pub left_submission_id: String,
    pub right_submission_id: String,
    pub left_user: String,
    pub right_user: String,
    pub similarity: f64,
    pub matched_lines: i32,
}

#[derive(Debug, Serialize)]
pub struct PlagiarismReport {
    pub id: String,
    pub contest_id: Option<String>,
    pub assignment_id: Option<String>,
    pub status: String,
    pub overall_risk: String,
    pub created_at: String,
    pub finished_at: Option<String>,
    pub total_submissions: i32,
    pub suspicious_pairs: i32,
    pub top_pairs: Vec<PlagiarismPair>,
}

#[derive(Debug, Serialize)]
pub struct PlagiarismReportListResponse {
    pub reports: Vec<PlagiarismReport>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[derive(Debug, Deserialize)]
pub struct RunScanRequest {
    pub contest_id: Option<String>,
    pub assignment_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RunScanResponse {
    pub report_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

pub fn plagiarism_router() -> Router<AppState> {
    Router::new()
        .route("/config", get(get_config).put(update_config))
        .route("/scan", post(run_scan))
        .route("/reports", get(list_reports))
        .route("/reports/:report_id", get(get_report_detail))
}

async fn get_config(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<Json<SimilarityScanConfig>, StatusCode> {
    ensure_admin(&claims)?;
    ensure_default_config(&state).await?;

    let row = sqlx::query(
        r#"
        SELECT enabled, language, threshold, min_token_length, window_size,
               ignore_comments, ignore_whitespace, max_reports_per_run
        FROM plagiarism_scan_configs
        WHERE id = 1
        "#,
    )
    .fetch_one(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(SimilarityScanConfig {
        enabled: row.get::<bool, _>("enabled"),
        language: row.get::<String, _>("language"),
        threshold: row.get::<f64, _>("threshold"),
        min_token_length: row.get::<i32, _>("min_token_length"),
        window_size: row.get::<i32, _>("window_size"),
        ignore_comments: row.get::<bool, _>("ignore_comments"),
        ignore_whitespace: row.get::<bool, _>("ignore_whitespace"),
        max_reports_per_run: row.get::<i32, _>("max_reports_per_run"),
    }))
}

async fn update_config(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(req): Json<SimilarityScanConfig>,
) -> Result<Json<SimilarityScanConfig>, StatusCode> {
    ensure_admin(&claims)?;
    ensure_default_config(&state).await?;

    sqlx::query(
        r#"
        UPDATE plagiarism_scan_configs
        SET enabled = $1,
            language = $2,
            threshold = $3,
            min_token_length = $4,
            window_size = $5,
            ignore_comments = $6,
            ignore_whitespace = $7,
            max_reports_per_run = $8,
            updated_at = NOW()
        WHERE id = 1
        "#,
    )
    .bind(req.enabled)
    .bind(req.language.clone())
    .bind(req.threshold)
    .bind(req.min_token_length)
    .bind(req.window_size)
    .bind(req.ignore_comments)
    .bind(req.ignore_whitespace)
    .bind(req.max_reports_per_run)
    .execute(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(req))
}

async fn run_scan(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(req): Json<RunScanRequest>,
) -> Result<Json<RunScanResponse>, StatusCode> {
    ensure_admin(&claims)?;

    let report_id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO plagiarism_scan_reports
            (id, contest_id, assignment_id, status, overall_risk, total_submissions, suspicious_pairs, finished_at)
        VALUES
            ($1, $2, $3, 'completed', 'low', 0, 0, NOW())
        "#,
    )
    .bind(report_id)
    .bind(req.contest_id)
    .bind(req.assignment_id)
    .execute(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(RunScanResponse {
        report_id: report_id.to_string(),
    }))
}

async fn list_reports(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Query(query): Query<ListQuery>,
) -> Result<Json<PlagiarismReportListResponse>, StatusCode> {
    ensure_admin(&claims)?;

    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;

    let total = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM plagiarism_scan_reports")
        .fetch_one(&state.db_pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let rows = sqlx::query(
        r#"
        SELECT id, contest_id, assignment_id, status, overall_risk,
               created_at::text AS created_at,
               finished_at::text AS finished_at,
               total_submissions, suspicious_pairs
        FROM plagiarism_scan_reports
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut reports = Vec::with_capacity(rows.len());
    for row in rows {
        let report_id = row.get::<Uuid, _>("id");
        let top_pairs = fetch_top_pairs(&state, report_id, 5).await?;

        reports.push(PlagiarismReport {
            id: report_id.to_string(),
            contest_id: row.get::<Option<String>, _>("contest_id"),
            assignment_id: row.get::<Option<String>, _>("assignment_id"),
            status: row.get::<String, _>("status"),
            overall_risk: row.get::<String, _>("overall_risk"),
            created_at: row.get::<String, _>("created_at"),
            finished_at: row.get::<Option<String>, _>("finished_at"),
            total_submissions: row.get::<i32, _>("total_submissions"),
            suspicious_pairs: row.get::<i32, _>("suspicious_pairs"),
            top_pairs,
        });
    }

    Ok(Json(PlagiarismReportListResponse {
        reports,
        total,
        page,
        limit,
    }))
}

async fn get_report_detail(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(report_id): Path<Uuid>,
) -> Result<Json<PlagiarismReport>, StatusCode> {
    ensure_admin(&claims)?;

    let row = sqlx::query(
        r#"
        SELECT id, contest_id, assignment_id, status, overall_risk,
               created_at::text AS created_at,
               finished_at::text AS finished_at,
               total_submissions, suspicious_pairs
        FROM plagiarism_scan_reports
        WHERE id = $1
        "#,
    )
    .bind(report_id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let row = row.ok_or(StatusCode::NOT_FOUND)?;
    let top_pairs = fetch_top_pairs(&state, report_id, 100).await?;

    Ok(Json(PlagiarismReport {
        id: row.get::<Uuid, _>("id").to_string(),
        contest_id: row.get::<Option<String>, _>("contest_id"),
        assignment_id: row.get::<Option<String>, _>("assignment_id"),
        status: row.get::<String, _>("status"),
        overall_risk: row.get::<String, _>("overall_risk"),
        created_at: row.get::<String, _>("created_at"),
        finished_at: row.get::<Option<String>, _>("finished_at"),
        total_submissions: row.get::<i32, _>("total_submissions"),
        suspicious_pairs: row.get::<i32, _>("suspicious_pairs"),
        top_pairs,
    }))
}

async fn fetch_top_pairs(
    state: &AppState,
    report_id: Uuid,
    limit: i64,
) -> Result<Vec<PlagiarismPair>, StatusCode> {
    let rows = sqlx::query(
        r#"
        SELECT left_submission_id, right_submission_id,
               left_user, right_user, similarity, matched_lines
        FROM plagiarism_scan_pairs
        WHERE report_id = $1
        ORDER BY similarity DESC
        LIMIT $2
        "#,
    )
    .bind(report_id)
    .bind(limit)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let pairs = rows
        .into_iter()
        .map(|row| PlagiarismPair {
            left_submission_id: row.get::<String, _>("left_submission_id"),
            right_submission_id: row.get::<String, _>("right_submission_id"),
            left_user: row.get::<String, _>("left_user"),
            right_user: row.get::<String, _>("right_user"),
            similarity: row.get::<f64, _>("similarity"),
            matched_lines: row.get::<i32, _>("matched_lines"),
        })
        .collect();

    Ok(pairs)
}

async fn ensure_default_config(state: &AppState) -> Result<(), StatusCode> {
    sqlx::query(
        r#"
        INSERT INTO plagiarism_scan_configs
            (id, enabled, language, threshold, min_token_length, window_size,
             ignore_comments, ignore_whitespace, max_reports_per_run)
        VALUES
            (1, true, 'all', 0.85, 5, 30, true, true, 100)
        ON CONFLICT (id) DO NOTHING
        "#,
    )
    .execute(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(())
}

fn ensure_admin(claims: &shared::models::Claims) -> Result<(), StatusCode> {
    if claims.role == "admin" {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}
