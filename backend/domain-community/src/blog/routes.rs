use axum::{
    extract::{Path, State},
    response::Json,
    routing::{get, patch, post},
    Extension, Router,
};
use serde_json::json;
use uuid::Uuid;

use super::{models::*, service::BlogService};
use api_infra::state::AppState;
use api_infra::websocket::message::WebSocketMessage;
use shared::models::{Claims, Role};

/// Create blog router
pub fn blog_router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_articles_handler).post(create_article_handler))
        .route("/trending", get(get_trending_handler))
        .route("/featured", get(get_featured_handler))
        .route("/categories", get(get_categories_handler))
        .route("/tags/popular", get(get_popular_tags_handler))
        .route("/:slug_or_id", get(get_article_handler))
        .route(
            "/:slug_or_id",
            patch(update_article_handler).delete(delete_article_handler),
        )
        .route(
            "/:slug_or_id/comments",
            get(get_comments_handler).post(create_comment_handler),
        )
        .route("/:id/like", post(like_article_handler))
        .route("/comments/:comment_id/like", post(like_comment_handler))
}

/// Get articles list
async fn get_articles_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(filters): axum::extract::Query<ArticleFilters>,
) -> Result<Json<ArticleListResponse>, (axum::http::StatusCode, String)> {
    let service = BlogService::new(state.db_pool);

    match service.get_articles(filters, claims.school_id).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            tracing::error!("Error fetching articles: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get trending articles
async fn get_trending_handler(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<Article>>, (axum::http::StatusCode, String)> {
    let service = BlogService::new(state.db_pool);
    let limit = params
        .get("limit")
        .and_then(|l| l.parse::<i64>().ok())
        .unwrap_or(10);

    match service.get_trending_articles(limit).await {
        Ok(articles) => Ok(Json(articles)),
        Err(e) => {
            tracing::error!("Error fetching trending articles: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get featured articles
async fn get_featured_handler(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<Article>>, (axum::http::StatusCode, String)> {
    let service = BlogService::new(state.db_pool);
    let limit = params
        .get("limit")
        .and_then(|l| l.parse::<i64>().ok())
        .unwrap_or(5);

    match service.get_featured_articles(limit).await {
        Ok(articles) => Ok(Json(articles)),
        Err(e) => {
            tracing::error!("Error fetching featured articles: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get categories
async fn get_categories_handler(
    State(state): State<AppState>,
) -> Result<Json<Vec<String>>, (axum::http::StatusCode, String)> {
    let service = BlogService::new(state.db_pool);

    match service.get_categories().await {
        Ok(categories) => Ok(Json(categories)),
        Err(e) => {
            tracing::error!("Error fetching categories: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get popular tags
async fn get_popular_tags_handler(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<(String, i64)>>, (axum::http::StatusCode, String)> {
    let service = BlogService::new(state.db_pool);
    let limit = params
        .get("limit")
        .and_then(|l| l.parse::<i64>().ok())
        .unwrap_or(20);

    match service.get_popular_tags(limit).await {
        Ok(tags) => Ok(Json(tags)),
        Err(e) => {
            tracing::error!("Error fetching tags: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get article detail
async fn get_article_handler(
    State(state): State<AppState>,
    Path(slug_or_id): Path<String>,
) -> Result<Json<ArticleDetail>, (axum::http::StatusCode, String)> {
    let service = BlogService::new(state.db_pool);

    match service.get_article_detail(&slug_or_id).await {
        Ok(detail) => Ok(Json(detail)),
        Err(e) => {
            if e.to_string().contains("not found") {
                Err((
                    axum::http::StatusCode::NOT_FOUND,
                    "Article not found".to_string(),
                ))
            } else {
                tracing::error!("Error fetching article: {}", e);
                Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
            }
        }
    }
}

/// Create article
async fn create_article_handler(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Extension(claims): Extension<Claims>,
    axum::extract::Json(req): axum::extract::Json<CreateArticleRequest>,
) -> Result<Json<Article>, (axum::http::StatusCode, String)> {
    let service = BlogService::new(state.db_pool);

    match service.create_article(user_id, claims.school_id, req).await {
        Ok(article) => {
            // Send WebSocket notification for new article (trending update)
            // Only broadcast to users in the same tenant (school_id)
            let msg = WebSocketMessage::TrendingArticles {
                articles: vec![json!({
                    "id": article.id,
                    "title": article.title,
                    "slug": article.slug,
                    "author": article.author_id.to_string(),
                    "view_count": article.view_count,
                    "like_count": article.like_count,
                })],
            };
            let _ = state
                .websocket_server
                .broadcast_to_tenant(claims.school_id, &msg)
                .await;
            Ok(Json(article))
        }
        Err(e) => {
            tracing::error!("Error creating article: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Update article
async fn update_article_handler(
    State(state): State<AppState>,
    Path(slug_or_id): Path<String>,
    Extension(user_id): Extension<Uuid>,
    Extension(claims): Extension<Claims>,
    axum::extract::Json(req): axum::extract::Json<UpdateArticleRequest>,
) -> Result<Json<Article>, (axum::http::StatusCode, String)> {
    // Parse slug_or_id as ID
    let id = match slug_or_id.parse::<i64>() {
        Ok(id) => id,
        Err(_) => {
            // Try to find article by slug within caller's organization
            match sqlx::query_scalar::<_, i64>(
                "SELECT id FROM articles WHERE slug = $1 AND organization_id = $2",
            )
            .bind(&slug_or_id)
            .bind(claims.school_id)
            .fetch_one(&state.db_pool)
            .await
            {
                Ok(id) => id,
                Err(_) => {
                    return Err((
                        axum::http::StatusCode::NOT_FOUND,
                        "Article not found".to_string(),
                    ))
                }
            }
        }
    };

    let service = BlogService::new(state.db_pool.clone());

    match service.update_article(id, user_id, claims.school_id, req).await {
        Ok(article) => Ok(Json(article)),
        Err(e) => {
            if e.to_string().contains("not found") {
                Err((
                    axum::http::StatusCode::NOT_FOUND,
                    "Article not found".to_string(),
                ))
            } else {
                tracing::error!("Error updating article: {}", e);
                Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
            }
        }
    }
}

/// Delete article
async fn delete_article_handler(
    State(state): State<AppState>,
    Path(slug_or_id): Path<String>,
    Extension(user_id): Extension<Uuid>,
    Extension(claims): Extension<Claims>,
) -> Result<axum::http::StatusCode, (axum::http::StatusCode, String)> {
    // Get article ID first
    let id = match slug_or_id.parse::<i64>() {
        Ok(id) => id,
        Err(_) => {
            match sqlx::query_scalar::<_, i64>(
                "SELECT id FROM articles WHERE slug = $1 AND organization_id = $2",
            )
            .bind(&slug_or_id)
            .bind(claims.school_id)
            .fetch_one(&state.db_pool)
            .await
            {
                Ok(id) => id,
                Err(_) => {
                    return Err((
                        axum::http::StatusCode::NOT_FOUND,
                        "Article not found".to_string(),
                    ))
                }
            }
        }
    };

    let is_admin = matches!(
        claims.role.parse::<Role>(),
        Ok(Role::Root | Role::CampusAdmin | Role::GradeAdmin)
    );

    let service = BlogService::new(state.db_pool);

    match service.delete_article(id, user_id, is_admin, claims.school_id).await {
        Ok(true) => Ok(axum::http::StatusCode::NO_CONTENT),
        Ok(false) => Err((
            axum::http::StatusCode::FORBIDDEN,
            "Not authorized".to_string(),
        )),
        Err(e) => {
            tracing::error!("Error deleting article: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Get article comments
async fn get_comments_handler(
    State(state): State<AppState>,
    Path(slug_or_id): Path<String>,
) -> Result<Json<Vec<ArticleComment>>, (axum::http::StatusCode, String)> {
    let service = BlogService::new(state.db_pool);

    match service.get_article_detail(&slug_or_id).await {
        Ok(detail) => Ok(Json(detail.comments)),
        Err(e) => {
            tracing::error!("Error fetching comments: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Create comment
async fn create_comment_handler(
    State(state): State<AppState>,
    Path(slug_or_id): Path<String>,
    Extension(user_id): Extension<Uuid>,
    Extension(claims): Extension<Claims>,
    axum::extract::Json(req): axum::extract::Json<CreateCommentRequest>,
) -> Result<Json<ArticleComment>, (axum::http::StatusCode, String)> {
    // Get article ID first
    let id = match slug_or_id.parse::<i64>() {
        Ok(id) => id,
        Err(_) => {
            match sqlx::query_scalar::<_, i64>(
                "SELECT id FROM articles WHERE slug = $1 AND organization_id = $2",
            )
            .bind(&slug_or_id)
            .bind(claims.school_id)
            .fetch_one(&state.db_pool)
            .await
            {
                Ok(id) => id,
                Err(_) => {
                    return Err((
                        axum::http::StatusCode::NOT_FOUND,
                        "Article not found".to_string(),
                    ))
                }
            }
        }
    };

    let service = BlogService::new(state.db_pool);

    match service.create_comment(id, user_id, claims.school_id, req).await {
        Ok(comment) => {
            // Send WebSocket notification for new comment
            let msg = WebSocketMessage::ArticleComment {
                article_id: id,
                comment_id: comment.id,
                user_id: comment.author_id,
                username: comment.author_id.to_string(),
                content: comment.content.clone(),
                created_at: comment.created_at,
            };
            let _ = state
                .websocket_server
                .send_to_topic(&format!("article:{}", id), &msg)
                .await;
            Ok(Json(comment))
        }
        Err(e) => {
            tracing::error!("Error creating comment: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Like article
async fn like_article_handler(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<bool>, (axum::http::StatusCode, String)> {
    let service = BlogService::new(state.db_pool);

    match service.toggle_like(user_id, "article", id).await {
        Ok(liked) => Ok(Json(liked)),
        Err(e) => {
            tracing::error!("Error toggling like: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

/// Like comment
async fn like_comment_handler(
    State(state): State<AppState>,
    Path(comment_id): Path<i64>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<bool>, (axum::http::StatusCode, String)> {
    let service = BlogService::new(state.db_pool);

    match service.toggle_like(user_id, "comment", comment_id).await {
        Ok(liked) => Ok(Json(liked)),
        Err(e) => {
            tracing::error!("Error toggling like: {}", e);
            Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}
