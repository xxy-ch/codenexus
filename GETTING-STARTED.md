<!-- generated-by: gsd-doc-writer -->

# Getting Started

This guide walks you through setting up AlgoMaster Online Judge on your local machine. Choose the Docker path for the fastest start, or follow the local development setup for active contribution work.

## Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| Docker + Docker Compose | 20.10+ / v2 | All-in-one startup (infra + services) |
| Rust toolchain | 1.90.0 (edition 2021) | API server and judge-worker (`rustup install 1.90.0`) |
| Node.js | >= 20 | Frontend build and dev server |
| npm | >= 9 | Frontend package manager |
| psql (PostgreSQL client) | 16+ | Running seed scripts and manual queries |

The Rust toolchain is pinned in `rust-toolchain.toml` and includes `rustfmt` and `clippy` components. If you use `rustup`, it will auto-select the correct channel when you build.

## Quick Start (Docker)

The fastest way to get a running system is Docker Compose. It starts PostgreSQL, Redis, the API, the frontend, and the judge-worker together.

```bash
# Clone the repository
git clone <repository-url> && cd Online_Judge

# Start all services
docker compose up -d --build

# Wait for health checks to pass (about 60 seconds)
docker compose ps
```

All four services must show `healthy` before proceeding:

| Container | Port | Purpose |
|-----------|------|---------|
| `online-judge-postgres` | 5432 | PostgreSQL 16 database |
| `online-judge-redis` | 6379 | Redis 7 cache and message queue |
| `online-judge-api` | 3000 | REST API + WebSocket server |
| `online-judge-frontend` | 5173 | Frontend (Nginx serving on port 80, mapped to 5173) |
| `online-judge-judge-worker` | -- | Code judging service (no public port) |

Once healthy, load demo data and open the app:

```bash
# Seed demo organization, users, problems, and a contest
bash scripts/bootstrap_demo.sh

# Open the frontend
open http://localhost:5173
```

## Local Development Setup

For active development, run infrastructure in Docker and the backend/frontend natively so you get hot reload and faster iteration.

### Step 1 -- Start Infrastructure

```bash
docker compose up -d postgres redis
```

Verify they are healthy:

```bash
docker compose ps postgres redis
```

### Step 2 -- Set Environment Variables

Copy the example env files and adjust if needed:

```bash
cp api/.env.example api/.env
cp frontend/.env.example frontend/.env
```

The API's `.env` requires `DATABASE_URL` to be set. For local development against Docker PostgreSQL, edit `api/.env` to match:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge
REDIS_URL=redis://localhost:6379
```

`JWT_SECRET` and `WORKER_SECRET` are optional in development mode -- the API will log a warning and use insecure defaults. **Never use these defaults in production.**

### Step 3 -- Start the API Server

```bash
# From the project root
cargo run --bin api
```

The API runs migrations automatically on startup. You should see:

```
INFO api: Database migrations complete
INFO api: Starting server on 0.0.0.0:3000
```

### Step 4 -- Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server starts on port 5173 and proxies `/api` requests to the API at `localhost:3000`. Open http://localhost:5173.

### Step 5 -- Start the Judge Worker (Optional)

The judge-worker requires Linux with `cgroups` and `seccomp` support. On macOS or Windows, use the Docker-based judge-worker instead:

```bash
docker compose up -d judge-worker
```

On Linux, you can run it natively:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
API_URL=http://127.0.0.1:3000 \
WORKER_SECRET=dev-only-insecure-worker-secret-do-not-use-in-production \
cargo run --bin judge-worker
```

### Step 6 -- Load Demo Data

```bash
bash scripts/bootstrap_demo.sh
```

This seeds a demo organization ("Demo School"), four test users, a sample problem, a contest, submissions, and a blog article. The script is idempotent -- safe to re-run.

## Environment Variables -- Quick Reference

A minimal set of environment variables is needed for local development. See [CONFIGURATION.md](CONFIGURATION.md) for the complete list with descriptions and defaults.

### API Server

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | -- | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Redis connection string |
| `JWT_SECRET` | Prod only | insecure dev default | JWT signing key |
| `WORKER_SECRET` | Prod only | insecure dev default | Shared secret for judge-worker callbacks |
| `API_BIND_ADDRESS` | No | `0.0.0.0:3000` | Server listen address |
| `APP_ENV` | No | `development` | `development`, `test`, or `production` |

### Judge Worker

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | -- | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://127.0.0.1/` | Redis connection string |
| `API_URL` | No | `http://127.0.0.1:3000` | API server URL for result callbacks |
| `WORKER_SECRET` | Yes | -- | Must match API's `WORKER_SECRET` |

### Frontend

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `VITE_API_BASE_URL` | No | `/api` | API base URL |
| `VITE_WS_BASE_URL` | No | auto-detected | WebSocket URL |
| `VITE_API_PROXY_TARGET` | No | `http://localhost:3000` | Vite dev proxy target |
| `VITE_ENABLE_MOCK_DATA` | No | `false` | Use mock data instead of real API |

## Verifying Your Setup

### Health Check

The API exposes Kubernetes-style health endpoints:

```bash
# Liveness -- process is alive
curl http://localhost:3000/health/live
# Returns: OK

# Readiness -- DB and Redis are connected
curl http://localhost:3000/health/ready
# Returns: {"status":"ok","db":"connected","redis":"connected"}
```

### Demo Test Accounts

After running `scripts/bootstrap_demo.sh`, these accounts are available. All passwords are `admin123`.

| Email | Username | Role | Use For |
|-------|----------|------|---------|
| `admin@example.com` | 1001 | root (admin) | Admin dashboard, user management |
| `student1@example.com` | 2001 | student | Submit solutions, join contests |
| `student2@example.com` | 2002 | student | Second student for testing |
| `teacher@example.com` | 3001 | teacher | Create problems, manage classes |

### Smoke Tests

Run the frontend test suite to verify end-to-end functionality:

```bash
cd frontend
npm run test            # unit tests
npm run test:e2e:playwright  # E2E tests (requires running API)
```

## Common Issues

### Port Already in Use

If ports 3000, 5173, 5432, or 6379 are occupied, either stop the conflicting service or change the port mapping in `docker-compose.yml`.

```bash
# Find what is using a port
lsof -i :3000
```

### Database Connection Refused

The API requires PostgreSQL to be accepting connections before it starts. If you see `connection refused`:

1. Verify the container is healthy: `docker compose ps postgres`
2. Check the health check log: `docker compose logs postgres`
3. Ensure `DATABASE_URL` in `api/.env` matches the Docker port mapping (default: `postgresql://postgres:postgres@localhost:5432/online_judge`)

### Redis Connection Failed

The API logs a warning but continues running without Redis. However, WebSocket notifications, JWT blacklisting, and the judge-worker queue will not function. Verify Redis is healthy:

```bash
docker compose exec redis redis-cli ping
# Expected: PONG
```

### Judge Worker Not Processing Submissions

The judge-worker needs `SYS_PTRACE` and `SYS_ADMIN` capabilities and a Linux kernel with cgroups/seccomp support. It cannot run natively on macOS or Windows. Use the Docker container instead:

```bash
docker compose up -d judge-worker
```

### Frontend Shows Blank Page

If the frontend loads but shows no data:

1. Confirm the API is reachable: `curl http://localhost:3000/health/live`
2. Check that `VITE_API_BASE_URL` is set correctly (default `/api` works with the Vite proxy)
3. If using Docker frontend, ensure it can reach the API container (`VITE_API_BASE_URL` must use the Docker network hostname, not `localhost`)

### Migrations Fail on Startup

The API embeds migrations at compile time via `sqlx::migrate!()`. If migrations fail, check the PostgreSQL logs for the specific SQL error:

```bash
docker compose logs postgres
```

To start fresh:

```bash
docker compose down -v   # WARNING: deletes all data volumes
docker compose up -d postgres redis
```

## Next Steps

- **Architecture overview** -- See [ARCHITECTURE.md](ARCHITECTURE.md) for system design, data flows, and component relationships.
- **Full configuration** -- See [CONFIGURATION.md](CONFIGURATION.md) for every environment variable, defaults, and per-environment overrides.
- **API reference** -- See `docs/api/` for endpoint documentation covering problems, contests, and leaderboards.

<!-- GSD:docs -->
