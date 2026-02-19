use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Class (course) model
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Class {
    pub id: i64,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub teacher_id: Uuid,
    pub code: String, // Unique enrollment code
    pub is_active: bool,
    pub max_students: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateClassRequest {
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub max_students: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateClassRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub is_active: Option<bool>,
    pub max_students: Option<i32>,
}

/// Student enrollment in class
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ClassEnrollment {
    pub id: i64,
    pub class_id: i64,
    pub student_id: Uuid,
    pub teacher_id: Uuid,
    pub status: String, // "active", "dropped", "completed"
    pub enrolled_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AddStudentRequest {
    pub student_email: String,
}

/// Assignment model
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Assignment {
    pub id: i64,
    pub class_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub problem_ids: Vec<i64>, // Vector of problem IDs (stored as JSONB)
    pub deadline: DateTime<Utc>,
    pub late_penalty_percent: i32, // Penalty per day late
    pub max_submissions: Option<i32>,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAssignmentRequest {
    pub title: String,
    pub description: Option<String>,
    pub problem_ids: Vec<i64>,
    pub deadline: DateTime<Utc>,
    pub late_penalty_percent: i32,
    pub max_submissions: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAssignmentRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub problem_ids: Option<Vec<i64>>,
    pub deadline: Option<DateTime<Utc>>,
    pub late_penalty_percent: Option<i32>,
    pub max_submissions: Option<i32>,
    pub is_published: Option<bool>,
}

/// Assignment submission
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssignmentSubmission {
    pub id: i64,
    pub assignment_id: i64,
    pub user_id: Uuid,
    pub submission_id: i64,
    pub score: i32,
    pub is_late: bool,
    pub late_days: i32,
    pub submitted_at: DateTime<Utc>,
}

/// Student progress in class
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct StudentProgress {
    pub student_id: Uuid,
    pub username: String,
    pub email: String,
    pub total_assignments: i32,
    pub completed_assignments: i32,
    pub average_score: f64,
    pub last_submission: Option<DateTime<Utc>>,
}

/// Class statistics
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ClassStats {
    pub class_id: i64,
    pub total_students: i32,
    pub active_students: i32,
    pub total_assignments: i32,
    pub total_submissions: i64,
    pub average_score: f64,
    pub completion_rate: f64,
}

/// List query parameters
#[derive(Debug, Deserialize)]
pub struct ListClassesQuery {
    pub organization_id: Option<i64>,
    pub campus_id: Option<i64>,
    pub teacher_id: Option<Uuid>,
    pub is_active: Option<bool>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

/// List response
#[derive(Debug, Serialize)]
pub struct ClassesListResponse {
    pub classes: Vec<Class>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

/// Request to enroll with code
#[derive(Debug, Deserialize)]
pub struct EnrollWithCodeRequest {
    pub code: String,
}

/// Request to batch import students
#[derive(Debug, Deserialize)]
pub struct BatchImportRequest {
    pub emails: Vec<String>,
}
