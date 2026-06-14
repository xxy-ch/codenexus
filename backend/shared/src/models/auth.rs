use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// JWT Claims
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    /// Subject - user ID
    pub sub: Uuid,
    /// Email
    pub email: String,
    /// User role (e.g., "admin", "student", "teacher")
    pub role: String,
    /// Tenant ID (school ID)
    pub school_id: i64,
    /// Optional campus ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub campus_id: Option<i64>,
    /// Optional grade ID (set for GradeAdmin, students, teachers)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub grade_id: Option<i64>,
    /// Issued at (UTC timestamp)
    pub iat: i64,
    /// Expiration (UTC timestamp)
    pub exp: i64,
    /// JWT ID (unique identifier for this token)
    pub jti: Uuid,
    /// Token type: "access" or "refresh". Prevents token-type confusion
    /// (e.g., using an access token at /auth/refresh to obtain a new refresh
    /// token, extending the attacker's window). Defaults to "access" for
    /// backward compatibility with tokens issued before this field existed.
    #[serde(default = "default_token_type")]
    pub token_type: String,
}

fn default_token_type() -> String {
    "access".to_string()
}

/// Login request
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

/// Login response
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    /// Access token
    pub token: String,
    /// Refresh token
    pub refresh_token: String,
    /// User info
    pub user: crate::models::user::UserPublic,
}

/// Refresh token request
#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: Option<String>,
}

/// Refresh token response
#[derive(Debug, Serialize)]
pub struct RefreshResponse {
    /// New access token
    pub token: String,
}
