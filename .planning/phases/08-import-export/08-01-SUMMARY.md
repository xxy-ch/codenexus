---
phase: 08-import-export
plan: 01
subsystem: api
tags: [zip, csv, import, export, security, validation, parsing]

requires:
  - phase: 04-domain-extraction-complex
    provides: domain-problems models, domain-users models, domain-problems test_cases
provides:
  - domain-imex crate with ZIP/CSV parsing and serialization
  - Problem import: parse_problem_zip, convert_to_create_request, convert_to_test_cases
  - Problem export: build_problem_zip with ExportProblem/ExportTestCase types
  - User import: parse_user_csv, convert_to_batch_request
  - User export: build_user_csv with UserExportRow type
  - Security: validate_zip_entry, validate_zip_archive, sanitize_csv_cell
  - Models: ProblemConfig, ProblemImportItem, UserImportRow, CachedPreview, preview/result types
affects: [08-02, api]

tech-stack:
  added: [zip 8.5, csv 1.4, tempfile 3]
  patterns: [ZIP archive security validation, CSV injection prevention, HashMap-based ZIP content extraction]

key-files:
  created:
    - domain-imex/Cargo.toml
    - domain-imex/src/lib.rs
    - domain-imex/src/models.rs
    - domain-imex/src/security.rs
    - domain-imex/src/problem_import.rs
    - domain-imex/src/problem_export.rs
    - domain-imex/src/user_import.rs
    - domain-imex/src/user_export.rs
  modified:
    - Cargo.toml

key-decisions:
  - "D-01: Read all ZIP entries into HashMap first to avoid ZipArchive borrow checker issues with multiple by_name calls"
  - "D-02: Manual header writing in build_user_csv to ensure header is always present even for empty user lists"
  - "D-03: Export uses local ExportProblem/ExportTestCase types instead of domain-problems types to keep domain-imex decoupled from DB-specific structs"

patterns-established:
  - "HashMap-based ZIP content extraction: read all entries into HashMap<String, Vec<u8>> in one pass, then process by path lookup"
  - "CSV import with BOM stripping: check for UTF-8 BOM prefix before parsing"
  - "Import status enum pattern: Valid/Duplicate/Error status per item with optional warning"
  - "Security-first parsing: validate all ZIP entries before processing, sanitize all CSV cells before use"

requirements-completed: [IMEX-01, IMEX-02, IMEX-03, IMEX-04, IMEX-05]

duration: 20min
completed: 2026-04-16
---

# Phase 8 Plan 1: Import/Export Crate Summary

**domain-imex crate with ZIP problem import/export, CSV user import/export, and security validation (60 tests)**

## Performance

- **Duration:** 20 min
- **Started:** 2026-04-16T11:07:14Z
- **Completed:** 2026-04-16T11:27:21Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Full domain-imex crate with 8 source files, zero warnings, 60 tests passing
- ZIP parsing with security: path traversal, symlink, bomb detection (500 files/50MB limits)
- CSV parsing with injection prevention: strips formula prefixes (=, +, -, @, tab)
- Problem round-trip: export produces ZIP that re-imports with identical data
- User round-trip: export produces CSV that re-imports with identical data

## Task Commits

Each task was committed atomically:

1. **Task 1: Create domain-imex crate scaffold, models, and security module** - `141eee6` (feat)
2. **Task 2: Implement problem import and export services** - `838355e` (feat)
3. **Task 3: Implement user import and export services** - `f3043b2` (feat)

## Files Created/Modified
- `Cargo.toml` - Added domain-imex to workspace members
- `domain-imex/Cargo.toml` - Crate manifest with zip, csv, tempfile dependencies
- `domain-imex/src/lib.rs` - Crate entry point declaring 6 public modules
- `domain-imex/src/models.rs` - All import/export types (ProblemConfig, ProblemImportItem, UserImportRow, preview/result types, CachedPreview)
- `domain-imex/src/security.rs` - ZIP validation (path traversal, bomb, symlink), CSV injection prevention, SecurityError enum
- `domain-imex/src/problem_import.rs` - parse_problem_zip, convert_to_create_request, convert_to_test_cases (10 tests)
- `domain-imex/src/problem_export.rs` - build_problem_zip, ExportProblem, ExportTestCase, slugify (6 tests)
- `domain-imex/src/user_import.rs` - parse_user_csv, convert_to_batch_request (10 tests)
- `domain-imex/src/user_export.rs` - build_user_csv, UserExportRow (4 tests)

## Decisions Made
- **HashMap-based ZIP extraction:** ZipArchive's by_name requires exclusive mutable borrow, so all entries are read into a HashMap in one pass. This also simplifies path-based lookups.
- **Manual CSV header writing:** csv::Writer only auto-generates headers from the first serialized struct. Manually writing the header ensures it is always present.
- **Local export types:** ExportProblem and ExportTestCase are local types rather than reusing domain-problems types, keeping domain-imex decoupled from DB-specific field types (e.g., Option<DateTime<Utc>>).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ZipArchive borrow checker conflict with multiple by_name calls**
- **Found during:** Task 2 (problem_import implementation)
- **Issue:** ZipArchive::by_name returns a ZipFile that borrows archive mutably. Multiple sequential by_name calls within the same scope fail to compile.
- **Fix:** Read all ZIP entry contents into a HashMap<String, Vec<u8>> in a single first pass, then process by path lookup from the HashMap.
- **Files modified:** domain-imex/src/problem_import.rs
- **Verification:** All 10 problem_import tests pass including round-trip
- **Committed in:** 838355e (Task 2 commit)

**2. [Rule 3 - Blocking] CSV Writer produces empty output for empty user list**
- **Found during:** Task 3 (user_export tests)
- **Issue:** csv::Writer::serialize only writes headers when the first record is serialized. Empty list produces no output at all.
- **Fix:** Use csv::WriterBuilder and manually write the header row with write_record before iterating users.
- **Files modified:** domain-imex/src/user_export.rs
- **Verification:** build_user_csv_handles_empty_list test passes
- **Committed in:** f3043b2 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for correct functionality. No scope creep.

## Issues Encountered
- Moved ProblemTestCaseConfig import to test module to eliminate unused import warning in non-test code

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- domain-imex crate ready for integration in Plan 08-02 (API route handlers)
- Route handlers will use parse_problem_zip/build_problem_zip and parse_user_csv/build_user_csv
- CachedPreview enum ready for Redis-backed preview caching
- convert_to_create_request and convert_to_batch_request ready for DB insertion via existing domain services

---
*Phase: 08-import-export*
*Completed: 2026-04-16*

## Self-Check: PASSED

All 9 created files verified present. All 3 task commits (141eee6, 838355e, f3043b2) verified in git history. 60 tests passing. Workspace compiles with zero warnings.
