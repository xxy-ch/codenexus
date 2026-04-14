---
wave: 1
depends_on: []
files_modified:
  - Cargo.toml
  - domain-search/Cargo.toml
  - domain-search/src/lib.rs
  - domain-search/src/routes.rs
  - domain-search/src/service.rs
autonomous: true
requirements:
  - ARCH-04
---

# Plan 02: Create domain-search Crate

<objective>
Extract the search module from the api crate into a `domain-search` workspace crate. Normalize the router function from `create_search_router(pool, redis_url)` to `search_router()` using `State<AppState>`, matching the pattern established by domain-problems and domain-users.
</objective>

<threat_model>
- **LOW**: Pure code extraction with a minor signature change. Tenant-scoped search logic remains identical. No auth changes.
</threat_model>

<must_haves>
- [ ] `cargo build -p domain-search` succeeds independently
- [ ] Search service and routes are in `domain-search/src/`
- [ ] Router function signature is `pub fn search_router() -> Router<AppState>` (no parameters)
- [ ] `SearchService::with_redis(pool, &state.redis_url)` pattern replaced with direct `AppState` access
- [ ] No imports from the `api` crate (no circular dependency)
- [ ] Tenant-scoped search (`school_id`, `is_teacher_plus` filtering) preserved unchanged
</must_haves>

## Tasks

### Task T02-01: Create domain-search crate skeleton

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/Cargo.toml (workspace members list)
- /Users/xiexingyu/Documents/项目/Online_Judge/domain-problems/Cargo.toml (reference for dependency format)
- /Users/xiexingyu/Documents/项目/Online_Judge/domain-problems/src/lib.rs (reference for lib.rs structure)
</read_first>

<action>
1. Add `"domain-search"` to the workspace `members` array in root `Cargo.toml`.

2. Create `domain-search/Cargo.toml` with these exact contents:

```toml
[package]
name = "domain-search"
version = "0.1.0"
edition = "2021"

[dependencies]
api-infra = { path = "../api-infra" }
shared = { path = "../shared" }
axum = { workspace = true, features = ["json"] }
serde = { workspace = true }
serde_json = { workspace = true }
sqlx = { version = "0.8", features = ["runtime-tokio", "tls-rustls", "postgres", "chrono", "uuid"] }
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.11", features = ["v4", "serde"] }
anyhow = "1.0"
regex = "1.11"
```

3. Create `domain-search/src/lib.rs` with these exact contents:

```rust
pub mod routes;
pub mod service;

pub use routes::search_router;
```
</action>

<acceptance_criteria>
- Root `Cargo.toml` contains `"domain-search"` in the workspace members array
- `domain-search/Cargo.toml` exists with package name `domain-search`, depends on `api-infra`, `shared`, and `regex`
- `domain-search/src/lib.rs` exists with `pub mod routes; pub mod service;` and `pub use routes::search_router;`
</acceptance_criteria>

---

### Task T02-02: Extract search service

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/search/service.rs (full file)
</read_first>

<action>
1. Copy `api/src/search/service.rs` to `domain-search/src/service.rs`.

2. Update imports — remove any `crate::` references. The original file likely has no `crate::` imports (search is self-contained). Verify this by reading the file. If there are `crate::` imports, convert:
   - `crate::AppState` → `api_infra::state::AppState`
   - Any other `crate::` → appropriate `api_infra::` path

3. The `SearchService` struct currently holds `PgPool` + `Option<String>` (redis_url). Keep this unchanged — the struct is internal to the service module.

4. The `search_tenant_aware()` method takes `school_id: Option<i64>` and `is_teacher_plus: bool` — preserve this signature exactly.
</action>

<acceptance_criteria>
- `domain-search/src/service.rs` exists
- `domain-search/src/service.rs` contains `SearchService` struct definition
- `domain-search/src/service.rs` contains `search_tenant_aware` method
- `domain-search/src/service.rs` contains NO occurrences of `crate::`
</acceptance_criteria>

---

### Task T02-03: Extract and normalize search routes

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/search/routes.rs (full file — 67 lines)
- /Users/xiexingyu/Documents/项目/Online_Judge/domain-problems/src/lib.rs (reference for router pattern)
</read_first>

<action>
1. Create `domain-search/src/routes.rs` based on the original `api/src/search/routes.rs`.

2. Update imports:
   - `use crate::middleware::auth::AuthExtractor;` → `use api_infra::middleware::auth::AuthExtractor;`
   - Remove `use crate::AppState;` if present
   - Add `use api_infra::state::AppState;`

3. **Normalize the router function signature** from:
   ```rust
   pub fn create_search_router(_pool: PgPool, _redis_url: String) -> Router<crate::AppState>
   ```
   to:
   ```rust
   pub fn search_router() -> Router<AppState>
   ```
   Remove the `_pool` and `_redis_url` parameters entirely.

4. Inside the route handlers, the original code uses `State(state): State<crate::AppState>` and then constructs `SearchService` from state fields. The handlers already extract pool from state (`&state.db_pool`), so removing the function parameters has no effect on handler behavior. Verify this by reading the handler bodies.

5. Ensure `SearchService::with_redis(pool, &state.redis_url)` calls remain — they now work through `State(state): State<AppState>` which provides `state.db_pool` and `state.redis_url`.

6. Make sure all required imports are present: `axum::extract::{Path, State, Query}`, `axum::response::Json`, `axum::Router`, etc.
</action>

<acceptance_criteria>
- `domain-search/src/routes.rs` exists
- `domain-search/src/routes.rs` contains `pub fn search_router() -> Router<AppState>` (NOT `create_search_router`)
- `domain-search/src/routes.rs` contains `use api_infra::state::AppState;`
- `domain-search/src/routes.rs` contains `use api_infra::middleware::auth::AuthExtractor;`
- `domain-search/src/routes.rs` contains NO occurrences of `crate::`
- `domain-search/src/routes.rs` contains NO occurrences of `create_search_router`
- `domain-search/src/routes.rs` contains NO occurrences of `_pool: PgPool` or `_redis_url: String` as function parameters
</acceptance_criteria>

---

### Task T02-04: Verify domain-search builds independently

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/domain-search/Cargo.toml
- /Users/xiexingyu/Documents/项目/Online_Judge/domain-search/src/lib.rs
</read_first>

<action>
1. Run `cargo build -p domain-search` to verify the crate compiles independently.

2. If build fails:
   - Check for remaining `crate::` references
   - Verify all axum/sqlx/serde types are imported
   - Check that `AppState` type from api-infra provides the fields search needs (`db_pool`, `redis_url`)

3. Run `cargo clippy -p domain-search -- -D warnings`.
</action>

<acceptance_criteria>
- `cargo build -p domain-search` exits with code 0
- `cargo clippy -p domain-search -- -D warnings` exits with code 0
</acceptance_criteria>

<verification>
```bash
cargo build -p domain-search
cargo clippy -p domain-search -- -D warnings
```
Both must succeed.
</verification>
