<!-- generated-by: gsd-doc-writer -->
# Configuration

This document describes all configurable settings across the AlgoMaster platform services: API server, judge worker, frontend, and migration tool.

## Environment Variables

### API Server

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | (none) | PostgreSQL connection string (e.g., `postgresql://user:pass@localhost:5432/online_judge`). Missing in production causes immediate startup failure. |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Redis connection string. Used for caching, JWT blacklisting, WebSocket pub/sub, and worker heartbeats. API starts without Redis but logs a warning. |
| `JWT_SECRET` | Yes (prod) | `dev-only-insecure-jwt-secret-do-not-use-in-production` | Secret key for signing and validating JWT tokens (HS256). **Must be set in production** -- the server refuses to start without it when `APP_ENV=production`. |
| `WORKER_SECRET` | Yes (prod) | `dev-only-insecure-worker-secret-do-not-use-in-production` | Shared secret that judge workers use to authenticate heartbeat callbacks to the API via the `X-Worker-Secret` header. **Must be set in production**. |
| `API_BIND_ADDRESS` | No | `0.0.0.0:3000` | Host and port for the API server to listen on. Must be a valid `host:port` string (e.g., `127.0.0.1:3000`). |
| `APP_ENV` | No | `development` | Application environment mode. Accepted values: `development`, `production`, `test`. Controls secret validation strictness and CORS behavior. |
| `CORS_ORIGINS` | No (prod) | `*` (dev) / empty (prod) | Comma-separated list of allowed CORS origins. In development mode, defaults to allow-all (`*`). In production, defaults to empty (no origins allowed) unless explicitly set. Example: `https://example.com,https://app.example.com`. |
| `RUST_LOG` | No | `api=debug,tower_http=debug,axum=trace` | Log filter for the `tracing` crate. Override to change verbosity. |

**Demo admin user** (development only):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEMO_ADMIN_EMAIL` | No | `admin@example.com` | Email for the auto-created demo admin user. |
| `DEMO_ADMIN_PASSWORD` | No | `admin123` | Password for the demo admin user (stored as bcrypt hash). |
| `DEMO_ADMIN_SCHOOL_ID` | No | `1` | Organization (school) ID for the demo admin. |
| `DEMO_ADMIN_ROLE` | No | `admin` | Role assigned to the demo admin user. |

### Judge Worker

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | No | `redis://127.0.0.1/` | Redis connection string for consuming submission jobs from Redis Streams. |
| `API_URL` | No | `http://127.0.0.1:3000` | Base URL of the API server for posting judge results and heartbeat callbacks. |
| `WORKER_SECRET` | No | `dev-only-insecure-worker-secret-do-not-use-in-production` | Shared secret sent in the `X-Worker-Secret` header when posting heartbeats to the API. Must match the API server's `WORKER_SECRET`. |
| `SUBMISSION_STREAM` | No | `submissions` | Redis Stream name for normal (non-contest) submissions. |
| `CONTEST_STREAM` | No | `submissions:contest` | Redis Stream name for contest submissions (consumed with higher priority). |
| `CONSUMER_GROUP` | No | `judge_workers` | Redis consumer group name for both streams. |
| `CONSUMER_NAME` | No | `worker-{UUID}` | Unique consumer identifier within the consumer group. Auto-generated as a UUID if not set. |
| `MAX_CONCURRENT_JUDGES` | No | `4` | Maximum number of submissions judged concurrently per worker. Must be >= 1. |
| `RECOVERY_IDLE_MS` | No | `300000` (5 min) | Idle time threshold (milliseconds) for recovering pending submissions from crashed workers during startup. |

### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | `/api` | Base URL for API requests from the browser. In production, set to the full API URL (e.g., `http://localhost:3000`). |
| `VITE_WS_BASE_URL` | No | Auto-detected from `window.location` | WebSocket URL. Auto-detects `ws://` or `wss://` based on the current page protocol and host. |
| `VITE_API_PROXY_TARGET` | No | `http://localhost:3000` | Backend target for the Vite dev server `/api` proxy. Only used in development. |
| `VITE_WS_PROXY_TARGET` | No | `ws://localhost:3000` | Backend target for the Vite dev server `/ws` WebSocket proxy. Only used in development. |
| `VITE_ENABLE_MOCK_DATA` | No | `false` | Set to `true` to bypass API calls and use mock data. For UI development without a running backend. |
| `VITE_ENABLE_DIRECT_MESSAGES` | No | `true` | Set to `false` to disable the direct messaging feature. |
| `VITE_ENABLE_PLAGIARISM` | No | `true` | Set to `false` to disable the plagiarism detection module. |
| `VITE_APP_NAME` | No | `Online Judge` | Application name displayed in the UI. |
| `VITE_APP_VERSION` | No | `1.0.0` | Application version string displayed in the UI. |

### Migration Tool

The migration tool uses CLI arguments (via `clap`) rather than environment variables for most settings, but supports `DATABASE_URL` from the environment:

| Variable | CLI Flag | Required | Description |
|----------|----------|----------|-------------|
| `DATABASE_URL` | `--database-url` | Yes | PostgreSQL connection string. Can be passed as env var or CLI flag. |
| -- | `--dump-file` | Yes | Path to the UOJ MySQL dump file to migrate. |
| -- | `--test-case-dir` | No | Path to UOJ test case directory on disk. |
| -- | `--org-id` | Conditional | Existing organization ID to assign migrated data to. One of `--org-id` or `--create-default-org` is required. |
| -- | `--create-default-org` | Conditional | Create a default organization for migrated data. Ignored if `--org-id` is also provided. |
| `RUST_LOG` | -- | No | Log filter. Defaults to `info`. |

## Docker Compose Configuration

The `docker-compose.yml` in the project root defines five services:

### Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `postgres` | `postgres:16-alpine` | 5432 | PostgreSQL 16 database. Health check via `pg_isready`. |
| `redis` | `redis:7-alpine` | 6379 | Redis 7 for caching, streams, and session data. Health check via `redis-cli ping`. |
| `api` | Built from `api/Dockerfile` | 3000 | Rust API server. Depends on postgres and redis being healthy. |
| `frontend` | Built from `frontend/Dockerfile` | 5173 (host) -> 80 (container) | React SPA served via Nginx. Depends on API being healthy. |
| `judge-worker` | Built from `judge-worker/Dockerfile` | -- | Standalone judge worker. Requires `SYS_PTRACE` and `SYS_ADMIN` capabilities for sandboxing. |

### Volumes

| Volume | Used By | Purpose |
|--------|---------|---------|
| `postgres_data` | postgres | Persistent PostgreSQL data storage. |
| `redis_data` | redis | Persistent Redis data storage. |

### Networking

All services share the default Docker Compose network. Internal service discovery uses service names as hostnames (e.g., `postgres`, `redis`, `api`). The `judge-worker` mounts `/var/run/docker.sock` for Docker-in-Docker sandbox execution.

### Key Docker Compose Environment Overrides

The Compose file hardcodes these environment values that differ from application defaults:

- **API `DATABASE_URL`**: `postgresql://postgres:postgres@postgres:5432/online_judge` (uses Docker service name)
- **API `REDIS_URL`**: `redis://redis:6379` (uses Docker service name)
- **Judge worker `DATABASE_URL`**: same as API
- **Judge worker `REDIS_URL`**: same as API
- **Judge worker `API_URL`**: `http://api:3000` (uses Docker service name)

To run the full stack:

```bash
docker compose up -d
```

To reset all data:

```bash
docker compose down -v
```

## Database Configuration

### PostgreSQL

- **Version**: PostgreSQL 16 (Alpine image)
- **Default credentials**: `postgres` / `postgres` (set in Docker Compose; change for production)
- **Default database**: `online_judge`
- **Connection pool**: Created via `sqlx::PgPoolOptions` with configurable `max_connections` (default: 5) and `acquire_timeout` (default: 30s). In the main server startup, the pool is created with `max_connections=10`.
- **Driver**: `sqlx` with `runtime-tokio`, `tls-rustls`, and `postgres` features.

### Migrations

Migrations are embedded at compile time via `sqlx::migrate!()` in `api/src/db/schema.rs` and run automatically on server startup via `MIGRATOR.run(&pool).await`.

Migration files are located in `api/migrations/` with a numeric prefix naming convention. The current migration set includes 28+ files covering:

- Organizations and campuses (multi-tenancy)
- Users, roles, and authentication
- Problems and test cases
- Submissions and test case results
- Contests, participants, and leaderboard snapshots
- Classes, enrollments, and assignments
- Discussions, blog, and notifications
- Direct messages
- Plagiarism reports and scan tracking
- Judge language settings

No manual migration step is required -- the API server applies pending migrations automatically on boot.

## Redis Configuration

### Connection

- **Version**: Redis 7 (Alpine image)
- **Connection pool**: Created via `deadpool_redis::Config::from_url()` with Tokio 1 runtime. Uses default pool sizing (typically 20 connections).
- **Tolerance**: The API server starts without Redis if the connection fails, logging a warning. However, JWT blacklisting, WebSocket broadcasting, and worker heartbeats require Redis.

### Redis Streams (Judge Worker)

The judge worker uses Redis Streams as a job queue with consumer groups:

| Stream | Default Name | Purpose |
|--------|-------------|---------|
| Normal submissions | `submissions` | Queue for regular problem submissions. |
| Contest submissions | `submissions:contest` | Queue for contest submissions (higher priority). |
| Dead letter queue | `{stream}:dlq` | Failed deliveries stored for manual retry. |

**Consumer group** (`judge_workers` by default) enables multiple workers to share the load. The consumer group is created automatically on worker startup if it does not exist.

**Pending Entry List (PEL) recovery**: On startup, the worker scans the PEL for messages idle longer than `RECOVERY_IDLE_MS` (default 5 minutes) and re-processes them, recovering work from crashed worker instances.

### Redis Key Patterns

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `bl:{jti}` | Matches JWT expiration | JWT blacklist entry (set on logout). |
| `worker:heartbeat:{worker_id}` | 30 seconds | Worker heartbeat data stored via atomic Lua script. |
| `submissions:dlq` / `submissions:contest:dlq` | None | Dead letter queue for failed result deliveries. |

## Security Configuration

### JWT Authentication

- **Algorithm**: HS256
- **Token types**: Access tokens (4-hour expiry) and refresh tokens (30-day expiry)
- **Token location**: `Authorization: Bearer <token>` header or `access_token` cookie
- **Claims**: `sub` (user UUID), `email`, `role`, `school_id`, `campus_id`, `iat`, `exp`, `jti` (unique token ID for blacklisting)
- **Token blacklist**: On logout, the JWT ID (`jti`) is stored in Redis under `bl:{jti}` with a TTL matching the token's remaining lifetime. The auth middleware checks this key before accepting a token.

### Password Hashing

- **Algorithm**: bcrypt with default cost (12 rounds)
- **Implementation**: `api/src/auth/password.rs` exports `hash_password()` and `verify_password()` helpers
- **Migration compatibility**: The migration tool (`migration-tool/src/password.rs`) handles MD5-to-bcrypt password upgrades for imported user data.

### Worker Authentication

Judge workers authenticate to the API using the `X-Worker-Secret` header with constant-time byte comparison (to prevent timing attacks). This is separate from JWT authentication and applies only to internal endpoints like `/internal/worker/heartbeat`.

### Rate Limiting

- **Library**: `tower-governor` (wraps the `governor` rate-limiting library)
- **Configuration**: 30 requests per minute per IP address (1 request/second burst size of 30)
- **Scope**: Applied to all public and protected route groups. Unrestricted endpoints (health probes, Prometheus metrics, worker heartbeats) are excluded.

### CORS

- **Development**: Allow-all (`*`) -- all origins, methods (GET, POST, PUT, PATCH, DELETE, OPTIONS), and headers (Authorization, Content-Type) are permitted.
- **Production**: Controlled via `CORS_ORIGINS` environment variable. Defaults to empty (no origins) if not explicitly set, blocking cross-origin requests. Set to a comma-separated list of allowed origins.

### Secrets Validation

The API enforces strict secret validation based on `APP_ENV`:

| Mode | JWT_SECRET | WORKER_SECRET | DATABASE_URL |
|------|-----------|---------------|--------------|
| `development` | Warns, uses insecure default | Warns, uses insecure default | **Required** |
| `production` | **Required** (startup fails without) | **Required** (startup fails without) | **Required** |
| `test` | Not read from env (uses `test_config()`) | Not read from env | Not read from env |

Empty string values are treated as unset in production.

## Multi-Tenancy Configuration

### Tenant Isolation

AlgoMaster enforces organization-level (tenant) data isolation through middleware:

1. **Auth middleware** (`api-infra/src/middleware/auth.rs`): Validates the JWT and inserts `Claims` (including `school_id`) into the request extensions.
2. **Tenant middleware** (`api-infra/src/middleware/tenant.rs`): Extracts `school_id` from JWT claims and creates a `TenantContext { tenant_id }` extension. The `X-Tenant-ID` header is **never trusted** -- tenant identity comes exclusively from the verified JWT.
3. **Domain queries**: All domain service queries filter by `organization_id = $1` (the tenant ID from context).

### Organization Hierarchy

```
organizations (top-level tenant)
  └── campuses (optional sub-organization)
       └── users (assigned to school_id + optional campus_id)
```

Users are assigned a `school_id` (required) and `campus_id` (optional). JWT claims carry both values, enabling campus-level access control checks in addition to organization-level isolation.

### RBAC Middleware

The permission middleware (`api-infra/src/middleware/authz.rs`) provides five gate functions:

- `require_permission(Permission)` -- single permission check
- `require_any_permission(&[Permission])` -- any-match gate
- `require_all_permissions(&[Permission])` -- all-match gate
- `require_min_role(Role)` -- hierarchical role check
- `require_organization_access(org_id)` / `require_campus_access(campus_id)` -- DB-backed tenant membership check

## Frontend Build Configuration

### Vite

The Vite configuration is in `frontend/vite.config.ts`:

| Setting | Value | Description |
|---------|-------|-------------|
| Dev server port | `5173` | Local development server. |
| Path alias | `@/` -> `./src/` | Import alias for cleaner imports. |
| Build target | `chrome109` | Minimum browser version for production builds. |
| API proxy | `/api` -> `VITE_API_PROXY_TARGET` | Strips `/api` prefix and forwards to backend. |
| WS proxy | `/ws` -> `VITE_WS_PROXY_TARGET` | WebSocket proxy with `ws: true`. |

### Code Splitting

Production builds use `manualChunks` to split vendor bundles:

| Chunk | Contents |
|-------|----------|
| `data-core` | TanStack React Query, Axios, Zustand |
| `icon-kit` | Lucide React icons |
| `charts-kit` | Recharts |
| `editor-core` | Monaco Editor, CodeMirror |
| `markdown-core` | react-markdown, remark-gfm, DOMPurify |
| `syntax-highlight` | react-syntax-highlighter |
| `form-core` | react-hook-form, Zod, hookform resolvers |

### TypeScript

Configuration is split across three files:

- **`tsconfig.json`**: Root project references. Path alias `@/*` -> `./src/*`.
- **`tsconfig.app.json`**: Application code. Target `ES2022`, module `ESNext` (bundler mode), `react-jsx`, strict mode enabled.
- **`tsconfig.node.json`**: Node-side tooling (Vite config).

## Feature Flags

Feature flags are boolean environment variables consumed at build time by the frontend via `import.meta.env`. They are defined in `frontend/src/services/config.ts` as the `FEATURE_FLAGS` object.

| Flag | Variable | Default | Effect when `false` |
|------|----------|---------|---------------------|
| Direct Messages | `VITE_ENABLE_DIRECT_MESSAGES` | `true` | Hides the messaging feature from the UI. |
| Plagiarism | `VITE_ENABLE_PLAGIARISM` | `true` | Hides the plagiarism detection module from the UI. |
| Mock Data | `VITE_ENABLE_MOCK_DATA` | `false` | When `true`, bypasses all API calls and uses local mock data for UI development. |

Implementation pattern (from `config.ts`):

```typescript
export const FEATURE_FLAGS = {
  directMessages: import.meta.env.VITE_ENABLE_DIRECT_MESSAGES !== 'false',
  plagiarism: import.meta.env.VITE_ENABLE_PLAGIARISM !== 'false',
} as const
```

Flags use an "enabled by default" pattern: they are enabled unless explicitly set to the string `"false"`. This means omitting the variable or setting it to any value other than `"false"` keeps the feature active.

## Circuit Breakers (Judge Worker)

The judge worker uses in-memory circuit breakers (`judge-worker/src/circuit_breaker.rs`) to protect against cascade failures from Redis and the API:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `failure_threshold` | 5 | Consecutive failures required to open the circuit. |
| `half_open_timeout_secs` | 30 | Seconds before transitioning from Open to HalfOpen. |

**State machine**: Closed (normal) -> Open (failing, reject requests) -> HalfOpen (probing with one request) -> Closed (on success) or Open (on failure).

Breaker state is included in heartbeat payloads reported to the API for admin monitoring.

<!-- GSD:docs -->
