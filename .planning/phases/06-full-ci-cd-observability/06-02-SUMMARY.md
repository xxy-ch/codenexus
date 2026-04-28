---
phase: 06-full-ci-cd-observability
plan: 02
subsystem: api, infra
tags: [health-check, kubernetes, request-id, tracing, structured-logging, axum, middleware]

# Dependency graph
requires:
  - phase: 05
    provides: AppState with db_pool, redis_pool fields and middleware pipeline
provides:
  - Kubernetes-style liveness (/health/live) and readiness (/health/ready) endpoints
  - Backward-compatible 307 redirects from /health and /status to new endpoints
  - Request ID middleware generating UUID v4 per request with tracing span injection
  - Structured log output with request_id, method, uri, duration_ms, status fields
  - x-request-id response header echoing generated or forwarded request ID
affects: [06-03-metrics, deployment, monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns: [kubernetes-health-probes, request-id-middleware, structured-tracing-spans]

key-files:
  created:
    - api/src/middleware/request_id.rs
  modified:
    - api/src/main.rs
    - api/src/middleware/mod.rs

key-decisions:
  - "Redirect::temporary() used instead of Redirect::to() to get 307 status code (Axum default is 303)"
  - "health_ready returns 503 with JSON body on any dependency failure, including redis_pool=None"
  - "Request ID middleware placed as route_layer after merge to cover all routes (public + protected)"

patterns-established:
  - "Kubernetes health probes: /health/live for liveness, /health/ready for readiness with dependency checks"
  - "Request ID propagation: generate or forward x-request-id, store in extensions, echo in response headers"
  - "Structured request logging: tracing info_span with request_id, method, uri, duration_ms, status"

requirements-completed: [OBS-01, OBS-03]

# Metrics
duration: 13min
completed: 2026-04-15
---

# Phase 06 Plan 02: Health Endpoints + Request-ID Structured Logging Summary

**Kubernetes-style /health/live and /health/ready probes with DB+Redis checks, 307 backward-compatible redirects, and per-request UUID tracing spans with structured logging**

## Performance

- **Duration:** 13 min
- **Started:** 2026-04-15T11:35:32Z
- **Completed:** 2026-04-15T11:49:09Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Liveness probe (/health/live) returns 200 OK for container health checks
- Readiness probe (/health/ready) checks DB via SELECT 1 and Redis via PING, returns JSON status
- Old endpoints (/health, /status) redirect via 307 to new canonical endpoints
- Request ID middleware generates UUID v4 or forwards x-request-id header
- Every request gets a structured tracing span with request_id, method, uri, duration_ms, status
- Response headers include x-request-id for client-side log correlation
- 9 new unit tests (5 health endpoint tests + 4 request_id middleware tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add liveness/readiness health endpoints with backward-compatible redirects** - `4281224` (feat)
2. **Task 2: Add request_id middleware with structured tracing spans** - `1ca6cd6` (feat)

## Files Created/Modified
- `api/src/middleware/request_id.rs` - Request ID middleware with UUID generation, tracing span, structured logging
- `api/src/main.rs` - Health endpoints (live/ready/redirects), request_id layer in router, 5 health tests
- `api/src/middleware/mod.rs` - Added pub mod request_id declaration

## Decisions Made
- Used `Redirect::temporary()` (307) instead of `Redirect::to()` (303) to preserve HTTP method on redirects, matching Kubernetes health probe best practices
- health_ready returns 503 with descriptive JSON body on any dependency failure, including when redis_pool is None
- Request ID middleware placed as route_layer after merge (before GovernorLayer) to cover all routes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Redirect::to() using 303 instead of 307**
- **Found during:** Task 1 (health endpoint tests)
- **Issue:** Plan and research assumed `Redirect::to()` returns 307, but Axum 0.7 uses 303 for `Redirect::to()`
- **Fix:** Changed to `Redirect::temporary()` which returns 307 Temporary Redirect
- **Files modified:** api/src/main.rs
- **Verification:** Tests assert StatusCode::TEMPORARY_REDIRECT (307)
- **Committed in:** 4281224 (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed hyper::body::to_bytes API change**
- **Found during:** Task 1 (test compilation)
- **Issue:** hyper 1.x removed `hyper::body::to_bytes`; need `axum::body::to_bytes` with 2-arg signature
- **Fix:** Imported `axum::body::to_bytes` and added 1024-byte limit parameter
- **Files modified:** api/src/main.rs
- **Verification:** Tests compile and pass
- **Committed in:** 4281224 (Task 1 commit)

**3. [Rule 3 - Blocking] Added tracing::Instrument import for .instrument()**
- **Found during:** Task 2 (middleware compilation)
- **Issue:** `next.run(req).instrument(span)` requires `tracing::Instrument` trait in scope
- **Fix:** Added `use tracing::Instrument;` to request_id.rs
- **Files modified:** api/src/middleware/request_id.rs
- **Verification:** cargo check passes
- **Committed in:** 1ca6cd6 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for correctness and compilation. No scope creep.

## Issues Encountered
- None beyond the deviations documented above

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Health endpoints ready for Kubernetes/Docker Compose health checks
- Request ID middleware ready for log aggregation and correlation
- Middleware layering updated: CORS -> rate limit -> request_id -> (metrics placeholder) -> auth -> tenant -> handler
- Plan 06-03 (Prometheus metrics) can add the metrics middleware layer in the reserved position

---
*Phase: 06-full-ci-cd-observability*
*Completed: 2026-04-15*

## Self-Check: PASSED

- [x] api/src/middleware/request_id.rs EXISTS
- [x] api/src/main.rs EXISTS
- [x] api/src/middleware/mod.rs EXISTS
- [x] Commit 4281224 EXISTS
- [x] Commit 1ca6cd6 EXISTS
