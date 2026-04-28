---
phase: 06-full-ci-cd-observability
plan: 03
subsystem: api, infra
tags: [prometheus, metrics, observability, axum, middleware, histogram, counter]

# Dependency graph
requires:
  - phase: 06
    provides: AppState with db_pool, redis_pool fields, request_id middleware, health endpoints
provides:
  - Prometheus metrics recorder with configurable histogram buckets (metrics + metrics-exporter-prometheus crates)
  - /metrics endpoint serving Prometheus text format on port 3000
  - HTTP metrics middleware (track_metrics) recording http_requests_total counter and http_request_duration_seconds histogram
  - Per-request metrics labels: method, path (MatchedPath route pattern), status
  - /metrics endpoint excluded from self-referential metrics tracking
affects: [monitoring, deployment, grafana, alerting]

# Tech tracking
tech-stack:
  added: [metrics@0.24, metrics-exporter-prometheus@0.18]
  patterns: [prometheus-metrics-middleware, once-lock-global-recorder, matched-path-label-cardinality]

key-files:
  created:
    - api-infra/src/metrics.rs
    - api/src/middleware/metrics.rs
  modified:
    - api-infra/Cargo.toml
    - api/Cargo.toml
    - api-infra/src/lib.rs
    - api-infra/src/state.rs
    - api/src/middleware/mod.rs
    - api/src/main.rs
    - api/src/auth/routes.rs
    - api/src/middleware/auth.rs
    - api/src/release_gate_tests.rs

key-decisions:
  - "OnceLock used for global recorder to support parallel test execution without panics"
  - "build_recorder() + set_global_recorder() instead of install_recorder() to handle double-init gracefully"
  - "Path check in track_metrics middleware skips /metrics endpoint (simplest approach per axum official example)"

patterns-established:
  - "Prometheus metrics: setup_metrics_recorder() returns PrometheusHandle via OnceLock, stored in AppState"
  - "HTTP metrics middleware: track_metrics records counter + histogram with method/path/status labels using MatchedPath"
  - "Metrics exclusion: path == /metrics check at middleware entry to avoid self-referential noise"

requirements-completed: [OBS-02]

# Metrics
duration: 21min
completed: 2026-04-15
---

# Phase 06 Plan 03: Prometheus Metrics Middleware + /metrics Endpoint Summary

**Prometheus observability via metrics 0.24 + metrics-exporter-prometheus 0.18 with Axum middleware recording http_requests_total counter and http_request_duration_seconds histogram using MatchedPath labels**

## Performance

- **Duration:** 21 min
- **Started:** 2026-04-15T11:53:36Z
- **Completed:** 2026-04-15T12:14:10Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Prometheus metrics recorder initialized at startup with configurable histogram buckets (5ms to 10s)
- /metrics endpoint serves Prometheus text format on the same port (3000), unauthenticated
- Every HTTP request (except /metrics itself) records http_requests_total counter and http_request_duration_seconds histogram
- Labels use MatchedPath route patterns (e.g., /users/:id) for low cardinality, not actual path values
- Background upkeep task spawned for histogram maintenance every 5 seconds
- 5 unit tests covering Prometheus format, counter increment, self-exclusion, histogram duration, and MatchedPath verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Add metrics crate dependencies and PrometheusHandle to AppState** - `7b5928e` (feat)
2. **Task 2: Add HTTP metrics middleware and /metrics endpoint** - `f4eafde` (feat)

**Additional:** `e24eb17` (chore: Cargo.lock update)

## Files Created/Modified
- `api-infra/src/metrics.rs` - Prometheus recorder setup with OnceLock, histogram buckets, upkeep task
- `api/src/middleware/metrics.rs` - HTTP metrics middleware (track_metrics) with 5 unit tests
- `api-infra/Cargo.toml` - Added metrics 0.24 and metrics-exporter-prometheus 0.18
- `api/Cargo.toml` - Added metrics 0.24
- `api-infra/src/lib.rs` - Added pub mod metrics export
- `api-infra/src/state.rs` - Added prometheus_handle field to AppState
- `api/src/middleware/mod.rs` - Added pub mod metrics export
- `api/src/main.rs` - /metrics route, metrics_handler, track_metrics layer, recorder initialization
- `api/src/auth/routes.rs` - Updated 2 test AppState constructions with prometheus_handle
- `api/src/middleware/auth.rs` - Updated test AppState with prometheus_handle
- `api/src/release_gate_tests.rs` - Updated build_state with prometheus_handle

## Decisions Made
- Used `OnceLock<PrometheusHandle>` for global recorder initialization -- ensures exactly one recorder per process, handles parallel test execution
- Used `build_recorder()` + `set_global_recorder()` with `let _ =` (ignoring error) instead of `install_recorder()` which would panic on double-init
- Simple path check (`req.uri().path() == "/metrics"`) in middleware to skip self-referential metrics, following the axum official example pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated all AppState constructions across codebase with prometheus_handle field**
- **Found during:** Task 1 (compilation after adding field to AppState)
- **Issue:** Adding prometheus_handle to AppState broke 4 other files that construct AppState: auth/routes.rs (2 places), middleware/auth.rs (1 place), release_gate_tests.rs (1 place)
- **Fix:** Added `prometheus_handle: api_infra::metrics::setup_metrics_recorder()` to all AppState constructions
- **Files modified:** api/src/auth/routes.rs, api/src/middleware/auth.rs, api/src/release_gate_tests.rs
- **Verification:** cargo check passes
- **Committed in:** 7b5928e (Task 1 commit)

**2. [Rule 1 - Bug] Fixed global recorder double-init panic in parallel tests**
- **Found during:** Task 2 (test execution)
- **Issue:** `install_recorder()` panics when called a second time in the same process (parallel tests share process). Original approach of `build_recorder()` + ignoring `set_global_recorder` error left tests with handles to non-global recorders that captured no metrics
- **Fix:** Changed to `OnceLock<PrometheusHandle>` pattern -- recorder installed exactly once per process, all callers get the same handle
- **Files modified:** api-infra/src/metrics.rs
- **Verification:** All 5 metrics tests pass including in parallel execution
- **Committed in:** f4eafde (Task 2 commit)

**3. [Rule 1 - Bug] Fixed test_metrics_endpoint_returns_prometheus_format empty output**
- **Found during:** Task 2 (test execution)
- **Issue:** Test only hit /metrics endpoint without first populating histogram data; render() returned empty because no observations had been recorded
- **Fix:** Restructured test to first make a request to a tracked endpoint (/health/live), then fetch /metrics to verify histogram buckets appear
- **Files modified:** api/src/middleware/metrics.rs
- **Verification:** Test passes with populated histogram data
- **Committed in:** f4eafde (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs)
**Impact on plan:** All auto-fixes necessary for compilation, correct test behavior, and parallel test safety. No scope creep.

## Issues Encountered
- None beyond the deviations documented above

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /metrics endpoint ready for Prometheus scraper configuration
- Metrics middleware covers all HTTP routes with method/path/status labels
- Business metrics helpers (submission_queue_depth, websocket_connections_active) can be added to domain services using `metrics::gauge!` macro
- Phase 06 is complete (all 3 plans executed)

---
*Phase: 06-full-ci-cd-observability*
*Completed: 2026-04-15*

## Self-Check: PASSED

- [x] api-infra/src/metrics.rs EXISTS
- [x] api/src/middleware/metrics.rs EXISTS
- [x] api-infra/src/lib.rs EXISTS
- [x] api-infra/src/state.rs EXISTS
- [x] api/src/middleware/mod.rs EXISTS
- [x] api/src/main.rs EXISTS
- [x] Commit 7b5928e EXISTS
- [x] Commit f4eafde EXISTS
- [x] Commit e24eb17 EXISTS
