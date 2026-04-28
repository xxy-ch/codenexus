# Online Judge Codebase Conventions

## Table of Contents

1. [Project Structure Overview](#project-structure-overview)
2. [Rust Backend Conventions](#rust-backend-conventions)
3. [TypeScript Frontend Conventions](#typescript-frontend-conventions)
4. [API Route Patterns](#api-route-patterns)
5. [Database Query Patterns](#database-query-patterns)
6. [Frontend Component Patterns](#frontend-component-patterns)
7. [Naming Conventions](#naming-conventions)
8. [Import Patterns](#import-patterns)
9. [Logging Patterns](#logging-patterns)
10. [Shared Crate Conventions](#shared-crate-conventions)

---

## Project Structure Overview

```
Online_Judge/
  api/                  # Rust Axum backend
  judge-worker/         # Rust judge worker (sandboxed code execution)
  shared/               # Shared Rust crate (models, types)
  frontend/             # React + TypeScript frontend (Vite)
  migrations/           # SQLx migration files (000_*.sql)
```

---

## Rust Backend Conventions

### Error Handling

The project uses a **unified `AppError` enum** defined in `api/src/error.rs`. All route modules must import from here -- not define per-module error types.

```rust
// api/src/error.rs
pub enum AppError {
    Auth(String),        // -> 401
    Validation(String),  // -> 400
    Database(String),    // -> 500
    Internal(String),    // -> 500
}
```

Key patterns:
- `AppError` implements `IntoResponse` mapping each variant to an HTTP status code.
- JSON error body: `{ "error": "<message>", "status": <code> }`.
- `From<anyhow::Error>` and `From<sqlx::Error>` conversions exist.
- Services return `anyhow::Result<T>`. Routes convert to `AppError` via `?`.
- Inline role checks in routes use `ensure_admin(role: &str) -> Result<(), AppError>`.

### Module Organization

Every domain module follows the same 3-file pattern:

```
api/src/<domain>/
  mod.rs      # Re-exports: `pub use routes::<domain>_router;`
  models.rs   # Request/response structs with serde + sqlx::FromRow
  routes.rs   # Axum router function + handler functions
  service.rs  # Business logic struct (takes PgPool + JwtService)
```

Modules currently following this pattern: `users`, `problems`, `contests`, `classes`, `discussions`, `blog`, `search`, `submissions`, `notifications`, `leaderboard`, `messages`.

Additional files some modules have:
- `test_cases.rs` (problems) -- test case management
- `problem_access.rs`, `access.rs` (problems) -- authorization helpers
- `authz.rs` (middleware) -- RBAC middleware

### Service Pattern

Services are instantiated per-request from the pool and JWT service:

```rust
pub struct UserService {
    pool: PgPool,
    jwt_service: JwtService,
}

impl UserService {
    pub fn new(pool: PgPool, jwt_service: JwtService) -> Self { ... }
    pub async fn register(&self, req: RegisterRequest) -> Result<UserProfile> { ... }
}
```

Route handlers construct the service inline:

```rust
async fn get_me(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
) -> Result<impl IntoResponse, AppError> {
    let service = UserService::new(state.db_pool, state.jwt_service);
    let user = service.get_user_profile(claims.sub).await?;
    Ok(Json(user))
}
```

### AppState

Defined in `api/src/lib.rs` (and duplicated in `main.rs`):

```rust
pub struct AppState {
    pub db_pool: sqlx::PgPool,
    pub redis_pool: Option<deadpool_redis::Pool>,
    pub redis_url: String,
    pub jwt_service: auth::JwtService,
    pub jwt_secret: String,
    pub worker_secret: String,
    pub websocket_server: std::sync::Arc<websocket::WebSocketServer>,
}
```

---

## TypeScript Frontend Conventions

### Tech Stack

- **Framework**: React 19 with Vite 7
- **Routing**: react-router-dom v7
- **State**: Zustand (auth store), TanStack React Query (server state)
- **HTTP**: Axios with automatic token refresh interceptor
- **Forms**: react-hook-form + zod validation
- **UI**: shadcn (base-ui primitives) + class-variance-authority (CVA)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Markdown**: react-markdown + remark-gfm
- **Code Editor**: Monaco Editor + CodeMirror
- **Charts**: Recharts

### Service Layer

Services live in `frontend/src/services/` and follow this pattern:

```typescript
// services/<domain>.ts
import api from './api'
import type { SomeType } from '@/types/<domain>'

export const someService = {
  async getList(filters): Promise<Response> {
    const response = await api.get(`/endpoint?${params}`)
    // Normalize/transform response data
    return normalizedData
  },
}
```

Key conventions:
- Services are plain objects with async methods (not classes).
- They import the shared `api` axios instance from `./api`.
- API responses are normalized/transformed inside the service layer.
- Raw backend data is coerced to frontend types (e.g., `String(problem.id)`).
- Backend `snake_case` fields are consumed directly (no camelCase conversion).
- Feature-flagged services check `FEATURE_FLAGS` from `./config.ts`.

### Hooks Pattern

Custom hooks in `frontend/src/hooks/`:

```typescript
// hooks/useAuth.ts
export function useAuth() {
  // Reads from zustand store
  // Wraps store actions with navigation + error handling
  // Returns { user, isAuthenticated, isLoading, login, logout, ... }
}
```

Hooks compose zustand stores with React Router navigation and error handling. They do not contain API calls directly -- that stays in services + stores.

### State Management

- **Zustand** for client-side auth state (`store/authStore.ts`).
- **TanStack React Query** for server state caching and refetching.
- **URL state** for filters/search params (used with `useSearchParams`).

### Type Definitions

Types live in `frontend/src/types/` -- one file per domain:

```typescript
// types/problems.ts
export interface Problem {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  // ...
}
```

Convention: string literal unions over enums for discriminant types. JSDoc comments on interfaces.

### Lazy Loading

All page components use a `lazyNamed` helper for code splitting:

```typescript
const lazyNamed = <T,>(loader: () => Promise<T>, exportName: keyof T) =>
  lazy(async () => {
    const module = await loader()
    return { default: module[exportName] as ComponentType }
  })
```

---

## API Route Patterns

### Router Registration (main.rs)

Routes are split into public and protected routers:

```rust
// Public routes (no auth required)
let public_router = Router::new()
    .route("/health", get(health_check))
    .route("/auth/login", post(auth::login))
    .route("/auth/register", post(auth::register))
    .route("/auth/refresh", post(auth::refresh))
    .route("/auth/logout", post(auth::logout))
    .route("/ws", get(websocket::handler));

// Protected routes (auth + tenant middleware)
let protected_router = Router::new()
    .nest("/users", users::user_router())
    .nest("/problems", problems::problems_router())
    // ... more nested routers
    .route_layer(middleware::from_fn(middleware::tenant::tenant_middleware))
    .route_layer(middleware::from_fn_with_state(state.clone(), middleware::auth::auth_middleware));
```

### Middleware Stacking Order (outer to inner)

1. **CORS** (`tower_http::cors::CorsLayer`) -- allows all origins
2. **Rate limiting** (`tower_governor::GovernorLayer`) -- 30 req/min per IP
3. **Auth middleware** -- extracts JWT from `Authorization` header or cookie, inserts `Claims` into request extensions
4. **Tenant middleware** -- reads `school_id` from JWT claims (never from headers), inserts `TenantContext`
5. **Route handlers**

### Domain Router Pattern

Each domain exports a router function:

```rust
// users/routes.rs
pub fn user_router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/register", axum::routing::post(register))
        .route("/me", axum::routing::get(get_me))
        .route("/me", axum::routing::patch(update_me))
        // Admin routes
        .route("/admin", axum::routing::get(list_admin_users))
        .route("/admin/:user_id/role", axum::routing::patch(update_user_role))
}
```

### Handler Signature Pattern

```rust
async fn handler_name(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,  // if auth needed
    Path(id): Path<Uuid>,                   // if path param
    Query(params): Query<QueryParams>,      // if query params
    Json(body): Json<RequestType>,          // if JSON body
) -> Result<impl IntoResponse, AppError> {
    let service = SomeService::new(state.db_pool, state.jwt_service);
    // ... business logic
    Ok(Json(response))
}
```

### Permission Middleware (middleware/permission.rs)

RBAC checks via composable middleware factories:

```rust
// Single permission
.route_layer(middleware::from_fn(require_permission(Permission::ManageUsers)))
// Any of multiple permissions
.route_layer(middleware::from_fn(require_any_permission(&[Perm::A, Perm::B])))
// Minimum role level
.route_layer(middleware::from_fn(require_min_role(Role::Teacher)))
```

### Auth Pattern

- JWT in `Authorization: Bearer <token>` header or `access_token` cookie.
- Refresh tokens in `refresh_token` cookie (HttpOnly, SameSite=Strict).
- Token blacklist in Redis (`bl:{jti}`) on logout.
- Claims contain: `sub` (UUID), `username`, `email`, `role`, `school_id`, `campus_id`, `exp`, `jti`.

---

## Database Query Patterns

### Connection Pool

Created via `db::create_pool(url, max_connections, acquire_timeout)` using `sqlx::PgPoolOptions`.

### Migrations

- Embedded at compile time via `sqlx::migrate!()` in `api/src/db/schema.rs`.
- Files in `api/migrations/` with `NNN_description.sql` naming.
- Auto-run on server startup: `MIGRATOR.run(&pool).await`.
- 20+ migration files covering organizations, users, problems, submissions, contests, classes, discussions, plagiarism, messages.

### Query Patterns

**Simple fetch:**
```rust
sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
    .bind(user_id)
    .fetch_one(&self.pool)
    .await?
```

**Parameterized with optional filters:**
```rust
sqlx::query_as::<_, AdminUserRow>(&query_sql)
    .bind(search.as_deref())   // Option<&str> -> NULL if None
    .bind(role)                // Option<&str>
    .bind(status)
    .fetch_all(&self.pool)
    .await?
```

**Dynamic query building:**
```rust
let mut update_parts = vec![];
let mut param_count = 0;
if updates.email.is_some() {
    param_count += 1;
    update_parts.push(format!("email = COALESCE(${}, email)", param_count));
}
// ... then format!("UPDATE users SET {} WHERE id = ${}", ...)
```

**Scalar queries:**
```rust
sqlx::query_scalar::<_, String>("SELECT role FROM user_roles WHERE user_id = $1")
    .bind(user_id)
    .fetch_one(&self.pool)
    .await?
```

### Conventions

- Always use parameterized queries (`$1`, `$2`, etc.) -- never string interpolation.
- `query_as::<_, T>()` for mapping to typed structs (must derive `FromRow`).
- `query_scalar::<_, T>()` for single value returns.
- `fetch_one` / `fetch_optional` / `fetch_all` depending on expected cardinality.
- Manual `ORDER BY created_at ASC LIMIT 1` for deterministic role queries.

---

## Frontend Component Patterns

### Design System (shadcn / base-ui)

The project uses **shadcn v4** with **base-ui** primitives instead of Radix:

- `Button` -- from `@base-ui/react/button`, styled with CVA (variants: default, outline, secondary, ghost, destructive, link; sizes: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg).
- `Badge` -- from `@base-ui/react`, uses `useRender` and `mergeProps`.
- `Dialog`, `DropdownMenu`, `Separator`, `Table`, `Tabs` -- from shadcn (lowercase filenames).
- `Input`, `Card`, `Loading`, `Skeleton`, `StatusBadge`, `Toast` -- custom components (PascalCase filenames).

### Styling Approach

- **Tailwind CSS v4** with `@tailwindcss/postcss`.
- Utility class merging via `cn()` from `@/lib/utils` (uses `clsx` + `tailwind-merge`).
- CVA (class-variance-authority) for component variant definitions.
- `tw-animate-css` for animation utilities.
- `@fontsource-variable/geist` for the Geist font family.
- Dark mode support via `dark:` Tailwind prefixes.

### Component Structure

```
frontend/src/components/
  ui/           # Design system primitives (Button, Input, Badge, etc.)
  layout/       # Layout components (Sidebar, Header)
  auth/         # Auth route guards (ProtectedRoute, PublicRoute, AdminRoute)
  messages/     # Direct messaging components
```

### Layout Pattern

Two layouts: `MainLayout` (for authenticated users, with Sidebar + Header) and `AdminLayout` (for admin pages). Both use `<Outlet />` from react-router-dom.

### Route Guards

- `ProtectedRoute` -- redirects to `/login` if not authenticated.
- `PublicRoute` -- redirects to `/dashboard` if already authenticated.
- `AdminRoute` -- redirects to `/unauthorized` if not admin role.

---

## Naming Conventions

### Rust

| Element | Convention | Example |
|---------|-----------|---------|
| Files/modules | `snake_case` | `user_service.rs`, `auth_middleware` |
| Structs | `PascalCase` | `UserService`, `AppState`, `AppError` |
| Functions | `snake_case` | `get_user_profile`, `ensure_admin` |
| Enums | `PascalCase` | `AppError::Auth`, `Role::Teacher` |
| Constants | `SCREAMING_SNAKE_CASE` | `TENANT_HEADER`, `MIGRATOR` |
| Router functions | `<domain>_router` | `user_router()`, `contests_router()` |
| Request types | `*Request` | `LoginRequest`, `RegisterRequest` |
| Response types | `*Response` | `AuthResponse`, `AdminUserListResponse` |
| Query params | `*Query` | `AdminUserQuery`, `SearchQuery` |

### TypeScript

| Element | Convention | Example |
|---------|-----------|---------|
| Files | `PascalCase.tsx` (components), `camelCase.ts` (services/hooks) | `Button.tsx`, `useAuth.ts`, `problems.ts` |
| Components | `PascalCase` | `MainLayout`, `ProblemDetail` |
| Hooks | `use*` prefix | `useAuth`, `useWebSocket`, `useCountdown` |
| Services | `<domain>Service` as object export | `contestsService`, `problemsService` |
| Types | `PascalCase` interfaces | `Problem`, `ProblemSubmission`, `User` |
| Constants | `SCREAMING_SNAKE_CASE` | `API_CONFIG`, `FEATURE_FLAGS`, `SUBMISSION_STATUS` |
| Test files | `<name>.test.ts(x)` | `contests.test.ts`, `primitives.test.tsx` |
| Type directories | One file per domain | `types/problems.ts`, `types/auth.ts` |
| UI component tests | `__tests__/` subdirectory | `components/ui/__tests__/` |

### Database

| Element | Convention | Example |
|---------|-----------|---------|
| Tables | `snake_case` plural | `users`, `class_enrollments`, `test_case_results` |
| Columns | `snake_case` | `organization_id`, `created_at`, `time_limit_ms` |
| Migrations | `NNN_description.sql` (3-digit prefix) | `003_create_users.sql` |
| Primary keys | `id` (serial/i64 or UUID) | varies by table |
| Timestamps | `created_at`, `updated_at` | auto-managed via SQL function |

---

## Import Patterns

### Rust

```rust
// External crates
use axum::{extract::State, response::Json, Router};
use sqlx::PgPool;
use uuid::Uuid;

// Crate-level
use crate::error::AppError;
use crate::AppState;

// Module-level (relative)
use super::models::*;
use super::service::UserService;

// Shared crate
use shared::models::{User, Claims};
```

Convention: `crate::` for absolute paths within the `api` crate. `super::` for relative module access. Group: external, then crate, then module.

### TypeScript

```typescript
// React + libraries
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// Aliased internal (@/ = src/)
import { cn } from '@/lib/utils'
import api from '@/services/api'
import type { Problem } from '@/types/problems'

// Barrel exports from domain services
import { problemsService } from '@/services/problems'
```

Path alias: `@/` maps to `frontend/src/` (configured in both `vite.config.ts` and `tsconfig.json`).

---

## Logging Patterns

### Rust (tracing)

Server initialized with `tracing-subscriber`:

```rust
tracing_subscriber::registry()
    .with(tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "api=debug,tower_http=debug,axum=trace".into()))
    .with(tracing_subscriber::fmt::layer())
    .init();
```

- Default filter: `api=debug,tower_http=debug,axum=trace`.
- Overridable via `RUST_LOG` env var.
- Usage: `info!("Starting server on {}", addr)`, `info!("Database migrations complete")`.
- No structured JSON logging -- plain fmt output.

### TypeScript

- **No `console.log` in production code** (per project rules).
- React Query handles loading/error states internally.
- `console.error` appears in some service catch blocks for error surfacing during development.
- Toast notifications via `react-hot-toast` for user-facing messages.

---

## Shared Crate Conventions

Location: `shared/src/`

Structure:
```
shared/src/
  lib.rs      # Prelude re-exports: `pub use serde::{Deserialize, Serialize};`
  models/
    mod.rs    # Re-exports all submodules
    auth.rs   # Claims, LoginRequest, LoginResponse, etc.
    user.rs   # User struct (id, username, email, password_hash, role, school_id, campus_id)
    role.rs   # Role enum with hierarchy (Root > OrganizationAdmin > Teacher > Student)
    permission.rs  # Permission enum
```

Purpose: Provides common types shared between `api`, `judge-worker`, and potentially other consumers. The `User` model in `shared` is the JWT-compatible representation used for token generation.
