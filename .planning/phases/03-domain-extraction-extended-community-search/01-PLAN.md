---
wave: 1
depends_on: []
files_modified:
  - Cargo.toml
  - domain-community/Cargo.toml
  - domain-community/src/lib.rs
  - domain-community/src/discussions/mod.rs
  - domain-community/src/discussions/models.rs
  - domain-community/src/discussions/routes.rs
  - domain-community/src/discussions/service.rs
  - domain-community/src/blog/mod.rs
  - domain-community/src/blog/models.rs
  - domain-community/src/blog/routes.rs
  - domain-community/src/blog/service.rs
  - domain-community/src/messages.rs
autonomous: true
requirements:
  - ARCH-04
---

# Plan 01: Create domain-community Crate

<objective>
Extract discussions, blog, and messages modules from the api crate into a single `domain-community` workspace crate with sub-modules. The crate must compile independently with `cargo build -p domain-community`.
</objective>

<threat_model>
- **LOW**: Pure code extraction — no behavioral changes, no security boundary changes. All auth/tenant checks remain in place within the moved code.
</threat_model>

<must_haves>
- [ ] `cargo build -p domain-community` succeeds independently
- [ ] Discussions routes, service, and models are in `domain-community/src/discussions/`
- [ ] Blog routes, service, and models are in `domain-community/src/blog/`
- [ ] Messages module is a flat file at `domain-community/src/messages.rs`
- [ ] All `crate::AppState` imports changed to `api_infra::state::AppState`
- [ ] All `crate::websocket::message::WebSocketMessage` imports changed to `api_infra::websocket::message::WebSocketMessage`
- [ ] Router functions exported: `discussions_router()`, `blog_router()`, `messages_router()`
- [ ] No imports from the `api` crate (no circular dependency)
</must_haves>

## Tasks

### Task T01-01: Create domain-community crate skeleton

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/Cargo.toml (workspace members list)
- /Users/xiexingyu/Documents/项目/Online_Judge/domain-users/Cargo.toml (reference for dependency format)
- /Users/xiexingyu/Documents/项目/Online_Judge/domain-users/src/lib.rs (reference for lib.rs structure)
</read_first>

<action>
1. Add `"domain-community"` to the workspace `members` array in root `Cargo.toml` (follow existing entries for domain-users, domain-problems).

2. Create `domain-community/Cargo.toml` with these exact contents:

```toml
[package]
name = "domain-community"
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

3. Create `domain-community/src/lib.rs` with these exact contents:

```rust
pub mod blog;
pub mod discussions;
pub mod messages;

pub use blog::routes::blog_router;
pub use discussions::routes::discussions_router;
pub use messages::messages_router;
```
</action>

<acceptance_criteria>
- Root `Cargo.toml` contains `"domain-community"` in the workspace members array
- `domain-community/Cargo.toml` exists with package name `domain-community`, depends on `api-infra` and `shared`
- `domain-community/src/lib.rs` exists with `pub mod blog; pub mod discussions; pub mod messages;` and re-exports of router functions
</acceptance_criteria>

---

### Task T01-02: Extract discussions module

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/discussions/mod.rs
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/discussions/models.rs
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/discussions/routes.rs
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/discussions/service.rs
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/lib.rs (check mod declarations)
</read_first>

<action>
1. Create directory `domain-community/src/discussions/`.

2. Create `domain-community/src/discussions/mod.rs`:
```rust
pub mod models;
pub mod routes;
pub mod service;

use api_infra::state::AppState;

pub fn discussions_router() -> Router<AppState> {
    Router::new()
        .route("/", get(routes::list_discussions))
        .route("/", post(routes::create_discussion))
        .route("/:id", get(routes::get_discussion))
        .route("/:id", delete(routes::delete_discussion))
        .route("/:id/replies", post(routes::create_reply))
}
```
Note: Read the actual `api/src/discussions/routes.rs` to get the exact route definitions and HTTP methods. The above is illustrative — copy the actual route structure.

3. Copy `api/src/discussions/models.rs` to `domain-community/src/discussions/models.rs` unchanged.

4. Copy `api/src/discussions/service.rs` to `domain-community/src/discussions/service.rs`. Update imports:
   - `use crate::discussions::models::*;` → `use super::models::*;`

5. Copy `api/src/discussions/routes.rs` to `domain-community/src/discussions/routes.rs`. Update imports:
   - `use crate::discussions::{models::*, service::DiscussionService};` → `use super::{models::*, service::DiscussionService};`
   - `use crate::websocket::message::WebSocketMessage;` → `use api_infra::websocket::message::WebSocketMessage;`
   - `use crate::AppState;` → `use api_infra::state::AppState;`

6. Check if `mod.rs` uses `axum::routing::*` — if so, add the necessary `use axum::{extract::*, routing::*, Router, Json, ...}` imports at the top of `mod.rs`. Read the original routes.rs to see which axum types are used.
</action>

<acceptance_criteria>
- `domain-community/src/discussions/mod.rs` exists and declares `pub mod models; pub mod routes; pub mod service;` and a `discussions_router()` function
- `domain-community/src/discussions/models.rs` exists
- `domain-community/src/discussions/service.rs` contains `use super::models::*;` (no `crate::discussions` references)
- `domain-community/src/discussions/routes.rs` contains `use api_infra::state::AppState;` and `use api_infra::websocket::message::WebSocketMessage;` (no `crate::` references)
- `domain-community/src/discussions/routes.rs` contains NO occurrences of `crate::`
</acceptance_criteria>

---

### Task T01-03: Extract blog module

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/blog/mod.rs
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/blog/models.rs
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/blog/routes.rs
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/blog/service.rs
</read_first>

<action>
1. Create directory `domain-community/src/blog/`.

2. Create `domain-community/src/blog/mod.rs`:
```rust
pub mod models;
pub mod routes;
pub mod service;

use api_infra::state::AppState;
// Add axum routing imports as needed (read original routes.rs for exact methods)
```
Note: Read `api/src/blog/routes.rs` to determine the exact route definitions. The router function must match the original `blog_router()` signature and routes.

3. Copy `api/src/blog/models.rs` to `domain-community/src/blog/models.rs` unchanged.

4. Copy `api/src/blog/service.rs` to `domain-community/src/blog/service.rs`. Update imports:
   - `use crate::blog::models::*;` → `use super::models::*;`

5. Copy `api/src/blog/routes.rs` to `domain-community/src/blog/routes.rs`. Update imports:
   - `use crate::blog::{models::*, service::BlogService};` → `use super::{models::*, service::BlogService};`
   - `use crate::websocket::message::WebSocketMessage;` → `use api_infra::websocket::message::WebSocketMessage;`
   - `use crate::AppState;` → `use api_infra::state::AppState;`
</action>

<acceptance_criteria>
- `domain-community/src/blog/mod.rs` exists and declares `pub mod models; pub mod routes; pub mod service;` and a `blog_router()` function
- `domain-community/src/blog/models.rs` exists
- `domain-community/src/blog/service.rs` contains `use super::models::*;` (no `crate::blog` references)
- `domain-community/src/blog/routes.rs` contains `use api_infra::state::AppState;` and `use api_infra::websocket::message::WebSocketMessage;` (no `crate::` references)
- `domain-community/src/blog/routes.rs` contains NO occurrences of `crate::`
</acceptance_criteria>

---

### Task T01-04: Extract messages module (flat file)

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/messages/routes.rs (full file — 234 lines)
</read_first>

<action>
1. Copy `api/src/messages/routes.rs` to `domain-community/src/messages.rs`.

2. Update imports in `domain-community/src/messages.rs`:
   - `use crate::middleware::auth::AuthExtractor;` → `use api_infra::middleware::auth::AuthExtractor;`
   - `use crate::AppState;` → `use api_infra::state::AppState;`

3. The file already has a `pub fn messages_router() -> Router<AppState>` function with the correct signature. No other changes needed.

4. Verify that the `mod.rs` in lib.rs references `pub mod messages;` (flat module, not sub-directory).
</action>

<acceptance_criteria>
- `domain-community/src/messages.rs` exists
- `domain-community/src/messages.rs` contains `use api_infra::middleware::auth::AuthExtractor;`
- `domain-community/src/messages.rs` contains `use api_infra::state::AppState;`
- `domain-community/src/messages.rs` contains NO occurrences of `crate::`
- `domain-community/src/messages.rs` contains `pub fn messages_router()`
</acceptance_criteria>

---

### Task T01-05: Verify domain-community builds independently

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/domain-community/Cargo.toml
- /Users/xiexingyu/Documents/项目/Online_Judge/domain-community/src/lib.rs
</read_first>

<action>
1. Run `cargo build -p domain-community` to verify the crate compiles independently.

2. If build fails due to missing imports or types:
   - Check each file for remaining `crate::` references and convert them to `api_infra::` or `super::` as appropriate
   - Check that all axum/sqlx/serde types are imported correctly
   - Check that `mod.rs` files correctly wire the routing

3. Run `cargo clippy -p domain-community -- -D warnings` to catch any issues.
</action>

<acceptance_criteria>
- `cargo build -p domain-community` exits with code 0
- `cargo clippy -p domain-community -- -D warnings` exits with code 0
- `cargo build -p domain-community` output does NOT contain "error"
</acceptance_criteria>

<verification>
```bash
cargo build -p domain-community
cargo clippy -p domain-community -- -D warnings
```
Both must succeed.
</verification>
