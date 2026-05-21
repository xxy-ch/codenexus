# Phase 1 Research: Architecture Foundation + Secret Management

**Researched:** 2026-04-13
**Scope:** api-infra crate extraction, async trait patterns, testcontainers setup, AppConfig design, WebSocket extraction, trait-based dependency injection

---

## Research Questions

### RQ1: Async Trait Patterns -- `async_trait` vs Native Async fn in Traits

**Finding: Use `async_trait` crate for now; plan migration to native async fn in traits when edition upgrades.**

**Context:** The project uses Rust **edition 2021** across all three crates. Native async fn in traits was stabilized in Rust 1.75 (released Dec 2023). The current compiler is rustc 1.90.0, so native async fn in traits IS supported. However, edition 2021 does not provide the `-> impl Future` return-type syntax that would make trait object usage ergonomic with native async fn.

**Technical analysis:**

| Aspect | `#[async_trait]` macro (0.1.x) | Native `async fn` in traits |
|--------|-------------------------------|---------------------------|
| MSRV | 1.39+ | 1.75+ (available here: 1.90) |
| Trait object support | Yes (`dyn MyTrait`) | Not directly (returns `impl Future`, needs `Box<dyn Future>` or RPITIT) |
| Trait bounds | Standard (`T: MyTrait + Send + Sync`) | Same, but `Send` bounds on returned futures need explicit annotation |
| Runtime cost | Heap allocation via `Box<dyn Future>` | Zero-cost (no boxing, monomorphized) |
| Ergonomics | Natural `async fn` syntax | Natural syntax, but edge cases with `Send` bounds |
| `dyn Trait` usage | Works seamlessly | Requires explicit return-type boxing or `async-trait` wrapper |

**Decision rationale:**

The CONTEXT.md D3 decision already shows both approaches (`#[async_trait]` or "native async fn when MSRV allows"). For Phase 1, we define **trait interfaces only** -- no implementations yet. The recommended approach is:

1. **Define traits with `#[async_trait]`** for now because:
   - The existing codebase already depends on `async-trait = "0.1"` (see `api/Cargo.toml` line 38)
   - It enables `dyn Trait` usage in `AppState`, which simplifies wiring in `main()` and testing
   - Zero behavior change from current code patterns (middleware already uses `#[async_trait]` for `AuthExtractor`)
   - When domain crates are extracted in Phases 2-4, concrete generics can replace trait objects where performance matters

2. **Migration path:** When the project eventually upgrades to edition 2024 (Rust 1.85+), traits can drop `#[async_trait]` and use native async fn with RPITIT (Return Position Impl Trait In Traits). This is a mechanical change at the trait definition site and does not affect callers.

**Code pattern for Phase 1 trait definitions:**

```rust
// api-infra/src/traits/user_repo.rs
use async_trait::async_trait;
use shared::models::user::{User, UserPublic};
use shared::models::role::Role;
use uuid::Uuid;
use crate::AppError;

/// Input for creating a user
pub struct CreateUserInput {
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub school_id: i64,
    pub campus_id: Option<i64>,
}

/// Input for updating a user
pub struct UpdateUserInput {
    pub username: Option<String>,
    pub email: Option<String>,
    pub role: Option<String>,
    pub campus_id: Option<i64>,
}

/// Filter for listing users
pub struct UserFilter {
    pub organization_id: Option<i64>,
    pub role: Option<Role>,
    pub limit: u32,
    pub offset: u32,
}

#[async_trait]
pub trait UserRepo: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AppError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, AppError>;
    async fn find_by_username(&self, username: &str) -> Result<Option<User>, AppError>;
    async fn create(&self, input: CreateUserInput) -> Result<User, AppError>;
    async fn update(&self, id: Uuid, input: UpdateUserInput) -> Result<User, AppError>;
    async fn delete(&self, id: Uuid) -> Result<(), AppError>;
    async fn list(&self, filter: UserFilter) -> Result<Vec<User>, AppError>;
    async fn count_by_organization(&self, organization_id: i64) -> Result<i64, AppError>;
}
```

**Key implications for `api-infra` Cargo.toml:**

```toml
[dependencies]
async-trait = "0.1"  # already in workspace via api crate
```

---

### RQ2: Structuring `api-infra` as a Cargo Workspace Crate

**Finding: `api-infra` must be an Axum-aware crate with a carefully curated dependency set.**

**Current dependency analysis of components being extracted:**

| Component | Dependencies (from `api`) | Notes |
|-----------|--------------------------|-------|
| `AppError` | `axum`, `serde_json`, `anyhow` | No `sqlx` dependency -- the `From<sqlx::Error>` impl should NOT move to api-infra because it would force `sqlx` as a dep |
| `AppState` | `sqlx::PgPool`, `deadpool_redis::Pool`, `auth::JwtService`, `websocket::WebSocketServer` | Uses both DB and Redis types -- but AppState is just a struct definition |
| Middleware (auth) | `axum`, `shared::models`, `crate::auth::JwtService`, `deadpool_redis::redis::cmd`, `crate::AppState` | Tightly coupled to AppState and Redis |
| Middleware (authz) | `axum`, `shared::models`, `crate::rbac::RbacService` | No AppState dependency |
| Middleware (tenant) | `axum`, `shared::models::Claims` | No AppState dependency |
| Middleware (permission) | `axum`, `shared::models`, `crate::rbac::RbacService`, `crate::AppState`, `sqlx` | Has direct SQL queries for org/campus access checks |
| WebSocket server | `tokio::sync`, `uuid`, `serde_json`, `chrono`, `anyhow` | Self-contained, no Axum dependency |
| WebSocket handler | `axum`, `crate::AppState`, `crate::auth::JwtService`, `sqlx` | Heavily coupled to DB -- should NOT move to api-infra in Phase 1 |
| `RbacService` | `shared::models` | Pure logic, zero Axum/DB deps |
| Traits | `async_trait`, `uuid`, `shared::models`, `crate::AppError` | Depends on AppError |

**Critical coupling issue -- `AppState` type references:**

The `AppState` struct in `api/src/lib.rs` contains `sqlx::PgPool` and `deadpool_redis::Pool` as fields. Moving this to `api-infra` means api-infra needs sqlx and deadpool-redis as dependencies. This contradicts CONTEXT.md D1 ("db/redis stay in api").

**Resolution -- keep AppState in `api` crate, define a trait for it:**

```rust
// api-infra/src/state.rs
/// Minimal state interface that domain routers require.
/// The `api` crate implements this with concrete pool types.
pub trait HasDbPool: Send + Sync {
    fn db_pool(&self) -> &sqlx::PgPool;
}

// Alternative: just keep AppState in api, re-export the type info
```

**Revised approach based on actual code analysis:**

After examining every `use crate::AppState` reference (21 locations across 13 files), the realistic extraction plan is:

1. **Move to `api-infra`:** `AppError`, `RbacService`, middleware functions (tenant, authz, permission -- with modifications), `WebSocketServer` + `WebSocketMessage` + topics, `TenantContext`, trait interfaces, `AppConfig`
2. **Keep in `api`:** `AppState` (references concrete pool types), `WebSocketHandler` (has SQL queries), middleware `auth` (references `AppState.jwt_secret` and Redis for blacklist), `JwtService` (JWT-specific, tightly coupled to auth flows)

**Recommended `api-infra/Cargo.toml`:**

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
uuid = { version = "1.11", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
anyhow = "1.0"
async-trait = "0.1"
tracing = { workspace = true }
# AppError IntoResponse needs axum's response types
# Middleware needs axum's extract, middleware types

# For AppState type reference ( PgPool type only in struct definition)
# We forward-reference sqlx types but do NOT run queries in api-infra
sqlx = { version = "0.8", features = ["runtime-tokio", "tls-rustls", "postgres", "uuid", "chrono"] }
deadpool-redis = { version = "0.22", features = ["serde"] }

[dev-dependencies]
tower = { version = "0.5", features = ["util"] }
```

**Why sqlx and deadpool-redis are needed despite "db stays in api":**

The `AppState` struct contains `db_pool: PgPool` and `redis_pool: Option<deadpool_redis::Pool>`. If `AppState` moves to `api-infra` (as CONTEXT.md D1 states), these types must be available. The key invariant is: **api-infra defines the struct, but does not CREATE the pools**. Pool creation remains in `api/src/db/` and `api/src/redis/`.

---

### RQ3: Re-exporting from Workspace Crate for Incremental Migration

**Finding: Use `pub use` re-exports in `api/src/lib.rs` to maintain backward compatibility during extraction.**

This is the single most important pattern for zero-downtime migration. Every `use crate::error::AppError` in the `api` crate (found in `users/routes.rs`, `submissions/routes.rs`, `notifications/routes.rs`) must continue to compile.

**Pattern:**

```rust
// Step 1 (commit: move AppError to api-infra)
// api/src/error.rs -- becomes a thin re-export file

//! Re-export from api-infra.
//! This module will be removed once all direct consumers are updated.
pub use api_infra::error::AppError;

// Step 2 (commit: move middleware)
// api/src/middleware/tenant.rs -- becomes re-export
pub use api_infra::middleware::tenant::*;
pub use api_infra::middleware::tenant::TenantContext;
```

**Critical: Keep old module files as re-export shims, do not delete them in Phase 1.**

Deletion of the old `api/src/error.rs`, `api/src/middleware/`, `api/src/rbac/` files happens only after ALL `use crate::X` references within `api` are updated to use `api_infra::X` directly. This should be the FINAL commit of Phase 1 (step 11 in D2).

**Verification approach for each extraction commit:**

```bash
# After each component move, verify:
cargo build --workspace          # must pass
cargo test --workspace           # must pass
grep -rn "use crate::" api/src/  # catalog remaining internal refs
```

---

### RQ4: testcontainers-rs Setup for PostgreSQL + Redis

**Finding: Use `testcontainers` 0.23 + `testcontainers-modules` 0.11 (already in dev-deps).**

The `api/Cargo.toml` already has:
```toml
[dev-dependencies]
testcontainers = { version = "0.23", features = ["blocking"] }
testcontainers-modules = { version = "0.11", features = ["postgres"] }
```

**Note:** `testcontainers-modules` currently only has postgres. For Redis, use `GenericImage` from the core `testcontainers` crate.

**Recommended testkit structure:**

```rust
// api-infra/src/testkit/mod.rs
#[cfg(feature = "testkit")]
pub mod database;

#[cfg(feature = "testkit")]
pub mod redis;

#[cfg(feature = "testkit")]
pub mod app_state;
```

```rust
// api-infra/src/testkit/database.rs
use sqlx::PgPool;
use testcontainers::{ContainerAsync, runners::AsyncRunner};
use testcontainers_modules::postgres::Postgres;
use anyhow::Result;

pub struct PgTestContainer {
    container: ContainerAsync<Postgres>,
}

impl PgTestContainer {
    pub async fn start() -> Result<Self> {
        let container = Postgres::default().start().await?;
        Ok(Self { container })
    }

    pub fn connection_url(&self) -> String {
        // testcontainers-modules Postgres provides:
        // host, port, user, password, db via getters
        format!(
            "postgres://{}:{}@{}:{}/{}",
            "postgres",
            "postgres",
            self.container.get_host().await.unwrap(),
            self.container.get_host_port_ipv4(5432).await.unwrap(),
            "postgres"
        )
    }

    pub async fn create_pool(&self) -> Result<PgPool> {
        let url = self.connection_url();
        Ok(sqlx::postgres::PgPoolOptions::new()
            .max_connections(5)
            .connect(&url)
            .await?)
    }
}
```

```rust
// api-infra/src/testkit/redis.rs
use deadpool_redis::Pool;
use testcontainers::{ContainerAsync, GenericImage, runners::AsyncRunner};
use anyhow::Result;

pub struct RedisTestContainer {
    container: ContainerAsync<GenericImage>,
}

impl RedisTestContainer {
    pub async fn start() -> Result<Self> {
        let container = GenericImage::new("redis")
            .with_tag("7-alpine")
            .start()
            .await?;
        Ok(Self { container })
    }

    pub fn connection_url(&self) -> String {
        // GenericImage requires manual port/host access
        // Note: this is simplified -- actual usage needs async port resolution
        "redis://127.0.0.1:6379".to_string() // will be dynamic in real impl
    }

    pub async fn create_pool(&self) -> Result<Pool> {
        let url = self.connection_url();
        let cfg = deadpool_redis::Config::from_url(&url);
        Ok(cfg.create_pool(Some(deadpool_redis::Runtime::Tokio1))?)
    }
}
```

**Important caveat for testcontainers on macOS:**

`testcontainers` requires Docker. If Docker is not running, tests using it will fail at runtime. The `testkit` feature flag ensures these deps are only pulled in when running tests:

```toml
# api-infra/Cargo.toml
[features]
testkit = ["testcontainers", "testcontainers-modules"]

[dev-dependencies]
testcontainers = { version = "0.23", features = ["blocking"] }
testcontainers-modules = { version = "0.11", features = ["postgres"] }
```

**Alternative for environments without Docker:** Provide a `TestDb` trait that can be backed by either a real container or a `DATABASE_URL` env var pointing to a local instance.

---

### RQ5: Axum State Extraction When AppState Lives in Another Crate

**Finding: This works seamlessly because Axum's `State<T>` is generic over any `Clone + Send + Sync + 'static` type.**

Axum does not care WHERE `AppState` is defined, only that:
1. It implements `Clone` (currently `#[derive(Clone)]`)
2. All fields are `Clone`
3. It is `Send + Sync + 'static`

**The challenge is not Axum's State mechanism but the downstream references:**

```rust
// In api/src/submissions/routes.rs (currently):
use crate::AppState;  // <- this needs to change

pub async fn submit_code(
    State(state): State<AppState>,  // <- this auto-fixes with the import change
    ...
) -> ... {
    state.db_pool.clone()  // <- works regardless of where AppState is defined
}
```

**Migration path:**

```rust
// After moving AppState to api-infra:

// api/src/lib.rs
pub use api_infra::AppState;  // re-export for backward compat

// api/src/submissions/routes.rs
// Option A (lazy): keep using `crate::AppState` -- works via re-export
// Option B (immediate): change to `use api_infra::AppState;`
```

**Router composition pattern (domain crates in Phase 2+):**

```rust
// api-infra provides a router builder that accepts any state
// In Phase 1, this is not needed yet -- api stays as the only consumer

// Phase 2+ pattern:
// domain-users/src/routes.rs
pub fn user_router<S: Clone + Send + Sync + 'static>() -> Router<S> {
    Router::new()
        .route("/", get(list_users))
        .route("/:id", get(get_user))
}

// api/src/main.rs
let app = Router::new()
    .nest("/users", domain_users::user_router())
    .with_state(app_state);  // Axum coerces Router<()> to Router<AppState>
```

---

### RQ6: WebSocket Server Extraction -- Cross-Crate Boundaries

**Finding: Extract `WebSocketServer` and `WebSocketMessage` to `api-infra`; keep `WebSocketHandler` in `api` because of DB queries.**

**What moves to `api-infra`:**
- `api/src/websocket/server.rs` -> `api-infra/src/websocket/server.rs` (self-contained, pure async with `tokio::sync` primitives)
- `api/src/websocket/message.rs` -> `api-infra/src/websocket/message.rs` (serde types, no external deps beyond `chrono` and `serde_json`)
- `api/src/websocket/server::topics` module -> `api-infra/src/websocket/topics.rs`

**What stays in `api`:**
- `api/src/websocket/handler.rs` -- references `crate::AppState` (6 times), `sqlx::query_as`, `crate::auth::JwtService`. Contains DB queries for access control. This is application logic, not infrastructure.

**Dependency chain after extraction:**

```
api/src/websocket/handler.rs
  -> api_infra::websocket::server (WebSocketServer, AddClientResult, topics)
  -> api_infra::websocket::message (WebSocketMessage)
  -> api::AppState (for db_pool, jwt_secret, websocket_server)
  -> sqlx (for access control queries)
  -> crate::auth::JwtService (for token validation)
```

**The `WebSocketServer` has no Axum dependency.** It uses:
- `tokio::sync::{Mutex, RwLock}` (tokio is a workspace dep)
- `uuid::Uuid` (already in shared)
- `anyhow::Error` (for send/broadcast returns)
- `serde_json` (for message serialization)
- `std::collections::HashMap`, `std::net::IpAddr` (stdlib)

This means it can be extracted cleanly to `api-infra` without pulling in Axum.

---

### RQ7: AppConfig Pattern for Rust Web Services

**Finding: Manual struct with `from_env()` validation is the right choice. No external config crate needed.**

**Analysis of options:**

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| `config` crate | Supports TOML/YAML/JSON, env fallback, type-safe | Heavy dependency (pulls in 10+ transitive deps), overkill for env-only config | REJECT |
| `dotenvy` + manual | Already used (`dotenvy::dotenv().ok()` in main.rs), minimal, explicit | More boilerplate, but clearer | ACCEPT |
| `envy` crate | Derive-based env parsing | Adds another dependency for marginal convenience | REJECT |
| `clap` | Great for CLI args | Overkill for server config | REJECT |
| Manual `from_env()` | Full control, zero extra deps, testable, compile-time field names | More code to write | ACCEPT |

**Recommended implementation:**

```rust
// api-infra/src/config.rs
use std::env;

/// Application environment
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppEnv {
    Production,
    Development,
    Test,
}

impl AppEnv {
    pub fn from_env() -> Self {
        match env::var("APP_ENV").as_deref() {
            Ok("production") => AppEnv::Production,
            Ok("test") => AppEnv::Test,
            _ => AppEnv::Development,
        }
    }

    pub fn is_production(&self) -> bool {
        matches!(self, AppEnv::Production)
    }

    pub fn is_test(&self) -> bool {
        matches!(self, AppEnv::Test)
    }
}

/// Startup error -- application cannot start
#[derive(Debug)]
pub enum AppStartupError {
    MissingSecret(&'static str),
    InvalidValue { key: &'static str, reason: String },
}

impl std::fmt::Display for AppStartupError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppStartupError::MissingSecret(key) => {
                write!(f, "Required secret '{}' is not set. Set it in .env or environment.", key)
            }
            AppStartupError::InvalidValue { key, reason } => {
                write!(f, "Invalid value for '{}': {}", key, reason)
            }
        }
    }
}

/// Application configuration, validated at startup
#[derive(Debug, Clone)]
pub struct AppConfig {
    pub app_env: AppEnv,
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub worker_secret: String,
    pub bind_address: String,
    pub cors_origins: Vec<String>,
}

impl AppConfig {
    /// Load configuration from environment variables.
    ///
    /// In production: fails if secrets are missing.
    /// In development: warns and uses insecure defaults.
    /// In test: uses test-safe defaults.
    pub fn from_env() -> Result<Self, AppStartupError> {
        let app_env = AppEnv::from_env();

        let jwt_secret = match env::var("JWT_SECRET") {
            Ok(v) if !v.is_empty() => v,
            _ if app_env.is_production() => {
                return Err(AppStartupError::MissingSecret("JWT_SECRET"));
            }
            _ => {
                tracing::warn!("JWT_SECRET not set -- using insecure development default");
                "dev-only-insecure-jwt-secret-do-not-use-in-production".to_string()
            }
        };

        let worker_secret = match env::var("WORKER_SECRET") {
            Ok(v) if !v.is_empty() => v,
            _ if app_env.is_production() => {
                return Err(AppStartupError::MissingSecret("WORKER_SECRET"));
            }
            _ => {
                tracing::warn!("WORKER_SECRET not set -- using insecure development default");
                "dev-only-insecure-worker-secret-do-not-use-in-production".to_string()
            }
        };

        let database_url = env::var("DATABASE_URL")
            .map_err(|_| AppStartupError::MissingSecret("DATABASE_URL"))?;

        let redis_url = env::var("REDIS_URL")
            .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());

        let bind_address = env::var("API_BIND_ADDRESS")
            .unwrap_or_else(|_| "0.0.0.0:3000".to_string());

        let cors_origins = if app_env.is_production() {
            env::var("CORS_ORIGINS")
                .unwrap_or_else(|_| String::new())
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        } else {
            vec!["*".to_string()]  // allow all in dev/test
        };

        Ok(Self {
            app_env,
            database_url,
            redis_url,
            jwt_secret,
            worker_secret,
            bind_address,
            cors_origins,
        })
    }

    /// Create config for testing (no env vars required)
    #[cfg(test)]
    pub fn test_config() -> Self {
        Self {
            app_env: AppEnv::Test,
            database_url: "postgres://localhost/test".to_string(),
            redis_url: "redis://127.0.0.1:6379".to_string(),
            jwt_secret: "test-jwt-secret".to_string(),
            worker_secret: "test-worker-secret".to_string(),
            bind_address: "0.0.0.0:0".to_string(),
            cors_origins: vec!["*".to_string()],
        }
    }
}
```

**Key design decisions:**

1. **Empty string check on secrets:** `JWT_SECRET=""` is treated as unset. Prevents accidentally deploying with an empty secret from a CI/CD variable that was not set.
2. **Structured error type:** `AppStartupError` gives clear, actionable messages instead of panicking with `expect()`.
3. **`AppEnv::Test` variant:** Tests can construct config without touching environment variables, avoiding test ordering issues.
4. **CORS as `Vec<String>`:** In production, each origin must be explicitly listed. In development, `["*"]` allows all.
5. **No `dotenvy` dependency in `api-infra`:** The `api` crate calls `dotenvy::dotenv().ok()` in `main()` BEFORE calling `AppConfig::from_env()`. This keeps `api-infra` free of dotenv dependencies.

---

### RQ8: Trait Definitions Referencing Domain Model Types

**Finding: Trait method signatures should use types from `shared` crate for cross-cutting types (Uuid, Role, Permission, Claims) and define domain-specific input/output types alongside the trait.**

**The problem:** If a repository trait returns `Problem`, but `Problem` is currently defined in `api/src/problems/models.rs`, then `api-infra` would depend on `api` -- creating a circular dependency.

**Solution -- two-tier type strategy:**

**Tier 1: Cross-cutting types in `shared` (already there):**
- `Uuid`, `Role`, `Permission`, `Claims`, `User`, `UserPublic`
- These are used in trait signatures as-is

**Tier 2: Domain-specific input/output types defined WITH the trait in `api-infra`:**

```rust
// api-infra/src/traits/problem_repo.rs

/// Problem summary -- minimal type for cross-domain references.
/// Domain crate's full `Problem` model can `From<ProblemSummary>` or vice versa.
#[derive(Debug, Clone)]
pub struct ProblemSummary {
    pub id: i64,
    pub title: String,
    pub difficulty: String,
    pub visibility: String,
    pub organization_id: i64,
    pub created_by: Option<uuid::Uuid>,
}

/// Input for creating a problem
pub struct CreateProblemInput {
    pub title: String,
    pub description: String,
    pub difficulty: String,
    pub time_limit_ms: i32,
    pub memory_limit_kb: i32,
    pub visibility: String,
    pub organization_id: i64,
    pub created_by: uuid::Uuid,
}

#[async_trait]
pub trait ProblemRepo: Send + Sync {
    async fn find_by_id(&self, id: i64) -> Result<Option<ProblemSummary>, AppError>;
    async fn find_by_ids(&self, ids: &[i64]) -> Result<Vec<ProblemSummary>, AppError>;
    async fn exists(&self, id: i64) -> Result<bool, AppError>;
    async fn create(&self, input: CreateProblemInput) -> Result<i64, AppError>;
    async fn list(&self, filter: ProblemFilter) -> Result<Vec<ProblemSummary>, AppError>;
    // ... more methods
}
```

**Why not use the domain crate's full model types directly?**

1. **Circular dependency prevention:** `api-infra` cannot depend on `api` or future domain crates
2. **Interface stability:** Trait input/output types define the contract. Full domain models may have internal fields (like `test_case_results`) that are not part of the repository interface
3. **Conversion at the boundary:** The implementing repository in the domain crate converts between its full model and the trait's summary/input types using `From`/`Into` impls

**When domain crates are extracted in Phase 2+:**

```rust
// domain-problems/src/repository.rs
use api_infra::traits::problem_repo::{ProblemRepo, ProblemSummary, CreateProblemInput};
use crate::models::Problem;  // full domain model

pub struct SqlxProblemRepository {
    pool: PgPool,
}

#[async_trait]
impl ProblemRepo for SqlxProblemRepository {
    async fn find_by_id(&self, id: i64) -> Result<Option<ProblemSummary>, AppError> {
        let problem: Option<Problem> = sqlx::query_as(...)
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(problem.map(ProblemSummary::from))
    }
}

// Conversion impl in domain crate (Problem -> ProblemSummary)
impl From<Problem> for ProblemSummary {
    fn from(p: Problem) -> Self {
        Self {
            id: p.id,
            title: p.title,
            difficulty: p.difficulty,
            visibility: p.visibility,
            organization_id: p.organization_id,
            created_by: p.created_by,
        }
    }
}
```

---

## Validation Architecture

Testable properties for each Phase 1 success criterion:

### SC1: `cargo build --workspace` succeeds with `api-infra` compiling independently

**Validation:**
```bash
cargo build --workspace          # all 4 crates compile
cargo build -p api-infra         # api-infra compiles alone
cargo build -p shared            # shared still compiles
cargo build -p judge-worker      # judge-worker still compiles (unchanged)
cargo build -p api               # api compiles, depends on api-infra
```

**Property:** No circular dependency errors. `cargo metadata --format-version 1 | jq '.resolve.nodes[] | select(.id == "api-infra") | .deps[].pkg_id'` shows deps only on `shared`, not on `api` or `judge-worker`.

### SC2: All 8 repository traits defined with full method signatures

**Validation:**
```bash
# Each trait file exists and compiles
ls api-infra/src/traits/{user_repo,problem_repo,submission_repo,contest_repo,class_repo,community_repo,leaderboard_repo,search_repo}.rs
cargo doc -p api-infra --no-deps  # generates docs for all trait methods
```

**Property:** Each trait file contains exactly one `#[async_trait]` trait definition with at least 5 methods. All method signatures return `Result<T, AppError>`.

### SC3: Application refuses to start if `APP_ENV=production` and JWT_SECRET/WORKER_SECRET are unset

**Validation:**
```bash
APP_ENV=production cargo run -p api 2>&1 | grep -q "JWT_SECRET.*not set"
# Should exit with non-zero code

APP_ENV=production JWT_SECRET=x WORKER_SECRET=y DATABASE_URL=postgres://x cargo run -p api
# Should start successfully (will fail at DB connection, but config passes)

APP_ENV=development cargo run -p api 2>&1 | grep -q "insecure.*default"
# Should warn but start
```

**Property:** `AppConfig::from_env()` returns `Err(AppStartupError::MissingSecret(_))` when `APP_ENV=production` and secret is empty/unset. Returns `Ok` with a non-empty default when `APP_ENV=development`.

### SC4: Shared test infrastructure compiles and sample test passes

**Validation:**
```bash
cargo test -p api-infra --features testkit 2>&1 | grep -E "(test result|running)"
# At least one integration test using testcontainers should exist and pass
```

**Property:** `api-infra/src/testkit/mod.rs` exists. `PgTestContainer::start()` spins up a PostgreSQL container and `create_pool()` returns a connected pool.

### SC5: `cargo test --workspace` passes with the same results as before extraction

**Validation:**
```bash
# Before extraction (baseline):
cargo test --workspace 2>&1 | tail -5 > /tmp/test-results-before.txt

# After extraction:
cargo test --workspace 2>&1 | tail -5 > /tmp/test-results-after.txt

diff /tmp/test-results-before.txt /tmp/test-results-after.txt
# Should show identical pass/fail counts
```

**Property:** Test count and pass/fail status is identical before and after. No tests are removed or broken by the extraction.

---

## Recommended Implementation Approach

### Step-by-Step Extraction Order (Revised from CONTEXT.md D2)

Based on the code analysis, the extraction order needs adjustment from the original D2 plan:

| Step | Component | Rationale | Risk |
|------|-----------|-----------|------|
| 1 | Create `api-infra` crate shell | Workspace compiles | NONE |
| 2 | Move `RbacService` to `api-infra` | Zero deps on AppState/DB. Used by middleware. | LOW |
| 3 | Move `AppError` to `api-infra` | Depends only on `axum`, `serde_json`, `anyhow`. Remove `From<sqlx::Error>` impl to `api` crate. | LOW |
| 4 | Move `TenantContext` + `tenant_middleware` to `api-infra` | Depends only on `axum` + `shared::Claims`. Self-contained. | LOW |
| 5 | Move `authz` middleware to `api-infra` | Depends on `RbacService` (now in api-infra) + `shared`. | LOW |
| 6 | Move `permission` middleware to `api-infra` | Depends on `AppState` (re-exported) + `RbacService` + `sqlx` for org/campus queries. The `require_organization_access` and `require_campus_access` functions have direct SQL queries -- these should be refactored to accept a trait or stay in `api`. | MEDIUM |
| 7 | Move `WebSocketServer` + `WebSocketMessage` + `topics` to `api-infra` | Self-contained, no Axum dep. Handler stays in `api`. | LOW |
| 8 | Define 8 repo traits + service traits in `api-infra/src/traits/` | Additive, no existing code changes | LOW |
| 9 | Add `AppConfig` to `api-infra` with SEC-01/SEC-06 validation | Additive, wire into `main()` | LOW |
| 10 | Wire `AppConfig` into `main()` -- replace hardcoded env var reads | Modifies `api/src/main.rs` startup sequence | MEDIUM |
| 11 | Add test infrastructure (`testkit` module) | Additive, feature-gated | LOW |
| 12 | Update `api/src/lib.rs` re-exports, verify `cargo test --workspace` | Final cleanup, remove dead re-export shims | LOW |

### Critical Refactoring Needed: `permission.rs` Split

The `middleware/permission.rs` file has two kinds of functions:

**Type A -- Pure middleware (moves to api-infra):**
- `require_permission()` -- no DB, uses RbacService
- `require_any_permission()` -- no DB
- `require_all_permissions()` -- no DB
- `require_min_role()` -- no DB

**Type B -- DB-dependent helpers (stays in `api`):**
- `require_organization_access()` -- uses `sqlx::query_scalar` with `state.db_pool`
- `require_campus_access()` -- same pattern

**Resolution:** Move Type A functions to `api-infra`. Type B functions stay in `api` as route-level helpers (they are not actually middleware functions in the Axum sense -- they are called from within route handlers, not as `route_layer` middleware).

### Critical Refactoring Needed: `AppError::From<sqlx::Error>` Split

Currently, `api/src/error.rs` has:
```rust
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::Database(err.to_string())
    }
}
```

**This impl must stay in the `api` crate** (or any crate that depends on sqlx). Moving it to `api-infra` would force sqlx as a required dependency of api-infra (not just a dev/test dependency for the AppState struct definition).

**Pattern:**
```rust
// api-infra/src/error.rs
impl AppError {
    /// Create a database error from a message string
    pub fn database(msg: impl Into<String>) -> Self {
        AppError::Database(msg.into())
    }
}

// api/src/error.rs (or a local extension)
use api_infra::AppError;
use sqlx;

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::database(err.to_string())
    }
}
```

---

## Risks & Mitigations

### R1: AppState Cross-Crate Type Complexity (HIGH risk)

**Risk:** `AppState` contains `sqlx::PgPool` and `deadpool_redis::Pool`. Moving it to `api-infra` pulls heavy dependencies into the infra crate, or keeping it in `api` means middleware in `api-infra` must reference `api` types (circular dependency).

**Mitigation:** Move `AppState` to `api-infra` but accept that sqlx and deadpool-redis are dependencies of `api-infra`. The invariant is that `api-infra` does NOT create pools or run queries -- it only references the pool types in struct definitions. The `From<sqlx::Error>` conversion stays in `api`.

**Validation:** After Step 1, verify `cargo tree -p api-infra` does NOT show `dotenvy` or `jsonwebtoken` (auth-specific deps).

### R2: auth Middleware Cannot Move to api-infra (MEDIUM risk)

**Risk:** The `auth_middleware` function in `api/src/middleware/auth.rs` references `crate::AppState` for `jwt_secret` and `redis_pool` (blacklist check), and `crate::auth::JwtService`. CONTEXT.md D1 says all middleware moves to `api-infra`, but auth middleware is tightly coupled to the `api` crate's internal state.

**Mitigation:** Refactor auth middleware to accept secrets via `AppConfig` rather than directly from `AppState.jwt_secret`. The blacklist check can be extracted to a helper trait:

```rust
// api-infra/src/middleware/auth.rs
pub trait TokenBlacklist: Send + Sync {
    async fn is_blacklisted(&self, jti: uuid::Uuid) -> bool;
}
```

The `api` crate implements this with the Redis-backed version. Tests can use a no-op implementation.

### R3: Duplicate `require_permission` Functions (LOW risk)

**Risk:** There are TWO implementations of `require_permission`:
1. `api/src/middleware/authz.rs` -- takes `(Permission, Request, Next)`, returns `Result<Response, StatusCode>`
2. `api/src/middleware/permission.rs` -- returns a closure that takes `(Request, Next)`

Both do the same thing (check if role has permission). This duplication exists in the current code.

**Mitigation:** Consolidate to a single implementation during extraction. Keep the closure-returning version (from `permission.rs`) as it supports chaining. Remove the version in `authz.rs` or make it a thin wrapper.

### R4: WebSocket Handler DB Coupling (LOW risk)

**Risk:** The WebSocket handler (`handler.rs`) has 6 direct `sqlx::query_as` calls for access control (checking if user owns a submission, belongs to a contest, etc.). This prevents moving the handler to `api-infra`.

**Mitigation:** This is acceptable. The handler is application logic, not infrastructure. The server (connection management, broadcast, topics) is infrastructure and moves. The handler stays in `api` and imports the server from `api-infra`.

### R5: sqlx Compile-Time Query Checking After Move (MEDIUM risk -- future)

**Risk:** If `sqlx::query!` macros are used in domain crates, each crate needs its own `migrations/` directory reference. The current codebase uses `sqlx::query_as::<_, T>()` (runtime checked) in most places, which avoids this issue.

**Mitigation:** Phase 1 only moves infrastructure, not domain queries. When domain crates are extracted in Phase 2+, the existing `query_as` pattern (runtime checked) is already compatible with cross-crate use. Compile-time checked `sqlx::query!` can be added later via per-crate `SQLX_OFFLINE=true` and `sqlx-data.json` files.

### R6: Test Breakage from Module Moves (MEDIUM risk)

**Risk:** Moving modules breaks `#[cfg(test)]` blocks that construct `crate::AppState` with hardcoded fields. The auth middleware tests create `AppState { db_pool: sqlx::PgPool::connect_lazy(...), ... }` directly.

**Mitigation:** In Phase 1, tests that stay in `api` continue to use `crate::AppState` (which re-exports from `api-infra`). Tests that move to `api-infra` (e.g., middleware tests) need to construct `AppState` -- this works because `api-infra` defines the struct. The test constructor needs `PgPool::connect_lazy("postgres://localhost/nonexistent")` which is already the pattern used.

### R7: `From<sqlx::Error>` Orphan Rule (LOW risk)

**Risk:** After moving `AppError` to `api-infra`, can `api` still implement `From<sqlx::Error> for AppError`? Orphan rule says: impl must be in the crate that defines EITHER the trait OR the implementing type. Since `api-infra` defines `AppError`, the `api` crate CAN implement a foreign trait (`From`) for a foreign type (`sqlx::Error`) converted to `api_infra::AppError` -- actually this IS allowed because `AppError` is defined in `api-infra` which is a dependency, not an external crate.

**Actually:** Rust's orphan rule allows `impl From<sqlx::Error> for api_infra::AppError` in the `api` crate because `AppError` is a local type relative to `api` (it is a type from a dependency, and the trait `From` is from std). This IS allowed -- the orphan rule only prevents implementing a foreign trait for a foreign type. Here, `AppError` (even though from a dependency) is the implementing type.

**Mitigation:** This works as-is. No issue.

---

## RESEARCH COMPLETE
