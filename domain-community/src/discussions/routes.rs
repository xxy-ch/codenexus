use axum::{
    extract::{Path, State},
    response::Json,
    routing::{delete, get, patch, post},
    Extension, Router,
};
use serde_json::json;
use uuid::Uuid;

use super::{models::*, service::DiscussionService};
use api_infra::state::AppState;
use api_infra::websocket::message::WebSocketMessage;
use shared::models::{Claims, Role};

/// Create discussions router
pub fn discussions_router() -> Router<AppState> {
    Router::new()
        .route(
            "/",
            get(get_discussions_handler).post(create_discussion_handler),
        )
        .route("/:id", get(get_discussion_handler))
        .route(
            "/:id",
            patch(update_discussion_handler).delete(delete_discussion_handler),
        )
        .route(
            "/:id/replies",
            get(get_replies_handler).post(create_reply_handler),
        )
        .route("/:id/like", post(like_discussion_handler))
        .route("/replies/:reply_id/like", post(like_reply_handler))
}

/// Get discussions list
async fn get_discussions_handler(
    State(state): State<AppState>,
    axum::extract::Query(filters): axum::extract::Query<DiscussionFilters>,
) -> Result<Json<DiscussionListResponse>, (axum::http::StatusCode, String)> {
    let service = DiscussionService::new(state.db_pool);

    match service.get_discussions(filters).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            tracing::error!("Error fetching discussions: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get discussion detail
async fn get_discussion_handler(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<DiscussionDetail>, (axum::http::StatusCode, String)> {
    let service = DiscussionService::new(state.db_pool);

    match service.get_discussion_detail(id).await {
        Ok(detail) => Ok(Json(detail)),
        Err(e) => {
            if e.to_string().contains("not found") {
                Err((
                    axum::http::StatusCode::NOT_FOUND,
                    "Discussion not found".to_string(),
                ))
            } else {
                tracing::error!("Error fetching discussion: {}", e);
                Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
            }
        }
    }
}

/// Create discussion
async fn create_discussion_handler(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    axum::extract::Json(req): axum::extract::Json<CreateDiscussionRequest>,
) -> Result<Json<Discussion>, (axum::http::StatusCode, String)> {
    let service = DiscussionService::new(state.db_pool);

    match service.create_discussion(user_id, req).await {
        Ok(discussion) => Ok(Json(discussion)),
        Err(e) => {
            tracing::error!("Error creating discussion: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Update discussion
async fn update_discussion_handler(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Extension(user_id): Extension<Uuid>,
    axum::extract::Json(req): axum::extract::Json<UpdateDiscussionRequest>,
) -> Result<Json<Discussion>, (axum::http::StatusCode, String)> {
    let service = DiscussionService::new(state.db_pool);

    match service.update_discussion(id, user_id, req).await {
        Ok(discussion) => Ok(Json(discussion)),
        Err(e) => {
            if e.to_string().contains("not found") {
                Err((
                    axum::http::StatusCode::NOT_FOUND,
                    "Discussion not found".to_string(),
                ))
            } else {
                tracing::error!("Error updating discussion: {}", e);
                Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
            }
        }
    }
}

/// Delete discussion
async fn delete_discussion_handler(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Extension(user_id): Extension<Uuid>,
    Extension(claims): Extension<Claims>,
) -> Result<axum::http::StatusCode, (axum::http::StatusCode, String)> {
    let is_admin = matches!(
        claims.role.parse::<Role>(),
        Ok(Role::Root | Role::OrganizationAdmin | Role::CampusAdmin)
    );

    let service = DiscussionService::new(state.db_pool);

    match service.delete_discussion(id, user_id, is_admin).await {
        Ok(true) => Ok(axum::http::StatusCode::NO_CONTENT),
        Ok(false) => Err((
            axum::http::StatusCode::FORBIDDEN,
            "Not authorized".to_string(),
        )),
        Err(e) => {
            tracing::error!("Error deleting discussion: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get discussion replies
async fn get_replies_handler(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Vec<DiscussionReply>>, (axum::http::StatusCode, String)> {
    let service = DiscussionService::new(state.db_pool);

    match service.get_discussion_detail(id).await {
        Ok(detail) => Ok(Json(detail.replies)),
        Err(e) => {
            tracing::error!("Error fetching replies: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Create reply
async fn create_reply_handler(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Extension(user_id): Extension<Uuid>,
    axum::extract::Json(req): axum::extract::Json<CreateReplyRequest>,
) -> Result<Json<DiscussionReply>, (axum::http::StatusCode, String)> {
    let service = DiscussionService::new(state.db_pool);

    match service.create_reply(id, user_id, req).await {
        Ok(reply) => {
            // Send WebSocket notification for new reply
            let msg = WebSocketMessage::DiscussionReply {
                discussion_id: id,
                reply_id: reply.id,
                user_id: reply.author_id,
                username: reply.author_id.to_string(),
                content: reply.content.clone(),
                created_at: reply.created_at,
            };
            let _ = state
                .websocket_server
                .send_to_topic(&format!("discussion:{}", id), &msg)
                .await;
            Ok(Json(reply))
        }
        Err(e) => {
            if e.to_string().contains("locked") {
                Err((
                    axum::http::StatusCode::FORBIDDEN,
                    "Discussion is locked".to_string(),
                ))
            } else {
                tracing::error!("Error creating reply: {}", e);
                Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
            }
        }
    }
}

/// Like discussion
async fn like_discussion_handler(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<bool>, (axum::http::StatusCode, String)> {
    let service = DiscussionService::new(state.db_pool);

    match service.toggle_like(user_id, "discussion", id).await {
        Ok(liked) => Ok(Json(liked)),
        Err(e) => {
            tracing::error!("Error toggling like: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Like reply
async fn like_reply_handler(
    State(state): State<AppState>,
    Path(reply_id): Path<i64>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<bool>, (axum::http::StatusCode, String)> {
    let service = DiscussionService::new(state.db_pool);

    match service.toggle_like(user_id, "reply", reply_id).await {
        Ok(liked) => Ok(Json(liked)),
        Err(e) => {
            tracing::error!("Error toggling like: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}
