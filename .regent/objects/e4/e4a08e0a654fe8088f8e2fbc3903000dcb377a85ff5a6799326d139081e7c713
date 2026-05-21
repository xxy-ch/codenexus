---
phase: 08-import-export
verified: 2026-04-16T13:00:00Z
status: human_needed
score: 21/21 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Upload a valid problem ZIP and verify imported problem appears with correct description, test cases, and config"
    expected: "Problem created with all metadata and test cases matching the ZIP contents"
    why_human: "Requires running backend + database, end-to-end file upload flow"
  - test: "Export a problem as ZIP, then re-import it (round-trip test)"
    expected: "Re-imported problem is identical to original -- same title, description, test cases, config"
    why_human: "Requires running backend, file download + re-upload, visual comparison"
  - test: "Upload a user CSV with 100+ rows and verify all users created"
    expected: "All valid rows created as users with correct roles, duplicates skipped with clear message"
    why_human: "Requires running backend, large CSV creation, database state verification"
  - test: "Navigate to /batch-operations as a teacher and verify UI renders with 4 tabs"
    expected: "Page renders with Problem Import, Problem Export, User Import, User Export tabs"
    why_human: "Visual rendering and tab switching requires browser"
  - test: "Switch between tabs and verify state is preserved per tab"
    expected: "Each tab maintains independent state -- upload a file in one tab, switch away and back, file still present"
    why_human: "Interactive browser behavior"
---

# Phase 8: Import/Export Verification Report

**Phase Goal:** Implement problem and user import/export for batch operations. Teachers and admins can bulk-create problems and users.
**Verified:** 2026-04-16T13:00:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ZIP archive with problems/*/config.json + problem.md + testcases/* is parsed into ProblemImportItem structs | VERIFIED | `parse_problem_zip` in problem_import.rs (537 lines), 4 tests including multi-problem ZIP; all 60 domain-imex tests pass |
| 2 | Invalid ZIP entries (path traversal, symlinks, oversized) are rejected with structured errors | VERIFIED | `validate_zip_entry` in security.rs (273 lines) checks "..", absolute paths, symlinks, 10MB file limit; `validate_zip_archive` enforces 500 entries / 50MB |
| 3 | Problem data round-trips: export produces ZIP that re-imports with identical data | VERIFIED | `round_trip_test` in problem_import.rs verified passing; `build_problem_zip` in problem_export.rs (332 lines) with 6 tests including round-trip |
| 4 | CSV with username,role,campus_id,display_name,email header is parsed into UserImportRow structs | VERIFIED | `parse_user_csv` in user_import.rs (399 lines), 10 tests covering valid CSV, missing columns, duplicates, BOM |
| 5 | CSV injection payloads (leading =, +, -, @, tab) are stripped from cell values | VERIFIED | `sanitize_csv_cell` in security.rs; `sanitizes_csv_injection_payloads` test in user_import.rs passes |
| 6 | Duplicate detection returns items as skipped, not errors | VERIFIED | `marks_duplicate_for_existing_username` test in user_import.rs; execute handlers push to `skipped_items` for `ImportItemStatus::Duplicate` |
| 7 | POST /imex/import/problems/validate accepts ZIP multipart upload and returns preview with token | VERIFIED | `validate_problem_import` handler (lines 230-276 in routes.rs): extracts Multipart, queries existing titles, calls `parse_problem_zip` via spawn_blocking, caches with UUID token, auto-expires in 600s |
| 8 | POST /imex/import/problems/execute accepts token and creates problems in database | VERIFIED | `execute_problem_import` handler (lines 281-410): removes token from cache, downcasts CachedPreview::Problem, INSERT INTO problems + INSERT INTO test_cases per item |
| 9 | GET /imex/export/problems/:id returns ZIP file download for a single problem | VERIFIED | `export_problem` handler (lines 421-509): SELECT problem + test_cases from DB, calls `build_problem_zip` via spawn_blocking, returns with Content-Type: application/zip + Content-Disposition |
| 10 | POST /imex/import/users/validate accepts CSV + default_password multipart and returns preview with token | VERIFIED | `validate_user_import` handler (lines 515-566): requires admin role, validates password >= 6 chars, calls `parse_user_csv` via spawn_blocking, caches preview |
| 11 | POST /imex/import/users/execute accepts token and creates users in database | VERIFIED | `execute_user_import` handler (lines 571-695): requires admin role, bcrypt hashes password, INSERT INTO users + INSERT INTO user_roles per row |
| 12 | GET /imex/export/users returns CSV file download for users in the organization | VERIFIED | `export_users` handler (lines 704-753): requires admin role, SELECT with JOIN user_roles filtered by organization_id, calls `build_user_csv` via spawn_blocking, returns with Content-Type: text/csv |
| 13 | Preview token expires after 10 minutes | VERIFIED | Both validate handlers spawn tokio::time::sleep(Duration::from_secs(600)) then cache.remove(&token); tokens also single-use (removed on execute) |
| 14 | All import/export routes require teacher or higher role | VERIFIED | Problem routes use `require_teacher_plus`, user routes use `require_admin`; defined at lines 67 and 75 of routes.rs |
| 15 | User navigates to /batch-operations via sidebar link visible to teachers and admins | VERIFIED | Sidebar.tsx line 28: `{ label: 'Batch Ops', path: '/batch-operations', icon: 'upload_file', minRole: 'teacher' }`; App.tsx line 147: route with ProtectedRoute allowedRoles=TEACHER_ROLES |
| 16 | Problem Import tab shows file upload zone that accepts .zip files | VERIFIED | ProblemImportTab in BatchOperations.tsx: file input accept=".zip", client-side 50MB check, drag-and-drop handler |
| 17 | Problem Export tab shows problem selector with search and multi-select | VERIFIED | ProblemExportTab: search input with debounced fetch via problemsService, checkbox multi-select table, select all/deselect all |
| 18 | User Import tab shows CSV upload zone plus default password field | VERIFIED | UserImportTab: CSV file input, password input with min 6 char validation, "Validate CSV" button |
| 19 | User Export tab shows export button | VERIFIED | UserExportTab: "Export CSV" button calls imexService.exportUsers(), blob download |
| 20 | Uploading a valid ZIP shows preview table with item statuses | VERIFIED | ProblemImportTab previewing state renders Table with Title/Difficulty/Test Cases/Status columns, StatusBadge for valid/duplicate/error |
| 21 | Clicking Confirm Import triggers execute endpoint and shows result summary | VERIFIED | Both import tabs: Confirm Import in Dialog with destructive variant calls execute handler, shows created/skipped/error counts |

**Score:** 21/21 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `domain-imex/src/lib.rs` | Crate entry point, re-exports | VERIFIED | 9 lines, declares 6 public modules + pub use routes::imex_router |
| `domain-imex/src/models.rs` | All import/export types | VERIFIED | 388 lines, ProblemConfig, ProblemImportItem, UserImportRow, CachedPreview, response types |
| `domain-imex/src/security.rs` | ZIP/CSV security validation | VERIFIED | 273 lines, validate_zip_entry, validate_zip_archive, sanitize_csv_cell, SecurityError enum |
| `domain-imex/src/problem_import.rs` | ZIP parsing, problem validation | VERIFIED | 537 lines, parse_problem_zip, convert_to_create_request, convert_to_test_cases, 10 tests |
| `domain-imex/src/problem_export.rs` | Problem to ZIP serialization | VERIFIED | 332 lines, build_problem_zip, ExportProblem, ExportTestCase, slugify, 6 tests including round-trip |
| `domain-imex/src/user_import.rs` | CSV parsing, user validation | VERIFIED | 399 lines, parse_user_csv, convert_to_batch_request, 10 tests |
| `domain-imex/src/user_export.rs` | User to CSV serialization | VERIFIED | 152 lines, build_user_csv, UserExportRow, 4 tests including round-trip |
| `domain-imex/src/routes.rs` | All Axum route handlers | VERIFIED | 753 lines, imex_router with 6 routes, all handlers with real SQL queries, role checks, spawn_blocking |
| `api-infra/src/state.rs` | AppState with preview_cache | VERIFIED | `pub preview_cache: Arc<PreviewCache>` field, PreviewCache type alias |
| `api/src/main.rs` | Router registration for /imex | VERIFIED | `.nest("/imex", domain_imex::imex_router())` in protected_router |
| `frontend/src/services/imex.ts` | Frontend API service | VERIFIED | 47 lines, imexService with 6 typed methods, FormData for uploads, blob for downloads |
| `frontend/src/types/imex.ts` | TypeScript interfaces | VERIFIED | 61 lines, ImportPreview, ImportResult, PreviewItem, UserPreviewItem, etc. |
| `frontend/src/pages/admin/BatchOperations.tsx` | Batch Operations page with 4 tabs | VERIFIED | 1007 lines, 4 TabsTrigger/Content, ProblemImportTab/ExportTab/UserImportTab/ExportTab, Dialog, preview/confirm flow |
| `frontend/src/components/layout/Sidebar.tsx` | Sidebar with Batch Ops nav item | VERIFIED | "Batch Ops" entry with minRole: 'teacher' and upload_file icon |
| `frontend/src/App.tsx` | Route for /batch-operations | VERIFIED | lazy import + ProtectedRoute with TEACHER_ROLES |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| domain-imex/src/problem_import.rs | domain-problems/src/models.rs | `use domain_problems::models::CreateProblemRequest` | WIRED | Pattern found; convert_to_create_request returns CreateProblemRequest |
| domain-imex/src/user_import.rs | domain-users/src/models.rs | `use domain_users::models::BatchCreateUserInput` | WIRED | Pattern found; convert_to_batch_request returns BatchCreateUsersRequest |
| domain-imex/src/security.rs | domain-imex/src/problem_import.rs | validate_zip_entry called for each ZIP entry | WIRED | Pattern found in parse_problem_zip |
| api/src/main.rs | domain-imex/src/routes.rs | `.nest("/imex", domain_imex::imex_router())` | WIRED | Pattern found at line 181 |
| domain-imex/src/routes.rs | domain-imex/src/problem_import.rs | parse_problem_zip call in validate handler | WIRED | Line 251: spawn_blocking with parse_problem_zip |
| domain-imex/src/routes.rs | domain-imex/src/user_import.rs | parse_user_csv call in validate handler | WIRED | Line 538: spawn_blocking with parse_user_csv |
| domain-imex/src/routes.rs | api-infra/src/state.rs | State extractor accessing preview_cache | WIRED | Lines 263, 290, 550, 580: state.preview_cache.insert/remove accessed via State(state) |
| frontend/src/services/imex.ts | /imex/* endpoints | api.post / api.get calls | WIRED | 6 methods calling /imex/import/* and /imex/export/* |
| frontend/src/App.tsx | frontend/src/pages/admin/BatchOperations.tsx | lazy import + ProtectedRoute | WIRED | Line 57: lazyNamed import, line 147: route element |
| frontend/src/pages/admin/BatchOperations.tsx | frontend/src/services/imex.ts | `import { imexService }` | WIRED | Line 4: import, used at lines 63, 78, 392, 512, 527, 835 |
| frontend/src/components/layout/Sidebar.tsx | /batch-operations | navItems entry with minRole: 'teacher' | WIRED | Line 28: path '/batch-operations', minRole: 'teacher' |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| routes.rs validate_problem_import | `items` | parse_problem_zip via spawn_blocking | Yes -- SQL query for existing titles, real ZIP parsing | FLOWING |
| routes.rs execute_problem_import | `created_items` | INSERT INTO problems RETURNING id + INSERT INTO test_cases | Yes -- parameterized SQL with real DB writes | FLOWING |
| routes.rs export_problem | `zip_bytes` | SELECT problem + test_cases, build_problem_zip | Yes -- DB query + serialization | FLOWING |
| routes.rs validate_user_import | `rows` | parse_user_csv via spawn_blocking | Yes -- SQL query for existing usernames, real CSV parsing | FLOWING |
| routes.rs execute_user_import | `created_items` | INSERT INTO users + user_roles with bcrypt hash | Yes -- real DB writes | FLOWING |
| routes.rs export_users | `csv_bytes` | SELECT users with JOIN, build_user_csv | Yes -- DB query + serialization | FLOWING |
| BatchOperations.tsx ProblemImportTab | `preview` | imexService.validateProblemImport(file) | Yes -- FormData upload to /imex/import/problems/validate | FLOWING |
| BatchOperations.tsx UserExportTab | `blob` | imexService.exportUsers() | Yes -- blob download from /imex/export/users | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| domain-imex crate tests pass | `cargo test -p domain-imex --lib 2>&1 | tail -5` | 60 passed; 0 failed | PASS |
| Rust workspace compiles | `cargo check --workspace 2>&1 | tail -3` | Finished dev profile successfully | PASS |
| TypeScript compiles | `cd frontend && npx tsc --noEmit 2>&1 | tail -5` | No output (zero errors) | PASS |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| IMEX-01 | Problem ZIP import -- upload .zip with problem.md, test case files, config.json | SATISFIED | parse_problem_zip reads problems/*/config.json, problem.md, testcases/*.in/out; validate + execute handlers with real SQL INSERT |
| IMEX-02 | Problem ZIP export -- download any problem as .zip with same structure | SATISFIED | build_problem_zip creates problems/{slug}/config.json + problem.md + testcases/N.in + N.out; export_problem handler returns application/zip |
| IMEX-03 | User CSV import -- upload CSV with username, email, display_name, role | SATISFIED | parse_user_csv reads CSV header (username,role,campus_id,display_name,email); validate + execute handlers with bcrypt + SQL INSERT |
| IMEX-04 | User CSV export -- export user list with roles and status | SATISFIED | build_user_csv produces header + rows; export_users handler queries users JOIN user_roles, returns text/csv |
| IMEX-05 | Import validation -- validate archive/CSV structure before processing | SATISFIED | validate_zip_entry + validate_zip_archive for ZIP security; sanitize_csv_cell for CSV; validate_problem_import/validate_user_import return ImportPreviewResponse with per-item status |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| BatchOperations.tsx | 1007 | File exceeds 800-line guideline (1007 lines) | INFO | Plan 03 explicitly documented this decision: single-file with 4 sub-components keeps import/export UI cohesive |

No TODO/FIXME/PLACEHOLDER markers found in any file. No stub implementations. No empty handlers. All `return null` / `return {}` patterns absent.

### Human Verification Required

### 1. Problem ZIP upload end-to-end

**Test:** Start the backend (PostgreSQL + Redis), log in as teacher, navigate to /batch-operations, upload a valid problem ZIP with config.json + problem.md + test case files
**Expected:** Preview table shows problem items with Valid status. Clicking Confirm Import creates the problem with correct description, test cases, and config in the database.
**Why human:** Requires running backend services, file upload flow, database state verification

### 2. Problem round-trip (export then import)

**Test:** Export an existing problem as ZIP, then re-import the ZIP on a different organization or after renaming
**Expected:** Re-imported problem is identical to original -- same title, description, test cases, config values
**Why human:** Requires running backend, file download + re-upload, data comparison

### 3. User CSV bulk import

**Test:** Create a CSV with 100+ rows (mix of valid students, teachers, duplicates, invalid roles), upload as admin
**Expected:** All valid users created with correct roles and default password. Duplicates appear as skipped. Invalid roles appear as errors. No partial creation of failed rows.
**Why human:** Requires running backend, large CSV creation, database state verification

### 4. Batch Operations UI rendering

**Test:** Log in as teacher, navigate to /batch-operations via sidebar "Batch Ops" link
**Expected:** Page renders with 4 tabs (Problem Import, Problem Export, User Import, User Export). Each tab shows correct content. User Import tab includes Default Password field. User Export tab shows Export CSV button.
**Why human:** Visual rendering and interactive tab behavior require browser

### 5. Tab state independence

**Test:** Upload a file in Problem Import tab (but do not confirm), switch to User Export tab, switch back to Problem Import
**Expected:** Problem Import tab retains the uploaded file and preview state
**Why human:** Interactive browser state behavior across tab switches

### 6. User Import restricted to admin

**Test:** Log in as teacher (non-admin), attempt to access user import/export endpoints
**Expected:** API returns 403 Forbidden. UI should gracefully handle the error.
**Why human:** Requires running backend with different role accounts

### Gaps Summary

No gaps found in automated verification. All 21 observable truths verified. All 15 artifacts exist, are substantive, and are wired. All 11 key links confirmed. All 5 requirement IDs (IMEX-01 through IMEX-05) are satisfied by the implementation.

Data flows are complete: frontend service calls API endpoints, API handlers query real database with parameterized SQL, ZIP/CSV parsing uses spawn_blocking for CPU-bound work, preview tokens are cached with auto-expiry.

The phase requires human verification for end-to-end flows that need running services (PostgreSQL, Redis, API server, frontend dev server).

---

_Verified: 2026-04-16T13:00:00Z_
_Verifier: Claude (gsd-verifier)_
