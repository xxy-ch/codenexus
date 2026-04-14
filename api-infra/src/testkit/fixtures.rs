use shared::models::User;
use uuid::Uuid;

/// Build a test user with the given parameters.
pub fn build_test_user(id: Uuid, username: &str, role: &str, school_id: i64) -> User {
    User {
        id,
        username: username.to_string(),
        email: format!("{username}@example.com"),
        password_hash: "hashed_password".to_string(),
        role: role.to_string(),
        school_id,
        campus_id: None,
    }
}

/// Build a test user with a campus.
pub fn build_test_user_with_campus(
    id: Uuid,
    username: &str,
    role: &str,
    school_id: i64,
    campus_id: i64,
) -> User {
    User {
        id,
        username: username.to_string(),
        email: format!("{username}@example.com"),
        password_hash: "hashed_password".to_string(),
        role: role.to_string(),
        school_id,
        campus_id: Some(campus_id),
    }
}

/// Generate a random UUID for test use.
pub fn random_uuid() -> Uuid {
    Uuid::new_v4()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_test_user_has_no_campus() {
        let id = Uuid::new_v4();
        let user = build_test_user(id, "testuser", "student", 1);
        assert_eq!(user.id, id);
        assert_eq!(user.username, "testuser");
        assert_eq!(user.email, "testuser@example.com");
        assert_eq!(user.role, "student");
        assert_eq!(user.school_id, 1);
        assert!(user.campus_id.is_none());
    }

    #[test]
    fn test_build_test_user_with_campus() {
        let id = Uuid::new_v4();
        let user = build_test_user_with_campus(id, "teacher1", "teacher", 2, 42);
        assert_eq!(user.id, id);
        assert_eq!(user.role, "teacher");
        assert_eq!(user.school_id, 2);
        assert_eq!(user.campus_id, Some(42));
    }

    #[test]
    fn test_random_uuid_is_unique() {
        let a = random_uuid();
        let b = random_uuid();
        assert_ne!(a, b);
    }
}
