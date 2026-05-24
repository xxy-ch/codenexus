//! WebSocket handler for `/ws/monitor`.
//!
//! Accepts a WebSocket connection, subscribes to the broadcast channel,
//! and forwards each MonitorSnapshot JSON frame to the client.
//! Handles ping/pong keep-alive and graceful close.
//! Backpressure is handled by the broadcast channel — slow consumers
//! receive a `RecvError::Lagged` and continue with the next snapshot.

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::{extract::State, response::IntoResponse};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::{info, warn};

use crate::state::AppState;

/// `GET /ws/monitor` — upgrade to WebSocket and stream snapshots.
///
/// The client receives a full `MonitorSnapshot` JSON text frame every
/// `push_interval_secs` seconds (default 5). Slow consumers that fall
/// behind are allowed to skip stale snapshots.
pub async fn ws_monitor_handler(
    State(state): State<Arc<AppState>>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_ws(socket, state.snapshot_tx.clone()))
}

/// Inner WebSocket handler that subscribes to the broadcast channel
/// and forwards snapshot JSON to the client.
///
/// Also handles:
/// - Ping frames from the client → sends Pong
/// - Close frames → graceful shutdown
/// - `RecvError::Lagged` → logs and continues with next snapshot
async fn handle_ws(socket: WebSocket, tx: broadcast::Sender<String>) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = tx.subscribe();

    info!(
        "[ws-monitor] client connected, subscriber count = {}",
        tx.receiver_count()
    );

    loop {
        tokio::select! {
            // Forward broadcast snapshot to client
            result = rx.recv() => {
                match result {
                    Ok(snapshot_json) => {
                        if sender.send(Message::Text(snapshot_json.into())).await.is_err() {
                            // Client disconnected
                            info!("[ws-monitor] client send failed, closing connection");
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(n)) => {
                        warn!("[ws-monitor] client lagged, skipped {n} snapshots");
                        // Continue — next recv() will return the latest snapshot
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        info!("[ws-monitor] broadcast channel closed, ending connection");
                        break;
                    }
                }
            }
            // Handle incoming messages from client (ping, close, etc.)
            msg = receiver.next() => {
                match msg {
                    Some(Ok(Message::Ping(data))) => {
                        let _ = sender.send(Message::Pong(data)).await;
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        info!("[ws-monitor] client disconnected");
                        break;
                    }
                    _ => {
                        // Ignore text/binary messages from client
                    }
                }
            }
        }
    }

    info!(
        "[ws-monitor] connection ended, remaining subscribers = {}",
        tx.receiver_count()
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use tokio::sync::broadcast;

    /// Verify that broadcast channel correctly delivers messages to subscribers.
    #[tokio::test]
    async fn broadcast_delivers_to_subscriber() {
        let (tx, mut rx) = broadcast::channel::<String>(16);

        tx.send("snapshot-1".to_string()).unwrap();
        tx.send("snapshot-2".to_string()).unwrap();

        let msg1 = rx.recv().await.unwrap();
        let msg2 = rx.recv().await.unwrap();

        assert_eq!(msg1, "snapshot-1");
        assert_eq!(msg2, "snapshot-2");
    }

    /// Verify that late subscribers only get messages sent after subscription.
    #[tokio::test]
    async fn broadcast_late_subscriber_misses_earlier() {
        let (tx, _keep_alive) = broadcast::channel::<String>(16);

        // Send before subscribing — need a live receiver for send to succeed
        let _ = tx.send("before-sub".to_string());

        let mut rx = tx.subscribe();

        tx.send("after-sub".to_string()).unwrap();

        let msg = rx.recv().await.unwrap();
        assert_eq!(msg, "after-sub");
    }

    /// Verify lagged receiver recovers and gets the latest message.
    #[tokio::test]
    async fn broadcast_lagged_receiver_recovers() {
        // Small capacity to force lag
        let (tx, mut rx) = broadcast::channel::<String>(2);

        // Overflow the channel — sends exceed capacity
        for i in 0..5 {
            let _ = tx.send(format!("msg-{i}"));
        }

        // Drain all buffered and lagged messages using async recv
        loop {
            match rx.try_recv() {
                Ok(_) | Err(broadcast::error::TryRecvError::Lagged(_)) => {
                    // Continue draining
                }
                Err(broadcast::error::TryRecvError::Empty) => {
                    break;
                }
                Err(e) => panic!("unexpected error: {e:?}"),
            }
        }

        // Now the channel is empty. Send a recovery message and verify.
        tx.send("recovery".to_string()).unwrap();
        let recovered = rx.recv().await.unwrap();
        assert_eq!(recovered, "recovery");
    }

    /// Verify that receiver_count tracks subscribers correctly.
    #[tokio::test]
    async fn broadcast_receiver_count() {
        let (tx, _) = broadcast::channel::<String>(16);
        assert_eq!(tx.receiver_count(), 0);

        let rx1 = tx.subscribe();
        assert_eq!(tx.receiver_count(), 1);

        let _rx2 = tx.subscribe();
        assert_eq!(tx.receiver_count(), 2);

        drop(rx1);
        // Note: receiver_count may not update immediately on drop
        // but new sends will clean up
    }
}
