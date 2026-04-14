use api_infra::middleware::auth::AuthExtractor;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use shared::models::role::Role;
use sqlx::FromRow;
use api_infra::state::AppState;

fn require_teacher_plus(role: &str) -> Result<Role, StatusCode> {
    let role = role.parse::<Role>().map_err(|_| StatusCode::FORBIDDEN)?;
    if !role.is_higher_or_equal(Role::Teacher) {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(role)
}

fn is_management_role(role: &str) -> bool {
    role.parse::<Role>()
        .map(|r| r.is_higher_or_equal(Role::Teacher))
        .unwrap_or(false)
}

/// Test case model
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct TestCase {
    pub id: i64,
    pub problem_id: i64,
    pub input: String,
    pub expected_output: String,
    pub is_hidden: bool,
    pub score: i32,
    pub order: i32,
    pub created_at: String,
}

/// Create test case request
#[derive(Debug, Deserialize)]
pub struct CreateTestCaseRequest {
    pub input: String,
    pub expected_output: String,
    pub is_hidden: Option<bool>,
    pub score: Option<i32>,
    pub order: Option<i32>,
}

/// Update test case request
#[derive(Debug, Deserialize)]
pub struct UpdateTestCaseRequest {
    pub input: Option<String>,
    pub expected_output: Option<String>,
    pub is_hidden: Option<bool>,
    pub score: Option<i32>,
    pub order: Option<i32>,
}

/// Batch import test cases request
#[derive(Debug, Deserialize)]
pub struct BatchImportTestCasesRequest {
    pub test_cases: Vec<CreateTestCaseRequest>,
}

/// Student-safe test case view — hides input/output/score for hidden cases
#[derive(Debug, Serialize, Deserialize)]
pub struct PublicTestCase {
    pub id: i64,
    pub problem_id: i64,
    pub is_hidden: bool,
    pub order: i32,
}

/// List test cases for a problem.
/// Management roles see full data; students see only non-hidden case metadata.
pub async fn list_test_cases(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(problem_id): Path<i64>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let test_cases = sqlx::query_as::<_, TestCase>(
        r#"
        SELECT
            id,
            problem_id,
            input,
            output AS expected_output,
            is_secret AS is_hidden,
            points AS score,
            order_index AS "order",
            created_at::text as created_at
        FROM test_cases
        WHERE problem_id = $1
        ORDER BY order_index ASC, id ASC
        "#
    )
    .bind(problem_id)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if is_management_role(&claims.role) {
        // Management users see full test case data
        Ok(Json(json!(test_cases)))
    } else {
        // Students only see non-hidden metadata
        let public: Vec<PublicTestCase> = test_cases
            .into_iter()
            .filter(|tc| !tc.is_hidden)
            .map(|tc| PublicTestCase {
                id: tc.id,
                problem_id: tc.problem_id,
                is_hidden: false,
                order: tc.order,
            })
            .collect();
        Ok(Json(json!(public)))
    }
}

/// Create a new test case
pub async fn create_test_case(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(problem_id): Path<i64>,
    Json(req): Json<CreateTestCaseRequest>,
) -> Result<Json<TestCase>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let test_case = sqlx::query_as::<_, TestCase>(
        r#"
        INSERT INTO test_cases (
            problem_id, input, output, is_secret, points, order_index
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
            id,
            problem_id,
            input,
            output AS expected_output,
            is_secret AS is_hidden,
            points AS score,
            order_index AS "order",
            created_at::text as created_at
        "#
    )
    .bind(problem_id)
    .bind(&req.input)
    .bind(&req.expected_output)
    .bind(req.is_hidden.unwrap_or(false))
    .bind(req.score.unwrap_or(10))
    .bind(req.order.unwrap_or(0))
    .fetch_one(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(test_case))
}

/// Update a test case
pub async fn update_test_case(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path((problem_id, test_case_id)): Path<(i64, i64)>,
    Json(req): Json<UpdateTestCaseRequest>,
) -> Result<Json<TestCase>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let test_case = sqlx::query_as::<_, TestCase>(
        r#"
        UPDATE problems_test_cases
        SET
            input = COALESCE($1, input),
            output = COALESCE($2, output),
            is_secret = COALESCE($3, is_secret),
            points = COALESCE($4, points),
            order_index = COALESCE($5, order_index)
        WHERE id = $6 AND problem_id = $7
        RETURNING
            id,
            problem_id,
            input,
            output AS expected_output,
            is_secret AS is_hidden,
            points AS score,
            order_index AS "order",
            created_at::text as created_at
        "#
    )
    .bind(req.input)
    .bind(req.expected_output)
    .bind(req.is_hidden)
    .bind(req.score)
    .bind(req.order)
    .bind(test_case_id)
    .bind(problem_id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match test_case {
        Some(tc) => Ok(Json(tc)),
        None => Err(StatusCode::NOT_FOUND),
    }
}

/// Delete a test case
pub async fn delete_test_case(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path((problem_id, test_case_id)): Path<(i64, i64)>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let result = sqlx::query(
        "DELETE FROM test_cases WHERE id = $1 AND problem_id = $2"
    )
    .bind(test_case_id)
    .bind(problem_id)
    .execute(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() > 0 {
        Ok(Json(json!({
            "message": "Test case deleted successfully"
        })))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

/// Batch import test cases
pub async fn batch_import_test_cases(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(problem_id): Path<i64>,
    Json(req): Json<BatchImportTestCasesRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    require_teacher_plus(&claims.role)?;
    let mut imported_count = 0;
    let mut errors = Vec::new();

    for (index, test_case_req) in req.test_cases.iter().enumerate() {
        let result = sqlx::query_as::<_, TestCase>(
            r#"
            INSERT INTO test_cases (
                problem_id, input, output, is_secret, points, order_index
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING
                id,
                problem_id,
                input,
                output AS expected_output,
                is_secret AS is_hidden,
                points AS score,
                order_index AS "order",
                created_at::text as created_at
            "#
        )
        .bind(problem_id)
        .bind(&test_case_req.input)
        .bind(&test_case_req.expected_output)
        .bind(test_case_req.is_hidden.unwrap_or(false))
        .bind(test_case_req.score.unwrap_or(10))
        .bind(test_case_req.order.unwrap_or(index as i32))
        .fetch_one(&state.db_pool)
        .await;

        match result {
            Ok(_) => imported_count += 1,
            Err(e) => errors.push(format!("Test case {}: {}", index + 1, e)),
        }
    }

    Ok(Json(json!({
        "message": format!("Imported {} test cases", imported_count),
        "imported_count": imported_count,
        "total_count": req.test_cases.len(),
        "errors": errors
    })))
}
