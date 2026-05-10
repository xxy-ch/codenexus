use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// WebSocket message types for real-time communication
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum WebSocketMessage {
    /// Explicit topic subscription request from clients.
    Subscribe { topic: String },

    /// Explicit topic unsubscription request from clients.
    Unsubscribe { topic: String },

    /// Submission status update
    SubmissionUpdate {
        submission_id: i64,
        user_id: Uuid,
        problem_id: i64,
        status: String,
        score: Option<i32>,
        runtime_ms: Option<i32>,
        memory_kb: Option<i32>,
    },

    /// Leaderboard update
    LeaderboardUpdate {
        scope: String, // "global", "problem", "contest", "class"
        scope_id: Option<i64>,
        data: serde_json::Value,
    },

    /// New notification
    Notification {
        id: Uuid,
        user_id: Uuid,
        title: String,
        message: String,
        notification_type: String,
        created_at: chrono::DateTime<chrono::Utc>,
    },

    /// Contest status update
    ContestUpdate {
        contest_id: i64,
        status: String,              // "starting_soon", "started", "ended"
        time_remaining: Option<i64>, // seconds
    },

    /// Real-time problem statistics
    ProblemStats {
        problem_id: i64,
        total_submissions: i64,
        accepted_count: i64,
        accuracy_rate: f64,
    },

    /// Chat message (for contest discussions)
    ChatMessage {
        id: Uuid,
        contest_id: i64,
        user_id: Uuid,
        username: String,
        message: String,
        timestamp: chrono::DateTime<chrono::Utc>,
    },

    /// New discussion reply
    DiscussionReply {
        discussion_id: i64,
        reply_id: i64,
        user_id: Uuid,
        username: String,
        content: String,
        created_at: chrono::DateTime<chrono::Utc>,
    },

    /// New article comment
    ArticleComment {
        article_id: i64,
        comment_id: i64,
        user_id: Uuid,
        username: String,
        content: String,
        created_at: chrono::DateTime<chrono::Utc>,
    },

    /// Trending articles update
    TrendingArticles { articles: Vec<serde_json::Value> },

    /// Heartbeat/ping
    Ping { timestamp: i64 },

    /// Pong response
    Pong { timestamp: i64 },

    /// Error message
    Error { code: String, message: String },
}

impl WebSocketMessage {
    /// Convert message to JSON string
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }

    /// Parse JSON string to message
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }

    /// Get message type string
    pub fn message_type(&self) -> &'static str {
        match self {
            WebSocketMessage::Subscribe { .. } => "subscribe",
            WebSocketMessage::Unsubscribe { .. } => "unsubscribe",
            WebSocketMessage::SubmissionUpdate { .. } => "submission_update",
            WebSocketMessage::LeaderboardUpdate { .. } => "leaderboard_update",
            WebSocketMessage::Notification { .. } => "notification",
            WebSocketMessage::ContestUpdate { .. } => "contest_update",
            WebSocketMessage::ProblemStats { .. } => "problem_stats",
            WebSocketMessage::ChatMessage { .. } => "chat_message",
            WebSocketMessage::DiscussionReply { .. } => "discussion_reply",
            WebSocketMessage::ArticleComment { .. } => "article_comment",
            WebSocketMessage::TrendingArticles { .. } => "trending_articles",
            WebSocketMessage::Ping { .. } => "ping",
            WebSocketMessage::Pong { .. } => "pong",
            WebSocketMessage::Error { .. } => "error",
        }
    }
}

/// WebSocket message type filter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageFilter {
    /// Filter by message types
    pub message_types: Vec<String>,
    /// Filter by submission IDs (for submission updates)
    pub submission_ids: Option<Vec<i64>>,
    /// Filter by contest IDs (for contest updates)
    pub contest_ids: Option<Vec<i64>>,
    /// Filter by problem IDs (for problem stats)
    pub problem_ids: Option<Vec<i64>>,
    /// Filter by discussion IDs (for discussion replies)
    pub discussion_ids: Option<Vec<i64>>,
    /// Filter by article IDs (for article comments)
    pub article_ids: Option<Vec<i64>>,
}

impl MessageFilter {
    /// Check if a message matches the filter
    pub fn matches(&self, message: &WebSocketMessage) -> bool {
        // Check message type
        if !self.message_types.is_empty() {
            let msg_type = message.message_type();
            if !self.message_types.contains(&msg_type.to_string()) {
                return false;
            }
        }

        // Check specific ID filters
        match message {
            WebSocketMessage::SubmissionUpdate { submission_id, .. } => {
                if let Some(ref ids) = self.submission_ids {
                    return ids.contains(submission_id);
                }
            }
            WebSocketMessage::ContestUpdate { contest_id, .. } => {
                if let Some(ref ids) = self.contest_ids {
                    return ids.contains(contest_id);
                }
            }
            WebSocketMessage::ProblemStats { problem_id, .. } => {
                if let Some(ref ids) = self.problem_ids {
                    return ids.contains(problem_id);
                }
            }
            WebSocketMessage::DiscussionReply { discussion_id, .. } => {
                if let Some(ref ids) = self.discussion_ids {
                    return ids.contains(discussion_id);
                }
            }
            WebSocketMessage::ArticleComment { article_id, .. } => {
                if let Some(ref ids) = self.article_ids {
                    return ids.contains(article_id);
                }
            }
            _ => {}
        }

        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_serialization() {
        let msg = WebSocketMessage::Ping {
            timestamp: 1234567890,
        };

        let json = msg.to_json().unwrap();
        // JSON should contain "type" and "Ping" (since we use tag/content serialization)
        assert!(json.contains(r#""type":"Ping""#));

        let decoded = WebSocketMessage::from_json(&json).unwrap();
        match decoded {
            WebSocketMessage::Ping { timestamp } => {
                assert_eq!(timestamp, 1234567890);
            }
            _ => panic!("Wrong message type"),
        }
    }

    #[test]
    fn test_submission_update_message() {
        let msg = WebSocketMessage::SubmissionUpdate {
            submission_id: 1,
            user_id: Uuid::new_v4(),
            problem_id: 10,
            status: "accepted".to_string(),
            score: Some(100),
            runtime_ms: Some(150),
            memory_kb: Some(1024),
        };

        assert_eq!(msg.message_type(), "submission_update");

        let json = msg.to_json().unwrap();
        assert!(json.contains("accepted"));
        assert!(json.contains("100"));
    }

    #[test]
    fn test_message_filter() {
        let filter = MessageFilter {
            message_types: vec!["submission_update".to_string()],
            submission_ids: Some(vec![1, 2, 3]),
            contest_ids: None,
            problem_ids: None,
            discussion_ids: None,
            article_ids: None,
        };

        let msg = WebSocketMessage::SubmissionUpdate {
            submission_id: 1,
            user_id: Uuid::new_v4(),
            problem_id: 10,
            status: "accepted".to_string(),
            score: None,
            runtime_ms: None,
            memory_kb: None,
        };

        assert!(filter.matches(&msg));

        let msg2 = WebSocketMessage::Ping { timestamp: 123 };
        assert!(!filter.matches(&msg2));
    }
}
