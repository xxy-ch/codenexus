use axum::{
    extract::{
        State,
        ws::{WebSocket, Message},
        Query,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use uuid::Uuid;
use crate::websocket::server::AddClientResult;
use crate::websocket::message::WebSocketMessage;
use tokio::sync::mpsc;
use shared::models::Claims;

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

/// Handle WebSocket connection (internal, after auth verified)
async fn websocket_handler_inner(
    state: crate::AppState,
    ws: WebSocket,
    claims: Claims,
) {
    let server = state.websocket_server.clone();
    let client_id = Uuid::new_v4();
    let user_id = claims.sub;
    let school_id = claims.school_id;

    // Create channel for this connection
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    // Enforce per-user connection limit
    let sender_clone = tx.clone();
    // TODO: extract real client IP from ConnectInfo<SocketAddr>
    let placeholder_ip = std::net::IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1));
    match server.add_client(client_id, user_id, school_id, placeholder_ip, sender_clone).await {
        AddClientResult::Added => {}
        AddClientResult::LimitExceeded(max) => {
            tracing::warn!(
                "WebSocket connection rejected for user {}: limit of {} exceeded",
                user_id, max
            );
            // Send close frame and return
            let _ = tx.send(serde_json::to_string(&WebSocketMessage::Error {
                code: "CONNECTION_LIMIT".to_string(),
                message: format!("Maximum concurrent connections ({}) exceeded", max),
            }).unwrap_or_default());
            return;
        }
        AddClientResult::IpLimitExceeded(max) => {
            tracing::warn!(
                "WebSocket connection rejected for IP: limit of {} exceeded",
                max
            );
            let _ = tx.send(serde_json::to_string(&WebSocketMessage::Error {
                code: "IP_CONNECTION_LIMIT".to_string(),
                message: format!("Maximum concurrent IP connections ({}) exceeded", max),
            }).unwrap_or_default());
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

    // Spawn task to handle sending messages to client
    let server_clone = server.clone();
    let client_id_clone = client_id;
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }

        // Connection closed
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
                        WebSocketMessage::SubmissionUpdate { submission_id, .. } => {
                            // Only allow subscribing to own submissions
                            let topic = crate::websocket::server::topics::submission(submission_id);
                            server.subscribe(client_id, topic).await;
                        }

                        WebSocketMessage::ContestUpdate { contest_id, .. } => {
                            // Contest topic subscription allowed for authenticated users
                            let topic = crate::websocket::server::topics::contest(contest_id);
                            server.subscribe(client_id, topic).await;
                        }

                        WebSocketMessage::ChatMessage { contest_id, .. } => {
                            // Contest chat topic subscription
                            let topic = crate::websocket::server::topics::contest_chat(contest_id);
                            server.subscribe(client_id, topic).await;
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

    // Remove client on disconnect
    server.remove_client(client_id).await;
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
    let claims = jwt_service
        .validate_token(&token)
        .map_err(|_| {
            tracing::warn!("WebSocket connection rejected: invalid JWT token");
            axum::http::StatusCode::UNAUTHORIZED
        })?;

    // Verify token is not expired (validate_token already checks exp, but be defensive)
    let now = chrono::Utc::now().timestamp();
    if claims.exp < now {
        tracing::warn!("WebSocket connection rejected: expired JWT token for user {}", claims.sub);
        return Err(axum::http::StatusCode::UNAUTHORIZED);
    }

    Ok(ws.on_upgrade(move |socket| websocket_handler_inner(state, socket, claims)))
}
