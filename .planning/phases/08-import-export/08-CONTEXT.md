# Phase 8: Import/Export - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement problem and user import/export for batch operations. Teachers and admins can upload ZIP archives to bulk-create problems and CSV files to bulk-create users, with validation, preview, and structured error reporting. Export reverses the process for round-trip compatibility.

</domain>

<decisions>
## Implementation Decisions

### Problem ZIP Import/Export (IMEX-01, IMEX-02)
- **D-01:** Multi-problem ZIP structure — each problem occupies its own subfolder: `problems/{slug}/problem.md`, `problems/{slug}/config.json`, `problems/{slug}/testcases/1.in` + `1.out`. A single ZIP can contain multiple problems.
  - **Why:** User chose multi-problem subfolder layout over flat single-problem archives. Allows bulk import of problem sets.
  - **How to apply:** ZIP root contains `problems/` directory. Each subdirectory is one problem. `config.json` defines metadata and test case file mapping.

- **D-02:** config.json contains full problem metadata (title, difficulty, time_limit, memory_limit, is_public, visibility, tags, source_url, author_note) plus explicit test_cases array mapping {input_file, output_file, is_hidden, score, order}.
  - **Why:** User chose full metadata + explicit test case mapping over convention-based auto-discovery. Gives authors complete control.
  - **How to apply:** Parse config.json into CreateProblemRequest + BatchImportTestCasesRequest. Test case files referenced by filename in config.json are read from the same subfolder.

- **D-03:** Problem description uses Markdown (problem.md). Standard format already used by the platform.
  - **Why:** Markdown is the existing description format. No conversion needed.
  - **How to apply:** Read problem.md as problem.description directly.

### Import Conflict Handling (IMEX-05)
- **D-04:** Best-effort import — successful items are created, failed items are skipped. Final response returns both success list and error list with per-item details.
  - **Why:** User chose best-effort over all-or-nothing. Partial success is preferred over losing all work due to one bad entry.
  - **How to apply:** Process each item in a loop. Collect successes and failures separately. Return structured response: `{created: [...], skipped: [{item, reason}], errors: [{item, reason}]}`.

- **D-05:** Duplicate detection: problems are duplicate if same organization_id + title already exists. Users are duplicate if same username already exists. Duplicates are treated as "skipped" (not errors).
  - **Why:** User chose org-scoped title uniqueness for problems and username uniqueness for users.
  - **How to apply:** Before creating each item, check existence by org_id+title or username. If exists, add to skipped list with reason "already exists".

### User CSV Import/Export (IMEX-03, IMEX-04)
- **D-06:** CSV required fields: username, role, campus_id, display_name. Optional fields: email. Header row is mandatory.
  - **Why:** User specified these four fields as required for user provisioning.
  - **How to apply:** Validate CSV header contains all required columns. Reject CSV with missing required columns immediately (validation error before processing).

- **D-07:** Password strategy: uniform default password provided at upload time. All imported users receive the same password. The default password is a required parameter in the import request (not in the CSV).
  - **Why:** User chose simple default password approach over auto-generated or per-user passwords.
  - **How to apply:** Frontend prompts for default password when uploading CSV. API receives {file, default_password} as multipart form data.

### Frontend UX
- **D-08:** Dedicated "Batch Operations" page (not embedded in existing management pages). Accessible to teachers and admins via sidebar navigation.
  - **Why:** User chose a standalone page over integrating into existing admin/teacher pages.
  - **How to apply:** New route `/batch-operations` or `/import-export` with tabs/sections for Problem Import, Problem Export, User Import, User Export.

- **D-09:** Upload → Preview → Confirm flow. File is uploaded and parsed server-side, validation results are returned as a preview (item counts, warnings, errors). User reviews preview, then clicks "Confirm" to execute the actual import.
  - **Why:** User chose preview-first flow for safety. Prevents accidental bad imports.
  - **How to apply:** Two API endpoints per import type: (1) POST /import/problems/validate — parses ZIP, returns preview without creating data. (2) POST /import/problems/execute — takes a validation token or re-uploads and performs actual import.

### Claude's Discretion
- Exact crate choices for ZIP handling (zip crate) and CSV parsing (csv crate)
- Validation error message format and i18n
- Export file naming convention (timestamp-based vs slug-based)
- Maximum file size limits for uploads
- Rate limiting for import endpoints
- Test coverage for import/export service layer
- Preview data caching strategy (in-memory vs Redis)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Problem Domain
- `domain-problems/src/models.rs` — Problem struct, CreateProblemRequest, TestCase models
- `domain-problems/src/test_cases.rs` — BatchImportTestCasesRequest, test case batch import pattern
- `domain-problems/src/routes.rs` — Existing problem routes (direct SQL pattern)

### User Domain
- `domain-users/src/models.rs` — RegisterRequest, BatchCreateUsersRequest, BatchCreateUserInput
- `domain-users/src/service.rs` — UserService, batch creation logic
- `domain-users/src/routes.rs` — Existing user routes

### API Infrastructure
- `api/src/main.rs` — Router registration pattern, middleware stacking
- `api/Cargo.toml` — Current dependencies (need to add zip, csv, multipart)

### Existing Batch Patterns
- `domain-problems/src/test_cases.rs` — BatchImportTestCasesRequest shows how batch imports are already handled (JSON API)
- `domain-users/src/routes.rs` — Batch user creation endpoint shows existing bulk pattern

### Frontend
- `frontend/src/pages/` — Existing page layout patterns
- `frontend/src/services/` — API service layer pattern
- `frontend/src/components/ui/` — Shared UI components

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BatchImportTestCasesRequest` in domain-problems: Already handles batch test case creation — import can reuse this struct
- `BatchCreateUsersRequest` in domain-users: Already handles batch user creation — CSV import can convert to this struct
- `domain-problems/src/test_cases.rs` batch import endpoint: Pattern for bulk database operations
- axum's `Multipart` extractor: Available in axum 0.7 — just not used yet

### Established Patterns
- Domain crate routes use direct SQL queries (domain-problems) or service layer (domain-users)
- Batch operations return structured responses with success/failure lists
- Multi-tenant filtering via organization_id on all queries
- Frontend services are plain objects with async methods calling axios

### Integration Points
- ZIP import → parse config.json → CreateProblemRequest + BatchImportTestCasesRequest → existing creation flows
- CSV import → parse CSV rows → BatchCreateUsersRequest → existing batch user creation
- Export reverses: existing data → serialize to ZIP/CSV format
- Frontend: new /import-export page with upload components

</code_context>

<specifics>
## Specific Ideas

- config.json test_cases format: `[{input_file: "testcases/1.in", output_file: "testcases/1.out", is_hidden: false, score: 10, order: 1}]`
- ZIP directory structure: `problems/{slug}/problem.md`, `problems/{slug}/config.json`, `problems/{slug}/testcases/*`
- CSV header example: `username,role,campus_id,display_name,email`
- Preview response format: `{total: N, valid: M, warnings: [...], errors: [...], preview_items: [...]}`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-import-export*
*Context gathered: 2026-04-16*
