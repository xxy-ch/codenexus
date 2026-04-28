# Online Judge Testing Strategy

## Table of Contents

1. [Overview](#overview)
2. [Backend (Rust) Testing](#backend-rust-testing)
3. [Frontend Unit/Integration Testing](#frontend-unitintegration-testing)
4. [E2E Testing (Playwright)](#e2e-testing-playwright)
5. [Test Coverage Status](#test-coverage-status)
6. [Known Test Gaps](#known-test-gaps)
7. [Running Tests](#running-tests)

---

## Overview

The project has three test layers:

| Layer | Framework | Location | Status |
|-------|-----------|----------|--------|
| Backend unit/integration | Rust `#[test]` / `#[tokio::test]` | `api/src/` (inline `#[cfg(test)]` modules) | Partial -- many tests ignored, requires Docker |
| Frontend unit/integration | Vitest + React Testing Library | `frontend/src/**/__tests__/*.test.ts(x)` | Active -- service mocks + component renders |
| E2E | Playwright | `frontend/e2e/*.spec.ts` | Active -- smoke tests against running server |

---

## Backend (Rust) Testing

### `autotests = false`

The `api/Cargo.toml` sets `autotests = false`, meaning Rust does not auto-discover test files. All tests live as **inline `#[cfg(test)] mod tests` blocks** within source files, or in the dedicated `release_gate_tests.rs` module.

### Test Module Structure

Tests are embedded in the files they test:

```
api/src/error.rs              -- (no inline tests)
api/src/auth/routes.rs        -- #[cfg(test)] mod tests { ... } (4 tests)
api/src/middleware/auth.rs     -- #[cfg(test)] mod tests { ... } (3 tests)
api/src/middleware/tenant.rs   -- #[cfg(test)] mod tests { ... } (5 tests)
api/src/middleware/permission.rs -- #[cfg(test)] mod tests { ... } (1 test)
api/src/db/mod.rs             -- #[cfg(test)] mod tests { ... } (3 tests)
api/src/db/schema.rs          -- #[cfg(test)] mod tests { ... } (1 test, ignored)
api/src/release_gate_tests.rs -- standalone test module (3 tests)
```

### Release Gate Tests (`release_gate_tests.rs`

Registered via `#[cfg(test)] mod release_gate_tests;` in `api/src/lib.rs`.

These are **integration-level authorization tests** that verify tenant isolation and permission boundaries:

| Test | Status | Requirement |
|------|--------|-------------|
| `class_and_assignment_authorization_assignment_read_is_member_scoped` | `#[ignore]` -- requires Docker Postgres | Verifies class assignment access is scoped to enrolled members |
| `contest_and_leaderboard_scope_student_writes_and_cross_tenant_views_are_blocked` | **Active** (no Docker needed) | Verifies students cannot create contests or view cross-tenant leaderboards |
| `community_message_search_scope_filters_private_and_cross_tenant_content` | `#[ignore]` -- requires Docker Postgres | Verifies search respects tenant boundaries and private visibility |

### Test Infrastructure Requirements

**Docker-backed tests** (marked `#[ignore]`):
- Require a running Docker daemon.
- Use `testcontainers` + `testcontainers-modules` (postgres) to spin up ephemeral Postgres containers.
- Helper function `start_test_db()` creates the container, returns a connection URL.
- Helper `connect_and_migrate()` connects and runs all SQLx migrations.
- Dev-dependencies: `testcontainers`, `testcontainers-modules`, `tower` (for `ServiceExt`), `tokio-test`, `env_logger`.

**Tests without Docker**:
- Use `sqlx::PgPool::connect_lazy("postgres://localhost/nonexistent")` to create a dummy pool that never connects.
- Focus on HTTP-layer behavior (auth middleware rejecting missing/invalid tokens, permission checks, etc.).
- Create `tokio::runtime::Runtime` manually for sync `#[test]` functions that need async.

### Running Ignored Backend Tests

```bash
# Run only non-ignored tests
cargo test -p api

# Run all tests including Docker-backed ones
cargo test -p api -- --ignored

# Run everything
cargo test -p api -- --include-ignored
```

### Backend Test Patterns

**Auth middleware tests** (in `middleware/auth.rs`):
```rust
fn create_test_app() -> Router {
    let state = crate::AppState { /* lazy pool, no redis */ };
    Router::new()
        .route("/protected", get(protected_handler))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
        .with_state(state)
}

#[tokio::test]
async fn test_auth_middleware_missing_token() {
    let app = create_test_app();
    let response = app.oneshot(Request::builder().uri("/protected").body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}
```

**Auth route tests** (in `auth/routes.rs`):
- Require `DATABASE_URL` env var pointing to a real Postgres (marked `#[ignore]`).
- Test login with valid/invalid credentials, refresh token flow, logout.

**Helper pattern** for release gate tests:
```rust
fn build_user(id: Uuid, username: &str, role: &str, school_id: i64) -> shared::models::User { ... }
fn auth_header(jwt_service: &JwtService, user: &shared::models::User) -> HeaderValue { ... }
fn build_state(pool: PgPool) -> AppState { ... }
fn build_protected_app(state: AppState, router: Router) -> Router { ... }
async fn insert_organization(pool: &PgPool, id: i64, name: &str, slug: &str) { ... }
async fn insert_user(pool: &PgPool, user: &shared::models::User) { ... }
async fn insert_problem(pool: &PgPool, ...) { ... }
// etc.
```

---

## Frontend Unit/Integration Testing

### Vitest Configuration

```typescript
// frontend/vitest.config.ts
{
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', './src/test/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: { global: { branches: 80, functions: 80, lines: 80, statements: 80 } },
    },
  },
  resolve: { alias: { '@': resolve(__dirname, './src') } },
}
```

- **Globals enabled**: `describe`, `it`, `expect`, `vi` available without import.
- **jsdom environment**: DOM simulation for component tests.
- **Coverage threshold**: 80% across all metrics (branches, functions, lines, statements).
- **Path alias**: `@/` maps to `src/`.

### Test Setup Files

**`src/test/setup.ts`**: Mocks `global.fetch` with `vi.fn()`, clears mocks in `beforeEach`.

**`src/test/vitest.setup.ts`**: Extends `@testing-library/jest-dom` matchers. Mocks browser APIs not available in jsdom:
- `IntersectionObserver`
- `ResizeObserver`
- `window.matchMedia`

### Test Locations

```
frontend/src/components/ui/__tests__/primitives.test.tsx    # UI primitive rendering
frontend/src/pages/user/__tests__/DashboardEnhanced.test.tsx
frontend/src/pages/user/__tests__/ContestList.test.tsx
frontend/src/pages/user/__tests__/ContestDetail.test.tsx
frontend/src/pages/user/__tests__/SubmissionDetail.test.tsx
frontend/src/pages/user/__tests__/SubmissionHistory.test.tsx
frontend/src/pages/user/__tests__/ProblemIDEEnhanced.test.tsx
frontend/src/pages/teacher/__tests__/ClassManagement.test.tsx
frontend/src/services/__tests__/messages.test.ts
frontend/src/services/__tests__/searchApi.test.ts
frontend/src/services/__tests__/contests.test.ts
frontend/src/services/__tests__/admin.test.ts
frontend/src/services/__tests__/communityApi.test.ts
frontend/src/services/__tests__/classes.test.ts
frontend/src/services/__tests__/ranking.test.ts
frontend/src/services/__tests__/plagiarism.test.ts
frontend/src/services/__tests__/smokeCoreFlows.test.ts
frontend/src/services/__tests__/judgeConfig.test.ts
```

Total: **18 test files** (1 component test file, 8 page test files, 9 service test files).

### Service Test Pattern

Services are tested by mocking the axios instance:

```typescript
// services/__tests__/contests.test.ts
const { mockApi } = vi.hoisted(() => ({
  mockApi: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('@/services/api', () => ({ default: mockApi }))

import { contestsService } from '@/services/contests'

describe('contestsService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('maps backend contest resources into frontend contest cards', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { contests: [...], total: 1 } })
    const data = await contestsService.getContests({ page: 1, limit: 20 })
    expect(mockApi.get).toHaveBeenCalledWith('/contests?page=1&limit=20')
    expect(data.total).toBe(1)
  })
})
```

Key patterns:
- `vi.hoisted()` to create mocks that are available during module hoisting.
- `vi.mock('@/services/api', ...)` to replace the axios instance.
- Tests verify both the API call shape and data transformation logic.

### Component Test Pattern

```typescript
// components/ui/__tests__/primitives.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('ui primitives', () => {
  it('renders primary button with project styling classes', () => {
    render(<Button>Sign In</Button>)
    const button = screen.getByRole('button', { name: 'Sign In' })
    expect(button).toHaveClass('bg-primary')
    expect(button).toHaveClass('rounded-lg')
  })
})
```

### Smoke Core Flows Test

`services/__tests__/smokeCoreFlows.test.ts` tests all major service endpoints in one file: auth, problems, discussions, blog, messages, plagiarism. Verifies the service layer can be called and returns expected shapes.

---

## E2E Testing (Playwright)

### Configuration

```typescript
// frontend/playwright.config.ts
{
  testDir: './e2e',
  fullyParallel: false,
  timeout: 10000,
  retries: 0,
  use: { headless: true, channel: 'chrome' },
  reporter: [['html'], ['list']],
}
```

- Chrome channel (not Chromium).
- Sequential execution for debugging stability.
- No retries.
- Base URL from `PLAYWRIGHT_BASE_URL` env var, defaulting to `http://127.0.0.1:5173`.

### E2E Test File

Single file: `frontend/e2e/smoke.spec.ts` with 6 tests in a `delivery smoke` describe block:

| Test | What it verifies |
|------|-----------------|
| Login page renders | Heading, username/password inputs visible |
| Multi-role login | Student (2001) and teacher (3001) can log in and reach their pages |
| Admin login | Admin (1001) reaches dashboard with progress panel |
| Problem repository + search | Admin can browse problems, search, blog |
| Admin plagiarism + problem management | Admin can access user management, plagiarism reports, problem CRUD |
| Full user flow | Creates a submission, views it, opens IDE, classes, messages, ranking, contests, scoreboard |

Helper functions:
```typescript
async function loginAs(page, username, password = 'admin123') { ... }
async function loginAsAdmin(page) { ... }
```

Tests use demo credentials and expect Chinese/English bilingual text (i18n).

### Running E2E Tests

```bash
# Requires running dev server + backend
cd frontend
npx playwright test
```

---

## Test Coverage Status

### Backend

| Area | Coverage | Notes |
|------|----------|-------|
| Auth middleware | Good | 3 tests (missing token, invalid token, valid token) |
| Tenant middleware | Good | 5 tests (missing tenant, valid from claims, ignores header, context availability, claims override header) |
| Permission middleware | Minimal | 1 test (role hierarchy) |
| Auth routes | Moderate | 4 tests (login invalid/valid, refresh invalid/valid, logout) -- all `#[ignore]`, need DB |
| DB pool creation | Minimal | 2 tests (invalid URL, connection) |
| Release gate (authorization) | Good | 3 tests (class auth, contest/leaderboard scope, search scope) |
| Service layer | **None** | No unit tests for UserService, ContestService, etc. |
| Other route handlers | **None** | No tests for problems, submissions, classes, discussions, blog, etc. |

### Frontend

| Area | Coverage | Notes |
|------|----------|-------|
| UI primitives | Minimal | 1 test file (Button, Input, Loading) |
| Page components | Moderate | 8 test files for pages |
| Service layer | Good | 9 test files covering all major services |
| Smoke flows | Good | 1 file covering all service endpoints |
| Hooks | **None** | No tests for useAuth, useWebSocket, etc. |
| Store | **None** | No tests for authStore |
| E2E smoke | Good | 6 tests covering critical user paths |

---

## Known Test Gaps

### Backend (Critical)

1. **No service-layer unit tests**: `UserService`, `ContestService`, `SubmissionService`, etc. have zero test coverage. Business logic (registration, password hashing, role assignment) is untested in isolation.
2. **Most route handlers untested**: Only `auth::routes` has handler-level tests. All other modules (problems, submissions, classes, discussions, blog, notifications, leaderboard, messages, search, plagiarism) have zero test coverage.
3. **Docker dependency for integration tests**: 5 of ~15 backend tests are `#[ignore]` and require Docker. This means CI must have Docker available to run the full test suite.
4. **No judge-worker tests beyond processor/tests.rs**: The sandbox, compiler, queue, and DLQ modules lack coverage.
5. **Permission middleware under-tested**: Only role hierarchy is tested; `require_permission`, `require_any_permission`, `require_all_permissions`, `require_min_role`, `require_organization_access`, `require_campus_access` have no handler-level tests.

### Frontend (Moderate)

1. **No hook tests**: `useAuth`, `useWebSocket`, `useCommunityUpdates`, `useCountdown`, `useProblems` are untested.
2. **No store tests**: `authStore.ts` Zustand store is untested.
3. **Page component tests may be shallow**: Many page tests likely render without full provider context (QueryClient, Router).
4. **No visual regression tests**: No snapshot or visual comparison tests.

### E2E (Minor)

1. **Single spec file**: All E2E tests in one file. Should be split by feature area.
2. **No negative path tests**: E2E only tests happy paths; no unauthorized access, error states, or edge cases.
3. **Hardcoded demo credentials**: Tests depend on specific database seed data (usernames 1001, 2001, 3001).

---

## Running Tests

### Backend

```bash
# Quick: only non-ignored tests (no Docker needed)
cargo test -p api

# Full: include Docker-backed integration tests
cargo test -p api -- --include-ignored

# Single module
cargo test -p api -- middleware::auth::tests

# With logging
RUST_LOG=debug cargo test -p api
```

### Frontend Unit Tests

```bash
cd frontend

# Run all tests
npx vitest

# Run with coverage
npx vitest --coverage

# Run once (CI mode)
npx vitest --run

# Run specific file
npx vitest --run src/services/__tests__/contests.test.ts
```

### E2E Tests

```bash
cd frontend

# Install Playwright browsers (first time)
npx playwright install chrome

# Run E2E (requires dev server + backend running)
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test
npx playwright test -g "login page renders"
```
