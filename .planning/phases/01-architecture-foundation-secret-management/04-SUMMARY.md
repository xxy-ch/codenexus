---
phase: 01-architecture-foundation-secret-management
plan: 04
subsystem: infra, testing
tags: [rust, testcontainers, testkit, feature-flag, re-export, verification]

# Dependency graph
requires:
  - phase: 01-architecture-foundation-secret-management
    plan: 03
    provides: api-infra crate with error, rbac, middleware, websocket, traits, config modules
provides:
  - Feature-gated testkit module with testcontainers PG + Redis support
  - Fixture factories for test user creation
  - Verification that all re-export shims work transparently
  - Phase 1 success criteria sign-off (all 6 requirements verified)
affects: [02-basic-ci-domain-extraction, 03-domain-extraction-extended]

# Tech tracking
tech-stack:
  added:
    - testcontainers 0.23 (optional dep, testkit feature)
    - testcontainers-modules 0.11 with postgres (optional dep, testkit feature)
    - sqlx 0.8 (optional dep, testkit feature)
    - deadpool-redis 0.22 (optional dep, testkit feature)
  patterns:
    - Feature-gated test infrastructure: #[cfg(feature = "testkit")] keeps test code out of production
    - Async testcontainers API: AsyncRunner trait, async get_host_port_ipv4, GenericImage::new(name, tag)

key-files:
  created:
    - api-infra/src/testkit/mod.rs
    - api-infra/src/testkit/database.rs
    - api-infra/src/testkit/redis.rs
    - api-infra/src/testkit/fixtures.rs
  modified:
    - api-infra/Cargo.toml (added [features] section with testkit, 4 optional deps)
    - api-infra/src/lib.rs (added #[cfg(feature = "testkit")] pub mod testkit)

key-decisions:
  - "Optional dependencies for testkit: testcontainers, sqlx, deadpool-redis are optional, activated by feature flag"
  - "Async testcontainers 0.23 API: AsyncRunner trait import required, get_host_port_ipv4 is async, GenericImage::new takes (name, tag) pair"
  - "All re-export shims retained in api crate for Phase 1; will be removed when consumers are updated to use api_infra:: directly in later phases"

patterns-established:
  - "Testkit feature pattern: feature-gated module behind Cargo.toml [features] + #[cfg(feature = \"testkit\")]"
  - "TestFixture struct with Drop-based container cleanup"

requirements-completed: [ARCH-01, ARCH-02, ARCH-03, ARCH-06, SEC-01, SEC-06]

# Metrics
duration: 10min
completed: 2026-04-13
---

# Phase 1 Plan 04: Test Infrastructure + Final Cleanup + Verification Summary

**Feature-gated testkit module with testcontainers PG/Redis, fixture factories, and Phase 1 success criteria sign-off**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-13T13:25:19Z
- **Completed:** 2026-04-13T13:36:15Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added `testkit` feature-gated module to api-infra with testcontainers PostgreSQL and Redis support
- Created fixture factories (build_test_user, build_test_user_with_campus, random_uuid) with 3 passing unit tests
- Verified all 7 re-export shims work transparently -- no import changes needed in api crate
- Verified all Phase 1 success criteria: 103 workspace tests pass, all 6 requirements covered

## Task Commits

Each task was committed atomically:

1. **Task 04-01: Add testkit feature flag + testkit module to api-infra** - `8242f30` (feat)
2. **Task 04-02: Verify api crate imports resolve through re-export shims** - No commit (verification only, no code changes needed)
3. **Task 04-03: Final workspace verification + success criteria sign-off** - No commit (verification only)

## Files Created/Modified
- `api-infra/Cargo.toml` - Added [features] testkit = [...], 4 optional deps (testcontainers, testcontainers-modules, sqlx, deadpool-redis)
- `api-infra/src/lib.rs` - Added `#[cfg(feature = "testkit")] pub mod testkit`
- `api-infra/src/testkit/mod.rs` - TestFixture struct with PG + Redis container lifecycle
- `api-infra/src/testkit/database.rs` - PgTestContainer: async start, connection_url, create_pool
- `api-infra/src/testkit/redis.rs` - RedisTestContainer: async start, connection_url, create_pool
- `api-infra/src/testkit/fixtures.rs` - build_test_user, build_test_user_with_campus, random_uuid + 3 unit tests

## Decisions Made
- **Optional dependencies**: testcontainers, sqlx, deadpool-redis are optional deps activated by the `testkit` feature flag. This keeps production builds clean and lightweight.
- **Async testcontainers API**: Adapted plan to match testcontainers 0.23 actual API (AsyncRunner trait, async get_host_port_ipv4, GenericImage::new takes name+tag pair).
- **Re-export shims retained**: All 7 shims kept in api crate. No import path changes needed. Shims will be removed in future phases when consumers are updated.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted testkit code to testcontainers 0.23 async API**
- **Found during:** Task 04-01 (testkit module creation)
- **Issue:** Plan used testcontainers 0.23 sync API patterns (`.start()` without AsyncRunner, `get_host_port_ipv4` as sync, `GenericImage::new("redis").with_tag("7-alpine")`). Actual 0.23 API requires `AsyncRunner` trait import, async port resolution, and `GenericImage::new(name, tag)` with no `with_tag` method.
- **Fix:** Added `use testcontainers::runners::AsyncRunner`, made `connection_url` and `create_pool` async, used `GenericImage::new("redis", "7-alpine")`, removed unused `ImageExt` import
- **Files modified:** api-infra/src/testkit/database.rs, api-infra/src/testkit/redis.rs, api-infra/src/testkit/mod.rs
- **Verification:** `cargo build -p api-infra --features testkit` succeeds, 3 fixture tests pass
- **Committed in:** 8242f30 (Task 04-01 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking API mismatch)
**Impact on plan:** Necessary adaptation to actual crate API. No scope creep.

## Issues Encountered
- Config tests in api-infra have a test isolation issue: tests that set env vars (`APP_ENV`, `JWT_SECRET`, etc.) can interfere with each other during parallel execution. All 11 config tests pass when run with `--test-threads=1`. This is a pre-existing issue from Wave 3, not introduced by our changes.

## User Setup Required
None - no external service configuration required.

## Phase 1 Success Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| SC1 | `cargo build --workspace` succeeds with api-infra compiling independently | PASS | All 4 crates build independently |
| SC2 | All 8 repository traits defined with full method signatures | PASS | 8 repo traits + 2 service traits, `cargo doc` generates docs |
| SC3 | Application refuses to start if APP_ENV=production and secrets unset | PASS | 11 config tests pass (SEC-01 + SEC-06) |
| SC4 | Shared test infrastructure compiles and sample test passes | PASS | `cargo build -p api-infra --features testkit` + 3 fixture tests pass |
| SC5 | `cargo test --workspace` passes with same results as before | PASS | 103 tests pass, 0 fail, 20 ignored |

**Requirements covered:** ARCH-01, ARCH-02, ARCH-03, ARCH-06, SEC-01, SEC-06 -- all verified.

## Next Phase Readiness
- Phase 1 complete: api-infra crate has error, rbac, middleware, websocket, traits, config, testkit modules
- All 6 Phase 1 requirements verified
- 103 workspace tests pass
- Re-export shims provide backward compatibility for api crate consumers
- Ready for Phase 2 (Basic CI + Domain Extraction -- Core: Users, Problems)

---
*Phase: 01-architecture-foundation-secret-management*
*Completed: 2026-04-13*
