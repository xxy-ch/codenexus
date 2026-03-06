use super::{models::*, service::NotificationService};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use crate::AppState;
use crate::middleware::auth::AuthExtractor;

pub fn notifications_router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/", axum::routing::get(list_notifications))
        .route("/stats", axum::routing::get(get_notification_stats))
        .route("/mark-read", axum::routing::post(mark_as_read))
        .route("/mark-all-read", axum::routing::post(mark_all_as_read))
        .route("/settings", axum::routing::get(get_settings))
        .route("/settings", axum::routing::put(update_settings))
        .route("/:id", axum::routing::delete(delete_notification))
}

async fn list_notifications(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Query(query): Query<ListNotificationsQuery>,
) -> Result<impl IntoResponse, AppError> {
    let service = NotificationService::new(state.db_pool);
    let result = service.list_notifications(claims.sub, query).await?;
    Ok(Json(result))
}

async fn get_notification_stats(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<impl IntoResponse, AppError> {
    let service = NotificationService::new(state.db_pool);
    let stats = service.get_stats(claims.sub).await?;
    Ok(Json(stats))
}

async fn mark_as_read(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(req): Json<MarkAsReadRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = NotificationService::new(state.db_pool);
    let count = service.mark_as_read(claims.sub, req.notification_ids).await?;
    Ok(Json(serde_json::json!({
        "message": "Notifications marked as read",
        "count": count
    })))
}

async fn mark_all_as_read(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<impl IntoResponse, AppError> {
    let service = NotificationService::new(state.db_pool);
    let count = service.mark_all_as_read(claims.sub).await?;
    Ok(Json(serde_json::json!({
        "message": "All notifications marked as read",
        "count": count
    })))
}

async fn delete_notification(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(id): Path<uuid::Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = NotificationService::new(state.db_pool);
    let deleted = service.delete_notification(claims.sub, id).await?;

    if deleted {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Ok(StatusCode::NOT_FOUND)
    }
}

async fn get_settings(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<impl IntoResponse, AppError> {
    let service = NotificationService::new(state.db_pool);
    let settings = service.get_settings(claims.sub).await?;

    if let Some(settings) = settings {
        Ok(Json(settings))
    } else {
        // Return default settings
        Ok(Json(NotificationSettings {
            user_id: None,
            email_notifications: true,
            reply_notifications: true,
            comment_notifications: true,
            like_notifications: true,
            mention_notifications: true,
            system_notifications: true,
            digest_mode: "immediate".to_string(),
        }))
    }
}

async fn update_settings(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(settings): Json<NotificationSettings>,
) -> Result<impl IntoResponse, AppError> {
    let service = NotificationService::new(state.db_pool);

    // Validate digest_mode
    if !["immediate", "hourly", "daily"].contains(&settings.digest_mode.as_str()) {
        return Err(AppError::Validation("digest_mode must be one of: immediate, hourly, daily".to_string()));
    }

    let updated = service.update_settings(claims.sub, settings).await?;
    Ok(Json(updated))
}

#[derive(Debug)]
pub enum AppError {
    Notification(String),
    Validation(String),
    Database(String),
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            AppError::Notification(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Database(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        let body = Json(serde_json::json!({
            "error": message,
            "status": status.as_u16(),
        }));

        (status, body).into_response()
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::Internal(err.to_string())
    }
}
