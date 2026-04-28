# Phase 6: Full CI/CD + Observability - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the CI pipeline with Docker build verification, and add production observability (structured logging, Prometheus metrics, health checks). Codex PR review is excluded from automated integration.

</domain>

<decisions>
## Implementation Decisions

### Docker CI Pipeline
- **D-01:** CI only performs `docker build` verification for all 3 services (api, judge-worker, frontend) on main branch — no push to any remote registry. Images stay local for `docker-compose` usage.
  - **Why:** No production registry configured; deployment is Docker Compose only. Build verification catches Dockerfile regressions without needing registry auth.
  - **How to apply:** Add a `docker` job to `.github/workflows/ci.yml` that runs `docker build` for each Dockerfile and exits. No login/push steps.

### Health Check Endpoints
- **D-02:** Add `/health/live` (liveness, returns 200) and `/health/ready` (readiness, checks DB + Redis). Existing `/health` redirects to `/health/live`, `/status` redirects to `/health/ready`.
  - **Why:** Backward-compatible migration — existing tools hitting `/health` or `/status` still work via redirect, while Kubernetes-style probes use the new canonical endpoints.
  - **How to apply:** Add new routes in `main.rs` public router, convert old handlers to 307 redirects.

### Codex PR Review
- **D-03:** No automated Codex integration. User prefers manual review workflow. CICD-05 is deferred.
  - **Why:** User explicitly stated they will intervene manually rather than configure automated Codex reviews.
  - **How to apply:** Skip CICD-05 in planning. Mark as deferred in REQUIREMENTS.md.

### Prometheus Metrics (Full Observability)
- **D-04:** Implement comprehensive Prometheus metrics:
  - **Required:** `http_request_duration_seconds` (histogram), `submission_queue_depth` (gauge)
  - **Runtime:** DB connection pool usage, Redis connection pool usage, active WebSocket connections, HTTP requests by status code (counter)
  - **Advanced:** Requests per second, P95/P99 latency per endpoint, tenant-scoped dimensions
  - **Why:** User selected "full observability" — comprehensive metrics for production monitoring.
  - **How to apply:** Use `metrics` + `metrics-exporter-prometheus` crate ecosystem. Add Axum middleware layer for HTTP metrics. Expose at `/metrics` endpoint.

### Structured Logging
- **D-05:** Enhance existing tracing setup with structured fields: `request_id`, `tenant_id`, `duration_ms`. `tracing` + `tracing-subscriber` already in place; add middleware to inject request-scoped fields.
  - **Why:** OBS-01 requires request_id, tenant_id, and duration in log output. Current setup uses tracing but lacks per-request context propagation.
  - **How to apply:** Add a request-id middleware (generate UUID per request), use `tracing::Span` to carry request_id and tenant_id fields through the middleware pipeline.

### Claude's Discretion
- Choice of Prometheus metrics crate (recommended: `metrics` + `metrics-exporter-prometheus`)
- CI workflow structure (single file with docker job, or separate workflow)
- Exact metric naming conventions and label structure
- Request ID generation strategy (UUID v4 vs ulid)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing CI/CD Infrastructure
- `.github/workflows/ci.yml` — Current CI pipeline (Rust + Frontend jobs, no Docker stage)
- `api/Dockerfile` — API server Docker image
- `judge-worker/Dockerfile` — Judge worker Docker image
- `frontend/Dockerfile` — Frontend Docker image (Nginx)
- `docker-compose.yml` — Local development orchestration

### Existing Observability Code
- `api/src/main.rs` — Tracing subscriber setup, health/status endpoints, router structure

### Configuration
- `api-infra/src/config.rs` — AppConfig with CORS origins, environment detection, secrets

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/ci.yml`: Working CI with Rust cache, fmt, clippy, test, frontend lint/test/build — add Docker job alongside
- `api/src/main.rs` health_check + get_system_status: Existing health/status handlers — convert to redirects after adding new endpoints
- `tracing` + `tracing-subscriber`: Already initialized with EnvFilter in main.rs — extend, don't replace
- `tower_http::cors::CorsLayer`: Shows the pattern for adding Axum middleware layers in `create_router()`

### Established Patterns
- Middleware layering in `create_router()`: CORS → rate limit → auth → tenant → handler. Health/metrics endpoints go in public_router (before auth).
- Domain crate extraction pattern: domain crates are independent, observability middleware lives in `api-infra` or `api`
- AppState in `api-infra::state`: Holds db_pool, redis_pool, websocket_server — available for health checks and metrics

### Integration Points
- `/health` and `/status` routes in public_router (line 146-147) — add new health endpoints here
- Middleware pipeline in `create_router()` — add metrics layer before auth, add request-id layer at outermost
- `AppState.redis_pool` — available for readiness check (ping Redis)
- `AppState.db_pool` — already used in `get_system_status` for DB ping

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

- **CICD-05 (Codex automated PR review)** — User prefers manual review. Can be revisited if team grows.
- **Docker image push to registry** — Deferred until production deployment needs it. Build verification is sufficient for now.
- **Docker image tagging strategy** — Not needed without push. Can add semantic versioning later.

</deferred>

---

*Phase: 06-full-ci-cd-observability*
*Context gathered: 2026-04-15*
