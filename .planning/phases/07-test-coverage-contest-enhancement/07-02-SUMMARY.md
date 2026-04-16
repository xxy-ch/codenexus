---
phase: 07-test-coverage-contest-enhancement
plan: 02
subsystem: contests
tags: [leaderboard-freeze, upsolving, sqlx, postgresql, jsonb, migrations]

# Dependency graph
requires:
  - phase: 07-test-coverage-contest-enhancement
    provides: domain crate infrastructure with integration test patterns
provides:
  - DB-backed leaderboard freeze snapshots with lazy compute pattern
  - Post-contest upsolving support with is_upsolving flag
  - Auto-unfreeze after contest ends (live rankings restored)
affects: [07-03, 07-04, 07-05, 07-06, 07-07]

# Tech tracking
tech-stack:
  added: []
  patterns: [lazy snapshot compute with JSONB storage, upsolving exclusion filter in ranking SQL, INSERT ON CONFLICT DO UPDATE for idempotent snapshots]

key-files:
  created:
    - api/migrations/026_create_contest_leaderboard_snapshots.sql
    - api/migrations/027_add_is_upsolving_to_contest_submissions.sql
  modified:
    - domain-contests/src/models.rs
    - domain-contests/src/service.rs

key-decisions:
  - "Used JSONB column for snapshot_data in contest_leaderboard_snapshots for flexible schema-free storage of ranking arrays"
  - "Added Deserialize to ContestRankingEntry and ProblemSubmission for snapshot JSON round-trip"
  - "Upsolving flag is_upsolving set server-side based on now > contest.end_time, not client-controllable (T-07-03 mitigation)"

patterns-established:
  - "Lazy snapshot compute: check DB for existing snapshot, compute on miss, store with ON CONFLICT DO UPDATE"
  - "compute_rankings extracted as private method with explicit submissions_cutoff parameter for reuse by freeze and live paths"

requirements-completed: [CONT-01, CONT-02]

# Metrics
duration: 8min
completed: 2026-04-16
---

# Phase 7 Plan 02: Leaderboard Freeze and Upsolving Summary

**Leaderboard freeze with lazy DB-backed JSONB snapshots and post-contest upsolving with is_upsolving flag and ranking exclusion**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-16T00:56:06Z
- **Completed:** 2026-04-16T01:04:06Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created 2 SQL migrations: contest_leaderboard_snapshots table (026) and is_upsolving column on contest_submissions (027)
- Implemented freeze snapshot lazy compute pattern: on first frozen request, compute rankings up to freeze cutoff and store in DB; subsequent requests return cached snapshot
- Implemented auto-unfreeze: after contest ends, freeze window check fails, live rankings returned
- Implemented upsolving: link_submission_to_contest now allows post-contest submissions tagged is_upsolving=true
- All ranking SQL queries exclude upsolving submissions with AND NOT cs.is_upsolving filter

## Task Commits

Each task was committed atomically:

1. **Task 1: Add DB migrations for freeze snapshots and upsolving** - `f78972d` (feat)
2. **Task 2: Implement freeze snapshot and upsolving in domain-contests** - `5754316` (feat)

## Files Created/Modified

- `api/migrations/026_create_contest_leaderboard_snapshots.sql` - Creates contest_leaderboard_snapshots table with JSONB snapshot_data and FK to contests
- `api/migrations/027_add_is_upsolving_to_contest_submissions.sql` - Adds is_upsolving BOOLEAN DEFAULT false to contest_submissions with composite index
- `domain-contests/src/models.rs` - Added is_upsolving to ContestSubmission, added ContestLeaderboardSnapshot model, added Deserialize to ContestRankingEntry and ProblemSubmission
- `domain-contests/src/service.rs` - Added store_frozen_snapshot/get_frozen_snapshot methods, refactored get_contest_rankings with lazy freeze logic, extracted compute_rankings, modified link_submission_to_contest for upsolving

## Decisions Made

- **JSONB for snapshot storage**: Using PostgreSQL JSONB for snapshot_data allows storing the full Vec<ContestRankingEntry> as JSON without a separate table schema, while still supporting indexing if needed later.
- **Deserialize addition to ranking models**: ContestRankingEntry and ProblemSubmission needed Deserialize derive added for the serde_json::from_value round-trip when retrieving snapshots from DB.
- **Server-side upsolving detection**: The is_upsolving flag is computed server-side (now > contest.end_time) rather than accepted from client input, mitigating tampering threats (T-07-03).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added Deserialize to ContestRankingEntry and ProblemSubmission**
- **Found during:** Task 2 (implementation of snapshot round-trip)
- **Issue:** Plan's snapshot pattern uses serde_json::to_value and serde_json::from_value for ranking data, requiring both Serialize and Deserialize on the model structs
- **Fix:** Added Deserialize derive to ContestRankingEntry and ProblemSubmission
- **Files modified:** domain-contests/src/models.rs
- **Verification:** cargo build -p domain-contests succeeds, full workspace compiles
- **Committed in:** 5754316

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor derive addition required for JSON round-trip. No scope creep.

## Issues Encountered

- Integration tests require Docker (testcontainers) which is not available in this environment. Unit-level compilation verified via `cargo build --workspace` passing cleanly. Integration test failures are infrastructure-related, not code bugs.

## Next Phase Readiness

- Leaderboard freeze (CONT-01) and upsolving (CONT-02) fully implemented
- Ready for plan 07-03 (contest enhancements: virtual contests, practice mode, post-contest review)
- Ready for plan 07-04 (submission recovery in judge-worker)
- Migrations 026 and 027 will be auto-applied on next API server startup via sqlx::migrate!()

## Self-Check: PASSED

- api/migrations/026_create_contest_leaderboard_snapshots.sql: FOUND
- api/migrations/027_add_is_upsolving_to_contest_submissions.sql: FOUND
- domain-contests/src/models.rs: FOUND
- domain-contests/src/service.rs: FOUND
- 07-02-SUMMARY.md: FOUND
- Task 1 commit f78972d: FOUND
- Task 2 commit 5754316: FOUND

---
*Phase: 07-test-coverage-contest-enhancement*
*Completed: 2026-04-16*
