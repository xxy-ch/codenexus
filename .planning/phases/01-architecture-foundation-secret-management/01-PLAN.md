---
wave: 1
depends_on: []
files_modified:
  - Cargo.toml
  - api-infra/Cargo.toml
  - api-infra/src/lib.rs
  - api-infra/src/error.rs
  - api-infra/src/rbac.rs
  - api/Cargo.toml
  - api/src/lib.rs
  - api/src/error.rs
  - api/src/rbac/mod.rs
autonomous: true
requirements:
  - ARCH-01
---

# Plan 01: Create api-infra Shell + Move Independent Types (AppError, RbacService)

<objective>
Create the `api-infra` workspace crate and move the two most self-contained components into it: `AppError` (the unified error type) and `RbacService` (pure in-memory RBAC logic). The `api` crate continues to compile unchanged via `pub use` re-export shims. This is the lowest-risk extraction step and establishes the pattern for all subsequent moves.
</objective>

<threat_model>
- **LOW**: AppError contains no secrets or business logic. Moving it to a new crate does not change error responses.
- **LOW**: RbacService is pure in-memory computation with no external dependencies. No data flows through it from untrusted sources at the crate boundary.
- **LOW**: Re-export shims in `api` crate maintain backward compatibility -- no `use` path changes for existing code.
- **MEDIUM (mitigated)**: The `From<sqlx::Error> for AppError` impl MUST stay in the `api` crate to avoid pulling sqlx as a required (non-dev) dep of `api-infra`. Plan addresses this explicitly by splitting the impl.
</threat_model>

<must_haves>
- [ ] `cargo build --workspace` succeeds with 4 crates (shared, judge-worker, api-infra, api)
- [ ] `cargo build -p api-infra` compiles independently with no errors
- [ ] `cargo test --workspace` passes with identical results to before extraction
- [ ] No circular dependency between api and api-infra
- [ ] `From<sqlx::Error> for AppError` remains in api crate only

## Tasks

### Task 01-01: Create api-infra Crate Shell

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/Cargo.toml (workspace root -- add new member)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/Cargo.toml (reference for dependency versions)
- /Users/xiexingyu/Documents/项目/Online_Judge/shared/Cargo.toml (reference for crate layout)
</read_first>

<action>
1. Create directory `api-infra/`.

2. Create `api-infra/Cargo.toml` with these exact contents:

```toml
[package]
name = "api-infra"
version = "0.1.0"
edition = "2021"

[dependencies]
shared = { path = "../shared" }
axum = { workspace = true }
tokio = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
anyhow = "1.0"
tracing = { workspace = true }

[dev-dependencies]
tower = { version = "0.5", features = ["util"] }
tokio-test = "0.4"
```

Note: NO `sqlx`, `deadpool-redis`, or `jsonwebtoken` in `[dependencies]`. Those are NOT needed for AppError or RbacService.

3. Add `"api-infra"` to the workspace members list in the root `/Users/xiexingyu/Documents/项目/Online_Judge/Cargo.toml`. The `members` array must become:
```toml
members = ["api", "api-infra", "judge-worker", "shared"]
```

4. Create `api-infra/src/lib.rs` with minimal content:
```rust
pub mod error;
pub mod rbac;
```

5. Run `cargo build -p api-infra` -- it will fail because `error` and `rbac` modules are empty. That is expected; the next tasks populate them.

6. Add `api-infra = { path = "../api-infra" }` to `api/Cargo.toml` `[dependencies]` section (after the `shared` line).

7. Run `cargo check --workspace` to verify no circular deps. The expected dependency graph is: `api -> api-infra -> shared`, `api -> shared`, `judge-worker -> shared`.
</action>

<acceptance_criteria>
- `cargo metadata --format-version 1 | python3 -c "import sys,json; d=json.load(sys.stdin); pkgs=[p['name'] for p in d['packages']]; assert 'api-infra' in pkgs"` returns without error
- `cargo tree -p api-infra` output does NOT contain `sqlx`, `deadpool-redis`, or `jsonwebtoken`
- `cargo tree -p api` output contains `api-infra`
- `ls /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/lib.rs` returns the file path
</acceptance_criteria>

### Task 01-02: Move RbacService to api-infra

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/rbac/mod.rs (source file being moved -- full content including all 293 lines)
- /Users/xiexingyu/Documents/项目/Online_Judge/shared/src/models/role.rs (for `Role` type used in RbacService)
- /Users/xiexingyu/Documents/项目/Online_Judge/shared/src/models/permission.rs (for `Permission` type used in RbacService)
</read_first>

<action>
1. Create `api-infra/src/rbac.rs` with the exact content from `api/src/rbac/mod.rs` BUT change the imports at the top:

Replace:
```rust
use shared::models::{permission::Permission, role::Role};
```

The import path `shared::models::{permission::Permission, role::Role}` remains the same because `api-infra` also depends on `shared`.

Keep ALL other code identical: the struct definition, all `impl` blocks, `get_role_permissions`, `role_has_permission`, `role_has_all_permissions`, `role_has_any_permission`, `get_permissions`, all `#[allow(dead_code)]` attributes, and the entire `#[cfg(test)] mod tests` block (all 7 tests).

2. Convert `api/src/rbac/mod.rs` into a re-export shim by replacing its ENTIRE content with:
```rust
//! Re-export from api-infra.
//! This module will be removed once all direct consumers are updated.
pub use api_infra::rbac::*;
```

3. Run `cargo test -p api-infra` -- all 7 RbacService tests must pass:
   - `test_root_has_all_permissions`
   - `test_campus_admin_permissions`
   - `test_teacher_permissions`
   - `test_student_permissions`
   - `test_role_has_all_permissions`
   - `test_role_has_any_permission`
   - `test_get_permissions`

4. Run `cargo test -p api rbac` -- same 7 tests must pass via re-export.

5. Verify `cargo build --workspace` succeeds.
</action>

<acceptance_criteria>
- `grep "pub use api_infra::rbac::\*" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/rbac/mod.rs` returns a match
- `cargo test -p api-infra rbac` exits 0 and shows 7 tests passed
- `cargo test -p api rbac` exits 0 and shows 7 tests passed
- `cargo build --workspace` exits 0
</acceptance_criteria>

### Task 01-03: Move AppError to api-infra

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/error.rs (source file -- the complete 51-line file)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/error.rs (target -- will be created)
</read_first>

<action>
1. Create `api-infra/src/error.rs` with the AppError definition and `IntoResponse` impl, BUT split the `From` impls:

```rust
//! Unified application error type.
//!
//! All route modules should import `AppError` from here instead of defining
//! their own per-module error enums. This module consolidates the previously
//! duplicated `AppError` definitions that existed in `users::routes`,
//! `submissions::routes`, and `notifications::routes`.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug)]
pub enum AppError {
    Auth(String),
    Validation(String),
    Database(String),
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::Auth(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Database(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        let body = Json(json!({
            "error": message,
            "status": status.as_u16(),
        }));

        (status, body).into_response()
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::Internal(err.to_string())
    }
}

impl AppError {
    /// Create a database error from a message string.
    /// Used by the `api` crate to convert sqlx errors without
    /// pulling sqlx as a dependency of api-infra.
    pub fn database(msg: impl Into<String>) -> Self {
        AppError::Database(msg.into())
    }
}
```

Key differences from the original:
- NO `From<sqlx::Error>` impl (stays in api crate)
- Added `AppError::database()` constructor method for use by the sqlx conversion in api crate

2. Convert `api/src/error.rs` into a re-export shim PLUS the sqlx conversion:
```rust
//! Re-export from api-infra.
//! The `From<sqlx::Error>` impl must live here because api-infra
//! does not depend on sqlx.

pub use api_infra::error::AppError;

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::database(err.to_string())
    }
}
```

3. Run `cargo build --workspace` -- must succeed. The `From<sqlx::Error>` impl compiles in the api crate because `AppError` (defined in api-infra, a dependency of api) satisfies the orphan rule.

4. Run `cargo test --workspace` -- must pass with identical results.
</action>

<acceptance_criteria>
- `grep "pub use api_infra::error::AppError" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/error.rs` returns a match
- `grep "From<sqlx::Error>" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/error.rs` returns a match
- `grep "From<sqlx::Error>" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/error.rs` returns NO match
- `grep "pub fn database" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/error.rs` returns a match
- `cargo build --workspace` exits 0
- `cargo test --workspace` exits 0
</acceptance_criteria>

## Verification

<verify>
```bash
# Verify workspace compiles
cargo build --workspace

# Verify api-infra compiles independently
cargo build -p api-infra

# Verify all existing tests still pass
cargo test --workspace

# Verify no circular dependencies
cargo tree -p api-infra 2>&1 | grep -c "api"

# Verify RbacService tests pass in both crates
cargo test -p api-infra rbac
cargo test -p api rbac

# Verify AppError From<sqlx::Error> is only in api
grep -rn "From<sqlx::Error>" api-infra/  # should find nothing
grep -rn "From<sqlx::Error>" api/src/error.rs  # should find the impl
```
</verify>
