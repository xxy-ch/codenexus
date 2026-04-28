# Phase 8: Import/Export - Research

**Researched:** 2026-04-16
**Domain:** Rust (Axum) backend file upload/parsing, React frontend file upload UX
**Confidence:** HIGH

## Summary

Phase 8 implements problem ZIP import/export and user CSV import/export for batch operations. The backend needs three new crate dependencies (`zip`, `csv`, and axum's `multipart` feature), a new domain crate `domain-imex` to house import/export logic, and a new frontend page `/batch-operations` with upload/preview/confirm UX.

The existing codebase already has batch creation patterns that this phase will reuse: `BatchImportTestCasesRequest` in `domain-problems` and `BatchCreateUsersRequest` in `domain-users`. The import logic converts uploaded files into these existing request types, then delegates to the existing creation flows. This avoids duplicating business logic.

Security is a primary concern: ZIP archives can contain path traversal attacks (Zip Slip), ZIP bombs (extreme compression ratios), and malicious symlinks. The `zip` crate v8.5.1 includes patches for CVE-2025-29787, but additional validation is still required. CSV uploads can contain injection payloads and must be validated per-row.

**Primary recommendation:** Create a new `domain-imex` crate for import/export routing and parsing logic. Reuse existing batch creation service methods from `domain-problems` and `domain-users`. Add `zip = "8.5"`, `csv = "1.4"`, and axum `multipart` feature as new dependencies. Use a two-endpoint pattern per import type (validate then execute) with in-memory preview caching via a UUID token.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Multi-problem ZIP structure -- each problem occupies its own subfolder: `problems/{slug}/problem.md`, `problems/{slug}/config.json`, `problems/{slug}/testcases/1.in` + `1.out`. A single ZIP can contain multiple problems.
- **D-02:** config.json contains full problem metadata (title, difficulty, time_limit, memory_limit, is_public, visibility, tags, source_url, author_note) plus explicit test_cases array mapping {input_file, output_file, is_hidden, score, order}.
- **D-03:** Problem description uses Markdown (problem.md). Standard format already used by the platform.
- **D-04:** Best-effort import -- successful items are created, failed items are skipped. Final response returns both success list and error list with per-item details.
- **D-05:** Duplicate detection: problems are duplicate if same organization_id + title already exists. Users are duplicate if same username already exists. Duplicates are treated as "skipped" (not errors).
- **D-06:** CSV required fields: username, role, campus_id, display_name. Optional fields: email. Header row is mandatory.
- **D-07:** Password strategy: uniform default password provided at upload time. All imported users receive the same password. The default password is a required parameter in the import request (not in the CSV).
- **D-08:** Dedicated "Batch Operations" page (not embedded in existing management pages). Accessible to teachers and admins via sidebar navigation.
- **D-09:** Upload -> Preview -> Confirm flow. File is uploaded and parsed server-side, validation results are returned as a preview (item counts, warnings, errors). User reviews preview, then clicks "Confirm" to execute the actual import.

### Claude's Discretion
- Exact crate choices for ZIP handling (zip crate) and CSV parsing (csv crate)
- Validation error message format and i18n
- Export file naming convention (timestamp-based vs slug-based)
- Maximum file size limits for uploads
- Rate limiting for import endpoints
- Test coverage for import/export service layer
- Preview data caching strategy (in-memory vs Redis)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMEX-01 | Problem ZIP import -- upload .zip with problem.md, test case files, config.json | `zip` crate 8.5.1 for reading archives; axum `Multipart` extractor for upload; config.json parsed to `CreateProblemRequest` + `BatchImportTestCasesRequest` |
| IMEX-02 | Problem ZIP export -- download any problem as .zip with same structure | `zip` crate for writing archives; reverse of import: DB data -> config.json + problem.md + test case files |
| IMEX-03 | User CSV import -- upload CSV with username, email, display_name, role | `csv` crate 1.4 for parsing; rows mapped to `BatchCreateUsersRequest`; default_password from multipart field |
| IMEX-04 | User CSV export -- export user list with roles and status | `csv` crate for writing; query users via existing admin list endpoint |
| IMEX-05 | Import validation -- validate archive/CSV structure before processing | Two-phase endpoints (validate/execute); config.json schema validation; CSV header validation; per-row/per-item error collection |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zip | 8.5.1 | Read/write ZIP archives | De facto standard Rust ZIP library. v8.5.1 patches CVE-2025-29787 (path traversal). `[VERIFIED: cargo search]` |
| csv | 1.4.0 | Parse/write CSV with headers | Most widely used Rust CSV library. Serde integration, per-row error handling. `[VERIFIED: cargo search]` |
| axum (multipart feature) | 0.7 | Multipart file upload extractor | Built into axum; no extra crate needed. Just add `"multipart"` to workspace features. `[VERIFIED: docs.rs/axum]` |
| tempfile | 3.27 | Temporary file/directory for ZIP extraction | Standard Rust temp file library. Needed for safe extraction before validation. `[VERIFIED: cargo search]` |
| serde_json | 1.0 (workspace) | Parse config.json in ZIP | Already in workspace dependencies. `[VERIFIED: Cargo.toml]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | 1.11 (workspace) | Generate preview tokens for two-phase import | Already in workspace. Used to create unique validation tokens. |
| tracing | 0.1 (workspace) | Log import progress and errors | Already in workspace. Per-item import logging. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| zip crate | async-zip | async-zip is async-native but less mature. zip crate is synchronous which is fine for in-memory parsing of archives <= 50MB. |
| csv crate | hand-rolled split | csv crate handles quoting, escaping, edge cases. Never hand-roll CSV parsing. |
| in-memory preview cache | Redis cache | Redis adds operational complexity for a short-lived token. Use `DashMap<Uuid, PreviewData>` in AppState for simplicity. If Redis is already available, could use it for multi-instance deployments. |

**Installation:**
```toml
# Workspace Cargo.toml -- add to workspace.dependencies
axum = { version = "0.7", features = ["json", "multipart"] }  # add "multipart" to existing

# New domain-imex crate Cargo.toml
[dependencies]
api-infra = { path = "../api-infra" }
shared = { path = "../shared" }
domain-problems = { path = "../domain-problems" }
domain-users = { path = "../domain-users" }
axum = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
sqlx = { version = "0.8", features = ["runtime-tokio", "tls-rustls", "postgres", "chrono", "uuid"] }
uuid = { version = "1.11", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
anyhow = "1.0"
tracing = { workspace = true }
zip = "8.5"
csv = "1.4"
tempfile = "3"
tokio = { workspace = true, features = ["full"] }
```

**Version verification:**
- `zip` = 8.5.1 (current latest) `[VERIFIED: cargo search 2026-04-16]`
- `csv` = 1.4.0 (current latest) `[VERIFIED: cargo search 2026-04-16]`
- `tempfile` = 3.27.0 (current latest) `[VERIFIED: cargo search 2026-04-16]`

## Architecture Patterns

### Recommended Crate Structure
```
domain-imex/
  src/
    lib.rs          # Router export: imex_router()
    models.rs       # Import/export request/response types
    problem_import.rs  # ZIP parse, validate, create problems
    problem_export.rs  # Query problem, build ZIP archive
    user_import.rs     # CSV parse, validate, create users
    user_export.rs     # Query users, build CSV
    security.rs        # ZIP bomb detection, path traversal prevention
```

### Pattern 1: Two-Phase Import (Validate then Execute)
**What:** Upload file -> server validates and caches preview -> user confirms -> server executes import
**When to use:** All import operations (ZIP and CSV)
**Example:**
```rust
// Source: [docs.rs/axum Multipart + CONTEXT.md D-09]

// Phase 1: Validate and preview
// POST /import/problems/validate
async fn validate_problem_import(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    mut multipart: Multipart,  // axum::extract::Multipart
) -> Result<Json<ImportPreviewResponse>, AppError> {
    let zip_bytes = extract_file_from_multipart(&mut multipart).await?;
    let preview = validate_problem_zip(&zip_bytes, claims.school_id, &state).await?;
    let token = Uuid::new_v4();
    // Cache preview in DashMap<Uuid, CachedPreview>
    state.preview_cache.insert(token, CachedPreview::Problem(preview.clone()));
    Ok(Json(ImportPreviewResponse { token, ..preview }))
}

// Phase 2: Execute import
// POST /import/problems/execute
async fn execute_problem_import(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(req): Json<ImportExecuteRequest>,  // { token: Uuid }
) -> Result<Json<ImportResultResponse>, AppError> {
    let cached = state.preview_cache.remove(&req.token)
        .ok_or(AppError::Validation("Invalid or expired preview token"))?;
    // Execute actual creation using cached data
    execute_problem_creation(cached, claims, &state).await
}
```

### Pattern 2: Multipart File Extraction
**What:** Extract uploaded file bytes from axum's Multipart extractor
**When to use:** All file upload endpoints
**Example:**
```rust
// Source: [docs.rs/axum/latest/axum/extract/struct.Multipart.html]
async fn extract_file_from_multipart(
    multipart: &mut Multipart,
) -> Result<Vec<u8>, AppError> {
    let mut file_bytes = Vec::new();
    let mut file_found = false;

    while let Some(field) = multipart.next_field().await
        .map_err(|e| AppError::Validation(format!("Multipart error: {}", e)))?
    {
        let name = field.name().unwrap_or("").to_string();
        if name == "file" {
            let bytes = field.bytes().await
                .map_err(|e| AppError::Validation(format!("Failed to read file: {}", e))))?;
            file_bytes = bytes.to_vec();
            file_found = true;
        }
        // Handle other fields (e.g., "default_password" for CSV import)
    }

    if !file_found {
        return Err(AppError::Validation("No file uploaded".into()));
    }
    Ok(file_bytes)
}
```

### Pattern 3: ZIP Read and Validate
**What:** Read ZIP archive in-memory, validate structure, parse contents
**When to use:** Problem import (IMEX-01)
**Example:**
```rust
// Source: [docs.rs/zip, docs.rs/crate/zip/latest]
use std::io::{Cursor, Read};
use zip::ZipArchive;

fn validate_problem_zip(
    zip_bytes: &[u8],
    max_size: usize,  // e.g., 50MB
) -> Result<Vec<ProblemImportItem>, ImportError> {
    // Size check (ZIP bomb first line of defense)
    if zip_bytes.len() > max_size {
        return Err(ImportError::TooLarge(zip_bytes.len(), max_size));
    }

    let reader = Cursor::new(zip_bytes);
    let mut archive = ZipArchive::new(reader)
        .map_err(|e| ImportError::InvalidArchive(e.to_string()))?;

    // Check file count limit (another ZIP bomb defense)
    if archive.len() > 500 {
        return Err(ImportError::TooManyFiles(archive.len(), 500));
    }

    let mut problems = Vec::new();

    // Iterate entries, looking for problems/*/config.json pattern
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let path = file.name().to_string();

        // Path traversal prevention: reject entries with ".." or absolute paths
        if path.contains("..") || path.starts_with('/') {
            return Err(ImportError::PathTraversal(path));
        }

        if path.ends_with("config.json") {
            let mut contents = String::new();
            file.read_to_string(&mut contents)?;
            let config: ProblemConfig = serde_json::from_str(&contents)?;
            // ... validate config fields, read problem.md and test case files
        }
    }

    Ok(problems)
}
```

### Pattern 4: ZIP Write (Export)
**What:** Build a ZIP archive in-memory from problem data
**When to use:** Problem export (IMEX-02)
**Example:**
```rust
// Source: [docs.rs/zip]
use zip::write::SimpleFileOptions;
use std::io::Cursor;

fn build_problem_zip(problem: &Problem, test_cases: &[TestCase]) -> Result<Vec<u8>, anyhow::Error> {
    let buf = Cursor::new(Vec::new());
    let mut zip = zip::ZipWriter::new(buf);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let slug = slugify(&problem.title);
    let base = format!("problems/{}", slug);

    // config.json
    let config = ProblemExportConfig::from(problem, test_cases);
    zip.start_file(format!("{}/config.json", base), options)?;
    zip.write_all(serde_json::to_string_pretty(&config)?.as_bytes())?;

    // problem.md
    zip.start_file(format!("{}/problem.md", base), options)?;
    zip.write_all(problem.description.as_bytes())?;

    // test cases
    for tc in test_cases {
        zip.start_file(format!("{}/testcases/{}.in", base, tc.order), options)?;
        zip.write_all(tc.input.as_bytes())?;
        zip.start_file(format!("{}/testcases/{}.out", base, tc.order), options)?;
        zip.write_all(tc.expected_output.as_bytes())?;
    }

    let buf = zip.finish()?.into_inner();
    Ok(buf)
}
```

### Pattern 5: CSV Parse with Per-Row Error Handling
**What:** Read CSV, validate headers, collect per-row errors without aborting
**When to use:** User CSV import (IMEX-03)
**Example:**
```rust
// Source: [docs.rs/csv/latest/csv/tutorial/index.html]
use csv::Reader;

fn parse_user_csv(csv_bytes: &[u8]) -> Result<CsvParseResult, ImportError> {
    let mut rdr = Reader::from_reader(csv_bytes);

    // Validate headers
    let headers = rdr.headers()?.clone();
    let required = ["username", "role", "campus_id", "display_name"];
    for col in &required {
        if !headers.iter().any(|h| h == col) {
            return Err(ImportError::MissingColumn(col.to_string()));
        }
    }

    let mut valid_rows = Vec::new();
    let mut row_errors = Vec::new();

    for (i, result) in rdr.records().enumerate() {
        match result {
            Ok(record) => {
                match validate_user_row(&record, &headers) {
                    Ok(user_input) => valid_rows.push(user_input),
                    Err(e) => row_errors.push(RowError {
                        row: i + 2,  // +2 for header row and 0-indexing
                        reason: e.to_string(),
                    }),
                }
            }
            Err(e) => {
                row_errors.push(RowError {
                    row: i + 2,
                    reason: format!("CSV parse error: {}", e),
                });
            }
        }
    }

    Ok(CsvParseResult { valid_rows, row_errors, total: valid_rows.len() + row_errors.len() })
}
```

### Pattern 6: Router Registration (following existing domain pattern)
**What:** New `domain-imex` crate with `imex_router()` function, registered in `api/src/main.rs`
**When to use:** Adding import/export routes
**Example:**
```rust
// domain-imex/src/lib.rs
pub fn imex_router() -> Router<AppState> {
    Router::new()
        .route("/import/problems/validate", post(validate_problem_import))
        .route("/import/problems/execute", post(execute_problem_import))
        .route("/export/problems/:id", get(export_problem))
        .route("/import/users/validate", post(validate_user_import))
        .route("/import/users/execute", post(execute_user_import))
        .route("/export/users", get(export_users))
}

// api/src/main.rs -- add to protected_router
.nest("/imex", domain_imex::imex_router())
```

### Anti-Patterns to Avoid
- **Do NOT extract ZIP files to disk before validation.** Always parse in-memory first using `ZipArchive::new(Cursor::new(bytes))`. Disk extraction before validation is a security risk.
- **Do NOT hand-roll CSV parsing.** The `csv` crate handles quoting, escaping, embedded newlines, and encoding edge cases. Use it.
- **Do NOT duplicate batch creation logic.** Import endpoints should convert parsed data into existing `CreateProblemRequest`/`BatchCreateUsersRequest` types and call existing service methods.
- **Do NOT skip path validation on ZIP entries.** Even though zip 8.5.1 patches CVE-2025-29787, always reject entries containing `..`, absolute paths, or symlinks.
- **Do NOT store uploaded files permanently.** Preview data should use an in-memory cache with TTL (e.g., 10 minutes), not persistent storage.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ZIP reading/writing | Custom archive parser | `zip` crate 8.5 | Handles ZIP64, compression methods, streaming. Custom parsers miss edge cases. |
| CSV parsing | String split on commas | `csv` crate 1.4 | Handles quoting, escaping, embedded delimiters, varying row lengths. |
| File upload handling | Custom multipart parser | `axum::extract::Multipart` | Built into axum. Handles streaming, chunked reads, content-type boundaries. |
| Preview token generation | Custom UUID generation | `uuid::Uuid::new_v4()` | Standard, collision-resistant. Already in workspace. |
| Password hashing | Custom hash function | `bcrypt` (existing) | Already used in `domain-users`. Reuse existing `UserService::register()`. |
| Path sanitization | Manual string replacement | Validate-then-reject pattern | Reject paths containing `..`, `/` prefix, or backslashes. Do not try to "clean" them. |

**Key insight:** The import/export feature is primarily a format conversion layer. It reads files, validates structure, converts to existing domain types, and delegates to existing service methods. The core business logic (creating problems, creating users, duplicate detection) already exists.

## Runtime State Inventory

> This is a greenfield feature phase (new domain crate + new frontend page). No runtime state migration needed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None -- all new tables/records | N/A |
| Live service config | None -- new routes added to existing server | Add router nesting in main.rs |
| OS-registered state | None | N/A |
| Secrets/env vars | None -- reuses existing DATABASE_URL, JWT_SECRET | N/A |
| Build artifacts | New `domain-imex` crate adds to workspace | Add to workspace members in root Cargo.toml |

## Common Pitfalls

### Pitfall 1: ZIP Bomb (Decompression Bomb)
**What goes wrong:** A crafted ZIP file decompresses to terabytes, exhausting memory.
**Why it happens:** ZIP files can have extreme compression ratios (e.g., 42KB -> 4.5GB).
**How to avoid:** (1) Reject ZIP files larger than a size limit (e.g., 50MB). (2) Check total uncompressed size using `file.size()` before reading. (3) Limit number of entries (e.g., 500 files max). (4) Limit individual file size within archive.
**Warning signs:** Upload of a small file that takes too long to process; memory spikes during import.

### Pitfall 2: Path Traversal (Zip Slip)
**What goes wrong:** ZIP entries with paths like `../../etc/passwd` cause files to be written outside intended directory.
**Why it happens:** ZIP format allows arbitrary path strings. CVE-2025-29787 affected zip crate < 2.3.0.
**How to avoid:** (1) zip 8.5.1 is patched, but still validate manually. (2) Reject any entry whose name contains `..`, starts with `/`, or contains `\`. (3) Never extract to disk for this use case -- parse in-memory only.
**Warning signs:** ZIP entry names with `..` or absolute paths.

### Pitfall 3: Symlink Attacks in ZIP
**What goes wrong:** ZIP contains a symlink pointing to an external path. Subsequent entries write through the symlink.
**Why it happens:** ZIP supports symbolic links as entry types.
**How to avoid:** Check `file.is_symlink()` for each entry and reject any symlinks. For this project, we read files into memory, not disk, so this is lower risk but still worth checking.
**Warning signs:** `file.is_symlink()` returns true for an entry.

### Pitfall 4: CSV Encoding Issues
**What goes wrong:** CSV with BOM (Byte Order Mark), mixed encodings, or unusual line endings fails to parse.
**Why it happens:** Excel exports CSV with UTF-8 BOM. Some systems use `\r\n` vs `\n`.
**How to avoid:** (1) Strip UTF-8 BOM (`\xEF\xBB\xBF`) from start of file before parsing. (2) The `csv` crate handles `\r\n` and `\n` automatically by default. (3) Reject non-UTF-8 files early.
**Warning signs:** First column header has invisible characters; first row silently skipped.

### Pitfall 5: Partial Import State on Error
**What goes wrong:** Import creates 50 out of 100 users, then fails. Database has inconsistent partial state.
**Why it happens:** Using autocommit per INSERT instead of a transaction.
**How to avoid:** Per D-04, this is best-effort -- partial success is acceptable. But wrap each item's creation in its own error handler so one failure does not abort the rest. The existing `batch_create_users` already follows this pattern.
**Warning signs:** Import endpoint returns 500 after creating some items.

### Pitfall 6: Preview Token Expiry
**What goes wrong:** User uploads file, goes to lunch, comes back, clicks "Confirm" and gets "invalid token" error.
**Why it happens:** Preview tokens stored in memory with no expiry or too-short TTL.
**How to avoid:** Use a reasonable TTL (10-15 minutes). Return clear error message when token expires suggesting re-upload. Consider showing a countdown in the frontend.
**Warning signs:** Users report "invalid token" errors frequently.

### Pitfall 7: axum Workspace Feature Collision
**What goes wrong:** Adding `multipart` to workspace axum causes compile errors in crates that specify `features = ["json"]` separately.
**Why it happens:** Workspace feature unification -- features are unioned across all dependents.
**How to avoid:** The workspace `axum` dependency should include all needed features: `{ version = "0.7", features = ["json", "multipart"] }`. Individual crates use `axum = { workspace = true }` without specifying features. Since the workspace already uses `"json"` only, adding `"multipart"` is safe -- it's a superset.
**Warning signs:** Compile errors about `Multipart` not found; feature unification warnings.

### Pitfall 8: Large File Upload Timeout
**What goes wrong:** Upload of a 40MB ZIP file times out before reaching the handler.
**Why it happens:** Default axum/tower body size limit is 2MB.
**How to avoid:** Set `DefaultBodyLimit::max(50_000_000)` (50MB) on the import routes specifically, not globally.
**Warning signs:** 413 Payload Too Large response on upload.

## Code Examples

### config.json Schema for Problem Import
```json
{
  "title": "Two Sum",
  "difficulty": "easy",
  "time_limit": 5000,
  "memory_limit": 256,
  "is_public": false,
  "visibility": "private",
  "tags": ["array", "hash-table"],
  "source_url": "https://leetcode.com/problems/two-sum/",
  "author_note": "Classic introductory problem",
  "test_cases": [
    {
      "input_file": "testcases/1.in",
      "output_file": "testcases/1.out",
      "is_hidden": false,
      "score": 10,
      "order": 1
    },
    {
      "input_file": "testcases/2.in",
      "output_file": "testcases/2.out",
      "is_hidden": true,
      "score": 20,
      "order": 2
    }
  ]
}
```

### CSV Format for User Import
```csv
username,role,campus_id,display_name,email
2024001,student,1,Zhang San,zhangsan@example.com
2024002,student,1,Li Si,
2024003,teacher,1,Teacher Wang,wang@example.com
```

### Import Preview Response
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "total": 5,
  "valid": 4,
  "warnings": [],
  "errors": [
    {
      "item": "problems/broken-problem/config.json",
      "reason": "Invalid difficulty: 'impossible'. Must be one of: easy, medium, hard"
    }
  ],
  "preview_items": [
    {
      "title": "Two Sum",
      "difficulty": "easy",
      "test_case_count": 5,
      "status": "valid"
    },
    {
      "title": "Existing Problem",
      "difficulty": "medium",
      "test_case_count": 3,
      "status": "duplicate",
      "warning": "Problem with this title already exists in your organization"
    }
  ]
}
```

### Import Result Response (after execute)
```json
{
  "total": 5,
  "created": 3,
  "skipped": 1,
  "errors": 1,
  "created_items": [
    { "title": "Two Sum", "id": 42 },
    { "title": "Add Two Numbers", "id": 43 },
    { "title": "Merge Sort", "id": 44 }
  ],
  "skipped_items": [
    { "item": "Existing Problem", "reason": "already exists" }
  ],
  "error_items": [
    { "item": "Broken Problem", "reason": "Database error: ..." }
  ]
}
```

### AppState Extension for Preview Cache
```rust
// In api-infra/src/state.rs or domain-imex
use dashmap::DashMap;
use uuid::Uuid;

pub type PreviewCache = DashMap<Uuid, CachedPreview>;

#[derive(Clone)]
pub enum CachedPreview {
    Problem(ProblemImportPreview),
    User(UserImportPreview),
}

// Add to AppState:
// pub preview_cache: PreviewCache,
```

### Frontend Service Pattern for Import/Export
```typescript
// frontend/src/services/imex.ts
import api from './api'

export interface ImportPreview {
  token: string
  total: number
  valid: number
  warnings: Array<{ item: string; reason: string }>
  errors: Array<{ item: string; reason: string }>
  preview_items: Array<{
    title: string
    difficulty: string
    test_case_count: number
    status: 'valid' | 'duplicate' | 'error'
    warning?: string
  }>
}

export interface ImportResult {
  total: number
  created: number
  skipped: number
  errors: number
  created_items: Array<{ title: string; id: number }>
  skipped_items: Array<{ item: string; reason: string }>
  error_items: Array<{ item: string; reason: string }>
}

export const imexService = {
  async validateProblemImport(file: File): Promise<ImportPreview> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/imex/import/problems/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async executeProblemImport(token: string): Promise<ImportResult> {
    const response = await api.post('/imex/import/problems/execute', { token })
    return response.data
  },

  async exportProblem(problemId: string): Promise<Blob> {
    const response = await api.get(`/imex/export/problems/${problemId}`, {
      responseType: 'blob',
    })
    return response.data
  },

  async validateUserImport(file: File, defaultPassword: string): Promise<ImportPreview> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('default_password', defaultPassword)
    const response = await api.post('/imex/import/users/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async executeUserImport(token: string): Promise<ImportResult> {
    const response = await api.post('/imex/import/users/execute', { token })
    return response.data
  },

  async exportUsers(): Promise<Blob> {
    const response = await api.get('/imex/export/users', {
      responseType: 'blob',
    })
    return response.data
  },
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| zip crate 2.x (vulnerable) | zip crate 8.5.1 (patched) | CVE-2025-29787 fixed in 2.3.0 | Path traversal vulnerability patched. Always validate manually anyway. |
| axum without multipart | axum with `multipart` feature | axum 0.7 | Built-in `Multipart` extractor; no external crate needed |
| Hand-rolled CSV parsing | `csv` crate with serde | Standard practice | Handles edge cases that hand-rolled parsers miss |

**Deprecated/outdated:**
- zip crate versions < 2.3.0: Affected by CVE-2025-29787 (path traversal via symlinks) `[VERIFIED: nvd.nist.gov]`
- `safe_unzip` crate: Unnecessary if using zip 8.x with manual validation `[ASSUMED]`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ZIP files will be <= 50MB in practice | Common Pitfalls | Need to adjust size limit if problems have very large test cases |
| A2 | Preview cache using DashMap is sufficient (no Redis needed) | Architecture Patterns | Multi-instance deployment would need Redis-backed cache instead |
| A3 | `domain-imex` as a separate crate is the right organizational choice | Architecture Patterns | Could add to existing crates, but cross-domain dependency makes separate crate cleaner |
| A4 | axum workspace feature unification is safe when adding "multipart" | Common Pitfalls | All crates using `axum = { workspace = true }` will get multipart feature; this should be harmless |
| A5 | The frontend does not need react-dropzone; native file input is sufficient | Frontend | May want better drag-and-drop UX, but native input works |

**If this table is empty:** All claims in this research were verified or cited -- no user confirmation needed.

## Open Questions

1. **Preview cache backend: DashMap vs Redis?**
   - What we know: Redis is available in the stack. DashMap is simpler for single-instance.
   - What's unclear: Whether the API server will ever run multiple instances behind a load balancer.
   - Recommendation: Start with DashMap (simpler). Add Redis fallback only if multi-instance is needed. The preview token has a short TTL (10 min), making state loss on restart acceptable.

2. **File size limits?**
   - What we know: CONTEXT.md leaves this to Claude's discretion.
   - What's unclear: Typical problem ZIP sizes in educational settings.
   - Recommendation: 50MB for ZIP uploads (plenty for hundreds of test cases), 10MB for CSV uploads (thousands of users). These can be tuned later.

3. **Should domain-imex depend on domain-problems and domain-users, or duplicate the SQL?**
   - What we know: Existing domain crates have direct SQL patterns (domain-problems) and service layers (domain-users).
   - What's unclear: Whether depending on domain crates creates circular dependencies or versioning issues.
   - Recommendation: domain-imex depends on domain-problems and domain-users. It converts file data into their existing request types and calls their service/route methods. This avoids SQL duplication.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Rust toolchain | Backend compilation | -- | -- | -- |
| PostgreSQL | Data layer | -- | -- | -- |
| Redis | Preview cache (optional) | -- | -- | DashMap in-memory |
| Node.js | Frontend build | -- | -- | -- |

**Note:** This phase does not require new external services. It adds Rust crate dependencies and a new frontend page. The existing PostgreSQL and Redis infrastructure is sufficient.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Rust: built-in `#[cfg(test)]` + `tokio::test`; Frontend: Vitest |
| Config file | Rust: per-crate; Frontend: vitest.config.ts (existing) |
| Quick run command | `cargo test -p domain-imex --lib` |
| Full suite command | `cargo test --workspace` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMEX-01 | ZIP file parsed into ProblemImportItems | unit | `cargo test -p domain-imex --lib problem_import` | Wave 0 |
| IMEX-02 | Problem data serialized to ZIP bytes | unit | `cargo test -p domain-imex --lib problem_export` | Wave 0 |
| IMEX-03 | CSV rows parsed into UserInput structs | unit | `cargo test -p domain-imex --lib user_import` | Wave 0 |
| IMEX-04 | User data serialized to CSV bytes | unit | `cargo test -p domain-imex --lib user_export` | Wave 0 |
| IMEX-05 | Invalid ZIP/CSV produces structured errors | unit | `cargo test -p domain-imex --lib validation` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cargo test -p domain-imex --lib`
- **Per wave merge:** `cargo test --workspace`
- **Phase gate:** Full workspace test suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `domain-imex/src/problem_import.rs` -- test ZIP parsing
- [ ] `domain-imex/src/user_import.rs` -- test CSV parsing
- [ ] `domain-imex/src/security.rs` -- test ZIP bomb / path traversal rejection
- [ ] `domain-imex/src/problem_export.rs` -- test round-trip (export then import)
- [ ] `domain-imex/src/user_export.rs` -- test CSV output format

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT auth via AuthExtractor (existing) |
| V3 Session Management | yes | Token-based, no session changes needed |
| V4 Access Control | yes | Teacher+ for problem import/export; Admin for user import/export (existing role checks) |
| V5 Input Validation | yes | ZIP structure validation, CSV header/row validation, config.json schema validation |
| V6 Cryptography | no | No crypto needed beyond existing JWT |

### Known Threat Patterns for Import/Export Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| ZIP path traversal (Zip Slip) | Tampering, Elevation | Reject entries with `..`, `/` prefix, backslashes; use zip 8.5.1+ `[VERIFIED: nvd.nist.gov CVE-2025-29787]` |
| ZIP bomb (decompression) | Denial of Service | Size limit (50MB), entry count limit (500), individual file size limit |
| CSV injection (formula injection) | Tampering, Information Disclosure | Strip leading `=`, `+`, `-`, `@`, `\t` from cell values; set Content-Disposition header on export |
| Malicious config.json | Tampering | Validate all fields against expected schema; reject unknown fields with `#[serde(deny_unknown_fields)]` |
| Large file upload DoS | Denial of Service | Body size limit via `DefaultBodyLimit::max()` on import routes only |
| Symlink in ZIP | Elevation | Check `file.is_symlink()` and reject |
| Content-Type spoofing | Spoofing | Do not trust Content-Type header; validate file content (magic bytes for ZIP, parse attempt for CSV) |
| Unauthorized import | Elevation | Auth + role check on every import/export endpoint |

## Sources

### Primary (HIGH confidence)
- `zip` crate docs.rs -- https://docs.rs/crate/zip/latest `[VERIFIED]`
- `csv` crate tutorial -- https://docs.rs/csv/latest/csv/tutorial/index.html `[VERIFIED]`
- axum Multipart extractor -- https://docs.rs/axum/latest/axum/extract/struct.Multipart.html `[VERIFIED]`
- axum multipart-form example -- https://github.com/tokio-rs/axum/blob/main/examples/multipart-form/src/main.rs `[VERIFIED]`
- CVE-2025-29787 NVD -- https://nvd.nist.gov/vuln/detail/CVE-2025-29787 `[VERIFIED]`

### Secondary (MEDIUM confidence)
- Web search verified with official docs: axum multipart feature flag `{ version = "0.7", features = ["multipart"] }` `[VERIFIED: docs.rs + community examples]`
- Snyk advisory for zip crate -- https://security.snyk.io/vuln/SNYK-RUST-ZIP-9460813 `[VERIFIED]`
- `cargo search` results for zip=8.5.1, csv=1.4.0, tempfile=3.27.0 `[VERIFIED: crates.io]`

### Tertiary (LOW confidence)
- DashMap sufficient for single-instance preview cache `[ASSUMED -- based on typical deployment patterns]`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All crate versions verified against crates.io; axum multipart feature verified against docs.rs
- Architecture: HIGH - Follows existing domain crate patterns exactly; reuses established batch creation flows
- Pitfalls: HIGH - CVE verified against NVD; ZIP security best practices well-documented
- Security: HIGH - Threat model based on OWASP guidance and published CVEs

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (30 days -- stable Rust ecosystem)
