# Phase 6: Full CI/CD + Observability - Research

**Researched:** 2026-04-15
**Domain:** CI/CD (GitHub Actions Docker builds), Observability (Prometheus metrics, structured logging, health checks)
**Confidence:** HIGH

## Summary

This phase adds production observability to the AlgoMaster API and completes the CI pipeline with Docker build verification. The three pillars are: (1) Docker build verification in GitHub Actions for all 3 services, (2) Kubernetes-style liveness/readiness health endpoints with backward-compatible redirects, and (3) full Prometheus metrics via the `metrics` + `metrics-exporter-prometheus` crate ecosystem with an Axum middleware layer, plus structured request-scoped logging via `tracing` spans.

The existing codebase already uses `tracing` + `tracing-subscriber` with EnvFilter, has `/health` and `/status` handlers, and has a well-structured middleware pipeline in `create_router()`. The integration work is primarily additive -- adding new crates, new middleware layers, and new routes without disrupting existing functionality.

**Primary recommendation:** Use `metrics` 0.24 + `metrics-exporter-prometheus` 0.18 with a custom Axum middleware function (following the official axum prometheus-metrics example pattern) rather than the `axum-prometheus` wrapper crate. This avoids an extra dependency, gives full control over metric names and labels (matching D-04 requirements), and aligns with the project's existing pattern of hand-written middleware functions.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** CI only performs `docker build` verification for all 3 services (api, judge-worker, frontend) on main branch. No push to any remote registry. Images stay local for `docker-compose` usage.
- **D-02:** Add `/health/live` (liveness, returns 200) and `/health/ready` (readiness, checks DB + Redis). Existing `/health` redirects to `/health/live` (307), `/status` redirects to `/health/ready` (307).
- **D-03:** No automated Codex integration. User prefers manual review workflow. CICD-05 is deferred.
- **D-04:** Full observability Prometheus metrics: required (`http_request_duration_seconds` histogram, `submission_queue_depth` gauge) + runtime (DB/Redis pool usage, WebSocket connections, HTTP requests by status code) + advanced (P95/P99 per endpoint, tenant-scoped dimensions).
- **D-05:** Enhance tracing with structured fields: `request_id`, `tenant_id`, `duration_ms`. Use `tracing::Span` to carry these through the middleware pipeline.

### Claude's Discretion
- Choice of Prometheus metrics crate (recommended: `metrics` + `metrics-exporter-prometheus`)
- CI workflow structure (single file with docker job, or separate workflow)
- Exact metric naming conventions and label structure
- Request ID generation strategy (UUID v4 vs ulid)

### Deferred Ideas (OUT OF SCOPE)
- CICD-05 (Codex automated PR review) -- User prefers manual review. Can be revisited if team grows.
- Docker image push to registry -- Deferred until production deployment needs it.
- Docker image tagging strategy -- Not needed without push.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CICD-04 | Docker image builds for api, judge-worker, frontend on main branch | New `docker` job in ci.yml; all 3 Dockerfiles verified working |
| CICD-05 | Codex automated PR review integrated into CI workflow | DEFERRED per D-03 |
| OBS-01 | Structured logging via tracing + tracing-subscriber with env-filter | Extend existing tracing setup with request_id span middleware, JSON layer option |
| OBS-02 | Prometheus metrics exported at /metrics endpoint | Custom middleware using metrics 0.24 + metrics-exporter-prometheus 0.18 |
| OBS-03 | Liveness (/health/live) and readiness (/health/ready) endpoints | New handlers in public_router; redirect old endpoints via 307 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| metrics | 0.24.3 | Lightweight metrics facade (counter, gauge, histogram macros) | [VERIFIED: crates.io] De-facto standard Rust metrics abstraction; used by axum official examples |
| metrics-exporter-prometheus | 0.18.1 | Prometheus-compatible exporter for `metrics` crate | [VERIFIED: crates.io] Official exporter in metrics-rs ecosystem; axum examples updated to 0.18 (PR #3590) |
| tracing | 0.1 (workspace) | Instrumentation and structured logging | [VERIFIED: Cargo.toml] Already in workspace dependencies |
| tracing-subscriber | 0.3 (workspace) | Subscriber with EnvFilter + fmt layers | [VERIFIED: Cargo.toml] Already in workspace dependencies with env-filter feature |
| uuid | 1.11 (existing) | Request ID generation (v4) | [VERIFIED: Cargo.toml] Already in project; no new dependency needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| metrics-util | 0.20.1 | Helper types for metrics ecosystem | If advanced metric aggregation is needed |
| tower-http 0.5 | 0.5 (existing) | TraceLayer with custom MakeSpan for request tracing | Alternative approach for request ID injection; already a dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom metrics middleware + metrics/metrics-exporter-prometheus | `axum-prometheus` 0.10.0 crate | axum-prometheus provides ready-made `PrometheusMetricLayer` with auto-tracked HTTP metrics, but it uses its own naming convention (`axum_http_requests_total` etc) that would need customizing for D-04's specific metric names (`http_request_duration_seconds`, `submission_queue_depth`). Custom middleware gives full control with fewer dependencies. |
| Custom middleware + metrics crate | `prometheus` crate directly | The `prometheus` crate is more verbose and requires manual metric registration. The `metrics` facade is cleaner and separates instrumentation from export. |
| UUID v4 for request IDs | ULID | ULIDs are time-sortable but add a dependency. UUID v4 is already in the project. For request correlation, UUID v4 is sufficient. |

**Installation:**
```bash
cargo add metrics metrics-exporter-prometheus --package api-infra
# Also add to api crate if metrics middleware lives there
cargo add metrics --package api
```

Note: The metrics crates should be added to `api-infra` (where middleware lives) and/or `api` (where the router is assembled). The exact crate placement depends on where the metrics middleware function is defined.

**Version verification:**
```
metrics = "0.24.3" (current on crates.io) [VERIFIED: cargo search 2026-04-15]
metrics-exporter-prometheus = "0.18.1" (current on crates.io) [VERIFIED: cargo search 2026-04-15]
```

## Architecture Patterns

### Recommended Module Structure
```
api/src/
  main.rs              -- Extend: init metrics recorder, add new health routes, add metrics layer
  middleware/
    metrics.rs          -- NEW: HTTP metrics middleware (track_metrics function)
    request_id.rs       -- NEW: Request ID + tenant_id span middleware
api-infra/src/
  state.rs             -- Extend: add PrometheusHandle to AppState
  metrics.rs            -- NEW: metrics recorder setup, custom metric helpers
  health.rs             -- NEW: liveness + readiness check handlers (if extracted from main.rs)
.github/workflows/
  ci.yml               -- Extend: add docker job for build verification
```

### Pattern 1: Custom HTTP Metrics Middleware
**What:** Axum middleware function that records request duration, status, and method/path labels using the `metrics` crate macros.
**When to use:** All HTTP requests through the API server.
**Example:**
```rust
// Source: Based on official axum prometheus-metrics example
// https://github.com/tokio-rs/axum/blob/main/examples/prometheus-metrics/src/main.rs

use axum::{
    extract::{MatchedPath, Request},
    middleware::{self, Next},
    response::IntoResponse,
};
use std::time::Instant;

async fn track_metrics(req: Request, next: Next) -> impl IntoResponse {
    let start = Instant::now();
    let path = if let Some(matched_path) = req.extensions().get::<MatchedPath>() {
        matched_path.as_str().to_owned()
    } else {
        req.uri().path().to_owned()
    };
    let method = req.method().clone();
    let response = next.run(req).await;
    let latency = start.elapsed().as_secs_f64();
    let status = response.status().as_u16().to_string();

    let labels = [
        ("method", method.to_string()),
        ("path", path),
        ("status", status),
    ];

    metrics::counter!("http_requests_total", &labels).increment(1);
    metrics::histogram!("http_request_duration_seconds", &labels).record(latency);
    response
}

// Registration in create_router():
// .route_layer(middleware::from_fn(track_metrics))
```

### Pattern 2: Request ID + Structured Logging Middleware
**What:** Middleware that generates a request_id, creates a tracing span with request_id + tenant_id + method + uri, and instruments the handler chain.
**When to use:** All requests (add to outermost layer in middleware pipeline).
**Example:**
```rust
use axum::{extract::Request, middleware::Next, response::Response};
use uuid::Uuid;

async fn request_id_middleware(mut req: Request, next: Next) -> Response {
    let request_id = req
        .headers()
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    // Insert into request extensions for downstream access
    req.extensions_mut().insert(RequestId(request_id.clone()));

    let span = tracing::info_span!(
        "request",
        request_id = %request_id,
        method = %req.method(),
        uri = %req.uri(),
    );

    let start = std::time::Instant::now();
    let response = next.run(req).instrument(span.clone()).await;
    let duration_ms = start.elapsed().as_millis() as f64;

    // Log structured request completion
    tracing::info!(
        parent: &span,
        duration_ms = duration_ms,
        status = response.status().as_u16(),
        "request completed"
    );

    // Echo request_id back in response header
    let mut response = response;
    response.headers_mut().insert(
        "x-request-id",
        request_id.parse().unwrap(),
    );
    response
}
```

### Pattern 3: Metrics Recorder Setup
**What:** Initialize the Prometheus recorder at startup, expose via /metrics route.
**When to use:** In `main()` before creating the router.
**Example:**
```rust
// Source: metrics-exporter-prometheus docs + axum official example
use metrics_exporter_prometheus::{Matcher, PrometheusBuilder, PrometheusHandle};

fn setup_metrics_recorder() -> PrometheusHandle {
    const EXPONENTIAL_SECONDS: &[f64] = &[
        0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
    ];

    let recorder_handle = PrometheusBuilder::new()
        .set_buckets_for_metric(
            Matcher::Full("http_request_duration_seconds".to_string()),
            EXPONENTIAL_SECONDS,
        )
        .unwrap()
        .install_recorder()
        .unwrap();

    // Periodic upkeep for histogram maintenance
    let upkeep_handle = recorder_handle.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            upkeep_handle.run_upkeep();
        }
    });

    recorder_handle
}

// In main.rs:
let prometheus_handle = setup_metrics_recorder();
// Store in AppState or pass to router

// Route for /metrics endpoint:
async fn metrics_handler(State(state): State<AppState>) -> String {
    state.prometheus_handle.render()
}
```

### Pattern 4: Health Check Endpoints with Redirects
**What:** New `/health/live` and `/health/ready` handlers; old endpoints redirect via 307.
**When to use:** Kubernetes-style health probing.
**Example:**
```rust
use axum::http::StatusCode;
use axum::response::Redirect;

// Liveness -- always returns 200 if the process is alive
async fn health_live() -> &'static str {
    "OK"
}

// Readiness -- checks DB and Redis connectivity
async fn health_ready(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let db_ok = sqlx::query_scalar::<_, i64>("SELECT 1")
        .fetch_one(&state.db_pool)
        .await
        .is_ok();

    let redis_ok = if let Some(ref pool) = state.redis_pool {
        let conn = pool.get().await;
        match conn {
            Ok(mut conn) => {
                deadpool_redis::redis::cmd("PING")
                    .query_async::<String>(&mut conn)
                    .await
                    .is_ok()
            }
            Err(_) => false,
        }
    } else {
        false
    };

    if db_ok && redis_ok {
        Ok(Json(serde_json::json!({
            "status": "ok",
            "db": "connected",
            "redis": "connected",
        })))
    } else {
        Err(StatusCode::SERVICE_UNAVAILABLE)
    }
}

// Old endpoints redirect to new ones (307 preserves method)
async fn health_redirect() -> Redirect {
    Redirect::to("/health/live")
}

async fn status_redirect() -> Redirect {
    Redirect::to("/health/ready")
}
```

### Pattern 5: Custom Business Metrics
**What:** Application-specific metrics beyond HTTP request tracking.
**When to use:** For submission queue depth, WebSocket connections, pool usage.
**Example:**
```rust
// Submission queue depth (periodic gauge update)
// In a background task or on-demand:
metrics::gauge!("submission_queue_depth").set(queue_length as f64);

// WebSocket connections (update on connect/disconnect)
// In websocket/server.rs connect/disconnect methods:
metrics::gauge!("websocket_connections_active").increment(1.0);  // on connect
metrics::gauge!("websocket_connections_active").decrement(1.0);  // on disconnect

// DB pool usage
metrics::gauge!("db_pool_size").set(pool.size() as f64);
metrics::gauge!("db_pool_idle").set(pool.num_idle() as f64);
```

### Middleware Layering Order (Updated)
```
// Outermost to innermost:
// CORS -> Rate Limit -> Request ID -> Metrics -> Auth -> Tenant -> Handler
//
// Health and metrics endpoints go in public_router (before auth/tenant).
// Request ID layer wraps everything (even health checks benefit from tracing).
// Metrics layer wraps protected + public routes (except /metrics itself to avoid self-referencing).
```

### Anti-Patterns to Avoid
- **Don't put /metrics behind auth middleware:** Prometheus scraper needs unauthenticated access. Keep it in public_router.
- **Don't use `install()` on PrometheusBuilder:** It installs a global recorder that panics if called twice (breaks tests). Use `install_recorder()` instead, which returns a handle.
- **Don't track /metrics endpoint itself:** The metrics scrape endpoint should be excluded from the metrics middleware to avoid self-referential noise. Use route ordering or a path check.
- **Don't use `println!` or `dbg!` for observability:** All output must go through `tracing` macros.
- **Don't mutate request state in middleware:** Return new response objects; follow project immutability conventions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prometheus text exposition format | Custom text formatter for /metrics | `metrics-exporter-prometheus` `PrometheusHandle::render()` | Format is complex, version-sensitive, must match Prometheus spec exactly |
| Histogram bucket computation | Custom bucket boundaries and percentile calculation | `metrics::histogram!` with `set_buckets_for_metric` | Histograms require proper bucket distribution for accurate P95/P99 |
| Request duration timing | Manual start/end timestamps scattered in handlers | Middleware with `Instant::now()` + `start.elapsed()` | Centralized, consistent, no handler-level changes needed |
| UUID generation | Custom ID scheme | `uuid::Uuid::new_v4()` | Already in project, battle-tested, no new dependency |

**Key insight:** The official axum prometheus-metrics example provides exactly the pattern needed for HTTP metrics middleware. It handles `MatchedPath` extraction, method/status labeling, and histogram recording in ~20 lines. The `metrics` crate macros (`counter!`, `histogram!`, `gauge!`) are zero-cost when no recorder is installed, so they're safe to add throughout the codebase.

## Common Pitfalls

### Pitfall 1: Double Recorder Installation
**What goes wrong:** `PrometheusBuilder::new().install()` panics if a global recorder is already installed (e.g., in tests).
**Why it happens:** `install()` sets a global and panics on second call.
**How to avoid:** Use `install_recorder()` which returns a handle. For tests, either don't install a recorder (metrics macros are no-ops without one) or use `#[test]` with proper isolation.
**Warning signs:** Test suite panics with "recorder already installed".

### Pitfall 2: Metrics Endpoint Self-Reference
**What goes wrong:** The `/metrics` scrape endpoint gets tracked by the metrics middleware, inflating request counts and latencies.
**Why it happens:** The metrics middleware wraps all routes including `/metrics`.
**How to avoid:** Put `/metrics` route in a separate router that does NOT have the metrics layer, or add a path check in the middleware to skip `/metrics`.
**Warning signs:** `http_requests_total` shows high counts for `/metrics` path; latency histograms skewed by scrape interval.

### Pitfall 3: Docker Build Context in CI
**What goes wrong:** `docker build` fails in CI because workspace files are not in the Docker context.
**Why it happens:** The Dockerfiles use `COPY Cargo.toml Cargo.lock ./` and reference sibling directories. The build context must be the workspace root, not the crate directory.
**How to avoid:** In ci.yml, use `docker build -f api/Dockerfile .` (context is `.` = repo root, not `api/`). The judge-worker Dockerfile already does this with `COPY api/Cargo.toml ./api/Cargo.toml`.
**Warning signs:** CI Docker build fails with "COPY failed: file not found".

### Pitfall 4: Health Redirect Preserving Method
**What goes wrong:** Using 301/302 redirects causes POST requests to the old `/health` endpoint to become GET requests.
**Why it happens:** 301 and 302 may cause method changes per HTTP spec.
**How to avoid:** Use 307 (Temporary Redirect) which preserves the request method. Axum's `Redirect::to()` uses 307 by default.
**Warning signs:** Load balancers or monitoring tools sending HEAD/POST to old endpoints get unexpected behavior.

### Pitfall 5: Redis Pool None Handling in Health Check
**What goes wrong:** Readiness check crashes or returns wrong status when Redis is not configured.
**Why it happens:** `AppState.redis_pool` is `Option<deadpool_redis::Pool>`. In development, Redis may not be available.
**How to avoid:** Handle the `None` case explicitly. In development mode, Redis failure could be non-fatal for readiness; in production, Redis is required. Check `AppConfig::is_production()` to decide.
**Warning signs:** Health check panics with `unwrap()` on `None` Redis pool in dev mode.

### Pitfall 6: Metric Label Cardinality Explosion
**What goes wrong:** High-cardinality labels (e.g., using full URI path with IDs) cause Prometheus to consume excessive memory.
**Why it happens:** Each unique label combination creates a new time series. Paths like `/submissions/123`, `/submissions/456` each create separate series.
**How to avoid:** Use `MatchedPath` (the route pattern, not the actual path) for the `path` label. This gives `/submissions/:id` instead of `/submissions/123`.
**Warning signs:** Prometheus memory usage grows linearly over time; `/metrics` endpoint becomes slow.

## Code Examples

### Prometheus Recorder Setup (for main.rs)
```rust
// Source: Based on official axum prometheus-metrics example
// https://github.com/tokio-rs/axum/blob/main/examples/prometheus-metrics/src/main.rs
// and metrics-exporter-prometheus 0.18 API

use metrics_exporter_prometheus::{Matcher, PrometheusBuilder, PrometheusHandle};

fn setup_metrics_recorder() -> PrometheusHandle {
    const EXPONENTIAL_SECONDS: &[f64] = &[
        0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
    ];

    PrometheusBuilder::new()
        .set_buckets_for_metric(
            Matcher::Full("http_request_duration_seconds".to_string()),
            EXPONENTIAL_SECONDS,
        )
        .unwrap()
        .install_recorder()
        .unwrap()
}
```

### CI Docker Build Verification Job
```yaml
# Source: GitHub Actions docker build pattern
# Add to .github/workflows/ci.yml
docker:
  name: Docker Build Verification
  runs-on: ubuntu-latest
  # Only run on main branch pushes, not PRs
  if: github.ref == 'refs/heads/master' && github.event_name == 'push'
  steps:
    - uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Build API image
      run: docker build -f api/Dockerfile . --no-cache

    - name: Build Judge Worker image
      run: docker build -f judge-worker/Dockerfile . --no-cache

    - name: Build Frontend image
      run: docker build -f frontend/Dockerfile ./frontend --no-cache
```

### Middleware Registration in create_router()
```rust
// Updated create_router showing layer ordering
fn create_router(state: AppState, config: api_infra::config::AppConfig) -> Router {
    // ... CORS setup unchanged ...

    let public_router = Router::new()
        // New health endpoints
        .route("/health/live", get(health_live))
        .route("/health/ready", get(health_ready))
        // Redirect old endpoints
        .route("/health", get(health_redirect))
        .route("/status", get(status_redirect))
        // Prometheus metrics endpoint
        .route("/metrics", get(metrics_handler))
        // Public auth routes
        .route("/auth/login", post(auth::login))
        // ... other public routes ...
        .route("/ws", get(websocket::handler::websocket_upgrade_handler));

    let protected_router = Router::new()
        // ... domain routes unchanged ...
        .route_layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
        ))
        .route_layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::auth::auth_middleware,
        ));

    // Layer ordering (outermost to innermost):
    // CORS -> Rate Limit -> Request ID -> Metrics -> (auth/tenant inside protected_router)
    public_router
        .merge(protected_router)
        // Metrics layer: skip /metrics path to avoid self-reference
        .route_layer(axum::middleware::from_fn(track_metrics))
        // Request ID layer: outermost custom middleware
        .route_layer(axum::middleware::from_fn(request_id_middleware))
        .layer(GovernorLayer {
            config: std::sync::Arc::new(governor_config),
        })
        .layer(cors)
        .with_state(state)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `prometheus` crate (direct) | `metrics` facade + `metrics-exporter-prometheus` | ~2022-2023 | Cleaner API, exporter-agnostic instrumentation |
| `axum-prometheus` wrapper | Custom middleware + metrics macros | 2024+ | More control, fewer deps, matches axum official example |
| `install()` on PrometheusBuilder | `install_recorder()` returning handle | metrics-exporter-prometheus 0.16+ | Safer for testing, no global panic risk |
| 301/302 redirects for health | 307 Temporary Redirect | HTTP spec best practice | Preserves request method |

**Deprecated/outdated:**
- `prometheus` crate's `register_*` macros: Still works but verbose; `metrics` facade is preferred for new code.
- `axum-prometheus` 0.4.x (axum 0.6 era): Incompatible with axum 0.7. Use 0.10+ if choosing this crate.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `metrics-exporter-prometheus` 0.18 `install_recorder()` returns `PrometheusHandle` with `.render()` method | Standard Stack | Recorder API changed; would need to verify with docs |
| A2 | Axum `Redirect::to()` uses 307 status code by default | Architecture Patterns | Would need explicit status code if different |
| A3 | `deadpool_redis::redis::cmd("PING")` works for Redis health check via deadpool | Code Examples | May need different ping mechanism for deadpool-redis |
| A4 | Docker build context for frontend Dockerfile should be `./frontend` (not repo root) based on its COPY commands | CI Docker Build | Frontend Dockerfile COPYs from relative paths; wrong context = build failure |
| A5 | `sqlx::PgPool` has `.size()` and `.num_idle()` methods for pool metrics | Pattern 5 | Pool API may differ in sqlx 0.8 |

**Note:** A1-A5 are low-risk assumptions based on verified API patterns. The planner should verify during implementation with a quick compilation check.

## Open Questions

1. **Where should the metrics middleware live -- `api` crate or `api-infra` crate?**
   - What we know: The middleware needs access to `AppState` (for PrometheusHandle). The router is assembled in `api/src/main.rs`. Other middleware (auth, tenant) lives in `api/src/middleware/`.
   - What's unclear: Whether metrics middleware should be in `api-infra` (reusable across crates) or `api` (close to router assembly).
   - Recommendation: Put in `api/src/middleware/metrics.rs` since it's API-specific and follows the existing pattern. The `setup_metrics_recorder()` function can live in a new `api/src/metrics.rs` or `api-infra/src/metrics.rs`.

2. **Should /metrics be on the same port or a separate port?**
   - What we know: The official axum example uses a separate port (3001) for metrics. However, for Docker Compose deployment, a single port is simpler.
   - What's unclear: Whether the user has a preference for separate ports.
   - Recommendation: Same port (3000), in public_router. Simpler for Docker Compose. For production Kubernetes, Prometheus typically scrapes via service mesh or sidecar anyway.

3. **Should pool metrics (DB/Redis) be updated periodically or on-demand?**
   - What we know: Pool stats change continuously. Gauges should reflect current state.
   - What's unclear: Whether to use a background task that updates gauges every N seconds, or update on each /metrics scrape.
   - Recommendation: Update gauges in the `/metrics` handler before rendering. This is simpler and avoids a background task. Alternatively, use a periodic upkeep task (already needed for histogram maintenance).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | CI Docker builds (CICD-04) | N/A (GitHub Actions) | ubuntu-latest has Docker | N/A |
| cargo | Rust compilation | Yes | 1.90.0 | -- |
| node/npm | Frontend build | Yes | v25.8.1 | -- |
| Docker (local) | Docker build verification testing | Yes | 29.0.1 | -- |
| Rust toolchain | API + judge-worker builds | Yes | Edition 2021 | -- |

**Missing dependencies with no fallback:** None -- all dependencies available.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Rust built-in test harness (`cargo test`) |
| Config file | None (in `Cargo.toml` per-crate) |
| Quick run command | `cargo test -p api -p api-infra --lib -- --test-threads=1` |
| Full suite command | `cargo test --workspace` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CICD-04 | Docker build verification for all 3 services | integration | `docker build -f api/Dockerfile . && docker build -f judge-worker/Dockerfile . && docker build -f frontend/Dockerfile ./frontend` | CI only (no local test file) |
| OBS-01 | Request ID middleware injects span fields | unit | `cargo test -p api --lib request_id` | Wave 0: NEW |
| OBS-01 | Structured logging includes request_id, tenant_id | unit | `cargo test -p api --lib structured_logging` | Wave 0: NEW |
| OBS-02 | Prometheus metrics recorded for HTTP requests | unit | `cargo test -p api --lib metrics` | Wave 0: NEW |
| OBS-02 | /metrics endpoint returns Prometheus format | unit | `cargo test -p api --lib metrics_endpoint` | Wave 0: NEW |
| OBS-02 | submission_queue_depth gauge updated | unit | `cargo test -p api --lib submission_metrics` | Wave 0: NEW |
| OBS-03 | /health/live returns 200 | unit | `cargo test -p api --lib health_live` | Wave 0: NEW |
| OBS-03 | /health/ready checks DB + Redis | unit | `cargo test -p api --lib health_ready` | Wave 0: NEW |
| OBS-03 | /health redirects to /health/live (307) | unit | `cargo test -p api --lib health_redirect` | Wave 0: NEW |
| OBS-03 | /status redirects to /health/ready (307) | unit | `cargo test -p api --lib status_redirect` | Wave 0: NEW |

### Sampling Rate
- **Per task commit:** `cargo test -p api -p api-infra --lib`
- **Per wave merge:** `cargo test --workspace`
- **Phase gate:** Full suite green + `docker build` for all 3 services succeeds locally

### Wave 0 Gaps
- [ ] `api/src/middleware/metrics.rs` -- unit tests for metrics middleware
- [ ] `api/src/middleware/request_id.rs` -- unit tests for request ID middleware
- [ ] `api/src/main.rs` (tests module) -- unit tests for health endpoints using `tower::ServiceExt::oneshot`
- [ ] No test infrastructure changes needed -- existing `tower` dev-dependency supports `oneshot` testing pattern

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A (no auth changes) |
| V3 Session Management | no | N/A |
| V4 Access Control | yes | Metrics endpoint must be in public_router (not behind auth) but should not expose sensitive data |
| V5 Input Validation | no | N/A (health endpoints have no input) |
| V6 Cryptography | no | N/A |

### Known Threat Patterns for Observability Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Metrics endpoint information disclosure | Information Disclosure | /metrics should not expose secrets; only aggregate metrics. Do not include PII in metric labels. |
| Health check endpoint abuse (DoS) | Denial of Service | Health checks are lightweight (DB ping + Redis ping). Rate limiting already covers all endpoints via GovernorLayer. |
| Log injection via request_id | Tampering | Sanitize any user-provided x-request-id header values; validate format. |
| High cardinality metrics exhaustion | Denial of Service | Use MatchedPath (route pattern) not actual path; limit unique label values. |

## Sources

### Primary (HIGH confidence)
- [crates.io] metrics 0.24.3, metrics-exporter-prometheus 0.18.1 -- verified via `cargo search`
- [GitHub] axum official prometheus-metrics example: https://github.com/tokio-rs/axum/blob/main/examples/prometheus-metrics/src/main.rs
- [docs.rs] axum-prometheus 0.10.0 documentation: https://docs.rs/axum-prometheus/latest/axum_prometheus/
- [Codebase] api/src/main.rs, api-infra/src/state.rs, api/Cargo.toml, api-infra/Cargo.toml -- direct file reads

### Secondary (MEDIUM confidence)
- [GitHub] axum PR #3590 updating examples to metrics-exporter-prometheus 0.18
- [Web] Ellie Huxtable blog -- Exporting Prometheus Metrics with Axum: https://ellie.wtf/notes/exporting-prometheus-metrics-with-axum/
- [Web] Matias Salinas -- How to Export Prometheus Metrics in Rust: https://msalinas92.medium.com/how-to-export-prometheus-metrics-in-rust-like-a-pro-de8eb7172d47

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- crate versions verified on crates.io; axum official example provides reference pattern
- Architecture: HIGH -- existing codebase structure well understood; integration points clearly identified in main.rs
- Pitfalls: HIGH -- common issues documented across multiple sources (axum examples, blog posts, crate docs)
- CI Docker: HIGH -- Dockerfiles already working locally; CI job pattern is standard GitHub Actions

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (30 days -- stable domain, slow-moving dependencies)
