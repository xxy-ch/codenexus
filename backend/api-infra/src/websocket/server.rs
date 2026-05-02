use super::message::WebSocketMessage;
use std::collections::{HashMap, HashSet};
use std::net::IpAddr;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use uuid::Uuid;

/// Type alias for the client entry stored in the connection map.
type ClientEntry = (
    Uuid,
    i64,
    IpAddr,
    tokio::sync::mpsc::UnboundedSender<String>,
);

/// Maximum concurrent WebSocket connections per user
const MAX_CONNECTIONS_PER_USER: usize = 5;
/// Maximum concurrent WebSocket connections per IP address
const MAX_CONNECTIONS_PER_IP: usize = 20;
/// Maximum topic subscriptions per client connection
const MAX_TOPICS_PER_CLIENT: usize = 16;

/// WebSocket connection manager
#[derive(Clone)]
pub struct WebSocketServer {
    /// Connected clients: client_id -> (user_id, school_id, ip_addr, sender)
    clients: Arc<RwLock<HashMap<Uuid, ClientEntry>>>,

    /// User subscriptions: user_id -> vec of client_ids
    user_connections: Arc<RwLock<HashMap<Uuid, Vec<Uuid>>>>,

    /// Topic subscriptions: topic -> vec of client_ids
    topic_subscriptions: Arc<RwLock<HashMap<String, Vec<Uuid>>>>,

    /// Reverse index: client_id -> set of topics this client is subscribed to.
    /// Enables O(1) client removal without scanning all topics.
    client_topics: Arc<RwLock<HashMap<Uuid, HashSet<String>>>>,

    /// Per-user connection counts (used for fast limit checks)
    user_conn_counts: Arc<Mutex<HashMap<Uuid, usize>>>,

    /// Per-IP connection counts (used for fast limit checks)
    ip_conn_counts: Arc<Mutex<HashMap<IpAddr, usize>>>,
}

/// Result of attempting to add a client
pub enum AddClientResult {
    Added,
    /// Connection limit exceeded; contains the max allowed connections
    LimitExceeded(usize),
    /// IP connection limit exceeded; contains the max allowed connections
    IpLimitExceeded(usize),
}

impl WebSocketServer {
    /// Create a new WebSocket server
    pub fn new() -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
            user_connections: Arc::new(RwLock::new(HashMap::new())),
            topic_subscriptions: Arc::new(RwLock::new(HashMap::new())),
            client_topics: Arc::new(RwLock::new(HashMap::new())),
            user_conn_counts: Arc::new(Mutex::new(HashMap::new())),
            ip_conn_counts: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Add a new client connection with per-user connection limit.
    /// Returns `AddClientResult::LimitExceeded` if the user already has
    /// `MAX_CONNECTIONS_PER_USER` active connections.
    pub async fn add_client(
        &self,
        client_id: Uuid,
        user_id: Uuid,
        school_id: i64,
        ip_addr: IpAddr,
        sender: tokio::sync::mpsc::UnboundedSender<String>,
    ) -> AddClientResult {
        // Check per-user connection limit first (using a Mutex for fast atomic check)
        {
            let mut counts = self.user_conn_counts.lock().await;
            let current = counts.entry(user_id).or_insert(0);
            if *current >= MAX_CONNECTIONS_PER_USER {
                return AddClientResult::LimitExceeded(MAX_CONNECTIONS_PER_USER);
            }
            *current += 1;
        }

        {
            let mut counts = self.ip_conn_counts.lock().await;
            let current = counts.entry(ip_addr).or_insert(0);
            if *current >= MAX_CONNECTIONS_PER_IP {
                let mut user_counts = self.user_conn_counts.lock().await;
                if let Some(user_count) = user_counts.get_mut(&user_id) {
                    *user_count = user_count.saturating_sub(1);
                    if *user_count == 0 {
                        user_counts.remove(&user_id);
                    }
                }
                return AddClientResult::IpLimitExceeded(MAX_CONNECTIONS_PER_IP);
            }
            *current += 1;
        }

        let mut clients = self.clients.write().await;
        clients.insert(client_id, (user_id, school_id, ip_addr, sender.clone()));

        let mut user_conns = self.user_connections.write().await;
        user_conns
            .entry(user_id)
            .or_insert_with(Vec::new)
            .push(client_id);

        tracing::info!(
            "WebSocket client connected: {} (user: {}, tenant: {})",
            client_id,
            user_id,
            school_id
        );
        AddClientResult::Added
    }

    /// Remove a client connection
    pub async fn remove_client(&self, client_id: Uuid) {
        let mut clients = self.clients.write().await;
        if let Some((user_id, _school_id, ip_addr, _)) = clients.remove(&client_id) {
            // Decrement per-user count
            {
                let mut counts = self.user_conn_counts.lock().await;
                if let Some(count) = counts.get_mut(&user_id) {
                    *count = count.saturating_sub(1);
                    if *count == 0 {
                        counts.remove(&user_id);
                    }
                }
            }

            {
                let mut counts = self.ip_conn_counts.lock().await;
                if let Some(count) = counts.get_mut(&ip_addr) {
                    *count = count.saturating_sub(1);
                    if *count == 0 {
                        counts.remove(&ip_addr);
                    }
                }
            }

            let mut user_conns = self.user_connections.write().await;
            if let Some(conns) = user_conns.get_mut(&user_id) {
                conns.retain(|id| *id != client_id);
                if conns.is_empty() {
                    user_conns.remove(&user_id);
                }
            }

            // Remove from all topic subscriptions using reverse index (O(1) lookup)
            let mut topics = self.topic_subscriptions.write().await;
            let mut client_topics = self.client_topics.write().await;

            if let Some(subscribed_topics) = client_topics.remove(&client_id) {
                for topic in subscribed_topics {
                    if let Some(client_ids) = topics.get_mut(&topic) {
                        client_ids.retain(|id| *id != client_id);
                        if client_ids.is_empty() {
                            topics.remove(&topic);
                            tracing::debug!(
                                "Removed empty topic '{}' after client {} disconnect",
                                topic,
                                client_id
                            );
                        }
                    }
                }
            }

            tracing::info!(
                "WebSocket client disconnected: {} (user: {})",
                client_id,
                user_id
            );
        }
    }

    /// Subscribe a client to a topic. Returns `false` if the client is not connected.
    pub async fn subscribe(&self, client_id: Uuid, topic: String) -> bool {
        // Verify client exists
        let clients = self.clients.read().await;
        if !clients.contains_key(&client_id) {
            return false;
        }
        drop(clients);

        let mut topics = self.topic_subscriptions.write().await;
        let mut client_topics = self.client_topics.write().await;

        let already_subscribed = topics
            .get(&topic)
            .map(|subscribers| subscribers.contains(&client_id))
            .unwrap_or(false);

        if !already_subscribed {
            // Use reverse index for O(1) subscription count check
            let current_subscription_count = client_topics
                .get(&client_id)
                .map(|s| s.len())
                .unwrap_or(0);

            if current_subscription_count >= MAX_TOPICS_PER_CLIENT {
                tracing::warn!(
                    "WebSocket topic subscription rejected for client {}: limit of {} exceeded",
                    client_id,
                    MAX_TOPICS_PER_CLIENT
                );
                return false;
            }
        }

        let subscribers = topics.entry(topic.clone()).or_insert_with(Vec::new);
        if !subscribers.contains(&client_id) {
            subscribers.push(client_id);
            client_topics
                .entry(client_id)
                .or_insert_with(HashSet::new)
                .insert(topic);
        }

        tracing::debug!("Client {} subscribed to topic", client_id);
        true
    }

    /// Unsubscribe a client from a topic
    pub async fn unsubscribe(&self, client_id: Uuid, topic: &str) {
        let mut topics = self.topic_subscriptions.write().await;
        let mut client_topics = self.client_topics.write().await;

        if let Some(client_ids) = topics.get_mut(topic) {
            client_ids.retain(|id| *id != client_id);
            if client_ids.is_empty() {
                topics.remove(topic);
                tracing::debug!(
                    "Removed empty topic '{}' after client {} unsubscribed",
                    topic,
                    client_id
                );
            }
        }

        if let Some(topics_set) = client_topics.get_mut(&client_id) {
            topics_set.remove(topic);
            if topics_set.is_empty() {
                client_topics.remove(&client_id);
            }
        }

        tracing::debug!("Client {} unsubscribed from topic {}", client_id, topic);
    }

    /// Get the user_id for a connected client
    pub async fn get_user_id(&self, client_id: Uuid) -> Option<Uuid> {
        let clients = self.clients.read().await;
        clients.get(&client_id).map(|(uid, _, _, _)| *uid)
    }

    /// Send message to a specific user (all their connections)
    pub async fn send_to_user(
        &self,
        user_id: Uuid,
        message: &WebSocketMessage,
    ) -> Result<(), anyhow::Error> {
        let json = message.to_json()?;
        let user_conns = self.user_connections.read().await;

        if let Some(client_ids) = user_conns.get(&user_id) {
            let clients = self.clients.read().await;
            for client_id in client_ids {
                if let Some((_, _, _, sender)) = clients.get(client_id) {
                    let _ = sender.send(json.clone());
                }
            }
        }

        Ok(())
    }

    /// Send message to a topic (all subscribers)
    pub async fn send_to_topic(
        &self,
        topic: &str,
        message: &WebSocketMessage,
    ) -> Result<(), anyhow::Error> {
        let json = message.to_json()?;
        let topics = self.topic_subscriptions.read().await;

        if let Some(client_ids) = topics.get(topic) {
            let clients = self.clients.read().await;
            for client_id in client_ids {
                if let Some((_, _, _, sender)) = clients.get(client_id) {
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

        for (_, (_, _, _, sender)) in clients.iter() {
            let _ = sender.send(json.clone());
        }

        Ok(())
    }

    /// Broadcast message only to clients belonging to a specific tenant (school_id).
    /// Used for tenant-scoped notifications like blog updates.
    pub async fn broadcast_to_tenant(
        &self,
        school_id: i64,
        message: &WebSocketMessage,
    ) -> Result<(), anyhow::Error> {
        let json = message.to_json()?;
        let clients = self.clients.read().await;

        for (_, (_, tenant, _, sender)) in clients.iter() {
            if *tenant == school_id {
                let _ = sender.send(json.clone());
            }
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

    /// Get the number of active connections for a user
    pub async fn user_connection_count(&self, user_id: Uuid) -> usize {
        let counts = self.user_conn_counts.lock().await;
        counts.get(&user_id).copied().unwrap_or(0)
    }

    /// Get the number of active connections for an IP address
    pub async fn ip_connection_count(&self, ip_addr: IpAddr) -> usize {
        let counts = self.ip_conn_counts.lock().await;
        counts.get(&ip_addr).copied().unwrap_or(0)
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
        assert_eq!(
            topics::leaderboard("problem", Some(1)),
            "leaderboard:problem:1"
        );

        let user_id = Uuid::new_v4();
        assert_eq!(
            topics::user_notifications(user_id),
            format!("user:{}", user_id)
        );
        assert_eq!(topics::contest_chat(123), "contest:123:chat");
    }

    #[tokio::test]
    async fn test_client_management() {
        let server = WebSocketServer::new();
        let client_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let ip_addr = "127.0.0.1".parse().unwrap();
        let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();

        let result = server.add_client(client_id, user_id, 1, ip_addr, tx).await;
        assert!(matches!(result, AddClientResult::Added));
        assert_eq!(server.client_count().await, 1);
        assert_eq!(server.user_connection_count(user_id).await, 1);
        assert_eq!(server.ip_connection_count(ip_addr).await, 1);

        server.remove_client(client_id).await;
        assert_eq!(server.client_count().await, 0);
        assert_eq!(server.user_connection_count(user_id).await, 0);
        assert_eq!(server.ip_connection_count(ip_addr).await, 0);
    }

    #[tokio::test]
    async fn test_per_user_connection_limit() {
        let server = WebSocketServer::new();
        let user_id = Uuid::new_v4();
        let ip_addr = "127.0.0.1".parse().unwrap();

        // Add MAX_CONNECTIONS_PER_USER connections for the same user
        let mut client_ids = Vec::new();
        for _ in 0..MAX_CONNECTIONS_PER_USER {
            let client_id = Uuid::new_v4();
            let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();
            let result = server.add_client(client_id, user_id, 1, ip_addr, tx).await;
            assert!(matches!(result, AddClientResult::Added));
            client_ids.push(client_id);
        }

        // The next one should be rejected
        let extra_client = Uuid::new_v4();
        let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();
        let result = server
            .add_client(extra_client, user_id, 1, ip_addr, tx)
            .await;
        assert!(matches!(
            result,
            AddClientResult::LimitExceeded(MAX_CONNECTIONS_PER_USER)
        ));
        assert_eq!(server.client_count().await, MAX_CONNECTIONS_PER_USER);

        // After removing one, a new connection should succeed
        server.remove_client(client_ids[0]).await;
        let new_client = Uuid::new_v4();
        let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();
        let result = server.add_client(new_client, user_id, 1, ip_addr, tx).await;
        assert!(matches!(result, AddClientResult::Added));
    }

    #[tokio::test]
    async fn test_per_ip_connection_limit() {
        let server = WebSocketServer::new();
        let ip_addr = "127.0.0.1".parse().unwrap();
        let mut client_ids = Vec::new();

        for _ in 0..MAX_CONNECTIONS_PER_IP {
            let client_id = Uuid::new_v4();
            let user_id = Uuid::new_v4();
            let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();
            let result = server.add_client(client_id, user_id, 1, ip_addr, tx).await;
            assert!(matches!(result, AddClientResult::Added));
            client_ids.push(client_id);
        }

        let extra_client = Uuid::new_v4();
        let extra_user = Uuid::new_v4();
        let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();
        let result = server
            .add_client(extra_client, extra_user, 1, ip_addr, tx)
            .await;
        assert!(matches!(
            result,
            AddClientResult::IpLimitExceeded(MAX_CONNECTIONS_PER_IP)
        ));
        assert_eq!(
            server.ip_connection_count(ip_addr).await,
            MAX_CONNECTIONS_PER_IP
        );
        assert_eq!(server.user_connection_count(extra_user).await, 0);

        server.remove_client(client_ids[0]).await;
        let retry_client = Uuid::new_v4();
        let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();
        let retry = server
            .add_client(retry_client, extra_user, 1, ip_addr, tx)
            .await;
        assert!(matches!(retry, AddClientResult::Added));
    }

    #[tokio::test]
    async fn test_topic_subscription() {
        let server = WebSocketServer::new();
        let client_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();

        server
            .add_client(client_id, user_id, 1, "127.0.0.1".parse().unwrap(), tx)
            .await;
        let result = server.subscribe(client_id, "test_topic".to_string()).await;
        assert!(result);

        assert_eq!(server.topic_subscriber_count("test_topic").await, 1);

        server.unsubscribe(client_id, "test_topic").await;
        assert_eq!(server.topic_subscriber_count("test_topic").await, 0);
    }

    #[tokio::test]
    async fn test_subscribe_unknown_client_fails() {
        let server = WebSocketServer::new();
        let unknown_client = Uuid::new_v4();
        let result = server
            .subscribe(unknown_client, "test_topic".to_string())
            .await;
        assert!(!result);
    }

    #[tokio::test]
    async fn test_per_client_topic_subscription_limit() {
        let server = WebSocketServer::new();
        let client_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();

        server
            .add_client(client_id, user_id, 1, "127.0.0.1".parse().unwrap(), tx)
            .await;

        for idx in 0..MAX_TOPICS_PER_CLIENT {
            let result = server.subscribe(client_id, format!("topic-{idx}")).await;
            assert!(result, "topic {idx} should be allowed");
        }

        let extra = server
            .subscribe(client_id, "topic-over-limit".to_string())
            .await;
        assert!(!extra, "subscription beyond the cap should be rejected");
    }

    #[tokio::test]
    async fn test_tenant_scoped_broadcast() {
        let server = WebSocketServer::new();
        let user_a = Uuid::new_v4();
        let user_b = Uuid::new_v4();

        let (tx_a, mut rx_a) = tokio::sync::mpsc::unbounded_channel::<String>();
        let (tx_b, mut rx_b) = tokio::sync::mpsc::unbounded_channel::<String>();

        let client_a = Uuid::new_v4();
        let client_b = Uuid::new_v4();

        server
            .add_client(client_a, user_a, 1, "127.0.0.1".parse().unwrap(), tx_a)
            .await;
        server
            .add_client(client_b, user_b, 2, "127.0.0.2".parse().unwrap(), tx_b)
            .await;

        let msg = WebSocketMessage::TrendingArticles { articles: vec![] };
        server.broadcast_to_tenant(1, &msg).await.unwrap();

        // User A (tenant 1) should receive
        assert!(rx_a.try_recv().is_ok());
        // User B (tenant 2) should NOT receive
        assert!(rx_b.try_recv().is_err());
    }

    #[tokio::test]
    async fn test_reverse_index_removal_and_empty_topic_cleanup() {
        let server = WebSocketServer::new();

        // Create 100 clients each subscribed to a unique topic
        let mut client_ids = Vec::new();
        for idx in 0..100 {
            let client_id = Uuid::new_v4();
            let user_id = Uuid::new_v4();
            let (tx, _rx) = tokio::sync::mpsc::unbounded_channel();
            server
                .add_client(client_id, user_id, 1, format!("127.0.0.{idx}").parse().unwrap(), tx)
                .await;
            let topic = format!("unique-topic-{idx}");
            assert!(
                server.subscribe(client_id, topic).await,
                "client {idx} should subscribe"
            );
            client_ids.push(client_id);
        }

        // Verify all topics have exactly 1 subscriber
        for idx in 0..100 {
            assert_eq!(
                server.topic_subscriber_count(&format!("unique-topic-{idx}")).await,
                1
            );
        }

        // Remove all clients — each removal should clean up the now-empty topic
        for client_id in &client_ids {
            server.remove_client(*client_id).await;
        }

        // After removing all clients, all topics should be cleaned up
        for idx in 0..100 {
            assert_eq!(
                server.topic_subscriber_count(&format!("unique-topic-{idx}")).await,
                0,
                "topic unique-topic-{idx} should be cleaned up"
            );
        }

        // No clients remain
        assert_eq!(server.client_count().await, 0);

        // The reverse index should be empty too
        let client_topics = server.client_topics.read().await;
        assert!(client_topics.is_empty(), "client_topics should be empty after all clients removed");
    }

    #[tokio::test]
    async fn test_remove_client_cleans_only_subscribed_topics() {
        let server = WebSocketServer::new();

        // Client A subscribes to topic "alpha"
        // Client B subscribes to topic "beta"
        let (tx_a, _rx_a) = tokio::sync::mpsc::unbounded_channel();
        let (tx_b, _rx_b) = tokio::sync::mpsc::unbounded_channel();
        let client_a = Uuid::new_v4();
        let client_b = Uuid::new_v4();
        let user_a = Uuid::new_v4();
        let user_b = Uuid::new_v4();

        server.add_client(client_a, user_a, 1, "127.0.0.1".parse().unwrap(), tx_a).await;
        server.add_client(client_b, user_b, 1, "127.0.0.2".parse().unwrap(), tx_b).await;

        server.subscribe(client_a, "alpha".to_string()).await;
        server.subscribe(client_b, "beta".to_string()).await;

        // Remove client A — only "alpha" should be cleaned up, "beta" untouched
        server.remove_client(client_a).await;
        assert_eq!(server.topic_subscriber_count("alpha").await, 0);
        assert_eq!(server.topic_subscriber_count("beta").await, 1);

        // Client B's reverse index should still have "beta"
        let client_topics = server.client_topics.read().await;
        assert!(client_topics.get(&client_a).is_none());
        assert_eq!(client_topics.get(&client_b).unwrap().len(), 1);
        drop(client_topics);

        // Remove client B — "beta" cleaned up
        server.remove_client(client_b).await;
        assert_eq!(server.topic_subscriber_count("beta").await, 0);
    }
}
