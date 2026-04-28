use crate::error::AppError;
use async_trait::async_trait;
use shared::models::user::{User, UserPublic};
use uuid::Uuid;

/// Input for creating a new user
#[derive(Debug, Clone)]
pub struct CreateUserInput {
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub school_id: i64,
    pub campus_id: Option<i64>,
    pub display_name: Option<String>,
    pub user_code: Option<String>,
}

/// Input for updating an existing user
#[derive(Debug, Clone)]
pub struct UpdateUserInput {
    pub username: Option<String>,
    pub email: Option<String>,
    pub role: Option<String>,
    pub campus_id: Option<i64>,
    pub display_name: Option<String>,
    pub status: Option<String>,
}

/// Filter for listing users
#[derive(Debug, Clone, Default)]
pub struct UserFilter {
    pub organization_id: Option<i64>,
    pub campus_id: Option<i64>,
    pub role: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
    pub limit: u32,
    pub offset: u32,
}

/// Repository interface for user domain operations.
#[async_trait]
pub trait UserRepo: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AppError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, AppError>;
    async fn find_by_username(&self, username: &str) -> Result<Option<User>, AppError>;
    async fn create(&self, input: CreateUserInput) -> Result<User, AppError>;
    async fn update(&self, id: Uuid, input: UpdateUserInput) -> Result<User, AppError>;
    async fn delete(&self, id: Uuid) -> Result<(), AppError>;
    async fn list(&self, filter: UserFilter) -> Result<Vec<User>, AppError>;
    async fn count_by_organization(&self, organization_id: i64) -> Result<i64, AppError>;
    async fn find_public_by_id(&self, id: Uuid) -> Result<Option<UserPublic>, AppError>;
}
