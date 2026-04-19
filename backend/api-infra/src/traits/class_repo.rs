use crate::error::AppError;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// Summary type for class references.
#[derive(Debug, Clone)]
pub struct ClassSummary {
    pub id: i64,
    pub name: String,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub teacher_id: Uuid,
    pub semester: String,
    pub code: String,
    pub created_at: DateTime<Utc>,
}

/// Input for creating a class
#[derive(Debug, Clone)]
pub struct CreateClassInput {
    pub name: String,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub teacher_id: Uuid,
    pub semester: String,
    pub code: String,
}

/// Input for creating an assignment
#[derive(Debug, Clone)]
pub struct CreateAssignmentInput {
    pub class_id: i64,
    pub problem_id: i64,
    pub title: Option<String>,
    pub deadline: DateTime<Utc>,
    pub points: i32,
}

/// Summary of an assignment
#[derive(Debug, Clone)]
pub struct AssignmentSummary {
    pub id: i64,
    pub class_id: i64,
    pub problem_id: i64,
    pub title: Option<String>,
    pub deadline: DateTime<Utc>,
    pub points: i32,
    pub published_at: DateTime<Utc>,
}

/// Filter for listing classes
#[derive(Debug, Clone, Default)]
pub struct ClassFilter {
    pub organization_id: Option<i64>,
    pub campus_id: Option<i64>,
    pub teacher_id: Option<Uuid>,
    pub limit: u32,
    pub offset: u32,
}

/// Repository interface for class domain operations.
#[async_trait]
pub trait ClassRepo: Send + Sync {
    async fn find_by_id(&self, id: i64) -> Result<Option<ClassSummary>, AppError>;
    async fn create(&self, input: CreateClassInput) -> Result<i64, AppError>;
    async fn update(&self, id: i64, input: serde_json::Value) -> Result<ClassSummary, AppError>;
    async fn delete(&self, id: i64) -> Result<(), AppError>;
    async fn list(&self, filter: ClassFilter) -> Result<Vec<ClassSummary>, AppError>;
    async fn enroll_student(&self, class_id: i64, student_id: Uuid) -> Result<(), AppError>;
    async fn remove_student(&self, class_id: i64, student_id: Uuid) -> Result<(), AppError>;
    async fn is_enrolled(&self, class_id: i64, student_id: Uuid) -> Result<bool, AppError>;
    async fn list_students(&self, class_id: i64) -> Result<Vec<Uuid>, AppError>;
    async fn create_assignment(&self, input: CreateAssignmentInput) -> Result<i64, AppError>;
    async fn list_assignments(&self, class_id: i64) -> Result<Vec<AssignmentSummary>, AppError>;
}

/// Trait for leaderboard to verify class membership without depending on domain-classes.
/// Per D-06: cross-domain dependencies route through api-infra traits.
#[async_trait]
pub trait ClassMembershipChecker: Send + Sync {
    /// Get student IDs enrolled in a class. Used by leaderboard to verify access.
    async fn get_class_student_ids(&self, class_id: i64) -> Result<Vec<Uuid>, AppError>;
}

/// No-op implementation for use during AppState construction before the real
/// domain-classes wiring is complete (Plan 05). Returns an empty list for every class.
pub struct NoopClassMembershipChecker;

#[async_trait]
impl ClassMembershipChecker for NoopClassMembershipChecker {
    async fn get_class_student_ids(&self, _class_id: i64) -> Result<Vec<Uuid>, AppError> {
        Ok(vec![])
    }
}
