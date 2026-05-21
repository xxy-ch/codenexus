---
phase: 05-security-technical-debt-clearance
plan: 01
subsystem: api, infra
tags: [cors, security, redis, deadpool, startup-logging]

# Dependency graph
requires:
  - phase: 04-domain-extraction-complex-submissions-contests-classes-leaderboard
    provides: "Domain crates with normalized Redis pooling via deadpool_redis::Pool"
provides:
  - "CORS startup warning log when wildcard is active"
  - "CORS startup info log with origin count when explicit origins configured"
  - "Verified API-side Redis pooling completeness (SEC-05 satisfied)"
affects: [06-full-cicd-observability, 09-judge-concurrency-fault-tolerance]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Environment-aware startup logging for security-sensitive configuration"]

key-files:
  created: []
  modified:
    - "api/src/main.rs"

key-decisions:
  - "D-13: CORS wildcard only in development, explicit origins required in production (carried forward)"
  - "D-14: SEC-05 Redis pooling scope is API-only; judge-worker deferred to Phase 9 (carried forward)"

patterns-established:
  - "Startup warning pattern: log security-sensitive config at server start for operational visibility"

requirements-completed: [SEC-02, SEC-05]

# Metrics
duration: 5min
completed: 2026-04-15
---

# Phase 5 Plan 01: CORS Hardening + Redis Pooling Verification Summary

**CORS startup warning for wildcard detection and API-side Redis pooling completeness verified (SEC-02 + SEC-05)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-15T05:53:40Z
- **Completed:** 2026-04-15T05:58:51Z
- **Tasks:** 2 (1 code change, 1 verification-only)
- **Files modified:** 1

## Accomplishments

- Added startup warning log when CORS wildcard (*) is active and info log when explicit origins are configured
- Verified all API-side Redis operations use `deadpool_redis::Pool` exclusively -- no raw `redis::Client` leaks
- Confirmed judge-worker raw `redis::Client` usage is expected and documented as Phase 9 scope (D-14)

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden CORS layer and add startup warning** - `3465290` (feat)
2. **Task 2: Verify Redis pooling completeness** - Verification only, no code changes

## Files Created/Modified

- `api/src/main.rs` - Added CORS startup warning (wildcard) and info (explicit origins) logging in `create_router()`

## Decisions Made

- Carried forward D-13 (environment-aware CORS) and D-14 (SEC-05 API-only scope) -- no new decisions needed
- Pre-existing config test failures (parallel `std::env` race conditions) documented as out of scope

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing `api-infra` config test failures when run in parallel (6 of 11 tests flake due to shared `std::env` state). Tests pass 36/36 when run serially. This is a pre-existing issue not caused by this plan's changes and is out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SEC-02 (CORS hardening) satisfied with startup warning logging
- SEC-05 (Redis pooling) satisfied for API scope; judge-worker deferred to Phase 9 per D-14
- Ready for remaining Phase 5 plans (SEC-04 dead code audit, etc.)

## Self-Check: PASSED

- FOUND: api/src/main.rs (modified file)
- FOUND: .planning/phases/05-security-technical-debt-clearance/05-01-SUMMARY.md
- FOUND: commit 3465290

---
*Phase: 05-security-technical-debt-clearance*
*Completed: 2026-04-15*
