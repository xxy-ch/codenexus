# Online Judge - System Architecture

## 1. Overview

The Online Judge system is a multi-tenant, multi-role competitive programming platform built as a Rust/TypeScript monorepo. It consists of three main services orchestrated via Docker Compose:

```
+-------------------+     +-------------------+     +-------------------+
|     Frontend      |     |       API         |     |   Judge Worker    |
|  React + Vite     |---->|  Axum + SQLx      |     |  Rust (standalone) |
|  TypeScript       |     |  PostgreSQL       |     |  Redis Streams    |
|  Port 5173/80     |     |  Port 3000        |     |  Sandbox (cgroups)|
+-------------------+     +--------+----------+     +--------+----------+
                                   |                         |
                          +--------v----------+     +--------v----------+
                          |   PostgreSQL 16   |     |   Redis 7         |
                          |   Port 5432       |     |   Port 6379       |
                          +-------------------+     +-------------------+
```

**Infrastructure**: PostgreSQL (primary data), Redis (job queue + caching + JWT blacklist).

## 2. Service Breakdown

### 2.1 API Service (`api/`)

**Framework**: Axum 0.7 on Tokio, with SQLx for database access and Deadpool for Redis pool management.

**Entry point**: `api/src/main.rs` -- initializes tracing, connects to DB/Redis, runs embedded migrations (`sqlx::migrate!`), creates `AppState`, builds the router, and starts the TCP listener.

**AppState** (shared across all handlers):
```rust
pub struct AppState {
    pub db_pool: PgPool,
    pub redis_pool: Option<RedisPool>,
    pub redis_url: String,
    pub jwt_service: JwtService,
    pub jwt_secret: String,
    pub worker_secret: String,
    pub websocket_server: Arc<WebSocketServer>,
}
```

**Module organization** -- each domain follows a consistent pattern:
- `mod.rs` -- re-exports public functions (typically 3-5 lines)
- `models.rs` -- SQL-mappable structs (serde + sqlx derive)
- `routes.rs` -- Axum route handlers (HTTP layer)
- `service.rs` -- Business logic and DB queries (often the largest file)

### 2.2 Judge Worker (`judge-worker/`)

**Framework**: Standalone Tokio binary, no web framework.

**Entry point**: `judge-worker/src/main.rs` -- infinite processing loop that:
1. Connects to Redis (multiplexed connection)
2. Ensures consumer group exists on the submissions stream
3. Blocks on `XREADGROUP` (5-second timeout)
4. Spawns tokio tasks (semaphore-limited to 4 concurrent)
5. Sends results back to API via HTTP POST with retry + DLQ fallback

**Modules**:
- `queue/` -- Redis Streams consumer, producer, and dead-letter queue
- `processor/` -- Submission lifecycle: fetch test cases, compile, execute, compare output
- `compiler/` -- Language detection and compilation configuration
- `sandbox/` -- cgroups memory/CPU limits, chroot filesystem isolation, seccomp syscall filtering
- `db/` -- Direct PostgreSQL connection for fetching test cases

### 2.3 Frontend (`frontend/`)

**Framework**: React 18 + TypeScript + Vite + TanStack Query (React Query) + Zustand + Tailwind CSS.

**Entry point**: `frontend/src/App.tsx` -- `BrowserRouter` with lazy-loaded routes wrapped in `QueryClientProvider` and `ToastProvider`.

**State management**:
- **Zustand** (`frontend/src/store/authStore.ts`) -- authentication state (user, token, isAuthenticated)
- **TanStack Query** -- server state caching for all API data (problems, contests, submissions, etc.)
- **URL state** -- query parameters for filters, pagination, contest IDs

**Routing structure**:
- `/login`, `/register` -- public routes
- `/dashboard`, `/problems/*`, `/submissions/*`, `/contests/*`, `/discussions/*`, `/blog/*`, `/messages`, `/search`, `/profile`, `/settings` -- protected routes (nested under `MainLayout`)
- `/teacher/classes`, `/teacher/assignment-report`, `/teacher/contest-wizard` -- teacher-gated routes (role check via `ProtectedRoute`)
- `/admin/*` -- admin-gated routes (nested under `AdminLayout`)

## 3. Key Design Patterns

### 3.1 Module-per-Domain Pattern (API)

Each domain module (users, problems, submissions, contests, etc.) is a self-contained unit with:
- **routes.rs**: Thin HTTP handlers that extract request params, call service functions, return JSON responses
- **service.rs**: Business logic, SQL queries via `sqlx::query!` or `sqlx::query_as!`, WebSocket notifications
- **models.rs**: Request/response DTOs and database row structs

### 3.2 Middleware Pipeline (API)

Request flow through middleware layers (outermost to innermost):
```
CORS -> Rate Limit (tower-governor, 30/min/IP) -> Auth -> Tenant -> Handler
```

- **CORS**: `tower_http::cors::CorsLayer` -- allow all origins in development
- **Rate Limiting**: `tower_governor::GovernorLayer` -- 30 requests per minute per IP
- **Auth** (`middleware::auth::auth_middleware`): Extracts JWT from `Authorization: Bearer` header or `access_token` cookie, validates against `JwtService`, checks Redis blacklist (`bl:{jti}`), inserts `Claims` and `user_id` (UUID) into request extensions
- **Tenant** (`middleware::tenant::tenant_middleware`): Extracts `school_id` from JWT claims (never from headers), inserts `TenantContext { tenant_id }` into extensions

### 3.3 RBAC (Role-Based Access Control)

Defined in `shared/src/models/` and `api/src/rbac/mod.rs`:

**Role hierarchy** (low to high):
```
Student -> TeachingAssistant -> Teacher -> CampusAdmin -> OrganizationAdmin -> Root
```

**Permission model**: 21 granular permissions (e.g., `ManageUsers`, `SubmitSolution`, `ManageProblems`, `GradeSubmissions`) mapped to roles via an in-memory `HashSet<Permission>` per role.

**Authorization middleware functions**:
- `require_permission(Permission)` -- single permission gate
- `require_any_permission(&[Permission])` -- any-match gate
- `require_all_permissions(&[Permission])` -- all-match gate
- `require_min_role(Role)` -- hierarchical role check
- `require_organization_access(org_id)` -- DB-backed tenant membership check
- `require_campus_access(campus_id)` -- DB-backed campus membership check

### 3.4 Shared Crate (`shared/`)

A Rust library crate shared between `api` and `judge-worker` (workspace member). Contains:
- `models::auth` -- `Claims`, `LoginRequest`, `LoginResponse`, `RefreshRequest`
- `models::user` -- `User`, `UserPublic`
- `models::role` -- `Role` enum with hierarchy
- `models::permission` -- `Permission` enum (21 variants)
- `prelude` -- Re-exports `serde::{Serialize, Deserialize}`

## 4. Data Flows

### 4.1 Submission Lifecycle

```
User submits code (frontend)
    |
    v
POST /submissions (API)
    |-- Validate request (auth, tenant, permission: SubmitSolution)
    |-- Insert submission row (status: "pending")
    |-- Publish to Redis Stream "submissions" via XADD
    |-- Return submission ID to frontend
    |
    v
Judge Worker (consumer group "judge_workers")
    |-- XREADGROUP blocks on stream
    |-- Fetch test cases from PostgreSQL
    |-- Compile source code (language-specific)
    |-- Execute in sandbox (cgroups + chroot + seccomp)
    |-- Compare stdout vs expected output per test case
    |-- POST /submissions/{id}/results to API (with X-Worker-Secret)
    |   |-- On failure: retry 3x with exponential backoff
    |   |-- On exhausted retries: write to DLQ stream
    |-- XACK the stream message
    |
    v
API receives results
    |-- Update submission status, score, runtime, memory
    |-- Update test_case_results rows
    |-- Send WebSocket message (topic: "submission:{id}")
    |
    v
Frontend receives WebSocket event
    |-- Update submission status in real-time
```

### 4.2 Authentication Flow

```
POST /auth/login { username, password }
    |-- Hash password with bcrypt, compare against DB
    |-- Generate access_token (JWT, 1h expiry) with Claims {sub, email, role, school_id, campus_id, jti}
    |-- Generate refresh_token (JWT, 7d expiry)
    |-- Set access_token as HttpOnly cookie
    |-- Return { token, refresh_token, user }
    |
Frontend stores token
    |-- Axios interceptor attaches Bearer token to all requests
    |-- On 401 response: POST /auth/refresh with cookie
    |   |-- Mutex prevents concurrent refresh calls
    |   |-- On refresh failure: redirect to /login
    |-- Token can also be passed via cookie (HttpOnly, SameSite)
```

### 4.3 Contest Flow

```
Teacher creates contest (POST /contests)
    |-- Auth + Tenant + Permission: ManageContests
    |-- Insert contest with organization_id = user's school_id
    |-- Insert contest_problems (link problems to contest)

Student registers (POST /contests/{id}/register)
    |-- Permission: RegisterContests
    |-- Insert into contest_participants

During contest:
    |-- WebSocket topic: "contest:{id}" for real-time updates
    |-- Contest chat via "contest:{id}:chat" topic (teacher + participants only)
    |-- Timer/countdown on frontend (useCountdown hook)

After contest:
    |-- Scoreboard computed from submissions (leaderboard service)
    |-- Tenant-scoped visibility (only same organization)
```

### 4.4 Class/Assignment Flow

```
Teacher creates class (POST /classes)
    |-- Permission: ManageClasses
    |-- Class scoped to teacher's school_id
    |-- Generate class code for student enrollment

Student joins class (POST /classes/{id}/enroll)
    |-- Verify class code
    |-- Insert into class_enrollments

Teacher creates assignment (POST /classes/{id}/assignments)
    |-- Link assignment to class
    |-- Link to problem(s) for grading

Student submits to assignment problem
    |-- Normal submission flow
    |-- Assignment report shows per-student completion stats
```

## 5. WebSocket Architecture

**Server**: In-memory pub/sub managed by `WebSocketServer` (wrapped in `Arc` inside `AppState`).

**Connection lifecycle**:
1. Client connects to `/ws?token={jwt}` or via cookie
2. Handler validates JWT, checks expiry
3. Enforces per-user connection limit (max 5)
4. Auto-subscribes to user notification topic
5. Client sends subscribe messages for specific topics (validated against claims)

**Message types** (tagged union via `#[serde(tag = "type")]`):
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

**Topic system**:
- `submission:{id}` -- user's own submissions only
- `contest:{id}` -- same-organization contests only
- `contest:{id}:chat` -- teachers + registered participants only
- `user:{uuid}` -- personal notifications (auto-subscribed)
- `leaderboard:{scope}:{id}` -- ranking updates

**Delivery methods**:
- `send_to_user(user_id)` -- all connections for a user
- `send_to_topic(topic)` -- all subscribers of a topic
- `broadcast()` -- all connected clients
- `broadcast_to_tenant(school_id)` -- all clients in a tenant

**Frontend integration**: `services/websocket.ts` (singleton `WebSocketService`) + `hooks/useWebSocket.ts` (React hooks: `useWebSocket`, `useSubmissionUpdates`, `useContestUpdates`, `useNotifications`, `useLeaderboardUpdates`).

## 6. Error Handling

### API Error Handling

**Unified error type** (`api/src/error.rs`):
```rust
pub enum AppError {
    Auth(String),      // 401 Unauthorized
    Validation(String), // 400 Bad Request
    Database(String),   // 500 Internal Server Error
    Internal(String),   // 500 Internal Server Error
}
```

Implements `IntoResponse` for Axum (JSON body with `{ error, status }`). Has `From<anyhow::Error>` and `From<sqlx::Error>` conversions.

**Pattern**: Route handlers return `Result<Json<T>, AppError>`. Service functions return `anyhow::Result<T>` which is auto-converted by the `?` operator.

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

**ORM**: SQLx (compile-time checked queries via `sqlx::query!` macro, though many queries use runtime `sqlx::query_scalar`/`sqlx::query_as`).

**Migrations**: 25+ SQL migration files in `api/migrations/`, run at startup via embedded `Migrator`.

**Core tables**:
- `organizations`, `campuses` -- multi-tenant structure
- `users` -- user accounts with role, school_id, campus_id
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

Tenant isolation is based on `school_id` (organization):
- JWT claims include `school_id` and optional `campus_id`
- Tenant middleware extracts from claims (never from client headers)
- All domain queries filter by tenant context (e.g., `WHERE organization_id = $1`)
- WebSocket broadcasts can be scoped to a tenant
- Root role bypasses tenant checks (system-wide access)

## 9. Configuration

**Environment variables**:
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

**Feature flags** (frontend env vars):
- `VITE_ENABLE_DIRECT_MESSAGES` -- enable DM feature (default: true)
- `VITE_ENABLE_PLAGIARISM` -- enable plagiarism module (default: true)
- `VITE_ENABLE_MOCK_DATA` -- use mock data instead of API (default: false)
