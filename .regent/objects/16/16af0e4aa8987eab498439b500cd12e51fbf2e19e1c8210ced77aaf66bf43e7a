---
phase: 10-data-migration-final-delivery
plan: 02
subsystem: database, migration
tags: [id-mapping, field-mapper, password-prefix, migrator-orchestrator, user-migration]

# Dependency graph
requires:
  - phase: 10
    plan: 01
    provides: "migration-tool crate, SQL dump parser, UOJ data models"
provides:
  - "Persistent ID mapping table + in-memory HashMap (id_map.rs)"
  - "Pure field mapping functions for all UOJ-to-AlgoMaster conversions (mapper.rs)"
  - "{MD5} password prefix marker utility (password.rs)"
  - "Migrator orchestrator with organization validation and user migration (migrator.rs)"
  - "run() wiring: parse dump -> migrate org -> create Migrator -> run pipeline"
affects: [10-03, 10-04, 10-05]

# Tech tracking
tech-stack:
  added: [sqlx-PgPool-IdMap, serde_json-extra_config-parser]
  patterns: [persistent-mapping-table-with-in-memory-cache, dependency-ordered-migration, md5-password-prefix-marker]

key-files:
  created:
    - migration-tool/src/id_map.rs
    - migration-tool/src/mapper.rs
    - migration-tool/src/password.rs
    - migration-tool/src/migrator.rs
  modified:
    - migration-tool/src/lib.rs

key-decisions:
  - "Unit tests using PgPool::connect_lazy require #[tokio::test] annotation"
  - "Combined Task 1 and Task 2 into single commit since migrator.rs depends on all modules"
  - "test_case_dir field warning suppressed as it will be used in Plan 10-03"

patterns-established:
  - "IdMap get_or_insert: check HashMap first, persist to DB, load actual value for concurrency safety"
  - "Migrator::migrate_organization: static method called before Migrator instantiation to get org_id"
  - "User migration: email dedup via HashSet, {MD5} prefix on passwords, skip banned users"

requirements-completed: [MIGR-02]

# Metrics
duration: 5min
completed: 2026-04-18
---

# Phase 10 Plan 02: Migration Infrastructure + Org/User Migration Summary

**ID mapping with persistent table + in-memory HashMap, pure field mapping functions (45 new tests), password prefix marker, and migrator orchestrator with organization validation and full user migration pipeline**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-18T00:04:37Z
- **Completed:** 2026-04-18T00:09:40Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created id_map.rs with migration_mappings table (D-10-5), in-memory HashMap cache, and idempotent get_or_insert (D-10-7)
- Created mapper.rs with 8 pure field-mapping functions: map_usergroup_to_role, map_language, map_status_verdict, generate_slug, generate_synthetic_email, parse_extra_config, map_visibility
- Created password.rs with format_md5_prefix for transparent MD5-to-bcrypt migration (D-10-2)
- Created migrator.rs with Migrator struct orchestrating organization validation (D-10-4), system user creation (D-10-11), and full user migration with role mapping (D-10-10), email dedup, and {MD5} password prefix
- Updated lib.rs run() to wire parser output into Migrator pipeline
- 68 total tests passing (45 new), 1 ignored (integration test needing real DB)

## Task Commits

1. **Task 1+2: ID mapping + mapper + password + migrator orchestrator + org/user migration** - `a46a8fb` (feat)

## Files Created/Modified
- `migration-tool/src/id_map.rs` - IdMap struct with PgPool, HashMap, migration_mappings table, get/get_or_insert/contains/len/is_empty methods, 6 tests (5 unit + 1 ignored integration)
- `migration-tool/src/mapper.rs` - 8 pure mapping functions with 38 unit tests covering all field conversions
- `migration-tool/src/password.rs` - format_md5_prefix with 3 tests
- `migration-tool/src/migrator.rs` - Migrator struct with migrate_organization, migrate_users, create_migration_system_user, run methods
- `migration-tool/src/lib.rs` - Updated module declarations and run() to call migrator pipeline

## Decisions Made
- Unit tests using PgPool::connect_lazy require #[tokio::test] annotation since sqlx pool creation needs a Tokio runtime context
- Combined Task 1 (infrastructure modules) and Task 2 (migrator + org/user) into a single commit since migrator.rs directly depends on all four new modules
- test_case_dir field produces a dead_code warning which is expected and will be resolved in Plan 10-03 when problem migration uses it

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PgPool::connect_lazy requires Tokio context in tests**
- **Found during:** Task 1 test execution
- **Issue:** IdMap unit tests using PgPool::connect_lazy panicked with "this functionality requires a Tokio context"
- **Fix:** Changed affected tests from `#[test]` to `#[tokio::test]` and `fn` to `async fn`
- **Files modified:** migration-tool/src/id_map.rs
- **Verification:** All 68 tests pass

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep. Fix was infrastructure-only.

## Next Phase Readiness
- Migrator orchestrator ready for Plan 10-03 (problem + test case migration)
- id_map module ready for all entity ID remapping
- mapper functions ready for all UOJ-to-AlgoMaster field conversions
- User migration handles banned users, email dedup, role mapping, {MD5} password prefix
- System migration user (uoj_migration) created for problem ownership (D-10-11)

## Self-Check: PASSED

- FOUND: migration-tool/src/id_map.rs
- FOUND: migration-tool/src/mapper.rs
- FOUND: migration-tool/src/password.rs
- FOUND: migration-tool/src/migrator.rs
- FOUND: migration-tool/src/lib.rs
- FOUND: commit a46a8fb

---
*Phase: 10-data-migration-final-delivery*
*Completed: 2026-04-18*
