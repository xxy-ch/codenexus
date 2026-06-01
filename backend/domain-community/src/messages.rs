use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use api_infra::middleware::auth::AuthExtractor;
use api_infra::state::AppState;

#[derive(Debug, Serialize)]
pub struct ConversationDto {
    pub id: String,
    pub peer_user_id: String,
    pub peer_username: String,
    pub last_message: String,
    pub last_message_at: String,
    pub unread_count: i64,
}

#[derive(Debug, Serialize)]
pub struct DirectMessageDto {
    pub id: String,
    pub conversation_id: String,
    pub sender_id: String,
    pub sender_username: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateConversationRequest {
    pub peer: String,
}

pub fn messages_router() -> Router<AppState> {
    Router::new()
        .route(
            "/conversations",
            get(list_conversations).post(create_conversation),
        )
        .route(
            "/conversations/:conversation_id",
            get(get_messages).post(send_message),
        )
}

async fn list_conversations(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<Json<Vec<ConversationDto>>, StatusCode> {
    let rows = sqlx::query(
        r#"
        SELECT
            c.id,
            CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END AS peer_user_id,
            u.username AS peer_username,
            COALESCE(last_msg.content, '') AS last_message,
            COALESCE(last_msg.created_at::text, c.created_at::text) AS last_message_at,
            COALESCE(unread.unread_count, 0) AS unread_count
        FROM direct_conversations c
        JOIN users caller ON caller.id = $1
        JOIN users u ON u.id = CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END
        LEFT JOIN LATERAL (
            SELECT m.content, m.created_at
            FROM direct_messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
        ) last_msg ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::bigint AS unread_count
            FROM direct_messages m
            WHERE m.conversation_id = c.id
              AND m.sender_id <> $1
              AND m.read_at IS NULL
        ) unread ON true
        WHERE (c.user1_id = $1 OR c.user2_id = $1)
          AND u.organization_id = caller.organization_id
        ORDER BY COALESCE(last_msg.created_at, c.created_at) DESC
        "#,
    )
    .bind(claims.sub)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let conversations = rows
        .into_iter()
        .map(|row| ConversationDto {
            id: row.get::<Uuid, _>("id").to_string(),
            peer_user_id: row.get::<Uuid, _>("peer_user_id").to_string(),
            peer_username: row.get::<String, _>("peer_username"),
            last_message: row.get::<String, _>("last_message"),
            last_message_at: row.get::<String, _>("last_message_at"),
            unread_count: row.get::<i64, _>("unread_count"),
        })
        .collect::<Vec<_>>();

    Ok(Json(conversations))
}

async fn create_conversation(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(req): Json<CreateConversationRequest>,
) -> Result<Json<ConversationDto>, StatusCode> {
    let peer = req.peer.trim();
    if peer.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let row = sqlx::query(
        r#"
        WITH peer AS (
            SELECT id, username
            FROM users
            WHERE organization_id = $2
              AND id <> $1
              AND (
                username = $3
                OR COALESCE(user_code, '') = $3
                OR COALESCE(email, '') = $3
              )
            LIMIT 1
        ),
        inserted AS (
            INSERT INTO direct_conversations (user1_id, user2_id)
            SELECT LEAST($1, peer.id), GREATEST($1, peer.id)
            FROM peer
            ON CONFLICT DO NOTHING
            RETURNING id, created_at
        ),
        conversation AS (
            SELECT id, created_at FROM inserted
            UNION ALL
            SELECT existing.id, existing.created_at
            FROM peer
            JOIN direct_conversations existing
              ON existing.user1_id = LEAST($1, peer.id)
             AND existing.user2_id = GREATEST($1, peer.id)
            WHERE NOT EXISTS (SELECT 1 FROM inserted)
            LIMIT 1
        )
        SELECT
            conversation.id,
            peer.id AS peer_user_id,
            peer.username AS peer_username,
            COALESCE(last_msg.content, '') AS last_message,
            COALESCE(last_msg.created_at::text, conversation.created_at::text) AS last_message_at,
            0::bigint AS unread_count
        FROM peer
        JOIN conversation ON true
        LEFT JOIN LATERAL (
            SELECT m.content, m.created_at
            FROM direct_messages m
            WHERE m.conversation_id = conversation.id
            ORDER BY m.created_at DESC
            LIMIT 1
        ) last_msg ON true
        "#,
    )
    .bind(claims.sub)
    .bind(claims.school_id)
    .bind(peer)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let row = row.ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(ConversationDto {
        id: row.get::<Uuid, _>("id").to_string(),
        peer_user_id: row.get::<Uuid, _>("peer_user_id").to_string(),
        peer_username: row.get::<String, _>("peer_username"),
        last_message: row.get::<String, _>("last_message"),
        last_message_at: row.get::<String, _>("last_message_at"),
        unread_count: row.get::<i64, _>("unread_count"),
    }))
}

async fn get_messages(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(conversation_id): Path<Uuid>,
) -> Result<Json<Vec<DirectMessageDto>>, StatusCode> {
    ensure_conversation_member(&state, conversation_id, claims.sub, claims.school_id).await?;

    sqlx::query(
        r#"
        UPDATE direct_messages
        SET read_at = NOW()
        WHERE conversation_id = $1
          AND sender_id <> $2
          AND read_at IS NULL
        "#,
    )
    .bind(conversation_id)
    .bind(claims.sub)
    .execute(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let rows = sqlx::query(
        r#"
        SELECT
            m.id,
            m.conversation_id,
            m.sender_id,
            u.username AS sender_username,
            m.content,
            m.created_at::text AS created_at
        FROM direct_messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at ASC
        "#,
    )
    .bind(conversation_id)
    .fetch_all(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let messages = rows
        .into_iter()
        .map(|row| DirectMessageDto {
            id: row.get::<Uuid, _>("id").to_string(),
            conversation_id: row.get::<Uuid, _>("conversation_id").to_string(),
            sender_id: row.get::<Uuid, _>("sender_id").to_string(),
            sender_username: row.get::<String, _>("sender_username"),
            content: row.get::<String, _>("content"),
            created_at: row.get::<String, _>("created_at"),
        })
        .collect::<Vec<_>>();

    Ok(Json(messages))
}

async fn send_message(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(conversation_id): Path<Uuid>,
    Json(req): Json<SendMessageRequest>,
) -> Result<Json<DirectMessageDto>, StatusCode> {
    if req.content.trim().is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    ensure_conversation_member(&state, conversation_id, claims.sub, claims.school_id).await?;

    let row = sqlx::query(
        r#"
        INSERT INTO direct_messages (conversation_id, sender_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, conversation_id, sender_id, content, created_at::text AS created_at
        "#,
    )
    .bind(conversation_id)
    .bind(claims.sub)
    .bind(req.content.trim())
    .fetch_one(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    sqlx::query("UPDATE direct_conversations SET updated_at = NOW() WHERE id = $1")
        .bind(conversation_id)
        .execute(&state.db_pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let sender_username =
        sqlx::query_scalar::<_, String>("SELECT username FROM users WHERE id = $1")
            .bind(claims.sub)
            .fetch_one(&state.db_pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let message = DirectMessageDto {
        id: row.get::<Uuid, _>("id").to_string(),
        conversation_id: row.get::<Uuid, _>("conversation_id").to_string(),
        sender_id: row.get::<Uuid, _>("sender_id").to_string(),
        sender_username,
        content: row.get::<String, _>("content"),
        created_at: row.get::<String, _>("created_at"),
    };

    Ok(Json(message))
}

async fn ensure_conversation_member(
    state: &AppState,
    conversation_id: Uuid,
    user_id: Uuid,
    school_id: i64,
) -> Result<(), StatusCode> {
    let exists = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT 1::bigint
        FROM direct_conversations c
        JOIN users u1 ON u1.id = c.user1_id
        JOIN users u2 ON u2.id = c.user2_id
        WHERE c.id = $1
          AND (c.user1_id = $2 OR c.user2_id = $2)
          AND u1.organization_id = $3
          AND u2.organization_id = $3
        "#,
    )
    .bind(conversation_id)
    .bind(user_id)
    .bind(school_id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if exists.is_some() {
        Ok(())
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}
