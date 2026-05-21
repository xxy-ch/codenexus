---
phase: 14-grade-scoped-data-model
plan: 02
subsystem: auth
tags: [jwt, login, middleware, grades, multi-tenant, sqlx]

# Dependency graph
requires:
  - phase: 14-01
    provides: grades table, grade_id on users/user_roles/classes, Claims with grade_id, TenantContext with campus_id/grade_id
provides:
  - Login/refresh query grade_id from user_roles (authorization scope) not users (identity)
  - JWT Claims.grade_id populated from user_roles at login and refresh
  - RegisterRequest and BatchCreateUserInput accept grade_id for user creation
  - Register handler propagates grade_id to JWT tokens
affects: [14-03, 14-04, 14-05]

# Tech tracking
tech-stack:
  added: []
patterns: [auth-grade-from-user-roles, identity-vs-authorization-grade-split]

key-files:
  created: []
  modified:
    - backend/domain-users/src/service.rs
    - backend/domain-users/src/models.rs
    - backend/api/src/auth/routes.rs
    - backend/domain-imex/src/user_import.rs

key-decisions:
  - "D-07/D-08: JWT grade_id sourced from user_roles (authorization) not users (identity)"
  - "Register and batch create accept optional grade_id for future grade assignment"

patterns-established:
  - "Authorization vs identity grade: login/refresh JWT uses user_roles.grade_id; UserProfile displays users.grade_id"
  - "Combined role+grade query: SELECT role, grade_id FROM user_roles in a single query"

requirements-completed: []

# Metrics
duration: 10min
completed: 2026-04-19
---

# Phase 14 Plan 02: Auth Flow + Tenant Middleware Summary

**Login/refresh query grade_id from user_roles for JWT authorization scope; register and batch create accept grade_id parameter**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-19T13:52:30Z
- **Completed:** 2026-04-19T14:03:09Z
- **Tasks:** 6 (most already done by Plan 14-01; 3 required additional changes)
- **Files modified:** 4

## Accomplishments

- Login and refresh token flows now query `grade_id` from `user_roles` (authorization scope per D-07/D-08), not from `users` table (identity)
- JWT Claims.grade_id correctly reflects the GradeAdmin's assigned grade for downstream filtering
- UserProfile retains `users.grade_id` (identity) for profile display
- Added `grade_id: Option<i64>` to `RegisterRequest` and `BatchCreateUserInput` for user creation with grade assignment
- Register handler propagates `profile.grade_id` to JWT tokens instead of hardcoded `None`
- Tenant middleware already extracts campus_id and grade_id (done in Plan 14-01)

## Task Commits

1. **Tasks 1-6 (combined): Auth flow grade_id wiring** - `2315687` (feat)

All 6 tasks combined into a single commit because changes are tightly coupled:
- Tasks 2-5 were already partially completed by Plan 14-01 (models, JWT, auth routes, tenant middleware)
- Task 1 (login/refresh grade_id from user_roles) and Task 6 (compilation verification) are the net new work
- Adding grade_id to RegisterRequest/BatchCreateUserInput breaks domain-imex construction sites

## Files Created/Modified

- `backend/domain-users/src/service.rs` - Login/refresh query grade_id from user_roles; register INSERT includes grade_id; batch_create passes grade_id through
- `backend/domain-users/src/models.rs` - Added grade_id to RegisterRequest and BatchCreateUserInput
- `backend/api/src/auth/routes.rs` - Register handler propagates profile.grade_id to shared User for JWT
- `backend/domain-imex/src/user_import.rs` - Added grade_id: None to BatchCreateUserInput construction

## Decisions Made

- **JWT grade_id from user_roles (authorization) not users (identity):** Per D-07/D-08, the JWT should carry the authorization scope. GradeAdmin's JWT grade_id comes from user_roles so downstream filtering is correct. UserProfile still shows users.grade_id for display.
- **Register and batch create accept grade_id:** Added grade_id to both request types so future admin UI can assign grades during user creation. Import path defaults to None.
- **Combined all tasks into single commit:** Adding grade_id to RegisterRequest/BatchCreateUserInput breaks domain-imex; login/refresh query change is interdependent with the model change.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed domain-imex BatchCreateUserInput construction site**
- **Found during:** Task 2 (adding grade_id to models)
- **Issue:** Adding grade_id field to BatchCreateUserInput breaks domain-imex/src/user_import.rs construction site
- **Fix:** Added `grade_id: None` to the BatchCreateUserInput construction in user_import.rs
- **Files modified:** backend/domain-imex/src/user_import.rs
- **Verification:** cargo build passes, cargo test passes
- **Committed in:** 2315687

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for compilation. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auth flow correctly wires grade_id from user_roles through JWT to TenantContext
- Plan 14-03 can now implement grade-scoped query filtering in domain services using TenantContext.grade_id
- Plan 14-04 can populate grades data and backfill grade_id columns
- Plan 14-05 can add grade dropdown to frontend user management

## Self-Check: PASSED

- All 4 modified files verified present
- Commit 2315687 verified in git log
- SUMMARY.md verified present
- cargo build: passed (zero errors)
- cargo test: 256 passed, 0 failed (22 ignored - Docker/DB required)

---
*Phase: 14-grade-scoped-data-model*
*Completed: 2026-04-19*
