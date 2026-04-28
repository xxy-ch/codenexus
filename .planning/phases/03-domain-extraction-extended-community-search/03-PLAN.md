---
wave: 2
depends_on: [01-PLAN, 02-PLAN]
files_modified:
  - api/Cargo.toml
  - api/src/main.rs
  - api/src/lib.rs
  - api/src/websocket/handler.rs
  - api/src/discussions/mod.rs
  - api/src/discussions/models.rs
  - api/src/discussions/routes.rs
  - api/src/discussions/service.rs
  - api/src/blog/mod.rs
  - api/src/blog/models.rs
  - api/src/blog/routes.rs
  - api/src/blog/service.rs
  - api/src/messages/routes.rs
  - api/src/search/routes.rs
  - api/src/search/service.rs
autonomous: true
requirements:
  - ARCH-04
  - ARCH-05
---

# Plan 03: API Integration + WebSocket IP Fix

<objective>
Wire the new `domain-community` and `domain-search` crates into the api binary. Remove the old community and search modules from the api crate. Fix the Phase 2 WebSocket IP regression. Verify the full workspace builds without circular dependencies.
</objective>

<threat_model>
- **MEDIUM**: WebSocket handler fix changes connection tracking behavior. The fix extracts real client IP instead of hardcoding 127.0.0.1. Must verify that IP extraction works behind reverse proxies (Docker/Nginx) by checking X-Forwarded-For / X-Real-IP headers.
- **LOW**: Module removal and router mounting are mechanical changes that preserve existing route paths and middleware.
</threat_model>

<must_haves>
- [ ] `cargo build --workspace` succeeds
- [ ] `cargo build -p api` succeeds
- [ ] `cargo check --workspace` produces no circular dependency warnings
- [ ] `cargo clippy --all-targets -- -D warnings` passes
- [ ] `cargo fmt --check --all` passes
- [ ] Routes mounted at same paths: `/discussions`, `/blog`, `/search`, `/messages`
- [ ] Old modules (`api/src/discussions/`, `api/src/blog/`, `api/src/messages/`, `api/src/search/`) removed from api crate
- [ ] WebSocket handler uses real client IP (not hardcoded 127.0.0.1)
- [ ] `cargo build -p domain-community -p domain-search` still succeeds independently
</must_haves>

## Tasks

### Task T03-01: Add domain crate dependencies to api

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/Cargo.toml (current dependencies)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs (current module declarations and router assembly)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/lib.rs (current module re-exports)
</read_first>

<action>
1. In `api/Cargo.toml`, add these two dependencies in the `[dependencies]` section:
   ```toml
   domain-community = { path = "../domain-community" }
   domain-search = { path = "../domain-search" }
   ```
   Place them next to the existing `domain-users` and `domain-problems` entries.

2. In `api/src/main.rs`, update the module declarations:
   - Remove: `mod blog;`, `mod discussions;`, `mod messages;`, `mod search;`
   - These are replaced by the external crate imports

3. In `api/src/main.rs`, update the router assembly in `create_router()`:
   - Change `.nest("/discussions", discussions::discussions_router())` to `.nest("/discussions", domain_community::discussions_router())`
   - Change `.nest("/blog", blog::blog_router())` to `.nest("/blog", domain_community::blog_router())`
   - Change `.nest("/messages", messages::messages_router())` to `.nest("/messages", domain_community::messages_router())`
   - Change the search nesting from:
     ```rust
     .nest(
         "/search",
         search::create_search_router(state.db_pool.clone(), state.redis_url.clone()),
     )
     ```
     to:
     ```rust
     .nest("/search", domain_search::search_router())
     ```

4. If `api/src/lib.rs` re-exports any of these modules (`pub mod blog;`, `pub mod discussions;`, etc.), remove those declarations.
</action>

<acceptance_criteria>
- `api/Cargo.toml` contains `domain-community = { path = "../domain-community" }`
- `api/Cargo.toml` contains `domain-search = { path = "../domain-search" }`
- `api/src/main.rs` does NOT contain `mod blog;` or `mod discussions;` or `mod messages;` or `mod search;` (for these specific modules)
- `api/src/main.rs` contains `domain_community::discussions_router()`
- `api/src/main.rs` contains `domain_community::blog_router()`
- `api/src/main.rs` contains `domain_community::messages_router()`
- `api/src/main.rs` contains `domain_search::search_router()`
- `api/src/main.rs` does NOT contain `create_search_router`
</acceptance_criteria>

---

### Task T03-02: Remove old community and search modules from api crate

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/lib.rs (verify module declarations to remove)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs (verify no remaining references)
</read_first>

<action>
1. Delete the following directories and files from the api crate (the code now lives in domain-community and domain-search):
   - `api/src/discussions/` (entire directory: mod.rs, models.rs, routes.rs, service.rs)
   - `api/src/blog/` (entire directory: mod.rs, models.rs, routes.rs, service.rs)
   - `api/src/messages/` (entire directory: routes.rs)
   - `api/src/search/` (entire directory: routes.rs, service.rs)

2. Verify `api/src/lib.rs` has no `pub mod discussions;`, `pub mod blog;`, `pub mod messages;`, or `pub mod search;` declarations remaining.

3. Verify `api/src/main.rs` has no remaining references to the old module paths (`discussions::`, `blog::`, `messages::`, `search::`).
</action>

<acceptance_criteria>
- Directory `api/src/discussions/` does NOT exist
- Directory `api/src/blog/` does NOT exist
- Directory `api/src/messages/` does NOT exist
- Directory `api/src/search/` does NOT exist
- `api/src/lib.rs` does NOT contain `pub mod discussions;` or `pub mod blog;` or `pub mod messages;` or `pub mod search;`
- `grep -r "discussions::\|blog::\|messages::\|search::" api/src/main.rs` returns no matches
</acceptance_criteria>

---

### Task T03-03: Fix WebSocket IP regression (Phase 2 gap)

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/websocket/handler.rs (full file — find where 127.0.0.1 is hardcoded)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/websocket/server.rs (understand add_client signature and MAX_CONNECTIONS_PER_IP)
</read_first>

<action>
1. In `api/src/websocket/handler.rs`, find the call to `add_client` that passes `"127.0.0.1"` as the IP address.

2. Replace the hardcoded `"127.0.0.1"` with extraction of the real client IP from the request. The extraction should:
   - First check `X-Forwarded-For` header (for Docker/Nginx reverse proxy scenarios)
   - Fall back to `X-Real-IP` header
   - Fall back to the connection's direct peer address

   Example pattern:
   ```rust
   let client_ip = headers
       .get("x-forwarded-for")
       .and_then(|v| v.to_str().ok())
       .and_then(|v| v.split(',').next())
       .map(|s| s.trim().to_string())
       .or_else(|| {
           headers.get("x-real-ip")
               .and_then(|v| v.to_str().ok())
               .map(|s| s.to_string())
       })
       .unwrap_or_else(|| "127.0.0.1".to_string());
   ```

3. Pass `client_ip` (as `&str` or `String`) to the `add_client` call instead of the hardcoded value.

4. The exact variable name and type depend on the `add_client` signature in `api-infra/src/websocket/server.rs`. Read that file to confirm the parameter type and adjust accordingly.
</action>

<acceptance_criteria>
- `api/src/websocket/handler.rs` does NOT contain the string `"127.0.0.1"` in any context related to `add_client`
- `api/src/websocket/handler.rs` reads `x-forwarded-for` or `x-real-ip` header
- `api/src/websocket/handler.rs` passes a dynamically extracted IP to `add_client`
</acceptance_criteria>

---

### Task T03-04: Full workspace verification

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/Cargo.toml (verify all workspace members)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs (verify router assembly)
</read_first>

<action>
1. Run the complete verification sequence:

```bash
# Independent domain crate compilation
cargo build -p domain-community
cargo build -p domain-search

# Full workspace build
cargo build --workspace

# API crate specifically (assembles all routers)
cargo build -p api

# Clippy with deny warnings
cargo clippy --all-targets -- -D warnings

# Format check
cargo fmt --check --all
```

2. If any build fails, check for:
   - Missing imports in domain crates (remaining `crate::` references)
   - Missing trait implementations or type mismatches
   - Circular dependency errors (domain crate depending on api)
   - Clippy warnings (unused imports after module removal)

3. After all checks pass, verify route mounting:
   ```bash
   grep -n "domain_community\|domain_search" api/src/main.rs
   ```
   This should show the four route mounts (discussions, blog, messages, search).
</action>

<acceptance_criteria>
- `cargo build --workspace` exits with code 0
- `cargo build -p domain-community -p domain-search` exits with code 0
- `cargo clippy --all-targets -- -D warnings` exits with code 0
- `cargo fmt --check --all` exits with code 0
- `cargo check --workspace` output does NOT contain "circular" or "cycle"
- `grep "domain_community\|domain_search" api/src/main.rs` shows 4 route mounts
</acceptance_criteria>

<verification>
```bash
cargo build -p domain-community -p domain-search
cargo build --workspace
cargo clippy --all-targets -- -D warnings
cargo fmt --check --all
```
All must succeed.
</verification>
