# Phase 13: Tenant Hierarchy Restructure — Research

**Gathered:** 2026-04-19
**Status:** Complete

## Summary

Replace `OrganizationAdmin` with `GradeAdmin` across the entire codebase. The change affects 20+ source files spanning backend Rust (shared crate, api-infra, 7 domain crates, api crate) and frontend TypeScript.

## New Hierarchy

```
Root > CampusAdmin > GradeAdmin > Teacher > TeachingAssistant > Student
```

Previous: `Root > OrganizationAdmin > CampusAdmin > Teacher > TeachingAssistant > Student`

Key structural change: GradeAdmin sits **below** CampusAdmin (manages grades/classes within a campus), whereas OrganizationAdmin sat **above** CampusAdmin (managed entire organizations).

## Blast Radius

### Foundation Layer (Wave 1 — blocks everything)

| File | What Changes |
|------|-------------|
| `shared/src/models/role.rs` | Enum variant `OrganizationAdmin` → `GradeAdmin`; reorder hierarchy array to `Student < TeachingAssistant < Teacher < GradeAdmin < CampusAdmin < Root`; update `as_str()`, `FromStr`, all tests |
| `api-infra/src/rbac.rs` | `Role::OrganizationAdmin` match arm → `Role::GradeAdmin`; update permission set (GradeAdmin gets grade-scope perms, NOT ManageOrganization) |
| NEW `api/migrations/026_*.sql` | `UPDATE user_roles SET role='gradeadmin' WHERE role='organizationadmin'`; update CHECK constraint to replace 'organizationadmin' with 'gradeadmin' |

### Backend Domain Routes (Wave 2 — parallel, all depend on Wave 1)

| File | Line(s) | Current | Change To |
|------|---------|---------|-----------|
| `domain-community/src/blog/routes.rs` | 261 | `Role::Root \| Role::OrganizationAdmin \| Role::CampusAdmin` | `Role::Root \| Role::CampusAdmin \| Role::GradeAdmin` |
| `domain-community/src/discussions/routes.rs` | 124 | `Role::Root \| Role::OrganizationAdmin \| Role::CampusAdmin` | `Role::Root \| Role::CampusAdmin \| Role::GradeAdmin` |
| `domain-contests/src/routes.rs` | 22 | `is_higher_or_equal(Role::OrganizationAdmin)` | `is_higher_or_equal(Role::CampusAdmin)` — GradeAdmin is BELOW CampusAdmin now |
| `domain-leaderboard/src/routes.rs` | 17 | `is_higher_or_equal(Role::OrganizationAdmin)` | `is_higher_or_equal(Role::CampusAdmin)` |
| `domain-classes/src/routes.rs` | 25 | `is_higher_or_equal(Role::OrganizationAdmin)` | `is_higher_or_equal(Role::GradeAdmin)` — GradeAdmin manages classes |
| `domain-problems/src/routes.rs` | 28 | `Role::Root \| Role::OrganizationAdmin \| Role::CampusAdmin` | `Role::Root \| Role::CampusAdmin \| Role::GradeAdmin` |
| `domain-problems/src/access.rs` | 62 | `Role::OrganizationAdmin \| Role::CampusAdmin => true` | `Role::CampusAdmin \| Role::GradeAdmin => true` |
| `domain-users/src/routes.rs` | 106 | `matches!(role, "root" \| "organizationadmin" \| "campusadmin")` | `matches!(role, "root" \| "campusadmin" \| "gradeadmin")` |
| `api/src/judge_monitor/routes.rs` | 25 | `matches!(role, "root" \| "organizationadmin" \| "campusadmin")` | `matches!(role, "root" \| "campusadmin" \| "gradeadmin")` |

### Import/Export + Tests (Wave 2 — parallel)

| File | Line(s) | What Changes |
|------|---------|-------------|
| `domain-imex/src/routes.rs` | 87 | `Role::Root \| Role::OrganizationAdmin \| Role::CampusAdmin` → `Role::Root \| Role::CampusAdmin \| Role::GradeAdmin` |
| `domain-imex/src/routes.rs` | 924,948 | SQL `WHEN 'organizationadmin'` → `WHEN 'gradeadmin'` |
| `domain-imex/src/user_import.rs` | 15 | `ROOT_ONLY_ROLES` array: `"organizationadmin"` → `"gradeadmin"` |
| `domain-imex/src/user_import.rs` | 420-445 | Tests: `"organizationAdmin"` → `"gradeAdmin"`, `"organizationadmin"` → `"gradeadmin"` |
| `api/tests/handlers/users_test.rs` | 164,167 | Test seeding: `"organizationadmin"` → `"gradeadmin"` |
| `domain-problems/src/access.rs` | 198-252 | Tests: `Role::OrganizationAdmin` → `Role::GradeAdmin`, `"organizationadmin"` → `"gradeadmin"` |

### Frontend (Wave 2 — parallel)

| File | Line(s) | What Changes |
|------|---------|-------------|
| `frontend/src/types/auth.ts` | 4 | `'organizationAdmin'` → `'gradeAdmin'` in Role type |
| `frontend/src/types/auth.ts` | 11 | `ADMIN_ROLES`: `'organizationAdmin'` → `'gradeAdmin'` |
| `frontend/src/types/auth.ts` | 14 | `TEACHER_ROLES`: `'organizationAdmin'` → `'gradeAdmin'` |
| `frontend/src/types/auth.ts` | 28 | `roleLabel`: `'organizationAdmin'` → `'gradeAdmin'`, label `'机构管理员'` → `'年级管理员'` |
| `frontend/src/pages/admin/UserManagement.tsx` | 97 | `organizationAdmin` badge → `gradeAdmin`, label `'机构管理员'` → `'年级管理员'` |

### Semantic Changes (not just rename)

| Concern | Before (OrganizationAdmin) | After (GradeAdmin) |
|---------|---------------------------|-------------------|
| Hierarchy position | Above CampusAdmin | Below CampusAdmin |
| Scope | Organization-wide | Grade-level within campus |
| Permission boundary | ManageOrganization + all campus perms | ManageClasses + ManageAssignments + ViewClassStats (NO ManageOrganization, NO ManageCampus) |
| Admin check meaning | Org-wide admin | Grade-level admin |

### Files NOT Changed (verified clean)

- `backend/migration-tool/` — No OrganizationAdmin references
- `frontend/src/components/auth/AdminRoute.tsx` — Uses `isAdmin()` (derived from ADMIN_ROLES, auto-updates)
- `frontend/src/components/layout/Sidebar.tsx` — Uses `isAdmin()`/`isTeacherOrAbove()` (auto-updates)
- `frontend/src/pages/admin/BatchOperations.tsx` — Uses `isAdmin()` (auto-updates)
- `frontend/src/App.tsx` — Uses `TEACHER_ROLES` (auto-updates)

### Documentation (Wave 3)

| File | Update |
|------|--------|
| `ARCHITECTURE.md` | Role hierarchy section, role table |
| `API.md` | Role descriptions |
| `DEVELOPMENT.md` | Role hierarchy section |

## Wave Structure

```
Wave 1 (sequential — foundation)
  Plan 01: Core enum + RBAC + migration
    ↓
Wave 2 (all parallel — no file overlap)
  Plan 02: Backend domain routes + access control
  Plan 03: Import/Export + backend tests
  Plan 04: Frontend role changes
    ↓
Wave 3 (sequential — verification)
  Plan 05: Build verification + documentation
```

## Risk Assessment

- **HIGH**: Hierarchy reordering changes semantics. Code using `is_higher_or_equal(Role::OrganizationAdmin)` must be individually evaluated — some should become `CampusAdmin` (elevated), some should become `GradeAdmin` (same level, new name).
- **MEDIUM**: Data migration in production. Default `organizationadmin → gradeadmin` preserves access but GradeAdmin has fewer permissions than the old OrganizationAdmin had.
- **LOW**: Frontend is purely string replacement with one semantic change (label text).
