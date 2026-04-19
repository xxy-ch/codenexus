# Roadmap: AlgoMaster Online Judge Modernization

**Created:** 2026-04-13
**Revised:** 2026-04-17 (Phase 10 planned)
**Phases:** 13
**v1 Requirements:** 50 (all mapped)

---

## Phase 1: Architecture Foundation + Secret Management

**Goal:** Extract shared infrastructure into a dedicated crate, define trait interfaces for all domain modules, and fix the most critical security issue (hardcoded secrets). This phase sets the foundation for every subsequent extraction.

**Requirements:**
- ARCH-01: API infrastructure extracted into dedicated `api-infra` workspace crate (AppState, middleware, error types, extractors, WebSocket server)
- ARCH-02: Repository trait interfaces defined for all domain modules (ProblemRepo, SubmissionRepo, ContestRepo, ClassRepo, CommunityRepo, UserRepo, LeaderboardRepo, SearchRepo)
- ARCH-03: Service trait interfaces defined for cross-domain communication
- ARCH-06: Shared test infrastructure — testcontainers setup, shared fixtures, test helper utilities for all domain modules
- SEC-01: All hardcoded default secrets removed; JWT_SECRET and WORKER_SECRET loaded from environment only, fail to start if unset in production mode
- SEC-06: Production/development environment distinction — `APP_ENV=production` vs `development` controls secret enforcement, CORS strictness, error verbosity

**Success Criteria:**
1. `cargo build --workspace` succeeds with the `api-infra` crate compiling independently
2. All 8 repository traits are defined in `api-infra/src/traits/` with full method signatures
3. Application refuses to start if `APP_ENV=production` and JWT_SECRET/WORKER_SECRET are unset
4. Shared test infrastructure compiles and a sample integration test using testcontainers passes
5. `cargo test --workspace` passes with the same results as before the extraction

**Dependency:** None (first phase)

---

## Phase 2: Basic CI + Domain Extraction — Core (Users, Problems)

**Goal:** Establish a basic CI pipeline to protect refactoring work, then extract the two foundational domain modules (users and problems). CI runs on every push to catch regressions during extraction.

**Requirements:**
- CICD-01 (basic): GitHub Actions workflow with cargo fmt --check, clippy, cargo test --workspace on every push/PR
- CICD-02: Rust compilation cache via Swatinem/rust-cache for faster CI runs
- CICD-03 (basic): Frontend CI: npm ci, lint, vitest, build
- ARCH-04 (partial): Domain modules `users` and `problems` extracted as workspace crates
- ARCH-05 (partial): API binary assembles user and problem routers from their respective crates

**Success Criteria:**
1. Pushing to a PR branch triggers fmt + clippy + test pipeline and passes
2. `cargo build -p domain-users -p domain-problems` succeeds independently
3. Users and problems routes are mounted in the API binary via re-export from their crates
4. All existing user and problem API endpoints return identical responses
5. Tenant isolation verified on all user and problem endpoints after extraction

**Dependency:** Phase 1 complete

---

## Phase 3: Domain Extraction — Extended (Community, Search)

**Goal:** Extract community (discussions, blogs, messages) and search modules. These have moderate cross-domain dependencies (search indexes multiple domains) and validate the trait pattern under realistic coupling.

**Requirements:**
- ARCH-04 (partial): Domain modules `community` and `search` extracted as workspace crates
- ARCH-05 (partial): API binary assembles community and search routers from their respective crates

**Success Criteria:**
1. `cargo build -p domain-community -p domain-search` succeeds independently
2. Community routes (discussions, blogs, DMs) and search routes mounted from their crates
3. Full-text search returns results scoped to the requesting user's tenant
4. All community features work end-to-end after extraction
5. No circular dependency warnings in `cargo check --workspace`

**Dependency:** Phase 2 complete

---

## Phase 4: Domain Extraction — Complex (Submissions, Contests, Classes, Leaderboard)

**Goal:** Extract the four most complex domain modules. These have the deepest cross-domain dependencies and represent the highest extraction risk. Fix leaderboard tenant leaks as part of the leaderboard extraction.

**Requirements:**
- ARCH-04 (remaining): Domain modules `submissions`, `contests`, `classes`, `leaderboard` extracted as workspace crates
- ARCH-05 (remaining): API binary assembles remaining routers from their respective crates
- SEC-03: Leaderboard `/global` and `/problem/:id` endpoints enforce tenant filtering (only show user's organization data; Root can see all)

**Plans:** 5 plans in 3 waves

Plans:
- [x] 04-01-PLAN.md — Create domain-classes crate (Wave 1)
- [x] 04-02-PLAN.md — Create domain-submissions crate with inlined Redis helpers (Wave 1)
- [x] 04-03-PLAN.md — Create domain-contests crate (Wave 1)
- [x] 04-04-PLAN.md — Create domain-leaderboard crate + SEC-03 tenant filtering fix (Wave 2)
- [x] 04-05-PLAN.md — API integration: wire domain crates, remove old modules, full workspace verification (Wave 3)

**Success Criteria:**
1. `cargo build --workspace` succeeds with all 8 domain crates plus `api-infra`
2. The API binary's `main.rs` contains only `main()`, router mounting, and server startup
3. Leaderboard `/global` returns only data from the requesting user's organization (or all for Root)
4. Contest creation, registration, and scoreboard display work end-to-end
5. Submission lifecycle (submit -> queue -> judge -> callback -> WebSocket) works without regression

**Dependency:** Phases 2 and 3 complete

---

## Phase 5: Security & Technical Debt Clearance

**Goal:** Eliminate remaining security vulnerabilities and technical debt. Runs after domain extraction to avoid re-cleaning code that gets moved, and to ensure fixes apply to the final crate locations.

**Requirements:**
- SEC-02: CORS policy restricts origins to configured list (not wildcard); configurable via environment variable
- SEC-04: Dead code removed: 26 dead code items, 11 unused imports, 14 unused variables, dead `rbac/` module eliminated
- SEC-05: Redis connection pooling used consistently (no per-request connection creation)

**Plans:** 2 plans in 2 waves

Plans:
- [ ] 05-01-PLAN.md — SEC-02 CORS hardening + SEC-05 Redis pooling verification (Wave 1)
- [ ] 05-02-PLAN.md — SEC-04 Deep dead code audit and elimination (Wave 2)

**Success Criteria:**
1. CORS response headers reflect only the configured allowed origins (not `*`)
2. `cargo clippy --workspace` produces zero warnings related to dead code, unused imports, or unused variables
3. The `rbac/` module directory no longer exists in the codebase
4. Redis connection pool metrics show reuse under load test
5. All API endpoints maintain identical behavior after cleanup

**Dependency:** Phase 4 complete

---

## Phase 6: Full CI/CD + Observability

**Goal:** Complete the CI pipeline with Docker build verification (no push, no registry), and add production observability via structured logging, Prometheus metrics, and Kubernetes-style health checks.

**Requirements:**
- CICD-04: Docker image builds for api, judge-worker, frontend on master branch (build verification only, no push)
- CICD-05: Codex automated PR review — DEFERRED per D-03 (user prefers manual review)
- OBS-01: Structured logging with request_id, tenant_id, duration_ms via tracing spans
- OBS-02: Prometheus metrics exported at /metrics endpoint (request latency, error rates, queue depth)
- OBS-03: Liveness (/health/live) and readiness (/health/ready) health checks verifying DB + Redis

**Plans:** 3 plans in 2 waves

Plans:
- [x] 06-01-PLAN.md — CICD-04: Docker build verification in CI (Wave 1)
- [x] 06-02-PLAN.md — OBS-01 + OBS-03: Health endpoints + request_id structured logging (Wave 1)
- [x] 06-03-PLAN.md — OBS-02: Prometheus metrics middleware + /metrics endpoint (Wave 2)

**Success Criteria:**
1. Docker build verification runs for all 3 services on master push (no push/login steps)
2. `GET /health/live` returns 200; `GET /health/ready` returns 200 when DB+Redis up, 503 when down
3. `GET /health` redirects 307 to `/health/live`; `GET /status` redirects 307 to `/health/ready`
4. `GET /metrics` returns Prometheus-formatted metrics with `http_request_duration_seconds` and `http_requests_total`
5. Structured log output includes request_id, method, uri, duration_ms, and status fields

**Dependency:** Phase 5 complete

---

## Phase 7: Test Coverage + Contest Enhancement

**Goal:** Achieve meaningful test coverage across all domain modules and implement the three contest enhancements. Tests run automatically in CI from this point forward.

**Requirements:**
- TEST-01: Integration tests per domain module using sqlx::test + testcontainers
- TEST-02: API handler tests using tower::ServiceExt::oneshot
- TEST-03: Multi-tenant isolation test suite — verify every endpoint respects tenant boundaries
- TEST-04: Frontend unit tests via Vitest for hooks and utility functions
- TEST-05: E2E test suite via Playwright covering critical flows
- CONT-01: Leaderboard freeze — standings frozen at configurable time, revealed after contest
- CONT-02: Post-contest upsolving — submissions tagged as upsolving, not in official standings
- CONT-03: Submission recovery — crashed worker's pending submissions retried via XPENDING + XCLAIM

**Plans:** 7 plans in 4 waves

Plans:
- [x] 07-01-PLAN.md — Domain crate integration tests: testkit dev-deps + tests for all 8 domain crates (Wave 1)
- [x] 07-02-PLAN.md — Contest features: freeze snapshot + upsolving DB migrations and service logic (Wave 2)
- [x] 07-07-PLAN.md — CONT-03: Judge worker XPENDING + XCLAIM submission recovery (Wave 2)
- [x] 07-03-PLAN.md — Contest integration tests: freeze and upsolving against real DB (Wave 3)
- [x] 07-04-PLAN.md — API handler tests + multi-tenant isolation test suite (Wave 3)
- [x] 07-05-PLAN.md — Frontend Vitest unit tests for hooks and utilities (Wave 4)
- [x] 07-06-PLAN.md — Playwright E2E tests for contest freeze and upsolving (Wave 4)

**Success Criteria:**
1. `cargo test --workspace` runs integration tests for all 8 domain modules against real PostgreSQL/Redis
2. Multi-tenant isolation test suite covers every API endpoint group and passes
3. Playwright E2E completes: login -> submit -> view verdict -> contest participation
4. Contest with freeze hides scoreboard during freeze window, reveals after end
5. After contest ends, upsolving submissions are tagged and excluded from official standings

**Dependency:** Phase 6 complete

---

## Phase 8: Import/Export

**Goal:** Implement problem and user import/export for batch operations. Teachers and admins can bulk-create problems and users.

**Requirements:**
- IMEX-01: Problem ZIP import — upload .zip with problem.md, test case files, config.json
- IMEX-02: Problem ZIP export — download any problem as .zip with same structure
- IMEX-03: User CSV import — upload CSV with username, email, display_name, role
- IMEX-04: User CSV export — export user list with roles and status
- IMEX-05: Import validation — validate archive/CSV structure before processing

**Plans:** 3/3 plans complete

Plans:
- [x] 08-01-PLAN.md — domain-imex crate: models, security, problem/user import/export services (Wave 1)
- [x] 08-02-PLAN.md — API routes + AppState integration + frontend service layer (Wave 2)
- [x] 08-03-PLAN.md — BatchOperations page + sidebar entry + route registration (Wave 3)

**Success Criteria:**
1. Teacher uploads a problem ZIP, sees imported problem with correct description, test cases, and config
2. Teacher exports a problem and re-imports the ZIP successfully (round-trip)
3. Admin uploads a user CSV with 100+ rows, all users created with correct roles
4. Duplicate usernames in CSV produce clear error messages without partial creation
5. Invalid ZIP/CSV files produce structured error responses listing each issue

**Dependency:** Phase 7 complete

---

## Phase 9: Judge Concurrency + Fault Tolerance

**Goal:** Scale the judge system for daily high-volume usage and add resilience patterns. Priority queues ensure contest submissions are processed first. Circuit breakers prevent cascade failures.

**Requirements:**
- JCON-01: Priority submission queue — contest submissions routed to higher-priority Redis stream
- JCON-02: Queue monitoring API endpoint — returns queue depth, active judge count, average wait time
- JCON-03: Configurable worker concurrency — max concurrent judgements per worker via env var
- JCON-04: Judge Worker health reporting — workers periodically report status and consumption progress to API
- FTOL-01: Circuit breaker for external dependencies (Redis, judge callback)
- FTOL-02: Configurable retry policies — exponential backoff with jitter
- FTOL-03: DLQ monitoring — API endpoint listing dead letter queue items; manual retry

**Success Criteria:**
1. During a contest, submissions from the priority stream are processed before normal submissions
2. Queue monitoring endpoint returns accurate queue depth and active judge count
3. Worker concurrency is adjustable via `MAX_CONCURRENT_JUDGES` env var without code changes
4. Circuit breaker opens after N consecutive Redis failures and transitions to half-open after timeout
5. DLQ endpoint lists failed items with metadata; manual retry succeeds for recoverable items

**Plans:** 6 plans (4 complete + 2 gap closure)

Plans:
- [x] 09-01-PLAN.md — Priority queue + configurable concurrency + circuit breaker + retry (Wave 1)
- [x] 09-02-PLAN.md — API queue routing + DLQ metadata (Wave 1)
- [x] 09-03-PLAN.md — Worker heartbeat + admin monitoring API + DLQ endpoints (Wave 2)
- [x] 09-04-PLAN.md — Frontend admin Judge Queue dashboard (Wave 3)
- [x] 09-05-PLAN.md — GAP: DLQ retry type fix + admin RBAC + DLQ metadata threading (Wave 1)
- [x] 09-06-PLAN.md — GAP: Contest participant validation + circuit breaker probe + WORKER_SECRET fix (Wave 2)

**Dependency:** Phase 7 complete (independent of Phase 8 — can run in parallel)

---

## Phase 10: Data Migration + Final Delivery

**Goal:** Build the one-time UOJ migration tool and finalize the project for production readiness.

**Requirements:**
- MIGR-01: UOJ schema mapping — complete mapping from UOJ MySQL to AlgoMaster PostgreSQL
- MIGR-02: User migration — map UOJ users to AlgoMaster users with UUID, generate new passwords
- MIGR-03: Problem migration — migrate UOJ problems with test cases, map integer IDs to UUIDs
- MIGR-04: Submission migration — migrate historical submissions with status, score, runtime
- MIGR-05: Blog migration — migrate UOJ blog posts to AlgoMaster blog_* tables
- MIGR-06: Migration CLI tool — standalone binary, reads UOJ MySQL dump, writes to PostgreSQL, idempotent

**Plans:** 5/5 plans complete

Plans:
- [x] 10-01-PLAN.md — migration-tool crate shell + CLI + SQL parser + UOJ models (Wave 1)
- [x] 10-02-PLAN.md — ID mapping + mapper + password prefix + org/user migration (Wave 2)
- [x] 10-03-PLAN.md — Problem + test cases + submission + contest migration (Wave 3)
- [x] 10-04-PLAN.md — Blog + likes + messages migration (Wave 3, parallel with 03)
- [x] 10-05-PLAN.md — Production: domain-users MD5-to-bcrypt transparent login hook (Wave 4)

**Success Criteria:**
1. Migration CLI tool compiles and runs against the UOJ MySQL dump at `references/app_uoj233.sql`
2. Migrated users exist in PostgreSQL with correct roles and default organization assignment
3. Migrated problems have correct descriptions, test cases, and time/memory limits
4. ID mapping table records all old->new ID mappings for users, problems, submissions
5. Tool is idempotent — running twice produces the same result without duplicates

**Dependency:** Phase 7 complete (independent of Phases 8-9 — can run in parallel)

---

## Dependency Graph

```
Phase 1 (Architecture + Secrets)
  |
  v
Phase 2 (Basic CI + Core Extraction)
  |
  v
Phase 3 (Extended Extraction)
  |
  v
Phase 4 (Complex Extraction + Leaderboard Fix)
  |
  v
Phase 5 (Security & Debt Clearance)
  |
  v
Phase 6 (Full CI/CD + Observability)
  |
  v
Phase 7 (Test Coverage + Contest Enhancement)
  |
  +---> Phase 8 (Import/Export)
  |       |
  +---> Phase 9 (Judge Concurrency + Fault Tolerance)  [parallel with 8, 10]
  |       |
  +---> Phase 10 (Data Migration)                       [parallel with 8, 9]
  |       |
  +---> Phase 11 (Feature Gateway)                      [after 10]
  |       |
  |       +---> Phase 12 (AI Analysis)                   [after 11]
  |
  +---> Phase 13 (Tenant Hierarchy Restructure)         [after 10, parallel with 11-12]
```

Phases 1-7 are strictly sequential. Phases 8, 9, 10 are independent of each other and can execute in parallel after Phase 7 completes. Phase 13 depends on Phase 10 but can run in parallel with Phases 11-12.

---

## Requirement Coverage Summary

| Phase | Requirements | Count |
|-------|-------------|-------|
| 1 | ARCH-01, ARCH-02, ARCH-03, ARCH-06, SEC-01, SEC-06 | 6 |
| 2 | CICD-01, CICD-02, CICD-03, ARCH-04 (partial), ARCH-05 (partial) | 5 |
| 3 | ARCH-04 (partial), ARCH-05 (partial) | 2 |
| 4 | ARCH-04 (remaining), ARCH-05 (remaining), SEC-03 | 3 |
| 5 | SEC-02, SEC-04, SEC-05 | 3 |
| 6 | CICD-04, CICD-05 (deferred), OBS-01, OBS-02, OBS-03 | 5 |
| 7 | TEST-01..05, CONT-01..03 | 8 |
| 8 | IMEX-01..05 | 5 |
| 9 | JCON-01..04, FTOL-01..03 | 7 |
| 10 | MIGR-01..06 | 6 |
| 11 | FGW-01..07 | 7 |
| 12 | AIA-01..08 | 8 |
| 13 | THR-01..08 | 8 |
| 14 | GSD-01..08 | 8 |
| **Total** | | **81** |

> Note: ARCH-04 and ARCH-05 span Phases 2-4. CICD-01..03 are split across Phases 2 and 6. CICD-05 deferred per D-03.

**v1 requirements mapped:** 50
**v2 requirements (not in scope):** 11
**Unmapped:** 0

### Phase 11: Feature Gateway Infrastructure

**Goal:** Build a unified runtime feature gateway that supports a three-ring flag model (global master control / scoped hierarchy resolution / capability-level slugs), enabling granular module activation for both existing features and future AI analysis. Teachers and admins get scoped control surfaces to toggle features per campus, grade, or class with inherited-state visibility.

**Requirements:**
- FGW-01: `feature_registry` table — canonical feature catalog (id, slug, name, description, default_enabled, category)
- FGW-02: `feature_flags` table — runtime overrides at global / campus / grade / class scope with precedence resolution (`class > grade > campus > global > default`)
- FGW-03: Feature Gateway service — query API that resolves flag state for a given context (feature_slug + campus_id + optional grade_id/class_id), respecting the 3-ring precedence model
- FGW-04: Admin API endpoints — CRUD for feature flags at each scope level (global requires root, campus/grade requires campusAdmin, grade requires gradeAdmin, class requires teacher+)
- FGW-05: Teacher dashboard page — UI to browse features and toggle them per class with clear inherited-from indicators (teachers view inherited state but only mutate class-level overrides)
- FGW-06: Application-side guard macro/trait — lightweight `FeatureGate` checker injected into route handlers; returns 404 when feature is disabled (not 403, to avoid revealing existence)
- FGW-07: Emergency-off path — single env var `FEATURE_GATEWAY_ENABLED=false` bypasses all flag checks and treats everything as disabled; no DB queries

**Success Criteria:**
1. Feature registry seeded with at least 5 features (direct_messages, plagiarism, discussions, blog, leaderboard)
2. Admin can toggle plagiarism off for one class while it remains on globally — submissions in that class hide plagiarism tab
3. Teacher dashboard renders feature list with current state (enabled/disabled/inherited source) and allows class-level toggling
4. Emergency-off env var immediately disables all feature-gated routes without restart
5. Feature resolution completes in <1ms with in-process cache + write-triggered invalidation (no DB hit on hot path)

**Depends on:** Phase 10
**Plans:** 0 plans (run /gsd-plan-phase 11 to break down)

Plans:
- [ ] TBD

---

### Phase 12: AI Analysis Bounded Context

**Goal:** Introduce a toggleable AI analysis architecture as a separate bounded context. Uses structural features + embeddings + rerank + base LLM + nightly batch processing. Completely dormant by default, activated via Feature Gateway flags from Phase 11.

**Requirements:**
- AIA-01: `analysis` bounded context — separate workspace crate under `backend/`, not extending judge-worker
- AIA-02: Event-driven shadow pipeline — on submission judged, emit analysis event to new Redis stream or DB-backed job table; never invoke analysis from judge-worker directly
- AIA-03: Five-layer analysis stack — (1) structural feature extraction, (2) embedding index, (3) rerank, (4) base LLM generation, (5) nightly batch refresh
- AIA-04: Additive persistence — new tables only (analysis_jobs, analysis_submission_features, analysis_solution_clusters, analysis_cluster_members, analysis_teaching_cards, analysis_class_snapshots, analysis_flags); no mutation of existing tables
- AIA-05: Three-ring feature flags via Phase 11 Feature Gateway — Ring A: global (AI_ANALYSIS_ENABLED), Ring B: campus/grade/class scope, Ring C: capability flags (multi_solution_detection, plagiarism_graph, teaching_cards, class_cognition_snapshot)
- AIA-06: Online path — lightweight feature extraction, candidate retrieval, artifact lookup; no large model on request path
- AIA-07: Nightly batch — full reclustering, cluster naming, teaching-card refresh, class-level cognition snapshot, stale artifact invalidation
- AIA-08: UI enrichment hooks — teacher report page gets optional AI blocks; plagiarism report upgraded with pseudo-diversity; all panels empty-state safe behind flags

**Success Criteria:**
1. Judge submission flow unchanged when AI analysis is disabled
2. All new AI paths are asynchronous and can fail without affecting submission creation, queueing, judging, or result callbacks
3. Feature flags at three levels (global, campus/grade/class, per-analysis-type) exist and are functional
4. Teacher/admin UI renders current reports without AI data and enriches when AI data exists
5. System supports immediate hard-off without schema or service breakage

**Depends on:** Phase 11 (Feature Gateway)
**Plans:** 0 plans (run /gsd-plan-phase 12 to break down)

Plans:
- [ ] TBD

---

### Phase 13: Tenant Hierarchy Restructure

**Goal:** Restructure the role hierarchy from the flat 4-level model (root/admin/teacher/student) to a 6-level organizational hierarchy: root > campusadmin > gradeadmin > teacher > teachingassistant > student. Each level has scoped administrative authority matching real school organizational structure — campus admins manage an entire campus, grade admins manage specific grades, teachers manage their classes, and teaching assistants have limited grading capabilities.

**Requirements:**
- THR-01: Expanded role enum — new `Role` variants in `shared/src/models/role.rs`: `Root`, `CampusAdmin`, `GradeAdmin`, `Teacher`, `TeachingAssistant`, `Student` with strict hierarchy ordering and `min_role` / `can_act_as` predicates
- THR-02: Campus-scoped administration — campusadmin manages all users, teachers, classes, and settings within their assigned campus; cannot cross campus boundaries
- THR-03: Grade-scoped administration — gradeadmin manages classes and students within assigned grade(s); can create/edit assignments and view grade-level analytics but not manage teachers
- THR-04: Teaching assistant role — teachingassistant can review submissions, grade assignments, and view class analytics within assigned classes; cannot create/edit assignments, manage class membership, or access admin panels
- THR-05: Hierarchical RBAC middleware — permission checks respect the new hierarchy; `require_min_role(Role::GradeAdmin)` grants access to GradeAdmin, CampusAdmin, and Root; existing permission-based checks updated to map to new roles
- THR-06: Role migration path — database migration converting existing `admin` → `campusadmin` (with campus assignment), `teacher` → `teacher`, `student` → `student`; migration-tool updated for new hierarchy; backward-compatible JWT claims during transition
- THR-07: Frontend role routing — all role-based UI guards (ProtectedRoute, AdminRoute, sidebar visibility, feature visibility) updated to reflect new hierarchy; new admin panels for campusadmin and gradeadmin roles
- THR-08: Role assignment admin UI — campusadmin can assign gradeadmin/teacher/teachingassistant roles within their campus; gradeadmin can assign teachingassistant roles within their grade's classes

**Success Criteria:**
1. All 6 roles exist in the Role enum with correct hierarchy ordering — `Role::Root > Role::CampusAdmin > Role::GradeAdmin > Role::Teacher > Role::TeachingAssistant > Role::Student`
2. Campusadmin can only see/manage users and resources within their campus; cross-campus data is invisible
3. Gradeadmin can create assignments and view analytics for their grade but cannot modify teacher accounts or campus settings
4. Teachingassistant can grade and review submissions but assignment creation buttons are hidden
5. Existing admin users are migrated to campusadmin without data loss; login still works with migrated roles
6. All role-based frontend routing renders correct navigation and access levels for each role
7. JWT tokens contain the new role string and existing token validation remains backward-compatible during migration window

**Depends on:** Phase 10 (Data Migration — migration-tool must support new roles)
**Plans:** 1/5 plans executed

Plans:
- [ ] TBD

---

### Phase 14: Grade-Scoped Data Model

**Goal:** Build the data model and access control infrastructure to support grade-scoped administration. Phase 13 renamed the role, but GradeAdmin cannot actually scope authority to specific grades without a `grades` entity, `grade_id` in user profiles and role assignments, JWT claims propagation, and grade-level query filtering. This phase makes `grade` a first-class concept in the data model and access control layer.

**Requirements:**
- GSD-01: `grades` table — entity representing a grade within a campus (id, campus_id, name, year, created_at). Grades are campus-scoped, not org-scoped, since different campuses may have different grade structures
- GSD-02: `users.grade_id` — user profile field indicating primary grade membership (nullable; campusadmin/root have no grade, students/teachers belong to a grade, gradeadmin manages a specific grade)
- GSD-03: `user_roles.grade_id` — role scope field indicating which grade a role assignment covers (nullable; only gradeadmin uses this to define their management scope; other roles leave null)
- GSD-04: JWT `grade_id` claim — propagate grade_id from user_roles into JWT claims at login; tenant middleware extracts it alongside school_id and campus_id
- GSD-05: Grade-scoped query filtering — all domain queries that filter by tenant/campus must also respect grade_id when the requesting user is a gradeadmin; GradeAdmin sees only data within their assigned grade
- GSD-06: User management UI — admin UI supports grade assignment when creating/editing users; gradeadmin dropdown shows only grades in their campus
- GSD-07: Migration — populate grades table from existing class/grade naming conventions; assign existing users to grades based on their class enrollments or teaching assignments
- GSD-08: Import/export — CSV import/export updated to include grade_id column; gradeadmin import scoped to their grade

**Success Criteria:**
1. `grades` table exists with at least test data linking grades to campuses
2. Students and teachers have `grade_id` populated; gradeadmins have `user_roles.grade_id` matching their management scope
3. JWT token contains `grade_id` for users with grade-level roles
4. GradeAdmin API queries return only data within their assigned grade — cross-grade data is invisible
5. CampusAdmin sees all grades within their campus; Root sees all grades
6. Admin UI allows grade assignment and gradeadmin management
7. Existing users migrated without data loss — grade assignments inferred from class enrollments

**Depends on:** Phase 13 (Tenant Hierarchy Restructure — GradeAdmin role must exist)
**Plans:** 6/6 plans complete

Plans:
- [ ] TBD

---

## Dependency Graph

```
Phase 1 (Architecture + Secrets)
  |
  v
Phase 2 (Basic CI + Core Extraction)
  |
  v
Phase 3 (Extended Extraction)
  |
  v
Phase 4 (Complex Extraction + Leaderboard Fix)
  |
  v
Phase 5 (Security & Debt Clearance)
  |
  v
Phase 6 (Full CI/CD + Observability)
  |
  v
Phase 7 (Test Coverage + Contest Enhancement)
  |
  +---> Phase 8 (Import/Export)
  |       |
  +---> Phase 9 (Judge Concurrency + Fault Tolerance)  [parallel with 8, 10]
  |       |
  +---> Phase 10 (Data Migration)                       [parallel with 8, 9]
          |
          v
        Phase 11 (Feature Gateway Infrastructure)
          |
          v
        Phase 12 (AI Analysis Bounded Context)
              |
              v
            Phase 13 (Tenant Hierarchy Restructure)
              |
              v
            Phase 14 (Grade-Scoped Data Model)
```

Phases 1-7 are strictly sequential. Phases 8, 9, 10 are independent of each other and can execute in parallel after Phase 7 completes. Phase 11 depends on Phase 10. Phase 12 depends on Phase 11. Phase 13 depends on Phase 10. Phase 14 depends on Phase 13.

---

*Roadmap created: 2026-04-13*
*Last updated: 2026-04-19 Phase 14 added (Grade-Scoped Data Model)*
