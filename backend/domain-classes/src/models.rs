use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ========== Grade Models ==========

/// Grade model — campus-scoped grouping of classes by academic year level
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Grade {
    pub id: i64,
    pub campus_id: i64,
    pub name: String,
    pub year_level: i32,
    pub academic_year: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGradeRequest {
    pub campus_id: i64,
    pub name: String,
    pub year_level: i32,
    pub academic_year: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGradeRequest {
    pub name: Option<String>,
    pub year_level: Option<i32>,
    pub academic_year: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ListGradesQuery {
    pub campus_id: Option<i64>,
    pub is_active: Option<bool>,
    pub academic_year: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GradesListResponse {
    pub grades: Vec<Grade>,
    pub total: i64,
}

#[derive(Debug, Deserialize)]
pub struct GraduateGradeRequest {
    /// Whether to suspend graduated student accounts
    #[serde(default)]
    pub suspend_students: bool,
}

#[derive(Debug, Deserialize)]
pub struct PromoteGradeRequest {
    /// Academic year for the promoted grades
    pub new_academic_year: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateAcademicYearRequest {
    /// Academic year label (e.g., '2026-2027')
    pub academic_year: String,
    /// Year levels to create (e.g., [1, 2, 3])
    pub year_levels: Vec<i32>,
    /// Name templates indexed by year_level position
    /// If empty, defaults to Chinese high school pattern: [高一, 高二, 高三]
    #[serde(default)]
    pub name_templates: Vec<String>,
}

// ========== Class Models ==========

/// Class (course) model
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Class {
    pub id: i64,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub teacher_id: Uuid,
    pub code: String,
    pub is_active: bool,
    pub max_students: Option<i32>,
    pub semester: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateClassRequest {
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub name: String,
    pub semester: Option<String>,
    pub grade_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateClassRequest {
    pub name: Option<String>,
    pub campus_id: Option<i64>,
    pub semester: Option<String>,
    pub grade_id: Option<i64>,
}

/// Student enrollment in class
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ClassEnrollment {
    pub id: i64,
    pub class_id: i64,
    pub student_id: Uuid,
    pub status: String, // "active", "dropped", "completed"
    pub enrolled_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AddStudentRequest {
    #[serde(alias = "student_email")]
    pub username: String,
}

/// Assignment model
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Assignment {
    pub id: i64,
    pub class_id: i64,
    pub problem_id: i64,
    pub deadline: DateTime<Utc>,
    pub points: i32,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAssignmentRequest {
    pub problem_id: i64,
    pub deadline: DateTime<Utc>,
    pub points: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAssignmentRequest {
    pub problem_id: Option<i64>,
    pub deadline: Option<DateTime<Utc>>,
    pub points: Option<i32>,
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
    pub grade_id: Option<i64>,
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
    pub code: Option<String>,
    #[serde(default)]
    pub enrollment_code: Option<String>,
}

/// Request to batch import students
#[derive(Debug, Deserialize)]
pub struct BatchImportRequest {
    #[serde(alias = "emails")]
    pub usernames: Vec<String>,
}
