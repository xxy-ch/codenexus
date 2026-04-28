# Phase 14: Grade-Scoped Data Model - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the data model and access control infrastructure for grade-scoped administration. Create `grades` entity, add `grade_id` to users and user_roles, propagate via JWT claims, enforce grade-scoped query filtering for GradeAdmin. This phase makes `grade` a first-class concept in the data model and access control layer, enabling GradeAdmin to actually scope authority to a specific grade rather than managing all grades in a campus.

</domain>

<decisions>
## Implementation Decisions

### Grade Entity Model
- **D-01:** Create `grades` table with columns: `id`, `campus_id` (FK to campuses), `name` (TEXT, e.g. '高一', 'IGCSE Year 1'), `year_level` (INT, e.g. 1/2/3 for sorting and comparison), `academic_year` (TEXT, e.g. '2025-2026'), `is_active` (BOOL, default true), `created_at`, `updated_at`. Grades are campus-scoped — different campuses can have different grade structures.
  - **Why:** Schools need flexible naming (普通部 vs 国际部 have different grade systems), year-level for sorting, and academic_year for lifecycle tracking. `is_active` enables graduating a grade without deleting data.
  - **How to apply:** Migration creates the table. UI shows only active grades by default. Graduated grades remain for historical queries.

- **D-02:** Grade lifecycle follows academic year transitions:
  - Graduating students: batch update `users.grade_id` to null + set `is_active = false` on the grade. Optionally suspend accounts.
  - New incoming grade: create new `grades` row with next academic_year, create new classes under it.
  - Re-shuffling: update `class_enrollments` within the same grade; `users.grade_id` stays the same.
  - **Why:** The user explicitly requires graduation account deactivation, new grade creation, and class re-shuffling support.
  - **How to apply:** Provide admin batch operations for year-end transitions. Not an automated cron — admin triggers explicitly.

### User-Grade Relationship
- **D-03:** Add `users.grade_id` (nullable FK to grades). Semantics:
  - Students: REQUIRED — the student's current grade.
  - Teachers: REQUIRED — the teacher's primary grade affiliation (they can teach classes in other grades).
  - GradeAdmin: REQUIRED — matches their management scope (same value as `user_roles.grade_id`).
  - CampusAdmin/Root: NULL — they don't belong to a specific grade.
  - **Why:** User grade identity is needed for filtering, statistics, and profiles. Teachers have a primary grade but can cross-grade via class assignment.
  - **How to apply:** Migration adds nullable FK. User creation/registration requires grade selection for students and teachers.

- **D-04:** Teacher cross-grade teaching is handled at the class level, not via additional grade associations. A teacher with `grade_id = 2` (高二) can be assigned to teach a class in grade 3 (高三) via `class_enrollments` or a teacher-class relationship. No `teacher_grades` junction table needed.
  - **Why:** Class already links to grade. Adding a separate junction table would create redundant hierarchy. The class is the correct scope for teaching assignments.
  - **How to apply:** When querying "which grades does this teacher teach in?", derive from their class assignments, not from a direct teacher-grade link.

### Role-Grade Scoping
- **D-05:** Add `user_roles.grade_id` (nullable FK to grades). This is the authorization scope — it defines WHICH grade a role applies to.
  - GradeAdmin: REQUIRED — the specific grade this GradeAdmin manages. One GradeAdmin per grade (1:1 cardinality confirmed).
  - All other roles: NULL — their scope is defined by other dimensions (organization_id for root, campus_id for campusadmin, class-level for teachers).
  - **Why:** Separating identity (`users.grade_id`) from authorization (`user_roles.grade_id`) allows a GradeAdmin to manage grade X while their own profile belongs to any grade. In practice these are usually the same, but the model is clean.
  - **How to apply:** UNIQUE constraint on `(user_id, organization_id, campus_id, grade_id)` replaces the current `(user_id, organization_id, campus_id)`. GradeAdmin without grade_id is invalid.

- **D-06:** GradeAdmin is 1:1 with grades within a campus. A campus cannot have two GradeAdmins for the same grade. A GradeAdmin cannot manage two grades (use two user_roles rows or promote to CampusAdmin).
  - **Why:** User confirmed one-to-one. Simplifies JWT (single grade_id) and avoids complex multi-grade scoping.
  - **How to apply:** DB constraint: UNIQUE(campus_id, grade_id) WHERE role = 'gradeadmin' AND grade_id IS NOT NULL.

### JWT and Middleware
- **D-07:** Add `grade_id: Option<i64>` to JWT Claims struct. Populated at login from `user_roles.grade_id`. Tenant middleware extracts it alongside `school_id` and `campus_id`.
  - **Why:** Middleware needs grade context to enforce grade-scoped filtering without extra DB queries on every request.
  - **How to apply:** Update `Claims` in `shared/src/models/auth.rs`, update JWT token generation in auth service, update tenant middleware to inject `TenantContext { tenant_id, campus_id, grade_id }`.

- **D-08:** Grade-scoped query filtering applies only to GradeAdmin. When `claims.grade_id.is_some()` and `claims.role == "gradeadmin"`, all domain queries must add `WHERE grade_id = $N` (or equivalent based on the domain's data model). CampusAdmin and Root bypass grade filtering.
  - **Why:** GradeAdmin's authority is scoped to one grade. Without filtering, they see all grades in their campus — same as CampusAdmin minus a few permissions.
  - **How to apply:** Extend `TenantContext` to include `grade_id`. Domain services check `tenant_ctx.grade_id` and add grade filter when present.

### Migration Strategy
- **D-09:** Populate `grades` from existing class/grade data:
  1. For each campus, extract distinct grade names from existing class names or a configured list.
  2. Create `grades` rows with current academic_year.
  3. For students: set `users.grade_id` from their class enrollment's grade.
  4. For teachers: set `users.grade_id` from their primary class (most students taught, or first class found).
  5. For existing gradeadmins: set `user_roles.grade_id` based on campus scope (default to first grade if ambiguous).
  - **Why:** Can't leave grade_id null for existing students/teachers after adding the column.
  - **How to apply:** Migration script with heuristic inference. May need manual review for edge cases.

### Frontend
- **D-10:** Admin user management UI must support grade selection when creating/editing users. The grade dropdown is filtered by the admin's campus scope. GradeAdmin sees only their assigned grade.
  - **Why:** Grade assignment is now part of user onboarding, not just class enrollment.
  - **How to apply:** Add grade_id select to UserManagement form, filtered by campus_id.

### Claude's Discretion
- Exact SQL migration number and syntax
- Index strategy for grade_id columns
- Cache invalidation for grade-scoped queries
- UI component decomposition for grade management

</decisions>

<canonical_refs>
## Canonical References

### Data Model
- `backend/api/migrations/003_create_users.sql` — Current users table (no grade_id)
- `backend/api/migrations/004_create_user_roles.sql` — Current user_roles table (no grade_id)
- `backend/api/migrations/009_create_classes.sql` — Classes table (may have grade-like fields)
- `backend/api/migrations/002_create_campuses.sql` — Campuses table (grades are campus-scoped)

### Auth & Middleware
- `backend/shared/src/models/auth.rs` — Claims struct (needs grade_id field)
- `backend/api-infra/src/middleware/tenant.rs` — Tenant middleware (needs grade_id extraction)
- `backend/domain-users/src/` — Auth service (JWT token generation needs grade_id)

### Domain Services (need grade filtering)
- `backend/domain-classes/src/` — Classes domain (grade_id is natural parent of class)
- `backend/domain-problems/src/` — Problems domain (grade-scoped visibility)
- `backend/domain-submissions/src/` — Submissions domain (grade-scoped data)
- `backend/domain-contests/src/` — Contests domain (grade-scoped access)
- `backend/domain-users/src/` — User management (grade assignment)

### Frontend
- `frontend/src/types/auth.ts` — User type (needs grade_id)
- `frontend/src/pages/admin/UserManagement.tsx` — User admin (needs grade dropdown)

### Phase 11 Context (locked scope decisions)
- `.planning/phases/11-feature-gateway-infrastructure/11-CONTEXT.md` — D-02: scope hierarchy includes `grade`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TenantContext` in `api-infra/src/middleware/tenant.rs` already extracts `tenant_id` from claims — extending to include `grade_id` is a natural extension
- `Claims` struct in `shared/src/models/auth.rs` already has `campus_id: Option<i64>` — `grade_id: Option<i64>` follows the same pattern
- `campuses` table pattern (campus within org) is directly analogous to what we need for `grades` (grade within campus)
- `class_enrollments` table links students to classes — can be used to infer grade during migration

### Established Patterns
- Tenant filtering: `WHERE organization_id = $1` is the standard pattern. Grade filtering adds `AND grade_id = $2` for GradeAdmin.
- JWT claims propagation: login service queries user_roles, injects into claims. Adding grade_id follows the same flow.
- Frontend dropdown filtering: campus dropdown already filters by organization. Grade dropdown filters by campus.

### Integration Points
- All domain route handlers that currently filter by organization_id/campus_id need to also check grade_id
- Login flow in domain-users needs to query grade_id from user_roles and inject into JWT
- User creation/registration needs grade_id parameter
- Import/export CSV needs grade_id column

</code_context>

<specifics>
## Specific Ideas

- `grades` table is the campus-level equivalent of what `campuses` is at the org level — a hierarchical subdivision
- Academic year transition is an admin batch operation, not automated — admin explicitly triggers "promote grade 1 → grade 2, graduate grade 3"
- GradeAdmin without grade_id in user_roles is an error state — validation must enforce this
- The `UNIQUE(user_id, organization_id, campus_id)` constraint in user_roles needs updating to include `grade_id`

</specifics>

<deferred>
## Deferred Ideas

- Automated cron for academic year transitions (manual batch operations for v1.0)
- Teacher-grade junction table for precise multi-grade teaching scope (class-level handles this)
- Grade-level analytics dashboards (UI enhancement, not data model)
- Grade-level feature flag scoping (Phase 11 handles this via scope hierarchy)

</deferred>

---

*Phase: 14-grade-scoped-data-model*
*Context gathered: 2026-04-19*
