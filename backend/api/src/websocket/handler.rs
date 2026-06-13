use crate::websocket::message::WebSocketMessage;
use crate::websocket::server::AddClientResult;
use axum::{
    extract::{
        ws::{Message, WebSocket},
        Query, State,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use shared::models::role::Role;
use shared::models::Claims;
use std::str::FromStr;
use tokio::sync::{mpsc, oneshot};
use uuid::Uuid;

/// Query parameters for WebSocket upgrade (JWT token for authentication)
#[derive(Debug, Deserialize)]
pub struct WsAuthParams {
    pub token: Option<String>,
}

fn extract_cookie_token(headers: &axum::http::HeaderMap, cookie_name: &str) -> Option<String> {
    headers
        .get(axum::http::header::COOKIE)
        .and_then(|c| c.to_str().ok())
        .and_then(|cookies| {
            cookies.split(';').find_map(|cookie| {
                let mut parts = cookie.trim().splitn(2, '=');
                match (parts.next(), parts.next()) {
                    (Some(name), Some(value)) if name == cookie_name => Some(value.to_string()),
                    _ => None,
                }
            })
        })
}

/// Extract the client IP from proxy headers, falling back to 127.0.0.1.
fn extract_client_ip(headers: &axum::http::HeaderMap) -> std::net::IpAddr {
    let fallback_ip = std::net::IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1));
    match headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.split(',').next())
        .map(|s| s.trim())
    {
        Some(ip_str) => ip_str.parse().unwrap_or(fallback_ip),
        None => match headers
            .get("x-real-ip")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.trim())
        {
            Some(ip_str) => ip_str.parse().unwrap_or(fallback_ip),
            None => fallback_ip,
        },
    }
}

async fn authorize_topic_subscription(
    db_pool: &sqlx::PgPool,
    topic: &str,
    user_id: Uuid,
    school_id: i64,
    role: &str,
) -> bool {
    if let Some(submission_id) = topic
        .strip_prefix("submission:")
        .and_then(|id| id.parse::<i64>().ok())
    {
        return sqlx::query_scalar::<_, uuid::Uuid>(
            "SELECT user_id FROM submissions WHERE id = $1",
        )
        .bind(submission_id)
        .fetch_optional(db_pool)
        .await
        .ok()
        .flatten()
        .map(|uid| uid == user_id)
        .unwrap_or(false);
    }

    if let Some(contest_id) = topic
        .strip_prefix("contest:")
        .and_then(|id| id.parse::<i64>().ok())
    {
        return sqlx::query_scalar::<_, i64>("SELECT organization_id FROM contests WHERE id = $1")
            .bind(contest_id)
            .fetch_optional(db_pool)
            .await
            .ok()
            .flatten()
            .map(|org_id| org_id == school_id)
            .unwrap_or(false);
    }

    if let Some(contest_id) = topic
        .strip_prefix("contest:")
        .and_then(|rest| rest.strip_suffix(":chat"))
        .and_then(|id| id.parse::<i64>().ok())
    {
        // Chat is restricted to teachers+ and registered participants, not
        // merely same-organization users (per the documented topic contract).
        return user_can_access_contest_chat(db_pool, contest_id, user_id, school_id, role).await;
    }

    false
}

/// Authorize access to a contest chat topic.
///
/// Per the documented contract, contest chat is restricted to teachers and
/// above plus registered participants. This enforces two layers:
///   1. Tenant isolation — the contest must belong to the user's organization.
///   2. Role/participation — the user is a teacher+ OR a registered participant.
async fn user_can_access_contest_chat(
    db_pool: &sqlx::PgPool,
    contest_id: i64,
    user_id: Uuid,
    school_id: i64,
    role: &str,
) -> bool {
    // 1. Tenant isolation: contest must belong to the user's organization.
    let org_ok =
        sqlx::query_scalar::<_, i64>("SELECT organization_id FROM contests WHERE id = $1")
            .bind(contest_id)
            .fetch_optional(db_pool)
            .await
            .ok()
            .flatten()
            .map(|org_id| org_id == school_id)
            .unwrap_or(false);

    if !org_ok {
        return false;
    }

    // 2a. Teachers and above manage the contest and may access its chat.
    if Role::from_str(role)
        .map(|r| r.is_higher_or_equal(Role::Teacher))
        .unwrap_or(false)
    {
        return true;
    }

    // 2b. Registered participants may access chat.
    sqlx::query_scalar::<_, i64>(
        "SELECT 1 FROM contest_participants WHERE contest_id = $1 AND user_id = $2",
    )
    .bind(contest_id)
    .bind(user_id)
    .fetch_optional(db_pool)
    .await
    .ok()
    .flatten()
    .is_some()
}

/// Handle WebSocket connection (internal, after auth verified)
async fn websocket_handler_inner(
    state: crate::AppState,
    ws: WebSocket,
    claims: Claims,
    client_ip: std::net::IpAddr,
) {
    let server = state.websocket_server.clone();
    let db_pool = state.db_pool.clone(); // H-03: needed for subscription authorization
    let client_id = Uuid::new_v4();
    let user_id = claims.sub;
    let school_id = claims.school_id;

    // Create channel for this connection
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    // Enforce per-user connection limit
    let sender_clone = tx.clone();
    match server
        .add_client(client_id, user_id, school_id, client_ip, sender_clone)
        .await
    {
        AddClientResult::Added => {}
        AddClientResult::LimitExceeded(max) => {
            tracing::warn!(
                "WebSocket connection rejected for user {}: limit of {} exceeded",
                user_id,
                max
            );
            // Send close frame and return
            let _ = tx.send(
                serde_json::to_string(&WebSocketMessage::Error {
                    code: "CONNECTION_LIMIT".to_string(),
                    message: format!("Maximum concurrent connections ({}) exceeded", max),
                })
                .unwrap_or_default(),
            );
            return;
        }
        AddClientResult::IpLimitExceeded(max) => {
            tracing::warn!(
                "WebSocket connection rejected for IP: limit of {} exceeded",
                max
            );
            let _ = tx.send(
                serde_json::to_string(&WebSocketMessage::Error {
                    code: "IP_CONNECTION_LIMIT".to_string(),
                    message: format!("Maximum concurrent IP connections ({}) exceeded", max),
                })
                .unwrap_or_default(),
            );
            return;
        }
    }

    // Automatically subscribe to user's own notification topic
    let user_topic = crate::websocket::server::topics::user_notifications(user_id);
    server.subscribe(client_id, user_topic).await;

    // Send welcome message
    let welcome = WebSocketMessage::Notification {
        id: Uuid::new_v4(),
        user_id,
        title: "Connected".to_string(),
        message: "WebSocket connection established".to_string(),
        notification_type: "info".to_string(),
        created_at: chrono::Utc::now(),
    };
    let _ = server.send_to_user(user_id, &welcome).await;

    // Split WebSocket into sender and receiver
    let (mut ws_sender, mut ws_receiver) = ws.split();

    // One-shot channel coordinates exactly-one removal between the sender task
    // and the main receiver loop. Under concurrent close (e.g. sender fails
    // while receiver also hits EOF), only one side calls remove_client().
    let (remove_tx, mut remove_rx) = oneshot::channel::<()>();

    // Spawn task to handle sending messages to client
    let server_clone = server.clone();
    let client_id_clone = client_id;
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }

        // Signal the main receiver loop that we are handling removal.
        // If the receiver already dropped `remove_rx`, that's fine — it means
        // the receiver loop already exited and will skip its own removal
        // because it already called remove_client.
        let _ = remove_tx.send(());
        server_clone.remove_client(client_id_clone).await;
    });

    // Handle incoming messages from client
    while let Some(result) = ws_receiver.next().await {
        match result {
            Ok(Message::Text(text)) => {
                // Handle incoming text message
                if let Ok(ws_msg) = WebSocketMessage::from_json(&text) {
                    match ws_msg {
                        WebSocketMessage::Ping { timestamp } => {
                            // Respond with pong
                            let pong = WebSocketMessage::Pong { timestamp };
                            if let Ok(json) = pong.to_json() {
                                let _ = tx.send(json);
                            }
                        }

                        WebSocketMessage::Pong { .. } => {
                            // Client is alive, do nothing
                        }

                        // Handle topic subscription requests.
                        // All subscriptions are validated against the authenticated user_id.
                        WebSocketMessage::Subscribe { topic } => {
                            if authorize_topic_subscription(
                                &db_pool,
                                &topic,
                                user_id,
                                school_id,
                                &claims.role,
                            )
                            .await
                            {
                                server.subscribe(client_id, topic).await;
                            } else {
                                tracing::warn!(
                                    "WS subscription denied: user {} tried to subscribe to topic {}",
                                    user_id,
                                    topic
                                );
                            }
                        }

                        WebSocketMessage::Unsubscribe { topic } => {
                            server.unsubscribe(client_id, &topic).await;
                        }

                        // Backward compatibility: older clients used business update messages as
                        // subscription requests. Keep support while new clients use Subscribe.
                        WebSocketMessage::SubmissionUpdate { submission_id, .. } => {
                            // H-03: Verify submission belongs to this user
                            let owner_ok = sqlx::query_scalar::<_, uuid::Uuid>(
                                "SELECT user_id FROM submissions WHERE id = $1",
                            )
                            .bind(submission_id)
                            .fetch_optional(&db_pool)
                            .await
                            .ok()
                            .flatten()
                            .map(|uid| uid == user_id)
                            .unwrap_or(false);

                            if owner_ok {
                                let topic =
                                    crate::websocket::server::topics::submission(submission_id);
                                server.subscribe(client_id, topic).await;
                            } else {
                                tracing::warn!(
                                    "WS subscription denied: user {} tried to subscribe to submission {}",
                                    user_id, submission_id
                                );
                            }
                        }

                        WebSocketMessage::ContestUpdate { contest_id, .. } => {
                            // H-03: Verify contest belongs to user's organization
                            let org_ok = sqlx::query_scalar::<_, i64>(
                                "SELECT organization_id FROM contests WHERE id = $1",
                            )
                            .bind(contest_id)
                            .fetch_optional(&db_pool)
                            .await
                            .ok()
                            .flatten()
                            .map(|org_id| org_id == school_id)
                            .unwrap_or(false);

                            if org_ok {
                                let topic = crate::websocket::server::topics::contest(contest_id);
                                server.subscribe(client_id, topic).await;
                            } else {
                                tracing::warn!(
                                    "WS subscription denied: user {} tried to subscribe to contest {} (org mismatch)",
                                    user_id, contest_id
                                );
                            }
                        }

                        WebSocketMessage::ChatMessage { contest_id, .. } => {
                            // Chat is restricted to teachers+ and registered
                            // participants (not merely same-org users).
                            if user_can_access_contest_chat(
                                &db_pool,
                                contest_id,
                                user_id,
                                school_id,
                                &claims.role,
                            )
                            .await
                            {
                                let topic =
                                    crate::websocket::server::topics::contest_chat(contest_id);
                                server.subscribe(client_id, topic).await;
                            } else {
                                tracing::warn!(
                                    "WS chat subscription denied: user {} tried contest {}",
                                    user_id,
                                    contest_id
                                );
                            }
                        }

                        _ => {
                            // Ignore other message types from client
                        }
                    }
                }
            }

            Ok(Message::Close(_)) => {
                // Client initiated close
                break;
            }

            Err(e) => {
                tracing::error!("WebSocket error: {:?}", e);
                break;
            }

            _ => {}
        }
    }

    // Remove client on disconnect — but only if the sender task hasn't
    // already done so. The sender task sends `()` on `remove_tx` before it
    // calls remove_client. If we already received that signal, the sender
    // task is the designated remover and we skip our own call.
    match remove_rx.try_recv() {
        // Sender task already claimed removal — skip.
        Ok(()) | Err(tokio::sync::oneshot::error::TryRecvError::Closed) => {}
        // Sender hasn't signaled yet — we are the designated remover.
        Err(tokio::sync::oneshot::error::TryRecvError::Empty) => {
            server.remove_client(client_id).await;
        }
    }
}

/// WebSocket upgrade endpoint with JWT authentication via query parameter
pub async fn websocket_upgrade_handler(
    State(state): State<crate::AppState>,
    headers: axum::http::HeaderMap,
    Query(params): Query<WsAuthParams>,
    ws: axum::extract::ws::WebSocketUpgrade,
) -> Result<impl IntoResponse, axum::http::StatusCode> {
    let token = params
        .token
        .or_else(|| extract_cookie_token(&headers, "access_token"))
        .ok_or_else(|| {
            tracing::warn!("WebSocket connection rejected: missing access token");
            axum::http::StatusCode::UNAUTHORIZED
        })?;

    // Validate JWT token from query parameter or HttpOnly cookie
    let jwt_service = crate::auth::JwtService::new(&state.jwt_secret);
    let claims = jwt_service.validate_token(&token).map_err(|_| {
        tracing::warn!("WebSocket connection rejected: invalid JWT token");
        axum::http::StatusCode::UNAUTHORIZED
    })?;

    // Verify token is not expired (validate_token already checks exp, but be defensive)
    let now = chrono::Utc::now().timestamp();
    if claims.exp < now {
        tracing::warn!(
            "WebSocket connection rejected: expired JWT token for user {}",
            claims.sub
        );
        return Err(axum::http::StatusCode::UNAUTHORIZED);
    }

    // SECURITY: Check JWT blacklist (revoked tokens) — same as auth_middleware.
    // Fail-closed when Redis is configured but unavailable.
    if let Some(redis_pool) = &state.redis_pool {
        let conn_result = redis_pool.get().await;
        match conn_result {
            Ok(mut conn) => {
                let blacklisted: bool = deadpool_redis::redis::cmd("EXISTS")
                    .arg(format!("bl:{}", claims.jti))
                    .query_async(&mut conn)
                    .await
                    .unwrap_or(false);
                if blacklisted {
                    tracing::warn!(
                        "WebSocket connection rejected: JWT token has been revoked for user {}",
                        claims.sub
                    );
                    return Err(axum::http::StatusCode::UNAUTHORIZED);
                }
            }
            Err(e) => {
                tracing::warn!("Redis unavailable during WebSocket blacklist check — rejecting (fail-closed): {}", e);
                return Err(axum::http::StatusCode::UNAUTHORIZED);
            }
        }
    } else if !matches!(state.app_env, api_infra::config::AppEnv::Test) {
        // Database fallback for token revocation
        if crate::auth::routes::is_jti_revoked_in_db(&state, claims.jti).await {
            tracing::warn!(
                "WebSocket connection rejected: JWT token revoked in DB for user {}",
                claims.sub
            );
            return Err(axum::http::StatusCode::UNAUTHORIZED);
        }
    }

    let client_ip = extract_client_ip(&headers);
    Ok(ws.on_upgrade(move |socket| websocket_handler_inner(state, socket, claims, client_ip)))
}
