![CodeNexus Banner](codenexus_banner.png)

> 📄 **[Read in Chinese / 中文说明](GETTING-STARTED.zh-CN.md)**

# Quick Start Guide

This guide will walk you through setting up your local development environment for CodeNexus. You can deploy all services instantly using Docker Compose, or run only the database and caching infrastructures (PostgreSQL and Redis) in Docker while launching the backend and frontend locally for active development.

---

## 1. Prerequisites

Before getting started, ensure your system has the following tools installed:

| Tool | Version Requirement | Purpose | Installation |
|------|---------------------|---------|--------------|
| Docker + Docker Compose | Docker 20.10+, Compose V2 | Instant multi-container stack deployment (Recommended) | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| Rust Toolchain | 1.90.0 (Edition 2021) | Compiling and executing the API server and judge workers | `rustup install 1.90.0` |
| Node.js | >= 20 | Frontend compilation and hot-reloading dev server | [Node.js Official](https://nodejs.org/) or [nvm](https://github.com/nvm-sh/nvm) |
| npm | >= 9 | Frontend package manager (packaged with Node.js) | Pre-packaged with Node.js |
| psql (Optional) | PostgreSQL 16+ Client | Manually executing SQL queries and seeding scripts | `brew install libpq` (macOS) or system packages |

### Rust Toolchain Specification
The required Rust toolchain is pinned via `backend/rust-toolchain.toml`:

```toml
[toolchain]
channel = "1.90.0"
components = ["rustfmt", "clippy"]
```

If you are using `rustup`, entering the `backend/` workspace directory will automatically pick up and compile using the pinned 1.90.0 version. Install it manually using:

```bash
rustup install 1.90.0
rustup default 1.90.0
```

### System Requirements
- **Operating System:** Development is fully supported on macOS, Linux, and Windows WSL. However, since the compilation and execution sandboxing inside `judge-worker` relies on Linux `cgroups` and `seccomp` filters, the sandboxing logic must be executed inside a Linux host or inside a privileged Docker container under macOS/Windows.
- **Memory:** Minimum 8 GB RAM recommended (for compiling Rust binaries and running the database/caching Docker images simultaneously).
- **Disk:** Approximately 5–10 GB of free space for Rust compilation targets (`target/`), caches, and Docker layers.

---

## 2. Fast Launch (5 Minutes)

The absolute fastest way to boot up the entire functional codebase from scratch.

### Step 1: Clone the Repository
```bash
git clone <repository-url> && cd Online_Judge
```

### Step 2: Spin Up Infrastructure
Start PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
```

Wait for the containers to pass health checks (takes ~15–30 seconds):

```bash
docker compose ps postgres redis
```

Verify that the `Status` column for both containers reads `healthy`.

### Step 3: Run the API Server

```bash
cd backend
cargo run --bin api
```

The initial compilation will take a few minutes as it pulls and caches crates. Subsequent compilations will complete incrementally in seconds. Once started successfully, you will see output like this:

```
INFO api: Connecting to database...
INFO api: Database connection pool created
INFO api: Running embedded database migrations...
INFO api: Database migrations complete
INFO api: Redis connection pool created
INFO api: Starting server on 0.0.0.0:3000
INFO api: Server listening on 0.0.0.0:3000
```

The API server automatically runs outstanding database migrations on startup.

### Step 4: Run the Frontend
Open a new terminal tab or window:

```bash
cd frontend
npm ci
npm run dev
```

Vite's development server will boot up on port `5173` and automatically proxy all `/api` requests to `localhost:3000`.

### Step 5: Access the Web App
Open your browser and navigate to:

```
http://localhost:5173
```

### Step 6: Load Seed Data (Optional)
To quickly populate the environment with mock schools, problems, classes, and users:

```bash
bash scripts/bootstrap_demo.sh
```

This script seeds a default tenant ("Demo School"), users of varying roles, sample problems, and basic contests. It is safe and idempotent to re-run.

Once seeded, you can log in using these default accounts (all passwords are `admin123`):

| Email | Username | Role | Purpose |
|-------|----------|------|---------|
| `admin@example.com` | 1001 | root | System Administrator (Full access, Dashboard) |
| `student1@example.com` | 2001 | student | Submit solutions, participate in contests |
| `student2@example.com` | 2002 | student | Secondary test student profile |
| `teacher@example.com` | 3001 | teacher | Create problems, manage classrooms & homework |

---

## 3. Environment Variable Setup

### 3.1 Local Environment Files
Copy the sample environment files to activate local development overrides:

```bash
cp backend/api/.env.example backend/api/.env
cp frontend/.env.example frontend/.env
```

### 3.2 Backend API Configuration (`backend/api/.env`)

| Variable | Required | Default Value | Description |
|----------|----------|---------------|-------------|
| `DATABASE_URL` | **Yes** | None | PostgreSQL connection URI |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Redis connection URI |
| `JWT_SECRET` | Production Only | Insecure Dev Default | Key for signing JWT tokens |
| `WORKER_SECRET` | Production Only | Insecure Dev Default | Shared key to authenticate the judge workers |
| `API_BIND_ADDRESS` | No | `0.0.0.0:3000` | Address the API server binds to |

For local docker-hosted database access, configure:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge
```

*Note: In development, `JWT_SECRET` and `WORKER_SECRET` fallback to built-in defaults with loud startup warnings. Never use these in a production deployment.*

### 3.3 Judge Worker Configuration (`backend/judge-worker/` env)

| Variable | Required | Default Value | Description |
|----------|----------|---------------|-------------|
| `DATABASE_URL` | **Yes** | None | PostgreSQL connection URI |
| `REDIS_URL` | No | `redis://127.0.0.1/` | Redis connection URI |
| `API_URL` | No | `http://127.0.0.1:3000` | Endpoint to callback submission verdicts |
| `WORKER_SECRET` | **Yes** | None | Shared secret key matching the API config |
| `SUBMISSION_STREAM` | No | `submissions` | Redis stream name for task consumer |

### 3.4 Frontend Configuration (`frontend/.env`)

| Variable | Required | Default Value | Description |
|----------|----------|---------------|-------------|
| `VITE_API_BASE_URL` | No | `/api` | Base HTTP request proxy prefix |
| `VITE_WS_BASE_URL` | No | Auto-detected | WebSocket connection URL |
| `VITE_API_PROXY_TARGET`| No | `http://localhost:3000` | Vite target backend for HTTP |
| `VITE_WS_PROXY_TARGET` | No | `ws://localhost:3000` | Vite target backend for WebSockets |

---

## 4. Database Setup

### 4.1 Automatic Schema Migrations
The API server automatically runs migrations on startup via the compiled-in `sqlx::migrate!()` macro. When the binary starts, it will verify that your schema is fully updated and run any missing files under `backend/api/migrations/`.

### 4.2 Database Reset
If you need to drop your local database and re-initialize (Caution: **Wipes all database data**):

```bash
docker compose down -v
docker compose up -d postgres redis
# Then launch the API server to trigger auto-migrations
```

---

## 5. Deployment with Docker Compose

To launch the complete platform (PostgreSQL, Redis, Axum API, Judge Worker, Nginx Frontend) in one command:

```bash
docker compose up -d --build
```

Wait until all services show a healthy status:

```bash
docker compose ps
```

| Service Container | Ports | Purpose |
|-------------------|-------|---------|
| `online-judge-postgres` | 5432:5432 | PostgreSQL 16 DB |
| `online-judge-redis` | 6379:6379 | Redis 7 Broker |
| `online-judge-api` | 3000:3000 | Backend REST / WebSockets API |
| `online-judge-frontend` | 5173:80 | Nginx hosting static React build |
| `online-judge-judge-worker`| Internal Only | Compilation and execution judge worker |

### Logs Inspection
```bash
# View all logs
docker compose logs -f

# View logs for specific containers
docker compose logs -f api
docker compose logs -f judge-worker
```

---

## 6. Verification & Health Checks

### 6.1 Infrastructure Health
Ensure PostgreSQL and Redis are accepting active sessions:

```bash
# Redis Ping
docker compose exec redis redis-cli ping
# Expected output: PONG

# PostgreSQL Ping
docker compose exec postgres pg_isready -U postgres -d online_judge
# Expected output: accepting connections
```

### 6.2 API Health Endpoints
Verify system status via health endpoints:

```bash
# Liveness Probe
curl http://localhost:3000/health/live
# Expected output: OK (Status 200)

# Readiness Probe
curl http://localhost:3000/health/ready
# Expected output: {"status":"ok","db":"connected","redis":"connected"} (Status 200)
```

---

## 7. Next Steps

- **System Design** — Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand modular crates, domains, and core flowcharts.
- **Development Workflow** — Review [DEVELOPMENT.md](DEVELOPMENT.md) for guidelines, testing, and contribution instructions.
- **System Configs** — Read [CONFIGURATION.md](CONFIGURATION.md) to see complete lists of runtime variables.
- **REST Endpoints** — Read [API.md](API.md) for structural JSON layouts of REST queries.
<!-- GSD:docs -->
