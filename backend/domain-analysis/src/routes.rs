use api_infra::state::AppState;
use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde_json::json;
use shared::models::Claims;

use crate::service::AnalysisService;

pub fn analysis_router() -> Router<AppState> {
    Router::new()
        .route(
            "/submissions/:submission_id/features",
            get(get_submission_features),
        )
        .route(
            "/problems/:problem_id/teaching-cards",
            get(get_teaching_cards),
        )
        .route("/problems/:problem_id/clusters", get(get_solution_clusters))
        .route("/classes/:class_id/cognition", get(get_class_cognition))
}

pub async fn get_submission_features(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(submission_id): Path<i64>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let service = AnalysisService::new(state.db_pool.clone());
    let organization_id = claims.school_id;

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
