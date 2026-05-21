---
phase: 11-feature-gateway-infrastructure
plan: 02
subsystem: backend/api-infra
tags: [feature-flag, http-client, proxy, fail-open, ttl-cache]
dependency_graph:
  requires: [11-01]
  provides: [11-03]
  affects: [api, api-infra]
tech_stack:
  added:
    - "GatewayClient with reqwest HTTP client and DashMap TTL cache"
    - "Proxy route pattern (API forwards to Gateway)"
  patterns:
    - "Fail-open degradation (D-23)"
    - "TTL cache with 10s expiry (D-21)"
    - "Bearer token service-to-service auth (D-24)"
key_files:
  created:
    - "backend/api-infra/src/feature_gateway/client.rs"
  modified:
    - "backend/api-infra/src/feature_gateway/mod.rs"
    - "backend/api-infra/src/feature_gateway/middleware.rs"
    - "backend/api-infra/src/feature_gateway/routes.rs"
    - "backend/api-infra/src/state.rs"
    - "backend/api/src/main.rs"
    - "backend/api/src/auth/routes.rs"
    - "backend/api/src/middleware/auth.rs"
    - "backend/api/src/release_gate_tests.rs"
    - "backend/api/tests/handlers/users_test.rs"
    - "backend/api/tests/handlers/contests_test.rs"
    - "backend/api-infra/Cargo.toml"
  deleted:
    - "backend/api-infra/src/feature_gateway/service.rs"
    - "backend/api-infra/src/feature_gateway/models.rs"
decisions:
  - "Duplicated FeatureSource/ResolvedFeature in client.rs instead of cross-crate dependency"
  - "D-06 role-scope authorization enforced at API proxy layer before forwarding to Gateway"
  - "Fail-open results not cached (only successful Gateway responses cached with TTL)"
metrics:
  duration: 21min
  completed_date: 2026-04-21
---

# Phase 11 Plan 02: API HTTP Client + Proxy Migration Summary

Replaced embedded FeatureGatewayService in api-infra with GatewayClient HTTP client that calls the standalone Feature Gateway service via REST. All API feature routes now proxy to Gateway. The embedded service.rs and models.rs are deleted, completing the one-step migration (D-26).

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Create Gateway HTTP client with TTL cache | 3b816b0 | Done |
| 2 | Rewrite feature_gate middleware to use GatewayClient | f489526 | Done |
| 3 | Convert API feature routes to Gateway proxies | cb06c24 | Done |
| 4 | Update AppState and main.rs | 4d0be8d | Done |
| 5 | Delete embedded feature_gateway module from api-infra | 236de93 | Done |

## What Was Built

### GatewayClient (client.rs)
- `GatewayClient` struct with `reqwest::Client`, `base_url`, `DashMap` TTL cache, Bearer token auth
- `resolve()` -- checks TTL cache before HTTP call to `GET /resolve`, caches successful results with 10s TTL (D-21)
- Fail-open on any HTTP failure: returns `enabled: true` with warning log (D-23)
- `get()`, `post_json()`, `delete()` proxy methods for route forwarding
- Local `FeatureSource` and `ResolvedFeature` types (duplicated from feature-gateway crate)
- 4 unit tests: creation, trailing slash trim, fail-open on connection refused, cache hit

### Rewritten Middleware (middleware.rs)
- `feature_gate()` accepts `Arc<GatewayClient>` instead of `Arc<FeatureGatewayService>`
- Calls `client.resolve(slug, campus_id, grade_id)` with built-in TTL cache + fail-open
- 3 tests: no tenant -> 401, fail-open -> pass through, disabled cache entry -> 404

### Proxy Routes (routes.rs)
- `resolved_features` -- fetches registry from Gateway then resolves each feature via client
- `list_registry`, `list_flags` -- proxy GET to Gateway
- `set_flag`, `delete_flag` -- enforce D-06 role-scope auth then proxy to Gateway
- All proxies return Gateway JSON as-is, or AppError::Internal on failure
- 9 authorization tests retained (D-06 role-scope boundary)

### AppState Changes
- `feature_gateway: Arc<FeatureGatewayService>` replaced with `gateway_client: Arc<GatewayClient>`
- `main.rs` reads `FEATURE_GATEWAY_URL` env var (default `http://127.0.0.1:3001`)
- Constructs `GatewayClient` with `worker_secret` for Bearer auth (D-24)
- All 7 AppState construction sites updated across 7 files

## Key Design Decisions

1. **Type duplication over cross-crate dependency**: `FeatureSource` and `ResolvedFeature` are defined in `client.rs` rather than importing from the `feature-gateway` crate. This avoids a dependency cycle and keeps api-infra self-contained.

2. **Auth at API layer**: D-06 role-scope authorization is enforced at the API proxy layer (in `set_flag` and `delete_flag` handlers) before forwarding to Gateway. Gateway trusts the API's auth decision.

3. **Fail-open results not cached**: Only successful Gateway responses are cached with TTL. Fail-open responses are not cached -- subsequent requests retry the Gateway, which may recover.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed client cache test assertion**
- **Found during:** Task 1 (WIP review)
- **Issue:** `test_resolve_caches_result` expected cache population on HTTP failure, but fail-open path intentionally does not cache
- **Fix:** Rewrote test to pre-populate cache and verify cache hit path
- **Files modified:** client.rs
- **Commit:** f489526

**2. [Rule 3 - Blocking] Combined Tasks 2-4 into atomic compile unit**
- **Found during:** Task 2 execution
- **Issue:** middleware.rs (Task 2) and state.rs (Task 4) both had to change together for compilation
- **Fix:** Made all changes, verified together, then committed in logical sequence
- **Files modified:** middleware.rs, routes.rs, state.rs, main.rs + test files
- **Commits:** f489526, cb06c24, 4d0be8d

**3. [Rule 3 - Blocking] Missing AppState construction sites**
- **Found during:** Task 4 execution
- **Issue:** Grep revealed 7 AppState construction sites (not just main.rs), all referencing old `feature_gateway` field
- **Fix:** Updated all 7 sites: main.rs, auth/routes.rs (x2), middleware/auth.rs, release_gate_tests.rs, users_test.rs, contests_test.rs
- **Files modified:** 7 files
- **Commit:** 4d0be8d

## Test Coverage

- **api-infra**: 54 unit tests (6 removed with models.rs deletion, 4 client tests, 3 middleware tests, 9 route auth tests)
- **api**: 61 lib tests pass (8 ignored for Docker)
- **feature-gateway**: 25 tests pass (standalone crate unchanged)
- **Full workspace**: 403 tests pass, 0 failures, 18 ignored

## Verification Checklist

- [x] `cargo build --workspace` -- all crates compile without errors
- [x] `cargo test -p api-infra` -- 54/54 tests pass
- [x] `cargo test -p feature-gateway` -- 25/25 tests pass
- [x] No `FeatureGatewayService` in api-infra (grep confirms deletion)
- [x] No `PgPool` or `sqlx` references in api-infra feature_gateway module
- [x] `cargo test --workspace --lib` -- 403/403 pass, 0 failures

## Self-Check: PASSED
