# External Integrations

## Overview

This document maps all integration points between the system components: API server, judge-worker, PostgreSQL, Redis, and frontend client.

---

## System Architecture

```
                    +-----------+
                    | Frontend  |  React SPA (Vite)
                    | (port 5173/80)  |
                    +-----+-----+
                          |
                    HTTP / WebSocket
                          |
                    +-----+-----+
                    | API Server |  Axum (Rust)
                    | (port 3000)     |
                    +--+--+--+--+
                       |  |  |
              +--------+  |  +--------+
              |           |            |
        +-----+---+ +---+----+ +-----+------+
        |PostgreSQL| | Redis  | | Judge Worker|
        | (port    | | (port  | | (pulls from |
        |  5432)   | | 6379)  | |  Redis,     |
        |          | |        | |  posts to   |
        |          | |        | |  API)       |
        +----------+ +--------+ +------------+
```

---

## 1. Database (PostgreSQL)

### Connection

- **Driver**: sqlx 0.8 with `runtime-tokio`, `tls-rustls`, `postgres` features
- **Pool**: `sqlx::PgPool` -- max 10 connections, 30s acquire timeout
- **Migrations**: Embedded via `sqlx::migrate!()` macro, run automatically at API startup from `api/migrations/`
- **Connection string**: `DATABASE_URL` env var

### Schema (25+ migration files in `api/migrations/`)

#### Core Tables

| Table | Primary Key | Key Columns | Description |
|-------|------------|-------------|-------------|
| `organizations` | BIGSERIAL | name, slug | Tenant (school) |
| `campuses` | BIGSERIAL | organization_id, name | Sub-tenant within school |
| `users` | UUID | email, password_hash, organization_id, campus_id | User accounts |
| `problems` | BIGSERIAL | organization_id, campus_id, author_id, title, description, difficulty, visibility, time_limit_ms, memory_limit_kb | Programming problems |
| `test_cases` | BIGSERIAL | problem_id, input, expected_output, is_sample, score_points | Test cases for problems |
| `test_case_results` | BIGSERIAL | submission_id, test_case_id, status, expected_output, actual_output, error_message, runtime_ms, memory_kb | Judging results per test case |
| `submissions` | BIGSERIAL | organization_id, user_id, problem_id, language, code, status, verdict, time_ms, memory_kb | Code submissions |
| `classes` | BIGSERIAL | organization_id, campus_id, name, teacher_id, semester | Classes |
| `class_enrollments` | - | class_id, user_id, role | Class membership |
| `assignments` | - | class_id, problem_id, due_date | Problem assignments to classes |
| `contests` | BIGSERIAL | organization_id, campus_id, name, description, rules (acm/ioi/education), start_time, end_time, freeze_minutes | Programming contests |
| `contest_problems` | - | contest_id, problem_id | Problems in contests |
| `contest_participants` | - | contest_id, user_id | Contest participation |
| `contest_submissions` | - | contest_id, submission_id | Contest submission tracking |
| `discussions` | BIGSERIAL | problem_id, user_id, parent_id, content, is_pinned, votes_count | Problem discussions |
| `discussion_replies` | UUID | discussion_id, user_id, content, parent_id, votes_count | Nested replies |
| `articles` | BIGSERIAL | title, slug, content, summary, author_id, tags, category, is_published, is_featured, view_count, like_count, comment_count | Blog posts |
| `article_comments` | BIGSERIAL | article_id, parent_id, content, author_id | Article comments |
| `likes` | BIGSERIAL | user_id, target_type, target_id | Like reactions |
| `notifications` | UUID | user_id, type, title, content, link, is_read, actor_id, metadata (JSONB) | User notifications |
| `notification_settings` | UUID (user_id) | email_notifications, reply_notifications, etc., digest_mode | Notification preferences |
| `plagiarism_scan_configs` | SMALLINT | enabled, language, threshold, min_token_length, window_size | Plagiarism detection config |
| `plagiarism_scan_reports` | UUID | contest_id, assignment_id, status, overall_risk | Plagiarism scan results |
| `plagiarism_scan_pairs` | BIGSERIAL | report_id, left/right_submission_id, left/right_user, similarity, matched_lines | Suspicious code pairs |
| `judge_language_settings` | BOOLEAN (singleton) | c_enabled, cpp_enabled | Language availability toggle |
| `direct_messages` | UUID | sender_id, recipient_id, content, is_read | Private messages |

#### Multitenancy Pattern

All data tables include `organization_id` (BIGINT NOT NULL REFERENCES organizations) for tenant isolation. Some tables also have `campus_id` for sub-tenant scoping.

#### Database Trigger

All tables with `updated_at` columns use the shared trigger function `update_updated_at_column()` (migration 000) which automatically sets `updated_at = NOW()` on row updates.

---

## 2. Redis

### Connection

- **Driver**: redis 0.27 (tokio-comp, connection-manager) + deadpool-redis 0.22 for connection pooling
- **Pool**: `deadpool_redis::Pool` with Tokio1 runtime
- **Connection string**: `REDIS_URL` env var

### Usage Patterns

#### 2.1 JWT Blacklist (Token Revocation)

- **Key pattern**: `bl:{jti}` (where jti is the JWT ID)
- **Operation**: `SET bl:{jti} 1 EX {ttl}` on logout
- **Check**: `EXISTS bl:{jti}` in auth middleware
- **TTL**: Remaining token lifetime (exp - now)
- **Purpose**: Immediate session invalidation without waiting for token expiry

#### 2.2 Submission Queue (Redis Streams)

- **Stream name**: `submissions` (configurable via `SUBMISSION_STREAM`)
- **Consumer group**: `judge_workers` (configurable via `CONSUMER_GROUP`)
- **Protocol**: XADD (producer) / XREADGROUP (consumer) / XACK (acknowledgment)

##### Producer (API side -- `api/src/submissions/queue.rs`)

When a submission is created:
1. Ensure stream exists (`XGROUP CREATE ... MKSTREAM`)
2. Ensure consumer group exists
3. Serialize `SubmissionMessage` to JSON
4. `XADD submissions * submission_id {id} data {json}`

`SubmissionMessage` fields:
- `submission_id` (i64)
- `problem_id` (i64)
- `user_id` (UUID)
- `language` (String)
- `source_code` (String)
- `time_limit_ms` (u64)
- `memory_limit_mb` (u64)

##### Consumer (Judge Worker -- `judge-worker/src/queue/consumer.rs`)

1. `XREADGROUP GROUP judge_workers {consumer_name} BLOCK 5000 COUNT 10 submissions >`
2. Block for up to 5 seconds waiting for messages
3. Process up to 4 submissions concurrently (semaphore-controlled)
4. `XACK submissions judge_workers {message_id}` after processing

##### Dead Letter Queue (DLQ -- `judge-worker/src/queue/dlq.rs`)

When all 3 HTTP retries to post results back to API fail:
- Write `JudgeResult` to DLQ in Redis
- Key: `dlq:submissions:{submission_id}`
- Always ACK the stream message to prevent infinite reprocessing

#### 2.3 Cache Operations (Available but not heavily used)

The API exposes `RedisCacheOps` trait with get/set/delete/exists, and `RedisStreamOps` trait for generic stream operations. These are defined in `api/src/redis/mod.rs` and used by the submission queue.

---

## 3. API Server <-> Judge Worker Communication

### Architecture: Asynchronous via Redis Streams + HTTP Callback

The API and judge-worker communicate through a decoupled pattern:

```
API Server                    Redis                  Judge Worker
    |                           |                         |
    |-- XADD submissions ------>|                         |
    |                           |-- XREADGROUP ---------->|
    |                           |                    [compile, run, judge]
    |<-- POST /submissions/:id/results (X-Worker-Secret) --|
    |                           |<-- XACK ---------------|
```

### Judge Worker -> API: Result Callback

- **Endpoint**: `POST {API_URL}/submissions/{submission_id}/results`
- **Authentication**: `X-Worker-Secret` header (constant-time comparison)
- **Content-Type**: application/json

`JudgeResult` payload:
```json
{
  "submission_id": 123,
  "status": "accepted",
  "score": 100,
  "runtime_ms": 150,
  "memory_kb": 1024,
  "test_case_results": [
    {
      "test_case_id": 1,
      "status": "accepted",
      "expected_output": "Hello",
      "actual_output": "Hello",
      "error_message": null,
      "runtime_ms": 50,
      "memory_kb": 512
    }
  ]
}
```

### Security Measures on Callback

1. **X-Worker-Secret header**: Constant-time comparison against stored secret
2. **Path/body ID match**: `:id` path param must equal `submission_id` in body
3. **State machine**: Only allows transitions pending/queued -> judging -> terminal
4. **Idempotency**: Duplicate callbacks with same verdict are silently accepted
5. **Terminal state protection**: Already-judged submissions cannot be overwritten

### Retry Logic (Judge Worker side)

- Up to 3 retries with exponential backoff (2s, 4s, 8s)
- On exhaustion, writes to Redis DLQ before giving up

---

## 4. Frontend <-> API Communication

### HTTP (REST API)

- **Client**: axios with interceptors (automatic 401 refresh)
- **Base URL**: Configurable via `VITE_API_BASE_URL` (defaults to `/api`)
- **Auth**: Cookies (HttpOnly, SameSite=Strict) with Bearer token fallback
- **Dev proxy**: Vite proxies `/api` requests to `http://localhost:3000` (strips `/api` prefix)
- **Timeout**: 30 seconds
- **Credentials**: `withCredentials: true` (sends cookies cross-origin)

### Token Refresh Flow

1. API returns 401 on any protected endpoint
2. Axios interceptor catches 401, sets `_retry` flag
3. Calls `POST /auth/refresh` with cookies (HttpOnly refresh_token)
4. Gets new access_token, retries original request
5. Mutex pattern: concurrent 401s share one refresh promise
6. On refresh failure: redirect to `/login`

### API Endpoints

#### Public Routes (no auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/status` | System status (DB connectivity) |
| POST | `/auth/login` | User login (returns tokens + cookies) |
| POST | `/auth/register` | User registration |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout (blacklist token) |
| GET | `/ws` | WebSocket upgrade |

#### Protected Routes (JWT auth + tenant middleware)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Current user profile |
| GET/POST/PUT/DELETE | `/users/*` | User management |
| GET/POST/PUT/DELETE | `/problems/*` | Problem CRUD |
| GET/POST/PUT/DELETE | `/contests/*` | Contest management |
| GET | `/leaderboard/*` | Leaderboard data |
| POST | `/submissions` | Create submission |
| GET | `/submissions` | List submissions |
| GET | `/submissions/stats` | User submission statistics |
| GET | `/submissions/:id` | Get submission detail |
| POST | `/submissions/:id/results` | Judge result callback (worker auth) |
| GET/POST/PUT/DELETE | `/classes/*` | Class management |
| GET/POST/PUT/DELETE | `/discussions/*` | Problem discussions |
| GET/POST/PUT/DELETE | `/blog/*` | Blog/articles |
| GET/POST/PUT/DELETE | `/search/*` | Search (full-text) |
| GET/POST/PUT/DELETE | `/notifications/*` | Notification management |
| GET/POST/PUT/DELETE | `/messages/*` | Direct messages |
| GET/POST/PUT/DELETE | `/admin/plagiarism/*` | Plagiarism detection |

### Rate Limiting

- 30 requests per minute per IP (governor crate)
- Applied globally (covers all endpoints including internal worker callbacks)

---

## 5. WebSocket Communication

### Connection

- **Protocol**: Native WebSocket (axum WS), not Socket.IO despite socket.io-client being a dependency
- **URL**: `ws://host/ws` or proxied via Vite `/ws` -> `ws://localhost:3000`
- **Authentication**: JWT token via query parameter (`?token=...`) or HttpOnly cookie (`access_token`)
- **Auto-subscribe**: On connect, user is auto-subscribed to `user:{user_id}` notification topic

### Message Protocol

Messages are JSON with `type` and `data` fields (serde tag/content serialization):

```json
{ "type": "SubmissionUpdate", "data": { ... } }
```

### Message Types (server -> client)

| Type | Purpose |
|------|---------|
| `SubmissionUpdate` | Real-time submission status changes |
| `LeaderboardUpdate` | Leaderboard data changes |
| `Notification` | New notification for user |
| `ContestUpdate` | Contest status changes (starting_soon, started, ended) |
| `ProblemStats` | Problem submission statistics |
| `ChatMessage` | Contest chat messages |
| `DiscussionReply` | New discussion replies |
| `ArticleComment` | New article comments |
| `TrendingArticles` | Trending articles update (tenant-scoped) |
| `Ping` / `Pong` | Heartbeat (30s interval) |
| `Error` | Error messages from server |

### Message Types (client -> server)

| Type | Purpose |
|------|---------|
| `Ping` | Heartbeat keep-alive |
| `Pong` | Response to server ping |
| `SubmissionUpdate` | Subscribe to submission topic (validated: only own submissions) |
| `ContestUpdate` | Subscribe to contest topic (validated: only own org's contests) |
| `ChatMessage` | Subscribe to contest chat (validated: teacher or participant) |

### Topic Naming Convention

| Topic Pattern | Description |
|---------------|-------------|
| `submission:{id}` | Submission status updates |
| `problem:{id}` | Problem statistics |
| `contest:{id}` | Contest status updates |
| `leaderboard:{scope}:{scope_id}` | Leaderboard changes |
| `user:{uuid}` | User notifications |
| `contest:{id}:chat` | Contest chat messages |

### Connection Limits

- Max 5 concurrent WebSocket connections per user
- Max 16 topic subscriptions per client connection

### Tenant Isolation

- `broadcast_to_tenant(school_id, msg)` sends only to clients of a specific organization
- Each client tracks its tenant (school_id) at connection time via JWT claims

### Frontend WebSocket Implementation

- Singleton `WebSocketService` class in `frontend/src/services/websocket.ts`
- Native `WebSocket` API (not Socket.IO client despite the dependency)
- Auto-reconnect with exponential backoff (max 5 attempts, 3s base delay)
- 30-second ping/pong heartbeat
- React hooks in `frontend/src/hooks/useWebSocket.ts`:
  - `useWebSocket()` -- general connection management
  - `useSubmissionUpdates(id)` -- submission result streaming
  - `useContestUpdates(id)` -- contest status streaming
  - `useNotifications()` -- notification push
  - `useLeaderboardUpdates(scope)` -- leaderboard updates
- Community hooks in `frontend/src/hooks/useCommunityUpdates.ts` are currently **disabled** (compatibility shims)

---

## 6. Authentication Flow

### JWT-Based Authentication

- **Algorithm**: HS256
- **Library**: jsonwebtoken 9 (Rust)
- **Service**: `JwtService` in `api/src/auth/jwt_service.rs`
- **Claims** (in `shared/src/models/auth.rs`):
  - `sub` (UUID) -- User ID
  - `email` (String) -- User email
  - `role` (String) -- User role (root, organizationadmin, campusadmin, teacher, teachingassistant, student)
  - `school_id` (i64) -- Tenant (organization) ID
  - `campus_id` (Option<i64>) -- Sub-tenant campus ID
  - `iat` (i64) -- Issued at timestamp
  - `exp` (i64) -- Expiration timestamp
  - `jti` (UUID) -- Unique token ID (for blacklist)

### Token Types

| Token | Expiration | Delivery | Purpose |
|-------|-----------|----------|---------|
| Access Token | 4 hours | Cookie (HttpOnly, path=/) + response body | API authentication |
| Refresh Token | 30 days | Cookie (HttpOnly, path=/api/auth/refresh) | Token renewal |

### Login Flow

1. Client sends `POST /auth/login` with `{username, password}`
2. Server verifies password (bcrypt hash comparison)
3. Server generates access_token + refresh_token
4. Server sets HttpOnly cookies:
   - `access_token` -- Max-Age 14400s (4h), path=/
   - `refresh_token` -- Max-Age 604800s (7d), path=/api/auth/refresh
5. Response body includes both tokens + user profile
6. Frontend stores user in Zustand auth store

### Auth Middleware (`api/src/middleware/auth.rs`)

Applied as route layer to all `/users`, `/problems`, `/contests`, etc. routes:

1. Extract token from `Authorization: Bearer {token}` header, falling back to `access_token` cookie
2. Decode and validate JWT
3. Check Redis blacklist (`EXISTS bl:{jti}`)
4. Insert `Claims` into request extensions

### Logout Flow

1. Client calls `POST /auth/logout`
2. Server calculates remaining TTL
3. Server writes `bl:{jti}` to Redis with TTL = remaining token lifetime
4. Future requests with this token will be rejected by auth middleware

### Tenant Middleware

Applied after auth middleware:
- Extracts `school_id` from JWT claims
- Enforces tenant isolation on data access

### RBAC Roles (hierarchical, lowest to highest)

| Role | Level | Permissions |
|------|-------|-------------|
| Student | 0 | Submit solutions, view problems, view leaderboard |
| TeachingAssistant | 1 | Help grade submissions |
| Teacher | 2 | Create problems, manage classes, grade submissions |
| CampusAdmin | 3 | Admin permissions for campus |
| OrganizationAdmin | 4 | Admin permissions for organization |
| Root | 5 | System-wide access across all tenants |

---

## 7. Judge Worker Sandboxing

### Execution Environment

- **chroot**: Isolated filesystem at `/var/lib/onlinejudge/sandbox`
- **cgroups v2**: CPU time and memory limits, process ID limits
- **seccomp**: System call filtering via `libseccomp-sys`
- **Default limits**: 2s CPU time, 256MB memory, 64 max PIDs

### Supported Languages (configurable via `judge_language_settings` table)

- Python 3
- C
- C++

Language availability is toggled via admin settings stored in PostgreSQL singleton table.

---

## 8. Vite Dev Proxy Configuration

During development, Vite proxies requests to avoid CORS issues:

| Route | Target | Behavior |
|-------|--------|----------|
| `/api/*` | `http://localhost:3000` | Strips `/api` prefix (so `/api/problems` -> `http://localhost:3000/problems`) |
| `/ws` | `ws://localhost:3000` | WebSocket proxy with upgrade support |

---

## 9. Third-Party Services

No external third-party services are currently integrated. The system is entirely self-contained:
- No email service (notifications are in-app only)
- No cloud storage (no file upload features)
- No payment processing
- No external authentication providers (OAuth, etc.)
- No CDN or external asset hosting
- No analytics or monitoring services

All services run locally via Docker Compose or on the same server.
