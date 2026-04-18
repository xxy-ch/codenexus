<!-- generated-by: gsd-doc-writer -->

# Deployment Guide

This document covers deploying AlgoMaster Online Judge with Docker Compose. The system consists of four services: a PostgreSQL database, a Redis cache/message queue, a Rust API server, a React frontend served by Nginx, and a judge worker that executes submitted code in sandboxed containers.

## Deployment Targets

The project deploys via **Docker Compose** as the primary orchestration mechanism. Each service has a dedicated Dockerfile:

| Service | Dockerfile | Base Image | Port |
|---------|-----------|------------|------|
| PostgreSQL | Uses `postgres:16-alpine` directly | `postgres:16-alpine` | 5432 |
| Redis | Uses `redis:7-alpine` directly | `redis:7-alpine` | 6379 |
| API | `api/Dockerfile` | `rust:1.88-alpine` (build), `alpine:3.19` (runtime) | 3000 |
| Frontend | `frontend/Dockerfile` | `node:20-alpine` (build), `nginx:1.25-alpine` (runtime) | 80 (mapped to 5173) |
| Judge Worker | `judge-worker/Dockerfile` | `rust:1.88-alpine` (build), `alpine:3.19` (runtime) | N/A |

No other deployment platform configurations (Vercel, Netlify, Fly.io, Kubernetes) are present.

## Docker Compose Setup

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd Online_Judge

# Set required environment variables
export JWT_SECRET="your-secure-random-secret-here"

# Start all services
docker compose up -d

# Verify all services are healthy
docker compose ps
```

### Services Overview

The `docker-compose.yml` defines five services with the following dependency chain:

```
postgres (healthy) --> api (healthy) --> frontend
redis (healthy)   --/        \
                          judge-worker
```

- **postgres**: PostgreSQL 16 database with health check via `pg_isready`.
- **redis**: Redis 7 for caching, JWT blacklist, and submission message queues.
- **api**: Axum HTTP server with embedded migrations. Depends on postgres and redis being healthy.
- **frontend**: Nginx serving the built React SPA with reverse proxy to the API. Depends on the API being healthy.
- **judge-worker**: Consumes submission jobs from Redis Streams, judges code in sandboxed containers. Depends on postgres, redis, and the API being healthy.

### Volumes

Two named volumes provide persistent storage:

| Volume | Mount Point | Purpose |
|--------|-----------|---------|
| `postgres_data` | `/var/lib/postgresql/data` | Database persistence |
| `redis_data` | `/data` | Redis persistence |

To reset all data (destructive):

```bash
docker compose down -v
```

### Common Operations

```bash
# Start specific services only
docker compose up -d postgres redis

# View logs for a specific service
docker compose logs -f api

# Rebuild after code changes
docker compose build api
docker compose up -d api

# Stop all services
docker compose down
```

## Building Docker Images

### API (Multi-stage Rust Build)

The `api/Dockerfile` uses a two-stage build:

1. **Build stage** (`rust:1.88-alpine`): Compiles the `api` crate in release mode. The workspace `Cargo.toml` and `Cargo.lock` are copied first for layer caching, then source code.
2. **Runtime stage** (`alpine:3.19`): Copies the compiled binary, migration files, and the `docker-entrypoint.sh` script. Runs as non-root user `appuser` (UID 1000).

The entrypoint script (`api/docker-entrypoint.sh`) waits for PostgreSQL to become healthy using `pg_isready` before starting the API binary.

### Frontend (Multi-stage Node + Nginx Build)

The `frontend/Dockerfile` uses a three-stage build:

1. **Dependencies stage** (`node:20-alpine`): Installs production dependencies.
2. **Builder stage** (`node:20-alpine`): Installs all dependencies and runs `npm run build`.
3. **Production stage** (`nginx:1.25-alpine`): Copies built assets to Nginx's document root.

The Nginx configuration (`frontend/nginx.conf`) handles:
- Reverse proxy `/api/` requests to the API service at `http://api:3000`
- WebSocket proxy `/ws` to the API with HTTP upgrade headers
- SPA fallback (`try_files $uri /index.html`)
- Gzip compression for text-based assets
- Security headers (X-Frame-Options, X-Content-Type-Options, CSP)
- Long-term caching for static assets (1 year)
- A lightweight `/health` endpoint for container health checks

### Judge Worker (Multi-stage Rust Build)

The `judge-worker/Dockerfile` uses a two-stage build:

1. **Build stage** (`rust:1.88-alpine`): Compiles the `judge-worker` crate in release mode.
2. **Runtime stage** (`alpine:3.19`): Installs all six supported language runtimes (gcc, g++, openjdk17, go, rust, python3, nodejs) since the worker must compile and execute user-submitted code.

The worker requires Linux host capabilities for sandboxing (see the Judge Worker Deployment section below).

## Production Configuration

### Required Environment Variables

The following variables must be set before deployment. Variables marked "Required" will cause startup failure if absent.

**API Service:**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | -- | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Redis connection string |
| `JWT_SECRET` | Yes | `default_jwt_secret_change_me` | JWT signing key (must change in production) |
| `WORKER_SECRET` | No | `default_worker_secret_change_me` | Shared secret for worker-to-API authentication |
| `API_BIND_ADDRESS` | No | `0.0.0.0:3000` | Server bind address |
| `RUST_LOG` | No | `api=debug,tower_http=debug,axum=trace` | Tracing filter |

**Judge Worker:**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | No | `redis://127.0.0.1/` | Redis connection string |
| `API_URL` | No | `http://127.0.0.1:3000` | API server URL for result callbacks |
| `WORKER_SECRET` | Yes | -- | Shared secret for API authentication |
| `DATABASE_URL` | No | -- | PostgreSQL connection for fetching test cases |
| `SUBMISSION_STREAM` | No | `submissions` | Redis stream for normal submissions |
| `CONTEST_STREAM` | No | `submissions:contest` | Redis stream for contest submissions |
| `CONSUMER_GROUP` | No | `judge_workers` | Redis consumer group name |
| `CONSUMER_NAME` | No | `worker-{uuid}` | Unique consumer identifier (auto-generated) |
| `MAX_CONCURRENT_JUDGES` | No | `4` | Maximum concurrent judging tasks |
| `RECOVERY_IDLE_MS` | No | `300000` (5 min) | Idle threshold for recovering pending messages |

**Frontend:**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | `/api` | API base URL (built into static assets) |
| `VITE_WS_BASE_URL` | No | Auto-detected | WebSocket URL |
| `VITE_ENABLE_MOCK_DATA` | No | `false` | Enable mock data mode |
| `VITE_ENABLE_DIRECT_MESSAGES` | No | `true` | Feature toggle for DMs |
| `VITE_ENABLE_PLAGIARISM` | No | `true` | Feature toggle for plagiarism module |

### Production Security Checklist

- **Change `JWT_SECRET`** from the default. Generate a cryptographically random string (e.g., `openssl rand -base64 64`).
- **Change `WORKER_SECRET`** from the default. Both the API and judge worker must share the same value.
- **Do not expose PostgreSQL (5432) or Redis (6379) ports** to the public internet. The docker-compose.yml maps them to localhost for development; restrict or remove these mappings in production.
- **Configure CORS origins** via the API configuration instead of using the wildcard `*` default. The API logs a warning when the wildcard is active.
- **Set `RUST_LOG`** to a lower verbosity in production (e.g., `api=warn,tower_http=warn`).

## Judge Worker Deployment

### Linux Requirement

The judge worker requires a **Linux host** for sandboxing. It uses:

- **cgroups**: Memory and CPU limits on judge processes
- **chroot**: Filesystem isolation for compiled user code
- **seccomp**: Syscall filtering to restrict dangerous system calls

These primitives are unavailable on macOS and Windows. The judge worker will not function correctly outside of a Linux environment.

### Docker Capabilities

The docker-compose.yml grants the judge worker container elevated privileges:

```yaml
judge-worker:
  cap_add:
    - SYS_PTRACE
    - SYS_ADMIN
  security_opt:
    - no-new-privileges:true
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
```

- `SYS_PTRACE` and `SYS_ADMIN`: Required for cgroups management and process isolation.
- `no-new-privileges:true`: Prevents the worker process from escalating privileges beyond what is granted.
- Docker socket mount: Allows the worker to manage containers for sandboxed code execution.

### Scaling Workers

To run multiple judge workers for increased throughput:

```bash
# Scale to 3 worker instances
docker compose up -d --scale judge-worker=3
```

Each worker auto-generates a unique `CONSUMER_NAME` (UUID-based) and joins the same `judge_workers` consumer group. Redis Streams distributes submissions across consumers in the group automatically. Adjust `MAX_CONCURRENT_JUDGES` per worker based on available CPU and memory.

### Circuit Breakers

The worker uses two circuit breakers to handle dependency failures gracefully:

- **Redis breaker**: Opens after 5 consecutive Redis failures, recovers after 30 seconds. When open, the worker skips consuming new messages.
- **API breaker**: Opens after 5 consecutive API callback failures, recovers after 30 seconds. When open, failed results are written to the Dead Letter Queue (DLQ) instead.

### Pending Message Recovery

On startup, the worker scans for messages left in the Pending Entries List (PEL) from crashed workers. Messages idle longer than `RECOVERY_IDLE_MS` (default 5 minutes) are reclaimed and reprocessed. This ensures submissions are never lost due to worker crashes.

## Database

### Migrations

Database migrations are **embedded at compile time** via `sqlx::migrate!()` in `api/src/db/schema.rs` and run **automatically on API startup**:

```rust
MIGRATOR.run(&db_pool).await?;
```

Migration files live in `api/migrations/` with the naming pattern `NNN_description.sql` (3-digit prefix). There are 25 migrations covering organizations, users, problems, submissions, contests, classes, discussions, plagiarism, messages, and blog tables.

No manual migration step is required -- deploying a new API version applies any pending migrations automatically.

### Migration Tool

A standalone `migration-tool` binary exists for migrating data from a legacy MySQL database into PostgreSQL. This is a one-time operation, not part of the normal deployment cycle. Run it separately when importing data from an existing system:

```bash
cargo run --bin migration-tool -- --help
```

### Backup

<!-- VERIFY: Production backup strategy should include pg_dump scheduling -->

PostgreSQL data is stored in the `postgres_data` Docker volume. To create a manual backup:

```bash
docker compose exec postgres pg_dump -U postgres online_judge > backup_$(date +%Y%m%d).sql
```

To restore from a backup:

```bash
cat backup_YYYYMMDD.sql | docker compose exec -T postgres psql -U postgres online_judge
```

## Monitoring

### Health Endpoints

The API exposes Kubernetes-style health probes:

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /health/live` | Liveness probe | `200 OK` with body `"OK"` |
| `GET /health/ready` | Readiness probe | `200 OK` with DB and Redis status, or `503` if either is down |
| `GET /health` | Redirect to `/health/live` (backward compat) | `307` redirect |
| `GET /status` | Redirect to `/health/ready` (backward compat) | `307` redirect |

The readiness probe checks both PostgreSQL (`SELECT 1`) and Redis (`PING`) connectivity. Response bodies contain only status strings (`"connected"` / `"unavailable"`) -- no connection strings or hostnames are exposed.

### Prometheus Metrics

The API exposes a `GET /metrics` endpoint with Prometheus-formatted metrics for scraping. The metrics recorder is initialized at startup and tracks request-level telemetry.

### Worker Heartbeats

Judge workers POST heartbeat data to the API every **10 seconds** at `POST /internal/worker/heartbeat`. The heartbeat includes:

- `worker_id`: Unique consumer identifier
- `active_judgements`: Currently running judge tasks
- `total_processed`: Lifetime submission count
- `avg_wait_ms`: Exponential moving average of queue wait time
- `redis_breaker_state`: Redis circuit breaker state (Closed/Open/HalfOpen)
- `api_breaker_state`: API circuit breaker state

Heartbeat data is stored in Redis hashes at `worker:heartbeat:{worker_id}` with a **30-second TTL**. Workers missing 3 consecutive heartbeats trigger an error log. The store uses an atomic Lua script (HSET + EXPIRE in a single EVAL) to prevent stale keys.

### Judge Monitor (Admin Dashboard)

The API provides admin endpoints for monitoring the judge infrastructure at `/admin/judge/`:

| Endpoint | Method | Role Required | Description |
|----------|--------|---------------|-------------|
| `/admin/judge/status` | GET | root | Queue depths, active workers, average wait time |
| `/admin/judge/dlq` | GET | admin | List Dead Letter Queue entries |
| `/admin/judge/dlq/{id}/retry` | POST | admin | Re-enqueue a DLQ entry to its original stream |
| `/admin/judge/dlq/{id}` | DELETE | admin | Permanently discard a DLQ entry |

The status endpoint returns **global** (cross-tenant) data since judge workers serve all organizations. It is restricted to the `root` role to prevent cross-tenant information leakage.

### Docker Health Checks

All services in docker-compose.yml have health checks configured:

| Service | Check | Interval | Timeout | Retries |
|---------|-------|----------|---------|---------|
| postgres | `pg_isready -U postgres -d online_judge` | 10s | 5s | 5 |
| redis | `redis-cli ping` | 10s | 5s | 5 |
| api | `curl -f http://localhost:3000/health` | 30s | 10s | 3 |
| frontend | `curl -f http://localhost:80/` | 30s | 10s | 3 |
| judge-worker | `pgrep -f judge-worker` | 30s | 10s | 3 |

## Troubleshooting

### API Fails to Start

**Symptom**: API container exits immediately or restarts in a loop.

1. Check PostgreSQL is healthy: `docker compose ps postgres`
2. Verify `DATABASE_URL` is correct and the database `online_judge` exists
3. Check API logs: `docker compose logs api`
4. The entrypoint script waits for PostgreSQL -- if it cannot connect, it will loop until the database is available

**Common cause**: `DATABASE_URL` uses `localhost` instead of the Docker service name `postgres`. Inside Docker Compose, use `postgres` as the hostname:

```
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/online_judge
```

### Judge Worker Cannot Connect to API

**Symptom**: Worker logs show repeated "Failed to send result to API" errors.

1. Verify `API_URL` uses the Docker service name: `http://api:3000` (not `localhost`)
2. Check that `WORKER_SECRET` matches between the API and worker containers
3. Confirm the API health check is passing: `docker compose ps api`

### Database Migration Errors

**Symptom**: API logs show migration failures on startup.

1. Migrations are embedded at compile time -- rebuild the API image if migration files changed: `docker compose build api`
2. Check the migration SQL in `api/migrations/` for syntax errors
3. If a migration partially applied, you may need to manually inspect the `sqlx_migrations` table in PostgreSQL

### Frontend Cannot Reach API

**Symptom**: Browser shows network errors or blank page.

1. In production (Nginx), the frontend proxies `/api/` to `http://api:3000` -- verify the API service is healthy
2. Check `VITE_API_BASE_URL` was set correctly at build time (it is baked into the static assets during `npm run build`)
3. In development, the Vite dev server proxies to `http://localhost:3000` via `vite.config.ts`

### Redis Connection Failures

**Symptom**: API logs "Redis not configured" or worker logs connection errors.

1. Verify Redis is healthy: `docker compose ps redis`
2. Check `REDIS_URL` uses the Docker service name: `redis://redis:6379`
3. The API can start without Redis (degraded mode), but JWT blacklisting and WebSocket features will not work

### Worker Not Picking Up Submissions

**Symptom**: Submissions remain in "Pending" status indefinitely.

1. Verify the worker is running: `docker compose ps judge-worker`
2. Check consumer group membership: the worker creates the `judge_workers` group on both the `submissions` and `submissions:contest` streams at startup
3. Inspect the DLQ for failed entries via the admin endpoint: `GET /admin/judge/dlq`
4. Check worker logs for circuit breaker open events: `docker compose logs judge-worker`

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api

# Last 100 lines
docker compose logs --tail 100 api
```

The API uses the `tracing` crate with configurable log levels via `RUST_LOG`. The judge worker uses the same mechanism with a default filter of `judge_worker=debug,redis=warn`.

<!-- GSD:docs -->
