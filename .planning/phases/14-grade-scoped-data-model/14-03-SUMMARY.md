---
phase: 14-grade-scoped-data-model
plan: 03
subsystem: rbac
tags: [grade-scoping, gradeadmin, tenant-context, sqlx, axum]

# Dependency graph
requires:
  - phase: 14-01
    provides: grades table, grade_id on users/user_roles/classes, Claims with grade_id, TenantContext with campus_id/grade_id
  - phase: 14-02
    provides: Login/refresh query grade_id from user_roles, JWT Claims.grade_id populated at login
provides:
  - GradeAdmin-scoped query filtering in domain-classes, domain-leaderboard, domain-search
  - grade_id on Class struct, CreateClassRequest, UpdateClassRequest, ListClassesQuery
  - D-08 pattern: only gradeadmin role triggers grade filtering; CampusAdmin/Root bypass
affects: [14-04, 14-05]

# Tech tracking
tech-stack:
  added: []
patterns: [gradeadmin-grade-filtering, extension-tenant-context-extraction]

key-files:
  created: []
  modified:
    - backend/domain-classes/src/service.rs
    - backend/domain-classes/src/routes.rs
    - backend/domain-classes/src/models.rs
    - backend/domain-leaderboard/src/service.rs
    - backend/domain-leaderboard/src/routes.rs
    - backend/domain-search/src/service.rs
    - backend/domain-search/src/routes.rs

key-decisions:
  - "D-08: Grade filtering only applies to gradeadmin role via TenantContext.grade_id check"
  - "Problems and contests deferred: no grade_id column on either table"
  - "Community/discussions deferred: module lacks org-level tenant filtering prerequisite"
  - "Submissions list is user-scoped (own submissions), no grade filtering needed"

patterns-established:
  - "Route handler pattern: extract Extension<TenantContext>, check claims.role == gradeadmin, pass grade_id"
  - "Service pattern: accept grade_id: Option<i64>, append AND grade_id = $N when Some"

requirements-completed: []

# Metrics
duration: 21min
completed: 2026-04-19
---

# Phase 14 Plan 03: Domain Service Grade Filtering Summary

**GradeAdmin-scoped query filtering across domain-classes (grade_id column), domain-leaderboard (users.grade_id JOIN), and domain-search (discussion author grade filter); problems, contests, submissions, community deferred**

## Performance

- **Duration:** 21 min
- **Started:** 2026-04-19T14:08:02Z
- **Completed:** 2026-04-19T14:29:33Z
- **Tasks:** 7 (3 implemented, 4 deferred with rationale)
- **Files modified:** 7 + 5 test files

## Accomplishments

- domain-classes: added grade_id to Class struct, CreateClassRequest, UpdateClassRequest, ListClassesQuery; service queries include grade_id in SELECT/INSERT/UPDATE; routes inject grade filter for GradeAdmin on list and verify grade access on get
- domain-leaderboard: get_global_leaderboard and get_campus_leaderboard accept grade_id parameter; cache keys include grade suffix; routes extract grade_id from TenantContext for gradeadmin
- domain-search: search_tenant_aware accepts grade_id; discussion search filters by author's grade_id; routes extract grade_id from TenantContext for gradeadmin
- All test call sites updated for new function signatures (5 test files across 4 crates)

## Task Commits

1. **Task 1: domain-classes grade filtering** - `283dbe9` (feat)
2. **Tasks 2-5: leaderboard + no-ops** - `750c804` (feat)
3. **Tasks 6-7: search grade filtering** - `a4bb99c` (feat)
4. **Test fixes for all call sites** - `069f407` (fix)

## Task Details

| Task | Domain | Status | Rationale |
|------|--------|--------|-----------|
| 1 | domain-classes | Implemented | classes table has grade_id column; natural fit |
| 2 | domain-problems | Deferred (no-op) | No grade_id on problems table; grade access via class assignments only |
| 3 | domain-submissions | Deferred (no-op) | list_submissions is user-scoped (own submissions only); no admin listing |
| 4 | domain-contests | Deferred | No grade_id on contests table; would require schema change (Rule 4) |
| 5 | domain-leaderboard | Implemented | users.grade_id JOIN enables grade-scoped leaderboards |
| 6 | domain-community | Deferred | Module lacks org-level tenant filtering; grade filtering not meaningful as prerequisite |
| 7 | domain-search | Implemented | Discussion search filters by author grade_id |

## Files Created/Modified

- `backend/domain-classes/src/models.rs` - Added grade_id to Class, CreateClassRequest, UpdateClassRequest, ListClassesQuery
- `backend/domain-classes/src/service.rs` - grade_id in SELECT/INSERT/UPDATE queries; grade_id filter in list_classes
- `backend/domain-classes/src/routes.rs` - GradeAdmin grade_id injection from TenantContext on list/get
- `backend/domain-leaderboard/src/service.rs` - grade_id parameter on get_global_leaderboard, get_campus_leaderboard; dynamic SQL with grade filter
- `backend/domain-leaderboard/src/routes.rs` - GradeAdmin grade_id extraction from TenantContext
- `backend/domain-search/src/service.rs` - grade_id parameter on search_tenant_aware, search_discussions
- `backend/domain-search/src/routes.rs` - GradeAdmin grade_id extraction from TenantContext
- `backend/domain-classes/tests/integration.rs` - Added grade_id: None to test constructions
- `backend/domain-leaderboard/tests/integration.rs` - Added None grade_id arg to get_global_leaderboard calls
- `backend/domain-search/tests/integration.rs` - Added None grade_id arg to search_tenant_aware calls
- `backend/api/tests/tenant_isolation.rs` - Added None grade_id arg to get_global_leaderboard calls
- `backend/api/src/release_gate_tests.rs` - Added None grade_id arg to search_tenant_aware calls

## Decisions Made

- **D-08 enforced at route layer:** Route handlers check `claims.role == "gradeadmin"` before extracting `tenant_ctx.grade_id`. This ensures CampusAdmin and Root bypass grade filtering entirely.
- **Problems deferred (v1.0):** Problems have no direct grade_id. GradeAdmin sees all problems in campus scope. Grade access is indirect through class assignments.
- **Contests deferred (v1.0):** Adding grade_id to contests table is a schema change (Rule 4 - architectural). Contests remain campus-scoped. A future plan can add grade_id to contests.
- **Submissions no-op:** The submissions list endpoint shows the requesting user's own submissions. There's no admin "list all submissions" endpoint that would need grade scoping. Admin views come through class assignments and contest submissions.
- **Community deferred:** The community module (discussions, blogs) lacks organization-level tenant filtering as a prerequisite. Grade filtering is not meaningful until that gap is addressed in a separate plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed test compilation errors from new function signatures**
- **Found during:** Build verification after all tasks
- **Issue:** Adding grade_id parameters to service functions broke existing test call sites in 5 test files
- **Fix:** Added `None` (or `grade_id: None`) to all affected function calls in test code
- **Files modified:** 5 test files across domain-classes, domain-leaderboard, domain-search, api
- **Verification:** cargo build passes with zero errors; cargo test: 182 passed, 2 pre-existing failures (domain-community title column)
- **Committed in:** 069f407

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for compilation. No scope creep.

## Issues Encountered

- Pre-existing domain-community test failures (column "title" of relation "discussions" does not exist) -- out of scope, unrelated to this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GradeAdmin scoping is functional in classes, leaderboard, and search domains
- Plan 14-04 can proceed with data migration (populate grades, backfill grade_id columns)
- Plan 14-05 can add grade dropdown to frontend user management
- Deferred items (contests grade_id, community tenant filtering) can be addressed in future phases

---
*Phase: 14-grade-scoped-data-model*
*Completed: 2026-04-19*

## Self-Check: PASSED

- All 7 modified files verified present
- All 4 commits verified in git log (283dbe9, 750c804, a4bb99c, 069f407)
- SUMMARY.md verified present
- cargo build: passed (zero errors, zero warnings)
- cargo test: 182 passed, 2 pre-existing failures (domain-community title column, out of scope)
