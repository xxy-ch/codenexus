# Phase 13: Tenant Hierarchy Restructure - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the OrganizationAdmin role with GradeAdmin, enforce scoped permissions for each role level, and update all backend RBAC + frontend role-based UI to match the new 6-level hierarchy: Root > CampusAdmin > GradeAdmin > Teacher > TeachingAssistant > Student.

</domain>

<decisions>
## Implementation Decisions

### Role Model
- **D-01:** Role enum already has 6 roles in `shared/src/models/role.rs`: Root, OrganizationAdmin, CampusAdmin, Teacher, TeachingAssistant, Student. The change is: replace `OrganizationAdmin` with `GradeAdmin` and reorder the hierarchy.
- **D-02:** DB CHECK constraint in migration 025 includes `'organizationadmin'`. Must add a new migration to replace it with `'gradeadmin'`.
- **D-03:** Frontend `types/auth.ts` defines `ADMIN_ROLES = ['root', 'organizationAdmin', 'campusAdmin']` and `TEACHER_ROLES = ['root', 'organizationAdmin', 'campusAdmin', 'teacher']`. These must be updated to use `gradeAdmin`.

### Scope Model (from Phase 11)
- **D-04:** Phase 11 locked scope hierarchy as `global > campus > grade > class > default` (D-02 in Phase 11 CONTEXT.md). Phase 13 roles align to this scope model.
- **D-05:** Phase 11 locked permission boundary: `root` → global+campus, `orgadmin` → campus+grade. With GradeAdmin replacing OrganizationAdmin, this becomes: `root` → global+campus, `campusAdmin` → campus, `gradeAdmin` → grade.
- **D-06:** Resolution precedence is `class > grade > campus > global > default` (D-03 in Phase 11 CONTEXT.md).

### Migration Strategy
- **D-07:** Existing users with `organizationadmin` role must be migrated to either `campusadmin` or `gradeadmin` depending on their actual scope. Default migration: `organizationadmin` → `campusadmin` (preserve maximum permissions, administrators can downgrade if needed).

### Claude's Discretion
- Exact permission sets per role (what APIs each role can call)
- Frontend page layout for gradeadmin dashboard
- Testing approach for RBAC changes

</decisions>

<canonical_refs>
## Canonical References

### Role & RBAC
- `backend/shared/src/models/role.rs` — Current Role enum with 6 roles and hierarchy
- `backend/shared/src/models/permission.rs` — Current Permission enum
- `backend/api-infra/src/middleware/authz.rs` — Authorization middleware with role checks
- `backend/api-infra/src/rbac/mod.rs` — RBAC service with require_min_role, require_permission
- `backend/api/migrations/025_fix_user_roles_check.sql` — Latest DB CHECK constraint for roles
- `backend/api/migrations/004_create_user_roles.sql` — Original user_roles table schema

### Frontend Role Handling
- `frontend/src/types/auth.ts` — Role type, ADMIN_ROLES, TEACHER_ROLES arrays
- `frontend/src/hooks/useAuth.ts` — Auth hook with role checks
- `frontend/src/components/layout/ProtectedRoute.tsx` — Role-based route guards
- `frontend/src/components/layout/AdminLayout.tsx` — Admin layout with role checks
- `frontend/src/pages/admin/UserManagement.tsx` — User management with role badge display

### Phase 11 Context (Locked Scope Decisions)
- `.planning/phases/11-feature-gateway-infrastructure/11-CONTEXT.md` — D-02 through D-06 locked scope hierarchy decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `shared/src/models/role.rs` — Role enum with `is_higher_or_equal()` and `FromStr` already supports 6-role hierarchy
- `api-infra/src/rbac/` — Permission checking infrastructure (`require_min_role`, `require_permission`, `require_any_permission`)
- `api-infra/src/middleware/tenant.rs` — Tenant context extraction from JWT claims
- `api-infra/src/middleware/authz.rs` — Authorization middleware layer

### Established Patterns
- Role checks are done via `require_min_role(Role::X)` in route handlers
- JWT claims include `role`, `school_id`, `campus_id` fields
- Frontend uses role arrays (ADMIN_ROLES, TEACHER_ROLES) for conditional rendering
- Permission-based checks supplement role-based checks for fine-grained access

### Integration Points
- `backend/api/src/main.rs` — Router assembly with auth/tenant middleware
- `backend/domain-users/` — User service handles role assignment
- `frontend/src/components/layout/Sidebar.tsx` — Navigation items filtered by role
- Migration tool `backend/migration-tool/` — Must support new role strings

</code_context>

<specifics>
## Specific Ideas

- GradeAdmin is a new administrative layer between CampusAdmin and Teacher
- GradeAdmin manages classes and students within specific grade(s)
- GradeAdmin can create/edit assignments and view grade-level analytics
- GradeAdmin CANNOT manage teachers or campus-level settings
- TeachingAssistant can grade/review but NOT create assignments
- The hierarchy maps to real school organizational structure

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 13-tenant-hierarchy-restructure*
*Context gathered: 2026-04-19*
