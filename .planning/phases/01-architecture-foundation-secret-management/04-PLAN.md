---
wave: 4
depends_on: [1, 2, 3]
files_modified:
  - api-infra/Cargo.toml
  - api-infra/src/lib.rs
  - api-infra/src/testkit/mod.rs
  - api-infra/src/testkit/database.rs
  - api-infra/src/testkit/redis.rs
  - api-infra/src/testkit/fixtures.rs
  - api/Cargo.toml
  - api/src/lib.rs
  - api/src/rbac/mod.rs
  - api/src/middleware/tenant.rs
  - api/src/middleware/authz.rs
  - api/src/middleware/permission.rs
  - api/src/error.rs
  - api/src/websocket/server.rs
  - api/src/websocket/message.rs
autonomous: true
requirements:
  - ARCH-01
  - ARCH-02
  - ARCH-03
  - ARCH-06
  - SEC-01
  - SEC-06
---

# Plan 04: Test Infrastructure + Final Cleanup + Workspace Verification

<objective>
Add shared test infrastructure (testkit) to api-infra behind a `testkit` feature flag. Clean up remaining re-export shims by updating all `use crate::` references in the api crate to use `api_infra::` directly where appropriate. Remove dead re-export shims. Run final `cargo test --workspace` verification to confirm all Phase 1 success criteria are met.
</objective>

<threat_model>
- **LOW**: Testkit is behind a feature flag -- it is not compiled in production. The `testkit` feature only activates `testcontainers` and related dev dependencies. No test code reaches production binaries.
- **LOW**: Re-export shim removal is a refactoring change that does not alter runtime behavior. All consumers are updated to use the canonical `api_infra::` import path. Any missed reference causes a compile error (caught immediately), not a runtime failure.
- **LOW**: Fixture factories use test data only. No production data is accessed or modified.
- **MEDIUM**: testcontainers requires Docker. If Docker is not running, testkit tests will fail at runtime. The `testkit` feature flag ensures these tests are opt-in and do not block the default build.
</threat_model>

<must_haves>
- [ ] `api-infra/src/testkit/mod.rs` exists behind `#[cfg(feature = "testkit")]`
- [ ] `cargo test -p api-infra --features testkit` compiles and at least one test passes
- [ ] All `use crate::` references in api crate that point to moved modules compile successfully (either via re-export shim or direct `api_infra::` import)
- [ ] `cargo build --workspace` succeeds
- [ ] `cargo test --workspace` passes with same test count as pre-extraction baseline
- [ ] No dead re-export shims remain for modules that have been fully migrated
- [ ] `APP_ENV=production` with missing JWT_SECRET causes startup failure (SEC-01)
- [ ] `APP_ENV=development` with missing JWT_SECRET produces warning and starts (SEC-06)

## Tasks

### Task 04-01: Add testkit feature flag + testkit module to api-infra

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/Cargo.toml (add feature + dev-deps)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/lib.rs (add testkit module)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/Cargo.toml (reference for testcontainers version)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/release_gate_tests.rs (reference for testcontainers usage pattern -- TestDb struct, start_test_db, connect_and_migrate)
</read_first>

<action>
1. Add the `testkit` feature to `api-infra/Cargo.toml`:

```toml
[features]
testkit = ["testcontainers", "testcontainers-modules"]

[dev-dependencies]
testcontainers = { version = "0.23", features = ["blocking"] }
testcontainers-modules = { version = "0.11", features = ["postgres"] }
```

2. Add `pub mod testkit;` to `api-infra/src/lib.rs`, guarded by the feature:

```rust
#[cfg(feature = "testkit")]
pub mod testkit;
```

3. Create `api-infra/src/testkit/mod.rs`:

```rust
//! Shared test infrastructure for all domain crates.
//!
//! This module is only available when the `testkit` feature is enabled.
//! It provides testcontainers-based PostgreSQL and Redis instances,
//! plus fixture factories for creating test data.
//!
//! # Requirements
//! - Docker must be running
//! - The `testkit` feature must be enabled: `cargo test -p api-infra --features testkit`

pub mod database;
pub mod fixtures;
pub mod redis;

use sqlx::PgPool;
use deadpool_redis::Pool as RedisPool;
use std::sync::Arc;

/// Holds test container handles and connection pools.
/// Dropping this struct will automatically stop the containers.
pub struct TestFixture {
    pub database_url: String,
    pub redis_url: String,
    pub db_pool: PgPool,
    pub redis_pool: RedisPool,
    _pg_container: database::PgTestContainer,
    _redis_container: redis::RedisTestContainer,
}

impl TestFixture {
    /// Create a new test fixture with PostgreSQL and Redis containers.
    ///
    /// # Panics
    /// Panics if Docker is not running or containers cannot be started.
    pub async fn new() -> Self {
        let pg_container = database::PgTestContainer::start()
            .await
            .expect("Failed to start PostgreSQL test container. Is Docker running?");

        let redis_container = redis::RedisTestContainer::start()
            .await
            .expect("Failed to start Redis test container. Is Docker running?");

        let database_url = pg_container.connection_url();
        let redis_url = redis_container.connection_url();

        let db_pool = pg_container.create_pool()
            .await
            .expect("Failed to create PostgreSQL pool");

        let redis_pool = redis_container.create_pool()
            .expect("Failed to create Redis pool");

        Self {
            database_url,
            redis_url,
            db_pool,
            redis_pool,
            _pg_container: pg_container,
            _redis_container: redis_container,
        }
    }

    /// Run database migrations using the provided migrator.
    /// The migrator is passed as a closure to avoid depending on api's migration code.
    pub async fn run_migrations<F, Fut>(&self, migrate_fn: F)
    where
        F: FnOnce(&PgPool) -> Fut,
        Fut: std::future::Future<Output = Result<(), sqlx::Error>>,
    {
        migrate_fn(&self.db_pool).await.expect("Failed to run migrations");
    }
}
```

4. Create `api-infra/src/testkit/database.rs`:

```rust
use sqlx::PgPool;
use anyhow::Result;

/// A PostgreSQL test container managed by testcontainers.
pub struct PgTestContainer {
    container: testcontainers::ContainerAsync<testcontainers_modules::postgres::Postgres>,
}

impl PgTestContainer {
    /// Start a new PostgreSQL test container.
    pub async fn start() -> Result<Self> {
        let container = testcontainers_modules::postgres::Postgres::default()
            .start()
            .await?;
        Ok(Self { container })
    }

    /// Get the connection URL for this container.
    pub fn connection_url(&self) -> String {
        format!(
            "postgres://postgres:postgres@127.0.0.1:{}/postgres",
            self.container.get_host_port_ipv4(5432)
        )
    }

    /// Create a connection pool for this container.
    pub async fn create_pool(&self) -> Result<PgPool> {
        let url = self.connection_url();
        let pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(5)
            .connect(&url)
            .await?;
        Ok(pool)
    }
}
```

5. Create `api-infra/src/testkit/redis.rs`:

```rust
use deadpool_redis::Pool as RedisPool;
use anyhow::Result;

/// A Redis test container managed by testcontainers.
pub struct RedisTestContainer {
    container: testcontainers::ContainerAsync<testcontainers::GenericImage>,
}

impl RedisTestContainer {
    /// Start a new Redis test container.
    pub async fn start() -> Result<Self> {
        let container = testcontainers::GenericImage::new("redis")
            .with_tag("7-alpine")
            .start()
            .await?;
        Ok(Self { container })
    }

    /// Get the connection URL for this container.
    pub fn connection_url(&self) -> String {
        format!(
            "redis://127.0.0.1:{}",
            self.container.get_host_port_ipv4(6379)
        )
    }

    /// Create a connection pool for this container.
    pub fn create_pool(&self) -> Result<RedisPool> {
        let url = self.connection_url();
        let config = deadpool_redis::Config::from_url(&url);
        let pool = config.create_pool(Some(deadpool_redis::Runtime::Tokio1))?;
        Ok(pool)
    }
}
```

6. Create `api-infra/src/testkit/fixtures.rs`:

```rust
use shared::models::User;
use uuid::Uuid;

/// Build a test user with the given parameters.
pub fn build_test_user(
    id: Uuid,
    username: &str,
    role: &str,
    school_id: i64,
) -> User {
    User {
        id,
        username: username.to_string(),
        email: format!("{username}@example.com"),
        password_hash: "hashed_password".to_string(),
        role: role.to_string(),
        school_id,
        campus_id: None,
    }
}

/// Build a test user with a campus.
pub fn build_test_user_with_campus(
    id: Uuid,
    username: &str,
    role: &str,
    school_id: i64,
    campus_id: i64,
) -> User {
    User {
        id,
        username: username.to_string(),
        email: format!("{username}@example.com"),
        password_hash: "hashed_password".to_string(),
        role: role.to_string(),
        school_id,
        campus_id: Some(campus_id),
    }
}

/// Generate a random UUID for test use.
pub fn random_uuid() -> Uuid {
    Uuid::new_v4()
}
```

7. Run `cargo build -p api-infra` (without testkit feature -- should succeed, testkit module is not compiled).
8. Run `cargo build -p api-infra --features testkit` (with feature -- should succeed, testkit compiles).
</action>

<acceptance_criteria>
- `grep '\[features\]' /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/Cargo.toml` returns a match
- `grep "testkit" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/Cargo.toml` returns at least 2 matches (feature definition + dev-dep references)
- `test -f /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/testkit/mod.rs` succeeds
- `test -f /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/testkit/database.rs` succeeds
- `test -f /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/testkit/redis.rs` succeeds
- `test -f /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/testkit/fixtures.rs` succeeds
- `grep "cfg.*feature.*testkit" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/lib.rs` returns a match
- `cargo build -p api-infra` exits 0
- `cargo build -p api-infra --features testkit` exits 0
</acceptance_criteria>

### Task 04-02: Update api crate imports to use api_infra:: directly

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/lib.rs (has `pub use auth::*; pub use db::*;` -- keep these)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/error.rs (re-export shim -- keep for now, consumers use `crate::error::AppError`)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/rbac/mod.rs (re-export shim -- can keep since only 2 consumers in middleware)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/tenant.rs (re-export shim)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/authz.rs (re-export shim)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/permission.rs (re-export shim with Type B functions)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/websocket/server.rs (re-export shim)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/websocket/message.rs (re-export shim)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/websocket/handler.rs (uses `crate::websocket::message::WebSocketMessage` and `crate::websocket::server::AddClientResult`)
</read_first>

<action>
In Phase 1, we keep ALL re-export shims in the api crate. They provide backward compatibility so existing `use crate::X` references continue to compile without change. The re-export shims will be removed in a future phase when all consumers are updated to use `api_infra::X` directly.

For this task, we verify that the existing import paths all still resolve correctly:

1. Verify each consumer still compiles:
   - `api/src/users/routes.rs`: `use crate::error::AppError` -> resolves via `api/src/error.rs` shim -> `api_infra::error::AppError`
   - `api/src/submissions/routes.rs`: same pattern
   - `api/src/notifications/routes.rs`: same pattern
   - `api/src/auth/routes.rs`: `use crate::AppState` -> resolves via `api/src/lib.rs` (AppState stays in api)
   - `api/src/middleware/permission.rs`: `use crate::rbac::RbacService` -> resolves via `api/src/rbac/mod.rs` shim -> `api_infra::rbac::*`
   - `api/src/middleware/authz.rs`: same pattern
   - `api/src/websocket/handler.rs`: `use crate::websocket::message::WebSocketMessage` -> resolves via shim -> `api_infra::websocket::message::*`
   - `api/src/websocket/server.rs`: (now a shim itself)
   - `api/src/discussions/routes.rs`: `use crate::websocket::message::WebSocketMessage`
   - `api/src/blog/routes.rs`: `use crate::websocket::message::WebSocketMessage`
   - `api/src/release_gate_tests.rs`: `use crate::websocket::WebSocketServer` + `use crate::AppState`
   - `api/src/middleware/auth.rs` (test block): constructs `crate::AppState { ... }` and `crate::websocket::WebSocketServer::new()`

2. Run `cargo build --workspace`.

3. Run `cargo test --workspace`.

The verification here is that NO import path changes were needed in the api crate consumers -- the re-export shims handle everything transparently.
</action>

<acceptance_criteria>
- `cargo build --workspace` exits 0 (all import paths resolve through shims)
- `cargo test --workspace` exits 0 (all tests pass)
- All re-export shims verified present:
  - `grep "pub use api_infra" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/error.rs` returns a match
  - `grep "pub use api_infra" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/rbac/mod.rs` returns a match
  - `grep "pub use api_infra" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/tenant.rs` returns a match
  - `grep "pub use api_infra" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/authz.rs` returns a match
  - `grep "pub use api_infra" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/permission.rs` returns a match
  - `grep "pub use api_infra" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/websocket/server.rs` returns a match
  - `grep "pub use api_infra" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/websocket/message.rs` returns a match
</acceptance_criteria>

### Task 04-03: Final workspace verification + success criteria sign-off

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/.planning/ROADMAP.md (Phase 1 Success Criteria section)
- /Users/xiexingyu/Documents/项目/Online_Judge/.planning/REQUIREMENTS.md (Phase 1 requirement IDs: ARCH-01, ARCH-02, ARCH-03, ARCH-06, SEC-01, SEC-06)
</read_first>

<action>
Run the complete Phase 1 success criteria verification.

**SC1: `cargo build --workspace` succeeds with api-infra compiling independently**

```bash
cargo build --workspace
cargo build -p api-infra
cargo build -p shared
cargo build -p judge-worker
cargo build -p api
```

**SC2: All 8 repository traits defined with full method signatures**

```bash
ls api-infra/src/traits/{user_repo,problem_repo,submission_repo,contest_repo,class_repo,community_repo,leaderboard_repo,search_repo}.rs
cargo doc -p api-infra --no-deps
```

**SC3: Application refuses to start if APP_ENV=production and JWT_SECRET/WORKER_SECRET are unset**

This is verified by unit tests in Task 03-06. Run:
```bash
cargo test -p api-infra config
```

For manual verification (optional):
```bash
APP_ENV=production DATABASE_URL=postgres://x cargo run -p api 2>&1 | head -5
# Expected: exit with error about JWT_SECRET
```

**SC4: Shared test infrastructure compiles and sample test passes**

```bash
cargo build -p api-infra --features testkit
# If Docker is available:
cargo test -p api-infra --features testkit fixtures
```

**SC5: `cargo test --workspace` passes with same results as before extraction**

```bash
cargo test --workspace
```

Capture the test count and verify it matches the pre-extraction baseline. The pre-extraction test count can be found by looking at the CI output or running `cargo test --workspace 2>&1 | tail -10`.

**Verify all 6 requirement IDs are covered:**

```bash
# ARCH-01: api-infra crate exists with AppError, middleware, WebSocketServer
cargo build -p api-infra
grep -rn "pub enum AppError\|pub struct WebSocketServer\|pub struct RbacService\|pub struct TenantContext\|pub fn require_permission\|pub fn tenant_middleware" api-infra/src/

# ARCH-02: 8 repository traits defined
ls api-infra/src/traits/*_repo.rs | wc -l  # expected: 8

# ARCH-03: 2 service traits defined
ls api-infra/src/traits/*_service.rs | wc -l  # expected: 2

# ARCH-06: testkit module exists
ls api-infra/src/testkit/

# SEC-01: Missing secrets fail in production
cargo test -p api-infra config -- --test-threads=1 2>&1 | grep -c "ok"

# SEC-06: APP_ENV controls behavior
grep "AppEnv" api-infra/src/config.rs | wc -l  # expected: multiple references
```

**Verify dependency graph has no circular deps:**

```bash
cargo metadata --format-version 1 | python3 -c "
import sys, json
d = json.load(sys.stdin)
for pkg in d['packages']:
    if pkg['name'] == 'api-infra':
        deps = [dep['pkg_id'].split(' ')[0] for dep in pkg['deps']]
        print(f'api-infra depends on: {deps}')
        assert 'api' not in deps, 'CIRCULAR: api-infra depends on api!'
        print('No circular dependency detected.')
"
```
</action>

<acceptance_criteria>
- `cargo build --workspace` exits 0
- `cargo build -p api-infra` exits 0
- `cargo test --workspace` exits 0
- `ls /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/*_repo.rs | wc -l` returns 8
- `ls /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/*_service.rs | wc -l` returns 2
- `test -d /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/testkit/` succeeds
- `cargo test -p api-infra config` exits 0 (SEC-01 + SEC-06 unit tests)
- `cargo metadata --format-version 1 | python3 -c "..."` prints "No circular dependency detected."
- `cargo doc -p api-infra --no-deps` exits 0
</acceptance_criteria>

## Verification

<verify>
```bash
# === PHASE 1 FINAL VERIFICATION ===

# 1. Workspace build
cargo build --workspace
echo "SC1: workspace build -- $?"

# 2. Independent crate builds
cargo build -p api-infra
cargo build -p shared
cargo build -p judge-worker
cargo build -p api
echo "SC1: independent builds -- $?"

# 3. Trait interfaces documented
cargo doc -p api-infra --no-deps
echo "SC2: docs generated -- $?"

# 4. Repository trait count
echo "SC2: repo traits -- $(ls /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/*_repo.rs 2>/dev/null | wc -l | tr -d ' ')"

# 5. Service trait count
echo "ARCH-03: service traits -- $(ls /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/*_service.rs 2>/dev/null | wc -l | tr -d ' ')"

# 6. SEC-01 + SEC-06 tests
cargo test -p api-infra config
echo "SC3: config tests -- $?"

# 7. Testkit compiles
cargo build -p api-infra --features testkit
echo "SC4: testkit build -- $?"

# 8. Full test suite
cargo test --workspace
echo "SC5: full test suite -- $?"

# 9. Dependency graph (no circular deps)
cargo tree -p api-infra 2>&1 | grep -c "api v" || true
echo "ARCH-01: no circular deps -- $?"
```
</verify>
