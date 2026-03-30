# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Online Judge is a distributed code judging system with three main components:
- **api** (Rust + Axum): REST API with WebSocket support, PostgreSQL + Redis
- **judge-worker** (Rust): Consumes judging tasks from Redis, executes code in sandbox, posts results back
- **frontend** (React + TypeScript + Vite): User interface for problems, contests, submissions, admin

The system uses Redis Streams for task distribution between API and judge-worker.

## Quick Start

### Full Stack (Docker)
```bash
docker compose up -d --build
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
./scripts/bootstrap_demo.sh
```
Access: Frontend `http://localhost:5173`, API `http://localhost:3000`

### Local Development
```bash
# Start infrastructure
docker compose up -d postgres redis

# API (from repo root)
cd api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
JWT_SECRET=dev-secret \
cargo run

# Judge-worker
cd judge-worker
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
API_URL=http://localhost:3000 \
cargo run

# Frontend
cd frontend
npm install
npm run dev
```

## Build, Test, and Quality Gates

### Rust (api, judge-worker)
```bash
cargo check -p api          # Type-check API
cargo test -p api --no-run  # Compile tests (API)
cargo test -p api           # Run API tests
cargo run -p api            # Run API

cargo check -p judge-worker
cargo test -p judge-worker --no-run
```

### Frontend
```bash
cd frontend
npm run typecheck   # TypeScript check
npm run build       # Production build
npm run lint        # ESLint (limited scope)
npm test            # Vitest unit tests
npx playwright test e2e/smoke.spec.ts  # E2E tests
```

### Alignment Verification (Critical)
This project enforces strict frontend/backend/database alignment. Always run before committing:
```bash
make alignment  # Full alignment check (Python + TypeScript tests)
```

Individual checks:
```bash
python3 scripts/check_alignment.py                    # Frontend/backend API alignment
cd frontend && npm test -- src/services/__tests__     # Service contract tests
```

## Architecture

### Backend Module Structure

Each backend module (auth, users, problems, submissions, contests, etc.) follows this pattern:
- `routes.rs`: HTTP routing, input validation, auth middleware
- `service.rs`: Business logic, SQL queries, contract mapping
- `models.rs`: Request/response types, database models

The `api/src/main.rs` router separates public and protected routes:
- Public: health, auth register/login, submission callback (for judge-worker)
- Protected: all other routes (wrapped with auth/tenant middleware)

### Judge-Worker Flow

1. API creates submission → adds to Redis Stream `submissions`
2. judge-worker consumes from consumer group `judge_workers`
3. Executes code in sandbox (seccomp-hardened)
4. Posts result to API `/submissions/{id}/results`
5. API updates database, notifies frontend via WebSocket

### Frontend Structure

- `pages/`: Route handlers (user/, admin/, teacher/, community/, auth/, contest/)
- `services/`: API clients - each maps to backend routes
- `components/`: Reusable UI (editor/, layout/, messages/, ui/)
- `store/authStore.ts`: Authentication state with persistence
- `types/`: TypeScript interfaces (should align with backend models)

Services use a mocked API client pattern for testing. Real API calls use the `api` client which proxies through Vite dev server.

### Data Flow

1. User action → Service layer (`services/*.ts`)
2. Service → API via HTTP/WebSocket (proxied through Vite in dev)
3. API → PostgreSQL for queries, Redis for queue/caching
4. API → WebSocket push to frontend for real-time updates
5. Judge-worker → Redis Stream → API callback

## Key Conventions

### Multi-Tenancy
- Users have `user_code` (12-char business ID) and internal `UUID`
- `organization_id` and `campus_id` scope most queries
- Tenant middleware extracts these from JWT and injects into requests

### Submission Status
Queued → Running → Accepted/Wrong Answer/TLE/MLE/CE/RTE/SE

### Error Handling
- Backend: `anyhow::Result` for internal errors, proper HTTP status codes
- Frontend: Service layer wraps errors, UI displays toast notifications

### Alignment Testing
The project uses a unique alignment system:
1. Python script `scripts/check_alignment.py` parses frontend service calls and backend routes
2. TypeScript tests in `services/__tests__/` verify request/response contracts
3. Missing or mismatched endpoints fail the alignment check

## Database

Migrations run automatically on API startup via `sqlx::migrate!`.
Schema is in `api/src/db/schema.rs` - regeneration:
```bash
cd api
sqlx database create --database-url $DATABASE_URL
sqlx migrate run --database-url $DATABASE_URL
cargo install sqlx-cli
# Then regenerate with sqlx prepare if needed
```

Demo data: `scripts/bootstrap_demo.sql` (loaded by bootstrap script)

## WebSocket

Used for real-time submission status updates. Route: `/ws`
- Connection authenticates via JWT token in query string
- Server pushes status changes to submission-specific channels

## Testing

### Frontend Unit Tests
Vitest with jsdom. Mock API pattern:
```typescript
const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn(), ... } }))
vi.mock('@/services/api', () => ({ default: mockApi }))
```

### E2E Tests
Playwright in `frontend/e2e/smoke.spec.ts`. Requires running services.

### Python Tests
Unit tests for alignment checker in `scripts/tests/`

## Documentation

- `docs/architecture/PROJECT_HANDBOOK_2026-03-07.md`: Complete development manual
- `docs/delivery/`: Delivery documentation, release runbook
- `docs/api/`: API documentation (CONTEST_API, LEADERBOARD_API, PROBLEMS_API)
