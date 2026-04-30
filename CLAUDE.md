<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Online_Judge** (6783 symbols, 14076 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/Online_Judge/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Online_Judge/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Online_Judge/clusters` | All functional areas |
| `gitnexus://repo/Online_Judge/processes` | All execution flows |
| `gitnexus://repo/Online_Judge/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

<!-- GSD:project-start source:PROJECT.md -->
## Project

**AlgoMaster Online Judge**

AlgoMaster is a multi-tenant, multi-role competitive programming platform (Online Judge) for educational institutions. It supports 6 languages (C/C++/Java/Python/Go/JavaScript), provides sandboxed code execution, and serves students, teachers, and administrators across multiple organizations (schools). The system consists of a Rust (Axum) API server, a standalone judge worker with cgroups/seccomp sandboxing, and a React (TypeScript) frontend.

**Core Value:** Reliable, secure code judging with multi-tenancy — every student submission must be correctly evaluated in an isolated sandbox, and data must never leak across organizational boundaries.

### Constraints

- **Tech Stack:** Rust backend (Axum), React frontend, PostgreSQL + Redis — cannot change core technologies
- **Compatibility:** Must maintain existing API contracts — frontend cannot break during backend refactor
- **Database:** PostgreSQL only — migration tool reads from MySQL but writes to PostgreSQL
- **Sandbox:** Judge sandbox requires Linux (cgroups, chroot, seccomp) — cannot run on macOS/Windows for production judging
- **Deployment:** Docker Compose for now — Kubernetes not required
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Overview
## Languages
| Language | Version | Usage |
|----------|---------|-------|
| Rust | Edition 2021 | API server, judge-worker, shared library |
| TypeScript | ~5.9.3 | Frontend application |
| SQL | PostgreSQL 16 | Database schema and migrations |
## Workspace Structure
## Rust Crates
### Workspace Dependencies (root `Cargo.toml`)
| Crate | Version | Features |
|-------|---------|----------|
| tokio | 1.35 | full |
| axum | 0.7 | json |
| serde | 1.0 | derive |
| serde_json | 1.0 | - |
| tracing | 0.1 | - |
| tracing-subscriber | 0.3 | env-filter |
### API Crate (`api/Cargo.toml`)
| Crate | Version | Purpose |
|-------|---------|---------|
| axum | 0.7 (workspace) | HTTP + WebSocket server |
| sqlx | 0.8 | PostgreSQL driver (runtime-tokio, tls-rustls, postgres, chrono, uuid, migrate) |
| redis | 0.27 | Redis client (tokio-comp, connection-manager) |
| deadpool-redis | 0.22 | Redis connection pool (serde) |
| tower | 0.5 | Middleware stack |
| tower-http | 0.5 | CORS, static files, tracing |
| tower_governor | 0.4 | Rate limiting |
| governor | 0.7 | Rate limiting algorithm |
| jsonwebtoken | 9 | JWT token generation/validation |
| bcrypt | 0.16 | Password hashing |
| chrono | 0.4 | Date/time (serde) |
| uuid | 1.11 | UUID generation (v4, serde) |
| tokio-tungstenite | 0.24 | WebSocket support |
| futures-util | 0.3 | Async stream utilities |
| regex | 1.11 | Search functionality |
| anyhow | 1.0 | Error handling |
| dotenvy | 0.15 | .env file loading |
| headers | 0.4 | HTTP header types |
| hyper | 1 | HTTP types |
| hyper-util | 0.1 | HTTP utilities |
| rand | 0.8 | Random number generation |
| once_cell | 1.20 | Lazy static initialization |
### Judge Worker Crate (`judge-worker/Cargo.toml`)
| Crate | Version | Purpose |
|-------|---------|---------|
| tokio | 1.35 (workspace) | Async runtime |
| sqlx | 0.8 | PostgreSQL driver (runtime-tokio-rustls, postgres, uuid, chrono, time) |
| redis | 0.27 | Redis client (tokio-comp, connection-manager) |
| reqwest | 0.12 | HTTP client to API (json, rustls-tls) |
| nix | 0.29 | Linux syscalls: fs, user, process, hostname |
| libc | 0.2 | Low-level C bindings |
| libseccomp-sys | 0.2 | seccomp sandboxing |
| chrono | 0.4 | Date/time |
| uuid | 1.0 | UUID generation (v4, serde) |
### Shared Crate (`shared/Cargo.toml`)
| Crate | Version | Purpose |
|-------|---------|---------|
| serde | 1.0 (workspace) | Serialization (derive) |
| uuid | 1.11 | UUID types (v4, serde) |
## Frontend (`frontend/package.json`)
### Package Manager: npm
### Build Target: chrome109
### Framework and Core
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI framework |
| react-dom | ^19.2.0 | DOM renderer |
| react-router-dom | ^7.13.0 | Client-side routing |
| vite | ^7.3.1 | Build tool and dev server |
| typescript | ~5.9.3 | Type system |
### State Management and Data
| Package | Version | Purpose |
|---------|---------|---------|
| zustand | ^5.0.11 | Global state management |
| @tanstack/react-query | ^5.90.21 | Server state / data fetching |
| axios | ^1.13.5 | HTTP client |
### UI and Styling
| Package | Version | Purpose |
|---------|---------|---------|
| tailwindcss | ^4.1.18 | Utility-first CSS |
| @tailwindcss/postcss | ^4.2.1 | PostCSS plugin for Tailwind |
| postcss | ^8.5.6 | CSS processing |
| autoprefixer | ^10.4.24 | Vendor prefixing |
| tw-animate-css | ^1.4.0 | Tailwind animation utilities |
| class-variance-authority | ^0.7.1 | Component variant styling |
| clsx | ^2.1.1 | Conditional class names |
| tailwind-merge | ^3.5.0 | Tailwind class deduplication |
| lucide-react | ^0.577.0 | Icon library |
| @fontsource-variable/geist | ^5.2.8 | Variable font (Geist) |
| shadcn | ^4.2.0 | UI component library |
### Code Editors
| Package | Version | Purpose |
|---------|---------|---------|
| @monaco-editor/react | ^4.7.0 | Monaco editor (code submission) |
| @codemirror/autocomplete | ^6.20.0 | CodeMirror autocomplete |
| @codemirror/commands | ^6.10.2 | CodeMirror commands |
| @codemirror/highlight | ^0.19.8 | CodeMirror syntax highlighting |
| @codemirror/lang-markdown | ^6.5.0 | CodeMirror markdown mode |
| @codemirror/language-data | ^6.5.2 | CodeMirror language support |
| @codemirror/lint | ^6.9.4 | CodeMirror linting |
| @codemirror/search | ^6.6.0 | CodeMirror search |
| @codemirror/state | ^6.5.4 | CodeMirror state |
| @codemirror/theme-one-dark | ^6.1.3 | CodeMirror dark theme |
| @codemirror/view | ^6.39.15 | CodeMirror view |
### Markdown and Content
| Package | Version | Purpose |
|---------|---------|---------|
| react-markdown | ^10.1.0 | Markdown rendering |
| remark-gfm | ^4.0.1 | GitHub Flavored Markdown |
| dompurify | ^3.3.1 | HTML sanitization (XSS prevention) |
| react-syntax-highlighter | ^16.1.0 | Code block syntax highlighting |
### Forms and Validation
| Package | Version | Purpose |
|---------|---------|---------|
| react-hook-form | ^7.71.1 | Form state management |
| zod | ^4.3.6 | Schema validation |
| @hookform/resolvers | ^5.2.2 | Zod resolver for react-hook-form |
### Real-time Communication
| Package | Version | Purpose |
|---------|---------|---------|
| socket.io-client | ^4.8.3 | Socket.IO client (available but native WebSocket used) |
### Charts
| Package | Version | Purpose |
|---------|---------|---------|
| recharts | ^3.7.0 | Charting library |
### Notifications and Misc
| Package | Version | Purpose |
|---------|---------|---------|
| react-hot-toast | ^2.6.0 | Toast notifications |
| uuid | ^13.0.0 | UUID generation |
### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| @vitejs/plugin-react | ^5.1.1 | Vite React plugin |
| vitest | ^1.0.2 | Unit testing framework |
| @testing-library/react | ^16.0.0 | React component testing |
| @testing-library/jest-dom | ^6.1.5 | DOM matchers |
| @testing-library/user-event | ^14.5.2 | User interaction testing |
| jsdom | ^25.0.1 | DOM simulation |
| @playwright/test | ^1.55.0 | E2E testing |
| eslint | ^9.39.1 | Linting |
| eslint-plugin-react-hooks | ^7.0.1 | React hooks linting |
| eslint-plugin-react-refresh | ^0.4.24 | React refresh linting |
| typescript-eslint | ^8.48.0 | TypeScript ESLint |
| @eslint/js | ^9.39.1 | ESLint JS config |
| @types/node | ^24.10.1 | Node type definitions |
| @types/react | ^19.2.7 | React type definitions |
| @types/react-dom | ^19.2.3 | React DOM type definitions |
| @types/react-syntax-highlighter | ^15.5.13 | Syntax highlighter types |
| @types/dompurify | ^3.0.5 | DOMPurify types |
| @types/uuid | ^10.0.0 | UUID types |
| globals | ^16.5.0 | Global type definitions |
## Database
| Component | Version | Image |
|-----------|---------|-------|
| PostgreSQL | 16 | postgres:16-alpine |
| Redis | 7 | redis:7-alpine |
## Build Tools and Configuration
| Tool | Config File | Purpose |
|------|-------------|---------|
| Cargo | `Cargo.toml` (workspace root + per-crate) | Rust package manager and build system |
| npm | `package.json` + `package-lock.json` | Node.js package manager |
| Vite | `vite.config.ts` | Frontend dev server and bundler |
| TypeScript | `tsconfig.json` + `tsconfig.app.json` + `tsconfig.node.json` + `tsconfig.release.json` | TypeScript configuration |
| ESLint | Inline config | JavaScript/TypeScript linting |
| PostCSS | PostCSS plugin chain | CSS processing |
| Docker Compose | `docker-compose.yml` | Multi-container orchestration |
## Docker Images
- `api/Dockerfile` -- API server
- `judge-worker/Dockerfile` -- Judge worker (requires SYS_PTRACE, SYS_ADMIN capabilities)
- `frontend/Dockerfile` -- Frontend SPA (served on port 80 via Nginx)
## Runtime Requirements
| Service | Default Port | Description |
|---------|-------------|-------------|
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Caching, JWT blacklist, message queue |
| API (axum) | 3000 | REST API + WebSocket server |
| Frontend (Vite dev) | 5173 | Development server (proxied to API) |
| Frontend (production) | 80 | Nginx-served static assets |
## Environment Variables
### API Server
- `DATABASE_URL` (required) -- PostgreSQL connection string
- `REDIS_URL` (default: `redis://127.0.0.1:6379`) -- Redis connection string
- `JWT_SECRET` (default: insecure placeholder) -- JWT signing key
- `WORKER_SECRET` (default: insecure placeholder) -- Shared secret for judge-worker callbacks
- `API_BIND_ADDRESS` (default: `0.0.0.0:3000`) -- Server bind address
### Judge Worker
- `REDIS_URL` (default: `redis://127.0.0.1/`) -- Redis connection string
- `API_URL` (default: `http://127.0.0.1:3000`) -- API server URL for result callbacks
- `WORKER_SECRET` (required) -- Shared secret for authenticating to API
- `SUBMISSION_STREAM` (default: `submissions`) -- Redis stream name
- `CONSUMER_GROUP` (default: `judge_workers`) -- Redis consumer group name
- `CONSUMER_NAME` (default: auto-generated UUID) -- Consumer identifier
### Frontend
- `VITE_API_BASE_URL` (default: `/api`) -- API base URL
- `VITE_WS_BASE_URL` (default: auto-detected from `window.location`) -- WebSocket URL
- `VITE_API_PROXY_TARGET` (default: `http://localhost:3000`) -- Vite dev proxy target
- `VITE_WS_PROXY_TARGET` (default: `ws://localhost:3000`) -- Vite WebSocket proxy target
- `VITE_ENABLE_MOCK_DATA` -- Enable mock data mode
- `VITE_ENABLE_DIRECT_MESSAGES` (default: enabled) -- Feature toggle for DMs
- `VITE_ENABLE_PLAGIARISM` (default: enabled) -- Feature toggle for plagiarism module
## Vite Build Configuration
- Build target: `chrome109`
- Path alias: `@/` maps to `./src/`
- Code splitting via `manualChunks`:
## TypeScript Configuration
- Target: ES2022
- Module: ESNext (bundler mode)
- JSX: react-jsx
- Strict mode enabled
- Path alias: `@/*` maps to `./src/*`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Table of Contents
## Project Structure Overview
## Rust Backend Conventions
### Error Handling
- `AppError` implements `IntoResponse` mapping each variant to an HTTP status code.
- JSON error body: `{ "error": "<message>", "status": <code> }`.
- `From<anyhow::Error>` and `From<sqlx::Error>` conversions exist.
- Services return `anyhow::Result<T>`. Routes convert to `AppError` via `?`.
- Inline role checks in routes use `ensure_admin(role: &str) -> Result<(), AppError>`.
### Module Organization
- `test_cases.rs` (problems) -- test case management
- `problem_access.rs`, `access.rs` (problems) -- authorization helpers
- `authz.rs` (middleware) -- RBAC middleware
### Service Pattern
### AppState
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
- Services are plain objects with async methods (not classes).
- They import the shared `api` axios instance from `./api`.
- API responses are normalized/transformed inside the service layer.
- Raw backend data is coerced to frontend types (e.g., `String(problem.id)`).
- Backend `snake_case` fields are consumed directly (no camelCase conversion).
- Feature-flagged services check `FEATURE_FLAGS` from `./config.ts`.
### Hooks Pattern
### State Management
- **Zustand** for client-side auth state (`store/authStore.ts`).
- **TanStack React Query** for server state caching and refetching.
- **URL state** for filters/search params (used with `useSearchParams`).
### Type Definitions
### Lazy Loading
## API Route Patterns
### Router Registration (main.rs)
### Middleware Stacking Order (outer to inner)
### Domain Router Pattern
### Handler Signature Pattern
### Permission Middleware (middleware/permission.rs)
### Auth Pattern
- JWT in `Authorization: Bearer <token>` header or `access_token` cookie.
- Refresh tokens in `refresh_token` cookie (HttpOnly, SameSite=Strict).
- Token blacklist in Redis (`bl:{jti}`) on logout.
- Claims contain: `sub` (UUID), `username`, `email`, `role`, `school_id`, `campus_id`, `grade_id`, `exp`, `jti`.
## Database Query Patterns
### Connection Pool
### Migrations
- Embedded at compile time via `sqlx::migrate!()` in `api/src/db/schema.rs`.
- Files in `api/migrations/` with `NNN_description.sql` naming.
- Auto-run on server startup: `MIGRATOR.run(&pool).await`.
- 20+ migration files covering organizations, users, problems, submissions, contests, classes, discussions, plagiarism, messages.
### Query Patterns
### Conventions
- Always use parameterized queries (`$1`, `$2`, etc.) -- never string interpolation.
- `query_as::<_, T>()` for mapping to typed structs (must derive `FromRow`).
- `query_scalar::<_, T>()` for single value returns.
- `fetch_one` / `fetch_optional` / `fetch_all` depending on expected cardinality.
- Manual `ORDER BY created_at ASC LIMIT 1` for deterministic role queries.
## Frontend Component Patterns
### Design System (shadcn / base-ui)
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
### Layout Pattern
### Route Guards
- `ProtectedRoute` -- redirects to `/login` if not authenticated.
- `PublicRoute` -- redirects to `/dashboard` if already authenticated.
- `AdminRoute` -- redirects to `/unauthorized` if not admin role.
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
## Import Patterns
### Rust
### TypeScript
## Logging Patterns
### Rust (tracing)
- Default filter: `api=debug,tower_http=debug,axum=trace`.
- Overridable via `RUST_LOG` env var.
- Usage: `info!("Starting server on {}", addr)`, `info!("Database migrations complete")`.
- No structured JSON logging -- plain fmt output.
### TypeScript
- **No `console.log` in production code** (per project rules).
- React Query handles loading/error states internally.
- `console.error` appears in some service catch blocks for error surfacing during development.
- Toast notifications via `react-hot-toast` for user-facing messages.
## Shared Crate Conventions
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## 1. Overview
```
|     Frontend      |     |       API         |     |   Judge Worker    |
|  React + Vite     |---->|  Axum + SQLx      |     |  Rust (standalone) |
|  TypeScript       |     |  PostgreSQL       |     |  Redis Streams    |
|  Port 5173/80     |     |  Port 3000        |     |  Sandbox (cgroups)|
```
## 2. Service Breakdown
### 2.1 API Service (`api/`)
```rust
```
- `mod.rs` -- re-exports public functions (typically 3-5 lines)
- `models.rs` -- SQL-mappable structs (serde + sqlx derive)
- `routes.rs` -- Axum route handlers (HTTP layer)
- `service.rs` -- Business logic and DB queries (often the largest file)
### 2.2 Judge Worker (`judge-worker/`)
- `queue/` -- Redis Streams consumer, producer, and dead-letter queue
- `processor/` -- Submission lifecycle: fetch test cases, compile, execute, compare output
- `compiler/` -- Language detection and compilation configuration
- `sandbox/` -- cgroups memory/CPU limits, chroot filesystem isolation, seccomp syscall filtering
- `db/` -- Direct PostgreSQL connection for fetching test cases
### 2.3 Frontend (`frontend/`)
- **Zustand** (`frontend/src/store/authStore.ts`) -- authentication state (user, token, isAuthenticated)
- **TanStack Query** -- server state caching for all API data (problems, contests, submissions, etc.)
- **URL state** -- query parameters for filters, pagination, contest IDs
- `/login`, `/register` -- public routes
- `/dashboard`, `/problems/*`, `/submissions/*`, `/contests/*`, `/discussions/*`, `/blog/*`, `/messages`, `/search`, `/profile`, `/settings` -- protected routes (nested under `MainLayout`)
- `/teacher/classes`, `/teacher/assignment-report`, `/teacher/contest-wizard` -- teacher-gated routes (role check via `ProtectedRoute`)
- `/admin/*` -- admin-gated routes (nested under `AdminLayout`)
## 3. Key Design Patterns
### 3.1 Module-per-Domain Pattern (API)
- **routes.rs**: Thin HTTP handlers that extract request params, call service functions, return JSON responses
- **service.rs**: Business logic, SQL queries via `sqlx::query!` or `sqlx::query_as!`, WebSocket notifications
- **models.rs**: Request/response DTOs and database row structs
### 3.2 Middleware Pipeline (API)
```
```
- **CORS**: `tower_http::cors::CorsLayer` -- allow all origins in development
- **Rate Limiting**: `tower_governor::GovernorLayer` -- 30 requests per minute per IP
- **Auth** (`middleware::auth::auth_middleware`): Extracts JWT from `Authorization: Bearer` header or `access_token` cookie, validates against `JwtService`, checks Redis blacklist (`bl:{jti}`), inserts `Claims` and `user_id` (UUID) into request extensions
- **Tenant** (`middleware::tenant::tenant_middleware`): Extracts `school_id` from JWT claims (never from headers), inserts `TenantContext { tenant_id }` into extensions
### 3.3 RBAC (Role-Based Access Control)
```
```
- `require_permission(Permission)` -- single permission gate
- `require_any_permission(&[Permission])` -- any-match gate
- `require_all_permissions(&[Permission])` -- all-match gate
- `require_min_role(Role)` -- hierarchical role check
- `require_organization_access(org_id)` -- DB-backed tenant membership check
- `require_campus_access(campus_id)` -- DB-backed campus membership check
### 3.4 Shared Crate (`shared/`)
- `models::auth` -- `Claims`, `LoginRequest`, `LoginResponse`, `RefreshRequest`
- `models::user` -- `User`, `UserPublic`
- `models::role` -- `Role` enum with hierarchy
- `models::permission` -- `Permission` enum (21 variants)
- `prelude` -- Re-exports `serde::{Serialize, Deserialize}`
## 4. Data Flows
### 4.1 Submission Lifecycle
```
```
### 4.2 Authentication Flow
```
```
### 4.3 Contest Flow
```
```
### 4.4 Class/Assignment Flow
```
```
## 5. WebSocket Architecture
- `SubmissionUpdate` -- real-time judging progress
- `LeaderboardUpdate` -- rank changes
- `Notification` -- in-app notifications
- `ContestUpdate` -- contest status/time
- `ProblemStats` -- submission statistics
- `ChatMessage` -- contest chat
- `DiscussionReply`, `ArticleComment` -- community updates
- `TrendingArticles` -- blog highlights
- `Ping`/`Pong` -- heartbeat
- `Error` -- subscription/protocol errors
- `submission:{id}` -- user's own submissions only
- `contest:{id}` -- same-organization contests only
- `contest:{id}:chat` -- teachers + registered participants only
- `user:{uuid}` -- personal notifications (auto-subscribed)
- `leaderboard:{scope}:{id}` -- ranking updates
- `send_to_user(user_id)` -- all connections for a user
- `send_to_topic(topic)` -- all subscribers of a topic
- `broadcast()` -- all connected clients
- `broadcast_to_tenant(school_id)` -- all clients in a tenant
## 6. Error Handling
### API Error Handling
```rust
```
### Judge Worker Error Handling
- **Processing errors**: Logged, message is ACKed to prevent infinite retries
- **API callback failures**: 3 retries with exponential backoff (1s, 2s, 4s)
- **Permanent failures**: Written to DLQ stream for manual inspection
- **Main loop errors**: Exponential backoff capped at 60s (2^error_count, max 6)
### Frontend Error Handling
- **API errors**: Axios interceptor handles 401 with automatic token refresh
- **Component errors**: React error boundaries + toast notifications via `ToastProvider`
- **Utility**: `utils/errorHandler.ts` for centralized error formatting
## 7. Database Architecture
- `organizations`, `campuses` -- multi-tenant structure
- `grades` -- grade levels per campus (name, level, year, status); grade_id links users to their grade
- `users` -- user accounts with role, school_id, campus_id, grade_id
- `problems` -- problem definitions with difficulty, tags, visibility
- `test_cases` -- input/output pairs per problem
- `submissions` -- user code submissions with status, score, runtime, memory
- `test_case_results` -- per-test-case judging results
- `contests`, `contest_problems`, `contest_participants`, `contest_submissions`
- `classes`, `class_enrollments`, `assignments`
- `discussions` -- forum-style problem discussions
- `blog_*` tables -- articles and comments
- `direct_messages` -- private messaging
- `plagiarism_reports`, `plagiarism_scan` -- code similarity detection
- `notifications` -- in-app notification queue
## 8. Multi-Tenancy
- JWT claims include `school_id`, optional `campus_id`, and optional `grade_id`
- TenantContext carries `tenant_id`, optional `campus_id`, and optional `grade_id` for query filtering
- Tenant middleware extracts from claims (never from client headers)
- All domain queries filter by tenant context (e.g., `WHERE organization_id = $1`)
- WebSocket broadcasts can be scoped to a tenant
- Root role bypasses tenant checks (system-wide access)
## 9. Configuration
| Variable | Service | Default | Purpose |
|----------|---------|---------|---------|
| `DATABASE_URL` | api, judge-worker | (required) | PostgreSQL connection string |
| `REDIS_URL` | api, judge-worker | `redis://127.0.0.1:6379` | Redis connection string |
| `JWT_SECRET` | api | `default_jwt_secret_change_me` | JWT signing key |
| `WORKER_SECRET` | api, judge-worker | `default_worker_secret_change_me` | Worker-to-API auth |
| `API_BIND_ADDRESS` | api | `0.0.0.0:3000` | API listen address |
| `API_URL` | judge-worker | `http://127.0.0.1:3000` | API callback URL |
| `SUBMISSION_STREAM` | judge-worker | `submissions` | Redis stream name |
| `CONSUMER_GROUP` | judge-worker | `judge_workers` | Consumer group name |
| `VITE_API_BASE_URL` | frontend | `/api` | API base URL for frontend |
| `VITE_WS_BASE_URL` | frontend | (auto-detected) | WebSocket URL for frontend |
- `VITE_ENABLE_DIRECT_MESSAGES` -- enable DM feature (default: true)
- `VITE_ENABLE_PLAGIARISM` -- enable plagiarism module (default: true)
- `VITE_ENABLE_MOCK_DATA` -- use mock data instead of API (default: false)
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
