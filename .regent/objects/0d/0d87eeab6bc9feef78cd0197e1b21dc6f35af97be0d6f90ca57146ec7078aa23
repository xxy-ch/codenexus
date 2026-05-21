# Architecture Research: OJ Modularization

**Researched:** 2026-04-13
**Scope:** Monorepo modularization of Rust/Axum monolith + React frontend restructuring

---

## 1. Cargo Workspace Modularization

### Proposed Crate Structure

```
Online_Judge/
  Cargo.toml                    # workspace root
  shared/                       # existing shared crate (models, auth types)
  api-infra/                    # NEW: infrastructure crate
    src/
      db.rs                     # PgPool creation, migrations
      redis.rs                  # Redis pool creation
      auth.rs                   # JWT service, password hashing
      error.rs                  # AppError, unified error type
      middleware/                # auth, tenant, rate-limit middleware
      websocket/                # WebSocket server
      extractors.rs             # Axum extractors (TenantContext, Claims)
  domain-problems/              # NEW: problem management domain
    src/
      mod.rs
      models.rs                 # Problem, TestCase, Tag structs
      repository.rs             # ProblemRepo trait
      service.rs                # Business logic
      routes.rs                 # Axum route handlers
  domain-submissions/           # NEW: submission + judging domain
    src/
      mod.rs
      models.rs
      repository.rs
      service.rs
      routes.rs
      queue.rs                  # Redis Streams integration
  domain-contests/              # NEW: contest domain
    src/
      mod.rs
      models.rs
      repository.rs
      service.rs
      routes.rs
  domain-classes/               # NEW: class + assignment domain
    src/
      mod.rs
      models.rs
      repository.rs
      service.rs
      routes.rs
  domain-community/             # NEW: discussions + blog + messages
    src/
      mod.rs
      models.rs
      repository.rs
      service.rs
      routes.rs
  domain-users/                 # NEW: user management
    src/
      mod.rs
      models.rs
      repository.rs
      service.rs
      routes.rs
  domain-leaderboard/           # NEW: rankings
    src/
      mod.rs
      models.rs
      repository.rs
      service.rs
      routes.rs
  domain-search/                # NEW: search
    src/
      mod.rs
      models.rs
      repository.rs
      service.rs
      routes.rs
  api/                          # MODIFIED: thin binary crate
    src/
      main.rs                   # Assemble router from domain crates
      routes.rs                 # Mount all domain routers
  judge-worker/                 # existing, minimal changes
```

### Dependency Graph

```
api (binary)
 ├── api-infra
 │    ├── domain-problems
 │    ├── domain-submissions
 │    ├── domain-contests
 │    ├── domain-classes
 │    ├── domain-community
 │    ├── domain-users
 │    ├── domain-leaderboard
 │    └── domain-search
 └── shared

domain-submissions → domain-problems (submission references problem)
domain-contests → domain-problems (contest links problems)
domain-contests → domain-submissions (contest submissions)
domain-classes → domain-submissions (assignment submissions)
domain-leaderboard → domain-submissions (ranking data)
domain-search → domain-problems, domain-community (search sources)
```

### Key Decisions

1. **api-infra as foundation crate**: Contains DB pool, Redis pool, middleware, error types, WebSocket server. All domain crates depend on this for shared infrastructure.

2. **Domain crates are independent**: Each domain crate exports a `routes()` function that returns an Axum `Router`. The `api` binary assembles them.

3. **Cross-domain calls via service traits**: Domain crates define traits for their public API. Other domains depend on the trait, not the implementation.

4. **SQLx queries stay in domain crates**: Each domain owns its own queries. `sqlx::query!` macro works per-crate with its own migrations reference.

### Compile-Time Query Consideration
- `sqlx::query!` requires `DATABASE_URL` at compile time and references migrations relative to the crate
- Each domain crate needs its own `migrations/` directory OR use `sqlx::query_as::<_, Row>("SQL")` for runtime-checked queries
- **Recommendation**: Use `sqlx::query_as` with runtime checking during migration, add compile-time checks later when crate structure is stable

---

## 2. Trait-Based Abstraction

### Repository Trait Pattern

```rust
// In domain-problems/src/repository.rs
#[async_trait]
pub trait ProblemRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Problem>>;
    async fn find_all(&self, filter: ProblemFilter) -> Result<Vec<Problem>>;
    async fn create(&self, input: CreateProblem) -> Result<Problem>;
    async fn update(&self, id: Uuid, input: UpdateProblem) -> Result<Problem>;
    async fn delete(&self, id: Uuid) -> Result<()>;
}

// Implementation in same crate
pub struct SqlxProblemRepository {
    pool: PgPool,
}

#[async_trait]
impl ProblemRepository for SqlxProblemRepository {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Problem>> {
        sqlx::query_as::<_, Problem>("SELECT * FROM problems WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| anyhow::anyhow!(e))
    }
    // ...
}
```

### Service Trait for Cross-Domain Communication

```rust
// In domain-problems/src/service.rs
#[async_trait]
pub trait ProblemService: Send + Sync {
    async fn get_problem(&self, id: Uuid) -> Result<Problem>;
    async fn validate_problem_exists(&self, id: Uuid) -> Result<()>;
}

// domain-contests depends on ProblemService trait, not domain-problems implementation
```

### Axum State Pattern

```rust
// In api-infra/src/app_state.rs
pub struct AppState {
    pub db_pool: PgPool,
    pub redis_pool: Option<RedisPool>,
    pub jwt_service: JwtService,
    // Domain services as trait objects
    pub problem_service: Arc<dyn ProblemService>,
    pub submission_service: Arc<dyn SubmissionService>,
    pub contest_service: Arc<dyn ContestService>,
    // ...
}
```

### Trait Object vs Generics Tradeoff

| Aspect | Trait Objects (`dyn Trait`) | Generics (`<T: Trait>`) |
|--------|---------------------------|------------------------|
| Runtime cost | Small vtable dispatch overhead | Zero-cost |
| Compile time | Faster (no monomorphization) | Slower (each type generates code) |
| Ergonomics | Simpler state management | Complex type parameters |
| **Recommendation** | **Use for AppState** | Use for internal generics |

---

## 3. Frontend Feature-Based Architecture

### Current Structure (Type-Based)
```
src/
  components/      # all components mixed
  hooks/           # all hooks mixed
  services/        # all API services mixed
  pages/           # page components
  store/           # Zustand store
```

### Proposed Structure (Feature-Based)
```
src/
  features/
    auth/
      components/    # LoginForm, RegisterForm
      hooks/         # useAuth
      services/      # authApi
      types/         # AuthTypes
    problems/
      components/    # ProblemList, ProblemDetail, ProblemEditor
      hooks/         # useProblems, useProblem
      services/      # problemsApi
      types/         # ProblemTypes
    submissions/
      components/    # SubmissionHistory, SubmissionDetail, CodeEditor
      hooks/         # useSubmissions, useWebSocket
      services/      # submissionsApi
      types/
    contests/
      components/    # ContestList, ContestDetail, Scoreboard
      hooks/         # useContests, useContestUpdates
      services/      # contestsApi
      types/
    classes/
      components/    # ClassList, AssignmentReport
      hooks/         # useClasses
      services/      # classesApi
      types/
    community/
      components/    # DiscussionList, BlogList, DirectMessages
      hooks/         # useCommunityUpdates
      services/      # communityApi
      types/
  components/ui/      # Shared UI primitives (Button, Input, Modal)
  hooks/              # Shared hooks (useWebSocket, useDebounce)
  services/           # Shared services (apiClient, websocket)
  store/              # Global store (auth)
  pages/              # Route pages (thin wrappers importing features)
```

### Migration Strategy
1. Create `features/` directory
2. Move one domain at a time (start with least-coupled: auth)
3. Update imports in pages to use feature paths
4. Shared UI components stay in `components/ui/`

---

## 4. Module Communication Patterns

### Option A: Direct Function Calls (Recommended)
```
domain-contests calls domain-problems::ProblemService trait method
```
- **Pros**: Simple, compile-time checked, easy to understand
- **Cons**: Direct dependency between crates
- **Best for**: Tight couplings (contest→problems, submissions→problems)

### Option B: Event-Driven via Redis Pub/Sub
```
domain-submissions publishes event → domain-leaderboard subscribes → updates ranking
```
- **Pros**: Decoupled, async, supports cross-service communication
- **Cons**: Eventually consistent, harder to debug, requires Redis
- **Best for**: Notifications, leaderboard updates, cache invalidation

### Option C: Shared Trait Interfaces (Recommended for cross-domain)
```
domain-problems defines ProblemService trait
domain-contests depends on trait only, not implementation
api binary wires concrete implementations
```
- **Pros**: Testable, mockable, dependency inversion
- **Cons**: More boilerplate
- **Best for**: Most cross-domain communication

### Recommended Combination
- **Direct traits** (Option C) for synchronous domain calls
- **Redis events** (Option B) for async notifications (submission complete → leaderboard update)
- Keep it simple — don't over-engineer

---

## 5. Dependency Direction Rules

### Allowed Dependencies (One-Way)
```
api → api-infra → shared
api → domain-* → api-infra → shared
domain-submissions → domain-problems
domain-contests → domain-problems
domain-contests → domain-submissions
domain-classes → domain-submissions
domain-leaderboard → domain-submissions
domain-search → domain-problems
domain-search → domain-community
```

### Forbidden Dependencies
```
domain-problems → domain-submissions  (problems don't know about submissions)
domain-users → domain-contests        (users don't know about contests)
domain-* → api                        (domains don't depend on binary)
```

### Enforcement
- Cargo workspace naturally enforces this — circular dependencies won't compile
- Code review checklist: no `use crate::other_domain::` in wrong direction

---

## 6. Incremental Migration Strategy

### Phase Order (Least to Most Coupled)

| Order | Module | Reason | Risk |
|-------|--------|--------|------|
| 1 | domain-users | Least dependencies, most isolated | LOW |
| 2 | domain-problems | Core domain, many depend on it | MEDIUM |
| 3 | domain-community | Isolated, no cross-domain deps | LOW |
| 4 | domain-search | Depends on problems + community | LOW |
| 5 | domain-submissions | Depends on problems, many depend on it | HIGH |
| 6 | domain-contests | Depends on problems + submissions | HIGH |
| 7 | domain-classes | Depends on submissions | MEDIUM |
| 8 | domain-leaderboard | Depends on submissions | MEDIUM |
| 9 | api-infra extraction | Middleware, error types, extractors | MEDIUM |

### Migration Steps Per Module
1. Create new domain crate with `Cargo.toml`
2. Copy `models.rs` → domain crate (adjust imports)
3. Extract repository trait from service
4. Move `service.rs` → domain crate
5. Move `routes.rs` → domain crate
6. Update `api/src/main.rs` to use new crate's router
7. Verify all tests pass
8. Delete old module files from `api/src/`

### Testing During Migration
- Before each extraction: ensure existing integration tests pass
- After each extraction: run full test suite + manual smoke test
- Use feature flags to gradually route traffic to new module if needed
