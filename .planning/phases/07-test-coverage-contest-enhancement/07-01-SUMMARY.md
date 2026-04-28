---
phase: 07-test-coverage-contest-enhancement
plan: 01
subsystem: testing
tags: [testcontainers, integration-tests, sqlx, postgresql, redis]

# Dependency graph
requires:
  - phase: 03-domain-extraction-extended
    provides: domain crate infrastructure with service/model/route separation
provides:
  - Integration test suite for all 8 domain crates using testcontainers
  - TestFixture-based test setup pattern for domain crates
  - Seed helper pattern for FK dependency chains (org -> campus -> user -> problem)
affects: [07-02, 07-03, 07-04, 07-05, 07-06, 07-07]

# Tech tracking
tech-stack:
  added: [api-infra testkit feature in dev-dependencies for all domain crates]
  patterns: [TestFixture + sqlx::migrate! pattern for integration tests, seed helpers for FK chains]

key-files:
  created:
    - domain-contests/tests/integration.rs
    - domain-users/tests/integration.rs
    - domain-problems/tests/integration.rs
    - domain-submissions/tests/integration.rs
    - domain-classes/tests/integration.rs
    - domain-community/tests/integration.rs
    - domain-leaderboard/tests/integration.rs
    - domain-search/tests/integration.rs
  modified:
    - domain-contests/Cargo.toml
    - domain-users/Cargo.toml
    - domain-problems/Cargo.toml
    - domain-submissions/Cargo.toml
    - domain-classes/Cargo.toml
    - domain-community/Cargo.toml
    - domain-leaderboard/Cargo.toml
    - domain-search/Cargo.toml

key-decisions:
  - "Bypassed TestFixture::run_migrations closure API due to async lifetime issues; use sqlx::migrate! directly on fixture.db_pool"
  - "Used direct SQL seeding instead of service-layer calls where services require complex dependencies (e.g., UserService needs Arc<dyn TokenService>)"

patterns-established:
  - "TestFixture::new() + sqlx::migrate! + seed helpers in tests/integration.rs for domain crate integration tests"
  - "Each test creates its own TestFixture (containers auto-managed by testcontainers)"

requirements-completed: [TEST-01]

# Metrics
duration: 14min
completed: 2026-04-16
---

# Phase 7 Plan 01: Domain Crate Integration Tests Summary

**23 integration tests across 8 domain crates using testcontainers for real PostgreSQL + Redis, validating actual SQL queries against live databases**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-16T00:36:24Z
- **Completed:** 2026-04-16T00:50:36Z
- **Tasks:** 3
- **Files modified:** 16 (8 Cargo.toml + 8 integration.rs)

## Accomplishments

- Added api-infra testkit dev-dependencies to all 8 domain crates
- Created 23 integration tests: contests (4), users (3), problems (3), submissions (3), classes (3), community (3), leaderboard (2), search (2)
- All tests use real PostgreSQL + Redis via testcontainers with full migration setup
- Tests validate tenant isolation, FK constraints, CRUD operations, and status transitions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add testkit dev-dependencies to all 8 domain crates** - `1a7d2f1` (chore)
2. **Task 2+3: Write integration tests for all 8 domain crates** - `2a266ee` (test)

## Files Created/Modified

- `domain-contests/tests/integration.rs` - 4 tests: create/get, list by org (tenant isolation), register participant, contest status transitions
- `domain-users/tests/integration.rs` - 3 tests: create/get user, list by org (tenant isolation), email uniqueness constraint
- `domain-problems/tests/integration.rs` - 3 tests: create/get problem, list by org (tenant isolation), visibility filtering
- `domain-submissions/tests/integration.rs` - 3 tests: create/get submission, list by user, status update (queued -> judged)
- `domain-classes/tests/integration.rs` - 3 tests: create/get class, enroll student, list by teacher
- `domain-community/tests/integration.rs` - 3 tests: discussion CRUD, list by problem, blog article CRUD
- `domain-leaderboard/tests/integration.rs` - 2 tests: global leaderboard tenant isolation, problem leaderboard tenant isolation
- `domain-search/tests/integration.rs` - 2 tests: tenant-scoped search results, empty query handling
- `domain-*/Cargo.toml` (8 files) - Added `[dev-dependencies]` with api-infra testkit and tokio full

## Decisions Made

- **Bypassed TestFixture::run_migrations closure API**: The closure-based API has an async lifetime issue where `&PgPool` from the closure parameter doesn't live long enough for `async move` blocks. Switched to calling `sqlx::migrate!("../api/migrations").run(&fixture.db_pool)` directly after `TestFixture::new()`.
- **Direct SQL seeding where service constructors are complex**: UserService requires `Arc<dyn TokenService>` which is difficult to mock in tests. Used direct SQL queries for seeding test data instead.
- **Migration path relative to CARGO_MANIFEST_DIR**: `sqlx::migrate!` resolves relative to the crate root, so the path is `../api/migrations` (not `../../api/migrations` from the test file).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed sqlx::migrate! relative path**
- **Found during:** Task 2 (compilation of integration tests)
- **Issue:** Plan specified `sqlx::migrate!("../../api/migrations")` which resolves relative to the test source file, but the macro resolves relative to CARGO_MANIFEST_DIR
- **Fix:** Changed to `sqlx::migrate!("../api/migrations")` in all 8 test files
- **Files modified:** All 8 integration.rs files
- **Committed in:** `2a266ee`

**2. [Rule 3 - Blocking] Fixed async lifetime issue with TestFixture::run_migrations**
- **Found during:** Task 2 (compilation of integration tests)
- **Issue:** `run_migrations` closure API produces lifetime errors when async block captures `&PgPool` parameter
- **Fix:** Called `sqlx::migrate!("../api/migrations").run(&fixture.db_pool)` directly instead of using the closure API
- **Files modified:** All 8 integration.rs files
- **Committed in:** `2a266ee`

**3. [Rule 1 - Bug] Fixed LeaderboardQuery Clone missing derive**
- **Found during:** Task 3 (compilation of leaderboard tests)
- **Issue:** `LeaderboardQuery` struct doesn't implement `Clone`; test tried to clone it
- **Fix:** Used a closure factory `make_query()` to construct fresh instances instead of cloning
- **Files modified:** domain-leaderboard/tests/integration.rs
- **Committed in:** `2a266ee`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All auto-fixes necessary for compilation. No scope creep.

## Issues Encountered

- `MigrateError` vs `sqlx::Error` type mismatch with `run_migrations` closure -- resolved by bypassing the closure API entirely
- Type annotation needed for `query_scalar` in domain-users duplicate email test -- resolved with explicit `Result<Uuid, _>` type

## Next Phase Readiness

- All 8 domain crates now have integration test infrastructure
- Tests require Docker to run (testcontainers spins up PostgreSQL + Redis containers)
- Ready for plan 07-02 (API handler tests using tower::oneshot)
- Ready for plan 07-03 (contest feature enhancements with freeze/upsolving/recovery)

## Self-Check: PASSED

- All 8 integration test files: FOUND
- All 2 task commits (1a7d2f1, 2a266ee): FOUND
- SUMMARY.md: FOUND

---
*Phase: 07-test-coverage-contest-enhancement*
*Completed: 2026-04-16*
