<!-- generated-by: gsd-doc-writer -->
# Architecture

## System Overview

AlgoMaster is a multi-tenant competitive programming platform designed for educational institutions. It supports six languages (C, C++, Java, Python, Go, JavaScript), provides sandboxed code execution via cgroups/seccomp, and serves students, teachers, and administrators across isolated organizational boundaries (schools/campuses).

The system follows a distributed architecture with three primary services communicating through REST APIs, Redis Streams, and WebSocket connections:

```
+----------------+       REST + WebSocket        +------------------+       Redis Streams + HTTP        +------------------+
|                | <---------------------------> |                  | <-----------------------------> |                  |
|   Frontend     |     :5173 (dev) / :80 (prod)  |   API Server     |     POST /submissions/{id}/results|  Judge Worker    |
|   React 19     |                              |   Axum + Rust    |                              |   Standalone Rust |
|   TypeScript   |                              |   :3000          |                              |  (Linux sandbox)  |
+----------------+                              +--------+---------+                              +--------+---------+
                                                         |                                            |
                                                         |  sqlx (PgPool)                              |  sqlx (PgPool)
                                                         v                                            v
                                               +------------------+                        +------------------+
                                               |   PostgreSQL 16  |                        |   PostgreSQL 16  |
                                               +------------------+                        +------------------+
                                                         |
                                                         |  deadpool-redis
                                                         v
                                               +------------------+
                                               |    Redis 7       |
                                               | (cache, queue,   |
                                               |  JWT blacklist)  |
                                               +------------------+
```

**Key architectural properties:**
- Multi-tenant data isolation at the query level (every domain query filters by `organization_id`)
- Decoupled judging: submissions flow asynchronously through Redis Streams to standalone workers
- Stateful WebSocket server in-process with the API for real-time updates
- Shared Rust types across crates via a workspace `shared/` library

---

## Service Architecture

### API Server (`api/`)

The central HTTP and WebSocket server built on Axum. It handles authentication, authorization, all CRUD operations, and real-time push notifications.

**Responsibilities:**
- User authentication (JWT issuance, refresh, logout with Redis-backed blacklist)
- Tenant extraction from JWT claims (never from client headers)
- REST endpoints for problems, contests, submissions, classes, discussions, blog, search, notifications, messages
- WebSocket server for real-time updates (submissions, leaderboard, notifications, chat)
- Prometheus metrics endpoint at `/metrics`
- Kubernetes-style health probes at `/health/live` and `/health/ready`
- Enqueueing submissions to Redis Streams for judge workers
- Receiving judge results from workers via HTTP callback
- Worker heartbeat aggregation in Redis

**Key files:**
- `api/src/main.rs` -- Router registration, middleware stacking, server startup
- `api/src/auth/` -- JWT service, login/register/refresh/logout handlers
- `api/src/middleware/` -- Auth, tenant, rate-limit, request-id, metrics middleware
- `api/src/websocket/` -- WebSocket upgrade and message broadcast
- `api/src/db/` -- Connection pool, schema migrations (`sqlx::migrate!()`)
- `api/src/error.rs` -- Re-exports `AppError` from `api-infra`

### Judge Worker (`judge-worker/`)

A standalone Rust binary that consumes submission messages from Redis Streams, compiles and executes source code in a sandboxed environment, and sends results back to the API.

**Responsibilities:**
- Dual-stream priority consumption (contest submissions first, then normal)
- Crash recovery via XPENDING/XCLAIM on worker startup
- Compilation (gcc, g++, javac, rustc, go build) and execution of 7 languages
- Sandboxed execution using cgroups (CPU/memory limits), chroot (filesystem isolation), and seccomp (syscall filtering)
- Result callback to API with exponential backoff retry
- Dead-letter queue for permanently failed deliveries
- Per-dependency circuit breakers (Redis, API)
- Background heartbeat reporting to API every 10 seconds

**Key files:**
- `judge-worker/src/main.rs` -- Worker lifecycle, concurrent processing loop, recovery
- `judge-worker/src/queue/consumer.rs` -- Redis Streams XREADGROUP, priority consumer
- `judge-worker/src/queue/dlq.rs` -- Dead-letter queue write/read/delete
- `judge-worker/src/queue/recovery.rs` -- XPENDING/XCLAIM crash recovery
- `judge-worker/src/processor/service.rs` -- Compile, execute, compare output
- `judge-worker/src/sandbox/` -- cgroups, chroot, seccomp isolation
- `judge-worker/src/circuit_breaker.rs` -- In-memory circuit breaker (Closed/Open/HalfOpen)
- `judge-worker/src/heartbeat.rs` -- Background heartbeat task

### Frontend (`frontend/`)

A React 19 single-page application built with Vite, TypeScript, and Tailwind CSS.

**Responsibilities:**
- User-facing UI for problem browsing, code submission, contest participation, discussions, and messaging
- Role-based route guards (public, protected, teacher, admin)
- Real-time updates via WebSocket connection
- Server state management via TanStack React Query
- Client-side auth state via Zustand
- Lazy-loaded routes for code splitting

**Key files:**
- `frontend/src/App.tsx` -- Route definitions and lazy loading
- `frontend/src/store/authStore.ts` -- Zustand auth state
- `frontend/src/services/` -- API service layer (plain objects with async methods)
- `frontend/src/components/auth/ProtectedRoute.tsx` -- Route guards

### Shared Infrastructure

| Crate | Purpose |
|-------|---------|
| `shared/` | Cross-crate types: `Claims`, `User`, `Role`, `Permission`, `LoginRequest`/`Response` |
| `api-infra/` | API infrastructure: `AppState`, `AppError`, `RbacService`, WebSocket server, middleware, config, metrics, testkit |
| `migration-tool/` | MySQL to PostgreSQL data migration utility |

---

## Module-per-Domain Pattern

The Rust backend organizes each business domain into its own crate following a consistent three-layer pattern:

```
domain-{name}/
  src/
    mod.rs            -- Re-exports public router function and key types
    routes.rs         -- Thin Axum route handlers (HTTP layer)
    models.rs         -- Request/response DTOs and database row structs (serde + sqlx derives)
    service.rs        -- Business logic, SQL queries, WebSocket notifications
    {feature}.rs      -- Domain-specific modules (e.g., access.rs, test_cases.rs)
```

**Domain crates in the workspace:**

| Crate | Router Function | Domain |
|-------|----------------|--------|
| `domain-users` | `user_router()` | User profiles, admin user management |
| `domain-problems` | `problems_router()` | Problem CRUD, test case management, access control |
| `domain-contests` | `contests_router()` | Contest lifecycle, scoring, leaderboard snapshots |
| `domain-submissions` | `submissions_router()` | Code submission, result retrieval, rejudging |
| `domain-classes` | `classes_router()` | Class management, enrollment, assignments |
| `domain-community` | `discussions_router()`, `blog_router()`, `messages_router()` | Discussions, blog articles, direct messaging |
| `domain-search` | `search_router()` | Full-text search across problems, discussions, users |
| `domain-leaderboard` | `leaderboard_router()` | Rankings by scope (global, problem, contest, class) |
| `domain-imex` | `imex_router()` | Bulk import/export of problems and users |

**Router registration** in `api/src/main.rs`:
```rust
let protected_router = Router::new()
    .nest("/users", domain_users::user_router())
    .nest("/problems", domain_problems::problems_router())
    .nest("/contests", domain_contests::contests_router())
    // ... remaining domain routers
    .route_layer(tenant_middleware)
    .route_layer(auth_middleware);
```

---

## Data Flows

### Submission Lifecycle

The full path from user code submission to real-time result display:

```
1. User submits code
   Frontend -> POST /submissions -> API Server

2. API validates and enqueues
   API -> XADD submissions {data: SubmissionMessage, school_id, submitted_at}
   API -> WebSocket broadcast SubmissionUpdate (status: "queued")

3. Worker dequeues and processes
   Worker -> XREADGROUP GROUP judge_workers {consumer} COUNT 1 STREAMS submissions >
   Worker -> Fetch test cases from PostgreSQL
   Worker -> Compile source code (if applicable)
   Worker -> Execute in sandbox (cgroups + seccomp)
   Worker -> Compare output against expected

4. Worker sends result to API
   Worker -> POST /submissions/{id}/results {JudgeResult}
   Worker -> XACK submissions {message_id}

5. API stores result and notifies
   API -> UPDATE submissions SET status, score, ...
   API -> WebSocket broadcast SubmissionUpdate (status: "accepted"/"wrong_answer"/...)
```

**Priority mechanism:** The worker reads from two streams -- `submissions:contest` (high priority) and `submissions` (normal). A parking algorithm guarantees contest submissions are always processed before normal ones, even if a normal message was already read.

**Failure handling:**
- Processing errors: Logged, message is ACKed (no infinite retry)
- API callback failures: 3 retries with exponential backoff (2s, 4s, 8s + jitter)
- Exhausted retries: Written to DLQ stream `submissions:dlq` with full metadata
- Worker crash: Recovered on next startup via XPENDING/XCLAIM

### Authentication Flow

```
1. Login
   POST /auth/login {username, password}
   API -> Verify bcrypt hash
   API -> Generate access_token (JWT, 15min) + refresh_token (JWT, 7d)
   API -> Return {token, refresh_token, user}

2. Request authentication (middleware chain)
   Request -> auth_middleware:
     Extract JWT from Authorization: Bearer header OR access_token cookie
     Validate signature and expiration
     Check Redis blacklist: EXISTS bl:{jti}
     Insert Claims + user_id (UUID) into request extensions
   Request -> tenant_middleware:
     Extract school_id from Claims (NEVER from client headers)
     Insert TenantContext { tenant_id } into request extensions

3. Token refresh
   POST /auth/refresh {refresh_token} OR from refresh_token cookie
   API -> Validate refresh token
   API -> Generate new access_token
   API -> Return {token}

4. Logout
   POST /auth/logout
   API -> Write JWT ID to Redis blacklist: SET bl:{jti} EX 900
   Tokens are rejected by auth_middleware until blacklist TTL expires
```

**JWT Claims structure:**
```json
{
  "sub": "uuid",
  "email": "user@example.com",
  "role": "teacher",
  "school_id": 42,
  "campus_id": 10,
  "iat": 1700000000,
  "exp": 1700000900,
  "jti": "uuid"
}
```

### WebSocket Architecture

The WebSocket server runs in-process with the API server. Clients connect at `/ws` and can subscribe to topics.

**Message types** (tagged union via `#[serde(tag = "type")]`):

| Type | Purpose |
|------|---------|
| `SubmissionUpdate` | Real-time judging progress for a user's submission |
| `LeaderboardUpdate` | Rank changes for a scoped leaderboard |
| `Notification` | In-app notification for a specific user |
| `ContestUpdate` | Contest status/time changes |
| `ProblemStats` | Submission statistics for a problem |
| `ChatMessage` | Contest discussion chat messages |
| `DiscussionReply` | New replies in problem discussions |
| `ArticleComment` | New comments on blog articles |
| `TrendingArticles` | Blog highlight updates |
| `Ping` / `Pong` | Heartbeat keep-alive |
| `Error` | Subscription or protocol errors |

**Broadcast scopes:**
- `send_to_user(user_id)` -- all WebSocket connections for a specific user
- `send_to_topic(topic)` -- all subscribers of a topic (e.g., `submission:{id}`, `contest:{id}`)
- `broadcast()` -- all connected clients
- `broadcast_to_tenant(school_id)` -- all clients within a tenant organization

---

## Multi-Tenancy

### Organization Hierarchy

```
Organization (school_id)
  +-- Campus (campus_id)
  |     +-- Class
  |     +-- Class
  +-- Campus
        +-- Class
```

### Tenant Isolation Mechanism

1. **JWT-embedded identity:** Every authenticated request carries `school_id` and optionally `campus_id` inside the JWT payload. The `tenant_middleware` extracts these from verified claims (never from client-supplied headers like `X-Tenant-ID`).

2. **Request-scoped context:** After middleware processing, handlers can extract `Extension<TenantContext>` which contains `tenant_id: i64`. The `Root` role bypasses tenant checks.

3. **Query-level filtering:** Every domain service query includes a `WHERE organization_id = $1` clause (or equivalent) to ensure data never leaks across tenants. This is enforced by the handler extracting `TenantContext` and passing `tenant_id` to service methods.

4. **Worker tenant isolation:** Submission messages in Redis Streams carry `school_id` as a top-level field. DLQ entries store `school_id` for tenant-scoped admin retry. Worker heartbeat payloads do not include tenant info (workers are shared across tenants).

---

## Security Architecture

### Role Hierarchy

```
Root > OrganizationAdmin > CampusAdmin > Teacher > TeachingAssistant > Student
```

The `Role` enum in `shared/src/models/role.rs` implements `is_higher_or_equal()` for hierarchical comparison. `Root` has system-wide access and bypasses tenant checks.

### Permission-Based Access Control (RBAC)

The `Permission` enum defines 21 granular permissions across 6 categories:

| Category | Permissions |
|----------|------------|
| User | `ManageUsers`, `ViewUsers` |
| Problem | `ManageProblems`, `ViewAllProblems`, `SubmitSolution` |
| Contest | `ManageContests`, `RegisterContests`, `ViewContestProblems` |
| Class | `ManageClasses`, `ManageAssignments`, `GradeSubmissions`, `ViewClassStats` |
| Organization | `ManageOrganization`, `ManageCampus` |
| System | `ViewLeaderboard`, `ViewStatistics`, `ModerateContent`, `ManageTags`, `ManageSystem`, `ViewLogs`, `ManageApiKeys` |

The `RbacService` in `api-infra/src/rbac.rs` maps roles to permission sets using an in-memory `HashSet<Permission>` matrix. Route handlers use axum middleware extractors:

- `require_permission(Permission)` -- single permission gate
- `require_any_permission(&[Permission])` -- any-match gate
- `require_all_permissions(&[Permission])` -- all-match gate
- `require_min_role(Role)` -- hierarchical role check
- `require_organization_access(org_id)` -- DB-backed tenant membership check
- `require_campus_access(campus_id)` -- DB-backed campus membership check

### Worker Authentication

Judge workers authenticate to the API using a shared secret (`WORKER_SECRET`) sent via the `X-Worker-Secret` header. This is separate from JWT-based user authentication and is used only for:
- Result callbacks: `POST /submissions/{id}/results`
- Heartbeat: `POST /internal/worker/heartbeat`

---

## Redis Streams Architecture

### Stream Topology

```
submissions          -- Normal submission queue
submissions:contest  -- High-priority contest submission queue
submissions:dlq      -- Dead-letter queue for failed deliveries
```

### Consumer Group Pattern

All judge workers share a single consumer group (`judge_workers` by default) on both streams. Redis Streams consumer groups provide:
- **Load balancing:** Each message is delivered to exactly one consumer in the group
- **Crash recovery:** Pending messages (XPENDING) can be claimed by another consumer (XCLAIM)
- **Acknowledgement:** Workers explicitly ACK messages after successful processing

### Priority Consumption Algorithm

The worker uses a dual-stream priority consumer that guarantees strict contest-first ordering:

1. If a parked normal message exists from a previous cycle, drain contest first. Only return the parked message when contest is truly empty.
2. Drain the contest stream completely (non-blocking XREADGROUP loop).
3. Read one message from the normal stream with a short 200ms BLOCK timeout.
4. **Critical re-check:** After reading normal, perform one more non-blocking check on the contest stream. If a contest message arrived in the gap, park the normal message and return the contest message instead.

### Crash Recovery

On startup, each worker scans for pending messages older than `RECOVERY_IDLE_MS` (default 300s / 5 minutes):

1. **XPENDING** -- Paginate through pending entries, filtering by idle time > threshold
2. **XCLAIM** -- Claim timed-out messages for this worker
3. **Process** -- Compile, execute, and attempt delivery (same as normal path)
4. **ACK or retry** -- ACK on success; write to DLQ if delivery fails

### Circuit Breakers

Two in-memory circuit breakers protect the worker from cascade failures:

| Breaker | Threshold | Timeout | Purpose |
|---------|-----------|---------|---------|
| Redis | 5 consecutive failures | 30s half-open | Prevents hanging on Redis outages |
| API | 5 consecutive failures | 30s half-open | Prevents hanging on API outages |

State machine: `Closed` (normal) -> `Open` (rejecting) -> `HalfOpen` (probing) -> `Closed` (recovered)

When the API breaker is open, judge results are written directly to the DLQ instead of being discarded.

---

## Database Architecture

### Migration System

Migrations are embedded at compile time via `sqlx::migrate!()` in `api/src/db/schema.rs` and auto-run on server startup with `MIGRATOR.run(&pool).await`. Migration files in `api/migrations/` use a 3-digit numeric prefix naming convention (`NNN_description.sql`).

### Key Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Top-level tenant (school) |
| `campuses` | Sub-organization within a school |
| `users` | User accounts with role, school_id, campus_id |
| `problems` | Problem definitions with difficulty, tags, visibility |
| `problems_test_cases` | Input/output pairs per problem with scoring |
| `submissions` | User code submissions with status, score, runtime, memory |
| `test_case_results` | Per-test-case judging results |
| `contests` | Contest definitions with time window |
| `contest_problems` | Problems assigned to a contest |
| `contest_participants` | User registration for contests |
| `contest_submissions` | Contest-scoped submissions (with upsolving flag) |
| `classes` | Class/section within a campus |
| `class_enrollments` | Student enrollment in classes |
| `assignments` | Problem sets assigned to classes |
| `discussions` | Forum-style problem discussions |
| `blog_articles`, `blog_comments` | Blog content |
| `direct_messages` | Private messaging between users |
| `plagiarism_reports`, `plagiarism_scan` | Code similarity detection results |
| `notifications` | In-app notification queue |
| `judge_language_settings` | Per-problem language enable/disable configuration |

### Query Patterns

- Always parameterized (`$1`, `$2`, etc.) -- never string interpolation
- `query_as::<_, T>()` for mapping to typed structs (must derive `FromRow`)
- `fetch_one` / `fetch_optional` / `fetch_all` depending on expected cardinality
- `sqlx::PgPool` with `deadpool-postgres`-style pool (min 10, max 30 connections in API)

---

## Error Handling

### API Error Handling

A unified `AppError` enum in `api-infra/src/error.rs` maps to HTTP status codes:

| Variant | HTTP Status | When Used |
|---------|-------------|-----------|
| `AppError::Auth(msg)` | 401 Unauthorized | Invalid or missing JWT, blacklisted token |
| `AppError::Forbidden(msg)` | 403 Forbidden | Insufficient permissions or tenant mismatch |
| `AppError::NotFound(msg)` | 404 Not Found | Resource does not exist |
| `AppError::Validation(msg)` | 400 Bad Request | Invalid request body or parameters |
| `AppError::Database(msg)` | 500 Internal Server Error | Database query failure |
| `AppError::Internal(msg)` | 500 Internal Server Error | Unexpected server error |

Response body format:
```json
{
  "error": "Human-readable message",
  "status": 401
}
```

Conversion chain: service methods return `anyhow::Result<T>`, route handlers use `?` which converts via `From<anyhow::Error> for AppError`.

### Judge Worker Error Handling

| Error Category | Behavior |
|---------------|----------|
| Compilation failure | Return `JudgeResult { status: "compilation_error" }`, ACK the message |
| Runtime failure | Return `JudgeResult { status: "runtime_error" }`, ACK the message |
| Time limit exceeded | Kill process, return `JudgeResult { status: "time_limit_exceeded" }`, ACK |
| Memory limit exceeded | Detected via cgroups, return appropriate status, ACK |
| Wrong answer | Return `JudgeResult { status: "wrong_answer" }` with per-test-case details, ACK |
| API callback failure | Retry 3x with exponential backoff, then write to DLQ |
| Redis failure | Circuit breaker opens, skips consumption until recovery |
| Main loop error | Exponential backoff: `min(1000ms * 2^error_count, 60s)` |

---

## Middleware Pipeline

The Axum router stacks middleware in the following order (outermost to innermost):

```
Request
  |
  v
[1] CORS (tower_http::CorsLayer)
  |
  v
[2] Request ID (injects unique ID for tracing)
  |
  v
[3] Metrics (records request duration, status codes)
  |
  v
[4] Rate Limiting (tower_governor: 30 req/min per IP)
  |         Applied separately: rate-limited on public endpoints,
  |         not on health/metrics/worker-heartbeat
  v
[5] Auth Middleware (JWT validation, Redis blacklist check)
  |         Inserts: Claims, user_id (UUID)
  v
[6] Tenant Middleware (extracts school_id from Claims)
  |         Inserts: TenantContext { tenant_id }
  v
Route Handler
```

**Unrestricted endpoints** (no rate limit, no auth): `/health/live`, `/health/ready`, `/health`, `/status`, `/metrics`, `/internal/worker/heartbeat`.

**Rate-limited public endpoints:** `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`, `/ws`.

**Rate-limited protected endpoints:** All `/users/*`, `/problems/*`, `/contests/*`, etc.

---

## Worker Heartbeat System

Judge workers report their status to the API every 10 seconds via `POST /internal/worker/heartbeat` (authenticated with `X-Worker-Secret` header, not JWT).

**Heartbeat payload:**
```json
{
  "worker_id": "worker-<uuid>",
  "active_judgements": 2,
  "total_processed": 1042,
  "avg_wait_ms": 350,
  "redis_breaker_state": "Closed",
  "api_breaker_state": "Closed"
}
```

The API stores heartbeat data in Redis with a 30-second TTL. When the TTL expires (3 consecutive missed heartbeats), the worker is considered offline and removed from the admin monitoring dashboard.

**Metrics tracked:**
- `active_judgements` -- Current in-flight judging tasks (via `AtomicUsize` + RAII guard)
- `total_processed` -- Lifetime count of completed submissions (via `AtomicUsize`)
- `avg_wait_ms` -- Exponential moving average of queue wait time (lock-free CAS loop)
- Circuit breaker states for both Redis and API dependencies

---

## Key Design Decisions

### Why Redis Streams over a message broker (RabbitMQ/Kafka)?

Redis Streams provides sufficient consumer group semantics for this scale, avoids introducing an additional infrastructure dependency, and allows crash recovery via XPENDING/XCLAIM. The dual-stream priority mechanism (contest vs. normal) would be more complex with a traditional message broker.

### Why standalone judge workers instead of in-process judging?

Sandboxed execution requires Linux-specific capabilities (cgroups, seccomp, chroot) and syscall-level process control that does not mix well with an HTTP server. Decoupling workers allows independent scaling (more workers = more concurrent judging) and horizontal deployment across machines. A crashed worker cannot bring down the API server.

### Why JWT-based tenant identity instead of header-based?

Storing `school_id` inside the signed JWT prevents clients from spoofing their organization. The `tenant_middleware` explicitly ignores any `X-Tenant-ID` header and only reads from JWT claims inserted by `auth_middleware`. This makes tenant isolation tamper-proof at the transport layer.

### Why module-per-domain crates instead of a monolithic API crate?

Each domain crate has its own `routes.rs`, `models.rs`, and `service.rs`, making the codebase easier to navigate and test. Domain crates depend on `api-infra` and `shared` but not on each other, preventing circular dependencies. New domains can be added as independent workspace members.

### Why an in-memory RBAC matrix instead of database-driven permissions?

The role-permission mapping is static and changes infrequently. An in-memory `HashSet` lookup is orders of magnitude faster than a database query on every request. The matrix is defined in `api-infra/src/rbac.rs` and can be migrated to a database-backed model in the future without changing the permission-check API.

### Why a single shared `reqwest::Client` in the worker?

Creating a new HTTP client per request would lose TCP keep-alive and require a new TLS handshake each time. A single shared `reqwest::Client` maintains an internal connection pool, reducing latency for result callbacks to the API.
