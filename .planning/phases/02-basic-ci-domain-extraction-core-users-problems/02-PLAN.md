---
wave: 2
depends_on: [01-PLAN]
files_modified:
  - Cargo.toml
  - api-infra/Cargo.toml
  - api-infra/src/lib.rs
  - api-infra/src/state.rs
  - api-infra/src/traits/token_service.rs
  - api-infra/src/traits/mod.rs
  - api-infra/src/middleware/mod.rs
  - api-infra/src/middleware/auth.rs
  - api/Cargo.toml
  - api/src/main.rs
  - api/src/lib.rs
  - api/src/middleware/auth.rs
  - api/src/middleware/mod.rs
  - api/src/users/mod.rs
  - api/src/users/models.rs
  - api/src/users/routes.rs
  - api/src/users/service.rs
  - api/src/auth/mod.rs
  - api/src/auth/routes.rs
  - api/src/problems/mod.rs
  - api/src/problems/models.rs
  - api/src/problems/routes.rs
  - api/src/problems/test_cases.rs
  - api/src/problems/access.rs
  - api/src/problems/problem_access.rs
  - api/src/release_gate_tests.rs
  - domain-users/Cargo.toml
  - domain-users/src/lib.rs
  - domain-users/src/models.rs
  - domain-users/src/routes.rs
  - domain-users/src/service.rs
  - domain-problems/Cargo.toml
  - domain-problems/src/lib.rs
  - domain-problems/src/models.rs
  - domain-problems/src/routes.rs
  - domain-problems/src/test_cases.rs
  - domain-problems/src/access.rs
  - domain-problems/src/problem_access.rs
autonomous: true
requirements:
  - ARCH-04
  - ARCH-05
---

# Plan 02: Infrastructure Prerequisites + Domain Extraction (Users, Problems)

<objective>
Extract the `users` and `problems` domain modules into independent workspace crates (`domain-users`, `domain-problems`). To make this possible, first define a `TokenService` trait in `api-infra`, move `AppState` to `api-infra`, and move `AuthExtractor` to `api-infra`. The `api` crate continues to serve identical endpoints by importing routers from the new domain crates. All existing tests pass unchanged.
</objective>

<threat_model>
- **MEDIUM**: Moving `AuthExtractor` to `api-infra` changes the JWT validation boundary. The extractor reads `JWT_SECRET` from environment variables and decodes tokens -- this behavior MUST remain identical. No new attack surface is introduced since the code is moved, not modified.
- **LOW**: `TokenService` trait exposes `generate_access_token`, `generate_refresh_token`, `validate_token` -- these are existing capabilities abstracted behind a trait. No new capabilities added.
- **LOW**: `AppState` move is structural; no fields change. The `jwt_service` field type changes from concrete `JwtService` to `Arc<dyn TokenService>` but the runtime behavior is identical (concrete `JwtService` impl is provided at construction in `main.rs`).
- **LOW**: Domain crates have no new network exposure -- routers are still mounted by the `api` crate.
</threat_model>

<must_haves>
- [ ] `cargo build -p domain-users` succeeds independently
- [ ] `cargo build -p domain-problems` succeeds independently
- [ ] `cargo build --workspace` succeeds with 6 crates (shared, api-infra, judge-worker, domain-users, domain-problems, api)
- [ ] `cargo test --workspace` passes with identical results
- [ ] No circular dependency: domain crates depend on api-infra + shared only, NOT on api
- [ ] `api/src/main.rs` mounts user and problem routers from domain crates

## Tasks

### Task T2-04: Define TokenService trait in api-infra

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/lib.rs (current module structure)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/mod.rs (current trait modules)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/auth/jwt_service.rs (concrete JwtService implementation -- reference for method signatures)
- /Users/xiexingyu/Documents/项目/Online_Judge/shared/src/models/mod.rs (for Claims, User types)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/error.rs (for AppError type used in return)
</read_first>

<action>
1. Add `jsonwebtoken = "9"` and `chrono = { version = "0.4", features = ["serde"] }` to `api-infra/Cargo.toml` `[dependencies]` section. The `chrono` dep already exists; just add `jsonwebtoken`.

2. Create `/Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/token_service.rs` with these exact contents:

```rust
//! Token service trait for JWT operations.
//!
//! Abstracts JWT token generation and validation so that domain crates
//! can depend on the trait without depending on the concrete `JwtService`
//! implementation in the `api` crate.

use shared::models::Claims;

/// Trait for generating and validating JWT tokens.
///
/// Implemented by `api::auth::JwtService`. Domain crates use this trait
/// via `AppState.jwt_service: Arc<dyn TokenService>`.
pub trait TokenService: Send + Sync {
    /// Generate a short-lived access token for the given user.
    fn generate_access_token(
        &self,
        user: &shared::models::User,
    ) -> Result<String, jsonwebtoken::errors::Error>;

    /// Generate a long-lived refresh token for the given user.
    fn generate_refresh_token(
        &self,
        user: &shared::models::User,
    ) -> Result<String, jsonwebtoken::errors::Error>;

    /// Validate a token string and return the decoded claims.
    fn validate_token(&self, token: &str) -> Result<Claims, String>;
}
```

3. Add `pub mod token_service;` to `/Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/mod.rs` after the existing module declarations.

4. Verify: `cargo build -p api-infra` must succeed.
</action>

<acceptance_criteria>
- `test -f api-infra/src/traits/token_service.rs` returns 0
- `grep "pub mod token_service" api-infra/src/traits/mod.rs` returns a match
- `grep "fn generate_access_token" api-infra/src/traits/token_service.rs` returns a match
- `grep "fn generate_refresh_token" api-infra/src/traits/token_service.rs` returns a match
- `grep "fn validate_token" api-infra/src/traits/token_service.rs` returns a match
- `grep "trait TokenService" api-infra/src/traits/token_service.rs` returns a match
- `cargo build -p api-infra` exits 0
</acceptance_criteria>

### Task T2-05: Implement TokenService for JwtService in api crate

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/auth/jwt_service.rs (JwtService to implement the trait)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/token_service.rs (trait definition just created)
</read_first>

<action>
1. Add `api-infra` dependency to the existing `use` block or add a new import at the top of `/Users/xiexingyu/Documents/项目/Online_Judge/api/src/auth/jwt_service.rs`:

Add after the existing imports:
```rust
use api_infra::traits::token_service::TokenService;
```

2. Add the `TokenService` trait implementation for `JwtService` at the end of the file (before the `#[cfg(test)]` block):

```rust
impl TokenService for JwtService {
    fn generate_access_token(
        &self,
        user: &shared::models::User,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        // Delegate to existing method
        JwtService::generate_access_token(self, user)
    }

    fn generate_refresh_token(
        &self,
        user: &shared::models::User,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        JwtService::generate_refresh_token(self, user)
    }

    fn validate_token(&self, token: &str) -> Result<Claims, String> {
        JwtService::validate_token(self, token)
    }
}
```

Note: The methods are synchronous (no `async`), so `#[async_trait]` is not needed. The trait already has `Send + Sync` bounds, which `JwtService` satisfies since it is `Clone` and only contains keys.

4. Verify: `cargo build -p api` must succeed.
</action>

<acceptance_criteria>
- `grep "impl TokenService for JwtService" api/src/auth/jwt_service.rs` returns a match
- `grep "use api_infra::traits::token_service::TokenService" api/src/auth/jwt_service.rs` returns a match
- `cargo build -p api` exits 0
</acceptance_criteria>

### Task T2-06: Move AppState to api-infra

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/lib.rs (current AppState definition, lines 27-36)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs (duplicate AppState definition, lines 40-49, and construction at lines 83-91)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/lib.rs (target location, currently has note about Phase 2 move)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/Cargo.toml (needs sqlx, deadpool-redis, jsonwebtoken deps for state fields)
</read_first>

<action>
1. Add required dependencies to `api-infra/Cargo.toml` for the types used in AppState fields. Add these to `[dependencies]`:

```toml
sqlx = { version = "0.8", features = ["runtime-tokio", "tls-rustls", "postgres", "chrono", "uuid"] }
deadpool-redis = { version = "0.22", features = ["serde"] }
jsonwebtoken = "9"
```

Note: `sqlx` is already an optional dep for the testkit feature. We need it as a required dep now because `AppState.db_pool` is `sqlx::PgPool`. Move the existing optional sqlx line to the required `[dependencies]` section (remove `optional = true`). Do the same for `deadpool-redis`.

2. Create `/Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/state.rs` with these exact contents:

```rust
//! Shared application state.
//!
//! Moved from the `api` crate to `api-infra` so that domain crates can
//! reference `AppState` without depending on the `api` crate.

use std::sync::Arc;

use api_infra::traits::token_service::TokenService;
use sqlx::PgPool;

/// Shared application state accessible to all route handlers.
///
/// The `jwt_service` field uses a trait object so domain crates don't
/// need to know the concrete `JwtService` type.
#[derive(Clone)]
pub struct AppState {
    pub db_pool: PgPool,
    pub redis_pool: Option<deadpool_redis::Pool>,
    pub redis_url: String,
    pub jwt_service: Arc<dyn TokenService>,
    pub jwt_secret: String,
    pub worker_secret: String,
    pub websocket_server: Arc<crate::websocket::WebSocketServer>,
}
```

3. Add `pub mod state;` to `/Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/lib.rs`. Replace the existing comment about Phase 2:

Change from:
```rust
// NOTE: AppState stays in the api crate because it references api::auth::JwtService.
// It will move to api-infra in Phase 2 when domain crates are extracted and
// JwtService is abstracted behind a trait.
```

To:
```rust
pub mod state;
```

Keep all existing module declarations (`pub mod config;`, `pub mod error;`, etc.).

4. Update `api/src/lib.rs` to re-export AppState from api-infra. Replace the entire `AppState` struct definition (lines 27-36) with a re-export:

```rust
pub use api_infra::state::AppState;
```

5. Remove the duplicate `AppState` definition from `api/src/main.rs` (lines 40-49). The struct definition block:
```rust
#[derive(Clone)]
pub struct AppState {
    pub db_pool: PgPool,
    ...
}
```
must be deleted entirely. The `use` imports at the top of `main.rs` need to be updated to import AppState from api-infra:

Add:
```rust
use api_infra::state::AppState;
```

6. Update `AppState` construction in `api/src/main.rs` (around line 83). Change:
```rust
jwt_service,
```
To:
```rust
jwt_service: std::sync::Arc::new(jwt_service),
```

This wraps the concrete `JwtService` in an `Arc<dyn TokenService>`.

7. Verify: `cargo build --workspace` must succeed. There will be additional errors in files that reference `state.jwt_service` directly (it is now `Arc<dyn TokenService>`, so method calls work the same via trait dispatch). Check for compilation errors and fix any that arise.

Key files that construct `UserService::new(state.db_pool, state.jwt_service)`:
- `api/src/users/routes.rs` (7 occurrences of `UserService::new(state.db_pool, state.jwt_service)`)
- `api/src/auth/routes.rs` (3 occurrences of `UserService::new(state.db_pool.clone(), state.jwt_service.clone())`)

These should compile without changes because `Arc<dyn TokenService>` supports method calls via the trait, and `Clone` on `Arc` clones the Arc, not the underlying service.

Wait -- `UserService::new` currently takes `JwtService` (concrete type), not `Arc<dyn TokenService>`. This WILL break. The `UserService` constructor signature must be updated to accept `Arc<dyn TokenService>` instead of `JwtService`. However, that change belongs to the domain-users extraction task (T2-07), not here.

For NOW, in `api/src/main.rs`, the `jwt_service` field must remain compatible with the current `UserService::new(pool, jwt_service)` calls. The simplest approach: keep `jwt_service` as the concrete type `JwtService` in `AppState` initially, and change it to `Arc<dyn TokenService>` only when extracting domain-users.

**REVISED APPROACH**: To avoid breaking the entire codebase at once, move `AppState` to `api-infra` but keep the `jwt_service` field typed as `Arc<dyn TokenService>` from the start. Then update all call sites in the `api` crate to use `.clone()` on the Arc:

In `api/src/users/routes.rs`, `UserService::new(state.db_pool, state.jwt_service)` -- this currently passes `JwtService` directly. After the change, `state.jwt_service` is `Arc<dyn TokenService>`. The `UserService` in `api/src/users/service.rs` takes `JwtService` -- we need to update it to accept `Arc<dyn TokenService>`.

BUT this is a change to the users module which will be moved to `domain-users` later. Making this change now, in-place, and then moving the files is cleaner than making it during the move.

**Final approach for this task:**

a) Create `api-infra/src/state.rs` with `jwt_service: Arc<dyn TokenService>`.
b) Re-export from `api/src/lib.rs`.
c) Remove duplicate from `api/src/main.rs`.
d) Update `api/src/main.rs` to wrap: `jwt_service: Arc::new(jwt_service)`.
e) Update `api/src/users/service.rs` to accept `Arc<dyn TokenService>` instead of `JwtService`:
   - Change `use crate::auth::JwtService;` to `use api_infra::traits::token_service::TokenService;`
   - Change `jwt_service: JwtService` to `jwt_service: std::sync::Arc<dyn TokenService>` in the struct
   - Update `new()` accordingly
   - Method calls like `self.jwt_service.generate_access_token()` and `self.jwt_service.validate_token()` work unchanged because `Arc<dyn TokenService>` dispatches via the trait
f) Update `api/src/auth/routes.rs` -- it also creates `UserService::new(state.db_pool.clone(), state.jwt_service.clone())`. After the change, `state.jwt_service` is `Arc<dyn TokenService>`, and `.clone()` on Arc gives another Arc pointing to the same service. This should work with the updated `UserService::new` signature.

8. Run `cargo build --workspace` and fix any remaining type mismatches. The expected files needing updates:
   - `api/src/users/service.rs` (JwtService -> Arc<dyn TokenService>)
   - `api/src/auth/routes.rs` (already uses .clone(), should work)
   - `api/src/auth/jwt_service.rs` tests (may reference `crate::AppState`)
   - `api/src/middleware/auth.rs` (references `state.jwt_secret`, still works)
   - `api/src/release_gate_tests.rs` (constructs AppState directly)

9. For `api/src/release_gate_tests.rs`, update AppState construction to use `Arc::new(jwt_service)` for the `jwt_service` field.

</action>

<acceptance_criteria>
- `grep "pub mod state" api-infra/src/lib.rs` returns a match
- `grep "pub struct AppState" api-infra/src/state.rs` returns a match
- `grep "jwt_service: Arc<dyn TokenService>" api-infra/src/state.rs` returns a match
- `grep "pub struct AppState" api/src/lib.rs` returns NO match (only re-export)
- `grep "pub use api_infra::state::AppState" api/src/lib.rs` returns a match
- `grep "pub struct AppState" api/src/main.rs` returns NO match (duplicate removed)
- `cargo build --workspace` exits 0
</acceptance_criteria>

### Task T2-07: Move AuthExtractor to api-infra

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/auth.rs (current AuthExtractor + auth_middleware, 224 lines)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/middleware/mod.rs (current middleware module structure)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/Cargo.toml (must have jsonwebtoken dep)
</read_first>

<action>
1. The `AuthExtractor` struct (lines 9-55 of `api/src/middleware/auth.rs`) currently creates a `JwtService` inline from `std::env::var("JWT_SECRET")`. For the api-infra version, keep this exact same behavior -- it reads the secret from the environment and validates the token. No behavioral change.

2. Create `/Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/middleware/auth.rs` with the `AuthExtractor` struct and its `FromRequestParts` impl. Copy the exact implementation from `api/src/middleware/auth.rs` lines 1-55, but update the `JwtService` import:

```rust
use std::sync::Arc;

use axum::{async_trait, extract::FromRequestParts, http::StatusCode};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use shared::models::Claims;

/// Extractor that validates JWT from Authorization header or access_token cookie.
pub struct AuthExtractor(pub Claims);

#[async_trait]
impl<S> FromRequestParts<S> for AuthExtractor
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .get("authorization")
            .and_then(|h| h.to_str().ok())
            .and_then(|h| h.strip_prefix("Bearer "))
            .map(|t| t.to_string())
            .or_else(|| {
                parts
                    .headers
                    .get("cookie")
                    .and_then(|c| c.to_str().ok())
                    .and_then(|c| {
                        c.split(';').find_map(|cookie| {
                            let parts: Vec<&str> = cookie.trim().splitn(2, '=').collect();
                            if parts.len() == 2 && parts[0] == "access_token" {
                                Some(parts[1].to_string())
                            } else {
                                None
                            }
                        })
                    })
            })
            .ok_or(StatusCode::UNAUTHORIZED)?;

        let jwt_secret = std::env::var("JWT_SECRET").map_err(|_| StatusCode::UNAUTHORIZED)?;

        let token_data = decode::<Claims>(
            &token,
            &DecodingKey::from_secret(jwt_secret.as_ref()),
            &Validation::new(Algorithm::HS256),
        )
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

        Ok(AuthExtractor(token_data.claims))
    }
}
```

Key difference from the original: instead of creating a `JwtService` struct and calling `.validate_token()`, it uses `jsonwebtoken::decode` directly. This eliminates the dependency on `crate::auth::JwtService` from the api-infra version. The behavior is IDENTICAL -- same algorithm, same key, same error mapping.

3. Add `pub mod auth;` to `/Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/middleware/mod.rs`:

Change from:
```rust
pub mod authz;
pub mod permission;
pub mod tenant;
```
To:
```rust
pub mod auth;
pub mod authz;
pub mod permission;
pub mod tenant;
```

4. Update `/Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/auth.rs` to re-export `AuthExtractor` from api-infra and keep only the `auth_middleware` function (which uses `crate::AppState` and Redis blacklist logic that stays in the api crate):

Replace the file contents with:
```rust
//! Auth middleware and extractor.
//!
//! `AuthExtractor` is re-exported from `api-infra`. The `auth_middleware`
//! function (JWT blacklist check, extension injection) stays here because
//! it depends on `AppState` and Redis.

pub use api_infra::middleware::auth::AuthExtractor;

use std::sync::Arc;

use axum::{http::StatusCode, response::Response};
use shared::models::Claims;

use crate::auth::JwtService;
use crate::AppState;

pub async fn auth_middleware(
    axum::extract::State(state): axum::extract::State<AppState>,
    request: axum::http::Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> Result<Response, StatusCode> {
    // Try Authorization header first, then fall back to cookie
    let token = request
        .headers()
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .map(|t| t.to_string())
        .or_else(|| {
            request
                .headers()
                .get("cookie")
                .and_then(|c| c.to_str().ok())
                .and_then(|c| {
                    c.split(';').find_map(|cookie| {
                        let parts: Vec<&str> = cookie.trim().splitn(2, '=').collect();
                        if parts.len() == 2 && parts[0] == "access_token" {
                            Some(parts[1].to_string())
                        } else {
                            None
                        }
                    })
                })
        });

    let token = token.ok_or(StatusCode::UNAUTHORIZED)?;

    let jwt_service = Arc::new(JwtService::new(&state.jwt_secret));

    let claims = jwt_service
        .validate_token(&token)
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    // Check JWT blacklist (revoked tokens)
    if let Some(redis_pool) = &state.redis_pool {
        if let Ok(mut conn) = redis_pool.get().await {
            let blacklisted: bool = deadpool_redis::redis::cmd("EXISTS")
                .arg(format!("bl:{}", claims.jti))
                .query_async(&mut conn)
                .await
                .unwrap_or(false);
            if blacklisted {
                return Err(StatusCode::UNAUTHORIZED);
            }
        }
    }

    let mut request = request;
    request.extensions_mut().insert(claims.sub);
    request.extensions_mut().insert(claims);

    Ok(next.run(request).await)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{header, HeaderValue, Request, StatusCode},
        middleware,
        routing::get,
        Router,
    };
    use tower::ServiceExt;

    async fn protected_handler(claims: AuthExtractor) -> String {
        format!("user_id: {}", claims.0.sub)
    }

    fn create_test_app() -> Router {
        let jwt_service = crate::auth::JwtService::new("test_secret_key");
        let state = AppState {
            db_pool: sqlx::PgPool::connect_lazy("postgres://localhost/nonexistent").unwrap(),
            redis_pool: None,
            jwt_service: std::sync::Arc::new(jwt_service),
            redis_url: String::new(),
            jwt_secret: "test_secret_key".to_string(),
            worker_secret: "test_worker_secret".to_string(),
            websocket_server: std::sync::Arc::new(crate::websocket::WebSocketServer::new()),
        };
        Router::new()
            .route("/protected", get(protected_handler))
            .layer(middleware::from_fn_with_state(
                state.clone(),
                auth_middleware,
            ))
            .with_state(state)
    }

    #[tokio::test]
    async fn test_auth_middleware_missing_token() {
        let app = create_test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/protected")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_invalid_token() {
        let app = create_test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/protected")
                    .header(
                        header::AUTHORIZATION,
                        HeaderValue::from_static("Bearer invalid_token"),
                    )
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_auth_middleware_valid_token() {
        std::env::set_var("JWT_SECRET", "test_secret_key");

        let user = shared::models::User {
            id: uuid::Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap(),
            username: "1001".to_string(),
            email: "admin@example.com".to_string(),
            password_hash: String::new(),
            role: "root".to_string(),
            school_id: 1,
            campus_id: Some(1),
        };

        let jwt_service = crate::auth::JwtService::new("test_secret_key");
        let token = jwt_service.generate_access_token(&user).unwrap();

        let app = create_test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/protected")
                    .header(
                        header::AUTHORIZATION,
                        HeaderValue::from_str(&format!("Bearer {}", token)).unwrap(),
                    )
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }
}
```

5. Update `/Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/mod.rs` to include the updated auth module:

Keep as-is -- `pub mod auth;` is already present.

6. Run `cargo build --workspace` and fix any compilation errors. The `AuthExtractor` re-export via `pub use api_infra::middleware::auth::AuthExtractor;` means all existing `use crate::middleware::auth::AuthExtractor;` imports throughout the api crate continue to work without changes.

7. Run `cargo test --workspace` to verify all tests pass.
</action>

<acceptance_criteria>
- `grep "pub struct AuthExtractor" api-infra/src/middleware/auth.rs` returns a match
- `grep "pub mod auth" api-infra/src/middleware/mod.rs` returns a match
- `grep "pub use api_infra::middleware::auth::AuthExtractor" api/src/middleware/auth.rs` returns a match
- `grep "pub async fn auth_middleware" api/src/middleware/auth.rs` returns a match
- `cargo build --workspace` exits 0
- `cargo test --workspace` exits 0
</acceptance_criteria>

### Task T2-08: Extract domain-problems crate

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/Cargo.toml (workspace root -- add new member)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/Cargo.toml (add domain-problems dependency)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/problems/mod.rs (source -- router definition)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/problems/models.rs (source -- data types)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/problems/routes.rs (source -- route handlers)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/problems/test_cases.rs (source -- test case handlers)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/problems/access.rs (source -- access control logic with tests)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/problems/problem_access.rs (source -- thin wrappers)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/state.rs (AppState definition -- domain crate will use this)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/middleware/auth.rs (AuthExtractor -- domain crate will use this)
</read_first>

<action>
1. Add `"domain-problems"` to the workspace members list in `/Users/xiexingyu/Documents/项目/Online_Judge/Cargo.toml`:

```toml
members = ["api", "api-infra", "domain-problems", "judge-worker", "shared"]
```

2. Create the `domain-problems` directory structure:
```bash
mkdir -p domain-problems/src
```

3. Create `/Users/xiexingyu/Documents/项目/Online_Judge/domain-problems/Cargo.toml`:

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
```

4. Create `/Users/xiexingyu/Documents/项目/Online_Judge/domain-problems/src/lib.rs`:

```rust
pub mod access;
pub mod models;
pub mod problem_access;
pub mod routes;
pub mod test_cases;

use api_infra::state::AppState;
use axum::{
    routing::{delete, get, post, put},
    Router,
};

pub fn problems_router() -> Router<AppState> {
    Router::new()
        .route("/languages", get(routes::get_supported_languages))
        .route("/languages", put(routes::update_supported_languages))
        .route("/", get(routes::list_problems))
        .route("/", post(routes::create_problem))
        .route("/:id", get(routes::get_problem))
        .route("/:id", put(routes::update_problem))
        .route("/:id", delete(routes::delete_problem))
        .route("/:id/statistics", get(routes::get_problem_statistics))
        .route("/:id/test-cases", get(test_cases::list_test_cases))
        .route("/:id/test-cases", post(test_cases::create_test_case))
        .route(
            "/:id/test-cases/import",
            post(test_cases::batch_import_test_cases),
        )
        .route(
            "/:id/test-cases/:test_case_id",
            put(test_cases::update_test_case),
        )
        .route(
            "/:id/test-cases/:test_case_id",
            delete(test_cases::delete_test_case),
        )
}
```

5. Create `/Users/xiexingyu/Documents/项目/Online_Judge/domain-problems/src/models.rs` -- copy the EXACT content from `api/src/problems/models.rs` with NO changes to the data structures. The file has no `use crate::` imports so no path changes are needed.

6. Create `/Users/xiexingyu/Documents/项目/Online_Judge/domain-problems/src/routes.rs` -- copy from `api/src/problems/routes.rs` and update imports:

Change:
```rust
use crate::middleware::auth::AuthExtractor;
use crate::AppState;
```
To:
```rust
use api_infra::middleware::auth::AuthExtractor;
use api_infra::state::AppState;
```

Keep all other code identical.

7. Create `/Users/xiexingyu/Documents/项目/Online_Judge/domain-problems/src/test_cases.rs` -- copy from `api/src/problems/test_cases.rs` and update imports:

Change:
```rust
use crate::middleware::auth::AuthExtractor;
use crate::AppState;
```
To:
```rust
use api_infra::middleware::auth::AuthExtractor;
use api_infra::state::AppState;
```

Keep all other code identical.

8. Create `/Users/xiexingyu/Documents/项目/Online_Judge/domain-problems/src/access.rs` -- copy from `api/src/problems/access.rs` and update imports:

Change:
```rust
use crate::AppState;
```
To:
```rust
use api_infra::state::AppState;
```

Keep `use shared::models::{Claims, role::Role};` as-is (shared crate path is the same).
Keep `use super::models::ListProblemsQuery;` as-is (internal module reference).
Keep ALL tests identical.

9. Create `/Users/xiexingyu/Documents/项目/Online_Judge/domain-problems/src/problem_access.rs` -- copy from `api/src/problems/problem_access.rs` and update imports:

Change:
```rust
use crate::middleware::auth::AuthExtractor;
```
To:
```rust
use api_infra::middleware::auth::AuthExtractor;
```

Change:
```rust
pub async fn load_problem_access(
    state: &crate::AppState,
    problem_id: i64,
) -> Result<ProblemAccessRecord, StatusCode> {
```
To:
```rust
pub async fn load_problem_access(
    state: &api_infra::state::AppState,
    problem_id: i64,
) -> Result<ProblemAccessRecord, StatusCode> {
```

Keep all other code identical.

10. Add `domain-problems = { path = "../domain-problems" }` to `/Users/xiexingyu/Documents/项目/Online_Judge/api/Cargo.toml` `[dependencies]`.

11. Update `/Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs` router assembly. Change:
```rust
.nest("/problems", problems::problems_router())
```
To:
```rust
.nest("/problems", domain_problems::problems_router())
```

12. Remove `mod problems;` from BOTH `/Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs` AND `/Users/xiexingyu/Documents/项目/Online_Judge/api/src/lib.rs`.

13. Verify: `cargo build -p domain-problems` must succeed independently.
14. Verify: `cargo build --workspace` must succeed.
15. Verify: `cargo test -p domain-problems` must pass the access control tests.
</action>

<acceptance_criteria>
- `test -d domain-problems/src` returns 0
- `test -f domain-problems/Cargo.toml` returns 0
- `test -f domain-problems/src/lib.rs` returns 0
- `test -f domain-problems/src/models.rs` returns 0
- `test -f domain-problems/src/routes.rs` returns 0
- `test -f domain-problems/src/test_cases.rs` returns 0
- `test -f domain-problems/src/access.rs` returns 0
- `test -f domain-problems/src/problem_access.rs` returns 0
- `grep "domain-problems" Cargo.toml` returns a match (workspace member)
- `grep "domain-problems" api/Cargo.toml` returns a match (api dependency)
- `grep "domain_problems::problems_router" api/src/main.rs` returns a match
- `grep "mod problems" api/src/lib.rs` returns NO match (removed)
- `grep "mod problems" api/src/main.rs` returns NO match (removed)
- `cargo build -p domain-problems` exits 0
- `cargo build --workspace` exits 0
- `cargo test -p domain-problems` exits 0 (access tests pass)
</acceptance_criteria>

### Task T2-09: Extract domain-users crate

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/Cargo.toml (workspace root -- add domain-users member)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/Cargo.toml (add domain-users dependency)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/users/mod.rs (source -- re-exports)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/users/models.rs (source -- data types)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/users/routes.rs (source -- route handlers)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/users/service.rs (source -- business logic)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/auth/routes.rs (imports from users -- must update after extraction)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/state.rs (AppState with Arc<dyn TokenService>)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/token_service.rs (TokenService trait)
</read_first>

<action>
1. Add `"domain-users"` to the workspace members list in `/Users/xiexingyu/Documents/项目/Online_Judge/Cargo.toml`:

```toml
members = ["api", "api-infra", "domain-problems", "domain-users", "judge-worker", "shared"]
```

2. Create the `domain-users` directory structure:
```bash
mkdir -p domain-users/src
```

3. Create `/Users/xiexingyu/Documents/项目/Online_Judge/domain-users/Cargo.toml`:

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
```

4. Create `/Users/xiexingyu/Documents/项目/Online_Judge/domain-users/src/lib.rs`:

```rust
pub mod models;
pub mod routes;
pub mod service;

pub use routes::user_router;
```

5. Create `/Users/xiexingyu/Documents/项目/Online_Judge/domain-users/src/models.rs` -- copy the EXACT content from `api/src/users/models.rs` with NO changes. The file has no `use crate::` imports.

6. Create `/Users/xiexingyu/Documents/项目/Online_Judge/domain-users/src/service.rs` -- copy from `api/src/users/service.rs` and update imports:

Change:
```rust
use crate::auth::JwtService;
```
To:
```rust
use api_infra::traits::token_service::TokenService;
use std::sync::Arc;
```

Change the struct definition from:
```rust
pub struct UserService {
    pool: PgPool,
    jwt_service: JwtService,
}
```
To:
```rust
pub struct UserService {
    pool: PgPool,
    jwt_service: Arc<dyn TokenService>,
}
```

Change the `new` method from:
```rust
pub fn new(pool: PgPool, jwt_service: JwtService) -> Self {
    Self { pool, jwt_service }
}
```
To:
```rust
pub fn new(pool: PgPool, jwt_service: Arc<dyn TokenService>) -> Self {
    Self { pool, jwt_service }
}
```

All method calls like `self.jwt_service.generate_access_token()` and `self.jwt_service.validate_token()` work unchanged because `Arc<dyn TokenService>` dispatches to the trait methods. Keep ALL other code identical.

7. Create `/Users/xiexingyu/Documents/项目/Online_Judge/domain-users/src/routes.rs` -- copy from `api/src/users/routes.rs` and update imports:

Change:
```rust
use crate::error::AppError;
use crate::middleware::auth::AuthExtractor;
use crate::AppState;
```
To:
```rust
use api_infra::error::AppError;
use api_infra::middleware::auth::AuthExtractor;
use api_infra::state::AppState;
```

Keep all other code identical, including the `ensure_admin` helper and all handler functions.

8. Add `domain-users = { path = "../domain-users" }` to `/Users/xiexingyu/Documents/项目/Online_Judge/api/Cargo.toml` `[dependencies]`.

9. Update `/Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs` router assembly. Change:
```rust
.nest("/users", users::user_router())
```
To:
```rust
.nest("/users", domain_users::user_router())
```

10. Remove `mod users;` from BOTH `/Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs` AND `/Users/xiexingyu/Documents/项目/Online_Judge/api/src/lib.rs`.

11. Update `/Users/xiexingyu/Documents/项目/Online_Judge/api/src/auth/routes.rs` to import from domain-users instead of the local users module:

Change:
```rust
use crate::users::{
    models::{LoginRequest as DbLoginRequest, RefreshTokenRequest, RegisterRequest},
    service::UserService,
};
```
To:
```rust
use domain_users::{
    models::{LoginRequest as DbLoginRequest, RefreshTokenRequest, RegisterRequest},
    service::UserService,
};
```

Also update the register function's return type. Change:
```rust
Json<crate::users::models::AuthResponse>,
```
To:
```rust
Json<domain_users::models::AuthResponse>,
```

Also update `UserService::new` calls in auth/routes.rs. Since `state.jwt_service` is now `Arc<dyn TokenService>`, and `UserService::new` now accepts `Arc<dyn TokenService>`, the calls:
```rust
UserService::new(state.db_pool.clone(), state.jwt_service.clone())
```
work directly. `Arc::clone()` on `Arc<dyn TokenService>` gives another `Arc<dyn TokenService>` pointing to the same service.

12. Update the test in `api/src/auth/routes.rs`. The `create_test_app()` function constructs AppState directly. Update the `jwt_service` field from:
```rust
jwt_service,
```
To:
```rust
jwt_service: std::sync::Arc::new(jwt_service),
```

And similarly for the `test_logout_returns_ok` test.

13. Verify: `cargo build -p domain-users` must succeed independently.
14. Verify: `cargo build --workspace` must succeed.
15. Verify: `cargo test --workspace` must pass all tests.
</action>

<acceptance_criteria>
- `test -d domain-users/src` returns 0
- `test -f domain-users/Cargo.toml` returns 0
- `test -f domain-users/src/lib.rs` returns 0
- `test -f domain-users/src/models.rs` returns 0
- `test -f domain-users/src/routes.rs` returns 0
- `test -f domain-users/src/service.rs` returns 0
- `grep "domain-users" Cargo.toml` returns a match (workspace member)
- `grep "domain-users" api/Cargo.toml` returns a match (api dependency)
- `grep "domain_users::user_router" api/src/main.rs` returns a match
- `grep "mod users" api/src/lib.rs` returns NO match (removed)
- `grep "mod users" api/src/main.rs` returns NO match (removed)
- `grep "use domain_users::" api/src/auth/routes.rs` returns a match
- `grep "Arc<dyn TokenService>" domain-users/src/service.rs` returns a match
- `cargo build -p domain-users` exits 0
- `cargo build --workspace` exits 0
- `cargo test --workspace` exits 0
</acceptance_criteria>

## Verification

<verify>
```bash
# 1. Both domain crates compile independently
cargo build -p domain-users
cargo build -p domain-problems

# 2. Full workspace compiles
cargo build --workspace

# 3. All tests pass
cargo test --workspace

# 4. No circular dependencies
cargo tree -p domain-users 2>&1 | grep "api " | grep -v "api-infra" | wc -l  # should be 0
cargo tree -p domain-problems 2>&1 | grep "api " | grep -v "api-infra" | wc -l  # should be 0

# 5. AppState lives in api-infra
grep "pub struct AppState" api-infra/src/state.rs

# 6. AuthExtractor lives in api-infra
grep "pub struct AuthExtractor" api-infra/src/middleware/auth.rs

# 7. TokenService trait defined
grep "trait TokenService" api-infra/src/traits/token_service.rs

# 8. Main.rs mounts domain routers
grep "domain_problems::problems_router" api/src/main.rs
grep "domain_users::user_router" api/src/main.rs

# 9. Old mod declarations removed from api
grep "mod users" api/src/lib.rs api/src/main.rs  # should find nothing
grep "mod problems" api/src/lib.rs api/src/main.rs  # should find nothing
```
</verify>
