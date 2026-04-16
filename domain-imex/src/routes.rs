//! Import/export API route handlers.
//!
//! Provides endpoints for problem ZIP import/export and user CSV import/export.
//! All routes require teacher or higher role (admin for user operations).

use std::collections::HashSet;

use api_infra::middleware::auth::AuthExtractor;
use api_infra::state::AppState;
use axum::{
    body::Body,
    extract::{DefaultBodyLimit, Multipart, Path, State},
    http::{header, StatusCode},
    response::{Json, Response},
    routing::{get, post},
    Router,
};
use shared::models::role::Role;
use sqlx::Row;
use uuid::Uuid;

use crate::models::{
    CachedPreview, CreatedItem, ErrorItem, ImportExecuteRequest, ImportError,
    ImportItemStatus, ImportPreviewResponse, ImportResultResponse, ImportWarning, PreviewItem,
    ProblemImportPreview, SkippedItem, UserImportPreview,
};
use crate::problem_export::{build_problem_zip, ExportProblem, ExportTestCase};
use crate::problem_import::{convert_to_create_request, convert_to_test_cases, parse_problem_zip};
use crate::user_export::{build_user_csv, UserExportRow};
use crate::user_import::parse_user_csv;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/// Build the import/export router.
///
/// Routes:
/// - POST /import/problems/validate  (50 MB body limit)
/// - POST /import/problems/execute
/// - GET  /export/problems/{id}
/// - POST /import/users/validate     (10 MB body limit)
/// - POST /import/users/execute
/// - GET  /export/users
pub fn imex_router() -> Router<AppState> {
    let problem_import_router = Router::new()
        .route("/import/problems/validate", post(validate_problem_import))
        .layer(DefaultBodyLimit::max(50_000_000));

    let user_import_router = Router::new()
        .route("/import/users/validate", post(validate_user_import))
        .layer(DefaultBodyLimit::max(10_000_000));

    Router::new()
        .merge(problem_import_router)
        .merge(user_import_router)
        .route("/import/problems/execute", post(execute_problem_import))
        .route("/export/problems/{id}", get(export_problem))
        .route("/import/users/execute", post(execute_user_import))
        .route("/export/users", get(export_users))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn require_teacher_plus(role: &str) -> Result<Role, StatusCode> {
    let role = role.parse::<Role>().map_err(|_| StatusCode::FORBIDDEN)?;
    if !role.is_higher_or_equal(Role::Teacher) {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(role)
}

fn require_admin(role: &str) -> Result<(), StatusCode> {
    let parsed = role.parse::<Role>().map_err(|_| StatusCode::FORBIDDEN)?;
    match parsed {
        Role::Root | Role::OrganizationAdmin | Role::CampusAdmin => Ok(()),
        _ => Err(StatusCode::FORBIDDEN),
    }
}

/// Extract file bytes from a multipart field named `field_name`.
async fn extract_file_bytes(multipart: &mut Multipart, field_name: &str) -> Result<Vec<u8>, StatusCode> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?
    {
        if field.name() == Some(field_name) {
            return field
                .bytes()
                .await
                .map(|b| b.to_vec())
                .map_err(|_| StatusCode::BAD_REQUEST);
        }
    }
    Err(StatusCode::BAD_REQUEST)
}

/// Extract a text field from multipart.
async fn extract_text_field(multipart: &mut Multipart, field_name: &str) -> Result<String, StatusCode> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?
    {
        if field.name() == Some(field_name) {
            return field
                .text()
                .await
                .map_err(|_| StatusCode::BAD_REQUEST);
        }
    }
    Err(StatusCode::BAD_REQUEST)
}

/// Build an import preview response from parsed problem items.
fn build_problem_preview_response(items: &[crate::models::ProblemImportItem], token: Uuid) -> ImportPreviewResponse {
    let total = items.len();
    let mut valid = 0;
    let mut warnings = Vec::new();
    let mut errors = Vec::new();
    let mut preview_items = Vec::new();

    for item in items {
        let status_str = match item.status {
            ImportItemStatus::Valid => "valid",
            ImportItemStatus::Duplicate => "duplicate",
            ImportItemStatus::Error => "error",
        };

        if item.status == ImportItemStatus::Valid {
            valid += 1;
        }

        if item.status == ImportItemStatus::Duplicate {
            warnings.push(ImportWarning {
                item: item.config.title.clone(),
                reason: item.warning.clone().unwrap_or_default(),
            });
        }

        if item.status == ImportItemStatus::Error {
            errors.push(ImportError {
                item: item.slug.clone(),
                reason: item.warning.clone().unwrap_or_default(),
            });
        }

        preview_items.push(PreviewItem {
            title: item.config.title.clone(),
            difficulty: item.config.difficulty.clone(),
            test_case_count: item.test_case_files.len(),
            status: status_str.to_string(),
            warning: item.warning.clone(),
        });
    }

    ImportPreviewResponse {
        token,
        total,
        valid,
        warnings,
        errors,
        preview_items,
    }
}

/// Build an import preview response from parsed user rows.
fn build_user_preview_response(rows: &[crate::models::UserImportRow], token: Uuid) -> ImportPreviewResponse {
    let total = rows.len();
    let mut valid = 0;
    let mut warnings = Vec::new();
    let mut errors = Vec::new();
    let mut preview_items = Vec::new();

    for row in rows {
        let status_str = match row.status {
            ImportItemStatus::Valid => "valid",
            ImportItemStatus::Duplicate => "duplicate",
            ImportItemStatus::Error => "error",
        };

        if row.status == ImportItemStatus::Valid {
            valid += 1;
        }

        if row.status == ImportItemStatus::Duplicate {
            warnings.push(ImportWarning {
                item: row.username.clone(),
                reason: row.warning.clone().unwrap_or_default(),
            });
        }

        if row.status == ImportItemStatus::Error {
            errors.push(ImportError {
                item: row.username.clone(),
                reason: row.warning.clone().unwrap_or_default(),
            });
        }

        preview_items.push(PreviewItem {
            title: row.username.clone(),
            difficulty: row.role.clone(),
            test_case_count: 0,
            status: status_str.to_string(),
            warning: row.warning.clone(),
        });
    }

    ImportPreviewResponse {
        token,
        total,
        valid,
        warnings,
        errors,
        preview_items,
    }
}

// ---------------------------------------------------------------------------
// Problem Import Handlers
// ---------------------------------------------------------------------------

/// POST /import/problems/validate
///
/// Accepts a ZIP file multipart upload, parses it, and returns a preview
/// of what will be imported along with a token for the execute step.
pub async fn validate_problem_import(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    mut multipart: Multipart,
) -> Result<Json<ImportPreviewResponse>, StatusCode> {
    require_teacher_plus(&claims.role)?;

    let file_bytes = extract_file_bytes(&mut multipart, "file").await?;

    // Query existing problem titles for the organization to detect duplicates
    let existing_titles: Vec<String> = sqlx::query_scalar(
        "SELECT title FROM problems WHERE organization_id = $1",
    )
    .bind(claims.school_id)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let skip_titles: HashSet<String> = existing_titles.into_iter().collect();

    // Parse ZIP in a blocking task (CPU-bound)
    let items = tokio::task::spawn_blocking(move || parse_problem_zip(&file_bytes, &skip_titles))
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map_err(|e| {
            tracing::warn!("Problem ZIP parse error: {}", e);
            StatusCode::BAD_REQUEST
        })?;

    let token = Uuid::new_v4();
    let response = build_problem_preview_response(&items, token);

    // Cache the parsed items for the execute step
    state.preview_cache.insert(
        token,
        Box::new(CachedPreview::Problem(ProblemImportPreview { items })),
    );

    // Auto-expire after 10 minutes (best-effort cleanup)
    let cache = state.preview_cache.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(600)).await;
        cache.remove(&token);
    });

    Ok(Json(response))
}

/// POST /import/problems/execute
///
/// Accepts a preview token and creates problems in the database.
pub async fn execute_problem_import(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(req): Json<ImportExecuteRequest>,
) -> Result<Json<ImportResultResponse>, StatusCode> {
    require_teacher_plus(&claims.role)?;

    // Remove cached preview (single-use)
    let (_, cached) = state
        .preview_cache
        .remove(&req.token)
        .ok_or(StatusCode::BAD_REQUEST)?;

    let preview = cached
        .downcast_ref::<CachedPreview>()
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

    let items = match preview {
        CachedPreview::Problem(p) => &p.items,
        CachedPreview::User(_) => return Err(StatusCode::BAD_REQUEST),
    };

    let total = items.len();
    let mut created_items = Vec::new();
    let mut skipped_items = Vec::new();
    let mut error_items = Vec::new();

    for item in items {
        match item.status {
            ImportItemStatus::Duplicate => {
                skipped_items.push(SkippedItem {
                    item: item.config.title.clone(),
                    reason: item
                        .warning
                        .clone()
                        .unwrap_or_else(|| "Duplicate title".to_string()),
                });
            }
            ImportItemStatus::Error => {
                error_items.push(ErrorItem {
                    item: item.slug.clone(),
                    reason: item
                        .warning
                        .clone()
                        .unwrap_or_else(|| "Parse error".to_string()),
                });
            }
            ImportItemStatus::Valid => {
                // Insert problem
                let create_req = convert_to_create_request(item, claims.school_id);
                let result = sqlx::query_scalar::<_, i64>(
                    r#"
                    INSERT INTO problems (
                        title, description, difficulty, time_limit, memory_limit,
                        organization_id, is_public, visibility, tags, source_url, author_note
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING id
                    "#,
                )
                .bind(&create_req.title)
                .bind(&create_req.description)
                .bind(&create_req.difficulty)
                .bind(create_req.time_limit)
                .bind(create_req.memory_limit)
                .bind(create_req.organization_id)
                .bind(create_req.is_public)
                .bind(&create_req.visibility)
                .bind(&create_req.tags)
                .bind(&create_req.source_url)
                .bind(&create_req.author_note)
                .fetch_one(&state.db_pool)
                .await;

                match result {
                    Ok(problem_id) => {
                        // Insert test cases
                        let tc_req = convert_to_test_cases(item);
                        for (idx, tc) in tc_req.test_cases.iter().enumerate() {
                            if let Err(e) = sqlx::query(
                                r#"
                                INSERT INTO test_cases (
                                    problem_id, input, output, is_secret, points, order_index
                                )
                                VALUES ($1, $2, $3, $4, $5, $6)
                                "#,
                            )
                            .bind(problem_id)
                            .bind(&tc.input)
                            .bind(&tc.expected_output)
                            .bind(tc.is_hidden.unwrap_or(false))
                            .bind(tc.score.unwrap_or(10))
                            .bind(tc.order.unwrap_or(idx as i32))
                            .execute(&state.db_pool)
                            .await
                            {
                                tracing::warn!(
                                    "Failed to insert test case {} for problem {}: {}",
                                    idx,
                                    problem_id,
                                    e
                                );
                            }
                        }

                        created_items.push(CreatedItem {
                            title: item.config.title.clone(),
                            id: problem_id,
                        });
                    }
                    Err(e) => {
                        tracing::warn!("Failed to insert problem '{}': {}", item.config.title, e);
                        error_items.push(ErrorItem {
                            item: item.config.title.clone(),
                            reason: format!("Database error: {}", e),
                        });
                    }
                }
            }
        }
    }

    Ok(Json(ImportResultResponse {
        total,
        created: created_items.len(),
        skipped: skipped_items.len(),
        errors: error_items.len(),
        created_items,
        skipped_items,
        error_items,
    }))
}

// ---------------------------------------------------------------------------
// Problem Export Handler
// ---------------------------------------------------------------------------

/// GET /export/problems/{id}
///
/// Returns a ZIP file download for a single problem with its test cases.
pub async fn export_problem(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(problem_id): Path<i64>,
) -> Result<Response, StatusCode> {
    require_teacher_plus(&claims.role)?;

    // Fetch problem
    let row = sqlx::query(
        r#"
        SELECT
            id, title, description, difficulty, time_limit, memory_limit,
            organization_id, is_public, visibility, tags, source_url, author_note
        FROM problems
        WHERE id = $1 AND organization_id = $2
        "#,
    )
    .bind(problem_id)
    .bind(claims.school_id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let problem = ExportProblem {
        title: row.get("title"),
        description: row.get("description"),
        difficulty: row.get("difficulty"),
        time_limit: row.get("time_limit"),
        memory_limit: row.get("memory_limit"),
        is_public: row.get("is_public"),
        visibility: row.get("visibility"),
        tags: row
            .try_get::<Option<Vec<String>>, _>("tags")
            .unwrap_or(None)
            .unwrap_or_default(),
        source_url: row.try_get("source_url").unwrap_or(None),
        author_note: row.try_get("author_note").unwrap_or(None),
    };

    // Fetch test cases
    let tc_rows = sqlx::query(
        r#"
        SELECT input, output AS expected_output, is_secret AS is_hidden, points AS score, order_index AS "order"
        FROM test_cases
        WHERE problem_id = $1
        ORDER BY order_index ASC
        "#,
    )
    .bind(problem_id)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let test_cases: Vec<ExportTestCase> = tc_rows
        .iter()
        .map(|r| ExportTestCase {
            input: r.get("input"),
            expected_output: r.get("expected_output"),
            is_hidden: r.get("is_hidden"),
            score: r.get("score"),
            order: r.get("order"),
        })
        .collect();

    // Build ZIP in blocking task (CPU-bound)
    let slug = crate::problem_export::slugify(&problem.title);
    let zip_bytes = tokio::task::spawn_blocking(move || build_problem_zip(&problem, &test_cases))
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map_err(|e| {
            tracing::warn!("Problem ZIP build error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/zip")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"problem-{}.zip\"", slug),
        )
        .body(Body::from(zip_bytes))
        .unwrap())
}

// ---------------------------------------------------------------------------
// User Import Handlers
// ---------------------------------------------------------------------------

/// POST /import/users/validate
///
/// Accepts a CSV file and default_password multipart fields, parses the CSV,
/// and returns a preview of what will be imported.
pub async fn validate_user_import(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    mut multipart: Multipart,
) -> Result<Json<ImportPreviewResponse>, StatusCode> {
    require_admin(&claims.role)?;

    let file_bytes = extract_file_bytes(&mut multipart, "file").await?;
    let default_password = extract_text_field(&mut multipart, "default_password").await?;

    if default_password.len() < 6 {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Query existing usernames to detect duplicates
    let existing_usernames: Vec<String> = sqlx::query_scalar("SELECT username FROM users")
        .fetch_all(&state.db_pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let skip_usernames: HashSet<String> = existing_usernames.into_iter().collect();

    // Parse CSV in a blocking task (CPU-bound)
    let rows = tokio::task::spawn_blocking(move || parse_user_csv(&file_bytes, &skip_usernames))
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map_err(|e| {
            tracing::warn!("User CSV parse error: {}", e);
            StatusCode::BAD_REQUEST
        })?;

    let token = Uuid::new_v4();
    let response = build_user_preview_response(&rows, token);

    // Cache the parsed rows for the execute step
    state.preview_cache.insert(
        token,
        Box::new(CachedPreview::User(UserImportPreview {
            rows,
            default_password,
        })),
    );

    // Auto-expire after 10 minutes (best-effort cleanup)
    let cache = state.preview_cache.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(600)).await;
        cache.remove(&token);
    });

    Ok(Json(response))
}

/// POST /import/users/execute
///
/// Accepts a preview token and creates users in the database.
pub async fn execute_user_import(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(req): Json<ImportExecuteRequest>,
) -> Result<Json<ImportResultResponse>, StatusCode> {
    require_admin(&claims.role)?;

    // Remove cached preview (single-use)
    let (_, cached) = state
        .preview_cache
        .remove(&req.token)
        .ok_or(StatusCode::BAD_REQUEST)?;

    let preview = cached
        .downcast_ref::<CachedPreview>()
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

    let (rows, default_password) = match preview {
        CachedPreview::User(p) => (&p.rows, p.default_password.clone()),
        CachedPreview::Problem(_) => return Err(StatusCode::BAD_REQUEST),
    };

    let total = rows.len();
    let mut created_items = Vec::new();
    let mut skipped_items = Vec::new();
    let mut error_items = Vec::new();

    for row in rows {
        match row.status {
            ImportItemStatus::Duplicate => {
                skipped_items.push(SkippedItem {
                    item: row.username.clone(),
                    reason: row
                        .warning
                        .clone()
                        .unwrap_or_else(|| "Username already exists".to_string()),
                });
            }
            ImportItemStatus::Error => {
                error_items.push(ErrorItem {
                    item: row.username.clone(),
                    reason: row
                        .warning
                        .clone()
                        .unwrap_or_else(|| "Parse error".to_string()),
                });
            }
            ImportItemStatus::Valid => {
                // Hash the default password
                let password_hash = match bcrypt::hash(&default_password, bcrypt::DEFAULT_COST) {
                    Ok(h) => h,
                    Err(e) => {
                        tracing::warn!("Failed to hash password for '{}': {}", row.username, e);
                        error_items.push(ErrorItem {
                            item: row.username.clone(),
                            reason: "Password hashing failed".to_string(),
                        });
                        continue;
                    }
                };

                // Insert user
                let result = sqlx::query_scalar::<_, uuid::Uuid>(
                    r#"
                    INSERT INTO users (username, email, password_hash, display_name, organization_id, campus_id)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                    "#,
                )
                .bind(&row.username)
                .bind(&row.email)
                .bind(&password_hash)
                .bind(&row.display_name)
                .bind(claims.school_id)
                .bind(row.campus_id)
                .fetch_one(&state.db_pool)
                .await;

                match result {
                    Ok(user_id) => {
                        // Insert role
                        if let Err(e) = sqlx::query(
                            "INSERT INTO user_roles (user_id, organization_id, campus_id, role) VALUES ($1, $2, $3, $4)",
                        )
                        .bind(user_id)
                        .bind(claims.school_id)
                        .bind(row.campus_id)
                        .bind(&row.role)
                        .execute(&state.db_pool)
                        .await
                        {
                            tracing::warn!(
                                "Failed to insert role for user '{}': {}",
                                row.username,
                                e
                            );
                        }

                        created_items.push(CreatedItem {
                            title: row.username.clone(),
                            id: user_id.as_bytes()[..8].iter().fold(0i64, |acc, &b| acc.wrapping_shl(8).wrapping_add(b as i64)),
                        });
                    }
                    Err(e) => {
                        tracing::warn!("Failed to insert user '{}': {}", row.username, e);
                        error_items.push(ErrorItem {
                            item: row.username.clone(),
                            reason: format!("Database error: {}", e),
                        });
                    }
                }
            }
        }
    }

    Ok(Json(ImportResultResponse {
        total,
        created: created_items.len(),
        skipped: skipped_items.len(),
        errors: error_items.len(),
        created_items,
        skipped_items,
        error_items,
    }))
}

// ---------------------------------------------------------------------------
// User Export Handler
// ---------------------------------------------------------------------------

/// GET /export/users
///
/// Returns a CSV file download for all users in the organization.
pub async fn export_users(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<Response, StatusCode> {
    require_admin(&claims.role)?;

    let rows = sqlx::query(
        r#"
        SELECT u.username, r.role, u.campus_id, u.display_name, u.email
        FROM users u
        JOIN user_roles r ON u.id = r.user_id
        WHERE u.organization_id = $1
        ORDER BY u.username ASC
        "#,
    )
    .bind(claims.school_id)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let export_rows: Vec<UserExportRow> = rows
        .iter()
        .map(|r| UserExportRow {
            username: r.get("username"),
            role: r.get("role"),
            campus_id: r.try_get("campus_id").unwrap_or(None),
            display_name: r.try_get("display_name").unwrap_or(None),
            email: r.try_get("email").unwrap_or(None),
        })
        .collect();

    // Build CSV in blocking task (CPU-bound)
    let csv_bytes = tokio::task::spawn_blocking(move || build_user_csv(&export_rows))
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map_err(|e| {
            tracing::warn!("User CSV build error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/csv")
        .header(
            header::CONTENT_DISPOSITION,
            "attachment; filename=\"users-export.csv\"",
        )
        .body(Body::from(csv_bytes))
        .unwrap())
}
