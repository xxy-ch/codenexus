# Phase 11: Feature Gateway Infrastructure - Context

**Gathered:** 2026-04-19
**Updated:** 2026-04-21 (v2 — Gateway independent service architecture)
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract the Feature Gateway from the embedded `api-infra` module into a standalone binary service, parallel to the API server. The service runs as its own process with its own HTTP server, database connection, and Docker container. All feature flag CRUD and resolution logic moves to the independent service. The API server becomes an HTTP client of the Gateway, and the frontend remains unchanged (API proxies feature requests to Gateway).

</domain>

<decisions>
## Implementation Decisions

### Three-Ring Model Definition (inherited, unchanged)
- **D-01:** The three-ring model is explicitly:
  - `Ring A`: global master control
  - `Ring B`: tenant hierarchy scope resolution
  - `Ring C`: capability-level feature slugs

- **D-02:** Scope hierarchy is standardized to `global > campus > grade > class > default`.

### Resolution and Override Semantics (inherited, unchanged)
- **D-03:** Effective resolution precedence is `class > grade > campus > global > default`.

- **D-04:** The global master switch is a hard system control and is not overridable by lower scopes.

- **D-05:** Normal feature flags remain overridable within the scope hierarchy; only the master control is hard.

### Authorization Boundary (inherited, unchanged)
- **D-06:** Permission boundary is locked as:
  - `root`: `global` and `campus`
  - `campusAdmin`: `campus` and `grade`
  - `gradeAdmin`: `grade`
  - `teacher`: `class`

- **D-07:** Teachers can view inherited states above class level but can only mutate class-level overrides.

### Runtime Guard and UX Contract (inherited)
- **D-08:** Disabled gated backend capabilities return `404`, not `403`.

- **D-09:** Frontend should also hide or disable feature entry points and show inherited-state indicators where relevant.

### Emergency-Off Behavior (inherited, unchanged)
- **D-11:** `FEATURE_GATEWAY_ENABLED=false` is a system emergency-off path that treats all gated capabilities as disabled and performs no DB queries.

### Phase Boundary Discipline (inherited, unchanged)
- **D-12:** Phase 11 prioritizes architecture, persistence model, resolution service, permissions, and control surfaces only. It does not add speculative integration adapters or pre-connect future AI endpoints.

### Standalone Service Architecture (NEW — 2026-04-21 v2)

- **D-17:** Gateway is extracted as a standalone binary service (`backend/feature-gateway/`), following the `judge-worker` pattern — independent `main.rs`, own `Dockerfile`, own port (3001). It is a peer to `api/` and `judge-worker/` in the backend workspace.
  - **Why:** The user explicitly wants Gateway as a standalone component parallel to backend ("Gateway单独作为和backend平行的组件存在"). This enables independent deployment, scaling, and restart without affecting the API server.
  - **How to apply:** Create `backend/feature-gateway/` with `src/main.rs`, `src/service.rs`, `src/routes.rs`, `src/models.rs`, `Cargo.toml`, `Dockerfile`. Move feature_gateway code from `api-infra/src/feature_gateway/` to the new crate.

- **D-18:** API communicates with Gateway via HTTP REST. The `feature_gate` middleware makes HTTP calls to `FEATURE_GATEWAY_URL` (default `http://feature-gateway:3001`) instead of direct method calls.
  - **Why:** Simple, consistent with existing patterns, local network latency is acceptable (1-5ms). No need for gRPC complexity or Redis request-response patterns.
  - **How to apply:** Replace `Arc<FeatureGatewayService>` in middleware with an HTTP client. The `feature_gate()` closure calls `GET /resolve?slug=xxx&campus_id=1&grade_id=5` on the Gateway.

- **D-19:** Gateway connects directly to PostgreSQL via its own `PgPool`. It does not depend on the API server for data access.
  - **Why:** Zero coupling — Gateway can start, stop, and scale independently. The `judge-worker` already validates this pattern successfully.
  - **How to apply:** Gateway reads `DATABASE_URL` env var, creates its own connection pool. Reads `feature_registry` and `feature_flags` tables, writes to `feature_flags` for CRUD.

- **D-20:** Standard Docker Compose deployment. Gateway container exposes port 3001. API container has `FEATURE_GATEWAY_URL` env var pointing to Gateway.
  - **Why:** Consistent with existing docker-compose.yml structure. Port exposure enables local debugging.
  - **How to apply:** Add `feature-gateway` service to `docker-compose.yml` with `depends_on: [postgres, redis]`. API service gets `depends_on: [feature-gateway]`.

- **D-21:** API-side short TTL cache (10 seconds) for Gateway resolve results. Reduces HTTP calls on hot paths while keeping stale state window small.
  - **Why:** Every request hitting feature_gate middleware would otherwise require an HTTP round-trip. 10s TTL balances performance vs. freshness. Administrative flag changes propagate within 10 seconds.
  - **How to apply:** Replace `DashMap` in current implementation with a TTL-aware cache in the API's HTTP client wrapper. Cache key: `{slug}:{campus_id}:{grade_id}`. Evict on TTL expiry.

- **D-22:** Frontend accesses feature data through the API server as before (`/features/resolved`, `/features/registry`). The API proxies these requests to Gateway. Zero frontend code changes.
  - **Why:** Frontend already works. No need to configure CORS for a second origin or add new env vars. The API acts as a facade.
  - **How to apply:** API's `/features/*` routes become thin proxies that forward to Gateway's HTTP endpoints. Response format stays identical.

- **D-23:** Fail-open degradation strategy. When Gateway is unavailable (connection refused, timeout), API treats all features as enabled and logs a warning.
  - **Why:** User prioritizes UX continuity. A Gateway outage should not block normal platform usage. The 404 security model (D-08) is temporarily relaxed during Gateway unavailability.
  - **How to apply:** `feature_gate` middleware catches HTTP client errors (timeout, connection refused) and returns `Ok(next.run(req))` instead of `Err(404)`. Log `warn!("feature gateway unavailable, fail-open for slug={}")`.

- **D-24:** Shared secret authentication between API and Gateway, reusing the `WORKER_SECRET` pattern from judge-worker.
  - **Why:** Consistent with existing API-to-worker authentication. Simple, already validated. Prevents unauthorized access to Gateway endpoints.
  - **How to apply:** API sends `Authorization: Bearer <WORKER_SECRET>` header on Gateway HTTP calls. Gateway validates on every request, returns 401 if invalid.

- **D-25:** Gateway hosts ALL feature-related endpoints — resolve, registry, and full CRUD (list flags, set flag, delete flag). API no longer directly reads or writes `feature_flags` table.
  - **Why:** User wants Gateway to be the single owner of feature data. This eliminates split-brain risk (API and Gateway both writing to the same table) and makes Gateway the authoritative source.
  - **How to apply:** Gateway exposes:
    - `GET /resolve?slug=xxx&campus_id=1&grade_id=5` — resolve feature state
    - `GET /registry` — list all features
    - `GET /features/:slug/flags` — list overrides
    - `POST /features/:slug/flags` — set override
    - `DELETE /features/:slug/flags` — delete override
    - `GET /health` — health check
    API's `/features/*` routes proxy all of these to Gateway.

- **D-26:** One-step migration. Create the standalone crate, move code, switch API to HTTP client, update Docker Compose, delete `api-infra/src/feature_gateway/`. No dual-mode transitional state.
  - **Why:** The code is not yet in production — no backward compatibility needed. Dual-mode would add complexity without benefit.
  - **How to apply:** Plan as a single wave: create crate → move service/models/routes → add HTTP client to API → update middleware → update Docker Compose → delete old module → verify all tests pass.

### Frontend Feature Flag Migration (inherited, unchanged)
- **D-13:** Replace the existing `FEATURE_FLAGS` static object in `services/config.ts` entirely. Create a new `services/featureGateway.ts` that calls the gateway API to resolve feature state at runtime.
- **D-16:** Database migration inserts 5 seed features into `feature_registry` (direct_messages, plagiarism, discussions, blog, leaderboard), all with `default_enabled = true`.

### Admin UI Layout and Routing (inherited, unchanged)
- **D-15:** Two separate pages: `/admin/features` and `/teacher/features`.

### Claude's Discretion
- Exact HTTP client library choice (reqwest is already in the workspace)
- TTL cache implementation details (DashMap with timestamps vs tokio::time interval-based eviction)
- Gateway's internal module structure within the new crate
- Health check endpoint details (DB ping, memory stats, etc.)
- Whether API proxy routes preserve exact same JSON response format or normalize

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` -- Phase 11 -- official FGW-01..07 requirements and success criteria
- `.planning/STATE.md` -- confirms Phase 11 execution status and decisions log
- `.planning/PROJECT.md` -- school OJ product framing and organizational context

### Existing Backend Integration Surface (to be migrated)
- `backend/api-infra/src/feature_gateway/service.rs` -- current FeatureGatewayService to be moved to new crate
- `backend/api-infra/src/feature_gateway/models.rs` -- data types to be moved
- `backend/api-infra/src/feature_gateway/routes.rs` -- CRUD routes to be moved
- `backend/api-infra/src/feature_gateway/middleware.rs` -- feature_gate() middleware to be rewritten as HTTP client
- `backend/api-infra/src/state.rs` -- AppState.feature_gateway field to be replaced with HTTP client
- `backend/api/src/main.rs` -- router composition and AppState construction to be updated

### Peer Service Patterns (reference)
- `backend/judge-worker/src/main.rs` -- standalone binary pattern (CLI args, env vars, startup)
- `backend/judge-worker/Cargo.toml` -- standalone crate dependencies
- `backend/judge-worker/Dockerfile` -- standalone Docker image pattern
- `docker-compose.yml` -- current container orchestration to add feature-gateway service

### Frontend (unchanged)
- `frontend/src/services/featureGateway.ts` -- React Query hooks, no changes needed (D-22)

### Database Schema
- `backend/api/migrations/` -- existing feature_registry and feature_flags migrations (no schema changes needed)

### Prior Phase Context
- `.planning/phases/13-tenant-hierarchy-restructure/13-CONTEXT.md` -- locked role hierarchy and scope model that D-06 depends on
- `.planning/phases/14-grade-scoped-data-model/14-CONTEXT.md` -- grade_id propagation model for scope resolution context

</canonical_refs>

<code_context>
## Existing Code Insights

### Code to Move
- `backend/api-infra/src/feature_gateway/service.rs` -- FeatureGatewayService with DashMap cache, PgPool, scope resolution logic. Moves to `backend/feature-gateway/src/service.rs` with minimal changes (add Axum HTTP server wrapping).
- `backend/api-infra/src/feature_gateway/models.rs` -- All data types. Moves as-is.
- `backend/api-infra/src/feature_gateway/routes.rs` -- CRUD route handlers. Moves with adjustments: add WORKER_SECRET auth middleware, remove AppState dependency, use Gateway's own service.

### Code to Rewrite
- `backend/api-infra/src/feature_gateway/middleware.rs` -- `feature_gate()` currently calls `gateway.resolve()` directly. Rewritten to make HTTP call to Gateway + TTL cache + fail-open.
- `backend/api-infra/src/state.rs` -- `AppState.feature_gateway: Arc<FeatureGatewayService>` becomes `AppState.gateway_client: Arc<GatewayHttpClient>` (or similar).

### Code to Delete
- `backend/api-infra/src/feature_gateway/` -- entire directory after migration complete
- `backend/api-infra/src/lib.rs` -- remove `pub mod feature_gateway;`

### Code Unchanged
- `frontend/src/services/featureGateway.ts` -- no changes (API proxies to Gateway, frontend still calls API)
- `frontend/src/pages/admin/FeatureManagement.tsx` -- no changes
- `frontend/src/pages/teacher/ClassFeatureSettings.tsx` -- no changes

### Reusable Assets
- `backend/judge-worker/` -- complete reference for standalone binary pattern: main.rs structure, env var loading, Dockerfile, health checks
- `backend/api-infra/src/middleware/authz.rs` -- RBAC middleware pattern for Gateway's WORKER_SECRET auth
- `backend/api-infra/src/error.rs` -- AppError type that Gateway routes can reuse

### Established Patterns
- Standalone workspace binaries: `judge-worker` and `migration-tool` are precedent
- API-to-worker auth: WORKER_SECRET shared secret already in use
- Docker Compose service addition: straightforward `depends_on` + env vars

</code_context>

<specifics>
## Specific Ideas

- Use the school-facing hierarchy language consistently: `global / campus / grade / class`.
- Gateway binary should follow `judge-worker` startup pattern: load env vars, connect to DB, start Axum server, log ready message.
- API's HTTP client for Gateway should have reasonable timeout (2-3 seconds) to avoid blocking request pipeline.
- Gateway health check should verify DB connectivity on `GET /health`.
- Migration is clean-cut — no backward compatibility with embedded mode needed.

</specifics>

<deferred>
## Deferred Ideas

- Phase 12 AI analysis capability wiring and any AI-specific feature-slug rollout
- Assignment-level scope controls from the earlier draft hierarchy; current locked hierarchy stops at `class`
- Feature flag audit logging (who changed what, when) — useful but not Phase 11 scope
- Gateway metrics/observability (Prometheus, tracing) — can be added as a follow-up
- Gateway horizontal scaling (multiple instances behind load balancer) — not needed for v1
- gRPC communication as alternative to HTTP REST — overkill for v1

</deferred>

---

*Phase: 11-feature-gateway-infrastructure*
*Context gathered: 2026-04-19*
*Context updated: 2026-04-21 v1 -- added D-13 through D-16 (frontend migration, backend guard, UI layout, seed data)*
*Context updated: 2026-04-21 v2 -- Gateway independent service architecture: D-17 through D-26*
