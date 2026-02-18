use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::Json,
};
use crate::AppState;
use crate::middleware::auth::AuthExtractor;
use uuid::Uuid;
use std::collections::HashMap;
use serde_json::json;

pub async fn create_problem(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(req): Json<super::models::CreateProblemRequest>,
) -> Result<Json<super::models::Problem>, StatusCode> {
    // Create problem in database
    let problem = sqlx::query_as::<_, super::models::Problem>(
        r#"
        INSERT INTO problems (title, description, difficulty, time_limit, memory_limit, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#
    )
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.difficulty)
    .bind(req.time_limit)
    .bind(req.memory_limit)
    .bind(claims.sub)  // Use actual user_id from JWT claims
    .fetch_one(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(problem))
}

pub async fn list_problems(
    State(state): State<AppState>,
    AuthExtractor(_claims): AuthExtractor,
    Query(query): Query<HashMap<String, String>>,
) -> Result<Json<super::models::ProblemsListResponse>, StatusCode> {
    // Parse query parameters
    let difficulty = query.get("difficulty").cloned();
    let search = query.get("search").cloned();
    let page: i64 = query.get("page")
        .and_then(|p| p.parse().ok())
        .unwrap_or(1);
    let limit: i64 = query.get("limit")
        .and_then(|l| l.parse().ok())
        .unwrap_or(20);

    let offset = (page - 1) * limit;

    // Build dynamic query
    let mut base_query = "SELECT * FROM problems WHERE 1=1".to_string();
    let mut count_query = "SELECT COUNT(*) FROM problems WHERE 1=1".to_string();

    let mut conditions = vec![];
    let mut param_count = 0;

    if let Some(diff) = &difficulty {
        param_count += 1;
        conditions.push(format!(" AND difficulty = ${}", param_count));
    }

    if let Some(search_term) = &search {
        param_count += 1;
        conditions.push(format!(" AND (title ILIKE ${} OR description ILIKE ${})", param_count, param_count));
    }

    let conditions_str = conditions.join("");
    base_query.push_str(&conditions_str);
    count_query.push_str(&conditions_str);

    base_query.push_str(&format!(" ORDER BY created_at DESC LIMIT {} OFFSET {}", limit, offset));

    // Prepare search pattern for reuse
    let search_pattern = search.as_ref().map(|s| format!("%{}%", s));

    // Execute count query
    let mut count_builder = sqlx::query_scalar::<_, i64>(&count_query);
    if let Some(diff) = &difficulty {
        count_builder = count_builder.bind(diff);
    }
    if let Some(pattern) = &search_pattern {
        count_builder = count_builder.bind(pattern).bind(pattern);
    }
    let total = count_builder.fetch_one(&state.db_pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Execute main query
    let mut query_builder = sqlx::query_as::<_, super::models::Problem>(&base_query);
    if let Some(diff) = &difficulty {
        query_builder = query_builder.bind(diff);
    }
    if let Some(pattern) = &search_pattern {
        query_builder = query_builder.bind(pattern).bind(pattern);
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
) -> Result<Json<super::models::Problem>, StatusCode> {
    let problem = sqlx::query_as::<_, super::models::Problem>(
        "SELECT * FROM problems WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match problem {
        Some(problem) => Ok(Json(problem)),
        None => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn update_problem(
    State(state): State<AppState>,
    AuthExtractor(_claims): AuthExtractor,
    Path(id): Path<Uuid>,
    Json(req): Json<super::models::UpdateProblemRequest>,
) -> Result<Json<super::models::Problem>, StatusCode> {
    let problem = sqlx::query_as::<_, super::models::Problem>(
        r#"
        UPDATE problems
        SET title = COALESCE($1, title),
            description = COALESCE($2, description),
            difficulty = COALESCE($3, difficulty),
            time_limit = COALESCE($4, time_limit),
            memory_limit = COALESCE($5, memory_limit),
            updated_at = NOW()
        WHERE id = $6
        RETURNING *
        "#
    )
    .bind(req.title)
    .bind(req.description)
    .bind(req.difficulty)
    .bind(req.time_limit)
    .bind(req.memory_limit)
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
) -> Result<Json<serde_json::Value>, StatusCode> {
    let result = sqlx::query("DELETE FROM problems WHERE id = $1")
        .bind(id)
        .execute(&state.db_pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() > 0 {
        Ok(Json(json!({"message": "Problem deleted successfully"})))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

