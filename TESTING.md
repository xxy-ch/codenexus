![CodeNexus Banner](codenexus_banner.svg)

> 📄 **[Read in Chinese / 中文说明](TESTING.zh-CN.md)**

# Testing Guidelines

This document details the comprehensive testing strategy, frameworks, execution guides, and best practices for both backend and frontend development in **CodeNexus**.

---

## 1. Testing Strategy Overview

CodeNexus follows a classic testing pyramid to ensure absolute structural security, multi-tenant isolation, and execution safety under load:

```
        ╱  E2E (Playwright)  ╲       — High-priority user flows & interactive states
       ╱  Integration Tests   ╲      — Database operations, Redis pipelines, domain logic
      ╱  Handler Level Tests   ╲     — Route compilation, middlewares, JWT scopes
     ╱  Unit Tests (Rust/TS)    ╲    — Data mapping, DTO parsers, validation rules
```

| Layer | Backend (Rust) | Frontend (TypeScript) |
|-------|----------------|-----------------------|
| **Unit Tests** | `#[cfg(test)]` inline modules | Vitest + JSDOM |
| **Integration Tests** | `tests/` workspace suite with Testcontainers | — |
| **Handler Tests** | `tower::ServiceExt::oneshot` | — |
| **E2E Tests** | — | Playwright E2E Suite |
| **Tenant Isolation** | Strict automated multi-tenant test suites | — |

---

## 2. Backend Testing (Rust)

### Test Tools & Harnesses

| Harness | Version | Purpose |
|---------|---------|---------|
| `cargo test` | Built-in | Test runner |
| `testcontainers` | `0.23` | Launches temporary PostgreSQL & Redis Docker instances |
| `sqlx` | `0.8` | Handles database queries & schemas |
| `tokio` | `1.35` | Async runtime for testing threads |

### Unit Testing
Every crate enforces standard Rust inline unit testing in files using the `#[cfg(test)] mod tests` block at the bottom of the source files.

To run only unit tests (skipping container-based integrations):
```bash
cd backend
cargo test --lib --workspace
```

### Integration Testing
Integration tests are grouped under the `tests/` directory of each modular crate. They utilize the shared `TestFixture` struct defined in `api-infra/src/testkit/mod.rs` to start independent, sandboxed DB instances automatically:

```rust
// Standard integration test using the DB harness
#[tokio::test]
async fn test_create_user_transactional() {
    let fixture = TestFixture::new().await;
    let pool = &fixture.db_pool;
    
    // Seed and execute transactional queries
    let user = create_test_user(pool, "john_doe").await.unwrap();
    assert_eq!(user.username, "john_doe");
}
```

### Multi-Tenant Isolation Testing
CodeNexus enforces a strict tenant isolation policy. A dedicated test harness located in `api/tests/tenant_isolation.rs` automatically maps every REST endpoint and verifies that:
1. Users from **Tenant A** cannot view, search, modify, or delete entities belonging to **Tenant B**.
2. Requesting resources from an illegal tenant context triggers a safe `404 Not Found` or `403 Forbidden` response instead of exposing system states.

Run the multi-tenant isolation verification:
```bash
cd backend
cargo test --test tenant_isolation --features testkit
```

---

## 3. Frontend Testing (TypeScript)

The client application includes two layers of quality assurance: components/hooks testing (Vitest) and UI integration testing (Playwright).

### Unit & Component Testing (Vitest)

Vitest is configured with `jsdom` to mock browser environments. All service modules are fully mocked out to prevent actual network calls during testing.

```bash
cd frontend

# Run complete Vitest suite
npm run test

# Run Vitest once for CI/local verification
npm run test:run

# Generate code coverage reports
npm run test:coverage
```

Add focused tests for changed service mappings, hooks, and user-facing states. Coverage is reported through `npm run test:coverage`; there is no repository-enforced global coverage threshold.

### End-to-End Testing (Playwright)

Playwright executes real user interactions across a headless Chromium browser instance. E2E tests are configured in `frontend/e2e/` and target key workflows:
- **Authentication Flow:** Registration -> Login -> Session renewal.
- **Problem Submission Flow:** Selecting a problem -> Code submission inside Monaco Editor -> Waiting for live WebSocket verdict.
- **Contest Lifecycle Flow:** Board freeze -> Upsolving post-contest.

To execute E2E testing locally:
```bash
cd frontend
# Ensure the API Server is running locally on port 3000
npm run test:e2e
```

---

## 4. Judge Worker Testing

The execution worker includes dedicated testing targets for sandbox operations:
1. **Sandbox Enforcement Tests:** Compiles hostile code (e.g. attempting to start system threads or write to host folders) and verifies that the process is correctly terminated by `cgroups` limit locks or `seccomp` system call blockages.
2. **Heartbeat Lifecycle Tests:** Asserts that periodic status updates and queue lengths are successfully dispatched to the API master server.
3. **Task Recovery (XPENDING/XCLAIM):** Emulates worker crash events and verifies that pending tasks are safely claimed and evaluated by recovery workers.
<!-- GSD:docs -->
