use serde::{Deserialize, Serialize};

/// Granular permissions for RBAC authorization
///
/// Permissions represent specific actions that can be performed in the system.
/// They are assigned to roles through a role-permission matrix in the RBAC service.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Permission {
    // ========== User Management ==========
    /// Manage users (create, update, delete users, assign roles)
    ManageUsers,
    /// View user profiles and information
    ViewUsers,

    // ========== Problem Management ==========
    /// Manage problems (create, update, delete problems, manage test cases)
    ManageProblems,
    /// View problems (including private ones)
    ViewAllProblems,
    /// Submit solutions to problems
    SubmitSolution,

    // ========== Contest Management ==========
    /// Manage contests (create, update, delete contests)
    ManageContests,
    /// Register for contests
    RegisterContests,
    /// View contest problems before contest starts
    ViewContestProblems,

    // ========== Class Management ==========
    /// Manage classes (create, update, delete classes)
    ManageClasses,
    /// Manage assignments (create, update, delete assignments)
    ManageAssignments,
    /// Grade student submissions
    GradeSubmissions,
    /// View class statistics and progress
    ViewClassStats,

    // ========== Organization Management ==========
    /// Manage organization settings
    ManageOrganization,
    /// Manage campus settings
    ManageCampus,

    // ========== Leaderboard & Statistics ==========
    /// View leaderboard and rankings
    ViewLeaderboard,
    /// View system-wide statistics
    ViewStatistics,

    // ========== Content Moderation ==========
    /// Moderate discussions and comments
    ModerateContent,
    /// Manage tags and categories
    ManageTags,

    // ========== System Administration ==========
    /// Manage system configuration
    ManageSystem,
    /// View system logs and audits
    ViewLogs,
    /// Manage API keys and tokens
    ManageApiKeys,
}

/// Permission categories for grouping
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PermissionCategory {
    User,
    Problem,
    Contest,
    Class,
    Organization,
    System,
}

impl Permission {
    /// Get the category this permission belongs to
    pub fn category(&self) -> PermissionCategory {
        match self {
            Permission::ManageUsers | Permission::ViewUsers => PermissionCategory::User,
            Permission::ManageProblems | Permission::ViewAllProblems | Permission::SubmitSolution => {
                PermissionCategory::Problem
            }
            Permission::ManageContests | Permission::RegisterContests | Permission::ViewContestProblems => {
                PermissionCategory::Contest
            }
            Permission::ManageClasses | Permission::ManageAssignments | Permission::GradeSubmissions | Permission::ViewClassStats => {
                PermissionCategory::Class
            }
            Permission::ManageOrganization | Permission::ManageCampus => PermissionCategory::Organization,
            Permission::ViewLeaderboard | Permission::ViewStatistics | Permission::ModerateContent | Permission::ManageTags => {
                PermissionCategory::System
            }
            Permission::ManageSystem | Permission::ViewLogs | Permission::ManageApiKeys => {
                PermissionCategory::System
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_serialization() {
        let permissions = [
            Permission::ManageUsers,
            Permission::ManageProblems,
            Permission::SubmitSolution,
            Permission::ViewLeaderboard,
            Permission::ManageClasses,
            Permission::GradeSubmissions,
        ];

        for permission in permissions {
            let serialized = serde_json::to_string(&permission).unwrap();
            let deserialized: Permission = serde_json::from_str(&serialized).unwrap();
            assert_eq!(permission, deserialized);
        }
    }

    #[test]
    fn test_permission_hash() {
        use std::collections::HashSet;

        let mut set = HashSet::new();
        set.insert(Permission::ManageUsers);
        set.insert(Permission::ManageProblems);
        set.insert(Permission::SubmitSolution);
        set.insert(Permission::ViewLeaderboard);
        set.insert(Permission::ManageClasses);
        set.insert(Permission::GradeSubmissions);

        assert_eq!(set.len(), 6);
        assert!(set.contains(&Permission::ManageUsers));
        assert!(set.contains(&Permission::ViewLeaderboard));
        assert!(set.contains(&Permission::GradeSubmissions));
    }

    #[test]
    fn test_permission_categories() {
        assert_eq!(Permission::ManageUsers.category(), PermissionCategory::User);
        assert_eq!(Permission::SubmitSolution.category(), PermissionCategory::Problem);
        assert_eq!(Permission::ManageContests.category(), PermissionCategory::Contest);
        assert_eq!(Permission::ManageClasses.category(), PermissionCategory::Class);
        assert_eq!(Permission::ManageOrganization.category(), PermissionCategory::Organization);
        assert_eq!(Permission::ManageSystem.category(), PermissionCategory::System);
    }
}
