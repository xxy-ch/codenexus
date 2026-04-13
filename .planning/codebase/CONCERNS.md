# Codebase Technical Concerns

**Date**: 2026-04-12
**Scope**: Full repository scan -- api, judge-worker, frontend
**Status**: Authoritative inventory of known risks

---

## 1. Dead Code

### 1.1 Entire Module: `api/src/rbac/` (unused RBAC service)

The `RbacService` struct and its `impl` block are annotated `#[allow(dead_code)]` at the module level. The entire module provides an in-memory role-permission matrix that is **never referenced** by any other module. Authorization is handled via inline claims checks in middleware and route handlers instead.

- `api/src/rbac/mod.rs:9` -- `#[allow(dead_code)] pub struct RbacService;`
- `api/src/rbac/mod.rs:12` -- `#[allow(dead_code)] impl RbacService { ... }`

**Risk**: Low. No production impact, but the module adds confusion about where authorization logic lives.

### 1.2 Entire Module: `api/src/redis/` (13 dead_code annotations)

All public types and traits in the Redis module are dead-code-gated. The pool creation function `create_pool` is used by `main.rs`, but the caching trait `RedisCacheOps`, streaming trait `RedisStreamOps`, and associated type aliases are unused.

Files: `api/src/redis/mod.rs:4,7,25,51,98,113,127,141,155,184,209`

**Risk**: Medium. If caching/streaming was intended for performance, its absence may indicate missing performance optimizations.

### 1.3 Middleware blanket allows

- `api/src/middleware/auth.rs:1` -- `#![allow(unused_imports, dead_code)]` (entire file)
- `api/src/middleware/tenant.rs:1` -- `#![allow(unused_imports)]` (entire file)

**Risk**: Low. These are likely residual from the security audit waves. Should be cleaned before release.

### 1.4 Unused WebSocket topics

Per `shared/policy-matrix.md` section 6, community realtime WebSocket features are **downgraded**. Frontend hooks for discussion/article/trending are compatibility shims only. The backend WebSocket server still registers these topics but they are not consumed.

**Risk**: Low. No security exposure, but dead code paths in WebSocket handler could confuse future maintainers.

---

## 2. Unused Imports

Files with blanket `#![allow(unused_imports)]`:

| File | Annotation |
|------|-----------|
| `api/src/middleware/auth.rs:1` | `#![allow(unused_imports, dead_code)]` |
| `api/src/middleware/tenant.rs:1` | `#![allow(unused_imports)]` |

No per-item unused import suppressions were found. The blanket allows should be removed and individual unused imports cleaned.

---

## 3. Test Gaps

### 3.1 Docker-dependent release gate tests (2 of 3 ignored)

| Test | File | Status | Dependency |
|------|------|--------|------------|
| `class_and_assignment_authorization_assignment_read_is_member_scoped` | `api/src/release_gate_tests.rs:210` | **IGNORED** | Docker-backed Postgres (testcontainers) |
| `community_message_search_scope_filters_private_and_cross_tenant_content` | `api/src/release_gate_tests.rs:347` | **IGNORED** | Docker-backed Postgres (testcontainers) |
| `contest_and_leaderboard_scope_student_writes_and_cross_tenant_views_are_blocked` | `api/src/release_gate_tests.rs:263` | PASSES | No Docker needed (uses lazy pool) |

**Risk**: High. The P4 (assignment authz) and P6 (search scope) release gates cannot run without Docker. These are the exact tests that verify cross-tenant isolation.

### 3.2 Database-dependent integration tests (4 ignored)

| File | Test | Reason |
|------|------|--------|
| `api/src/db/mod.rs:80` | `test_create_pool` | Requires running Postgres |
| `api/src/db/schema.rs:13` | Migration test | Requires running Postgres |
| `api/src/auth/routes.rs:240,262,300,320` | 4 auth integration tests | Require running Postgres |
| `api/src/redis/mod.rs:255` | Redis integration test | Requires running Redis |

### 3.3 No `api/tests/` directory

The `api/Cargo.toml` sets `autotests = false`. Release gate tests live in `api/src/release_gate_tests.rs` instead of the conventional `api/tests/` directory. The P7 plan references `api/tests/role_matrix_release_gate.rs` which does not exist.

### 3.4 Redis-dependent worker tests

`judge-worker/src/queue/consumer.rs` contains integration tests that require a running Redis instance (lines 100-118). These have no `#[ignore]` annotation but will fail without Redis.

### 3.5 Playwright smoke requires external dev server

`frontend/playwright.config.ts` has no `webServer` configuration. The comment says "configured by CI workflow" but there is no CI workflow file (`.github/workflows/` only contains a `prompts/` directory, no YAML). Tests cannot run without manually starting the Vite dev server.

### 3.6 No unit test files visible

No `*_test.rs` or `tests/` directory was found for `judge-worker`. Tests are inline `#[cfg(test)]` blocks within source files only.

---

## 4. Security Concerns

### 4.1 Cross-tenant leaderboard endpoints (documented, not fixed)

Per `shared/policy-matrix.md`:

- `GET /leaderboard/global` -- authenticated but **cross-tenant** (exposes all schools' data)
- `GET /leaderboard/problem/:id` -- authenticated but **cross-tenant** (exposes all schools' fastest solvers)

The policy matrix acknowledges these as current implementation gaps. The UI only consumes username/rank/score, but the API response includes user IDs and other fields.

**Risk**: Medium. Data exposure across tenants for these two endpoints.

### 4.2 Hardcoded default secrets

| Secret | Location | Default |
|--------|----------|---------|
| `JWT_SECRET` | `api/src/main.rs:67` | `"default_jwt_secret_change_me"` |
| `WORKER_SECRET` | `api/src/main.rs:69` | `"default_worker_secret_change_me"` |

Both use `unwrap_or_else` with insecure defaults. If the environment variables are not set, the server starts with publicly known secrets.

**Risk**: High. A deployment without proper env configuration is immediately compromised.

### 4.3 CORS allows any origin

`api/src/main.rs:117` -- `.allow_origin(Any)` allows requests from any origin. No allowed-origin whitelist is configured.

**Risk**: Medium. Acceptable for development but must be restricted for production.

### 4.4 Rate limit applies to internal worker endpoints

The governor config at `api/src/main.rs:129-132` applies 30 req/min to ALL routes including the worker callback endpoint `POST /submissions/:id/results`. The policy matrix specifies a separate rate limit for internal endpoints, but the implementation shares one global governor.

**Risk**: Low. The burst size of 30 is likely sufficient, but a burst of submissions could throttle legitimate worker callbacks.

### 4.5 No `.env` at repository root

No `.env.example` exists at the repository root. The only `.env.example` is in `frontend/`. Backend operators must discover required environment variables by reading `main.rs` source.

---

## 5. Performance Concerns

### 5.1 Large frontend bundle chunks

The Vite config (`frontend/vite.config.ts`) defines manual chunks but does not set size limits. Known large dependencies:

| Chunk | Expected Size | Concern |
|-------|--------------|---------|
| `editor-core` (Monaco Editor) | ~4.2 MB | Monaco loads its own web workers; combined transfer can exceed 7 MB |
| `syntax-highlight` (react-syntax-highlighter) | ~2 MB | Ships full language set; tree-shaking ineffective |
| `icon-kit` (lucide-react) | ~500 KB | Individual icon imports help but the chunk still grows linearly |

No `build.rollupOptions.output.manualChunks` size warnings are configured.

### 5.2 Leaderboard service: sequential DB + Redis calls

`api/src/leaderboard/service.rs` (838 lines) opens a new Redis multiplexed connection per request in several methods (e.g., `get_global_leaderboard` line 34). The pattern:

```rust
if let Ok(mut conn) = self.redis_client.get_multiplexed_async_connection().await {
    // cache check
}
// fall through to DB query
```

Each request creates a connection, checks cache, then discards it. The `LeaderboardService` stores a `redis::Client` rather than a connection pool.

**Risk**: Medium. Connection overhead on every leaderboard request. Should use a persistent connection or the existing `RedisPool`.

### 5.3 Unnecessary casts in leaderboard service

Multiple `usize as i64` casts for SQL bind parameters:

- `api/src/leaderboard/service.rs:35,108,109,211,212,217,284,285,290,358,359,364`
- `api/src/leaderboard/service.rs:397` -- `(stats.0 as f64 / stats.1 as f64) * 100.0`

These are functionally correct but indicate the query parameters use `usize` where `i64` would be more appropriate for database interactions.

### 5.4 N+1 query risks

Several service files use loop-based patterns. The leaderboard service at 838 lines has multiple sequential query patterns per endpoint. Without a query profiler, specific N+1 instances cannot be confirmed, but the service architecture (loop-per-entry patterns visible in `contests/service.rs` and `classes/service.rs`) suggests risk.

---

## 6. Missing Infrastructure

### 6.1 No CI/CD pipeline

`.github/workflows/` contains only a `prompts/` subdirectory. No GitHub Actions YAML files exist for:
- Build verification (cargo check, npm build)
- Test execution
- Linting
- Deployment

### 6.2 No root-level `.env.example`

Backend operators have no documented list of required environment variables. Required variables (discovered from source):

**API server** (`api/src/main.rs`):
- `DATABASE_URL` (required, panics if missing)
- `REDIS_URL` (optional, defaults to `redis://127.0.0.1:6379`)
- `JWT_SECRET` (optional, **insecure default**)
- `WORKER_SECRET` (optional, **insecure default**)
- `API_BIND_ADDRESS` (optional, defaults to `0.0.0.0:3000`)
- `RUST_LOG` (optional, defaults to `api=debug,tower_http=debug,axum=trace`)

**Judge worker** (`judge-worker/src/main.rs`):
- `REDIS_URL` (optional, defaults to `redis://127.0.0.1/`)
- `API_URL` (optional, defaults to `http://127.0.0.1:3000`)
- `WORKER_SECRET` (required, errors if missing)
- `SUBMISSION_STREAM` (optional, defaults to `submissions`)
- `CONSUMER_GROUP` (optional, defaults to `judge_workers`)
- `CONSUMER_NAME` (optional, auto-generated)

**Frontend** (`frontend/src/services/config.ts`):
- `VITE_API_BASE_URL`
- `VITE_WS_BASE_URL`
- `VITE_ENABLE_MOCK_DATA`
- `VITE_ENABLE_DIRECT_MESSAGES`
- `VITE_ENABLE_PLAGIARISM`
- `VITE_ENABLE_WEBSOCKET`

### 6.3 Docker files exist but no orchestration docs

Dockerfiles exist for all three services (`api/Dockerfile`, `judge-worker/Dockerfile`, `frontend/Dockerfile`) and a `docker-compose.yml` exists at root. However:
- No deployment runbook references these files
- No documented production Docker build/tag/push workflow
- The `docs/delivery/` directory exists with files but P7 notes they may not match actual runtime behavior

---

## 7. Code Quality

### 7.1 Large files exceeding recommended size

| File | Lines | Concern |
|------|-------|---------|
| `api/src/leaderboard/service.rs` | 838 | Exceeds 800-line recommended max |
| `api/src/classes/service.rs` | 688 | Approaching limit |
| `api/src/submissions/service.rs` | 600 | Moderate |
| `api/src/contests/service.rs` | 560 | Moderate |
| `api/src/users/service.rs` | 533 | Moderate |

### 7.2 `unwrap()` in non-test production code

Approximately 30+ `unwrap()` calls exist in production code paths (excluding `#[cfg(test)]` modules):

**High-risk unwraps** (handle external I/O):
- `api/src/main.rs:133` -- GovernorConfigBuilder `.finish().unwrap()` (panics on invalid config)
- `api/src/websocket/message.rs:196,200,223` -- JSON serialization in WebSocket handler
- `api/src/submissions/queue.rs:87,88` -- JSON serialization for submission messages

**Test-only unwraps** (acceptable in test modules):
- All unwraps in `api/src/middleware/auth.rs`, `api/src/middleware/authz.rs`, `api/src/middleware/tenant.rs` are inside `#[cfg(test)]` blocks
- All unwraps in `api/src/auth/routes.rs` are inside `#[cfg(test)]` or `#[ignore]` tests
- All unwraps in `judge-worker/src/processor/tests.rs` and `judge-worker/src/queue/mod.rs` are inside `#[cfg(test)]`

### 7.3 No clippy lint configuration

`api/Cargo.toml` has no `[lints.clippy]` section. No `#![allow(clippy::*)]` annotations found. This means the codebase relies on default clippy lint levels, which may miss warnings like `too_many_arguments` and `useless_format` unless run explicitly with strict flags.

### 7.4 Frontend TODOs in Settings page

`frontend/src/pages/user/Settings.tsx:69,74` -- Two `TODO(P1)` comments noting that preferences and notification toggle state is local-only with no backend persistence contract.

---

## 8. Configuration / Feature Flags

### 8.1 Frontend feature flags

Defined in `frontend/src/services/config.ts`:

| Flag | Env Variable | Default | Status |
|------|-------------|---------|--------|
| Mock data | `VITE_ENABLE_MOCK_DATA` | `false` | Disabled by default |
| Direct messages | `VITE_ENABLE_DIRECT_MESSAGES` | `true` (enabled unless `false`) | Enabled |
| Plagiarism | `VITE_ENABLE_PLAGIARISM` | `true` (enabled unless `false`) | Enabled |
| WebSocket | `VITE_ENABLE_WEBSOCKET` | `true` | Enabled (in `.env.example` only) |

Note: The `VITE_ENABLE_WEBSOCKET` flag is in `.env.example` but **not** referenced in `config.ts`. The WebSocket config uses `VITE_WS_BASE_URL` instead. This flag appears to be vestigial.

### 8.2 No backend feature flags

The API server has no feature flag mechanism. All modules are always compiled and all routes are always registered. There is no way to disable modules like plagiarism or messages at runtime.

### 8.3 `autotests = false` in API

`api/Cargo.toml` sets `autotests = false`, which means `cargo test` does not automatically discover tests in `api/tests/`. This is unconventional and may confuse contributors who expect standard Rust test layout.

---

## 9. Architectural Notes

### 9.1 Shared workspace dependency

`shared/` is a workspace member used by both `api` and `judge-worker`. The `shared/src/mode` file (listed in git status as modified) suggests there may be a build mode or configuration mechanism, but this was not fully explored.

### 9.2 Dual WebSocket protocol

The API uses `tokio-tungstenite` for WebSocket handling while the judge worker uses `redis` crate for stream consumption. The WebSocket server (`api/src/websocket/server.rs`, 461 lines) manages topic subscriptions in-memory with no persistence.

### 9.3 No API versioning

All API routes are unversioned (`/users`, `/problems`, etc.). No `/api/v1/` prefix exists. This makes future breaking changes difficult to manage.

---

## Summary of Highest-Priority Items

| Priority | Concern | Section |
|----------|---------|---------|
| P0 | Hardcoded default JWT/worker secrets | 4.2 |
| P0 | No CI/CD pipeline | 6.1 |
| P1 | Cross-tenant leaderboard data exposure | 4.1 |
| P1 | 2 of 3 release gate tests require Docker | 3.1 |
| P1 | CORS allows any origin | 4.3 |
| P1 | No `.env.example` for backend | 6.2 |
| P2 | Dead RBAC module adds confusion | 1.1 |
| P2 | Redis module entirely unused except pool creation | 1.2 |
| P2 | Leaderboard service opens Redis connection per request | 5.2 |
| P2 | No API versioning | 9.3 |
| P3 | Large files (leaderboard 838 lines) | 7.1 |
| P3 | Vestigial `VITE_ENABLE_WEBSOCKET` flag | 8.1 |
| P3 | Settings page preferences not persisted | 7.4 |
