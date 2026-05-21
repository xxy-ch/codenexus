---
phase: 01-architecture-foundation-secret-management
plan: 03
subsystem: infra
tags: [rust, traits, config, security, sec-01, sec-06]

# Dependency graph
requires:
  - phase: 01-architecture-foundation-secret-management
    plan: 02
    provides: api-infra crate with error, rbac, middleware, websocket modules
provides:
  - 8 repository trait interfaces (UserRepo, ProblemRepo, SubmissionRepo, ContestRepo, ClassRepo, CommunityRepo, LeaderboardRepo, SearchRepo)
  - 2 service trait interfaces (SubmissionService, NotificationService)
  - AppConfig with SEC-01 production secret enforcement and SEC-06 CORS validation
  - AppStartupError for fail-fast configuration errors
  - api/src/main.rs wired to use AppConfig instead of scattered env var reads
affects: [02-basic-ci-domain-extraction, 03-domain-extraction-extended]

# Tech tracking
tech-stack:
  added:
    - async-trait 0.1 (api-infra dependency)
  patterns:
    - Repository trait pattern: each domain gets a trait in api-infra with input/filter/output struct companions
    - Service trait pattern for cross-domain communication
    - AppConfig::from_env() with environment-dependent validation
    - Development defaults with tracing warnings; production strict validation

key-files:
  created:
    - api-infra/src/traits/mod.rs
    - api-infra/src/traits/user_repo.rs
    - api-infra/src/traits/problem_repo.rs
    - api-infra/src/traits/submission_repo.rs
    - api-infra/src/traits/contest_repo.rs
    - api-infra/src/traits/class_repo.rs
    - api-infra/src/traits/community_repo.rs
    - api-infra/src/traits/leaderboard_repo.rs
    - api-infra/src/traits/search_repo.rs
    - api-infra/src/traits/submission_service.rs
    - api-infra/src/traits/notification_service.rs
    - api-infra/src/config.rs
  modified:
    - api-infra/src/lib.rs (added config + traits modules)
    - api-infra/Cargo.toml (added async-trait dep)
    - api/src/main.rs (replaced scattered env vars with AppConfig)

key-decisions:
  - "Traits define interfaces only with companion struct types; no sqlx dependency in api-infra"
  - "Empty secret strings treated as unset to prevent whitespace-only secrets in production"
  - "Development CORS defaults to wildcard with explicit config field for production"
  - "AppConfig stays in api-infra (no DB dependency) -- AppState remains in api crate"

patterns-established:
  - "Repository trait pattern: #[async_trait] pub trait XxxRepo: Send + Sync with Result<T, AppError> returns"
  - "Companion structs in same file: CreateXxxInput, XxxFilter, XxxSummary"
  - "AppEnv enum controls behavior: Production (strict), Development (permissive), Test (isolated)"

requirements-completed: [ARCH-02, ARCH-03, SEC-01, SEC-06]

# Metrics
duration: 7min
completed: 2026-04-13
---

# Phase 1 Plan 03: Define Trait Interfaces + AppConfig with SEC-01/SEC-06 Summary

**8 repository traits, 2 service traits, and AppConfig with production secret enforcement and CORS validation in api-infra**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-13T13:12:34Z
- **Completed:** 2026-04-13T13:19:55Z
- **Tasks:** 6
- **Files modified:** 14

## Accomplishments
- Defined 8 repository trait interfaces (71 total methods) and 2 service trait interfaces (7 methods) in api-infra
- Created AppConfig with SEC-01 enforcement: production fails if JWT_SECRET or WORKER_SECRET missing
- Created AppConfig with SEC-06 enforcement: production CORS defaults to empty (not wildcard)
- Wired api/src/main.rs to use AppConfig, removing hardcoded default secrets
- 11 unit tests verifying SEC-01 and SEC-06 behavior across all environment modes
- Full workspace builds and all 103 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 03-01: Add async-trait dep + traits module structure** - `aeb5f7e` (feat) -- pre-existing from prior wave
2. **Task 03-02: Define 8 repository trait interfaces** - `6f7bb35` (feat)
3. **Task 03-03: Define 2 service trait interfaces** - `d4ec27a` (feat)
4. **Task 03-04: Create AppConfig with SEC-01/SEC-06 validation** - `011a37e` (feat)
5. **Task 03-05: Wire AppConfig into api/src/main.rs** - `d4d303e` (feat)
6. **Task 03-06: Verify SEC-01 + SEC-06 with unit tests** - verified, tests included in 03-04 commit

## Files Created/Modified
- `api-infra/Cargo.toml` - Added async-trait 0.1 dependency
- `api-infra/src/traits/mod.rs` - Module declarations for 10 trait files
- `api-infra/src/traits/user_repo.rs` - UserRepo trait (9 methods) + input/filter structs
- `api-infra/src/traits/problem_repo.rs` - ProblemRepo trait (10 methods) + test case structs
- `api-infra/src/traits/submission_repo.rs` - SubmissionRepo trait (8 methods) + filter structs
- `api-infra/src/traits/contest_repo.rs` - ContestRepo trait (11 methods) + participant/problem structs
- `api-infra/src/traits/class_repo.rs` - ClassRepo trait (11 methods) + assignment structs
- `api-infra/src/traits/community_repo.rs` - CommunityRepo trait (11 methods) + discussion/blog/message structs
- `api-infra/src/traits/leaderboard_repo.rs` - LeaderboardRepo trait (6 methods) + entry/rank structs
- `api-infra/src/traits/search_repo.rs` - SearchRepo trait (5 methods) + result/filter structs
- `api-infra/src/traits/submission_service.rs` - SubmissionService trait (3 methods)
- `api-infra/src/traits/notification_service.rs` - NotificationService trait (4 methods)
- `api-infra/src/config.rs` - AppConfig, AppEnv, AppStartupError + 11 unit tests
- `api-infra/src/lib.rs` - Added config and traits modules
- `api/src/main.rs` - Replaced 6 scattered env var reads with AppConfig::from_env(), config-based CORS

## Decisions Made
- **Companion struct co-location**: Input, filter, and summary structs are defined in the same file as their trait. This keeps related types together and makes the trait file self-contained.
- **Empty string = unset**: Empty secret environment variables are treated identically to missing ones. This prevents whitespace-only secrets from passing validation in production.
- **CORS default split**: Development gets wildcard CORS for convenience; production defaults to empty origins list when CORS_ORIGINS is not set, forcing explicit configuration.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- api-infra crate now contains: error, rbac, middleware (tenant, authz, permission), websocket (server, message), traits (8 repo + 2 service), config (AppConfig + AppStartupError)
- 10 trait interfaces ready for domain crate implementations in Phase 2
- SEC-01 and SEC-06 security requirements satisfied with 11 passing tests
- No sqlx dependency in api-infra; no hardcoded secrets in main.rs
- All 103 workspace tests pass
- Ready for Phase 2 (domain crate extraction) or additional Phase 1 plans

---
*Phase: 01-architecture-foundation-secret-management*
*Completed: 2026-04-13*
