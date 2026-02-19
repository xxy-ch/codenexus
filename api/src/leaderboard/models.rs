use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

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
    pub streak_days: i64, // Current streak of days with at least one AC
    pub max_streak_days: i64, // Maximum streak achieved
    pub last_ac_at: Option<DateTime<Utc>>,
    pub joined_at: DateTime<Utc>,
    pub recent_ac: Vec<RecentAC>, // Last 10 accepted problems
}

/// Recent accepted problem
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RecentAC {
    pub problem_id: Uuid,
    pub problem_title: String,
    pub difficulty: String,
    pub solved_at: DateTime<Utc>,
}

/// Leaderboard query parameters
#[derive(Debug, Deserialize)]
pub struct LeaderboardQuery {
    pub limit: Option<i64>, // Default 100, max 1000
    pub offset: Option<i64>, // For pagination
    pub timeframe: Option<String>, // "all", "week", "month", "year"
    pub min_problems: Option<i64>, // Minimum problems solved to qualify
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

/// Statistics overview
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatsOverview {
    pub total_users: i64,
    pub total_problems: i64,
    pub total_submissions: i64,
    pub total_acceptances: i64,
    pub average_acceptance_rate: f64,
    pub most_active_day: String, // Day of week with most submissions
    pub top_5_languages: Vec<LanguageStats>,
}

/// Language statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageStats {
    pub language: String,
    pub submissions: i64,
    pub acceptances: i64,
    pub acceptance_rate: f64,
}

/// Daily submission count
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailySubmissionStats {
    pub date: String, // YYYY-MM-DD
    pub submissions: i64,
    pub acceptances: i64,
}

/// User ranking history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RankingHistory {
    pub user_id: Uuid,
    pub history: Vec<RankingSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RankingSnapshot {
    pub date: DateTime<Utc>,
    pub global_rank: i64,
    pub score: f64,
}
