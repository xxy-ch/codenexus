use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub user_code: Option<String>,
    pub username: String,
    pub email: Option<String>,
    pub password_hash: String,
    pub display_name: Option<String>,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct UserProfile {
    pub id: Uuid,
    pub user_code: Option<String>,
    pub username: String,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
    pub role: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub user_code: Option<String>,
    pub username: String,
    pub password: String,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub refresh_token: String,
    pub user: UserProfile,
}

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

#[derive(Debug, Serialize)]
pub struct TokenClaims {
    pub sub: String, // user_id
    pub username: String,
    pub email: Option<String>,
    pub organization_id: i64,
    pub exp: usize,
}

#[derive(Debug, Deserialize)]
pub struct UserProfileUpdate {
    pub email: Option<String>,
    pub password: Option<String>,
    pub display_name: Option<String>,
    pub campus_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct AdminUserQuery {
    pub search: Option<String>,
    pub role: Option<String>,
    pub status: Option<String>,
    pub sort: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct AdminUserRow {
    pub id: Uuid,
    pub user_code: Option<String>,
    pub username: String,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub role: String,
    pub status: String,
    pub organization_id: i64,
    pub organization_name: String,
    pub created_at: DateTime<Utc>,
    pub submissions_count: i64,
    pub problems_solved: i64,
}

#[derive(Debug, Serialize)]
pub struct AdminUserListResponse {
    pub users: Vec<AdminUserRow>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRoleRequest {
    pub role: String,
}

#[derive(Debug, Serialize)]
pub struct AdminMutationResponse {
    pub success: bool,
}

#[derive(Debug, Deserialize)]
pub struct BatchCreateUsersRequest {
    pub users: Vec<BatchCreateUserInput>,
    pub default_password: Option<String>,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct BatchCreateUserInput {
    pub user_code: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
    pub password: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BatchCreateUsersResponse {
    pub created: Vec<UserProfile>,
    pub skipped: Vec<BatchCreateUserSkip>,
}

#[derive(Debug, Serialize)]
pub struct BatchCreateUserSkip {
    pub user_code: String,
    pub reason: String,
}
