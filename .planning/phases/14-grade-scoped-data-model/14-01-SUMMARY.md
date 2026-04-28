---
phase: 14-grade-scoped-data-model
plan: 01
subsystem: database, auth
tags: [postgres, jwt, middleware, grades, multi-tenant, sqlx]

# Dependency graph
requires:
  - phase: 13-tenant-hierarchy-restructure
    provides: 6-level role hierarchy with GradeAdmin role
provides:
  - grades table (campus-scoped, with name/year_level/academic_year/is_active)
  - grade_id FK on users (identity), user_roles (authorization scope), classes (parent entity)
  - Updated Claims struct with grade_id field for JWT propagation
  - Updated TenantContext with campus_id + grade_id fields
  - Unique constraint update on user_roles to include grade_id
  - Partial unique index enforcing one GradeAdmin per grade per campus
affects: [14-02, 14-03, 14-04, 14-05, 14-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [grade-scoped-tenant-context, coalesce-unique-index-with-grade-id]

key-files:
  created:
    - backend/api/migrations/031_create_grades_and_add_grade_id.sql
  modified:
    - backend/shared/src/models/auth.rs
    - backend/shared/src/models/user.rs
    - backend/api-infra/src/middleware/tenant.rs
    - backend/api/src/middleware/tenant.rs
    - backend/api/src/auth/jwt_service.rs
    - backend/api/src/auth/routes.rs
    - backend/domain-users/src/models.rs
    - backend/domain-users/src/service.rs

key-decisions:
  - "D-01: grades table campus-scoped with year_level and academic_year for lifecycle tracking"
  - "D-05: user_roles.grade_id separates authorization scope from identity (users.grade_id)"
  - "D-06: Partial unique index enforces 1:1 GradeAdmin-to-grade per campus"
  - "D-07: grade_id added to JWT Claims, populated from user_roles at login"
  - "Migration 029 COALESCE index replaced with 4-column version including grade_id"

patterns-established:
  - "TenantContext triple: { tenant_id, campus_id, grade_id } carries full scope hierarchy"
  - "grade_id propagation: DB column -> FromRow struct -> shared User -> JWT Claims -> TenantContext"

requirements-completed: []

# Metrics
duration: 15min
completed: 2026-04-19
---

# Phase 14 Plan 01: DB Schema + Shared Models Summary

**Grades table (campus-scoped) with grade_id FKs on users/user_roles/classes, JWT Claims and TenantContext extended with grade_id**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-19T11:48:56Z
- **Completed:** 2026-04-19T12:04:00Z
- **Tasks:** 4 (combined into single commit -- all changes are interdependent)
- **Files modified:** 15

## Accomplishments

- Created `grades` table with campus scoping, year_level, academic_year, and is_active fields
- Added `grade_id` nullable FK to `users`, `user_roles`, and `classes` tables
- Extended `TenantContext` with `campus_id` and `grade_id` fields in both api-infra and api middleware
- Updated all 14+ Claims/User/UserPublic construction sites across the entire workspace
- Extended domain-users User and UserProfile FromRow structs with grade_id
- Propagated grade_id through login/refresh/register token generation flows

## Task Commits

1. **Tasks 1-4 (combined): grades table, shared models, TenantContext, construction sites** - `2cac7be` (feat)

All 4 tasks were combined into a single commit because the changes are tightly interdependent -- adding `grade_id` to shared structs immediately breaks all construction sites, which must be fixed simultaneously for the build to pass.

## Files Created/Modified

- `backend/api/migrations/031_create_grades_and_add_grade_id.sql` - grades table DDL, grade_id columns, indexes, constraints
- `backend/shared/src/models/auth.rs` - Claims struct with grade_id field
- `backend/shared/src/models/user.rs` - User and UserPublic structs with grade_id, From impl updated
- `backend/api-infra/src/middleware/tenant.rs` - TenantContext with campus_id/grade_id, new extraction function, new test
- `backend/api/src/middleware/tenant.rs` - Mirror of api-infra tenant middleware changes
- `backend/api/src/auth/jwt_service.rs` - Token generation propagates user.grade_id into Claims
- `backend/api/src/auth/routes.rs` - Login UserPublic, register shared User, test Claims updated
- `backend/api/src/middleware/auth.rs` - Test User construction updated
- `backend/api/src/release_gate_tests.rs` - build_user helper updated
- `backend/api/tests/handlers/contests_test.rs` - make_token User construction updated
- `backend/api/tests/handlers/users_test.rs` - make_token User construction updated
- `backend/api-infra/src/testkit/fixtures.rs` - build_test_user and build_test_user_with_campus updated
- `backend/domain-problems/src/access.rs` - test Claims helper updated
- `backend/domain-users/src/models.rs` - User and UserProfile FromRow structs with grade_id
- `backend/domain-users/src/service.rs` - UserProfile and shared User constructions propagate grade_id

## Decisions Made

- **Combined all 4 tasks into single commit**: Adding grade_id to shared structs breaks every construction site across the workspace. Splitting into separate commits would leave the codebase in a broken state between commits. Combined commit ensures every commit leaves the build passing.
- **Propagated grade_id from DB through JWT**: Login and refresh flows now pass `user.grade_id` to the shared User model, which flows into JWT Claims. This enables downstream plans to query grade_id from claims without additional DB lookups.
- **Updated migration 029 unique index**: The existing `idx_user_roles_unique` index used COALESCE on campus_id. Extended it to include COALESCE on grade_id for correct uniqueness semantics with nullable columns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added grade_id to domain-users User and UserProfile structs**
- **Found during:** Task 2 (shared model update)
- **Issue:** domain-users `User` struct derives `FromRow` and queries `SELECT * FROM users`. After migration adds `grade_id` column, the struct would fail at runtime if the field is missing.
- **Fix:** Added `grade_id: Option<i64>` to both `User` and `UserProfile` structs in domain-users/models.rs, and updated all 3 UserProfile + 2 shared User construction sites in service.rs
- **Files modified:** domain-users/src/models.rs, domain-users/src/service.rs
- **Verification:** cargo build passes, cargo test passes
- **Committed in:** 2cac7be

**2. [Rule 1 - Bug] Fixed migration 029 unique index reference**
- **Found during:** Task 1 (migration creation)
- **Issue:** Plan SQL referenced dropping `user_roles_user_id_organization_id_campus_id_key` which no longer exists (replaced by migration 029 with `idx_user_roles_unique`)
- **Fix:** Changed migration 031 to `DROP INDEX IF EXISTS idx_user_roles_unique` and recreated with 4-column COALESCE index including grade_id
- **Files modified:** backend/api/migrations/031_create_grades_and_add_grade_id.sql
- **Verification:** SQL syntax correct, matches existing index naming convention
- **Committed in:** 2cac7be

**3. [Rule 2 - Missing Critical] Propagated grade_id in login/refresh flows**
- **Found during:** Task 4 (construction site fixes)
- **Issue:** Plan specified `grade_id: None` for construction sites, but domain-users service.rs login/refresh should pass `user.grade_id` from the DB query to enable JWT propagation
- **Fix:** Used `grade_id: user.grade_id` instead of `grade_id: None` in both login and refresh shared User constructions, and `grade_id: response.user.grade_id` in auth routes UserPublic
- **Files modified:** domain-users/src/service.rs, api/src/auth/routes.rs
- **Verification:** Build passes, grade_id flows from DB -> UserProfile -> shared User -> JWT Claims
- **Committed in:** 2cac7be

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 bug)
**Impact on plan:** All auto-fixes necessary for correctness. grade_id propagation is essential for downstream plans.

## Issues Encountered

None beyond the auto-fixes documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All foundation schema and shared model changes are in place
- Plan 14-02 can now implement auth flow JWT grade_id injection from user_roles
- Plan 14-03 can now implement domain service grade-scoped query filtering using TenantContext.grade_id
- Plan 14-04 can now populate grades data and backfill grade_id columns

---
*Phase: 14-grade-scoped-data-model*
*Completed: 2026-04-19*

## Self-Check: PASSED

- All 15 created/modified files verified present
- Commit 2cac7be verified in git log
- SUMMARY.md verified present
- cargo build: passed (zero errors)
- cargo test: all relevant tests passed (pre-existing domain-community failures unrelated)
