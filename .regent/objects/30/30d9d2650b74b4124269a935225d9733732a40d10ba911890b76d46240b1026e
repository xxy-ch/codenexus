use shared::models::{permission::Permission, role::Role};
use std::collections::HashSet;

/// RBAC service for checking permissions based on user roles
///
/// This service uses an in-memory role-permission matrix to determine
/// which permissions are granted to each role. The matrix is defined
/// here but will be loaded from the database in future tasks.
pub struct RbacService;

impl RbacService {
    /// Get all permissions granted to a specific role
    ///
    /// # Arguments
    /// * `role` - The role to query permissions for
    ///
    /// # Returns
    /// A HashSet containing all permissions for role
    fn get_role_permissions(role: Role) -> HashSet<Permission> {
        match role {
            Role::Root => {
                // Root has all permissions
                let mut perms = HashSet::new();
                // User Management
                perms.insert(Permission::ManageUsers);
                perms.insert(Permission::ViewUsers);
                // Problem Management
                perms.insert(Permission::ManageProblems);
                perms.insert(Permission::ViewAllProblems);
                perms.insert(Permission::SubmitSolution);
                // Contest Management
                perms.insert(Permission::ManageContests);
                perms.insert(Permission::RegisterContests);
                perms.insert(Permission::ViewContestProblems);
                // Class Management
                perms.insert(Permission::ManageClasses);
                perms.insert(Permission::ManageAssignments);
                perms.insert(Permission::GradeSubmissions);
                perms.insert(Permission::ViewClassStats);
                // Organization Management
                perms.insert(Permission::ManageOrganization);
                perms.insert(Permission::ManageCampus);
                // Leaderboard & Statistics
                perms.insert(Permission::ViewLeaderboard);
                perms.insert(Permission::ViewStatistics);
                // Content Moderation
                perms.insert(Permission::ModerateContent);
                perms.insert(Permission::ManageTags);
                // System Administration
                perms.insert(Permission::ManageSystem);
                perms.insert(Permission::ViewLogs);
                perms.insert(Permission::ManageApiKeys);
                perms
            }
            Role::GradeAdmin => {
                let mut perms = HashSet::new();
                perms.insert(Permission::ManageUsers);
                perms.insert(Permission::ViewUsers);
                perms.insert(Permission::ManageProblems);
                perms.insert(Permission::ViewAllProblems);
                perms.insert(Permission::ManageContests);
                perms.insert(Permission::ManageClasses);
                perms.insert(Permission::ManageAssignments);
                perms.insert(Permission::GradeSubmissions);
                perms.insert(Permission::ViewClassStats);
                perms.insert(Permission::ViewLeaderboard);
                perms.insert(Permission::ViewStatistics);
                perms.insert(Permission::ManageTags);
                perms
            }
            Role::CampusAdmin => {
                let mut perms = HashSet::new();
                perms.insert(Permission::ManageUsers);
                perms.insert(Permission::ViewUsers);
                perms.insert(Permission::ManageProblems);
                perms.insert(Permission::ViewAllProblems);
                perms.insert(Permission::ManageContests);
                perms.insert(Permission::ManageClasses);
                perms.insert(Permission::ManageAssignments);
                perms.insert(Permission::ManageCampus);
                perms.insert(Permission::ViewLeaderboard);
                perms.insert(Permission::ViewStatistics);
                perms
            }
            Role::Teacher => {
                let mut perms = HashSet::new();
                perms.insert(Permission::ManageProblems);
                perms.insert(Permission::ViewAllProblems);
                perms.insert(Permission::SubmitSolution);
                perms.insert(Permission::ManageContests);
                perms.insert(Permission::RegisterContests);
                perms.insert(Permission::ManageClasses);
                perms.insert(Permission::ManageAssignments);
                perms.insert(Permission::GradeSubmissions);
                perms.insert(Permission::ViewClassStats);
                perms.insert(Permission::ViewLeaderboard);
                perms.insert(Permission::ViewStatistics);
                perms
            }
            Role::TeachingAssistant => {
                let mut perms = HashSet::new();
                perms.insert(Permission::ViewAllProblems);
                perms.insert(Permission::SubmitSolution);
                perms.insert(Permission::RegisterContests);
                perms.insert(Permission::GradeSubmissions);
                perms.insert(Permission::ViewClassStats);
                perms.insert(Permission::ViewLeaderboard);
                perms
            }
            Role::Student => {
                let mut perms = HashSet::new();
                perms.insert(Permission::SubmitSolution);
                perms.insert(Permission::RegisterContests);
                perms.insert(Permission::ViewLeaderboard);
                perms
            }
        }
    }

    /// Check if a role has a specific permission
    ///
    /// # Arguments
    /// * `role` - The role to check
    /// * `permission` - The permission to verify
    ///
    /// # Returns
    /// `true` if the role has the permission, `false` otherwise
    pub fn role_has_permission(role: Role, permission: Permission) -> bool {
        Self::get_role_permissions(role).contains(&permission)
    }

    /// Check if a role has all specified permissions
    ///
    /// # Arguments
    /// * `role` - The role to check
    /// * `permissions` - Iterator of permissions to verify
    ///
    /// # Returns
    /// `true` if the role has all permissions, `false` otherwise
    pub fn role_has_all_permissions<'a>(
        role: Role,
        permissions: impl IntoIterator<Item = &'a Permission>,
    ) -> bool {
        let role_perms = Self::get_role_permissions(role);
        permissions.into_iter().all(|p| role_perms.contains(p))
    }

    /// Check if a role has any of the specified permissions
    ///
    /// # Arguments
    /// * `role` - The role to check
    /// * `permissions` - Iterator of permissions to verify
    ///
    /// # Returns
    /// `true` if the role has at least one of the permissions, `false` otherwise
    pub fn role_has_any_permission<'a>(
        role: Role,
        permissions: impl IntoIterator<Item = &'a Permission>,
    ) -> bool {
        let role_perms = Self::get_role_permissions(role);
        permissions.into_iter().any(|p| role_perms.contains(p))
    }

    /// Get all permissions for a role as a vector
    ///
    /// # Arguments
    /// * `role` - The role to query permissions for
    ///
    /// # Returns
    /// A vector of all permissions for the role
    pub fn get_permissions(role: Role) -> Vec<Permission> {
        Self::get_role_permissions(role).into_iter().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_root_has_all_permissions() {
        assert!(RbacService::role_has_permission(
            Role::Root,
            Permission::ManageUsers
        ));
        assert!(RbacService::role_has_permission(
            Role::Root,
            Permission::ManageProblems
        ));
        assert!(RbacService::role_has_permission(
            Role::Root,
            Permission::SubmitSolution
        ));
        assert!(RbacService::role_has_permission(
            Role::Root,
            Permission::ViewLeaderboard
        ));
    }

    #[test]
    fn test_campus_admin_permissions() {
        assert!(RbacService::role_has_permission(
            Role::CampusAdmin,
            Permission::ManageUsers
        ));
        assert!(RbacService::role_has_permission(
            Role::CampusAdmin,
            Permission::ManageProblems
        ));
        assert!(RbacService::role_has_permission(
            Role::CampusAdmin,
            Permission::ViewLeaderboard
        ));
        assert!(!RbacService::role_has_permission(
            Role::CampusAdmin,
            Permission::SubmitSolution
        ));
    }

    #[test]
    fn test_teacher_permissions() {
        assert!(RbacService::role_has_permission(
            Role::Teacher,
            Permission::ManageProblems
        ));
        assert!(RbacService::role_has_permission(
            Role::Teacher,
            Permission::ViewLeaderboard
        ));
        assert!(RbacService::role_has_permission(
            Role::Teacher,
            Permission::SubmitSolution
        ));
        assert!(!RbacService::role_has_permission(
            Role::Teacher,
            Permission::ManageUsers
        ));
    }

    #[test]
    fn test_student_permissions() {
        assert!(RbacService::role_has_permission(
            Role::Student,
            Permission::SubmitSolution
        ));
        assert!(RbacService::role_has_permission(
            Role::Student,
            Permission::ViewLeaderboard
        ));
        assert!(!RbacService::role_has_permission(
            Role::Student,
            Permission::ManageUsers
        ));
        assert!(!RbacService::role_has_permission(
            Role::Student,
            Permission::ManageProblems
        ));
    }

    #[test]
    fn test_role_has_all_permissions() {
        let perms = vec![
            Permission::ManageUsers,
            Permission::ManageProblems,
            Permission::SubmitSolution,
        ];
        assert!(RbacService::role_has_all_permissions(Role::Root, &perms));
        assert!(!RbacService::role_has_all_permissions(
            Role::Student,
            &perms
        ));
    }

    #[test]
    fn test_role_has_any_permission() {
        let perms = vec![Permission::ManageUsers, Permission::SubmitSolution];
        assert!(RbacService::role_has_any_permission(Role::Root, &perms));
        assert!(RbacService::role_has_any_permission(Role::Student, &perms));
        // Teacher has SubmitSolution permission but not ManageUsers
        assert!(RbacService::role_has_any_permission(Role::Teacher, &perms));
    }

    #[test]
    fn test_get_permissions() {
        let root_perms = RbacService::get_permissions(Role::Root);
        // Root has all 21 permissions assigned in RBAC service
        assert_eq!(root_perms.len(), 21);

        let student_perms = RbacService::get_permissions(Role::Student);
        assert_eq!(student_perms.len(), 3); // SubmitSolution, RegisterContests, ViewLeaderboard
    }
}
