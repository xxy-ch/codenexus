# Phase 2 Research: Basic CI + Domain Extraction -- Core (Users, Problems)

**Researched:** 2026-04-14
**Status:** Complete

---

## 1. Domain Analysis

### 1.1 Users Module (`api/src/users/`)

**Files (4 files, ~820 lines):**
- `mod.rs` (6 lines) -- re-exports `user_router`
- `models.rs` (155 lines) -- User, UserProfile, RegisterRequest, LoginRequest, AuthResponse, RefreshTokenRequest, TokenClaims, UserProfileUpdate, AdminUserQuery, AdminUserRow, AdminUserListResponse, UpdateUserRoleRequest, AdminMutationResponse, BatchCreateUsersRequest/Input/Skip/Response
- `routes.rs` (112 lines) -- 7 handlers: register, get_me, update_me, list_admin_users, batch_create_users, update_user_role, toggle_user_status
- `service.rs` (533 lines) -- UserService struct with methods: register, login, refresh_token, get_user_profile, update_user_profile, list_admin_users, update_user_role, update_user_status, batch_create_users

**Cross-domain dependencies:**
| Dependency | Source | Nature |
|---|---|---|
| `crate::auth::JwtService` | `users/service.rs:2` | Direct struct usage -- `UserService::new(pool, jwt_service)`, calls `generate_access_token`, `generate_refresh_token`, `validate_token` |
| `crate::AppState` | `users/routes.rs:4` | For `State(state): State<AppState>` extraction |
| `crate::error::AppError` | `users/routes.rs:2` | Re-exported from `api_infra::error::AppError` |
| `crate::middleware::auth::AuthExtractor` | `users/routes.rs:3` | JWT claims extraction from request |
| `shared::models::User` | `users/service.rs` | Conversion to shared User model for JWT generation |
| `shared::models::Role` | `users/service.rs` | Role parsing and normalization |
| `bcrypt` | `users/service.rs` | Password hashing (external crate) |
| `sqlx::PgPool` | `users/service.rs` | Database queries (external crate) |

**Critical coupling:** The `auth/routes.rs` module imports from `users/` directly:
```
use crate::users::models::{LoginRequest as DbLoginRequest, RefreshTokenRequest, RegisterRequest};
use crate::users::service::UserService;
```
This means `auth/routes.rs` (login, register, refresh handlers) depends on `users/models.rs` and `users/service.rs`. This is a two-way coupling: users imports from auth (JwtService), and auth imports from users (UserService, models).

**Self-contained functions:** The `ensure_admin()` helper in `users/routes.rs:105` is purely local.

### 1.2 Problems Module (`api/src/problems/`)

**Files (6 files, ~1000 lines):**
- `mod.rs` (36 lines) -- defines `problems_router()`, declares sub-modules: models, routes, test_cases
- `models.rs` (140 lines) -- Problem, CreateProblemRequest, UpdateProblemRequest, ProblemsListResponse, ProblemDetail, ProblemStatistics, ListProblemsQuery, SupportedLanguage, UpdateSupportedLanguagesRequest
- `routes.rs` (467 lines) -- 7 handlers: get_supported_languages, update_supported_languages, create_problem, list_problems, get_problem, update_problem, delete_problem, get_problem_statistics
- `test_cases.rs` (280 lines) -- 5 handlers: list_test_cases, create_test_case, update_test_case, delete_test_case, batch_import_test_cases
- `access.rs` (239 lines) -- Pure access control logic: ProblemAccessRecord, parse_role, requests_management_problem_view, can_create_problem_in_organization, can_view_management_problem_data, can_read_problem, can_mutate_problem, fetch_problem_access_record. Includes unit tests.
- `problem_access.rs` (73 lines) -- Thin wrappers over access.rs functions: management_role_from_claims, ensure_problem_create_access, ensure_problem_read_access, ensure_management_problem_read_access, ensure_problem_mutation_access, load_problem_access

**Cross-domain dependencies:**
| Dependency | Source | Nature |
|---|---|---|
| `crate::AppState` | `mod.rs`, `routes.rs`, `test_cases.rs`, `access.rs` | `State(state): State<AppState>` extraction |
| `crate::middleware::auth::AuthExtractor` | `routes.rs`, `test_cases.rs`, `problem_access.rs` | JWT claims extraction |
| `shared::models::role::Role` | `routes.rs`, `test_cases.rs`, `access.rs` | Role hierarchy checks |
| `shared::models::Claims` | `access.rs`, `problem_access.rs` | Access control decisions |
| `sqlx` | `routes.rs`, `test_cases.rs`, `access.rs` | Direct SQL queries (inline, no service layer) |

**No cross-domain service dependencies:** The problems module does NOT import from any other domain module (not users, not auth, not submissions). It only depends on infrastructure (AppState, AuthExtractor, AppError) and shared types.

**Notable pattern difference:** Problems has NO `service.rs` -- all SQL queries are inline in routes.rs and test_cases.rs. This is different from users which has a dedicated service.rs.

**External consumers:** Only `main.rs` references `problems::problems_router()`.

### 1.3 Infrastructure Dependencies (both modules share these)

| Item | Location | Used by |
|---|---|---|
| `AppState` | `api/src/lib.rs` / `api/src/main.rs` (duplicate) | Both modules |
| `AppError` | `api-infra/src/error.rs`, re-exported via `api/src/error.rs` | users (directly); problems uses `StatusCode` instead |
| `AuthExtractor` | `api/src/middleware/auth.rs` | Both modules |
| `JwtService` | `api/src/auth/jwt_service.rs` | Only users (problems has no JWT dependency) |
| `Claims` | `shared::models::Claims` | Both (via AuthExtractor for users, directly for problems access control) |
| `Role` | `shared::models::Role` | Both |

---

## 2. CI Pipeline Research

### 2.1 Current State

- **No `.github/workflows/` directory exists** -- only `.github/hooks/` and `.github/prompts/` (unrelated UI design tooling)
- **No `rust-toolchain.toml`** -- CI should pin the Rust toolchain for reproducibility
- Local Rust version: 1.90.0 (stable)

### 2.2 GitHub Actions Workflow Design

**Recommended structure:** Single YAML file `.github/workflows/ci.yml` with parallel jobs.

```yaml
name: CI
on:
  push:
    branches: ['*']
  pull_request:
    branches: ['*']

jobs:
  rust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable  # or pin to specific version
        with:
          components: rustfmt, clippy
      - uses: Swatinem/rust-cache@v2          # CICD-02
      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y libssl-dev pkg-config
      - name: fmt
        run: cargo fmt --check --all
      - name: clippy
        run: cargo clippy --all-targets --all-features -- -D warnings
      - name: test
        run: cargo test --workspace
        env:
          DATABASE_URL: postgres://dummy  # needed for sqlx compile-time checks

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --run   # vitest run mode
      - run: npm run build
```

### 2.3 Key CI Considerations

1. **sqlx compile-time checks:** The workspace uses `sqlx` with `query_as!` and `query_scalar!` macros that check queries at compile time against a live database. For CI, either:
   - Use `SQLX_OFFLINE=true` with a prepared `sqlx-data.json` (preferred -- no database needed)
   - Or use `DATABASE_URL` pointing to a CI-spawned PostgreSQL
   - Currently there is NO `sqlx-data.json` or `.sqlx/` directory in the repo. This will be a blocker unless queries are switched to runtime-checked variants or offline mode is set up.

2. **Rust toolchain pinning:** Create a `rust-toolchain.toml` at workspace root:
   ```toml
   [toolchain]
   channel = "1.90.0"
   components = ["rustfmt", "clippy"]
   ```

3. **Test dependencies:** Some tests require PostgreSQL (testcontainers) or set environment variables. The `#[ignore]` attribute is used for DB-dependent tests. `cargo test --workspace` should pass without a running database.

4. **Frontend test runner:** Vitest is configured. `npm run test` runs vitest in watch mode by default; for CI use `npx vitest --run` or `npm run test -- --run`.

5. **Rust cache:** `Swatinem/rust-cache@v2` caches `~/.cargo/registry`, `~/.cargo/git`, and `target/` directories. Key should include `Cargo.lock` hash.

---

## 3. Domain Extraction Research

### 3.1 Workspace Crate Structure

The extraction will create two new workspace members:

```
Online_Judge/
├── Cargo.toml              # add: "domain-users", "domain-problems" to workspace.members
├── domain-users/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs          # re-exports user_router()
│       ├── models.rs       # moved from api/src/users/models.rs
│       ├── routes.rs       # moved from api/src/users/routes.rs
│       └── service.rs      # moved from api/src/users/service.rs
├── domain-problems/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs          # re-exports problems_router()
│       ├── models.rs       # moved from api/src/problems/models.rs
│       ├── routes.rs       # moved from api/src/problems/routes.rs
│       ├── test_cases.rs   # moved from api/src/problems/test_cases.rs
│       ├── access.rs       # moved from api/src/problems/access.rs
│       └── problem_access.rs  # moved from api/src/problems/problem_access.rs
```

### 3.2 Dependency Graph for Domain Crates

```
shared          api-infra          domain-users         domain-problems
  |                 |                    |                      |
  |                 |--- AppError        |                      |
  |                 |--- AppState*       |                      |
  |--- Claims       |                   |                      |
  |--- Role         |                   |                      |
  |--- User         |                   |                      |
  |--- UserPublic   |                   |                      |
  |                 |                   |                      |
domain-users depends on: shared, api-infra
domain-problems depends on: shared, api-infra
api depends on: shared, api-infra, domain-users, domain-problems
```

*Note: AppState is currently in the `api` crate, NOT in api-infra. The api-infra lib.rs explicitly states: "AppState stays in the api crate because it references api::auth::JwtService. It will move to api-infra in Phase 2 when domain crates are extracted and JwtService is abstracted behind a trait."*

### 3.3 The AppState Problem

**Current situation:** `AppState` is defined in BOTH:
- `api/src/main.rs` (used at runtime)
- `api/src/lib.rs` (used by tests and other modules)

Both definitions are identical:
```rust
pub struct AppState {
    pub db_pool: PgPool,
    pub redis_pool: Option<RedisPool>,
    pub redis_url: String,
    pub jwt_service: JwtService,
    pub jwt_secret: String,
    pub worker_secret: String,
    pub websocket_server: Arc<WebSocketServer>,
}
```

**Problem:** Domain crates need `Router<AppState>`, but `AppState` lives in the `api` crate. If domain crates depend on `api`, that's a circular dependency.

**Solution options (ranked by simplicity):**

**Option A: Move AppState to api-infra (RECOMMENDED)**
- Move `AppState` to `api-infra/src/state.rs`
- Abstract `JwtService` behind a trait in `api-infra/src/traits/` (e.g., `TokenService`)
- `AppState` in api-infra holds `Box<dyn TokenService>` instead of concrete `JwtService`
- Domain crates depend on `api-infra` for AppState
- The `api` crate provides the concrete `JwtService` impl and constructs AppState
- This aligns with the note in `api-infra/src/lib.rs`

**Option B: Generic Router pattern**
- Domain crates define `Router<A>` where `A: Send + Sync + Clone + 'static`
- Each handler uses a trait bound to access `db_pool`, etc.
- More complex, more trait boilerplate, harder to maintain

**Option C: Keep AppState in api, use type aliases**
- Domain crates use a trait like `HasDbPool` etc.
- Fragile, lots of boilerplate

**Recommendation:** Option A. The api-infra lib.rs comment explicitly states this is the planned approach. The key steps:
1. Define `TokenService` trait in `api-infra/src/traits/` with `generate_access_token`, `generate_refresh_token`, `validate_token`
2. Move `AppState` to `api-infra` with `jwt_service: Arc<dyn TokenService>` instead of concrete `JwtService`
3. `api/src/auth/jwt_service.rs` implements `TokenService`
4. Domain crates import `AppState` from `api-infra`

### 3.4 AuthExtractor Problem

**Current location:** `api/src/middleware/auth.rs` -- `AuthExtractor` struct
**Used by:** Every domain module (users, problems, classes, contests, etc.)

The `AuthExtractor` reads JWT_SECRET from env vars and creates a `JwtService` inline. It also depends on `crate::auth::JwtService`. This must be moved to `api-infra` so domain crates can use it.

**Steps:**
1. Move `AuthExtractor` to `api-infra/src/middleware/auth.rs`
2. It should validate tokens using the `TokenService` trait (or just decode the claims struct)
3. Since it currently reads from env vars, it could instead take the secret from request extensions (injected by the auth middleware layer)

**Simpler alternative for Phase 2:** Move `AuthExtractor` to `api-infra` with a direct dependency on `jsonwebtoken` for decoding. The validation logic is simple (decode JWT, extract claims) and doesn't need the full `JwtService` abstraction.

### 3.5 Auth<->Users Circular Dependency

The `auth/routes.rs` module imports from `users/`:
```rust
use crate::users::models::{LoginRequest as DbLoginRequest, RefreshTokenRequest, RegisterRequest};
use crate::users::service::UserService;
```

This creates a problem: if `domain-users` is a separate crate, and `auth/` stays in `api`, then `api` depends on `domain-users` (works). But `domain-users` needs `JwtService` which is in `api/auth/` -- that's a circular dependency if `auth/` is in `api`.

**Resolution:** The auth module (`auth/jwt_service.rs`, `auth/routes.rs`) stays in the `api` crate. Only the `users/` domain logic moves out. The `api` crate depends on `domain-users`, not the reverse. The `domain-users` crate depends on `api-infra` for the `TokenService` trait (not the concrete `JwtService`).

### 3.6 Trait Design for JwtService Abstraction

A `TokenService` trait in `api-infra`:

```rust
// api-infra/src/traits/token_service.rs
use async_trait::async_trait;
use shared::models::Claims;
use crate::error::AppError;

#[async_trait]
pub trait TokenService: Send + Sync {
    fn generate_access_token(&self, user: &shared::models::User) -> Result<String, AppError>;
    fn generate_refresh_token(&self, user: &shared::models::User) -> Result<String, AppError>;
    fn validate_token(&self, token: &str) -> Result<Claims, AppError>;
}
```

Then `api/src/auth/jwt_service.rs` implements this trait:
```rust
impl TokenService for JwtService { ... }
```

And `AppState` in `api-infra` uses:
```rust
pub jwt_service: Arc<dyn TokenService>,
```

### 3.7 Import Path Changes After Extraction

**Before:**
```rust
use crate::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthExtractor;
use crate::auth::JwtService;
```

**After (in domain-users):**
```rust
use api_infra::state::AppState;
use api_infra::error::AppError;
use api_infra::middleware::AuthExtractor;  // if moved to api-infra
use api_infra::traits::TokenService;       // trait only, not concrete type
```

**After (in domain-problems):**
```rust
use api_infra::state::AppState;
// No JwtService needed
// AuthExtractor from api-infra
```

### 3.8 `api/src/main.rs` Router Assembly Changes

**Before:**
```rust
.nest("/users", users::user_router())
.nest("/problems", problems::problems_router())
```

**After:**
```rust
.nest("/users", domain_users::user_router())
.nest("/problems", domain_problems::problems_router())
```

The `main.rs` module declarations change:
```rust
// Remove:
mod users;
mod problems;

// Keep all other mod declarations
```

And `api/Cargo.toml` adds:
```toml
domain-users = { path = "../domain-users" }
domain-problems = { path = "../domain-problems" }
```

---

## 4. Risk Assessment

### 4.1 HIGH RISK

| Risk | Impact | Mitigation |
|---|---|---|
| **sqlx compile-time query checking** | If `SQLX_OFFLINE=true` is not set and no database is available, `cargo build` fails on `query_as!` macros | Set up `.sqlx/` offline query data or switch all queries to runtime-checked (`query_as_unchecked!` equivalent, or use `sqlx::query_as::<_, Row>(&sql)` runtime strings) |
| **AppState location creates circular dependency** | Domain crates need AppState but AppState references concrete types from api | Must move AppState to api-infra with trait-based JwtService |
| **AuthExtractor location** | Used by all domain modules; currently in api crate | Must move to api-infra before domain extraction |
| **Auth routes depend on users models/service** | Moving users out breaks auth routes | Keep auth in api crate; api depends on domain-users |

### 4.2 MEDIUM RISK

| Risk | Impact | Mitigation |
|---|---|---|
| **Duplicate AppState definitions** | `main.rs` and `lib.rs` both define AppState; tests reference `crate::AppState` | Consolidate to single definition in `lib.rs` (or api-infra after move) |
| **Problems uses StatusCode instead of AppError** | Different error handling pattern than users | Can normalize during extraction or leave as-is (Decision D-05: move as-is) |
| **Test references** | `release_gate_tests.rs` references `crate::auth::JwtService`, `crate::AppState`, `crate::websocket::WebSocketServer` | Update import paths after AppState moves |
| **bcrypt dependency in domain-users** | `domain-users/Cargo.toml` must include bcrypt | Straightforward -- just add to Cargo.toml |

### 4.3 LOW RISK

| Risk | Impact | Mitigation |
|---|---|---|
| **Frontend CI may have lint config issues** | ESLint config is partial (lints specific files, not all src/) | Run lint only on configured paths; extend later |
| **No package-lock.json committed** | `npm ci` requires `package-lock.json` | Verify it exists and is committed |
| **Rust edition compatibility** | Edition 2021; toolchain 1.90 should be compatible | Pin toolchain in `rust-toolchain.toml` |

### 4.4 Risk: sqlx Offline Mode (Detailed)

The current codebase uses these sqlx macro patterns:
- `sqlx::query_as::<_, T>(sql)` -- runtime-checked, no issue
- `sqlx::query_scalar::<_, T>(sql)` -- runtime-checked, no issue
- No `sqlx::query!` or `sqlx::query_as!` (compile-time checked) were found in the users or problems modules

**Conclusion:** All queries in users and problems use the runtime-checked `_::<_, T>` syntax, NOT the compile-time `!` variants. This means **sqlx offline mode is NOT needed for these modules**. The `DATABASE_URL` env var is still needed at compile time for sqlx's `query!` macro if used elsewhere, but for users and problems specifically, this is not a concern.

However, `sqlx::migrate!()` in `api/src/db/schema.rs` IS a compile-time macro that embeds migrations. This is in the `api` crate, not domain crates, so it won't affect domain crate compilation.

---

## 5. Validation Architecture

### 5.1 CI-Based Verification (Decision D-07)

Per the user's decision, verification is CI-only:
1. `cargo build --workspace` succeeds
2. `cargo test --workspace` passes
3. `cargo clippy --all-targets -- -D warnings` passes
4. `cargo fmt --check --all` passes

### 5.2 Build-Level Verification

```bash
# Independent compilation of domain crates
cargo build -p domain-users
cargo build -p domain-problems

# Full workspace build
cargo build --workspace

# Ensure api crate still compiles with domain crates as dependencies
cargo build -p api
```

### 5.3 Functional Verification

Since this is a refactoring (no new features), the validation is:
- All existing tests pass (no behavioral changes)
- All router endpoints are still registered (verify by checking route output or test)
- The `cargo test --workspace` output includes tests from both `domain-users` and `domain-problems`

### 5.4 What NOT to Verify

Per scope:
- No E2E testing
- No manual endpoint testing
- No performance benchmarking
- No tenant isolation testing (that's TEST-03, Phase 7)

---

## 6. Key Findings and Recommendations

### 6.1 Execution Order

The phase MUST be executed in this order due to dependencies:

**Step 1: CI Pipeline (independent of extraction)**
1. Create `rust-toolchain.toml` at workspace root
2. Create `.github/workflows/ci.yml` with parallel Rust + Frontend jobs
3. Add `Swatinem/rust-cache@v2` for Rust caching
4. Push to a test branch, verify CI passes

**Step 2: Infrastructure Prerequisites (before domain extraction)**
1. Define `TokenService` trait in `api-infra/src/traits/`
2. Move `AppState` to `api-infra/src/state.rs` (with `Arc<dyn TokenService>`)
3. Move `AuthExtractor` to `api-infra/src/middleware/auth.rs`
4. Update all `use crate::AppState` references in `api` crate to `use api_infra::state::AppState`
5. Update all `use crate::middleware::auth::AuthExtractor` references to `use api_infra::middleware::AuthExtractor`
6. Verify `cargo build --workspace` passes after infrastructure changes

**Step 3: Extract domain-problems (simpler, no cross-domain deps)**
1. Create `domain-problems/` crate with `Cargo.toml`
2. Move all files from `api/src/problems/` to `domain-problems/src/`
3. Update import paths (`crate::AppState` -> `api_infra::state::AppState`, etc.)
4. Update `api/Cargo.toml` to depend on `domain-problems`
5. Update `api/src/main.rs` router assembly: `domain_problems::problems_router()`
6. Remove `mod problems;` from `api/src/lib.rs`
7. Verify `cargo build -p domain-problems` succeeds independently

**Step 4: Extract domain-users (more complex, has auth coupling)**
1. Create `domain-users/` crate with `Cargo.toml`
2. Move models.rs, service.rs, routes.rs from `api/src/users/` to `domain-users/src/`
3. Update import paths
4. `UserService::new()` takes `PgPool + Arc<dyn TokenService>` instead of `PgPool + JwtService`
5. Keep `api/src/auth/` in the api crate (auth routes stay in api)
6. Update `api/src/auth/routes.rs` imports: `use domain_users::models::*` and `use domain_users::service::UserService`
7. Update `api/src/main.rs`: `domain_users::user_router()`
8. Remove `mod users;` from `api/src/lib.rs`
9. Verify `cargo build -p domain-users` succeeds independently

**Step 5: Final verification**
1. `cargo build --workspace` passes
2. `cargo test --workspace` passes
3. `cargo clippy --all-targets -- -D warnings` passes
4. `cargo fmt --check --all` passes
5. CI pipeline runs on the PR and passes

### 6.2 Crate Dependency Graph (Post-Extraction)

```
            shared (no deps)
               |
           api-infra
         (depends on shared)
          /        \
   domain-users   domain-problems
    (shared, api-infra)    (shared, api-infra)
          \        /
            api
 (depends on all above + auth module stays here)
```

### 6.3 Cargo.toml Contents for Domain Crates

**domain-users/Cargo.toml:**
```toml
[package]
name = "domain-users"
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
bcrypt = "0.16"
anyhow = "1.0"
async-trait = "0.1"
tokio = { workspace = true }
```

**domain-problems/Cargo.toml:**
```toml
[package]
name = "domain-problems"
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
async-trait = "0.1"
```

### 6.4 Estimated Complexity

| Task | Complexity | Reason |
|---|---|---|
| CI workflow creation | LOW | Standard GitHub Actions pattern |
| TokenService trait definition | LOW | Simple trait with 3 methods |
| AppState move to api-infra | MEDIUM | Touches every module that uses `crate::AppState` (19 files) |
| AuthExtractor move to api-infra | MEDIUM | Touches every module that uses `AuthExtractor` (12 files) |
| domain-problems extraction | LOW | No cross-domain deps, 6 files to move |
| domain-users extraction | MEDIUM | Auth coupling, service trait injection |
| Import path updates across api crate | MEDIUM | Mechanical but many files to touch |

### 6.5 Files Changed Per Step (Estimate)

**Step 2 (Infrastructure):** ~25 files
- New: `api-infra/src/state.rs`, `api-infra/src/traits/token_service.rs`
- Modified: `api-infra/src/lib.rs`, all 19 files importing `crate::AppState`, all 12 files importing `AuthExtractor`, `api/src/main.rs`, `api/src/lib.rs`

**Step 3 (domain-problems):** ~10 files
- New: `domain-problems/Cargo.toml`, 6 source files
- Modified: `Cargo.toml` (workspace), `api/Cargo.toml`, `api/src/main.rs`, `api/src/lib.rs`

**Step 4 (domain-users):** ~10 files
- New: `domain-users/Cargo.toml`, 4 source files
- Modified: `Cargo.toml` (workspace), `api/Cargo.toml`, `api/src/main.rs`, `api/src/lib.rs`, `api/src/auth/routes.rs`

### 6.6 Critical Prerequisite Check

Before starting extraction, verify:
1. `cargo build --workspace` currently passes on master
2. `cargo test --workspace` currently passes
3. No uncommitted changes that would conflict
4. The `shared` crate's `User` model has all fields that `JwtService` needs (verified: yes -- id, username, email, password_hash, role, school_id, campus_id)

---

## RESEARCH COMPLETE
