use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Contest {
    pub id: i64,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub rules: String, // "acm", "ioi", or "education"
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub freeze_minutes: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateContestRequest {
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub rules: Option<String>, // "acm", "ioi", or "education"
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub freeze_minutes: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContestRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub rules: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub freeze_minutes: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct ContestDetail {
    pub id: i64,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub rules: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub freeze_minutes: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub problem_count: i64,
    pub participant_count: i64,
}

// Contest-Problem relationship
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ContestProblem {
    pub id: i64,
    pub contest_id: i64,
    pub problem_id: i64,
    pub points: i32,
    pub order_index: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AddProblemToContestRequest {
    pub problem_id: i64,
    pub points: Option<i32>,
    pub order_index: Option<i32>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ContestProblemDetail {
    pub id: i64,
    pub problem_id: i64,
    pub title: String,
    pub difficulty: String,
    pub points: i32,
    pub order_index: i32,
}

// Contest submission tracking
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ContestSubmission {
    pub id: i64,
    pub contest_id: i64,
    pub submission_id: i64,
    pub penalty_time: i32,
    pub created_at: DateTime<Utc>,
}

// Ranking models
#[derive(Debug, Serialize)]
pub struct ContestRankingEntry {
    pub user_id: uuid::Uuid,
    pub username: String,
    pub score: i32,
    pub penalty: i32,
    pub solved_count: i32,
    pub submissions: Vec<ProblemSubmission>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ProblemSubmission {
    pub problem_id: i64,
    pub problem_title: String,
    pub score: i32,
    pub attempts: i32,
    pub time_penalty: i32,
    pub first_solved_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct ListContestsQuery {
    pub organization_id: Option<i64>,
    pub campus_id: Option<i64>,
    pub active: Option<bool>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct ContestsListResponse {
    pub contests: Vec<Contest>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

// Contest Participant (Registration)
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ContestParticipant {
    pub id: i64,
    pub contest_id: i64,
    pub user_id: uuid::Uuid,
    pub registered_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct RegisterForContestRequest {
    pub contest_id: i64,
}

#[derive(Debug, Serialize)]
pub struct ContestStatus {
    pub status: String,                // "upcoming", "active", "ended"
    pub time_until_start: Option<i64>, // seconds
    pub time_until_end: Option<i64>,   // seconds
    pub is_frozen: bool,
}
