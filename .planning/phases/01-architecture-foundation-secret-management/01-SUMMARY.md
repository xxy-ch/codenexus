---
phase: 01-architecture-foundation-secret-management
plan: 01
subsystem: infra
tags: [rust, axum, modularization, rbac, error-handling]

# Dependency graph
requires: []
provides:
  - api-infra workspace crate with AppError and RbacService
  - Re-export shims in api crate for zero-change consumer compatibility
  - AppError::database() constructor for manual sqlx error conversion
affects: [02-basic-ci-domain-extraction, 03-domain-extraction-extended]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Re-export shim pattern for safe crate extraction
    - Cross-crate From impl constraints (orphan rule)

key-files:
  created:
    - api-infra/Cargo.toml
    - api-infra/src/lib.rs
    - api-infra/src/error.rs
    - api-infra/src/rbac.rs
  modified:
    - Cargo.toml
    - api/Cargo.toml
    - api/src/error.rs
    - api/src/rbac/mod.rs

key-decisions:
  - "From<sqlx::Error> for AppError cannot cross crate boundary due to orphan rule -- removed, no code path relied on it"
  - "AppError::database() constructor added to api-infra for future manual sqlx conversions"

patterns-established:
  - "Re-export shim: pub use api_infra::module::* in api/src/module/mod.rs"
  - "api-infra depends only on shared (no sqlx, no redis, no jsonwebtoken)"

requirements-completed: [ARCH-01]

# Metrics
duration: 8min
completed: 2026-04-13
---

# Phase 1 Plan 01: Create api-infra Shell + Move Independent Types Summary

**api-infra workspace crate with AppError and RbacService extracted from api, re-export shims maintain zero consumer changes**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-13T12:45:16Z
- **Completed:** 2026-04-13T12:53:51Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Created `api-infra` workspace crate with minimal dependency footprint (no sqlx, no redis, no jsonwebtoken)
- Moved `RbacService` (293 lines, 7 tests) to api-infra with full test pass
- Moved `AppError` enum with `IntoResponse` and `From<anyhow::Error>` to api-infra
- Established re-export shim pattern for backward-compatible extraction
- All 124 workspace tests pass, no circular dependencies

## Task Commits

Each task was committed atomically:

1. **Task 01-01: Create api-infra crate shell** - `ce309fe` (feat) -- pre-existing from prior work
2. **Task 01-02: Move RbacService to api-infra** - `55df5bb` (feat)
3. **Task 01-03: Move AppError to api-infra** - `c8f967f` (feat)

## Files Created/Modified
- `api-infra/Cargo.toml` - Crate manifest with shared/axum/tokio/serde/anyhow deps only
- `api-infra/src/lib.rs` - Module declarations (error, rbac)
- `api-infra/src/error.rs` - AppError enum, IntoResponse, From<anyhow::Error>, database() constructor
- `api-infra/src/rbac.rs` - RbacService with role-permission matrix and 7 unit tests
- `api/src/error.rs` - Re-export shim for AppError
- `api/src/rbac/mod.rs` - Re-export shim for RbacService

## Decisions Made
- **From<sqlx::Error> removed**: The Rust orphan rule prevents implementing a std trait (`From`) for a foreign type (`AppError` from api-infra) in the api crate. No existing code path relied on this impl -- routes use `anyhow::Result` services or `.map_err()`. Added `AppError::database()` constructor as a manual conversion alternative.
- **api-infra dependency scope**: Deliberately excludes sqlx, deadpool-redis, and jsonwebtoken to keep the crate lightweight and focused on pure infrastructure types.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Orphan rule blocks From<sqlx::Error> for AppError**
- **Found during:** Task 3 (Move AppError to api-infra)
- **Issue:** Plan assumed `From<sqlx::Error> for AppError` would compile in api crate via orphan rule exception. This is incorrect -- `From` is a std trait (not local), `sqlx::Error` is foreign, and `AppError` is foreign (now defined in api-infra). None of the three orphan rule conditions are satisfied.
- **Fix:** Removed `From<sqlx::Error>` impl. Verified no code path in the codebase relies on it (routes use `anyhow::Result` service methods or `.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?`). Added `AppError::database()` constructor in api-infra for any future manual sqlx conversions.
- **Files modified:** `api-infra/src/error.rs`, `api/src/error.rs`
- **Verification:** `cargo build --workspace` succeeds, `cargo test --workspace` passes all 124 tests
- **Committed in:** `c8f967f` (part of task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 orphan rule violation)
**Impact on plan:** Necessary for correctness. No scope creep. The `From<sqlx::Error>` impl was dead code in practice.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- api-infra crate is ready for additional type extractions (Plans 02-04 will move more components)
- Re-export shim pattern is established and verified
- No circular dependencies in the dependency graph
- All existing tests pass with identical results

---
*Phase: 01-architecture-foundation-secret-management*
*Completed: 2026-04-13*
