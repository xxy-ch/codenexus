use api_infra::state::AppState;
use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use serde_json::json;
use shared::models::role::Role;
use shared::models::Claims;

use crate::queue::{self, AnalysisJobMessage};
use crate::service::AnalysisService;

/// Authorization gate for per-submission analysis endpoints.
///
/// A caller may read or trigger analysis on a submission when either:
///   - they own the submission (`claims.sub == submission owner`), or
///   - they hold a teacher-or-above role (teachers legitimately review student work).
///
/// Returns `Ok(())` on success, or an `Err(StatusCode)`: 404 when the
/// submission does not exist in the caller's org, 403 when an authenticated
/// non-owner student tries to access another student's submission.
async fn authorize_submission_access(
    service: &AnalysisService,
    claims: &Claims,
    submission_id: i64,
) -> Result<(), StatusCode> {
    let organization_id = claims.school_id;
    let owner = service
        .get_submission_owner(submission_id, organization_id)
        .await
        .map_err(|error| {
            tracing::error!(
                error = %error,
                submission_id,
                organization_id,
                "authorize_submission_access: DB error"
            );
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    match owner {
        None => Err(StatusCode::NOT_FOUND),
        Some(owner) if owner == claims.sub => Ok(()),
        Some(_) => {
            // Not the owner — allow only for teacher-or-above roles.
            let role = claims
                .role
                .parse::<Role>()
                .map_err(|_| StatusCode::FORBIDDEN)?;
            if role.is_higher_or_equal(Role::Teacher) {
                Ok(())
            } else {
                Err(StatusCode::FORBIDDEN)
            }
        }
    }
}

/// Query parameters for the similar-submissions endpoints.
#[derive(Debug, Deserialize)]
pub struct SimilarQueryParams {
    /// Maximum number of results to return. Defaults to 20.
    #[serde(default = "default_limit")]
    pub limit: i64,
    /// Minimum combined similarity score (0.0–1.0). Results below this
    /// threshold are excluded. Defaults to 0.5.
    #[serde(default = "default_min_similarity")]
    pub min_similarity: f64,
}

fn default_limit() -> i64 {
    20
}

fn default_min_similarity() -> f64 {
    0.5
}

pub fn analysis_router() -> Router<AppState> {
    Router::new()
        .route(
            "/submissions/:submission_id/features",
            get(get_submission_features),
        )
        .route(
            "/submissions/:submission_id/trigger-feedback",
            post(trigger_feedback),
        )
        .route(
            "/submissions/:submission_id/ai-feedback",
            get(get_ai_feedback),
        )
        .route(
            "/submissions/:submission_id/similar",
            get(get_similar_submissions),
        )
        .route(
            "/submissions/:submission_id/similar-cross",
            get(get_cross_problem_similar),
        )
        .route(
            "/problems/:problem_id/teaching-cards",
            get(get_teaching_cards),
        )
        .route("/problems/:problem_id/clusters", get(get_solution_clusters))
        .route(
            "/problems/:problem_id/recommend",
            get(get_problem_recommendations),
        )
        .route("/classes/:class_id/cognition", get(get_class_cognition))
}

pub async fn get_submission_features(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(submission_id): Path<i64>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let service = AnalysisService::new(state.db_pool.clone());
    let organization_id = claims.school_id;

    // Authorization: owner or teacher+ (prevents horizontal privilege escalation).
    authorize_submission_access(&service, &claims, submission_id).await?;

    match service
        .get_submission_features(submission_id, organization_id)
        .await
    {
        Ok(Some(features)) => serde_json::to_value(features)
            .map(Json)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(error) => {
            tracing::error!(error = %error, submission_id, organization_id, "failed to load submission analysis features");
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn get_teaching_cards(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(problem_id): Path<i64>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let service = AnalysisService::new(state.db_pool.clone());
    let organization_id = claims.school_id;

    match service
        .get_teaching_cards(problem_id, organization_id)
        .await
    {
        Ok(cards) => Ok(Json(json!({ "cards": cards }))),
        Err(error) => {
            tracing::error!(error = %error, problem_id, organization_id, "failed to load teaching cards");
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn get_solution_clusters(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(problem_id): Path<i64>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let service = AnalysisService::new(state.db_pool.clone());
    let organization_id = claims.school_id;

    match service
        .get_solution_clusters(problem_id, organization_id)
        .await
    {
        Ok(clusters) => Ok(Json(json!({ "clusters": clusters }))),
        Err(error) => {
            tracing::error!(error = %error, problem_id, organization_id, "failed to load solution clusters");
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn get_class_cognition(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(class_id): Path<i64>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let service = AnalysisService::new(state.db_pool.clone());
    let organization_id = claims.school_id;

    match service.get_class_snapshot(class_id, organization_id).await {
        Ok(Some(snapshot)) => serde_json::to_value(snapshot)
            .map(Json)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(error) => {
            tracing::error!(error = %error, class_id, organization_id, "failed to load class cognition snapshot");
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// POST /analysis/submissions/:submission_id/trigger-feedback
///
/// On-demand trigger for LLM analysis. Creates an analysis job and enqueues
/// it to Redis Streams for the llm-worker to pick up. Idempotent — if a
/// pending or processing job already exists, returns its status instead of
/// creating a duplicate.
pub async fn trigger_feedback(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(submission_id): Path<i64>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let service = AnalysisService::new(state.db_pool.clone());
    let organization_id = claims.school_id;

    // 1. Authorization: only the submission owner or a teacher+ may trigger
    //    paid LLM analysis. This blocks cost abuse (any user triggering jobs on
    //    others' submissions) and horizontal privilege escalation.
    authorize_submission_access(&service, &claims, submission_id).await?;

    // 2. Verify the submission exists and belongs to this organization.
    let meta = service
        .get_submission_meta(submission_id, organization_id)
        .await
        .map_err(|error| {
            tracing::error!(error = %error, submission_id, "trigger_feedback: DB error looking up submission");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let meta = match meta {
        Some(m) => m,
        None => return Err(StatusCode::NOT_FOUND),
    };

    // 3. Check for an existing active job — avoid duplicates.
    let existing = service
        .find_latest_job_by_submission(submission_id, organization_id)
        .await
        .map_err(|error| {
            tracing::error!(error = %error, submission_id, "trigger_feedback: DB error checking existing job");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    if let Some(ref job) = existing {
        if job.status == "pending" || job.status == "processing" {
            return Ok(Json(json!({
                "job_id": job.id,
                "status": job.status,
                "message": "AI analysis already in progress"
            })));
        }
    }

    // 4. Create a new analysis job in the DB.
    let new_job = crate::models::NewAnalysisJob {
        submission_id,
        problem_id: meta.problem_id,
        user_id: meta.user_id,
        organization_id,
        campus_id: None,
        grade_id: None,
        contest_id: None,
    };

    let job_id = service.create_job(&new_job).await.map_err(|error| {
        tracing::error!(error = %error, submission_id, "trigger_feedback: failed to create analysis job");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // 5. Enqueue the task to Redis for the llm-worker.
    let redis_pool = match state.redis_pool.as_ref() {
        Some(pool) => pool,
        None => {
            tracing::error!("trigger_feedback: Redis pool not configured");
            return Err(StatusCode::SERVICE_UNAVAILABLE);
        }
    };

    // Ensure consumer group exists so llm-worker can consume immediately.
    if let Err(error) = queue::ensure_llm_consumer_group(redis_pool).await {
        // Non-fatal — the llm-worker also creates the group on startup.
        tracing::warn!(error = %error, "Failed to ensure consumer group (non-fatal)");
    }

    let task_msg = AnalysisJobMessage {
        job_id,
        submission_id,
        problem_id: meta.problem_id,
        user_id: meta.user_id,
        organization_id,
        campus_id: None,
        grade_id: None,
        contest_id: None,
    };

    queue::emit_llm_task(redis_pool, &task_msg)
        .await
        .map_err(|error| {
            tracing::error!(
                error = %error,
                job_id,
                submission_id,
                "trigger_feedback: failed to enqueue LLM task"
            );
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    tracing::info!(job_id, submission_id, "Triggered LLM feedback analysis");

    Ok(Json(json!({
        "job_id": job_id,
        "status": "pending",
        "message": "AI analysis task queued"
    })))
}

/// GET /analysis/submissions/:submission_id/ai-feedback
///
/// Query the status and result of an LLM analysis job. Returns the job status
/// and, if completed, the associated teaching card content.
pub async fn get_ai_feedback(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(submission_id): Path<i64>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let service = AnalysisService::new(state.db_pool.clone());
    let organization_id = claims.school_id;

    // Authorization: owner or teacher+ (prevents reading others' analysis).
    authorize_submission_access(&service, &claims, submission_id).await?;

    match service
        .get_ai_feedback(submission_id, organization_id)
        .await
    {
        Ok(Some(result)) => {
            let card_json = result.card.map(|card| {
                json!({
                    "id": card.id,
                    "card_type": card.card_type,
                    "title": card.title,
                    "content": card.content,
                })
            });

            Ok(Json(json!({
                "job_id": result.job.id,
                "submission_id": result.job.submission_id,
                "status": result.job.status,
                "llm_model": result.job.llm_model,
                "created_at": result.job.created_at,
                "updated_at": result.job.updated_at,
                "card": card_json,
                "error_message": result.job.error_message,
            })))
        }
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(error) => {
            tracing::error!(
                error = %error,
                submission_id,
                organization_id,
                "failed to load AI feedback"
            );
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// GET /analysis/submissions/:submission_id/similar
///
/// Retrieve the most similar submissions to the given submission within the
/// **same problem**, constrained to the same organization (multi-tenant).
///
/// Query params:
///   - `limit` (default 20): max results
///   - `min_similarity` (default 0.5): minimum combined similarity score
pub async fn get_similar_submissions(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(submission_id): Path<i64>,
    Query(params): Query<SimilarQueryParams>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let service = AnalysisService::new(state.db_pool.clone());
    let organization_id = claims.school_id;

    // Authorization: owner or teacher+ (prevents enumerating peers' metrics).
    authorize_submission_access(&service, &claims, submission_id).await?;

    let start = std::time::Instant::now();

    let mut results = service
        .find_similar_submissions(submission_id, organization_id, params.limit)
        .await
        .map_err(|error| {
            tracing::error!(
                error = %error,
                submission_id,
                organization_id,
                "failed to find similar submissions"
            );
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // Apply minimum similarity threshold at the routing layer.
    results.retain(|s| s.similarity_score >= params.min_similarity);

    let elapsed_ms = start.elapsed().as_millis() as i64;

    tracing::info!(
        submission_id,
        organization_id,
        result_count = results.len(),
        elapsed_ms,
        "similar submissions retrieval completed"
    );

    Ok(Json(json!({
        "query_submission_id": submission_id,
        "count": results.len(),
        "elapsed_ms": elapsed_ms,
        "similar_submissions": results,
    })))
}

/// GET /analysis/submissions/:submission_id/similar-cross
///
/// Retrieve the most similar submissions to the given submission **across all
/// problems** within the same organization.
///
/// Query params:
///   - `limit` (default 20): max results
///   - `min_similarity` (default 0.5): minimum combined similarity score
pub async fn get_cross_problem_similar(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(submission_id): Path<i64>,
    Query(params): Query<SimilarQueryParams>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let service = AnalysisService::new(state.db_pool.clone());
    let organization_id = claims.school_id;

    // Authorization: owner or teacher+ (prevents enumerating peers' metrics).
    authorize_submission_access(&service, &claims, submission_id).await?;

    let start = std::time::Instant::now();

    let mut results = service
        .find_cross_problem_similar(submission_id, organization_id, params.limit)
        .await
        .map_err(|error| {
            tracing::error!(
                error = %error,
                submission_id,
                organization_id,
                "failed to find cross-problem similar submissions"
            );
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // Apply minimum similarity threshold at the routing layer.
    results.retain(|s| s.similarity_score >= params.min_similarity);

    let elapsed_ms = start.elapsed().as_millis() as i64;

    tracing::info!(
        submission_id,
        organization_id,
        result_count = results.len(),
        elapsed_ms,
        "cross-problem similar submissions retrieval completed"
    );

    Ok(Json(json!({
        "query_submission_id": submission_id,
        "count": results.len(),
        "elapsed_ms": elapsed_ms,
        "similar_submissions": results,
    })))
}

/// GET /analysis/problems/:problem_id/recommend
///
/// Get rule-based problem recommendations for the current user based on
/// their submission history and the given problem's difficulty. Returns
/// up to 5 recommended problems: up to 3 at the same difficulty level
/// (unsolved) and up to 2 at the next difficulty level.
///
/// Results are cached in Redis for 1 hour per (user, problem) pair.
pub async fn get_problem_recommendations(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(problem_id): Path<i64>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let service = AnalysisService::new(state.db_pool.clone());
    let organization_id = claims.school_id;
    let user_id = claims.sub;

    let start = std::time::Instant::now();

    let redis_pool = state.redis_pool.as_ref();

    let recommendations = service
        .get_problem_recommendations(user_id, problem_id, organization_id, redis_pool)
        .await
        .map_err(|error| {
            tracing::error!(
                error = %error,
                problem_id,
                organization_id,
                user_id = %user_id,
                "failed to generate problem recommendations"
            );
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let elapsed_ms = start.elapsed().as_millis() as i64;

    tracing::info!(
        problem_id,
        organization_id,
        user_id = %user_id,
        count = recommendations.len(),
        elapsed_ms,
        "problem recommendations generated"
    );

    Ok(Json(json!({
        "problem_id": problem_id,
        "user_id": user_id,
        "count": recommendations.len(),
        "elapsed_ms": elapsed_ms,
        "recommendations": recommendations,
    })))
}
