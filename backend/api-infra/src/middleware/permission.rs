//! Re-export permission middleware from authz.
//! Both `permission::require_permission` and `authz::require_permission` now
//! point to the same implementation.
pub use super::authz::{
    require_all_permissions, require_any_permission, require_min_role, require_permission,
};
