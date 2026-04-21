use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use sqlx::Row;

use api_infra::middleware::auth::AuthExtractor;
use api_infra::state::AppState;
use shared::models::role::Role;

use super::problem_access::{ensure_problem_mutation_access, load_problem_access};

use super::models::{
    CreateProblemRequest, ListProblemsQuery, Problem, ProblemDetail, ProblemStatistics,
    ProblemsListResponse, SupportedLanguage, UpdateProblemRequest, UpdateSupportedLanguagesRequest,
};

fn require_teacher_plus(role: &str) -> Result<Role, StatusCode> {
    let role = role.parse::<Role>().map_err(|_| StatusCode::FORBIDDEN)?;
    if !role.is_higher_or_equal(Role::Teacher) {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(role)
}

fn require_admin(role: &str) -> Result<Role, StatusCode> {
    let parsed = role.parse::<Role>().map_err(|_| StatusCode::FORBIDDEN)?;
    match parsed {
        Role::Root | Role::CampusAdmin | Role::GradeAdmin => Ok(parsed),
        _ => Err(StatusCode::FORBIDDEN),
    }
}

fn is_admin(role: &str) -> bool {
    role.parse::<Role>()
        .map(|r| r == Role::Root)
        .unwrap_or(false)
}

async fn ensure_language_settings(state: &AppState) -> Result<(), StatusCode> {
    sqlx::query(
        r#"
        INSERT INTO judge_language_settings (id, c_enabled, cpp_enabled)
        VALUES (TRUE, FALSE, FALSE)
        ON CONFLICT (id) DO NOTHING
        "#,
    )
    .execute(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(())
}

fn build_supported_languages(c_enabled: bool, cpp_enabled: bool) -> Vec<SupportedLanguage> {
    vec![
        SupportedLanguage {
            id: "python".to_string(),
            name: "Python 3".to_string(),
            extension: "py".to_string(),
            enabled: true,
            is_default: true,
        },
        SupportedLanguage {
            id: "c".to_string(),
            name: "C".to_string(),
            extension: "c".to_string(),
            enabled: c_enabled,
            is_default: false,
        },
        SupportedLanguage {
            id: "cpp".to_string(),
            name: "C++".to_string(),
            extension: "cpp".to_string(),
            enabled: cpp_enabled,
            is_default: false,
        },
    ]
}

pub async fn get_supported_languages(
    State(state): State<AppState>,
    AuthExtractor(_claims): AuthExtractor,
) -> Result<Json<Vec<SupportedLanguage>>, StatusCode> {
    ensure_language_settings(&state).await?;

    let row =
        sqlx::query("SELECT c_enabled, cpp_enabled FROM judge_language_settings WHERE id = TRUE")
            .fetch_one(&state.db_pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(build_supported_languages(
        row.get("c_enabled"),
        row.get("cpp_enabled"),
    )))
}

pub async fn update_supported_languages(
    State(state): State<AppState>,
    AuthExtractor(_claims): AuthExtractor,
    Json(req): Json<UpdateSupportedLanguagesRequest>,
) -> Result<Json<Vec<SupportedLanguage>>, StatusCode> {
    // Admin-only: language settings control
    require_admin(&_claims.role)?;
    ensure_language_settings(&state).await?;

    let row = sqlx::query(
        r#"
        UPDATE judge_language_settings
        SET c_enabled = $1, cpp_enabled = $2
        WHERE id = TRUE
        RETURNING c_enabled, cpp_enabled
        "#,
    )
    .bind(req.c_enabled)
    .bind(req.cpp_enabled)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(build_supported_languages(
        row.get("c_enabled"),
        row.get("cpp_enabled"),
    )))
}

fn normalize_visibility(visibility: &str, is_public: bool) -> Option<String> {
    let normalized = match visibility {
        "public" | "campus" | "class" | "private" => visibility.to_string(),
        "global" if is_public => "public".to_string(),
        _ => return None,
    };

    Some(normalized)
}

pub async fn create_problem(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(req): Json<CreateProblemRequest>,
) -> Result<Json<Problem>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    if !["easy", "medium", "hard"].contains(&req.difficulty.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let visibility =
        normalize_visibility(&req.visibility, req.is_public).ok_or(StatusCode::BAD_REQUEST)?;

    let problem = sqlx::query_as::<_, Problem>(
        r#"
        INSERT INTO problems (
            organization_id,
            author_id,
            title,
            description,
            difficulty,
            visibility,
            time_limit_ms,
            memory_limit_kb,
            created_at,
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING
            id,
            title,
            description,
            COALESCE(difficulty, 'easy') AS difficulty,
            time_limit_ms AS time_limit,
            memory_limit_kb AS memory_limit,
            author_id AS created_by,
            organization_id,
            (visibility = 'public') AS is_public,
            visibility,
            COALESCE(NULL::TEXT[], ARRAY[]::TEXT[]) AS tags,
            NULL::TEXT AS source_url,
            NULL::TEXT AS author_note,
            created_at,
            updated_at
        "#,
    )
    .bind(claims.school_id)                // SECURITY: org from JWT, not request body
    .bind(claims.sub)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.difficulty)
    .bind(visibility)
    .bind(req.time_limit)
    .bind(req.memory_limit)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(problem))
}

pub async fn list_problems(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Query(query): Query<ListProblemsQuery>,
) -> Result<Json<ProblemsListResponse>, StatusCode> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;
    let search = query.search.clone().unwrap_or_default();
    let difficulty = query.difficulty.clone();
    let visibility = query.visibility.clone();
    let is_public = query.is_public.unwrap_or(true);

    // SEC-03: Tenant isolation — non-admin sees only public + own-org problems
    let admin = is_admin(&claims.role);

    let total = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM problems
        WHERE ($1 = '' OR title ILIKE $2 OR description ILIKE $2)
          AND ($3::TEXT IS NULL OR difficulty = $3)
          AND ($4::TEXT IS NULL OR visibility = $4)
          AND ($5::BOOLEAN = false OR visibility = 'public')
          AND ($6::BOOLEAN OR visibility = 'public' OR organization_id = $7)
        "#,
    )
    .bind(&search)
    .bind(format!("%{}%", search))
    .bind(difficulty.clone())
    .bind(visibility.clone())
    .bind(is_public)
    .bind(admin)
    .bind(claims.school_id)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let problems = sqlx::query_as::<_, Problem>(
        r#"
        SELECT
            p.id,
            p.title,
            p.description,
            COALESCE(p.difficulty, 'easy') AS difficulty,
            p.time_limit_ms AS time_limit,
            p.memory_limit_kb AS memory_limit,
            p.author_id AS created_by,
            p.organization_id,
            (p.visibility = 'public') AS is_public,
            p.visibility,
            COALESCE(NULL::TEXT[], ARRAY[]::TEXT[]) AS tags,
            NULL::TEXT AS source_url,
            NULL::TEXT AS author_note,
            p.created_at,
            p.updated_at
        FROM problems p
        WHERE ($1 = '' OR p.title ILIKE $2 OR p.description ILIKE $2)
          AND ($3::TEXT IS NULL OR p.difficulty = $3)
          AND ($4::TEXT IS NULL OR p.visibility = $4)
          AND ($5::BOOLEAN = false OR p.visibility = 'public')
          AND ($6::BOOLEAN OR p.visibility = 'public' OR p.organization_id = $7)
        ORDER BY p.created_at DESC
        LIMIT $8 OFFSET $9
        "#,
    )
    .bind(&search)
    .bind(format!("%{}%", search))
    .bind(difficulty)
    .bind(visibility)
    .bind(is_public)
    .bind(admin)
    .bind(claims.school_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ProblemsListResponse {
        problems,
        total,
        page,
        limit,
    }))
}

pub async fn get_problem(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(id): Path<i64>,
) -> Result<Json<ProblemDetail>, StatusCode> {
    // SEC-03: Use access module for unified visibility check
    let access = load_problem_access(&state, id).await?;
    let role = claims.role.parse::<Role>().map_err(|_| StatusCode::FORBIDDEN)?;
    if !super::access::can_read_problem(role, &claims, &access) {
        return Err(StatusCode::FORBIDDEN);
    }

    let problem = sqlx::query_as::<_, Problem>(
        r#"
        SELECT
            id,
            title,
            description,
            COALESCE(difficulty, 'easy') AS difficulty,
            time_limit_ms AS time_limit,
            memory_limit_kb AS memory_limit,
            author_id AS created_by,
            organization_id,
            (visibility = 'public') AS is_public,
            visibility,
            COALESCE(NULL::TEXT[], ARRAY[]::TEXT[]) AS tags,
            NULL::TEXT AS source_url,
            NULL::TEXT AS author_note,
            created_at,
            updated_at
        FROM problems
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let problem = match problem {
        Some(problem) => problem,
        None => return Err(StatusCode::NOT_FOUND),
    };

    let test_case_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM test_cases WHERE problem_id = $1")
            .bind(id)
            .fetch_one(&state.db_pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ProblemDetail {
        id: problem.id,
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        time_limit: problem.time_limit,
        memory_limit: problem.memory_limit,
        created_by: problem.created_by,
        organization_id: problem.organization_id,
        is_public: problem.is_public,
        visibility: problem.visibility,
        tags: problem.tags,
        source_url: problem.source_url,
        author_note: problem.author_note,
        created_at: problem.created_at,
        updated_at: problem.updated_at,
        statistics: None,
        test_case_count,
    }))
}

pub async fn update_problem(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(id): Path<i64>,
    Json(req): Json<UpdateProblemRequest>,
) -> Result<Json<Problem>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    if let Some(diff) = &req.difficulty {
        if !["easy", "medium", "hard"].contains(&diff.as_str()) {
            return Err(StatusCode::BAD_REQUEST);
        }
    }

    // SEC-03: Verify problem belongs to caller's org (or admin)
    let role = require_teacher_plus(&claims.role)?;
    let problem = load_problem_access(&state, id).await?;
    ensure_problem_mutation_access(role, &claims, &problem)?;

    let visibility = match (&req.visibility, req.is_public) {
        (Some(vis), is_public) => Some(
            normalize_visibility(vis, is_public.unwrap_or(vis == "public"))
                .ok_or(StatusCode::BAD_REQUEST)?,
        ),
        (None, Some(true)) => Some("public".to_string()),
        (None, Some(false)) => Some("private".to_string()),
        (None, None) => None,
    };

    let problem = sqlx::query_as::<_, Problem>(
        r#"
        UPDATE problems
        SET
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            difficulty = COALESCE($3, difficulty),
            time_limit_ms = COALESCE($4, time_limit_ms),
            memory_limit_kb = COALESCE($5, memory_limit_kb),
            visibility = COALESCE($6, visibility),
            updated_at = NOW()
        WHERE id = $7
        RETURNING
            id,
            title,
            description,
            COALESCE(difficulty, 'easy') AS difficulty,
            time_limit_ms AS time_limit,
            memory_limit_kb AS memory_limit,
            author_id AS created_by,
            organization_id,
            (visibility = 'public') AS is_public,
            visibility,
            COALESCE(NULL::TEXT[], ARRAY[]::TEXT[]) AS tags,
            NULL::TEXT AS source_url,
            NULL::TEXT AS author_note,
            created_at,
            updated_at
        "#,
    )
    .bind(req.title)
    .bind(req.description)
    .bind(req.difficulty)
    .bind(req.time_limit)
    .bind(req.memory_limit)
    .bind(visibility)
    .bind(id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match problem {
        Some(problem) => Ok(Json(problem)),
        None => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn delete_problem(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(id): Path<i64>,
) -> Result<StatusCode, StatusCode> {
    let role = require_teacher_plus(&claims.role)?;
    let problem = load_problem_access(&state, id).await?;
    ensure_problem_mutation_access(role, &claims, &problem)?;

    let result = sqlx::query("DELETE FROM problems WHERE id = $1")
        .bind(id)
        .execute(&state.db_pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() > 0 {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

pub async fn get_problem_statistics(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(id): Path<i64>,
) -> Result<Json<ProblemStatistics>, StatusCode> {
    // SEC-03: Use access module for unified visibility check
    let access = load_problem_access(&state, id).await?;
    let role = claims.role.parse::<Role>().map_err(|_| StatusCode::FORBIDDEN)?;
    if !super::access::can_read_problem(role, &claims, &access) {
        return Err(StatusCode::FORBIDDEN);
    }

    let stats = sqlx::query_as::<_, ProblemStatistics>(
        r#"
        SELECT
            $1::BIGINT AS problem_id,
            COUNT(*)::BIGINT AS total_submissions,
            COUNT(*) FILTER (WHERE verdict = 'ac')::BIGINT AS accepted_submissions,
            CASE
                WHEN COUNT(*) = 0 THEN NULL
                ELSE ROUND(
                    (COUNT(*) FILTER (WHERE verdict = 'ac')::NUMERIC / COUNT(*)::NUMERIC) * 100,
                    2
                )::DOUBLE PRECISION
            END AS acceptance_rate,
            MIN(time_ms) FILTER (WHERE verdict = 'ac')::INTEGER AS fastest_time_ms,
            (
                SELECT s.user_id
                FROM submissions s
                WHERE s.problem_id = $1 AND s.verdict = 'ac'
                ORDER BY s.created_at ASC
                LIMIT 1
            ) AS first_solver_id,
            (
                SELECT s.created_at
                FROM submissions s
                WHERE s.problem_id = $1 AND s.verdict = 'ac'
                ORDER BY s.created_at ASC
                LIMIT 1
            ) AS first_solved_at,
            MAX(created_at) FILTER (WHERE verdict = 'ac') AS last_solved_at
        FROM submissions
        WHERE problem_id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(stats))
}
