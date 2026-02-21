use axum::{
    extract::{
        State,
        ws::{WebSocket, Message},
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use uuid::Uuid;
use crate::websocket::server::WebSocketServer;
use crate::websocket::message::WebSocketMessage;
use tokio::sync::mpsc;

/// Handle WebSocket connection upgrade
pub async fn websocket_handler(
    State(state): State<crate::AppState>,
    ws: WebSocket,
) {
    let server = state.websocket_server.clone();
    let client_id = Uuid::new_v4();

    // Create channel for this connection
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

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
    let mut user_id: Option<Uuid> = None;
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

                        // Handle authentication message
                        WebSocketMessage::ChatMessage { user_id: uid, .. } => {
                            if user_id.is_none() {
                                user_id = Some(uid);
                                server.add_client(client_id, uid, tx.clone()).await;

                                // Subscribe to user's personal notification topic
                                let user_topic = crate::websocket::server::topics::user_notifications(uid);
                                server.subscribe(client_id, user_topic).await;

                                // Send welcome message
                                let welcome = WebSocketMessage::Notification {
                                    id: Uuid::new_v4(),
                                    user_id: uid,
                                    title: "Connected".to_string(),
                                    message: "WebSocket connection established".to_string(),
                                    notification_type: "info".to_string(),
                                    created_at: chrono::Utc::now(),
                                };
                                let _ = server.send_to_user(uid, &welcome).await;
                            }
                        }

                        // Handle topic subscriptions
                        _ => {
                            // Subscribe to relevant topics based on message type
                            if let Some(uid) = user_id {
                                match ws_msg.message_type() {
                                    "submission_update" => {
                                        if let WebSocketMessage::SubmissionUpdate { submission_id, .. } = ws_msg {
                                            let topic = crate::websocket::server::topics::submission(submission_id);
                                            server.subscribe(client_id, topic).await;
                                        }
                                    }
                                    "contest_update" => {
                                        if let WebSocketMessage::ContestUpdate { contest_id, .. } = ws_msg {
                                            let topic = crate::websocket::server::topics::contest(contest_id);
                                            server.subscribe(client_id, topic).await;
                                        }
                                    }
                                    _ => {}
                                }
                            }
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

/// WebSocket upgrade endpoint with authentication
pub async fn websocket_upgrade_handler(
    State(state): State<crate::AppState>,
    ws: axum::extract::ws::WebSocketUpgrade,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| websocket_handler(State(state), socket))
}
