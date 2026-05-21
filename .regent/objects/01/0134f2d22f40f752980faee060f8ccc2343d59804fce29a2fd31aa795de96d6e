use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Leaderboard entry for a user
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LeaderboardEntry {
    pub rank: i64,
    pub user_id: Uuid,
    pub username: String,
    pub score: f64,
    pub problems_solved: i64,
    pub submissions: i64,
    pub acceptance_rate: f64,
    pub organization_id: Option<i64>,
    pub campus_id: Option<i64>,
}

/// User statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserStats {
    pub user_id: Uuid,
    pub username: String,
    pub total_problems_solved: i64,
    pub total_submissions: i64,
    pub acceptance_rate: f64,
    pub global_rank: Option<i64>,
    pub school_rank: Option<i64>,
    pub campus_rank: Option<i64>,
    pub class_rank: Option<i64>,
    pub streak_days: i64,
    pub max_streak_days: i64,
    pub last_ac_at: Option<DateTime<Utc>>,
    pub joined_at: DateTime<Utc>,
    pub recent_ac: Vec<RecentAC>,
}

/// Recent accepted problem
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RecentAC {
    pub problem_id: i64,
    pub problem_title: String,
    pub difficulty: String,
    pub solved_at: DateTime<Utc>,
}

/// Leaderboard query parameters
#[derive(Debug, Deserialize)]
pub struct LeaderboardQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub timeframe: Option<String>,
    pub min_problems: Option<i64>,
}

/// Leaderboard response
#[derive(Debug, Serialize)]
pub struct LeaderboardResponse {
    pub entries: Vec<LeaderboardEntry>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
    pub timeframe: String,
}

/// Problem leaderboard (fastest solvers)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProblemLeaderboardEntry {
    pub rank: i64,
    pub user_id: Uuid,
    pub username: String,
    pub time_ms: i64,
    pub memory_kb: i64,
    pub language: String,
    pub solved_at: DateTime<Utc>,
}
