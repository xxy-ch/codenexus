---
phase: 04-domain-extraction-complex-submissions-classes-leaderboard
plan: 04
subsystem: leaderboard, security
tags: [leaderboard, sec-03, tenant-isolation, deadpool-redis, domain-extraction, class-membership-trait]

# Dependency graph
requires:
  - phase: 04-01
    provides: ClassMembershipChecker trait in api-infra, NoopClassMembershipChecker stub
provides:
  - domain-leaderboard crate (independent, no domain-classes dependency)
  - SEC-03 tenant-filtered global and problem leaderboards
  - Normalized Redis via deadpool_redis::Pool
  - NoopClassMembershipChecker for AppState stub wiring
affects: [05-integration, api-main-wiring]

# Tech tracking
tech-stack:
  added: [deadpool-redis in domain-leaderboard]
  patterns: [cross-domain-trait-via-api-infra, optional-redis-pool, tenant-scoped-cache-keys]

key-files:
  created:
    - domain-leaderboard/src/models.rs
    - domain-leaderboard/src/routes.rs
    - domain-leaderboard/src/service.rs
  modified:
    - domain-leaderboard/Cargo.toml
    - domain-leaderboard/src/lib.rs
    - api-infra/src/state.rs
    - api-infra/src/traits/class_repo.rs
    - api/src/main.rs
    - api/src/auth/routes.rs
    - api/src/release_gate_tests.rs

key-decisions:
  - "NoopClassMembershipChecker added to api-infra traits for temporary AppState wiring until Plan 05"
  - "SEC-03 uses Option<i64> school_id parameter: None for admin (all orgs), Some(id) for scoped users"
  - "Cache keys include org suffix when tenant-scoped to prevent cross-tenant cache leakage"
  - "Clippy suggestion adopted: students.contains(&claims.sub) instead of iter().any()"

patterns-established:
  - "Tenant-scoped cache keys: leaderboard:global:org:{id}:limit:offset pattern"
  - "Cross-domain trait usage: state.class_membership_checker.method() via Arc<dyn Trait>"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-04-15
---

# Phase 04 Plan 04: Domain Leaderboard Extraction with SEC-03 Summary

**Extracted leaderboard into independent domain-leaderboard crate with SEC-03 tenant isolation on global/problem leaderboards, normalized deadpool-redis pool, and D-06 compliant ClassMembershipChecker trait usage**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-15T00:56:14Z
- **Completed:** 2026-04-15T01:05:07Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Created domain-leaderboard crate with full models, service, and routes
- SEC-03: Fixed tenant isolation vulnerability -- global and problem leaderboards now filter by organization_id for non-admin users
- Normalized Redis from redis::Client string-based construction to Option<deadpool_redis::Pool>
- D-06: Replaced direct ClassService dependency with ClassMembershipChecker trait from api-infra
- Added NoopClassMembershipChecker stub for AppState construction until Plan 05 wires the real implementation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create domain-leaderboard crate with SEC-03 tenant filtering and normalized Redis** - `9bc4d62` (feat)
2. **Task 2: Verify domain-leaderboard builds independently** - Verified within Task 1 commit (build + clippy pass)

**Plan metadata:** `9bc4d62` (feat: complete domain-leaderboard extraction)

## Files Created/Modified
- `domain-leaderboard/Cargo.toml` - Crate manifest with api-infra, shared, deadpool-redis deps (no domain-classes)
- `domain-leaderboard/src/lib.rs` - Public re-exports of models, routes, service
- `domain-leaderboard/src/models.rs` - Leaderboard models copied from api crate (no crate:: imports)
- `domain-leaderboard/src/routes.rs` - Route handlers with SEC-03 claims extraction and D-06 trait usage
- `domain-leaderboard/src/service.rs` - Service with tenant-scoped SQL, normalized Redis pool, org-scoped cache keys
- `api-infra/src/state.rs` - Added class_membership_checker: Arc<dyn ClassMembershipChecker> field
- `api-infra/src/traits/class_repo.rs` - Added NoopClassMembershipChecker stub implementation
- `api/src/main.rs` - Updated AppState construction with NoopClassMembershipChecker
- `api/src/auth/routes.rs` - Updated 2 test AppState constructions with NoopClassMembershipChecker
- `api/src/release_gate_tests.rs` - Updated test AppState construction with NoopClassMembershipChecker

## Decisions Made
- Used `Option<i64>` for school_id parameter in service methods: `None` means admin (see all orgs), `Some(id)` means scoped to that org
- Cache keys include org suffix (`leaderboard:global:org:{id}:...`) when tenant-scoped to prevent cross-tenant cache leakage
- NoopClassMembershipChecker returns empty Vec for any class_id -- sufficient for compilation, real wiring in Plan 05
- Adopted clippy suggestion to use `contains()` instead of `iter().any()` for membership check

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Clippy manual_contains warning**
- **Found during:** Task 2 (clippy verification)
- **Issue:** `students.iter().any(|s| *s == claims.sub)` flagged by clippy::manual_contains
- **Fix:** Changed to `students.contains(&claims.sub)`
- **Files modified:** domain-leaderboard/src/routes.rs
- **Verification:** `cargo clippy -p domain-leaderboard -- -D warnings` passes clean
- **Committed in:** 9bc4d62

---

**Total deviations:** 1 auto-fixed (1 clippy fix)
**Impact on plan:** Trivial -- idiomatic Rust improvement. No scope creep.

## Issues Encountered
None - all builds and clippy checks pass cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- domain-leaderboard crate compiles independently and passes clippy
- api crate compiles with new AppState field (using NoopClassMembershipChecker stub)
- Plan 05 needs to: wire real ClassService as ClassMembershipChecker in main.rs, integrate domain-leaderboard router into api's create_router, remove old api/src/leaderboard module

---
*Phase: 04-domain-extraction-complex-submissions-classes-leaderboard*
*Completed: 2026-04-15*

## Self-Check: PASSED

All created files verified present. Commit 9bc4d62 confirmed in git log.
