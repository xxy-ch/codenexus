![CodeNexus Banner](codenexus_banner.png)

> 📄 **[Read in Chinese / 中文说明](DEVELOPMENT.zh-CN.md)**

# Developer Guidelines

This guide details the local development setup, codebase structure, backend and frontend workflows, database schema management, coding standards, and Git pipelines for **CodeNexus**.

CodeNexus is a multi-tenant, role-hierarchical online judge built on a modular Rust backend (Axum), a modern TypeScript React frontend (React 19 + Tailwind v4), and a robust Linux-isolated judge pipeline.

---

## 1. Development Setup

### System Prerequisites

| Tool | Version Requirement | Purpose |
|------|---------------------|---------|
| **Rust** | `1.90.0` (Edition 2021) | Pinned version in `rust-toolchain.toml` |
| **Node.js** | `>= 22` | Frontend build and development server |
| **npm** | `>= 10` | Package manager |
| **Docker** | Latest Stable | Orchestrates PostgreSQL 16 and Redis 7 |

### Toolchain Configuration

Your Rust version is locked globally within the workspace via `backend/rust-toolchain.toml`. Entering the `backend/` directory automatically setups the pinned compiler version:

```toml
[toolchain]
channel = "1.90.0"
components = ["rustfmt", "clippy"]
```

### Initial Workspace Launch

**1. Boot up PostgreSQL & Redis Infrastructure:**
```bash
docker compose up -d postgres redis
```

**2. Launch Backend API Server:**
```bash
cd backend
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
JWT_SECRET=dev-secret \
WORKER_SECRET=dev-worker-secret \
cargo run -p api
```
*Note: Databases auto-migrate at startup using the sqlx engine.*

**3. Launch Frontend Hot-Reload Server:**
```bash
cd frontend
npm install
npm run dev
```

**4. Spin up Judge Worker (requires Linux capabilities, otherwise run via Docker):**
```bash
docker compose up -d judge-worker
```

---

## 2. Codebase Structure

```
Online_Judge/
├── backend/                      # Cargo Modular Workspace
│   ├── api/                      # App Entry Crate (Router registration, Axum engine)
│   ├── api-infra/                # API Shared Middleware, WebSocket logic, errors, config
│   ├── shared/                   # Shared Enums (Role, Permission, Claims) - 0 dependencies
│   └── domain-*/                 # Domain Boundary Crate layer (Core business logic)
├── frontend/                     # React 19 SPA
│   ├── src/
│   │   ├── components/           # Presentation layer (EmptyState, ErrorBoundary, Skeletons)
│   │   ├── pages/                # Views (auth, admin, community, contests)
│   │   ├── services/             # HTTP Client layers (Axios config)
│   │   └── store/                # Zustand stores (JWT context, theme)
│   └── e2e/                      # Playwright end-to-end suite
└── docker-compose.yml            # Multi-container full deployment config
```

---

## 3. Backend Workflow

Every backend command **must** be executed from the `backend/` root directory.

### Common Cargo Commands

```bash
# Verify entire workspace formats and compiles without warnings
cargo check --workspace
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings

# Execute all backend tests
cargo test --workspace

# Clean the workspace build cache
cargo clean
```

### Modular Crate Pattern
Each business module in CodeNexus is packaged as an independent domain crate (e.g., `domain-problems`). A standard domain directory contains:

```
domain-feature/src/
├── lib.rs        # Mounts routers, exports entry point
├── models.rs     # Input/Output DTO schemas and SQL record bindings
├── routes.rs     # Axum Handler endpoints (Thin Controller layer)
└── service.rs    # Business transactions and transactional SQL executions
```

All route handlers in `routes.rs` are decoupled from business logic and simply map incoming HTTP headers/payloads to asynchronous database executions in `service.rs`:

```rust
// Standard Axum endpoint handler pattern
pub async fn get_problem_details(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Path(id): Path<Uuid>,
) -> Result<Json<ProblemDetailResponse>, AppError> {
    let result = service::fetch_problem(&state.db, id, &claims).await?;
    Ok(Json(result))
}
```

---

## 4. Frontend Workflow

The React client utilizes a high-performance developer workspace compiled with Vite.

### Essential NPM Tasks

```bash
# Install NPM dependencies
npm ci

# Launch local hot-reload server
npm run dev

# Run static TypeScript type verification
npm run typecheck

# Build optimized production bundle
npm run build

# Run unit tests via Vitest
npm run test
```

### Premium UI Standards
When developing user interfaces, you **must** comply with the standard design framework:
1. **Always-On Skeleton Loaders:** Data-loading processes must display appropriate skeletons rather than generic spinner icons.
2. **Unified Empty States:** Use the standard `<EmptyState />` component across all tables and listing grids when no data is returned.
3. **Structured Fallbacks:** All page roots must be wrapped in a React `<ErrorBoundary />` and render standard `<InlineError />` blocks during API degradation.
4. **TailwindCSS Compliance:** Use Tailwind CSS utility tokens. Do not write ad-hoc CSS overrides unless mandatory.

---

## 5. Coding Standards

### Rust Code Style
1. **Idiomatic Formatting:** Enforced strictly via `rustfmt`. Line breaks are capped at 100 characters.
2. **Proper Error Propagation:** Handlers should never use `unwrap()` or `expect()`. Propagate errors using the `?` operator.
3. **Transactional Commit Safety:** Any service execution affecting multiple records (e.g., batch grade updates) must execute within a SQL transaction block (`transaction.commit().await?`).

### TypeScript / React Code Style
1. **Strict Type Defs:** Avoid `any` under all circumstances. Ensure all API payloads are typed explicitly using `Zod` schema parsers.
2. **State Decoupling:** Utilize Zustand stores for persistent variables (e.g. auth profiles, dark mode) and React Query (`useQuery`, `useMutation`) for caching HTTP responses.
3. **Responsive Guards:** Layouts are optimized for 1280px+ desktop sizes. Use appropriate layout grids.
<!-- GSD:docs -->
