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
    ProblemImportPreview, SkippedItem, UserImportPreview, UserImportPreviewResponse,
    UserPreviewItem,
};
use crate::problem_export::{build_problem_zip, ExportProblem, ExportTestCase};
use crate::problem_import::{convert_to_test_cases, parse_problem_zip};
use crate::user_export::{build_user_csv, UserExportRow};
use crate::user_import::{parse_user_csv, RolePolicy};

/// Maximum number of concurrent preview tokens in the cache.
const MAX_PREVIEW_CACHE_SIZE: usize = 1000;

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

/// Check if the caller is specifically a CampusAdmin (requires campus scoping).
fn is_campus_admin(role: &str) -> bool {
    role.parse::<Role>().ok() == Some(Role::CampusAdmin)
}

/// Collect all fields from a multipart request into a name→bytes map.
///
/// Single-pass traversal avoids field-order dependency.
async fn collect_multipart_fields(
    multipart: &mut Multipart,
) -> Result<std::collections::HashMap<String, Vec<u8>>, StatusCode> {
    let mut fields = std::collections::HashMap::new();
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?
    {
        if let Some(name) = field.name().map(|s| s.to_string()) {
            let bytes = field
                .bytes()
                .await
                .map(|b| b.to_vec())
                .map_err(|_| StatusCode::BAD_REQUEST)?;
            fields.insert(name, bytes);
        }
    }
    Ok(fields)
}

/// Get a required file field from the collected map.
fn get_file_field(
    fields: &std::collections::HashMap<String, Vec<u8>>,
    name: &str,
) -> Result<Vec<u8>, StatusCode> {
    fields.get(name).cloned().ok_or(StatusCode::BAD_REQUEST)
}

/// Get a required text field from the collected map.
fn get_text_field(
    fields: &std::collections::HashMap<String, Vec<u8>>,
    name: &str,
) -> Result<String, StatusCode> {
    fields
        .get(name)
        .map(|b| String::from_utf8_lossy(b).to_string())
        .ok_or(StatusCode::BAD_REQUEST)
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

/// Build a user-specific preview response from parsed user rows.
fn build_user_preview_response(rows: &[crate::models::UserImportRow], token: Uuid) -> UserImportPreviewResponse {
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

        preview_items.push(UserPreviewItem {
            username: row.username.clone(),
            role: row.role.clone(),
            campus_id: row.campus_id,
            display_name: row.display_name.clone(),
            email: row.email.clone(),
            status: status_str.to_string(),
            warning: row.warning.clone(),
        });
    }

    UserImportPreviewResponse {
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

    let fields = collect_multipart_fields(&mut multipart).await?;
    let file_bytes = get_file_field(&fields, "file")?;

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
    if state.preview_cache.len() >= MAX_PREVIEW_CACHE_SIZE {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }
    state.preview_cache.insert(
        token,
        Box::new(CachedPreview::Problem(ProblemImportPreview {
            items,
            creator_user_id: claims.sub,
            organization_id: claims.school_id,
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

/// POST /import/problems/execute
///
/// Accepts a preview token and creates problems in the database.
pub async fn execute_problem_import(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(req): Json<ImportExecuteRequest>,
) -> Result<Json<ImportResultResponse>, StatusCode> {
    require_teacher_plus(&claims.role)?;

    // Read-only peek to validate ownership before consuming the token
    let ref_entry = state
        .preview_cache
        .get(&req.token)
        .ok_or(StatusCode::BAD_REQUEST)?;

    let preview = ref_entry
        .downcast_ref::<CachedPreview>()
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

    match preview {
        CachedPreview::Problem(p) => {
            if p.creator_user_id != claims.sub || p.organization_id != claims.school_id {
                return Err(StatusCode::FORBIDDEN);
            }
        }
        CachedPreview::User(_) => return Err(StatusCode::BAD_REQUEST),
    }

    // Ownership verified — drop the read guard and atomically consume the token
    drop(ref_entry);
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
                // Insert problem + test cases in a transaction
                let tc_req = convert_to_test_cases(item);

                // Derive visibility: is_public=true → 'public', else use config visibility
                let visibility = if item.config.is_public {
                    "public".to_string()
                } else {
                    item.config.visibility.clone()
                };

                let tx_result = state.db_pool.begin().await;
                let mut tx = match tx_result {
                    Ok(tx) => tx,
                    Err(e) => {
                        tracing::warn!("Failed to begin transaction: {}", e);
                        error_items.push(ErrorItem {
                            item: item.config.title.clone(),
                            reason: "Failed to start database transaction".to_string(),
                        });
                        continue;
                    }
                };

                let problem_result = sqlx::query_scalar::<_, i64>(
                    r#"
                    INSERT INTO problems (
                        title, description, difficulty, time_limit_ms, memory_limit_kb,
                        organization_id, author_id, visibility
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                    "#,
                )
                .bind(&item.config.title)
                .bind(&item.description)
                .bind(&item.config.difficulty)
                .bind(item.config.time_limit)
                .bind(item.config.memory_limit * 1024)  // MB → KB
                .bind(claims.school_id)
                .bind(claims.sub)                        // author_id (NOT NULL)
                .bind(&visibility)
                .fetch_one(&mut *tx)
                .await;

                match problem_result {
                    Ok(problem_id) => {
                        let mut tc_ok = true;
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
                            .execute(&mut *tx)
                            .await
                            {
                                tracing::warn!(
                                    "Failed to insert test case {} for problem '{}': {}",
                                    idx,
                                    item.config.title,
                                    e
                                );
                                tc_ok = false;
                                error_items.push(ErrorItem {
                                    item: format!("{} (test case {})", item.config.title, idx),
                                    reason: format!("Test case insert failed: {}", e),
                                });
                                break;
                            }
                        }

                        if tc_ok {
                            if let Err(e) = tx.commit().await {
                                tracing::warn!("Failed to commit problem '{}': {}", item.config.title, e);
                                error_items.push(ErrorItem {
                                    item: item.config.title.clone(),
                                    reason: format!("Transaction commit failed: {}", e),
                                });
                            } else {
                                created_items.push(CreatedItem {
                                    title: item.config.title.clone(),
                                    id: problem_id.to_string(),
                                });
                            }
                        } else {
                            // Test case insertion failed — rollback
                            let _ = tx.rollback().await;
                        }
                    }
                    Err(e) => {
                        tracing::warn!("Failed to insert problem '{}': {}", item.config.title, e);
                        let _ = tx.rollback().await;
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
            id, title, description, difficulty, time_limit_ms, memory_limit_kb,
            organization_id, visibility
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

    let visibility_str: String = row.get("visibility");
    let problem = ExportProblem {
        title: row.get("title"),
        description: row.get("description"),
        difficulty: row.get("difficulty"),
        time_limit: row.get::<i32, _>("time_limit_ms"),
        memory_limit: row.get::<i32, _>("memory_limit_kb") / 1024,  // KB → MB
        is_public: visibility_str == "public",
        visibility: visibility_str,
        tags: vec![],        // not stored in DB
        source_url: None,    // not stored in DB
        author_note: None,   // not stored in DB
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
) -> Result<Json<UserImportPreviewResponse>, StatusCode> {
    require_admin(&claims.role)?;

    let fields = collect_multipart_fields(&mut multipart).await?;
    let file_bytes = get_file_field(&fields, "file")?;
    let default_password = get_text_field(&fields, "default_password")?;

    if default_password.len() < 6 {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Query existing usernames to detect duplicates
    let existing_usernames: Vec<String> = sqlx::query_scalar("SELECT username FROM users")
        .fetch_all(&state.db_pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let skip_usernames: HashSet<String> = existing_usernames.into_iter().collect();

    // Determine role policy: only root may assign orgAdmin/campusAdmin
    let caller_role: Role = claims.role.parse().map_err(|_| StatusCode::FORBIDDEN)?;
    let allow_root_roles = caller_role == Role::Root;
    let role_policy = RolePolicy { allow_root_roles };

    // Parse CSV in a blocking task (CPU-bound)
    let rows = tokio::task::spawn_blocking(move || {
        parse_user_csv(&file_bytes, &skip_usernames, &role_policy)
    })
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map_err(|e| {
            tracing::warn!("User CSV parse error: {}", e);
            StatusCode::BAD_REQUEST
        })?;

    let token = Uuid::new_v4();
    let response = build_user_preview_response(&rows, token);

    // Cache the parsed rows for the execute step
    if state.preview_cache.len() >= MAX_PREVIEW_CACHE_SIZE {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }
    state.preview_cache.insert(
        token,
        Box::new(CachedPreview::User(UserImportPreview {
            rows,
            default_password,
            creator_user_id: claims.sub,
            organization_id: claims.school_id,
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

    // Read-only peek to validate ownership before consuming the token
    let ref_entry = state
        .preview_cache
        .get(&req.token)
        .ok_or(StatusCode::BAD_REQUEST)?;

    let preview = ref_entry
        .downcast_ref::<CachedPreview>()
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

    match preview {
        CachedPreview::User(p) => {
            if p.creator_user_id != claims.sub || p.organization_id != claims.school_id {
                return Err(StatusCode::FORBIDDEN);
            }
        }
        CachedPreview::Problem(_) => return Err(StatusCode::BAD_REQUEST),
    }

    // Ownership verified — drop the read guard and atomically consume the token
    drop(ref_entry);
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
                // CampusAdmin can only import users into their own campus
                if is_campus_admin(&claims.role) {
                    let caller_campus = match claims.campus_id {
                        Some(c) => c,
                        None => {
                            error_items.push(ErrorItem {
                                item: row.username.clone(),
                                reason: "Campus admin has no campus assignment".to_string(),
                            });
                            continue;
                        }
                    };
                    if row.campus_id != caller_campus {
                        skipped_items.push(SkippedItem {
                            item: row.username.clone(),
                            reason: "Campus admin can only import users for their own campus"
                                .to_string(),
                        });
                        continue;
                    }
                }

                // Hash the default password in a blocking task to avoid starving the runtime
                let pw = default_password.clone();
                let username_for_hash = row.username.clone();
                let password_hash = match tokio::task::spawn_blocking(move || {
                    bcrypt::hash(&pw, bcrypt::DEFAULT_COST)
                })
                .await
                {
                    Ok(Ok(h)) => h,
                    Ok(Err(e)) => {
                        tracing::warn!(
                            "Failed to hash password for '{}': {}",
                            username_for_hash,
                            e
                        );
                        error_items.push(ErrorItem {
                            item: row.username.clone(),
                            reason: "Password hashing failed".to_string(),
                        });
                        continue;
                    }
                    Err(e) => {
                        tracing::warn!(
                            "spawn_blocking panicked for '{}': {}",
                            username_for_hash,
                            e
                        );
                        error_items.push(ErrorItem {
                            item: row.username.clone(),
                            reason: "Password hashing failed".to_string(),
                        });
                        continue;
                    }
                };

                // Insert user + role in a transaction
                let tx_result = state.db_pool.begin().await;
                let mut tx = match tx_result {
                    Ok(tx) => tx,
                    Err(e) => {
                        tracing::warn!("Failed to begin transaction for '{}': {}", row.username, e);
                        error_items.push(ErrorItem {
                            item: row.username.clone(),
                            reason: "Failed to start database transaction".to_string(),
                        });
                        continue;
                    }
                };

                let user_result = sqlx::query_scalar::<_, uuid::Uuid>(
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
                .fetch_one(&mut *tx)
                .await;

                match user_result {
                    Ok(user_id) => {
                        let role_result = sqlx::query(
                            "INSERT INTO user_roles (user_id, organization_id, campus_id, role) VALUES ($1, $2, $3, $4)",
                        )
                        .bind(user_id)
                        .bind(claims.school_id)
                        .bind(row.campus_id)
                        .bind(&row.role)
                        .execute(&mut *tx)
                        .await;

                        match role_result {
                            Ok(_) => {
                                if let Err(e) = tx.commit().await {
                                    tracing::warn!("Failed to commit user '{}': {}", row.username, e);
                                    error_items.push(ErrorItem {
                                        item: row.username.clone(),
                                        reason: format!("Transaction commit failed: {}", e),
                                    });
                                } else {
                                    created_items.push(CreatedItem {
                                        title: row.username.clone(),
                                        id: user_id.to_string(),
                                    });
                                }
                            }
                            Err(e) => {
                                tracing::warn!("Failed to insert role for '{}': {}", row.username, e);
                                let _ = tx.rollback().await;
                                error_items.push(ErrorItem {
                                    item: row.username.clone(),
                                    reason: format!("Role insertion failed: {}", e),
                                });
                            }
                        }
                    }
                    Err(e) => {
                        tracing::warn!("Failed to insert user '{}': {}", row.username, e);
                        let _ = tx.rollback().await;
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

    // CampusAdmin can only export users from their own campus
    let rows = if is_campus_admin(&claims.role) {
        let campus_id = claims.campus_id.ok_or(StatusCode::FORBIDDEN)?;
        sqlx::query(
            r#"
            SELECT u.username, r.role, u.campus_id, u.display_name, u.email
            FROM users u
            JOIN user_roles r ON u.id = r.user_id
            WHERE u.organization_id = $1 AND u.campus_id = $2
            ORDER BY u.username ASC
            "#,
        )
        .bind(claims.school_id)
        .bind(campus_id)
        .fetch_all(&state.db_pool)
        .await
    } else {
        sqlx::query(
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
    }
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
