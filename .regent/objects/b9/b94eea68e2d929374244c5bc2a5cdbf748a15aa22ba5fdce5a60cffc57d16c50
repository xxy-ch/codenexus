---
phase: 04-domain-extraction-complex-submissions-contests-classes-leaderboard
plan: 01
subsystem: api
tags: [domain-extraction, axum, sqlx, classes, assignments, trait, async-trait]

# Dependency graph
requires:
  - phase: 03-domain-extraction-community-search
    provides: api-infra crate with shared types, middleware, state, error types
provides:
  - domain-classes crate with ClassService, class/assignment route handlers
  - ClassMembershipChecker trait in api-infra for cross-domain access
affects: [04-02, 04-04, 04-05]

# Tech tracking
tech-stack:
  added: [domain-classes crate]
  patterns: [cross-domain-trait-in-api-infra, crate-local-imports-only]

key-files:
  created:
    - domain-classes/Cargo.toml
    - domain-classes/src/lib.rs
    - domain-classes/src/models.rs
    - domain-classes/src/routes.rs
    - domain-classes/src/service.rs
  modified:
    - api-infra/src/traits/class_repo.rs

key-decisions:
  - "ClassMembershipChecker trait placed in api-infra (D-06: cross-domain deps route through api-infra traits)"
  - "ClassService implements ClassMembershipChecker by delegating to existing get_class_students method"

patterns-established:
  - "Domain crate import pattern: crate::models::*, crate::service::ClassService, api_infra::state::AppState, api_infra::middleware::auth::AuthExtractor"
  - "Cross-domain trait pattern: trait in api-infra/src/traits/, impl in domain crate service.rs"

requirements-completed: [ARCH-04]

# Metrics
duration: 5min
completed: 2026-04-15
---

# Phase 04 Plan 01: Create domain-classes Crate Summary

**Extracted classes module into independent domain-classes crate with ClassService, all class/assignment routes, and ClassMembershipChecker trait for leaderboard cross-domain access**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-15T00:42:57Z
- **Completed:** 2026-04-15T00:48:03Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- domain-classes crate compiles independently with `cargo build -p domain-classes`
- All class and assignment API endpoints preserved with identical behavior
- No imports from the api crate (no circular dependency)
- ClassMembershipChecker trait defined in api-infra for domain-leaderboard to consume (Wave 2)
- Clippy passes with zero warnings

## Task Commits

Each task was committed atomically:

1. **Task 1: Create domain-classes crate skeleton and copy source files** - `11cae14` (feat)
2. **Task 2: Verify domain-classes builds independently and implement ClassMembershipChecker** - `b7aa6fc` (feat)

## Files Created/Modified
- `domain-classes/Cargo.toml` - Crate manifest with api-infra, shared, sqlx, axum dependencies
- `domain-classes/src/lib.rs` - Module declarations and classes_router() re-export
- `domain-classes/src/models.rs` - Class, ClassEnrollment, Assignment, StudentProgress, ClassStats structs
- `domain-classes/src/routes.rs` - Class and assignment route handlers with api_infra imports
- `domain-classes/src/service.rs` - ClassService business logic + ClassMembershipChecker impl
- `api-infra/src/traits/class_repo.rs` - Added ClassMembershipChecker trait

## Decisions Made
- ClassMembershipChecker trait placed in api-infra per D-06 (cross-domain dependencies route through api-infra traits)
- ClassService.get_class_student_ids() delegates to existing get_class_students() and extracts student_id from StudentProgress structs
- Kept is_admin and is_teacher_plus as private inline functions in routes.rs (same as original)

## Deviations from Plan

### Minor Issues

**1. Untracked domain-contests files included in Task 2 commit**
- **Found during:** Task 2 commit
- **Issue:** Pre-existing untracked domain-contests/ files were staged alongside Task 2 changes
- **Impact:** None - domain-contests files are placeholders for Plan 02 and already in workspace members
- **Committed in:** b7aa6fc

---

**Total deviations:** 1 minor (no code impact)
**Impact on plan:** None - all acceptance criteria met, builds pass, clippy clean

## Issues Encountered
None - plan executed cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- domain-classes crate ready for integration into api crate (replace api::classes with domain-classes)
- ClassMembershipChecker trait ready for domain-leaderboard (Plan 04) to consume
- Plan 02 (domain-contests) can proceed independently

## Self-Check: PASSED

All 6 files verified present. Both commit hashes (11cae14, b7aa6fc) verified in git log.

---
*Phase: 04-domain-extraction-complex-submissions-contests-classes-leaderboard*
*Completed: 2026-04-15*
