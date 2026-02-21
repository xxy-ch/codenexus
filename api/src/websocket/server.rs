use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use uuid::Uuid;
use crate::websocket::message::WebSocketMessage;

/// WebSocket connection manager
#[derive(Clone)]
pub struct WebSocketServer {
    /// Connected clients: client_id -> (user_id, sender)
    clients: Arc<RwLock<HashMap<Uuid, (Uuid, tokio::sync::mpsc::UnboundedSender<String>)>>>,

    /// User subscriptions: user_id -> vec of client_ids
    user_connections: Arc<RwLock<HashMap<Uuid, Vec<Uuid>>>>,

    /// Topic subscriptions: topic -> vec of client_ids
    topic_subscriptions: Arc<RwLock<HashMap<String, Vec<Uuid>>>>,
}

impl WebSocketServer {
    /// Create a new WebSocket server
    pub fn new() -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
            user_connections: Arc::new(RwLock::new(HashMap::new())),
            topic_subscriptions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Add a new client connection
    pub async fn add_client(
        &self,
        client_id: Uuid,
        user_id: Uuid,
        sender: tokio::sync::mpsc::UnboundedSender<String>,
    ) {
        let mut clients = self.clients.write().await;
        clients.insert(client_id, (user_id, sender.clone()));

        let mut user_conns = self.user_connections.write().await;
        user_conns.entry(user_id).or_insert_with(Vec::new).push(client_id);

        tracing::info!("WebSocket client connected: {} (user: {})", client_id, user_id);
    }

    /// Remove a client connection
    pub async fn remove_client(&self, client_id: Uuid) {
        let mut clients = self.clients.write().await;
        if let Some((user_id, _)) = clients.remove(&client_id) {
            let mut user_conns = self.user_connections.write().await;
            if let Some(conns) = user_conns.get_mut(&user_id) {
                conns.retain(|id| *id != client_id);
                if conns.is_empty() {
                    user_conns.remove(&user_id);
                }
            }

            // Remove from all topic subscriptions
            let mut topics = self.topic_subscriptions.write().await;
            for (_, client_ids) in topics.iter_mut() {
                client_ids.retain(|id| *id != client_id);
            }

            tracing::info!("WebSocket client disconnected: {} (user: {})", client_id, user_id);
        }
    }

    /// Subscribe a client to a topic
    pub async fn subscribe(&self, client_id: Uuid, topic: String) {
        let mut topics = self.topic_subscriptions.write().await;
        topics.entry(topic).or_insert_with(Vec::new).push(client_id);

        tracing::debug!("Client {} subscribed to topic", client_id);
    }

    /// Unsubscribe a client from a topic
    pub async fn unsubscribe(&self, client_id: Uuid, topic: &str) {
        let mut topics = self.topic_subscriptions.write().await;
        if let Some(client_ids) = topics.get_mut(topic) {
            client_ids.retain(|id| *id != client_id);
        }

        tracing::debug!("Client {} unsubscribed from topic {}", client_id, topic);
    }

    /// Send message to a specific user (all their connections)
    pub async fn send_to_user(&self, user_id: Uuid, message: &WebSocketMessage) -> Result<(), anyhow::Error> {
        let json = message.to_json()?;
        let user_conns = self.user_connections.read().await;

        if let Some(client_ids) = user_conns.get(&user_id) {
            let clients = self.clients.read().await;
            for client_id in client_ids {
                if let Some((_, sender)) = clients.get(client_id) {
                    let _ = sender.send(json.clone());
                }
            }
        }

        Ok(())
    }

    /// Send message to a topic (all subscribers)
    pub async fn send_to_topic(&self, topic: &str, message: &WebSocketMessage) -> Result<(), anyhow::Error> {
        let json = message.to_json()?;
        let topics = self.topic_subscriptions.read().await;

        if let Some(client_ids) = topics.get(topic) {
            let clients = self.clients.read().await;
            for client_id in client_ids {
                if let Some((_, sender)) = clients.get(client_id) {
                    let _ = sender.send(json.clone());
                }
            }
        }

        Ok(())
    }

    /// Broadcast message to all connected clients
    pub async fn broadcast(&self, message: &WebSocketMessage) -> Result<(), anyhow::Error> {
        let json = message.to_json()?;
        let clients = self.clients.read().await;

        for (_, (_, sender)) in clients.iter() {
            let _ = sender.send(json.clone());
        }

        Ok(())
    }

    /// Get connected clients count
    pub async fn client_count(&self) -> usize {
        self.clients.read().await.len()
    }

    /// Get topic subscriber count
    pub async fn topic_subscriber_count(&self, topic: &str) -> usize {
        let topics = self.topic_subscriptions.read().await;
        topics.get(topic).map(|v| v.len()).unwrap_or(0)
    }
}

impl Default for WebSocketServer {
    fn default() -> Self {
        Self::new()
    }
}

/// Helper function to create topic names
pub mod topics {
    use uuid::Uuid;

    /// Topic for submission updates: "submission:{submission_id}"
    pub fn submission(submission_id: i64) -> String {
        format!("submission:{}", submission_id)
    }

    /// Topic for problem updates: "problem:{problem_id}"
    pub fn problem(problem_id: i64) -> String {
        format!("problem:{}", problem_id)
    }

    /// Topic for contest updates: "contest:{contest_id}"
    pub fn contest(contest_id: i64) -> String {
        format!("contest:{}", contest_id)
    }

    /// Topic for leaderboard: "leaderboard:{scope}:{scope_id}"
    pub fn leaderboard(scope: &str, scope_id: Option<i64>) -> String {
        match scope_id {
            Some(id) => format!("leaderboard:{}:{}", scope, id),
            None => format!("leaderboard:{}", scope),
        }
    }

    /// Topic for user notifications: "user:{user_id}"
    pub fn user_notifications(user_id: Uuid) -> String {
        format!("user:{}", user_id)
    }

    /// Topic for contest chat: "contest:{contest_id}:chat"
    pub fn contest_chat(contest_id: i64) -> String {
        format!("contest:{}:chat", contest_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_websocket_server_creation() {
        let server = WebSocketServer::new();
        assert_eq!(server.client_count().await, 0);
    }

    #[tokio::test]
    async fn test_topic_generation() {
        assert_eq!(topics::submission(123), "submission:123");
        assert_eq!(topics::problem(456), "problem:456");
        assert_eq!(topics::contest(789), "contest:789");
        assert_eq!(topics::leaderboard("global", None), "leaderboard:global");
        assert_eq!(topics::leaderboard("problem", Some(1)), "leaderboard:problem:1");

        let user_id = Uuid::new_v4();
        assert_eq!(topics::user_notifications(user_id), format!("user:{}", user_id));
        assert_eq!(topics::contest_chat(123), "contest:123:chat");
    }

    #[tokio::test]
    async fn test_client_management() {
        let server = WebSocketServer::new();
        let client_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();

        server.add_client(client_id, user_id, tx).await;
        assert_eq!(server.client_count().await, 1);

        server.remove_client(client_id).await;
        assert_eq!(server.client_count().await, 0);
    }

    #[tokio::test]
    async fn test_topic_subscription() {
        let server = WebSocketServer::new();
        let client_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();

        server.add_client(client_id, user_id, tx).await;
        server.subscribe(client_id, "test_topic".to_string()).await;

        assert_eq!(server.topic_subscriber_count("test_topic").await, 1);

        server.unsubscribe(client_id, "test_topic").await;
        assert_eq!(server.topic_subscriber_count("test_topic").await, 0);
    }
}
