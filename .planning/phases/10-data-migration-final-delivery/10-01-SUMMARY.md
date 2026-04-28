---
phase: 10-data-migration-final-delivery
plan: 01
subsystem: database, cli
tags: [mysql, postgresql, sql-dump-parser, clap, migration, uoj]

# Dependency graph
requires:
  - phase: none
    provides: "greenfield crate creation"
provides:
  - "migration-tool workspace crate with CLI entry point"
  - "SQL dump parser for mysqldump 10.13 format"
  - "14 UOJ source data model structs"
  - "ParsedDump struct for parser output"
affects: [10-02, 10-03, 10-04, 10-05]

# Tech tracking
tech-stack:
  added: [clap-4, md-5-0.11, bcrypt-0.16, regex-1.11]
  patterns: [character-by-character-state-machine-parser, clap-derive-cli]

key-files:
  created:
    - migration-tool/Cargo.toml
    - migration-tool/src/lib.rs
    - migration-tool/src/main.rs
    - migration-tool/src/models.rs
    - migration-tool/src/parser.rs
  modified:
    - Cargo.toml

key-decisions:
  - "Split crate into lib.rs + main.rs to enable cargo test --lib"
  - "All UOJ model fields as String since parser returns string values"
  - "Character-by-character state machine for SQL value parsing, not regex splitting"
  - "clap env feature added for DATABASE_URL environment variable support"

patterns-established:
  - "State machine parser: track in_string/in_parens booleans for MySQL escape handling"
  - "All 14 UOJ structs use String fields for parser compatibility; conversion happens at migration time"

requirements-completed: [MIGR-01, MIGR-06]

# Metrics
duration: 9min
completed: 2026-04-18
---

# Phase 10 Plan 01: Migration Tool Crate Summary

**migration-tool workspace crate with CLI, character-by-character SQL dump parser, and 14 UOJ source data models (23 tests passing)**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-17T23:51:29Z
- **Completed:** 2026-04-18T00:00:27Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created migration-tool as a standalone workspace crate with all required dependencies (clap, sqlx, regex, md-5, bcrypt)
- CLI accepts 5 flags per D-10-1 and D-10-4: --dump-file, --database-url, --test-case-dir, --org-id, --create-default-org
- SQL dump parser with character-by-character state machine handles MySQL string escaping (\\, \', \0, \n), NULL values, hex-encoded blobs (0x...), empty strings, and multi-row INSERT statements
- 14 UOJ source data structs matching actual UOJ schema: UojUser, UojProblem, UojProblemContent, UojProblemTag, UojSubmission, UojContest, UojContestProblem, UojContestRegistrant, UojContestSubmission, UojBlog, UojBlogComment, UojBlogTag, UojBestAcSubmission, UojClickZan, UojUserMsg
- 23 unit tests passing: 7 CLI parsing, 10 parser behaviors, 6 model construction

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Create migration-tool crate + CLI + models + parser** - `f51dfeb` (feat)

_Note: Both plan tasks were combined into a single commit since the parser and models are co-dependent_

## Files Created/Modified
- `Cargo.toml` - Added "migration-tool" to workspace members
- `migration-tool/Cargo.toml` - Crate definition with 13 dependencies
- `migration-tool/src/lib.rs` - Public API: Cli struct, run() orchestrator, module re-exports, CLI tests
- `migration-tool/src/main.rs` - Binary entry point calling lib::run()
- `migration-tool/src/models.rs` - 14 UOJ source structs + ParsedDump, model construction tests
- `migration-tool/src/parser.rs` - parse_dump() + parse_values() + extract_table_name(), 10 parser tests

## Decisions Made
- Split crate into lib.rs + main.rs to enable `cargo test -p migration-tool --lib` (binary-only crates cannot run --lib tests)
- All UOJ model fields as String since the parser returns string values; type conversion happens at migration time in mapper.rs
- Character-by-character state machine for SQL value parsing instead of regex splitting (regex is too fragile for MySQL escaping rules per RESEARCH.md)
- Added `env` feature to clap for DATABASE_URL environment variable support

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added clap env feature for DATABASE_URL**
- **Found during:** Task 1 (initial build)
- **Issue:** clap 4 derive `env = "DATABASE_URL"` requires the `env` feature flag
- **Fix:** Added `"env"` to clap features in Cargo.toml
- **Files modified:** migration-tool/Cargo.toml
- **Verification:** Build succeeded after fix
- **Committed in:** f51dfeb (Task 1 commit)

**2. [Rule 3 - Blocking] Moved Cli and run() from main.rs to lib.rs**
- **Found during:** Task 1 (test execution)
- **Issue:** `cargo test -p migration-tool --lib` fails with "no library targets found" for binary-only crates
- **Fix:** Created lib.rs with Cli struct, run(), and tests; simplified main.rs to 4-line binary entry point
- **Files modified:** migration-tool/src/lib.rs, migration-tool/src/main.rs
- **Verification:** All 23 tests pass via `cargo test -p migration-tool --lib`
- **Committed in:** f51dfeb (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both necessary for build and test infrastructure. No scope creep.

## Issues Encountered
- Backticks in Rust string literals cause tokenizer errors in `format!()` macro -- resolved by using raw string literals (`r"..."`) or constructing strings differently

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- migration-tool crate compiles and all tests pass
- Parser ready for real UOJ SQL dump files (mysqldump 10.13 format)
- CLI skeleton ready for migration orchestration in subsequent plans (10-02 through 10-05)
- Next plan (10-02) will add mapper.rs, migrator.rs, id_map.rs, test_cases.rs, and password.rs

## Self-Check: PASSED

- FOUND: migration-tool/Cargo.toml
- FOUND: migration-tool/src/lib.rs
- FOUND: migration-tool/src/main.rs
- FOUND: migration-tool/src/models.rs
- FOUND: migration-tool/src/parser.rs
- FOUND: 10-01-SUMMARY.md
- FOUND: commit f51dfeb

---
*Phase: 10-data-migration-final-delivery*
*Completed: 2026-04-18*
