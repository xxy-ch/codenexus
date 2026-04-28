---
phase: 14-grade-scoped-data-model
plan: 04
subsystem: database, api
tags: [grades, data-migration, crud, academic-year-transition, sqlx, axum, migration-tool]

# Dependency graph
requires:
  - phase: 14-01
    provides: grades table, grade_id on users/user_roles/classes, Claims with grade_id
  - phase: 14-02
    provides: Login/refresh query grade_id from user_roles, JWT Claims.grade_id populated
  - phase: 14-03
    provides: GradeAdmin-scoped query filtering in domain-classes, domain-leaderboard, domain-search
provides:
  - Data migration SQL to populate grades from existing class name heuristics (D-09)
  - Backfill grade_id on classes, users (students+teachers), user_roles (gradeadmins)
  - Grade CRUD endpoints: create, list, get, update, deactivate (CampusAdmin+)
  - Academic year transition batch operations: graduate, promote, create-year (D-02)
  - migration-tool grade_id awareness in user_roles INSERT statements
affects: [14-05, 14-06]

# Tech tracking
tech-stack:
  added: []
patterns: [grade-crud-in-domain-classes, academic-year-batch-operations, sql-heuristic-grade-inference]

key-files:
  created: []
  modified:
    - backend/api/migrations/031_create_grades_and_add_grade_id.sql
    - backend/domain-classes/src/models.rs
    - backend/domain-classes/src/routes.rs
    - backend/domain-classes/src/service.rs
    - backend/migration-tool/src/migrator.rs

key-decisions:
  - "Grade CRUD added to domain-classes (not new crate) since grades are parent of classes"
  - "CampusAdmin required for all grade mutations; GradeAdmin sees only their own grade in list"
  - "Academic year transitions are admin-triggered batch operations, not automated cron (D-02)"
  - "Teacher grade backfill uses LEFT JOIN LATERAL for per-class enrollment count"

patterns-established:
  - "Grade route pattern: CampusAdmin+ guard, campus_id from claims, verify_grade_tenant for scope"
  - "Batch operation pattern: POST /grades/batch/{operation} with JSON body, returns count + affected entities"
  - "Grade name promotion: Chinese high school (高N), Grade N, Year N auto-increment"

requirements-completed: []

# Metrics
duration: 19min
completed: 2026-04-19
---

# Phase 14 Plan 04: Data Migration + migration-tool Summary

**Data migration SQL with Chinese/international grade name heuristics, grade CRUD endpoints with CampusAdmin RBAC, and academic year transition batch operations for graduate/promote/create-year workflows**

## Performance

- **Duration:** 19 min
- **Started:** 2026-04-19T14:34:59Z
- **Completed:** 2026-04-19T14:54:39Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments

- Data migration SQL (migration 031) extracts grade names from class names using Chinese (高N) and international (Grade N, Year N, IGCSE, AS, A2) heuristics, creates grade rows, and backfills grade_id on classes, users (students via enrollments, teachers via primary class), and user_roles (gradeadmins)
- Grade CRUD endpoints: POST/GET /grades, PUT /grades/:id, POST /grades/:id/deactivate with CampusAdmin+ RBAC and GradeAdmin list scoping
- Academic year transition batch operations: graduate (deactivate + optional student suspension), promote (move to next year_level), create-year (new grades for incoming year)
- migration-tool updated to include grade_id column (NULL) in user_roles INSERT statements for schema compatibility

## Task Commits

1. **Task 1: Data migration script** - `bee2aa7` (feat)
2. **Task 2: migration-tool grade_id** - `3a2876d` (feat)
3. **Tasks 3+4: Grade CRUD + academic year transitions** - `f4248f1` (feat)
4. **Fix: Migration SQL errors** - `a58fde7` (fix)

## Task Details

| Task | Description | Status |
|------|-------------|--------|
| 1 | Data migration script (populate grades + backfill) | Implemented |
| 2 | Update migration-tool for grade_id | Implemented |
| 3 | Grade CRUD endpoints | Implemented |
| 4 | Academic year transition utilities | Implemented |

## Files Created/Modified

- `backend/api/migrations/031_create_grades_and_add_grade_id.sql` - Added data migration sections 7a-7e: grade creation from class name heuristics, grade_id backfill for classes/users/user_roles
- `backend/domain-classes/src/models.rs` - Added Grade, CreateGradeRequest, UpdateGradeRequest, ListGradesQuery, GraduateGradeRequest, PromoteGradeRequest, CreateAcademicYearRequest structs
- `backend/domain-classes/src/routes.rs` - Added grade CRUD route handlers (create, list, get, update, deactivate) and batch operations (graduate, promote, create-year) with CampusAdmin+ RBAC; added require_campus_admin helper
- `backend/domain-classes/src/service.rs` - Added grade service functions: create_grade, get_grade, list_grades, update_grade, deactivate_grade, promote_grades, create_academic_year_grades, promote_grade_name helper
- `backend/migration-tool/src/migrator.rs` - Added explicit grade_id (NULL) column to both user_roles INSERT statements (normal users and system migration user)

## Decisions Made

- **Grade CRUD in domain-classes:** Grades are the parent entity of classes, so adding grade management to the existing domain-classes crate avoids creating a new crate for 7 small functions. Routes nest under /classes but use /grades prefix.
- **CampusAdmin-only mutations:** Grade creation, update, deactivation, and batch operations require CampusAdmin+ role. GradeAdmin can only list and see their own grade.
- **Promote grade name logic:** Chinese high school names auto-advance (高N -> 高N+1). "Grade N" and "Year N" patterns increment the number. Unknown patterns keep the same name (admin can manually update).
- **migration-tool grade_id as NULL:** UOJ has no grade concept, so migrated users get grade_id = NULL. The post-migration data SQL handles backfill.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed c.campus_id reference in migration 031 data SQL**
- **Found during:** Test execution (handler integration tests failed)
- **Issue:** Used `c.campus_id` where `c` was alias for `campuses` table which has `id` not `campus_id`. Should be `cl.campus_id` (from classes).
- **Fix:** Changed to `cl.campus_id` to reference the correct column
- **Files modified:** backend/api/migrations/031_create_grades_and_add_grade_id.sql
- **Verification:** Handler tests pass (6/6)
- **Committed in:** a58fde7

**2. [Rule 1 - Bug] Fixed DISTINCT ON with aggregate function in teacher backfill**
- **Found during:** Test execution (same migration failure)
- **Issue:** `DISTINCT ON (cl.teacher_id)` with `COUNT(ce.id)` in ORDER BY requires GROUP BY or restructuring
- **Fix:** Replaced with LEFT JOIN LATERAL subquery for per-class enrollment count, preserving DISTINCT ON pattern
- **Files modified:** backend/api/migrations/031_create_grades_and_add_grade_id.sql
- **Verification:** Handler tests pass (6/6)
- **Committed in:** a58fde7

**3. [Rule 1 - Bug] Fixed mut borrow on GradesListResponse and unused tenant_ctx warnings**
- **Found during:** Build verification (cargo build)
- **Issue:** `response.grades.retain()` requires `mut response`; several handlers had unused `Extension<TenantContext>` params
- **Fix:** Added `mut` to response binding; removed unused `Extension<TenantContext>` from handlers that get campus_id from claims directly
- **Files modified:** backend/domain-classes/src/routes.rs
- **Verification:** cargo build passes with zero errors, zero warnings
- **Committed in:** f4248f1

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All auto-fixes were compilation/logic errors discovered during verification. No scope creep.

## Issues Encountered

- Pre-existing domain-community test failures (column "title" of relation "discussions" does not exist) -- out of scope, unrelated to this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Data migration SQL ready for production deployment (will populate grades from class names)
- Grade CRUD endpoints available for frontend integration (Plan 14-05)
- Academic year transition batch operations available for admin workflows
- Plan 14-05 can add grade dropdown to frontend user management
- Plan 14-06 can verify the complete grade-scoped data model end-to-end

---
*Phase: 14-grade-scoped-data-model*
*Completed: 2026-04-19*

## Self-Check: PASSED

- All 5 modified files verified present
- All 4 commits verified in git log (bee2aa7, 3a2876d, f4248f1, a58fde7)
- cargo build: passed (zero errors, zero warnings)
- cargo test: 183 passed, 2 pre-existing failures (domain-community title column, out of scope), 14 ignored (require DB)
