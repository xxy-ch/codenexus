---
wave: 2
depends_on: [1]
files_modified:
  - api-infra/src/lib.rs
  - api-infra/src/middleware/mod.rs
  - api-infra/src/middleware/tenant.rs
  - api-infra/src/middleware/authz.rs
  - api-infra/src/middleware/permission.rs
  - api-infra/src/websocket/mod.rs
  - api-infra/src/websocket/server.rs
  - api-infra/src/websocket/message.rs
  - api/src/lib.rs
  - api/src/middleware/mod.rs
  - api/src/middleware/tenant.rs
  - api/src/middleware/authz.rs
  - api/src/middleware/permission.rs
  - api/src/websocket/mod.rs
  - api/src/websocket/server.rs
  - api/src/websocket/message.rs
  - api/Cargo.toml
autonomous: true
requirements:
  - ARCH-01
---

# Plan 02: Move Middleware + WebSocket Server to api-infra

<objective>
Move the remaining pure-infrastructure components to `api-infra`: tenant middleware (reads Claims from extensions), authz middleware (uses RbacService, now in api-infra), permission middleware Type A functions (pure RBAC checks, no DB), WebSocketServer (connection management with no Axum/DB deps), and WebSocketMessage (serde types). The auth middleware stays in `api` because of its AppState/Redis dependencies. The permission Type B functions (require_organization_access, require_campus_access) stay in `api` because of their direct sqlx queries. The WebSocket handler stays in `api` because of its 6 sqlx queries.
</objective>

<threat_model>
- **LOW**: Tenant middleware reads from request extensions (set by auth middleware). Moving it does not change the trust boundary -- it still only reads Claims, not headers.
- **LOW**: Authz middleware is pure logic using RbacService. No external I/O.
- **LOW**: WebSocket server is connection management with no external dependencies. No data flows in/out except through channel senders.
- **MEDIUM**: Duplicate `require_permission` in `authz.rs` and `permission.rs` must be consolidated. The `permission.rs` closure-returning version is kept because it supports chaining via `route_layer`. The `authz.rs` version becomes a thin wrapper or is removed. If both are accidentally kept, tests still pass but there is dead code.
- **MEDIUM**: `permission.rs` split requires careful surgical editing. The Type B functions (`require_organization_access`, `require_campus_access`) reference `State<AppState>` and `sqlx::query_scalar`. These MUST NOT move to api-infra. A compile error would occur if they did (no sqlx in api-infra deps), so the risk is caught at compile time.
</threat_model>

<must_haves>
- [ ] `cargo build --workspace` succeeds
- [ ] `cargo test --workspace` passes with identical test counts
- [ ] No sqlx references exist in `api-infra/src/` (verified by grep)
- [ ] No `use crate::AppState` in api-infra (verified by grep)
- [ ] Duplicate `require_permission` consolidated to single implementation
- [ ] WebSocket handler remains in api crate with sqlx queries intact
- [ ] Permission Type B functions remain in api crate with sqlx queries intact

## Tasks

### Task 02-01: Move TenantContext + tenant_middleware to api-infra

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/tenant.rs (full 219-line file being moved)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/mod.rs (module declaration file)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/lib.rs (target module structure)
</read_first>

<action>
1. Create `api-infra/src/middleware/` directory.

2. Create `api-infra/src/middleware/mod.rs`:
```rust
pub mod authz;
pub mod permission;
pub mod tenant;
```
Note: NO `pub mod auth` -- auth middleware stays in api crate.

3. Create `api-infra/src/middleware/tenant.rs` with the EXACT content from `api/src/middleware/tenant.rs`. The imports are self-contained:
   - `use axum::{extract::Request, http::{HeaderMap, StatusCode}, middleware::Next, response::Response};` -- axum is a dep
   - `use shared::models::Claims;` -- shared is a dep
   No changes needed to the file content.

4. Convert `api/src/middleware/tenant.rs` to a re-export shim:
```rust
//! Re-export from api-infra.
pub use api_infra::middleware::tenant::*;
pub use api_infra::middleware::tenant::TenantContext;
```

5. Run `cargo test -p api-infra tenant` -- the 6 tenant middleware tests must pass:
   - `test_middleware_missing_tenant_header`
   - `test_middleware_valid_tenant_from_claims`
   - `test_middleware_ignores_header_without_claims`
   - `test_middleware_context_available`
   - `test_middleware_uses_claims_not_header`

6. Run `cargo build --workspace`.
</action>

<acceptance_criteria>
- `test -f /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/middleware/tenant.rs` succeeds
- `grep "pub use api_infra::middleware::tenant" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/tenant.rs` returns a match
- `cargo test -p api-infra tenant` exits 0 with 5 tests passed
- `cargo build --workspace` exits 0
</acceptance_criteria>

### Task 02-02: Consolidate Duplicate require_permission + Move to api-infra

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/authz.rs (full 244-line file -- duplicate require_permission)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/permission.rs (full 272-line file -- closure-returning version + Type B DB functions)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/mod.rs
</read_first>

<action>
This task consolidates the duplicate `require_permission` and moves the pure middleware (Type A) to api-infra while keeping DB-dependent functions (Type B) in api.

**Part A: Create authz middleware in api-infra (consolidated)**

1. Create `api-infra/src/middleware/authz.rs` with the closure-returning functions from `api/src/middleware/permission.rs` (lines 1-196), replacing the imports:

Replace `use crate::rbac::RbacService;` with `use crate::rbac::RbacService;` (same -- RbacService is now in api-infra).

Keep the full implementations of:
- `require_permission(Permission)` -- returns closure
- `require_any_permission(&'static [Permission])` -- returns closure
- `require_all_permissions(&'static [Permission])` -- returns closure
- `require_min_role(Role)` -- returns closure

Remove `use crate::AppState;` (not needed for Type A functions).

Remove the Type B functions entirely from this file:
- `require_organization_access` -- stays in api
- `require_campus_access` -- stays in api

Keep the `#[cfg(test)] mod tests` block with the single test `test_role_hierarchy_check` (it only tests `Role::is_higher_or_equal`, no AppState needed).

**Part B: Create permission module in api-infra (re-exports for backward compat)**

2. Create `api-infra/src/middleware/permission.rs` as a re-export of authz functions for backward compatibility:
```rust
//! Re-export permission middleware from authz.
//! Both `permission::require_permission` and `authz::require_permission` now
//! point to the same implementation.
pub use super::authz::{
    require_all_permissions, require_any_permission, require_min_role, require_permission,
};
```

**Part C: Update api crate shims**

3. Convert `api/src/middleware/authz.rs` to a re-export shim:
```rust
//! Re-export from api-infra.
pub use api_infra::middleware::authz::require_permission as authz_require_permission;
```
NOTE: Rename to `authz_require_permission` to avoid name collision with the permission module's re-export of the same function name.

4. Convert `api/src/middleware/permission.rs` to a re-export shim for Type A + keep Type B:
```rust
//! Type A (pure middleware) re-exported from api-infra.
//! Type B (DB-dependent) stays here because they use AppState + sqlx.

// Re-export pure middleware from api-infra
pub use api_infra::middleware::permission::{
    require_all_permissions, require_any_permission, require_min_role, require_permission,
};

use api_infra::middleware::tenant::TenantContext;
use api_infra::rbac::RbacService;
use api_infra::AppState;
use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use shared::models::{Claims, role::Role};
use std::str::FromStr;

/// Check if user has access to a specific organization.
/// DB-dependent -- stays in api crate.
pub async fn require_organization_access(
    State(state): State<AppState>,
    organization_id: i64,
    claims: Claims,
) -> Result<(), StatusCode> {
    let role = Role::from_str(&claims.role).map_err(|_| StatusCode::FORBIDDEN)?;
    if role == Role::Root {
        return Ok(());
    }
    let belongs = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND organization_id = $2)",
    )
    .bind(claims.sub)
    .bind(organization_id)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if belongs {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

/// Check if user has access to a specific campus.
/// DB-dependent -- stays in api crate.
pub async fn require_campus_access(
    State(state): State<AppState>,
    campus_id: i64,
    claims: Claims,
) -> Result<(), StatusCode> {
    let role = Role::from_str(&claims.role).map_err(|_| StatusCode::FORBIDDEN)?;
    if role == Role::Root {
        return Ok(());
    }
    let belongs = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND campus_id = $2)",
    )
    .bind(claims.sub)
    .bind(campus_id)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if belongs {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_role_hierarchy_check() {
        assert!(Role::Root.is_higher_or_equal(Role::Teacher));
        assert!(Role::Teacher.is_higher_or_equal(Role::Student));
        assert!(!Role::Student.is_higher_or_equal(Role::Teacher));
    }
}
```

5. Update `api/src/middleware/mod.rs` to keep `pub mod auth;` (stays in api):
```rust
pub mod auth;
pub mod authz;
pub mod permission;
pub mod tenant;
```
This stays the same -- all four submodules exist as shims in api.

6. Add `use axum` to api-infra dependencies if not already present. Check that `api-infra/Cargo.toml` has `axum = { workspace = true }` -- it does (added in Plan 01 Task 01-01).

7. Run `cargo build --workspace`.
8. Run `cargo test --workspace`.
</action>

<acceptance_criteria>
- `grep "require_organization_access" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/middleware/authz.rs` returns NO match
- `grep "require_organization_access" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/permission.rs` returns a match
- `grep "sqlx" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/middleware/` returns NO matches
- `grep "pub use api_infra::middleware::authz" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/permission.rs` returns a match
- `cargo test -p api-infra authz` exits 0
- `cargo build --workspace` exits 0
- `cargo test --workspace` exits 0
</acceptance_criteria>

### Task 02-03: Move WebSocketServer + WebSocketMessage + topics to api-infra

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/websocket/server.rs (full 554-line file -- WebSocketServer struct + topics mod + tests)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/websocket/message.rs (full 254-line file -- WebSocketMessage enum + MessageFilter + tests)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/websocket/mod.rs (module declarations and re-exports)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/websocket/handler.rs (STAYS in api -- verify it compiles with updated imports)
</read_first>

<action>
1. Create `api-infra/src/websocket/` directory.

2. Create `api-infra/src/websocket/mod.rs`:
```rust
pub mod message;
pub mod server;

pub use message::WebSocketMessage;
pub use server::WebSocketServer;
```

3. Create `api-infra/src/websocket/message.rs` with the EXACT content from `api/src/websocket/message.rs`. The imports are self-contained:
   - `use serde::{Deserialize, Serialize};` -- serde is a dep
   - `use uuid::Uuid;` -- uuid is a dep
   - Uses `chrono::DateTime<chrono::Utc>` -- chrono needs to be added as a dep

4. Add `chrono = { version = "0.4", features = ["serde"] }` and `uuid = { version = "1.11", features = ["v4", "serde"] }` to `api-infra/Cargo.toml` `[dependencies]`.

5. Create `api-infra/src/websocket/server.rs` with the EXACT content from `api/src/websocket/server.rs`, changing only the internal import:

Replace `use crate::websocket::message::WebSocketMessage;` with `use super::message::WebSocketMessage;`

All other imports are self-contained:
   - `use std::collections::HashMap;` -- stdlib
   - `use std::net::IpAddr;` -- stdlib
   - `use std::sync::Arc;` -- stdlib
   - `use tokio::sync::{Mutex, RwLock};` -- tokio is a dep
   - `use uuid::Uuid;` -- uuid is a dep
   - `use anyhow::Error;` -- anyhow is a dep

Keep the entire `pub mod topics { ... }` submodule and all `#[cfg(test)] mod tests` (10 tests).

6. Update `api-infra/src/lib.rs` to add `pub mod websocket;`:
```rust
pub mod error;
pub mod middleware;
pub mod rbac;
pub mod websocket;
```

7. Convert `api/src/websocket/server.rs` to a re-export shim:
```rust
//! Re-export from api-infra.
pub use api_infra::websocket::server::*;
```

8. Convert `api/src/websocket/message.rs` to a re-export shim:
```rust
//! Re-export from api-infra.
pub use api_infra::websocket::message::*;
```

9. Update `api/src/websocket/mod.rs` to keep handler and re-export from api-infra:
```rust
pub mod handler;
pub mod message;
pub mod server;

pub use message::WebSocketMessage;
pub use server::WebSocketServer;
```
The re-exports in the mod.rs stay the same -- they now resolve through the shims.

10. Verify `api/src/websocket/handler.rs` compiles unchanged. It uses:
    - `use crate::websocket::message::WebSocketMessage;` -- resolves through re-export shim
    - `use crate::websocket::server::AddClientResult;` -- resolves through re-export shim
    - `use crate::AppState;` -- stays in api, no change needed

11. Run `cargo test -p api-infra websocket` -- the 12 websocket tests must pass:
    - `test_websocket_server_creation`
    - `test_topic_generation`
    - `test_client_management`
    - `test_per_user_connection_limit`
    - `test_per_ip_connection_limit`
    - `test_topic_subscription`
    - `test_subscribe_unknown_client_fails`
    - `test_per_client_topic_subscription_limit`
    - `test_tenant_scoped_broadcast`
    - `test_message_serialization`
    - `test_submission_update_message`
    - `test_message_filter`

12. Run `cargo build --workspace`.
13. Run `cargo test --workspace`.
</action>

<acceptance_criteria>
- `test -f /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/websocket/server.rs` succeeds
- `test -f /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/websocket/message.rs` succeeds
- `grep "pub use api_infra::websocket::server::\*" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/websocket/server.rs` returns a match
- `grep "pub use api_infra::websocket::message::\*" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/websocket/message.rs` returns a match
- `grep "sqlx" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/websocket/` returns NO matches
- `cargo test -p api-infra websocket` exits 0 with 12 tests passed
- `cargo build --workspace` exits 0
- `cargo test --workspace` exits 0
</acceptance_criteria>

### Task 02-04: Move AppState to api-infra

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/lib.rs (lines 27-36: AppState struct definition)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs (lines 1-113: uses AppState + creates instances)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/Cargo.toml (to verify sqlx/deadpool-redis deps)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/Cargo.toml (must add sqlx + deadpool-redis for type references)
</read_first>

<action>
1. Add `sqlx` and `deadpool-redis` to `api-infra/Cargo.toml` `[dependencies]`:
```toml
# Type references only -- api-infra does NOT create pools or run queries
sqlx = { version = "0.8", features = ["runtime-tokio", "tls-rustls", "postgres", "uuid", "chrono"] }
deadpool-redis = { version = "0.22", features = ["serde"] }
```

2. Add `jsonwebtoken = "9"` to `api-infra/Cargo.toml` `[dependencies]` (needed for `auth::JwtService` type in AppState).

3. Create `api-infra/src/state.rs`:
```rust
use deadpool_redis::Pool as RedisPool;
use sqlx::PgPool;
use std::sync::Arc;

use crate::websocket::WebSocketServer;

/// Application state shared across all route handlers via Axum's State extractor.
///
/// The struct is defined in api-infra but pool creation happens in the `api` crate.
/// This keeps infrastructure type definitions centralized while allowing domain-specific
/// pool configuration to remain close to the code that uses it.
#[derive(Clone)]
pub struct AppState {
    pub db_pool: PgPool,
    pub redis_pool: Option<RedisPool>,
    pub redis_url: String,
    pub jwt_service: auth::JwtService,
    pub jwt_secret: String,
    pub worker_secret: String,
    pub websocket_server: Arc<WebSocketServer>,
}

pub mod auth {
    use jsonwebtoken::{DecodingKey, EncodingKey};

    /// JWT service for token generation and validation.
    /// Forward-declared here so AppState can reference it.
    /// The full implementation lives in `api/src/auth/`.
    #[derive(Clone)]
    pub struct JwtService {
        encoding_key: EncodingKey,
        decoding_key: DecodingKey,
    }

    impl JwtService {
        pub fn new(secret: &str) -> Self {
            Self {
                encoding_key: EncodingKey::from_secret(secret.as_bytes()),
                decoding_key: DecodingKey::from_secret(secret.as_bytes()),
            }
        }

        pub fn validate_token(&self, token: &str) -> Result<shared::models::Claims, String> {
            jsonwebtoken::decode::<shared::models::Claims>(
                token,
                &self.decoding_key,
                &jsonwebtoken::Validation::default(),
            )
            .map(|data| data.claims)
            .map_err(|e| e.to_string())
        }

        pub fn generate_access_token(
            &self,
            user: &shared::models::User,
        ) -> Result<String, String> {
            let now = chrono::Utc::now().timestamp();
            let claims = shared::models::Claims {
                sub: user.id,
                email: user.email.clone(),
                role: user.role.clone(),
                school_id: user.school_id,
                campus_id: user.campus_id,
                iat: now,
                exp: now + 3600, // 1 hour
                jti: uuid::Uuid::new_v4(),
            };
            jsonwebtoken::encode(
                &jsonwebtoken::Header::default(),
                &claims,
                &self.encoding_key,
            )
            .map_err(|e| e.to_string())
        }
    }
}
```

IMPORTANT DESIGN DECISION: Rather than create a circular dependency by having AppState reference `api::auth::JwtService`, we duplicate a minimal `JwtService` in api-infra. The full `JwtService` in `api/src/auth/jwt_service.rs` has additional methods (`generate_refresh_token`, `refresh_access_token`, `revoke_token`). The api-infra version is a minimal subset. When Phase 2+ extracts domain crates, they will use the api-infra version. The api crate's full version continues to work for all auth flows.

ALTERNATIVE (simpler, chosen): Keep the `auth` module in api-infra as a forward declaration only, and have AppState use `Box<dyn ...>` or a trait. BUT this adds complexity. The simplest approach is:

**REVISED APPROACH**: Keep `AppState` definition in `api/src/lib.rs` as-is. It references `auth::JwtService`, `websocket::WebSocketServer`, `sqlx::PgPool`, `deadpool_redis::Pool` -- all of which are in the api crate. Moving AppState to api-infra would require either duplicating JwtService or creating a trait, both of which add complexity for minimal benefit in Phase 1. AppState moves to api-infra in Phase 2 when domain crates need it.

REVISED ACTION: Skip AppState move. Instead, add a note in `api-infra/src/lib.rs`:
```rust
pub mod error;
pub mod middleware;
pub mod rbac;
pub mod websocket;

// NOTE: AppState stays in the api crate because it references api::auth::JwtService.
// It will move to api-infra in Phase 2 when domain crates are extracted and
// JwtService is abstracted behind a trait.
```

4. Run `cargo build --workspace` to confirm no changes needed.
5. Run `cargo test --workspace`.
</action>

<acceptance_criteria>
- `grep "AppState" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/lib.rs` returns a match (AppState remains in api)
- `grep "AppState" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/lib.rs` returns NO match
- `cargo build --workspace` exits 0
- `cargo test --workspace` exits 0
</acceptance_criteria>

## Verification

<verify>
```bash
# Full workspace build
cargo build --workspace

# Full workspace test
cargo test --workspace

# Verify no sqlx in api-infra middleware (except AppState-related if moved)
grep -rn "sqlx" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/middleware/  # expect no output

# Verify no sqlx in api-infra websocket
grep -rn "sqlx" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/websocket/  # expect no output

# Verify WebSocketServer tests pass in api-infra
cargo test -p api-infra websocket

# Verify tenant middleware tests pass in api-infra
cargo test -p api-infra tenant

# Verify authz tests pass in api-infra
cargo test -p api-infra authz

# Verify Type B permission functions remain in api
grep -n "require_organization_access\|require_campus_access" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/permission.rs

# Verify WebSocket handler stays in api with sqlx
grep -n "sqlx" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/websocket/handler.rs
```
</verify>
