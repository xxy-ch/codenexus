# Phase 4: Domain Extraction — Complex (Submissions, Contests, Classes, Leaderboard) - Research

**Researched:** 2026-04-15
**Domain:** Rust workspace crate extraction with cross-domain trait resolution and multi-tenant security fix
**Confidence:** HIGH

## Summary

Phase 4 extracts the four most complex domain modules from the `api` crate into independent workspace crates: `domain-submissions`, `domain-contests`, `domain-classes`, and `domain-leaderboard`. The total extraction volume is ~4390 lines across 17 files. Three of the four modules (contests, classes, submissions) have no cross-domain imports within the group -- only `leaderboard` depends on `classes`, resolved via an api-infra trait. The `submissions/queue.rs` module depends on `crate::redis`, which needs either extraction to api-infra or duplication. The SEC-03 fix adds tenant filtering to `get_global_leaderboard` and `get_problem_leaderboard` SQL queries, which currently expose cross-tenant data to any authenticated user.

**Primary recommendation:** Extract in dependency order: domain-classes first (no deps on others), domain-submissions second (only redis dep), domain-contests third (no deps), domain-leaderboard last (depends on classes trait). Fix SEC-03 tenant filtering during leaderboard extraction. Normalize LeaderboardService to accept `deadpool_redis::Pool` instead of creating its own `redis::Client` per call.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01** `deny(warnings)` in CI
- **D-02** Push + PR trigger for GitHub Actions
- **D-03** Combined CI workflow with parallel jobs
- **D-04** Crate naming: `domain-*` prefix
- **D-05** Mirror current module structure (models.rs, service.rs, routes.rs per sub-module)
- **D-06** Cross-domain dependencies route through api-infra traits
- **D-07** CI-only verification (no manual smoke tests)
- **D-09** Normalize router signatures to `*_router() -> Router<AppState>` (from Phase 3 search normalization)
- **D-11** Four separate domain crates: `domain-submissions`, `domain-contests`, `domain-classes`, `domain-leaderboard`
- **D-12** SEC-03 fix: `get_global_leaderboard` and `get_problem_leaderboard` filter by requesting user's `organization_id` by default. Root and OrgAdmin roles bypass the filter and see all data.

### Claude's Discretion
- How to define the `ClassMembershipChecker` trait in api-infra (method signatures)
- Whether to duplicate `redis::create_stream`/`redis::add_message` in domain-submissions or extract to api-infra
- Exact SQL modifications for SEC-03 tenant filtering
- Whether cache key strategy changes for org-scoped global leaderboard
- Extraction order (which crate first, parallel waves)
- How to handle `LeaderboardService::new(pool, redis_url)` -- normalize to use AppState's redis_pool
- Leaderboard's `is_admin()` and `is_teacher_plus()` helpers -- keep inline or extract to shared role utilities

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ARCH-04 (remaining) | Domain modules submissions, contests, classes, leaderboard extracted as workspace crates | Crate structure, dependency analysis, extraction pattern from Phases 2-3 |
| ARCH-05 (remaining) | API binary assembles remaining routers from their respective crates | main.rs router assembly pattern, Cargo.toml dependency updates |
| SEC-03 | Leaderboard /global and /problem/:id endpoints enforce tenant filtering | SQL analysis of leaderboard/service.rs lines 54-100 and 777-797, route handler analysis |
</phase_requirements>

## Standard Stack

### Core (same as Phases 2-3)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| axum | 0.7 (workspace) | HTTP routing + Router<AppState> | Established in all domain crates [VERIFIED: Cargo.toml] |
| sqlx | 0.8 | PostgreSQL async driver | Used by all service.rs files [VERIFIED: Cargo.toml] |
| serde | 1.0 (workspace) | Serialization | All models derive Serialize/Deserialize [VERIFIED: Cargo.toml] |
| serde_json | 1.0 (workspace) | JSON handling | Used in routes for response wrapping [VERIFIED: Cargo.toml] |
| api-infra | path dependency | AppState, AuthExtractor, AppError, traits | Established pattern from Phases 2-3 [VERIFIED: Cargo.toml] |
| shared | path dependency | Claims, Role, User types | Used by all route handlers for role checks [VERIFIED: Cargo.toml] |
| anyhow | 1.0 | Error handling in services | All service methods return anyhow::Result [VERIFIED: source] |
| chrono | 0.4 | Date/time types | Used in all model structs [VERIFIED: source] |
| uuid | 1.11 | UUID types | Used for user_id fields [VERIFIED: source] |

### Per-Crate Additional Dependencies
| Crate | Library | Version | Purpose |
|-------|---------|---------|---------|
| domain-submissions | deadpool-redis | 0.22 | Redis pool for submission queue |
| domain-submissions | redis | 0.27 | Redis stream operations (XADD, XGROUP) |
| domain-submissions | async-trait | 0.1 | If implementing trait from api-infra |
| domain-leaderboard | deadpool-redis | 0.22 | Redis caching (after normalization) |
| domain-leaderboard | async-trait | 0.1 | ClassMembershipChecker trait usage |
| domain-classes | async-trait | 0.1 | ClassMembershipChecker trait implementation |
| All 4 crates | tracing | 0.1 (workspace) | Logging |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| per-crate redis dependency | api-infra redis re-export | api-infra already has deadpool-redis; adding redis there increases its surface. Per-crate is cleaner for now. |
| LeaderboardService with own redis::Client | AppState.redis_pool (deadpool) | deadpool is already in AppState, avoids creating a new connection per LeaderboardService::new() call. RECOMMENDED. |

**Installation (new crates):**
```bash
# Each new domain crate needs these in its Cargo.toml
# See domain-community/Cargo.toml and domain-search/Cargo.toml for the exact pattern
```

**Version verification:** All versions verified against existing workspace Cargo.toml and api/Cargo.toml. No new external dependencies introduced.

## Architecture Patterns

### Crate Structure (mirrors Phases 2-3 pattern)
```
domain-submissions/
  Cargo.toml
  src/
    lib.rs          # pub mod models; pub mod queue; pub mod routes; pub mod service; pub use routes::submissions_router;
    models.rs       # Submission, CreateSubmissionRequest, SubmissionResponse, etc.
    queue.rs        # SubmissionMessage, queue_submission()
    routes.rs       # submissions_router() -> Router<AppState>
    service.rs      # SubmissionService

domain-contests/
  Cargo.toml
  src/
    lib.rs          # pub mod models; pub mod routes; pub mod service; pub use routes::contests_router;
    models.rs       # Contest, ContestDetail, ContestRankingEntry, etc.
    routes.rs       # contests_router() -> Router<AppState>
    service.rs      # ContestService

domain-classes/
  Cargo.toml
  src/
    lib.rs          # pub mod models; pub mod routes; pub mod service; pub use routes::classes_router;
    models.rs       # Class, Assignment, ClassEnrollment, etc.
    routes.rs       # classes_router() -> Router<AppState>
    service.rs      # ClassService

domain-leaderboard/
  Cargo.toml
  src/
    lib.rs          # pub mod models; pub mod routes; pub mod service; pub use routes::leaderboard_router;
    models.rs       # LeaderboardEntry, UserStats, ProblemLeaderboardEntry, etc.
    routes.rs       # leaderboard_router() -> Router<AppState>
    service.rs      # LeaderboardService (normalized)
```

### Pattern 1: Import Replacement (established in Phases 2-3)
**What:** Replace `crate::` imports with `api_infra::` imports
**When to use:** Every file in every extracted crate

| Old Import | New Import |
|------------|------------|
| `use crate::AppState` | `use api_infra::state::AppState` |
| `use crate::middleware::auth::AuthExtractor` | `use api_infra::middleware::auth::AuthExtractor` |
| `use crate::error::AppError` | `use api_infra::error::AppError` |
| `use crate::classes::service::ClassService` | `use api_infra::traits::class_repo::ClassMembershipChecker` (via trait) |
| `use crate::redis` | Direct redis/deadpool-redis dependency |

### Pattern 2: Router Signature Normalization (D-09)
```rust
// All routers follow this signature:
pub fn submissions_router() -> Router<AppState> { ... }
pub fn contests_router() -> Router<AppState> { ... }
pub fn classes_router() -> Router<AppState> { ... }
pub fn leaderboard_router() -> Router<AppState> { ... }
```

### Pattern 3: Cross-Domain Trait Resolution (D-06)
**Leaderboard -> Classes dependency:**

Define in `api-infra/src/traits/class_repo.rs` (file already exists):
```rust
/// Trait for leaderboard to verify class membership without depending on domain-classes.
#[async_trait]
pub trait ClassMembershipChecker: Send + Sync {
    /// Get student IDs enrolled in a class. Used by leaderboard to verify access.
    async fn get_class_student_ids(&self, class_id: i64) -> Result<Vec<Uuid>, AppError>;
}
```

domain-classes implements it on ClassService. domain-leaderboard accepts `Arc<dyn ClassMembershipChecker>` in routes or constructs it via a factory.

### Anti-Patterns to Avoid
- **Circular crate dependencies:** domain-leaderboard must NOT depend on domain-classes directly. Use api-infra trait only.
- **Per-request Redis client creation:** LeaderboardService currently calls `redis::Client::open(redis_url)` in `new()`. This creates a new TCP connection pool per invocation. Must use `deadpool_redis::Pool` from AppState instead.
- **Role helper duplication:** `is_admin()` and `is_teacher_plus()` are duplicated across contests/routes.rs, classes/routes.rs, and leaderboard/routes.rs. Keep them as private inline functions per crate for now (same as domain-search pattern); do NOT create a shared role-utils crate.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Redis stream operations | Custom XADD/XGROUP wrapper in domain-submissions | Copy the ~15 lines from `api/src/redis/mod.rs` (create_stream, add_message) directly into domain-submissions/queue.rs | These are trivial 10-15 line wrappers around redis::cmd. Extracting to api-infra would add redis dependency to api-infra for a single consumer. |
| Tenant-filtered SQL | Dynamic SQL string building for org filter | Parameterized `WHERE u.organization_id = $N` with optional injection based on role | Already the pattern used in school/campus leaderboards |

**Key insight:** The `redis::create_stream` and `redis::add_message` functions used by `submissions/queue.rs` are thin wrappers (10-15 lines each). Since only domain-submissions needs them, duplicating them in the crate is simpler than extracting to api-infra and adding redis as an api-infra dependency. api-infra already has deadpool-redis but not the full redis crate needed for `redis::cmd()` operations.

## Common Pitfalls

### Pitfall 1: LeaderboardService Redis Client Mismatch
**What goes wrong:** LeaderboardService creates its own `redis::Client` via `redis::Client::open(redis_url)`. The rest of the app uses `deadpool_redis::Pool`. This means leaderboard creates unbounded connections, bypassing the shared pool.
**Why it happens:** LeaderboardService was written to use the `redis` crate directly rather than `deadpool-redis`.
**How to avoid:** Refactor LeaderboardService to accept `Option<deadpool_redis::Pool>` (matching the AppState field). Replace `self.redis_client.get_multiplexed_async_connection()` with `pool.get()` from deadpool. This also addresses SEC-05 (consistent Redis pooling).
**Warning signs:** If `LeaderboardService::new()` still takes `redis_url: &str`, the normalization was skipped.

### Pitfall 2: SEC-03 Claims Not Extracted in Route Handlers
**What goes wrong:** `get_global_leaderboard` and `get_problem_leaderboard` use `_claims: AuthExtractor` (underscore-prefixed, meaning the claims are extracted but discarded). The tenant filter cannot be applied because the org ID is never read.
**Why it happens:** These endpoints were originally designed as "public top N" without tenant awareness.
**How to avoid:** Change `_claims: AuthExtractor` to `AuthExtractor(claims): AuthExtractor`. Pass `claims.school_id` and `is_admin(&claims.role)` to the service method. The service receives `school_id: Option<i64>` -- None means no filter (admin), Some(id) means filter.
**Warning signs:** If routes still have `_claims: AuthExtractor` without destructuring, SEC-03 is not fixed.

### Pitfall 3: SEC-03 Cache Key Not Org-Scoped
**What goes wrong:** Global leaderboard cache key is `leaderboard:global:{limit}:{offset}`. After SEC-03 fix, different orgs get different results but share the same cache key, causing cross-tenant data leaks through the cache.
**Why it happens:** Cache key doesn't include org scope.
**How to avoid:** Change cache key to `leaderboard:global:{org_id}:{limit}:{offset}` for org-scoped queries. For admin (unfiltered), use `leaderboard:global:all:{limit}:{offset}`.
**Warning signs:** If cache key still doesn't include org_id after SEC-03 fix.

### Pitfall 4: release_gate_tests.rs Compilation Failure
**What goes wrong:** The test file imports `crate::classes`, `crate::contests`, `crate::leaderboard` directly. After extraction, these modules no longer exist in the api crate.
**Why it happens:** Tests reference modules by their old crate-local paths.
**How to avoid:** Update imports to `domain_classes::`, `domain_contests::`, `domain_leaderboard::`. The test helper functions (`build_user`, `auth_header`, etc.) reference `crate::auth::JwtService` and `crate::AppState` -- these stay in api crate (auth module is not extracted) so they remain valid. But `crate::classes::routes::classes_router` becomes `domain_classes::classes_router`.
**Warning signs:** If `cargo test --workspace` fails with "unresolved import" after extraction.

### Pitfall 5: queue.rs XGROUP CREATE Re-implementation
**What goes wrong:** The `queue_submission` function in queue.rs calls `redis::create_stream` which does XGROUP CREATE + DESTROY (to verify stream exists). Then it does ANOTHER XGROUP CREATE with the actual group name. This dual-XGROUP pattern is specific to the submission queue.
**Why it happens:** The `create_stream` helper creates and destroys a dummy group to ensure the stream exists. Then `queue_submission` creates the real consumer group.
**How to avoid:** When duplicating into domain-submissions, simplify: just do XGROUP CREATE with MKSTREAM directly (which creates the stream if it doesn't exist). The dummy group create+destroy is unnecessary overhead.
**Warning signs:** If domain-submissions queue.rs still has the dummy group pattern.

## Code Examples

### SEC-03: Route Handler Fix (get_global_leaderboard)
```rust
// BEFORE (leaderboard/routes.rs:39-53):
pub async fn get_global_leaderboard(
    State(state): State<AppState>,
    _claims: AuthExtractor,                           // claims discarded!
    Query(query): Query<LeaderboardQuery>,
) -> Result<Json<LeaderboardResponse>, StatusCode> {
    let service = LeaderboardService::new(state.db_pool.clone(), &state.redis_url)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let leaderboard = service.get_global_leaderboard(query).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(leaderboard))
}

// AFTER:
pub async fn get_global_leaderboard(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,             // claims extracted
    Query(query): Query<LeaderboardQuery>,
) -> Result<Json<LeaderboardResponse>, StatusCode> {
    let school_id = if is_admin(&claims.role) { None } else { Some(claims.school_id) };
    let service = LeaderboardService::new(state.db_pool.clone(), state.redis_pool.clone())
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let leaderboard = service.get_global_leaderboard(query, school_id).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(leaderboard))
}
```

### SEC-03: Service Method Signature Change
```rust
// BEFORE (leaderboard/service.rs:20-23):
pub async fn get_global_leaderboard(&self, query: LeaderboardQuery) -> Result<LeaderboardResponse>

// AFTER:
pub async fn get_global_leaderboard(
    &self,
    query: LeaderboardQuery,
    school_id: Option<i64>,  // None = no filter (admin), Some = filter by org
) -> Result<LeaderboardResponse>
```

### SEC-03: SQL Tenant Filter Injection (get_global_leaderboard)
```sql
-- Add to the CTE in leaderboard/service.rs line 56-86:
-- BEFORE:
FROM users u
LEFT JOIN submissions s ON s.user_id = u.id {time_filter}
LEFT JOIN problems p ON p.id = s.problem_id
GROUP BY u.id, u.username, u.organization_id, u.campus_id

-- AFTER (inject WHERE conditionally):
FROM users u
LEFT JOIN submissions s ON s.user_id = u.id {time_filter}
LEFT JOIN problems p ON p.id = s.problem_id
{org_filter}   -- empty string for admin, "WHERE u.organization_id = $N" for non-admin
GROUP BY u.id, u.username, u.organization_id, u.campus_id
```

### SEC-03: Problem Leaderboard SQL Fix (get_problem_leaderboard)
```sql
-- BEFORE (leaderboard/service.rs:777-797):
FROM submissions s
JOIN users u ON u.id = s.user_id
WHERE s.problem_id = $1 AND s.verdict = 'ac'

-- AFTER:
FROM submissions s
JOIN users u ON u.id = s.user_id
WHERE s.problem_id = $1 AND s.verdict = 'ac'
AND ($2::BIGINT IS NULL OR u.organization_id = $2)
-- $2 is school_id (NULL for admin = no filter)
```

### LeaderboardService Normalized Constructor
```rust
// BEFORE:
pub struct LeaderboardService {
    pool: PgPool,
    redis_client: redis::Client,  // creates own client
}
impl LeaderboardService {
    pub fn new(pool: PgPool, redis_url: &str) -> Result<Self> {
        let redis_client = redis::Client::open(redis_url)?;
        Ok(Self { pool, redis_client })
    }
}

// AFTER:
pub struct LeaderboardService {
    pool: PgPool,
    redis_pool: Option<deadpool_redis::Pool>,  // uses shared pool
}
impl LeaderboardService {
    pub fn new(pool: PgPool, redis_pool: Option<deadpool_redis::Pool>) -> Result<Self> {
        Ok(Self { pool, redis_pool })
    }
}

// Cache operations change from:
if let Ok(mut conn) = self.redis_client.get_multiplexed_async_connection().await { ... }
// To:
if let Some(pool) = &self.redis_pool {
    if let Ok(mut conn) = pool.get().await { ... }
}
```

### ClassMembershipChecker Trait (api-infra)
```rust
// File: api-infra/src/traits/class_repo.rs (append to existing file)
#[async_trait]
pub trait ClassMembershipChecker: Send + Sync {
    async fn get_class_student_ids(&self, class_id: i64) -> Result<Vec<Uuid>, AppError>;
}
```

### Cargo.toml Pattern (domain-submissions)
```toml
[package]
name = "domain-submissions"
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
tracing = { workspace = true }
deadpool-redis = { version = "0.22", features = ["serde"] }
```

## Detailed Dependency Analysis

### Cross-Domain Import Map (VERIFIED by grep)

| Source File | Import | Resolution |
|-------------|--------|------------|
| `submissions/routes.rs:2` | `use crate::error::AppError` | `use api_infra::error::AppError` |
| `submissions/routes.rs:3` | `use crate::middleware::auth::AuthExtractor` | `use api_infra::middleware::auth::AuthExtractor` |
| `submissions/routes.rs:4` | `use crate::AppState` | `use api_infra::state::AppState` |
| `submissions/queue.rs:1` | `use crate::redis` | Direct redis ops duplicated in queue.rs |
| `contests/routes.rs:2` | `use crate::middleware::auth::AuthExtractor` | `use api_infra::middleware::auth::AuthExtractor` |
| `contests/routes.rs:3` | `use crate::AppState` | `use api_infra::state::AppState` |
| `classes/routes.rs:1` | `use crate::classes::models::*` | `use crate::models::*` (same crate) |
| `classes/routes.rs:2` | `use crate::classes::service::ClassService` | `use crate::service::ClassService` (same crate) |
| `classes/routes.rs:3` | `use crate::middleware::auth::AuthExtractor` | `use api_infra::middleware::auth::AuthExtractor` |
| `classes/routes.rs:4` | `use crate::AppState` | `use api_infra::state::AppState` |
| `leaderboard/routes.rs:3` | `use crate::classes::service::ClassService` | `use api_infra::traits::class_repo::ClassMembershipChecker` (via trait) |
| `leaderboard/routes.rs:4` | `use crate::middleware::auth::AuthExtractor` | `use api_infra::middleware::auth::AuthExtractor` |
| `leaderboard/routes.rs:5` | `use crate::AppState` | `use api_infra::state::AppState` |

### External References TO Phase 4 Modules

| Source File | Line | Reference | Action |
|-------------|------|-----------|--------|
| `api/src/main.rs` | 3 | `mod submissions;` | Remove module declaration |
| `api/src/main.rs` | 4 | `mod classes;` | Remove module declaration |
| `api/src/main.rs` | 5 | `mod contests;` | Remove module declaration |
| `api/src/main.rs` | 7 | `mod leaderboard;` | Remove module declaration |
| `api/src/main.rs` | 148 | `.nest("/contests", contests::contests_router())` | `.nest("/contests", domain_contests::contests_router())` |
| `api/src/main.rs` | 149 | `.nest("/leaderboard", leaderboard::leaderboard_router())` | `.nest("/leaderboard", domain_leaderboard::leaderboard_router())` |
| `api/src/main.rs` | 150 | `.nest("/submissions", submissions::submissions_router())` | `.nest("/submissions", domain_submissions::submissions_router())` |
| `api/src/main.rs` | 151 | `.nest("/classes", classes::classes_router())` | `.nest("/classes", domain_classes::classes_router())` |
| `api/src/lib.rs` | 2 | `pub mod classes;` | Remove |
| `api/src/lib.rs` | 3 | `pub mod contests;` | Remove |
| `api/src/lib.rs` | 6 | `pub mod leaderboard;` | Remove |
| `api/src/lib.rs` | 12 | `pub mod submissions;` | Remove |
| `api/src/release_gate_tests.rs` | 2 | `use crate::classes;` | `use domain_classes;` + verify re-exports |
| `api/src/release_gate_tests.rs` | 3 | `use crate::contests;` | `use domain_contests;` + verify re-exports |
| `api/src/release_gate_tests.rs` | 5 | `use crate::leaderboard;` | `use domain_leaderboard;` + verify re-exports |

### No Other Hidden Cross-References
Grep for `crate::submissions`, `crate::contests`, `crate::classes`, `crate::leaderboard` across the entire api/src directory confirmed ONLY the above references. No other module (notifications, plagiarism, rbac, websocket, auth) imports from these four modules.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-request LeaderboardService with own redis::Client | Shared deadpool_redis::Pool via AppState | This phase (SEC-05 alignment) | Eliminates unbounded connection creation |
| Unfiltered global leaderboard | Org-scoped global leaderboard | This phase (SEC-03) | Fixes cross-tenant data leak |
| Unfiltered problem leaderboard | Org-scoped problem leaderboard | This phase (SEC-03) | Fixes cross-tenant data leak |

**Deprecated/outdated:**
- `LeaderboardService::new(pool, redis_url)` pattern: replaced by `new(pool, redis_pool)` accepting deadpool Pool directly
- `leaderboard:global:{limit}:{offset}` cache key: replaced by `leaderboard:global:{org_id}:{limit}:{offset}` for tenant safety

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | LeaderboardService uses `redis::Client` (not deadpool) only for caching -- all other operations go through PgPool | Leaderboard Analysis | If it also uses redis for query execution, migration to deadpool may need more changes |
| A2 | `release_gate_tests.rs` uses `classes::routes::classes_router` path syntax that maps cleanly to `domain_classes::classes_router` | Test References | If test uses internal types from classes module, more imports need updating |
| A3 | The `ClassMembershipChecker` trait only needs `get_class_student_ids` (returning Vec<Uuid>) -- no other class data is needed by leaderboard | Cross-Domain Trait | If leaderboard needs more class metadata, trait surface expands |
| A4 | Contest routes use `crate::contests::service::ContestService` internally (same crate), not as a cross-module import from elsewhere | Dependency Analysis | If other modules import ContestService, additional trait needed |

**Note:** A1 verified by reading all of leaderboard/service.rs -- redis is used ONLY for caching (get/set/del/scan operations on leaderboard cache keys). A2 verified by reading release_gate_tests.rs lines 235-236. A3 verified by reading leaderboard/routes.rs lines 139-144 -- only `get_class_students(class_id)` returning students for membership check. A4 verified by grep -- no other module imports ContestService.

## Open Questions (RESOLVED)

1. **RESOLVED** **LeaderboardService normalization timing** -- Should we normalize to deadpool Pool as part of extraction, or in a separate SEC-05 phase?
   - What we know: CONTEXT.md lists this as Claude's discretion. SEC-05 is in Phase 5.
   - What's unclear: Whether the planner prefers to defer this to keep Phase 4 focused on extraction + SEC-03.
   - Recommendation: Normalize now since it's a small change (change constructor + cache ops) and prevents having to touch the file again in Phase 5. Also required for SEC-03 cache key changes.
   - **Resolution:** Normalize now in Plan 04. LeaderboardService constructor changed to accept `Option<deadpool_redis::Pool>` from AppState. Required for SEC-03 cache key changes and prevents rework in Phase 5.

2. **RESOLVED** **Redis helper extraction** -- Duplicate redis helpers in domain-submissions or add redis dependency to api-infra?
   - What we know: Only domain-submissions needs XADD/XGROUP. api-infra already has deadpool-redis but not the redis crate itself.
   - What's unclear: Whether adding redis to api-infra would cause issues for other consumers.
   - Recommendation: Duplicate the ~15 lines of redis stream helpers in domain-submissions/queue.rs. Keeps api-infra lean. The helpers are trivial and unlikely to diverge.
   - **Resolution:** Duplicate in domain-submissions/queue.rs. Keeps api-infra lean. The helpers (~15 lines each) are trivial and will not diverge.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| cargo | All Rust crates | Yes | stable | -- |
| rustc | All Rust crates | Yes | Edition 2021 | -- |
| PostgreSQL | Tests (release_gate_tests) | Docker | 16-alpine | Skip integration tests |
| Redis | domain-submissions queue, domain-leaderboard cache | Local | 7-alpine | Graceful degradation (existing pattern) |

**Missing dependencies with no fallback:**
- None -- all required tools are available.

**Missing dependencies with fallback:**
- None applicable.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | cargo test + testcontainers |
| Config file | Cargo.toml (per-crate) |
| Quick run command | `cargo test --workspace --lib 2>&1 \| head -50` |
| Full suite command | `cargo test --workspace 2>&1` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-04 | Domain crates compile independently | compile | `cargo check --workspace` | Wave 0 |
| ARCH-05 | API binary assembles routers from domain crates | compile | `cargo check -p api` | Wave 0 |
| SEC-03 | Global leaderboard filters by org for non-admin | unit/integration | `cargo test -p api contest_and_leaderboard_scope` | Yes -- release_gate_tests.rs |

### Sampling Rate
- **Per task commit:** `cargo check --workspace`
- **Per wave merge:** `cargo test --workspace`
- **Phase gate:** `cargo test --workspace` green, no warnings

### Wave 0 Gaps
- None -- existing test infrastructure covers compilation and the key SEC-03 scope test.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Already handled by auth middleware (unchanged) |
| V3 Session Management | No | JWT/Redis blacklist unchanged |
| V4 Access Control | Yes | SEC-03 tenant filtering on leaderboard endpoints |
| V5 Input Validation | No | Existing parameterized queries sufficient |
| V6 Cryptography | No | No crypto changes |

### Known Threat Patterns for Rust/Axum Multi-Tenant

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data leak (leaderboard) | Information Disclosure | SEC-03: WHERE u.organization_id = $N filter on global/problem queries |
| Cache poisoning (shared cache keys) | Tampering | Org-scoped cache keys: `leaderboard:global:{org_id}:...` |
| Role bypass (admin check) | Elevation of Privilege | `is_admin(&claims.role)` check before bypassing tenant filter |

## Sources

### Primary (HIGH confidence)
- Source code analysis: `api/src/submissions/`, `api/src/contests/`, `api/src/classes/`, `api/src/leaderboard/` -- all files read and analyzed
- `api-infra/src/` -- state.rs, error.rs, middleware/auth.rs, traits/ -- verified structure and patterns
- `domain-search/` and `domain-community/` -- verified extraction pattern from Phases 2-3
- `Cargo.toml` (root, api, api-infra, domain-community, domain-search) -- verified dependency graph

### Secondary (MEDIUM confidence)
- CONTEXT.md cross-reference table -- verified against actual source code grep results

### Tertiary (LOW confidence)
- None -- all claims verified against source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- identical to Phases 2-3, verified against Cargo.toml files
- Architecture: HIGH -- all import paths verified by grep, extraction pattern established in prior phases
- Pitfalls: HIGH -- SEC-03 SQL/cache issues identified from direct source reading, LeaderboardService redis pattern verified
- Cross-domain deps: HIGH -- exhaustive grep confirmed only 2 cross-domain imports (leaderboard->classes, submissions->redis)

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable Rust/Axum ecosystem)
