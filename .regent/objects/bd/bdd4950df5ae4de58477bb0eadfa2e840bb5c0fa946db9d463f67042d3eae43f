---
phase: 04-domain-extraction-complex-submissions-contests-classes-leaderboard
plan: 02
subsystem: api
tags: [submissions, redis-streams, judge-queue, axum, sqlx, domain-extraction]

# Dependency graph
requires:
  - phase: 03-domain-extraction-extended
    provides: api-infra crate with shared types (AppError, AppState, AuthExtractor)
provides:
  - domain-submissions crate with models, service, queue, routes
  - Inlined Redis stream helpers (create_stream, add_message) independent of api::redis
  - domain-leaderboard stub crate for workspace resolution
affects: [phase-04-integration, api-main-rs]

# Tech tracking
tech-stack:
  added: [domain-submissions crate, domain-leaderboard stub]
  patterns: [inlined-redis-helpers, crate-self-containment]

key-files:
  created:
    - domain-submissions/Cargo.toml
    - domain-submissions/src/lib.rs
    - domain-submissions/src/models.rs
    - domain-submissions/src/service.rs
    - domain-submissions/src/queue.rs
    - domain-submissions/src/routes.rs
    - domain-leaderboard/Cargo.toml
    - domain-leaderboard/src/lib.rs
  modified:
    - Cargo.toml
    - Cargo.lock

key-decisions:
  - "Inlined create_stream and add_message from api/src/redis/mod.rs into domain-submissions/src/queue.rs to eliminate crate::redis dependency"
  - "Created minimal domain-leaderboard stub crate to satisfy workspace member resolution"

patterns-established:
  - "Inline Redis stream helpers when extracting queue logic from api crate"
  - "Stub crates for workspace members not yet implemented"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-04-15
---

# Phase 4 Plan 02: Extract Submissions Domain Crate Summary

**Extracted submissions module into standalone domain-submissions crate with inlined Redis stream helpers removing all api crate dependencies**

## Performance

- **Duration:** 7m 41s
- **Started:** 2026-04-15T00:41:53Z
- **Completed:** 2026-04-15T00:49:34Z
- **Tasks:** 1
- **Files modified:** 10

## Accomplishments
- Created domain-submissions crate with full submissions business logic (models, service, queue, routes)
- Inlined `create_stream` and `add_message` Redis helpers from api::redis, eliminating the only cross-crate dependency
- All `crate::` references to api crate converted to `api_infra::` or `crate::` (local) equivalents
- Build and clippy pass with zero warnings
- Verification greps confirm no residual `crate::redis`, `crate::error`, `crate::AppState`, or `crate::middleware` references

## Task Commits

Each task was committed atomically:

1. **Task 1: Create domain-submissions crate files** - `aadff2d` (feat)

## Files Created/Modified
- `domain-submissions/Cargo.toml` - Crate manifest with api-infra, shared, sqlx, axum, deadpool-redis deps
- `domain-submissions/src/lib.rs` - Public module re-exports and submissions_router
- `domain-submissions/src/models.rs` - Submission, SubmissionResult, CreateSubmissionRequest, SubmissionResponse, TestCaseResult, SubmissionStats
- `domain-submissions/src/service.rs` - SubmissionService with CRUD, judge result updates, test case storage, queueing
- `domain-submissions/src/queue.rs` - SubmissionMessage, QueueConfig, queue_submission with inlined Redis stream helpers
- `domain-submissions/src/routes.rs` - Route handlers with api_infra imports for AppError, AuthExtractor, AppState
- `domain-leaderboard/Cargo.toml` - Minimal stub crate manifest
- `domain-leaderboard/src/lib.rs` - Placeholder for future leaderboard implementation
- `Cargo.toml` - Added domain-leaderboard and domain-submissions to workspace members
- `Cargo.lock` - Updated lock file

## Decisions Made
- **Inlined Redis helpers:** Copied `create_stream` and `add_message` verbatim from `api/src/redis/mod.rs` into `domain-submissions/src/queue.rs` as private functions. This eliminates the `crate::redis` dependency while keeping identical Redis Stream behavior.
- **domain-leaderboard stub:** Created an empty placeholder crate to satisfy Cargo workspace resolution, since the root Cargo.toml already listed it as a member.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created domain-leaderboard stub crate**
- **Found during:** Task 1 (build verification)
- **Issue:** Root Cargo.toml already listed `domain-leaderboard` as workspace member but the crate did not exist, causing `cargo build` to fail with "failed to load manifest"
- **Fix:** Created minimal `domain-leaderboard/Cargo.toml` and `src/lib.rs` placeholder
- **Files modified:** domain-leaderboard/Cargo.toml, domain-leaderboard/src/lib.rs
- **Verification:** `cargo build -p domain-submissions` passes
- **Committed in:** aadff2d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal -- stub crate is a placeholder for future plan implementation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- domain-submissions crate is ready for integration into api/src/main.rs (route registration swap)
- domain-leaderboard stub will need full implementation in a future plan
- Remaining plans in Phase 4 can proceed independently

## Self-Check: PASSED

All files verified present:
- domain-submissions/Cargo.toml, src/lib.rs, src/models.rs, src/service.rs, src/queue.rs, src/routes.rs
- domain-leaderboard/Cargo.toml, src/lib.rs
- Commit aadff2d verified in git log

---
*Phase: 04-domain-extraction-complex-submissions-contests-classes-leaderboard*
*Completed: 2026-04-15*
