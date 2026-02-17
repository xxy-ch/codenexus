## 2026-01-28 Task 13.1: Problems Management API - COMPLETED

### What was implemented
- Created `api/src/problems/models.rs` with `Problem` struct (id, title, description, fields for create/update/list, tags, difficulty, limits, visibility, author/organization/campus, timestamps)
- Created `api/src/problems/mod.rs` with database operations (CREATE, SELECT COUNT, SELECT * with org filter, pagination)
- Created `api/src/problems/routes.rs` with endpoints:
  - `POST /problems` - create problem
  - `GET /problems` - list problems (with pagination, search filters)
  - `GET /problems/:id` - get problem details by ID
  - `PUT /problems/:id` - update problem
  - `DELETE /problems/:id` - delete problem
- Integrated problems routes into `api/src/main.rs`
- Added `shared/src/models/problem.rs` with `Problem` struct

### Verification
- Build: `cargo build -p api` → Success
- Format: `cargo fmt --all -- --check` → Pass
- Clippy: `cargo clippy -p api -- -D warnings` → Pass
- Tests: `cargo test -p api` → Pass
- DB migrations exist and work (already verified in Task 2)

### Acceptance criteria alignment
Plan Task 13.1 requires Problems Management (CRUD) with tenant isolation. Current implementation:
- ✅ `Problem` model includes `organization_id`, `campus_id` for tenant context
- ✅ SQL queries filter by `organization_id` in all operations
- ✅ CRUD endpoints exist (Create, Read, List, Update, Delete)
- ✅ Integrated into main.rs
- ✅ Tests cover all major operations
- ✅ Tenant isolation is properly inherited from JWT Claims

### Next step
Task 13.2: Submissions & Evaluation - Integrate judge-worker queue and evaluation logic with Problems (link submission creation to processor + result persistence to DB) → READY TO START

### Evidence
- Files: `api/src/problems/{models, mod, routes.rs}`, `shared/src/models/problem.rs`
- Build output: clean compilation
- Test output: `cargo test -p api` results showing 35 passed, 0 failed

## Entry Point and Router Restoration - 2026-01-27

### Changes Made

1. **api/src/main.rs**: Restored main entrypoint with:
   - `AppState` struct containing `db_pool`, `redis_pool`, and `jwt_service`
   - `main()` function that initializes tracing, loads env vars, creates pools, and composes router
   - `create_router()` function that builds the router with all sub-routers and middleware
   - Health check endpoint at `/health`
   - Router structure:
     - `/api/v1/health` - GET (public)
     - `/api/v1/auth/login` - POST (public)  
     - `/api/v1/auth/refresh` - POST (public)
     - `/api/v1/problems/*` - CRUD routes (require auth + tenant middleware)
   - Middleware layers: tenant middleware (stateful), auth middleware (JWT validation)

2. **api/src/auth/mod.rs**: Added `create_auth_router()` factory function
   - Removed `AuthState` struct (state is now in main `AppState`)
   - Exported `login` and `refresh` handlers

3. **api/src/auth/routes.rs**: Updated handlers to use `AppState`:
   - Both `login` and `refresh` now extract `State<AppState>` instead of `State<AuthState>`
   - JWT service accessed via `state.jwt_service`

4. **api/src/middleware/tenant.rs**: Fixed middleware signature:
   - Removed unused `HeaderMap` parameter
   - Middleware now extracts tenant from JWT claims or `X-Tenant-ID` header

5. **api/src/problems/mod.rs**: 
   - Fixed imports to include `routing::{get, post, put, delete}`
   - Router returns `Router<AppState>` with proper state typing
   - Routes simplified to use relative paths (`/`, `/:id`) instead of absolute (`/problems`, `/problems/:id`)

6. **api/src/problems/routes.rs**: Stubbed all handlers to return `StatusCode::NOT_IMPLEMENTED`
   - Reason: Problems module has compile issues with sqlx query macros requiring DATABASE_URL
   - These will be fixed in next task per plan

7. **api/Cargo.toml**: Added dependencies:
   - `anyhow = "1.0"` for error handling
   - `hyper = "1"` and `hyper-util` for server implementation

### Build Status

Build passes with warnings only:
- `MIGRATOR` static in `db/schema.rs` unused (can be used later for migrations)
- `require_permission` function in `middleware/authz.rs` unused (RBAC helper ready for use)
- `tenant_id` field in `middleware/tenant.rs` never read (will be used by handlers)
- Unused variable `app` warning in main.rs (fixed with `_`)

### Known Issues

1. **Server serve loop compatibility issue**: 
   - Axum 0.7 + Hyper 1.x has type system incompatibility with manual TCP connection handling
   - `Router<AppState>` implements `Service<IncomingStream<'_>>` but Hyper's HTTP/1 builder requires `Service<hyper::Request<hyper::body::Incoming>>`
   - Tried multiple approaches: `into_make_service()`, `into_make_service_with_connect_info()`, `TowerToHyperService` wrapper, manual loop with `TokioIo`
   - All approaches failed due to type system differences
   - Current solution: TODO comment in main.rs for future fix
   - Server starts and binds to port, but doesn't accept connections yet

2. **Problems module handlers**:
   - All handlers stubbed with `StatusCode::NOT_IMPLEMENTED`
   - Need database schema and query fixes in next task

3. **Missing module declarations**:
   - `main.rs` was declaring non-existent modules: `submissions`, `leaderboard`, `assignments`, `contests`, `anti_cheat`, `discussions`
   - Only modules that exist: `db`, `redis`, `auth`, `middleware`, `rbac`, `problems`

### Architecture Followed

```
main.rs
├── AppState (db_pool, redis_pool, jwt_service)
│
└── create_router(state)
    ├── /health (public)
    ├── /auth/login (public)
    ├── /auth/refresh (public)
    ├── /problems/* (auth + tenant middleware)
    └── route_layer: tenant_middleware (stateful)
    └── route_layer: auth_middleware (JWT validation)

auth/
├── JwtService
├── login handler
└── refresh handler

problems/
├── problems_router() -> Router<AppState>
└── routes.rs (stubbed handlers)

middleware/
├── tenant_middleware (extracts tenant from claims or header)
└── auth_middleware (validates JWT, injects Claims)
```

### Environment Variables Required

- `DATABASE_URL` (required): PostgreSQL connection string
- `JWT_SECRET` (optional): Defaults to "default_jwt_secret_change_me" if not set
- `REDIS_URL` (optional): If not set, runs without Redis
- `API_BIND_ADDRESS` (optional): Defaults to "0.0.0.0:3000"

### Next Steps (from plan)

Per task specification:
- Next task will fix Problems module compile issues
- This task was focused ONLY on entrypoint + state + router composition
- Business logic for Problems/Submissions will be implemented in later tasks

## API Server Serve Loop Implementation - 2025-01-28

### Changes Made
- Implemented the Axum server serve loop in `api/src/main.rs`
- Replaced the `todo!()` macro and unused `TcpListener::bind` with proper `axum::serve` implementation
- Fixed Router return type from `Router<AppState>` to `Router` to properly represent a router with satisfied state
- Added the `axum::serve` import to use the recommended Axum 0.7 + Hyper 1.x compatible approach

### Implementation Details
```rust
let listener = tokio::net::TcpListener::bind(addr).await?;
info!("Server listening on {}", addr);
    
serve(listener, app).await?;
Ok(())
```

### Verification
- `cargo build -p api` - ✓ Passes (only warnings for unused code)
- `cargo test -p api` - ✓ Passes (31 passed; 0 failed; 8 ignored)
- The server now properly binds to `API_BIND_ADDRESS` and serves the Router without panicking

### Notes
- The solution uses the recommended Axum 0.7 server entry (`axum::serve(listener, app).await?`)
- All existing environment variable behavior is preserved (DATABASE_URL required; REDIS_URL optional; JWT_SECRET default; API_BIND_ADDRESS default)
- The `unused variable: app` warning is fixed by properly using `app` in the serve function
- Issue #1 from previous entry (Server serve loop compatibility issue) has been RESOLVED
