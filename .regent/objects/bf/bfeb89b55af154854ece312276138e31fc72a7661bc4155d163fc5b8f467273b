# Stack Research: Online Judge Modernization

**Researched:** 2026-04-13
**Scope:** Testing, observability, CI/CD, high-concurrency patterns for existing Rust/Axum + React OJ

---

## 1. Rust Testing

### Unit & Integration Testing

| Tool | Version | Purpose | Confidence |
|------|---------|---------|------------|
| `#[test]` + `tokio::test` | built-in | Unit tests for service functions | HIGH |
| `sqlx::test` | 0.8 | Integration tests with real PostgreSQL (auto-migrations, fixtures) | HIGH |
| `testcontainers` | 0.23 | Spin up PostgreSQL/Redis containers for integration tests | HIGH |
| `tower::ServiceExt` | 0.5 | Test Axum handlers without HTTP server (`.oneshot()`) | HIGH |
| `axum::test` helpers | 0.7 | `TestClient`-style testing for route integration | HIGH |
| `mockall` | 0.13 | Mock generation for trait-based dependencies | HIGH |
| `rstest` | 0.22 | Fixture and parameterized tests | MEDIUM |

### Recommended Approach

**Service layer testing:**
```rust
// Use sqlx::test for DB-dependent service tests
#[sqlx::test(migrations = "../api/migrations")]
async fn test_create_submission(pool: PgPool) {
    let service = SubmissionService::new(pool);
    let result = service.create_submission(params).await;
    assert!(result.is_ok());
}
```

**API handler testing (tower oneshot):**
```rust
#[tokio::test]
async fn test_submit_endpoint() {
    let app = create_test_app().await;
    let response = app
        .oneshot(post("/submissions").json(&body))
        .await
        .unwrap();
    assert_eq!(response.status(), 201);
}
```

**WebSocket testing:** Use `tokio-tungstenite` to connect to test server, send/receive JSON messages.

### Mocking Strategy
- Define repository traits (`ProblemRepo`, `SubmissionRepo`) behind which SQLx lives
- Use `mockall` to generate mocks for these traits in unit tests
- Integration tests use real DB via `sqlx::test` + `testcontainers`

### What NOT to use
- `hyper::server::Server` for tests — use `tower::ServiceExt::oneshot` instead (no TCP overhead)
- Mocking SQLx directly — mock at the trait/repository boundary instead

---

## 2. Rust Observability

| Tool | Version | Purpose | Confidence |
|------|---------|---------|------------|
| `tracing` | 0.1 | Structured logging + instrumentation | HIGH |
| `tracing-subscriber` | 0.3 | Log output formatting, filtering | HIGH |
| `tracing-opentelemetry` | 0.28 | OpenTelemetry integration for distributed tracing | HIGH |
| `opentelemetry` | 0.27 | OTel SDK (trace + metrics) | HIGH |
| `metrics` | 0.24 | Metrics facade (generic interface) | HIGH |
| `metrics-exporter-prometheus` | 0.16 | Prometheus exposition format exporter | HIGH |
| `axum-prometheus` | 0.8 | Auto-instrument Axum routes with Prometheus metrics | HIGH |

### Recommended Stack

```
tracing → tracing-subscriber (fmt + env-filter)
        → tracing-opentelemetry → OTel Collector → Prometheus/Grafana

metrics → metrics-exporter-prometheus → /metrics endpoint
```

### Health Checks
```rust
// Liveness: is the process alive?
async fn health_live() -> &'static str { "ok" }

// Readiness: can it serve requests?
async fn health_ready(State(state): State<AppState>) -> impl IntoResponse {
    let db_ok = sqlx::query("SELECT 1").execute(&state.db_pool).await.is_ok();
    let redis_ok = state.redis_pool.get().await.is_ok();
    if db_ok && redis_ok { (StatusCode::OK, "ready") }
    else { (StatusCode::SERVICE_UNAVAILABLE, "degraded") }
}
```

### What NOT to use
- `log` crate — `tracing` supersedes it with async-aware spans
- Custom metrics implementation — use the `metrics` facade for vendor independence

---

## 3. CI/CD for Rust Monorepo

### GitHub Actions Pipeline

```yaml
# Recommended pipeline stages:
jobs:
  check:
    - cargo fmt --all -- --check
    - cargo clippy --workspace --all-targets -- -D warnings

  test:
    - cargo test --workspace
    - cargo test --workspace -- --ignored  # integration tests

  frontend:
    - npm ci && npm run lint && npm run test && npm run build

  docker:
    - docker build -t api ./api
    - docker build -t judge-worker ./judge-worker
    - docker build -t frontend ./frontend
```

### Key Patterns
- **Caching:** `Swatinem/rust-cache@v2` for `~/.cargo` and `target/`
- **Workspace awareness:** `cargo test --workspace` runs all crate tests
- **Database for tests:** `testcontainers` in CI or `services: postgres:` in GitHub Actions
- **Frontend:** Separate job with `npm ci` + cache `node_modules`

### What NOT to use
- `cargo-make` — adds complexity without benefit over standard GitHub Actions steps
- Custom Docker images for CI — use standard `rust:1.xx` images

---

## 4. High-Concurrency Redis Streams

### Scaling Patterns

| Pattern | Implementation | Tradeoff |
|---------|---------------|----------|
| Multiple consumers in group | Spin up N judge-worker processes, same consumer group | Linear scaling, simple |
| Semaphore-limited concurrency | `tokio::sync::Semaphore` per worker (already at 4) | Controls per-worker load |
| Priority queues | Separate Redis streams: `submissions:high` (contest), `submissions:normal` | Contest submissions get priority |
| Backpressure | `XREADGROUP COUNT 1 BLOCK 5000` with semaphore | Prevents worker overload |
| Dead letter queue | Failed messages → `submissions:dlq` stream | Already implemented, needs monitoring |

### Recommended Enhancements
1. **Configurable worker count:** Environment variable for max concurrent tasks per worker
2. **Priority streams:** Contest submissions go to `submissions:contest` stream, workers consume from it first
3. **Health reporting:** Workers periodically report load/metrics to API
4. **Auto-scaling signal:** API monitors queue length, signals need for more workers
5. **Batch XACK:** Acknowledge multiple messages at once for efficiency

### What NOT to use
- RabbitMQ/Kafka — Redis Streams is already in place and sufficient for this scale
- Unbounded concurrency — always use semaphore to prevent resource exhaustion

---

## 5. Frontend Testing

| Tool | Version | Purpose | Confidence |
|------|---------|---------|------------|
| `vitest` | 3.x | Unit/component test runner (already in devDeps) | HIGH |
| `@testing-library/react` | 16.x | Component testing with user-centric queries (already in devDeps) | HIGH |
| `@testing-library/user-event` | 14.x | Simulate user interactions (already in devDeps) | HIGH |
| `@playwright/test` | 1.55 | E2E browser testing (already in devDeps) | HIGH |
| `msw` | 2.x | Mock Service Worker — intercept API calls in tests | HIGH |

### Recommended Approach
- **Unit tests:** Vitest for utility functions, hooks, store logic
- **Component tests:** `@testing-library/react` + `msw` for API mocking
- **E2E tests:** Playwright for critical user flows (login → submit → view result → contest flow)
- **MSW handlers:** Define per-domain API mocks, reuse across component and E2E tests

### What NOT to use
- Jest — Vitest is already configured and faster
- Enzyme — deprecated, use Testing Library

---

## Summary

| Dimension | Primary Tool | Rationale |
|-----------|-------------|-----------|
| Rust testing | sqlx::test + testcontainers + tower oneshot | Real DB for integration, no HTTP overhead for handlers |
| Observability | tracing + metrics + prometheus | Industry standard, async-aware, vendor-independent |
| CI/CD | GitHub Actions + rust-cache | Simple, well-supported, workspace-aware |
| Concurrency | Redis Streams + semaphore + priority queues | Already in place, needs enhancement not replacement |
| Frontend testing | Vitest + Testing Library + Playwright + MSW | Already configured, needs coverage expansion |
