use serde::{Deserialize, Serialize};
use std::str::FromStr;

/// User roles for RBAC authorization
///
/// Roles are hierarchical in terms of permissions:
/// - Root: Has all permissions across all tenants (super admin)
/// - OrganizationAdmin: Has admin permissions for their organization
/// - CampusAdmin: Has admin permissions for their campus
/// - Teacher: Can create problems, manage classes, grade submissions
/// - Student: Can submit solutions, view problems, view leaderboard
/// - TeachingAssistant: Can help grade submissions but limited permissions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Role {
    /// Root administrator with system-wide access
    Root,
    /// Organization-level administrator
    OrganizationAdmin,
    /// Campus-level administrator
    CampusAdmin,
    /// Teacher with problem creation and grading permissions
    Teacher,
    /// Teaching assistant with limited grading permissions
    TeachingAssistant,
    /// Student with submission and viewing permissions
    Student,
}

impl Role {
    /// Convert role to string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            Role::Root => "root",
            Role::OrganizationAdmin => "organizationadmin",
            Role::CampusAdmin => "campusadmin",
            Role::Teacher => "teacher",
            Role::TeachingAssistant => "teachingassistant",
            Role::Student => "student",
        }
    }

    /// Check if this role is higher than or equal to another role in hierarchy
    pub fn is_higher_or_equal(&self, other: Role) -> bool {
        let hierarchy = [
            Role::Student,
            Role::TeachingAssistant,
            Role::Teacher,
            Role::CampusAdmin,
            Role::OrganizationAdmin,
            Role::Root,
        ];

        let self_idx = hierarchy.iter().position(|&r| r == *self).unwrap_or(0);
        let other_idx = hierarchy.iter().position(|&r| r == other).unwrap_or(0);

        self_idx >= other_idx
    }
}

impl FromStr for Role {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "root" => Ok(Role::Root),
            "organizationadmin" | "orgadmin" => Ok(Role::OrganizationAdmin),
            "campusadmin" => Ok(Role::CampusAdmin),
            "teacher" => Ok(Role::Teacher),
            "teachingassistant" | "ta" => Ok(Role::TeachingAssistant),
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
        assert_eq!(
            Role::from_str("organizationadmin"),
            Ok(Role::OrganizationAdmin)
        );
        assert_eq!(Role::from_str("campusadmin"), Ok(Role::CampusAdmin));
        assert_eq!(Role::from_str("teacher"), Ok(Role::Teacher));
        assert_eq!(
            Role::from_str("teachingassistant"),
            Ok(Role::TeachingAssistant)
        );
        assert_eq!(Role::from_str("ta"), Ok(Role::TeachingAssistant));
        assert_eq!(Role::from_str("student"), Ok(Role::Student));
        assert!(Role::from_str("unknown").is_err());
    }

    #[test]
    fn test_role_as_str() {
        assert_eq!(Role::Root.as_str(), "root");
        assert_eq!(Role::OrganizationAdmin.as_str(), "organizationadmin");
        assert_eq!(Role::CampusAdmin.as_str(), "campusadmin");
        assert_eq!(Role::Teacher.as_str(), "teacher");
        assert_eq!(Role::TeachingAssistant.as_str(), "teachingassistant");
        assert_eq!(Role::Student.as_str(), "student");
    }

    #[test]
    fn test_role_hierarchy() {
        assert!(Role::Root.is_higher_or_equal(Role::Student));
        assert!(Role::Root.is_higher_or_equal(Role::Teacher));
        assert!(Role::Teacher.is_higher_or_equal(Role::Student));
        assert!(Role::CampusAdmin.is_higher_or_equal(Role::Teacher));
        assert!(!Role::Student.is_higher_or_equal(Role::Teacher));
        assert!(!Role::Teacher.is_higher_or_equal(Role::Root));
    }

    #[test]
    fn test_role_roundtrip() {
        let roles = [
            Role::Root,
            Role::OrganizationAdmin,
            Role::CampusAdmin,
            Role::Teacher,
            Role::TeachingAssistant,
            Role::Student,
        ];
        for role in roles {
            let s = role.as_str();
            let parsed = Role::from_str(s).ok();
            assert_eq!(Some(role), parsed);
        }
    }

    #[test]
    fn test_role_serialization() {
        let role = Role::OrganizationAdmin;
        let serialized = serde_json::to_string(&role).unwrap();
        assert_eq!(serialized, "\"organizationAdmin\"");

        let deserialized: Role = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized, role);
    }
}
