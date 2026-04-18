<!-- generated-by: gsd-doc-writer -->

# Testing

This document describes the testing strategy, frameworks, patterns, and tooling for the AlgoMaster Online Judge project.

## Test Strategy Overview

The project uses a multi-layer testing approach across the Rust backend and TypeScript frontend:

| Layer | Rust | TypeScript |
|-------|------|------------|
| Pure unit tests | `#[test]` in `src/` via `#[cfg(test)]` modules | Vitest with `vi.mock()` for service tests |
| Component tests | `#[tokio::test]` in `src/` (no external deps) | React Testing Library + Vitest for UI components |
| Integration tests | `tests/*.rs` with testcontainers (Docker) | N/A (services tested via mocked axios) |
| E2E tests | N/A | Playwright against running dev server |
| Smoke tests | N/A | Playwright delivery smoke suite |

---

## Rust Testing

### Framework and Setup

Rust tests use the built-in `cargo test` harness. Async tests use `#[tokio::test]` from the `tokio` workspace dependency. Integration tests that need external services (PostgreSQL, Redis) use **testcontainers** (v0.23) to spin up ephemeral Docker containers.

Key dev-dependencies for testing:

| Crate | Version | Purpose |
|-------|---------|---------|
| `tokio-test` | 0.4 | Async test utilities |
| `testcontainers` | 0.23 | Docker-based ephemeral containers |
| `testcontainers-modules` | 0.11 | Pre-built Postgres/Redis container images |
| `env_logger` | 0.11 | Test log output |
| `tower` (util feature) | 0.5 | HTTP handler testing via `oneshot` |

### Running Tests

Run all workspace tests (fast, no Docker required for pure unit tests):

```bash
cargo test --workspace
```

Integration tests that require Docker are marked `#[ignore]`. To include them:

```bash
# All ignored (Docker-dependent) tests
cargo test --workspace -- --ignored

# Specific integration test binary
cargo test -p api --test tenant_isolation -- --ignored
cargo test -p domain-contests --test integration -- --ignored
cargo test -p migration-tool --test e2e_migration -- --ignored
```

Run tests for a single crate:

```bash
cargo test -p judge-worker
cargo test -p api-infra --features testkit
```

Run a single test by name:

```bash
cargo test -p api test_contest_list_tenant_isolated -- --ignored
```

### Test Patterns

#### Pure Unit Tests (`#[test]`)

Located in `#[cfg(test)]` modules within source files. These test pure logic with no external dependencies:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_submission_message_structure() {
        let submission = SubmissionMessage {
            submission_id: 1,
            problem_id: 1,
            // ...
        };
        assert_eq!(submission.language, "python3");
    }
}
```

Examples: `judge-worker/src/processor/tests.rs`, `shared/src/models/permission.rs`, `api-infra/src/testkit/fixtures.rs`.

#### Async Unit Tests (`#[tokio::test]`)

Used for async functions that do not require external services:

```rust
#[tokio::test]
async fn test_password_hashing() {
    let hash = hash_password("secret").await.unwrap();
    assert!(verify_password("secret", &hash).await);
}
```

#### Integration Tests with TestFixture

Integration tests live in `tests/` directories of each crate. They use the shared `TestFixture` from `api-infra/src/testkit/` to spin up ephemeral PostgreSQL and Redis containers:

```rust
use api_infra::testkit::TestFixture;

async fn setup_fixture() -> TestFixture {
    let fixture = TestFixture::new().await;
    let migrator = sqlx::migrate!("../api/migrations");
    migrator.run(&fixture.db_pool).await.expect("migrations failed");
    fixture
}

#[tokio::test]
async fn test_create_and_get_contest() {
    let fixture = setup_fixture().await;
    let service = ContestService::new(fixture.db_pool.clone());
    // ... test against real database
}
```

The `TestFixture` struct (in `api-infra/src/testkit/mod.rs`) provides:

- `db_pool: PgPool` -- connection pool to an ephemeral PostgreSQL 15 container
- `redis_pool: RedisPool` -- connection pool to an ephemeral Redis 7 container
- `database_url` / `redis_url` -- connection strings
- Automatic container cleanup on drop

**Requirement:** Docker must be running for `TestFixture`-based tests.

#### `#[ignore]` Convention

Tests requiring external services are annotated with `#[ignore]` and a reason:

```rust
#[tokio::test]
#[ignore = "requires Redis"]
async fn test_consume_and_acknowledge() { /* ... */ }

#[tokio::test]
#[ignore = "requires Docker -- run with `cargo test -p migration-tool --test e2e_migration -- --ignored`"]
async fn test_full_e2e_migration() { /* ... */ }
```

The `--ignored` flag must be passed to `cargo test` to run them.

#### Tenant Isolation Tests

A dedicated test suite in `api/tests/tenant_isolation.rs` verifies the core security property: data seeded in organization A never appears in queries scoped to organization B. This covers contests, problems, users, submissions, and leaderboards.

### Test File Locations

| Directory | Contents |
|-----------|----------|
| `api/tests/` | API integration tests (tenant isolation, handlers, basic) |
| `api/src/**/tests.rs` or `#[cfg(test)]` | Inline unit tests within API modules |
| `domain-*/tests/integration.rs` | Per-domain integration tests (contests, problems, users, etc.) |
| `judge-worker/tests/` | Queue consumer, processor, and memory tests |
| `judge-worker/src/**/tests.rs` | Inline unit tests (processor, queue, sandbox, heartbeat) |
| `migration-tool/tests/e2e_migration.rs` | Full migration pipeline E2E tests |
| `migration-tool/src/**/ #[cfg(test)]` | Parser, mapper, migrator, and id_map unit tests |
| `api-infra/src/testkit/` | Shared test infrastructure (TestFixture, database, Redis, fixtures) |
| `shared/src/models/` | Unit tests for permission and role models |

---

## Frontend Testing

### Framework and Setup

The frontend uses **Vitest** (v1.0.2) as the primary test runner with **React Testing Library** (v16.0.0) for component tests and **Playwright** (v1.55.0) for E2E tests.

Vitest configuration is in `frontend/vitest.config.ts`:

- **Environment:** jsdom
- **Globals:** enabled (no need to import `describe`, `it`, `expect`)
- **Setup files:** `src/test/setup.ts` (DOM mocks) and `src/test/vitest.setup.ts` (fetch mock, mock cleanup)
- **Coverage provider:** v8
- **Path alias:** `@/` maps to `./src/`

### Running Tests

```bash
cd frontend

# Run all unit tests (watch mode)
npm test

# Run tests once (CI mode)
npx vitest --run

# Run with coverage report
npm run test:coverage

# Run E2E tests with Playwright
npm run test:e2e:playwright
```

For Playwright, the dev server must be running separately (or configured via `webServer` in CI). Set `PLAYWRIGHT_BASE_URL` to override the default `http://127.0.0.1:5173`.

### Test Patterns

#### Service Tests

Service-layer tests mock the Axios API instance using `vi.hoisted()` and `vi.mock()`:

```typescript
const { mockApi } = vi.hoisted(() => ({
  mockApi: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('@/services/api', () => ({ default: mockApi }))

describe('contestsService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('fetches contests with correct params', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { contests: [...], total: 1 } })
    const result = await contestsService.getContests({ page: 1, limit: 20 })
    expect(mockApi.get).toHaveBeenCalledWith('/contests?page=1&limit=20')
  })
})
```

Service test files: `frontend/src/services/__tests__/`

#### Component Tests

UI component tests use React Testing Library with `QueryClientProvider` and `MemoryRouter` wrappers:

```typescript
const renderComponent = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ContestList />
      </MemoryRouter>
    </QueryClientProvider>
  )
```

Component test files: `frontend/src/pages/**/__tests__/`

#### E2E Tests (Playwright)

E2E tests exercise full user flows against the running application:

```typescript
test('login and navigate to problems', async ({ page }) => {
  await loginAs(page, '1001')
  await page.goto(`${baseURL}/problems`)
  await expect(page.getByRole('heading', { name: /problem repository/i })).toBeVisible()
})
```

E2E test files: `frontend/e2e/`

Key E2E test suites:

| File | Coverage |
|------|----------|
| `smoke.spec.ts` | Login, multi-role navigation, submission, admin pages |
| `contest-freeze.spec.ts` | Scoreboard rendering during freeze, post-contest live rankings |
| `contest-upsolving.spec.ts` | Upsolving flow after contest ends |

### Test Setup Files

- **`src/test/setup.ts`** -- Polyfills for browser APIs not in jsdom: `IntersectionObserver`, `ResizeObserver`, `window.matchMedia`
- **`src/test/vitest.setup.ts`** -- Global `fetch` mock, automatic `vi.clearAllMocks()` in `beforeEach`

### Test File Naming

| Pattern | Type |
|---------|------|
| `*.test.ts` | Service/utility unit tests |
| `*.test.tsx` | Component unit tests |
| `*.spec.ts` | Playwright E2E tests |
| `__tests__/*.test.tsx` | Component tests co-located with pages |

---

## Coverage

### Frontend Coverage Thresholds

The project enforces an 80% minimum across all metrics, configured in `frontend/vitest.config.ts`:

| Type | Threshold |
|------|-----------|
| Lines | 80% |
| Branches | 80% |
| Functions | 80% |
| Statements | 80% |

Run coverage report:

```bash
cd frontend && npm run test:coverage
```

Coverage output is generated in `text`, `json`, and `html` formats.

### Rust Coverage

No automated coverage threshold is configured for Rust tests. Pure unit tests and inline `#[cfg(test)]` modules cover individual functions, while integration tests cover SQL queries and multi-component flows. Use `cargo tarpaulin` or `cargo llvm-cov` for Rust coverage analysis if needed.

---

## CI Integration

Tests run in GitHub Actions (`.github/workflows/ci.yml`):

### Rust CI Job

- **Trigger:** All pushes and pull requests to any branch
- **Steps:** `cargo fmt --check`, `cargo clippy`, `cargo test --workspace`
- **Environment:** `SQLX_OFFLINE=true` (offline mode for compile-time SQL checking)
- **Runner:** `ubuntu-latest`
- **Note:** `#[ignore]` integration tests are NOT run in CI (they require Docker, which is available but not invoked by default `cargo test`)

### Frontend CI Job

- **Trigger:** All pushes and pull requests to any branch
- **Steps:** `npm ci`, `npm run lint`, `npx vitest --run`, `npm run build`
- **Runner:** `ubuntu-latest`, Node.js 22
- **Note:** Playwright E2E tests are not part of the default CI pipeline

### Docker Build Verification

- **Trigger:** Pushes to `master` only
- **Steps:** Builds all three Docker images (API, judge-worker, frontend) to verify no build regressions

---

## Troubleshooting

### Docker Not Running

Integration tests using `TestFixture` or `#[ignore]` tests will fail if Docker is not running:

```
Failed to start PostgreSQL test container. Is Docker running?
```

**Fix:** Start Docker Desktop or the Docker daemon before running integration tests.

### Testcontainers Port Conflicts

If tests fail with port binding errors, ensure no other PostgreSQL or Redis instances are occupying the default ports (5432, 6379). Testcontainers assigns random host ports, so this is rare but can happen with stale containers.

**Fix:** Run `docker container prune` to clean up stopped containers.

### SQLX Offline Mode

CI runs with `SQLX_OFFLINE=true`. If you add or modify SQL queries, you must regenerate the `.sqlx` offline query data:

```bash
cargo sqlx prepare --workspace
```

Commit the updated `.sqlx/` directory. Without this, CI will fail to compile SQL queries.

### Frontend Test Failures Due to Missing Mocks

If a component test fails with errors about missing browser APIs (e.g., `IntersectionObserver is not defined`), add the polyfill to `frontend/src/test/setup.ts`.

### Frontend Coverage Not Meeting Thresholds

If `npm run test:coverage` fails, check the HTML report (`coverage/index.html`) to identify uncovered files. Focus on adding tests for service functions and component branches.

### Test Isolation

- **Rust:** Each `TestFixture::new()` call creates fresh PostgreSQL and Redis containers with no residual data
- **Frontend:** `vi.clearAllMocks()` is called in `beforeEach` via `vitest.setup.ts`
- **E2E:** Playwright tests run sequentially (`fullyParallel: false`) for deterministic state

### Running Tests on macOS

The judge-worker sandbox (cgroups, chroot, seccomp) only works on Linux. Tests that exercise sandbox functionality will skip or fail on macOS. Pure unit tests and queue logic tests work on any platform.

<!-- GSD:docs -->
