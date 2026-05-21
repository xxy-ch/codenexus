# Phase 1 Context: Architecture Foundation + Secret Management

**Phase:** 1 — Architecture Foundation + Secret Management
**Created:** 2026-04-13
**Status:** Decisions locked

---

## Requirements

| ID | Description | Risk |
|---|---|---|
| ARCH-01 | Extract `api-infra` workspace crate (AppState, middleware, error types, extractors, WebSocket server) | HIGH — first extraction, sets pattern for all future phases |
| ARCH-02 | Define 8 repository trait interfaces (ProblemRepo, SubmissionRepo, ContestRepo, ClassRepo, CommunityRepo, UserRepo, LeaderboardRepo, SearchRepo) | MEDIUM — traits define the contract for Phases 2-4 |
| ARCH-03 | Define service trait interfaces for cross-domain communication | MEDIUM — enables decoupled testing in Phase 7 |
| ARCH-06 | Shared test infrastructure — testcontainers PG+Redis, fixtures, helpers | LOW — additive, no existing code changes |
| SEC-01 | Remove hardcoded default secrets, fail if unset in production | HIGH — security-critical, must not break dev workflow |
| SEC-06 | `APP_ENV=production` vs `development` controls secret enforcement, CORS strictness, error verbosity | MEDIUM — runtime behavior branching |

## Decisions

### D1: api-infra Crate Scope — Web-Only

**Decision:** Create a new `api-infra` workspace crate holding web-layer infrastructure only.

**Contents:**
- `AppState` struct (currently in `api/src/lib.rs`)
- `AppError` enum (currently in `api/src/error.rs`)
- All middleware (auth, authz, tenant, permission, rate_limit)
- Axum extractors (currently inline in middleware)
- `WebSocketServer` (currently in `api/src/websocket/`)
- `AppConfig` struct (new, SEC-01/SEC-06)

**Not included:**
- `db/` module (pool creation + schema) — stays in `api`, moves to domain crates in Phases 2-4
- `redis/` module (pool creation + cache/stream ops) — stays in `api`, same reason
- `shared` crate — stays as-is (models only, used by api + judge-worker)

**Why:** Minimal extraction scope for Phase 1. db/redis are tightly coupled to domain logic and will naturally move when domains are extracted in Phases 2-4. Moving them now creates unnecessary churn.

**Workspace after Phase 1:**
```
shared/          ← models (auth, role, permission, user)
  ← judge-worker
  ← api-infra
  ← api

api-infra/       ← AppState, AppError, middleware, extractors,
                  WS server, AppConfig, repo/service traits, test infra
  ← shared
  ← api

api/             ← domain modules, routes, db, redis
  ← shared
  ← api-infra
```

### D2: Extraction Strategy — Incremental Step-by-Step

**Decision:** One component move per commit. Every commit has `cargo build --workspace` passing.

**Step order (each = 1 commit):**
1. Create `api-infra` crate shell (empty `lib.rs`, `Cargo.toml`) — workspace compiles
2. Move `AppError` → `api-infra`, re-export from `api` via `pub use api_infra::error::AppError`
3. Move `AppState` → `api-infra`, re-export from `api`
4. Move middleware modules (auth, authz, tenant, permission, rate_limit) → `api-infra`
5. Move `WebSocketServer` → `api-infra`
6. Define 8 repository trait interfaces in `api-infra/src/traits/`
7. Define service trait interfaces in `api-infra/src/traits/`
8. Add `AppConfig` struct with SEC-01/SEC-06 validation
9. Wire `AppConfig` into `main()` — replace hardcoded env var reads
10. Add test infrastructure (testcontainers setup, fixtures, helpers)
11. Update `lib.rs` re-exports and verify `cargo test --workspace`

**Why:** Every intermediate state is deployable. Easy to bisect if regressions appear. Low risk for a first extraction.

### D3: Repository Trait Design

**Decision:** One trait per domain module, native async fn, `Result<T, AppError>` returns.

**Pattern:**
```rust
// api-infra/src/traits/user_repo.rs
#[async_trait::async_trait]  // or native async fn when MSRV allows
pub trait UserRepo: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AppError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, AppError>;
    async fn create(&self, input: CreateUserInput) -> Result<User, AppError>;
    async fn update(&self, id: Uuid, input: UpdateUserInput) -> Result<User, AppError>;
    async fn list(&self, filter: UserFilter) -> Result<Vec<User>, AppError>;
}
```

**Key choices:**
- **Per-domain, not per-entity:** 8 traits covering all entities within each domain. A `UserRepo` covers user + user_role queries.
- **Return `AppError`, not `sqlx::Error`:** Domain-level error type keeps consumers decoupled from persistence layer.
- **Concrete input structs:** `CreateUserInput`, `UpdateUserInput`, `UserFilter` defined alongside the trait.
- **No trait objects initially:** Domain crates use generics/trait bounds. `dyn Trait` only if benchmarks show it's needed.

**Trait location:** `api-infra/src/traits/` — all traits in one place so domain crates only depend on `api-infra`.

**8 traits:**
1. `UserRepo` — users, user_roles
2. `ProblemRepo` — problems, test_cases, tags
3. `SubmissionRepo` — submissions, submission_results
4. `ContestRepo` — contests, contest_registrations, contest_submissions
5. `ClassRepo` — classes, class_members, assignments
6. `CommunityRepo` — discussions, blogs, comments, messages
7. `LeaderboardRepo` — leaderboard_entries, best_ac_submissions
8. `SearchRepo` — search index operations (abstracted from full-text search impl)

### D4: Service Trait Design

**Decision:** Service traits in `api-infra/src/traits/` for cross-domain communication.

**Pattern:**
```rust
// api-infra/src/traits/submission_service.rs
pub trait SubmissionService: Send + Sync {
    fn get_user_submission_count(&self, user_id: Uuid) -> Pin<Box<dyn Future<Output = Result<i64, AppError>> + Send + '_>>;
}
```

**Key choices:**
- Only define service traits where cross-domain communication exists (e.g., contests → submissions, leaderboard → submissions)
- Domain crates implement these traits for their own services
- Use concrete types, not trait objects, for the service layer
- Service traits are optional — not every domain needs one

### D5: SEC-01 + SEC-06 — AppConfig Struct

**Decision:** `AppConfig` struct with `from_env()` constructor that validates on construction.

**Pattern:**
```rust
// api-infra/src/config.rs
pub struct AppConfig {
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub worker_secret: String,
    pub bind_address: String,
    pub app_env: AppEnv,
    pub cors_origins: Vec<String>,
}

pub enum AppEnv {
    Production,
    Development,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, AppStartupError> {
        let app_env = match std::env::var("APP_ENV").as_deref() {
            Ok("production") => AppEnv::Production,
            _ => AppEnv::Development,
        };

        let jwt_secret = std::env::var("JWT_SECRET")
            .map_err(|_| AppStartupError::MissingSecret("JWT_SECRET"))?;

        // In production: JWT_SECRET and WORKER_SECRET are required
        // In development: warn + use dev-only insecure defaults
        ...
    }
}
```

**Behavior by environment:**
| Behavior | Production | Development |
|---|---|---|
| JWT_SECRET unset | Exit with error | Warn + use `"dev-only-insecure-jwt"` |
| WORKER_SECRET unset | Exit with error | Warn + use `"dev-only-insecure-worker"` |
| CORS | Configured origins only | `*` allowed |
| Error responses | No internal details | Include stack/db error context |

**Why `AppConfig` over raw env reads:** Single validation point, testable, no scattered `unwrap_or_else` across codebase.

### D6: Test Infrastructure

**Decision:** Test infrastructure in `api-infra/src/testkit/` behind `#[cfg(test)]` or a `testkit` feature flag.

**Contents:**
- `test_db()` — creates a testcontainers PostgreSQL instance, runs migrations, returns `PgPool`
- `test_redis()` — creates a testcontainers Redis instance, returns `deadpool_redis::Pool`
- `test_app_state()` — creates a full `AppState` with test containers
- `TestFixture` struct — holds pools + cleanup handles
- Per-domain fixture factories (e.g., `create_test_user(fixture, role)`)

**Why feature flag:** Test containers dependency is heavy. Domain crates enable `testkit` feature only in `dev-dependencies`.

---

## Constraints

- **No API path changes** — all route paths stay identical after extraction
- **No frontend changes needed** — this phase is backend-only
- **judge-worker untouched** — it still depends on `shared` only
- **Build stays green** — every commit compiles and tests pass

## Success Criteria (from ROADMAP.md)

1. `cargo build --workspace` succeeds with `api-infra` compiling independently
2. All 8 repository traits defined in `api-infra/src/traits/` with full method signatures
3. Application refuses to start if `APP_ENV=production` and JWT_SECRET/WORKER_SECRET are unset
4. Shared test infrastructure compiles and a sample integration test using testcontainers passes
5. `cargo test --workspace` passes with the same results as before extraction

## Deferred Ideas

- Moving db/redis modules into shared or api-infra — deferred to Phases 2-4 when domain extraction happens
- Frontend restructuring — deferred (v2, not in Phase 1 scope)
- Implementing repository traits — deferred to Phases 2-4 per domain
- Service trait implementations — deferred to Phases 2-4 per domain

---

*Context locked: 2026-04-13*
