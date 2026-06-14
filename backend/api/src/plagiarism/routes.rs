use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::middleware::auth::AuthExtractor;
use crate::AppState;

#[derive(Debug, Clone)]
struct ScanSubmission {
    id: i64,
    user_id: Uuid,
    username: String,
    problem_id: i64,
    language: String,
    code: String,
}

#[derive(Debug, Clone)]
struct CandidatePair {
    left_submission_id: i64,
    right_submission_id: i64,
    left_user: String,
    right_user: String,
    similarity: f64,
    matched_lines: i32,
}

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
    ensure_default_config(&state).await?;

    if req.contest_id.is_some() && req.assignment_id.is_some() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let config = load_config(&state).await?;
    if !config.enabled {
        return Err(StatusCode::BAD_REQUEST);
    }

    let report_id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO plagiarism_scan_reports
            (id, contest_id, assignment_id, status, overall_risk, total_submissions, suspicious_pairs, organization_id)
        VALUES
            ($1, $2, $3, 'processing', 'low', 0, 0, $4)
        "#,
    )
    .bind(report_id)
    .bind(req.contest_id.clone())
    .bind(req.assignment_id.clone())
    .bind(claims.school_id)
    .execute(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let scan_result = async {
        let submissions = load_scan_submissions(&state, claims.school_id, &config, &req).await?;
        let pairs = find_suspicious_pairs(&submissions, &config);
        persist_scan_pairs(&state, report_id, &pairs).await?;
        finish_report(
            &state,
            report_id,
            submissions.len() as i32,
            pairs.len() as i32,
            &pairs,
        )
        .await
    }
    .await;

    if let Err(status) = scan_result {
        let _ = mark_report_failed(&state, report_id).await;
        return Err(status);
    }

    Ok(Json(RunScanResponse {
        report_id: report_id.to_string(),
    }))
}

async fn load_config(state: &AppState) -> Result<SimilarityScanConfig, StatusCode> {
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

    Ok(SimilarityScanConfig {
        enabled: row.get::<bool, _>("enabled"),
        language: row.get::<String, _>("language"),
        threshold: row.get::<f64, _>("threshold"),
        min_token_length: row.get::<i32, _>("min_token_length"),
        window_size: row.get::<i32, _>("window_size"),
        ignore_comments: row.get::<bool, _>("ignore_comments"),
        ignore_whitespace: row.get::<bool, _>("ignore_whitespace"),
        max_reports_per_run: row.get::<i32, _>("max_reports_per_run"),
    })
}

async fn load_scan_submissions(
    state: &AppState,
    organization_id: i64,
    config: &SimilarityScanConfig,
    req: &RunScanRequest,
) -> Result<Vec<ScanSubmission>, StatusCode> {
    let rows = if let Some(contest_id) = &req.contest_id {
        let contest_id = contest_id
            .parse::<i64>()
            .map_err(|_| StatusCode::BAD_REQUEST)?;
        sqlx::query(
            r#"
            SELECT s.id, s.user_id, COALESCE(u.username, u.email, s.user_id::text) AS username,
                   s.problem_id, s.language, s.code
            FROM submissions s
            JOIN contest_submissions cs ON cs.submission_id = s.id
            JOIN contests c ON c.id = cs.contest_id
            LEFT JOIN users u ON u.id = s.user_id
            WHERE s.organization_id = $1
              AND c.organization_id = $1
              AND cs.contest_id = $2
              AND ($3 = 'all' OR s.language = $3)
            ORDER BY s.problem_id, s.language, s.created_at ASC
            "#,
        )
        .bind(organization_id)
        .bind(contest_id)
        .bind(&config.language)
        .fetch_all(&state.db_pool)
        .await
    } else if let Some(assignment_id) = &req.assignment_id {
        let assignment_id = assignment_id
            .parse::<i64>()
            .map_err(|_| StatusCode::BAD_REQUEST)?;
        sqlx::query(
            r#"
            SELECT s.id, s.user_id, COALESCE(u.username, u.email, s.user_id::text) AS username,
                   s.problem_id, s.language, s.code
            FROM assignments a
            JOIN classes cl ON cl.id = a.class_id
            JOIN class_enrollments ce ON ce.class_id = cl.id
            JOIN submissions s ON s.problem_id = a.problem_id AND s.user_id = ce.student_id
            LEFT JOIN users u ON u.id = s.user_id
            WHERE cl.organization_id = $1
              AND s.organization_id = $1
              AND a.id = $2
              AND ($3 = 'all' OR s.language = $3)
            ORDER BY s.problem_id, s.language, s.created_at ASC
            "#,
        )
        .bind(organization_id)
        .bind(assignment_id)
        .bind(&config.language)
        .fetch_all(&state.db_pool)
        .await
    } else {
        sqlx::query(
            r#"
            SELECT s.id, s.user_id, COALESCE(u.username, u.email, s.user_id::text) AS username,
                   s.problem_id, s.language, s.code
            FROM submissions s
            LEFT JOIN users u ON u.id = s.user_id
            WHERE s.organization_id = $1
              AND ($2 = 'all' OR s.language = $2)
            ORDER BY s.problem_id, s.language, s.created_at ASC
            "#,
        )
        .bind(organization_id)
        .bind(&config.language)
        .fetch_all(&state.db_pool)
        .await
    }
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(rows
        .into_iter()
        .map(|row| ScanSubmission {
            id: row.get("id"),
            user_id: row.get("user_id"),
            username: row.get("username"),
            problem_id: row.get("problem_id"),
            language: row.get("language"),
            code: row.get("code"),
        })
        .collect())
}

fn find_suspicious_pairs(
    submissions: &[ScanSubmission],
    config: &SimilarityScanConfig,
) -> Vec<CandidatePair> {
    let mut pairs = Vec::new();
    for left_idx in 0..submissions.len() {
        for right_idx in (left_idx + 1)..submissions.len() {
            let left = &submissions[left_idx];
            let right = &submissions[right_idx];
            if left.user_id == right.user_id
                || left.problem_id != right.problem_id
                || left.language != right.language
            {
                continue;
            }

            let left_tokens = normalize_tokens(&left.code, config);
            let right_tokens = normalize_tokens(&right.code, config);
            if left_tokens.len() < config.min_token_length as usize
                || right_tokens.len() < config.min_token_length as usize
            {
                continue;
            }

            let similarity = jaccard_similarity(&left_tokens, &right_tokens);
            if similarity >= config.threshold {
                pairs.push(CandidatePair {
                    left_submission_id: left.id,
                    right_submission_id: right.id,
                    left_user: left.username.clone(),
                    right_user: right.username.clone(),
                    similarity,
                    matched_lines: matched_normalized_lines(&left.code, &right.code, config),
                });
            }
        }
    }

    pairs.sort_by(|a, b| b.similarity.total_cmp(&a.similarity));
    pairs.truncate(config.max_reports_per_run.max(0) as usize);
    pairs
}

fn normalize_tokens(code: &str, config: &SimilarityScanConfig) -> Vec<String> {
    normalize_code(code, config)
        .split(|c: char| !c.is_ascii_alphanumeric() && c != '_')
        .filter(|token| token.len() >= config.min_token_length.max(1) as usize)
        .map(str::to_string)
        .collect()
}

fn normalize_code(code: &str, config: &SimilarityScanConfig) -> String {
    let mut normalized = code.to_string();
    if config.ignore_comments {
        normalized = strip_comments(&normalized);
    }
    if config.ignore_whitespace {
        normalized = normalized.split_whitespace().collect::<Vec<_>>().join(" ");
    }
    normalized.to_lowercase()
}

fn strip_comments(code: &str) -> String {
    let mut output = String::with_capacity(code.len());
    let mut chars = code.chars().peekable();
    let mut in_block = false;
    while let Some(ch) = chars.next() {
        if in_block {
            if ch == '*' && chars.peek() == Some(&'/') {
                chars.next();
                in_block = false;
            }
            continue;
        }
        if ch == '/' && chars.peek() == Some(&'/') {
            for next in chars.by_ref() {
                if next == '\n' {
                    output.push('\n');
                    break;
                }
            }
            continue;
        }
        if ch == '/' && chars.peek() == Some(&'*') {
            chars.next();
            in_block = true;
            continue;
        }
        if ch == '#' {
            for next in chars.by_ref() {
                if next == '\n' {
                    output.push('\n');
                    break;
                }
            }
            continue;
        }
        output.push(ch);
    }
    output
}

fn jaccard_similarity(left: &[String], right: &[String]) -> f64 {
    use std::collections::HashSet;
    let left: HashSet<_> = left.iter().collect();
    let right: HashSet<_> = right.iter().collect();
    if left.is_empty() && right.is_empty() {
        return 0.0;
    }
    let intersection = left.intersection(&right).count() as f64;
    let union = left.union(&right).count() as f64;
    if union == 0.0 {
        0.0
    } else {
        intersection / union
    }
}

fn matched_normalized_lines(left: &str, right: &str, config: &SimilarityScanConfig) -> i32 {
    use std::collections::HashSet;
    let normalize_line = |line: &str| -> String {
        if config.ignore_whitespace {
            line.split_whitespace().collect::<Vec<_>>().join(" ")
        } else {
            line.trim().to_string()
        }
    };
    let left_lines: HashSet<String> = strip_comments(left)
        .lines()
        .map(normalize_line)
        .filter(|line| !line.is_empty())
        .collect();
    strip_comments(right)
        .lines()
        .map(normalize_line)
        .filter(|line| !line.is_empty() && left_lines.contains(line))
        .count() as i32
}

async fn persist_scan_pairs(
    state: &AppState,
    report_id: Uuid,
    pairs: &[CandidatePair],
) -> Result<(), StatusCode> {
    for pair in pairs {
        sqlx::query(
            r#"
            INSERT INTO plagiarism_scan_pairs
                (report_id, left_submission_id, right_submission_id, left_user, right_user, similarity, matched_lines)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(report_id)
        .bind(pair.left_submission_id.to_string())
        .bind(pair.right_submission_id.to_string())
        .bind(&pair.left_user)
        .bind(&pair.right_user)
        .bind(pair.similarity)
        .bind(pair.matched_lines)
        .execute(&state.db_pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }
    Ok(())
}

async fn finish_report(
    state: &AppState,
    report_id: Uuid,
    total_submissions: i32,
    suspicious_pairs: i32,
    pairs: &[CandidatePair],
) -> Result<(), StatusCode> {
    let max_similarity = pairs.first().map(|p| p.similarity).unwrap_or(0.0);
    let overall_risk = if max_similarity >= 0.95 || suspicious_pairs >= 5 {
        "high"
    } else if max_similarity >= 0.85 || suspicious_pairs > 0 {
        "medium"
    } else {
        "low"
    };

    sqlx::query(
        r#"
        UPDATE plagiarism_scan_reports
        SET status = 'completed',
            overall_risk = $2,
            total_submissions = $3,
            suspicious_pairs = $4,
            finished_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(report_id)
    .bind(overall_risk)
    .bind(total_submissions)
    .bind(suspicious_pairs)
    .execute(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(())
}

async fn mark_report_failed(state: &AppState, report_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE plagiarism_scan_reports SET status = 'failed', finished_at = NOW() WHERE id = $1",
    )
    .bind(report_id)
    .execute(&state.db_pool)
    .await?;
    Ok(())
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

    // Tenant scoping: root sees all reports; non-root admins see only their
    // organization's reports. Legacy reports with NULL organization_id
    // (created before the column existed) are visible only to root, since we
    // cannot attribute them to a specific tenant.
    let is_root = claims.role == "root";

    let (total, rows) = if is_root {
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

        (total, rows)
    } else {
        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM plagiarism_scan_reports WHERE organization_id = $1",
        )
        .bind(claims.school_id)
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
            WHERE organization_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(claims.school_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.db_pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        (total, rows)
    };

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

    // Tenant scoping: non-root admins can only read their organization's reports.
    // Legacy reports (NULL organization_id) are root-only.
    let is_root = claims.role == "root";

    let row = if is_root {
        sqlx::query(
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
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    } else {
        sqlx::query(
            r#"
            SELECT id, contest_id, assignment_id, status, overall_risk,
                   created_at::text AS created_at,
                   finished_at::text AS finished_at,
                   total_submissions, suspicious_pairs
            FROM plagiarism_scan_reports
            WHERE id = $1 AND organization_id = $2
            "#,
        )
        .bind(report_id)
        .bind(claims.school_id)
        .fetch_optional(&state.db_pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    };

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
    if matches!(claims.role.as_str(), "root" | "campusadmin" | "gradeadmin") {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> SimilarityScanConfig {
        SimilarityScanConfig {
            enabled: true,
            language: "all".to_string(),
            threshold: 0.8,
            min_token_length: 3,
            window_size: 30,
            ignore_comments: true,
            ignore_whitespace: true,
            max_reports_per_run: 100,
        }
    }

    #[test]
    fn comment_and_whitespace_normalization_removes_noise() {
        let config = test_config();
        let code = "// header\nint   main() { /* block */ return 0; }";
        let normalized = normalize_code(code, &config);
        assert!(!normalized.contains("header"));
        assert!(!normalized.contains("block"));
        assert!(normalized.contains("int main()"));
    }

    #[test]
    fn suspicious_pairs_require_different_users_same_problem_and_language() {
        let config = test_config();
        let user_a = Uuid::new_v4();
        let user_b = Uuid::new_v4();
        let code_a =
            "int main(){ int total = 0; for(int i=0;i<10;i++){ total += i; } return total; }";
        let code_b =
            "int main(){ int total = 0; for(int i=0;i<10;i++){ total += i; } return total; }";
        let submissions = vec![
            ScanSubmission {
                id: 1,
                user_id: user_a,
                username: "alice".to_string(),
                problem_id: 10,
                language: "cpp".to_string(),
                code: code_a.to_string(),
            },
            ScanSubmission {
                id: 2,
                user_id: user_b,
                username: "bob".to_string(),
                problem_id: 10,
                language: "cpp".to_string(),
                code: code_b.to_string(),
            },
            ScanSubmission {
                id: 3,
                user_id: user_b,
                username: "bob".to_string(),
                problem_id: 11,
                language: "cpp".to_string(),
                code: code_b.to_string(),
            },
        ];

        let pairs = find_suspicious_pairs(&submissions, &config);
        assert_eq!(pairs.len(), 1);
        assert_eq!(pairs[0].left_submission_id, 1);
        assert_eq!(pairs[0].right_submission_id, 2);
        assert!(pairs[0].similarity >= 0.99);
    }

    #[test]
    fn matched_lines_counts_normalized_common_lines() {
        let config = test_config();
        let left = "int main() {\n  int answer = 42;\n  return answer;\n}";
        let right = "int main() {\nint answer = 42;\nreturn answer;\n}";
        assert_eq!(matched_normalized_lines(left, right, &config), 4);
    }
}
