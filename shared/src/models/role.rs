use serde::{Deserialize, Serialize};
use std::str::FromStr;

/// User roles for RBAC authorization
///
/// Roles are hierarchical in terms of permissions:
/// - Root: Has all permissions across all tenants (super admin)
/// - CampusAdmin: Has admin permissions for their campus
/// - Teacher: Can create problems, grade submissions, view leaderboard
/// - Student: Can submit solutions, view problems, view leaderboard
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Role {
    /// Root administrator with system-wide access
    Root,
    /// Campus-level administrator
    CampusAdmin,
    /// Teacher with problem creation and grading permissions
    Teacher,
    /// Student with submission and viewing permissions
    Student,
}

impl Role {
    /// Convert role to string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            Role::Root => "root",
            Role::CampusAdmin => "campusadmin",
            Role::Teacher => "teacher",
            Role::Student => "student",
        }
    }
}

impl FromStr for Role {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "root" => Ok(Role::Root),
            "campusadmin" => Ok(Role::CampusAdmin),
            "teacher" => Ok(Role::Teacher),
            "student" => Ok(Role::Student),
            _ => Err(format!("Invalid role: {}", s)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_from_str() {
        assert_eq!(Role::from_str("root"), Ok(Role::Root));
        assert_eq!(Role::from_str("ROOT"), Ok(Role::Root));
        assert_eq!(Role::from_str("campusadmin"), Ok(Role::CampusAdmin));
        assert_eq!(Role::from_str("CampusAdmin"), Ok(Role::CampusAdmin));
        assert_eq!(Role::from_str("teacher"), Ok(Role::Teacher));
        assert_eq!(Role::from_str("student"), Ok(Role::Student));
        assert!(Role::from_str("unknown").is_err());
    }

    #[test]
    fn test_role_as_str() {
        assert_eq!(Role::Root.as_str(), "root");
        assert_eq!(Role::CampusAdmin.as_str(), "campusadmin");
        assert_eq!(Role::Teacher.as_str(), "teacher");
        assert_eq!(Role::Student.as_str(), "student");
    }

    #[test]
    fn test_role_roundtrip() {
        let roles = [Role::Root, Role::CampusAdmin, Role::Teacher, Role::Student];
        for role in roles {
            let s = role.as_str();
            let parsed = Role::from_str(s).ok();
            assert_eq!(Some(role), parsed);
        }
    }

    #[test]
    fn test_role_serialization() {
        let role = Role::CampusAdmin;
        let serialized = serde_json::to_string(&role).unwrap();
        assert_eq!(serialized, "\"campusAdmin\"");

        let deserialized: Role = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized, role);
    }
}
