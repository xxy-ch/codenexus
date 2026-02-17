use serde::{Deserialize, Serialize};

/// Granular permissions for RBAC authorization
///
/// Permissions represent specific actions that can be performed in the system.
/// They are assigned to roles through a role-permission matrix in the RBAC service.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Permission {
    /// Manage users (create, update, delete users, assign roles)
    ManageUsers,
    /// Manage problems (create, update, delete problems, manage test cases)
    ManageProblems,
    /// Submit solutions to problems
    SubmitSolution,
    /// View leaderboard and rankings
    ViewLeaderboard,
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

        assert_eq!(set.len(), 4);
        assert!(set.contains(&Permission::ManageUsers));
        assert!(set.contains(&Permission::ViewLeaderboard));
    }
}
