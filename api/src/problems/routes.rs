use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::Json,
};
use crate::AppState;
use crate::middleware::auth::AuthExtractor;
use uuid::Uuid;

pub async fn create_problem(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(req): Json<super::models::CreateProblemRequest>,
) -> Result<Json<super::models::Problem>, StatusCode> {
    // Validate difficulty
    if !["easy", "medium", "hard", "expert"].contains(&req.difficulty.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Validate visibility
    if !["global", "school", "campus", "class", "private"].contains(&req.visibility.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Create problem in database
    let problem = sqlx::query_as::<_, super::models::Problem>(
        r#"
        INSERT INTO problems (
            title, description, difficulty, time_limit, memory_limit,
            created_by, organization_id, is_public, visibility, tags,
            source_url, author_note
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
        "#
    )
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.difficulty)
    .bind(req.time_limit)
    .bind(req.memory_limit)
    .bind(claims.sub)
    .bind(req.organization_id)
    .bind(req.is_public)
    .bind(&req.visibility)
    .bind(&req.tags)
    .bind(&req.source_url)
    .bind(&req.author_note)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(problem))
}

pub async fn list_problems(
    State(state): State<AppState>,
    AuthExtractor(_claims): AuthExtractor,
    Query(query): Query<super::models::ListProblemsQuery>,
) -> Result<Json<super::models::ProblemsListResponse>, StatusCode> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let offset = (page - 1) * limit;

    // Build dynamic query
    let mut base_query = "SELECT * FROM problems WHERE 1=1".to_string();
    let mut count_query = "SELECT COUNT(*) FROM problems WHERE 1=1".to_string();
    let mut conditions = vec![];
    let mut param_count = 0;

    // Difficulty filter
    if let Some(diff) = &query.difficulty {
        param_count += 1;
        conditions.push(format!(" AND difficulty = ${}", param_count));
    }

    // Visibility filter
    if let Some(vis) = &query.visibility {
        param_count += 1;
        conditions.push(format!(" AND visibility = ${}", param_count));
    }

    // Public filter
    if let Some(is_pub) = query.is_public {
        param_count += 1;
        conditions.push(format!(" AND is_public = ${}", param_count));
    }

    // Tags filter (array overlap)
    if let Some(tags) = &query.tags {
        if !tags.is_empty() {
            param_count += 1;
            conditions.push(format!(" AND tags && ${}", param_count));
        }
    }

    // Search filter (full-text search)
    if let Some(search_term) = &query.search {
        param_count += 1;
        conditions.push(format!(" AND (to_tsvector('english', title) || to_tsvector('english', description) @@ plainto_tsquery('english', ${}))", param_count));
    }

    let conditions_str = conditions.join("");
    base_query.push_str(&conditions_str);
    count_query.push_str(&conditions_str);

    // Sorting
    let sort_by = query.sort_by.as_ref().map(|s| s.as_str()).unwrap_or("created_at");
    let sort_order = query.sort_order.as_ref().map(|s| s.as_str()).unwrap_or("desc");
    let sort_dir = if sort_order == "asc" { "ASC" } else { "DESC" };

    // Validate sort_by to prevent SQL injection
    let valid_sort_columns = ["created_at", "title", "difficulty", "updated_at"];
    if !valid_sort_columns.contains(&sort_by) {
        return Err(StatusCode::BAD_REQUEST);
    }

    base_query.push_str(&format!(" ORDER BY {} {} LIMIT {} OFFSET {}", sort_by, sort_dir, limit, offset));

    // Execute count query
    let mut count_builder = sqlx::query_scalar::<_, i64>(&count_query);
    if let Some(diff) = &query.difficulty {
        count_builder = count_builder.bind(diff);
    }
    if let Some(vis) = &query.visibility {
        count_builder = count_builder.bind(vis);
    }
    if let Some(is_pub) = query.is_public {
        count_builder = count_builder.bind(is_pub);
    }
    if let Some(tags) = &query.tags {
        if !tags.is_empty() {
            count_builder = count_builder.bind(tags);
        }
    }
    if let Some(search_term) = &query.search {
        count_builder = count_builder.bind(search_term);
    }

    let total = count_builder.fetch_one(&state.db_pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Execute main query
    let mut query_builder = sqlx::query_as::<_, super::models::Problem>(&base_query);
    if let Some(diff) = &query.difficulty {
        query_builder = query_builder.bind(diff);
    }
    if let Some(vis) = &query.visibility {
        query_builder = query_builder.bind(vis);
    }
    if let Some(is_pub) = query.is_public {
        query_builder = query_builder.bind(is_pub);
    }
    if let Some(tags) = &query.tags {
        if !tags.is_empty() {
            query_builder = query_builder.bind(tags);
        }
    }
    if let Some(search_term) = &query.search {
        query_builder = query_builder.bind(search_term);
    }

    let problems = query_builder.fetch_all(&state.db_pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(super::models::ProblemsListResponse {
        problems,
        total,
        page,
        limit,
    }))
}

pub async fn get_problem(
    State(state): State<AppState>,
    AuthExtractor(_claims): AuthExtractor,
    Path(id): Path<Uuid>,
) -> Result<Json<super::models::ProblemDetail>, StatusCode> {
    // Get problem
    let problem = sqlx::query_as::<_, super::models::Problem>(
        "SELECT * FROM problems WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let problem = match problem {
        Some(p) => p,
        None => return Err(StatusCode::NOT_FOUND),
    };

    // Get statistics
    let stats = sqlx::query_as::<_, super::models::ProblemStatistics>(
        "SELECT * FROM problem_statistics WHERE problem_id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get test case count
    let test_case_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM problems_test_cases WHERE problem_id = $1"
    )
    .bind(id)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(super::models::ProblemDetail {
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
        statistics: stats,
        test_case_count,
    }))
}

pub async fn update_problem(
    State(state): State<AppState>,
    AuthExtractor(_claims): AuthExtractor,
    Path(id): Path<Uuid>,
    Json(req): Json<super::models::UpdateProblemRequest>,
) -> Result<Json<super::models::Problem>, StatusCode> {
    // Validate visibility if provided
    if let Some(vis) = &req.visibility {
        if !["global", "school", "campus", "class", "private"].contains(&vis.as_str()) {
            return Err(StatusCode::BAD_REQUEST);
        }
    }

    // Validate difficulty if provided
    if let Some(diff) = &req.difficulty {
        if !["easy", "medium", "hard", "expert"].contains(&diff.as_str()) {
            return Err(StatusCode::BAD_REQUEST);
        }
    }

    let problem = sqlx::query_as::<_, super::models::Problem>(
        r#"
        UPDATE problems
        SET title = COALESCE($1, title),
            description = COALESCE($2, description),
            difficulty = COALESCE($3, difficulty),
            time_limit = COALESCE($4, time_limit),
            memory_limit = COALESCE($5, memory_limit),
            is_public = COALESCE($6, is_public),
            visibility = COALESCE($7, visibility),
            tags = COALESCE($8, tags),
            source_url = COALESCE($9, source_url),
            author_note = COALESCE($10, author_note),
            updated_at = NOW()
        WHERE id = $11
        RETURNING *
        "#
    )
    .bind(req.title)
    .bind(req.description)
    .bind(req.difficulty)
    .bind(req.time_limit)
    .bind(req.memory_limit)
    .bind(req.is_public)
    .bind(req.visibility)
    .bind(&req.tags)
    .bind(&req.source_url)
    .bind(&req.author_note)
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
    AuthExtractor(_claims): AuthExtractor,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
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

/// Get problem statistics
pub async fn get_problem_statistics(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<super::models::ProblemStatistics>, StatusCode> {
    let stats = sqlx::query_as::<_, super::models::ProblemStatistics>(
        "SELECT * FROM problem_statistics WHERE problem_id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match stats {
        Some(stats) => Ok(Json(stats)),
        None => Err(StatusCode::NOT_FOUND),
    }
}
