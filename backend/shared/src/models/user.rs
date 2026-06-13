use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub role: String,
    pub school_id: i64,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPublic {
    pub id: Uuid,
    pub user_code: Option<String>,
    pub username: String,
    pub email: String,
    pub display_name: Option<String>,
    pub role: String,
    pub school_id: i64,
    pub campus_id: Option<i64>,
    pub grade_id: Option<i64>,
}

impl From<User> for UserPublic {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            user_code: None,
            username: user.username,
            email: user.email,
            display_name: None,
            role: user.role,
            school_id: user.school_id,
            campus_id: user.campus_id,
            grade_id: user.grade_id,
        }
    }
}
