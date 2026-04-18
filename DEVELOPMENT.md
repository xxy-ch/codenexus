<!-- generated-by: gsd-doc-writer -->

# Development Guide

This guide covers the local development workflow for AlgoMaster Online Judge -- a multi-tenant competitive programming platform built with Rust (Axum), React 19, and PostgreSQL + Redis.

## Table of Contents

- [Local Setup](#local-setup)
- [Project Structure](#project-structure)
- [Build Commands](#build-commands)
- [Adding a New Backend Feature](#adding-a-new-backend-feature)
- [Adding a New Frontend Feature](#adding-a-new-frontend-feature)
- [Database Migrations](#database-migrations)
- [API Development](#api-development)
- [Frontend Development](#frontend-development)
- [Judge Worker Development](#judge-worker-development)
- [Code Style](#code-style)
- [Branch Conventions](#branch-conventions)
- [PR Process](#pr-process)

---

## Local Setup

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Rust | 1.90.0 (pinned in `rust-toolchain.toml`) | `rustup` manages the toolchain automatically |
| Node.js | 22 | CI uses `setup-node@v4` with node 22 |
| npm | latest | Frontend package manager |
| Docker | latest | For PostgreSQL 16 and Redis 7 |
| PostgreSQL | 16 | Via Docker (`postgres:16-alpine`) |
| Redis | 7 | Via Docker (`redis:7-alpine`) |

### Step 1: Start Infrastructure

```bash
docker compose up -d postgres redis
```

### Step 2: Start the API Server

```bash
cd api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
JWT_SECRET=dev-secret \
WORKER_SECRET=dev-worker-secret \
cargo run
```

Migrations run automatically on startup via the embedded `sqlx::migrate!()` macro. The API listens on `0.0.0.0:3000` by default.

### Step 3: Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite serves the frontend on `http://localhost:5173` and proxies `/api` requests to the API server and `/ws` to the WebSocket endpoint.

### Step 4 (Optional): Start the Judge Worker

The judge worker requires Linux (cgroups, chroot, seccomp). On macOS, run it inside the Docker container instead:

```bash
docker compose up -d judge-worker
```

To run locally on Linux:

```bash
cd judge-worker
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
API_URL=http://localhost:3000 \
WORKER_SECRET=dev-worker-secret \
cargo run
```

### Bootstrap Demo Data

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
./scripts/bootstrap_demo.sh
```

---

## Project Structure

```
Online_Judge/
├── api/                    # Axum API server (thin shell -- routes in main.rs, modules for auth/db/ws/etc.)
├── api-infra/              # Shared API infrastructure: AppState, AppError, middleware, WebSocket, metrics
├── domain-classes/         # Class & assignment domain crate
├── domain-community/       # Discussions, blog, direct messages domain crate
├── domain-contests/        # Contest system domain crate
├── domain-imex/            # Import/export domain crate
├── domain-leaderboard/     # Leaderboard domain crate
├── domain-problems/        # Problem & test case domain crate
├── domain-search/          # Full-text search domain crate
├── domain-submissions/     # Submission lifecycle domain crate
├── domain-users/           # User management domain crate
├── judge-worker/           # Standalone judge worker (Redis Streams consumer, sandbox execution)
├── migration-tool/         # MySQL-to-PostgreSQL data migration utility
├── shared/                 # Shared types: Role, Permission, Claims, User models
├── frontend/               # React 19 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/     # UI components organized by domain (ui/, problems/, contest/, etc.)
│   │   ├── hooks/          # Custom React hooks (useAuth, useWebSocket, useProblems, etc.)
│   │   ├── services/       # API service layer (one file per domain)
│   │   ├── store/          # Zustand stores (authStore)
│   │   ├── types/          # TypeScript type definitions (one file per domain)
│   │   ├── pages/          # Route-level page components
│   │   ├── layouts/        # Layout wrappers (MainLayout, AdminLayout)
│   │   ├── lib/            # Utilities (cn(), formatting)
│   │   └── utils/          # Error handling and general utilities
│   ├── e2e/                # Playwright E2E tests
│   └── public/             # Static assets
├── scripts/                # Bootstrap and utility scripts
├── docs/                   # Project documentation
└── docker-compose.yml      # Multi-container orchestration
```

### Workspace Dependency Graph

The Rust workspace uses Cargo with a shared dependency table in the root `Cargo.toml`:

- `api` depends on `api-infra`, all `domain-*` crates, `shared`, and `judge-worker` (for types)
- Each `domain-*` crate depends on `api-infra` (for `AppState`) and `shared` (for types)
- `judge-worker` depends on `shared` only
- `shared` has zero internal dependencies (pure type definitions)

---

## Build Commands

### Rust (Backend)

| Command | Description |
|---------|-------------|
| `cargo check -p api` | Type-check the API crate without building |
| `cargo check --workspace` | Type-check all workspace crates |
| `cargo build --workspace` | Build all crates in debug mode |
| `cargo build --workspace --release` | Build all crates in release mode |
| `cargo test --workspace` | Run all tests across the workspace |
| `cargo test -p api` | Run tests for the API crate only |
| `cargo test -p judge-worker` | Run tests for the judge-worker crate only |
| `cargo fmt --check --all` | Check Rust formatting |
| `cargo fmt --all` | Auto-format Rust code |
| `cargo clippy --all-targets -- -W unused-imports -W unused-variables` | Run Clippy lints |

### Frontend

| Command | Description |
|---------|-------------|
| `cd frontend && npm install` | Install frontend dependencies |
| `cd frontend && npm run dev` | Start Vite dev server on port 5173 |
| `cd frontend && npm run build` | Production build to `frontend/dist/` |
| `cd frontend && npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `cd frontend && npm run lint` | ESLint on configured service/component paths |
| `cd frontend && npm run test` | Run Vitest unit tests (watch mode) |
| `cd frontend && npx vitest --run` | Run Vitest unit tests (single run) |
| `cd frontend && npx playwright test` | Run Playwright E2E tests |

### Docker

| Command | Description |
|---------|-------------|
| `docker compose up -d --build` | Build and start all services |
| `docker compose up -d postgres redis` | Start infrastructure only |
| `docker compose down -v` | Stop services and delete volumes |
| `docker compose logs -f api` | Follow API logs |

---

## Adding a New Backend Feature

The project follows a **module-per-domain** pattern. Each domain is a separate Cargo crate under the workspace root.

### Backend: Create a New Domain Crate

1. **Create the crate directory:**

   ```bash
   cargo new --lib domain-your-feature
   ```

2. **Add it to the workspace** in the root `Cargo.toml`:

   ```toml
   [workspace]
   members = ["api", "api-infra", ..., "domain-your-feature", ...]
   ```

3. **Add crate dependencies** in `domain-your-feature/Cargo.toml`:

   ```toml
   [dependencies]
   axum = { workspace = true }
   serde = { workspace = true }
   serde_json = { workspace = true }
   sqlx = { version = "0.8", features = ["runtime-tokio", "tls-rustls", "postgres", "chrono", "uuid"] }
   api-infra = { path = "../api-infra" }
   shared = { path = "../shared" }
   ```

4. **Follow the standard file layout:**

   ```
   domain-your-feature/src/
   ├── lib.rs      # Exports and router function
   ├── models.rs   # Request/response DTOs, DB row structs
   ├── routes.rs   # Axum route handlers (thin HTTP layer)
   └── service.rs  # Business logic and SQL queries
   ```

5. **Define the router** in `lib.rs`:

   ```rust
   pub mod models;
   pub mod routes;
   pub mod service;

   use api_infra::state::AppState;
   use axum::{routing::{get, post, put, delete}, Router};

   pub fn your_feature_router() -> Router<AppState> {
       Router::new()
           .route("/", get(routes::list_items))
           .route("/", post(routes::create_item))
           .route("/:id", get(routes::get_item))
           .route("/:id", put(routes::update_item))
           .route("/:id", delete(routes::delete_item))
   }
   ```

6. **Register the router** in `api/src/main.rs` inside `create_router()`:

   ```rust
   let protected_router = Router::new()
       // ... existing routes ...
       .nest("/your-feature", domain_your_feature::your_feature_router())
   ```

7. **Add the dependency** in `api/Cargo.toml`:

   ```toml
   domain-your-feature = { path = "../domain-your-feature" }
   ```

### Backend: Route Handler Pattern

Route handlers are thin -- they extract parameters, call service functions, and return responses:

```rust
use axum::extract::{Path, Query, State};
use api_infra::middleware::auth::AuthExtractor;
use api_infra::state::AppState;
use shared::models::role::Role;

pub async fn list_items(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Query(params): Query<ListQuery>,
) -> Result<Json<Vec<Item>>, AppError> {
    // Role check (inline)
    let role: Role = claims.role.parse().map_err(|_| AppError::Forbidden("Invalid role".into()))?;
    if !role.is_higher_or_equal(Role::Teacher) {
        return Err(AppError::Forbidden("Insufficient permissions".into()));
    }

    // Delegate to service layer
    let items = service::list_items(&state.db_pool, claims.school_id, &params).await?;
    Ok(Json(items))
}
```

### Backend: Service Layer Pattern

Service functions contain the business logic and SQL queries:

```rust
use sqlx::PgPool;
use anyhow::Result;

pub async fn list_items(pool: &PgPool, org_id: i64, params: &ListQuery) -> Result<Vec<Item>> {
    let rows = sqlx::query_as::<_, ItemRow>(
        "SELECT * FROM items WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    )
    .bind(org_id)
    .bind(params.limit)
    .bind(params.offset())
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(Item::from).collect())
}
```

---

## Adding a New Frontend Feature

### Frontend: Page Component

1. **Create the page** in `frontend/src/pages/your-feature/`:

   ```tsx
   // frontend/src/pages/your-feature/ItemList.tsx
   import { useQuery } from '@tanstack/react-query'
   import { yourFeatureService } from '@/services/yourFeature'

   export default function ItemList() {
     const { data, isLoading } = useQuery({
       queryKey: ['your-feature', 'list'],
       queryFn: () => yourFeatureService.list(),
     })

     if (isLoading) return <div>Loading...</div>
     return <div>{/* render items */}</div>
   }
   ```

2. **Create the service** in `frontend/src/services/yourFeature.ts`:

   ```typescript
   import api from './api'
   import type { Item } from '@/types/yourFeature'

   export const yourFeatureService = {
     list: async (): Promise<Item[]> => {
       const { data } = await api.get('/your-feature')
       return data
     },
   }
   ```

3. **Create the types** in `frontend/src/types/yourFeature.ts`:

   ```typescript
   export interface Item {
     id: number
     name: string
     created_at: string
   }
   ```

4. **Add the route** in `frontend/src/App.tsx` under the appropriate layout section.

---

## Database Migrations

### Migration File Format

Migrations are SQL files in `api/migrations/` with a three-digit numeric prefix:

```
000_create_update_updated_at_function.sql
001_create_organizations.sql
002_create_campuses.sql
003_create_users.sql
...
```

Each file contains plain SQL. Use `CREATE TABLE`, indexes, foreign keys, and triggers as needed:

```sql
CREATE TABLE your_table (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_your_table_org ON your_table(organization_id);

CREATE TRIGGER update_your_table_updated_at
    BEFORE UPDATE ON your_table
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Running Migrations

Migrations run automatically when the API server starts via the embedded `MIGRATOR` in `api/src/db/schema.rs`:

```rust
MIGRATOR.run(&pool).await?;
```

To run migrations manually or reset the database:

```bash
# Reset everything
docker compose down -v
docker compose up -d postgres redis

# Migrations will run on next API startup
cd api && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge cargo run
```

### Conventions

- Always include `organization_id` (multi-tenancy) as a foreign key to `organizations(id)`.
- Always add an index on `organization_id` for tenant-scoped queries.
- Use `BIGSERIAL` for auto-incrementing primary keys (or `UUID` where appropriate).
- Include `created_at` and `updated_at` columns with the `NOW()` default.
- Add a trigger for `updated_at` using the `update_updated_at_column()` function (defined in migration `000`).

---

## API Development

### Middleware Pipeline

Requests pass through middleware in this order (outer to inner):

1. **CORS** -- `tower_http::cors::CorsLayer` (configurable origins)
2. **Request ID** -- `middleware::request_id::request_id_middleware`
3. **Metrics** -- `middleware::metrics::track_metrics`
4. **Rate Limiting** -- `tower_governor::GovernorLayer` (30 requests/second burst per IP, on protected routes)
5. **Auth** -- `middleware::auth::auth_middleware` (JWT validation, Redis blacklist check)
6. **Tenant** -- `middleware::tenant::tenant_middleware` (extracts `school_id` from JWT claims)

Health endpoints (`/health/live`, `/health/ready`, `/metrics`, `/internal/worker/heartbeat`) bypass rate limiting and auth.

### AppState

The shared application state (`api-infra/src/state.rs`) contains:

```rust
pub struct AppState {
    pub db_pool: PgPool,
    pub redis_pool: Option<deadpool_redis::Pool>,
    pub redis_url: String,
    pub jwt_service: Arc<dyn TokenService>,
    pub jwt_secret: String,
    pub worker_secret: String,
    pub websocket_server: Arc<WebSocketServer>,
    pub class_membership_checker: Arc<dyn ClassMembershipChecker>,
    pub prometheus_handle: PrometheusHandle,
    pub preview_cache: Arc<PreviewCache>,
}
```

Access it in route handlers via `State(state): State<AppState>`.

### Auth Pattern

- JWT in `Authorization: Bearer <token>` header or `access_token` cookie
- Refresh tokens in `refresh_token` cookie (HttpOnly, SameSite=Strict)
- Token blacklist in Redis (`bl:{jti}`) on logout
- Claims contain: `sub` (UUID), `username`, `email`, `role`, `school_id`, `campus_id`, `exp`, `jti`
- Use `AuthExtractor(claims)` to extract authenticated user info in route handlers

### RBAC

Role hierarchy (defined in `shared/src/models/role.rs`):

```
Root > OrganizationAdmin > CampusAdmin > Teacher > Student
```

Inline role checks in route handlers:

```rust
fn require_teacher_plus(role: &str) -> Result<Role, StatusCode> {
    let role = role.parse::<Role>().map_err(|_| StatusCode::FORBIDDEN)?;
    if !role.is_higher_or_equal(Role::Teacher) {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(role)
}
```

### Error Handling

Use `AppError` (defined in `api-infra/src/error.rs`) for all route errors:

```rust
pub enum AppError {
    Auth(String),       // 401
    Forbidden(String),  // 403
    NotFound(String),   // 404
    Validation(String), // 400
    Database(String),   // 500
    Internal(String),   // 500
}
```

Response format: `{ "error": "<message>", "status": <code> }`.

Service layer functions return `anyhow::Result<T>`. The `From<anyhow::Error> for AppError` conversion handles the mapping via `?` in route handlers.

---

## Frontend Development

### State Management

- **Zustand** (`frontend/src/store/authStore.ts`) -- client-side auth state (user, token, isAuthenticated)
- **TanStack React Query** -- server state caching for all API data
- **URL state** -- query parameters for filters, pagination, search

### Service Layer Pattern

Services are plain objects with async methods in `frontend/src/services/`:

```typescript
import api from './api'
import type { Item } from '@/types/yourFeature'

export const yourFeatureService = {
   list: async (): Promise<Item[]> => {
     const { data } = await api.get('/your-feature')
     return data
   },
   getById: async (id: number): Promise<Item> => {
     const { data } = await api.get(`/your-feature/${id}`)
     return data
   },
}
```

Backend `snake_case` fields are consumed directly (no camelCase conversion in the service layer).

### Component Patterns

- **UI primitives** in `frontend/src/components/ui/` -- shadcn-based components styled with CVA
- **Domain components** in `frontend/src/components/{domain}/` -- feature-specific components
- **Utility** `cn()` from `@/lib/utils` for Tailwind class merging (uses `clsx` + `tailwind-merge`)

### Path Alias

`@/` maps to `./src/` (configured in both `vite.config.ts` and `tsconfig.json`).

### Route Guards

- `ProtectedRoute` -- redirects to `/login` if not authenticated
- `PublicRoute` -- redirects to `/dashboard` if already authenticated
- `AdminRoute` -- redirects to `/unauthorized` if not admin role

### Forms

Use `react-hook-form` with `zod` schemas for validation:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function MyForm() {
  const { register, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  // ...
}
```

---

## Judge Worker Development

### Architecture

The judge worker is a standalone Rust binary that:

1. Consumes submission tasks from Redis Streams (`submissions` and `submissions:contest`)
2. Fetches test cases from PostgreSQL
3. Compiles user code in a sandboxed environment
4. Executes the binary with cgroups memory/CPU limits, chroot filesystem isolation, and seccomp syscall filtering
5. Compares output against expected results
6. Posts results back to the API via HTTP callbacks

### Key Modules

| Module | Path | Purpose |
|--------|------|---------|
| Queue consumer | `judge-worker/src/queue/` | Redis Streams XREADGROUP consumer, dead-letter queue |
| Processor | `judge-worker/src/processor/` | Submission lifecycle: fetch, compile, execute, compare |
| Compiler | `judge-worker/src/compiler/` | Language detection and compilation config for 6 languages |
| Sandbox | `judge-worker/src/sandbox/` | cgroups, chroot, seccomp isolation |
| Circuit breaker | `judge-worker/src/circuit_breaker.rs` | Prevents cascading failures when API is unreachable |
| Heartbeat | `judge-worker/src/heartbeat.rs` | Periodic health reports to the API |

### Sandbox Configuration

Default sandbox limits (from `judge-worker/src/sandbox/mod.rs`):

```rust
pub struct SandboxConfig {
    pub sandbox_root: PathBuf,        // /var/lib/onlinejudge/sandbox
    pub cpu_time_limit_ms: u64,       // 2000 ms
    pub memory_limit_bytes: u64,      // 268 MB (256000 KB)
    pub pids_max: u32,                // 64 processes
}
```

### Error Handling

- **Processing errors**: Logged, message ACKed to prevent infinite retries
- **API callback failures**: 3 retries with exponential backoff (1s, 2s, 4s)
- **Permanent failures**: Written to DLQ stream for manual inspection
- **Main loop errors**: Exponential backoff capped at 60s

### Docker Requirements

The judge worker requires Linux capabilities for sandboxing:

```yaml
cap_add:
  - SYS_PTRACE
  - SYS_ADMIN
security_opt:
  - no-new-privileges:true
```

---

## Code Style

### Rust Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Files/modules | `snake_case` | `user_service.rs`, `auth_middleware` |
| Structs | `PascalCase` | `AppState`, `AppError` |
| Functions | `snake_case` | `get_user_profile`, `ensure_admin` |
| Enums | `PascalCase` | `AppError::Auth`, `Role::Teacher` |
| Constants | `SCREAMING_SNAKE_CASE` | `TENANT_HEADER`, `MIGRATOR` |
| Router functions | `<domain>_router()` | `user_router()`, `contests_router()` |
| Request types | `*Request` | `LoginRequest`, `CreateProblemRequest` |
| Response types | `*Response` | `AuthResponse`, `ProblemsListResponse` |
| Query params | `*Query` | `AdminUserQuery`, `SearchQuery` |

### TypeScript Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Files | `PascalCase.tsx` (components), `camelCase.ts` (services/hooks) | `Button.tsx`, `useAuth.ts` |
| Components | `PascalCase` | `MainLayout`, `ProblemDetail` |
| Hooks | `use*` prefix | `useAuth`, `useWebSocket`, `useCountdown` |
| Services | `<domain>Service` object export | `contestsService`, `problemsService` |
| Types | `PascalCase` interfaces | `Problem`, `Contest`, `User` |
| Constants | `SCREAMING_SNAKE_CASE` | `API_CONFIG`, `FEATURE_FLAGS` |

### Formatting and Linting

**Rust:**
- `cargo fmt` -- uses `rustfmt` (included in `rust-toolchain.toml`)
- `cargo clippy` -- configured with `-W unused-imports -W unused-variables`

**TypeScript:**
- ESLint 9 with `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Run: `cd frontend && npm run lint`
- Type check: `cd frontend && npm run typecheck`

### File Organization

- Rust files: 200-400 lines typical, 800 max. Extract into separate modules when files grow.
- Frontend files: organized by feature/domain, not by type.
- One type definition file per domain in `frontend/src/types/`.

---

## Branch Conventions

No formal branch naming convention is documented. The default branch is `master`.

In practice, use descriptive branch names that reflect the purpose:

- `feat/your-feature` for new features
- `fix/issue-description` for bug fixes
- `refactor/area-description` for refactoring

---

## PR Process

### CI Checks

All pull requests run through `.github/workflows/ci.yml` which includes:

1. **Rust job** -- `cargo fmt --check`, `cargo clippy`, `cargo test --workspace`
2. **Frontend job** -- `npm ci`, `npm run lint`, `npx vitest --run`, `npm run build`
3. **Docker build** -- verifies all three Dockerfiles build (only on `master` push)

### Quality Gates

Before merging, ensure:

```bash
# Backend
cargo fmt --check --all
cargo clippy --all-targets -- -W unused-imports -W unused-variables
cargo test --workspace

# Frontend
cd frontend
npm run typecheck
npm run lint
npx vitest --run
npm run build
```

### PR Guidelines

- Ensure CI passes before requesting review.
- Keep PRs focused on a single concern.
- Include a clear description of what changed and why.
- Add tests for new functionality.
- Verify no `console.log` statements in frontend code.
<!-- GSD:docs -->
