# Requirements: AlgoMaster Online Judge

**Defined:** 2026-04-13
**Core Value:** Reliable, secure code judging with multi-tenancy — every submission correctly evaluated in isolation, data never leaks across organizational boundaries.

## v1 Requirements

### Architecture Decoupling

- [x] **ARCH-01**: API infrastructure extracted into dedicated `api-infra` workspace crate (AppState, middleware, error types, extractors, WebSocket server)
- [ ] **ARCH-02**: Repository trait interfaces defined for all domain modules (ProblemRepo, SubmissionRepo, ContestRepo, ClassRepo, CommunityRepo, UserRepo, LeaderboardRepo, SearchRepo)
- [ ] **ARCH-03**: Service trait interfaces defined for cross-domain communication
- [x] **ARCH-04**: Domain modules extracted as workspace crates in dependency order (users → problems → community → search → submissions → contests → classes → leaderboard)
- [ ] **ARCH-05**: API binary assembles routers from domain crates, owns only main.rs and route mounting
- [ ] **ARCH-06**: Shared test infrastructure — testcontainers setup (PostgreSQL, Redis), shared test fixtures, and test helper utilities for all domain modules

### Security & Technical Debt

- [ ] **SEC-01**: All hardcoded default secrets removed; JWT_SECRET and WORKER_SECRET loaded from environment only, fail to start if unset in production mode
- [ ] **SEC-02**: CORS policy restricts origins to configured list (not wildcard); configurable via environment variable
- [ ] **SEC-03**: Leaderboard `/global` and `/problem/:id` endpoints enforce tenant filtering (only show user's organization data; Root can see all)
- [ ] **SEC-04**: Dead code removed: 26 dead code items, 11 unused imports, 14 unused variables, dead `rbac/` module eliminated
- [ ] **SEC-05**: Redis connection pooling used consistently (no per-request connection creation)
- [ ] **SEC-06**: Production/development environment distinction — `APP_ENV=production` vs `development` controls secret enforcement, CORS strictness, error detail verbosity

### CI/CD Pipeline

- [ ] **CICD-01**: GitHub Actions workflow with cargo fmt --check, clippy, cargo test --workspace on every push/PR
- [ ] **CICD-02**: Rust compilation cache via Swatinem/rust-cache for faster CI runs
- [ ] **CICD-03**: Frontend CI: npm ci, lint, vitest, build
- [x] **CICD-04**: Docker image builds for api, judge-worker, frontend on main branch
- [ ] **CICD-05**: Codex automated PR review integrated into CI workflow

### Observability

- [x] **OBS-01**: Structured logging via tracing + tracing-subscriber with env-filter for log level control
- [x] **OBS-02**: Prometheus metrics exported at `/metrics` endpoint (request latency, error rates, queue depth)
- [x] **OBS-03**: Liveness health check (`/health/live`) and readiness health check (`/health/ready` verifying DB + Redis connectivity)

### Test Coverage

- [ ] **TEST-01**: Integration tests per domain module using sqlx::test + testcontainers (PostgreSQL, Redis)
- [x] **TEST-02**: API handler tests using tower::ServiceExt::oneshot (no HTTP server needed)
- [x] **TEST-03**: Multi-tenant isolation test suite — verify every endpoint respects tenant boundaries
- [ ] **TEST-04**: Frontend unit tests via Vitest for hooks and utility functions
- [ ] **TEST-05**: E2E test suite via Playwright covering critical flows (login, submit code, view result, contest participation)

### Contest Enhancement

- [ ] **CONT-01**: Leaderboard freeze — standings can be frozen at a configurable time before contest end; frozen results hidden, revealed after contest
- [ ] **CONT-02**: Post-contest upsolving — after contest ends, participants can submit solutions for practice; submissions tagged as upsolving, not counted in official standings
- [ ] **CONT-03**: Submission recovery — if judge worker crashes, pending submissions in Redis Stream are automatically retried by other workers via XPENDING + XCLAIM

### Import/Export

- [x] **IMEX-01**: Problem ZIP import — upload .zip containing problem.md (description), test case files (in/out pairs), config.json (time limit, memory limit, tags, difficulty, visibility)
- [x] **IMEX-02**: Problem ZIP export — download any problem as .zip with same structure, suitable for re-import
- [x] **IMEX-03**: User CSV import — upload CSV with columns: username, email, display_name, role; validate format, check duplicates, generate random passwords
- [x] **IMEX-04**: User CSV export — export user list with roles and status; exclude password hashes
- [x] **IMEX-05**: Import validation — validate archive/CSV structure before processing; return clear error messages for each issue

### Judge Concurrency

- [x] **JCON-01**: Priority submission queue — contest submissions routed to `submissions:contest` Redis stream with higher priority; workers consume from contest stream first, then normal stream
- [x] **JCON-02**: Queue monitoring API endpoint — returns current queue depth (contest + normal), active judge count, average wait time
- [x] **JCON-03**: Configurable worker concurrency — max concurrent judgements per worker configurable via environment variable
- [x] **JCON-04**: Judge Worker health reporting — workers periodically report alive status, consumption progress, and queue lag to API endpoint

### Fault Tolerance

- [x] **FTOL-01**: Circuit breaker for external dependencies (Redis, judge worker callback) — open after N consecutive failures, half-open after timeout, close on success
- [x] **FTOL-02**: Configurable retry policies — exponential backoff with jitter for all retry-able operations; max retries configurable
- [x] **FTOL-03**: DLQ monitoring — API endpoint listing dead letter queue items with metadata; manual retry capability for individual items

### Data Migration

- [x] **MIGR-01**: UOJ schema mapping — complete mapping table from UOJ MySQL tables to AlgoMaster PostgreSQL schema
- [ ] **MIGR-02**: User migration — map UOJ users (varchar username) to AlgoMaster users (UUID); generate new passwords; assign to default organization *(implemented: `migrator::migrate_users`, pending Docker E2E verification)*
- [ ] **MIGR-03**: Problem migration — migrate UOJ problems with test cases; map integer IDs to UUIDs via mapping table *(implemented: `migrator::migrate_problems`, pending Docker E2E verification)*
- [ ] **MIGR-04**: Submission migration — migrate historical submissions with status, score, runtime; map all foreign key IDs *(implemented: `migrator::migrate_submissions` + `migrate_contest_submissions_from_source`, pending Docker E2E verification)*
- [x] **MIGR-05**: Blog migration — migrate UOJ blog posts to AlgoMaster blog_* tables
- [x] **MIGR-06**: Migration CLI tool — standalone binary that reads UOJ MySQL dump, transforms, writes to PostgreSQL; idempotent, re-runnable

## v2 Requirements

### Architecture

- **ARCH-06**: Frontend feature-based directory reorganization

### Contest

- **CONT-04**: Virtual contest — start any past contest with personal timer and simulated experience
- **CONT-05**: Practice mode — browse contest problems without timer
- **CONT-06**: Contest cloning — duplicate contest settings and problems
- **CONT-07**: Timer resilience — server-time-based timer that survives browser refresh

### Resilience

- **FTOL-04**: Graceful shutdown — drain in-flight requests before terminating process

### Documentation

- **DOC-01**: OpenAPI/Swagger documentation for all API endpoints
- **DOC-02**: Deployment guide (Docker Compose production setup)
- **DOC-03**: User guide (student, teacher, admin workflows)

### Import/Export

- **IMEX-06**: Batch problem import (multiple problems in one archive)
- **IMEX-07**: Codeforces Polygon format import

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile native app | Web-first responsive is sufficient |
| OAuth/social login | Email/password sufficient for educational use |
| Internationalization (i18n) | Chinese-only for now |
| Microservices architecture | Monorepo modularization is sufficient |
| Team contests | Too complex, not needed for educational use |
| Kubernetes deployment | Docker Compose sufficient for institution scale |
| Real-time chat (general) | DMs + contest chat cover the need |
| LDAP/AD integration | Not needed for educational context |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 1: Architecture + Secrets | Complete |
| ARCH-02 | Phase 1: Architecture + Secrets | Pending |
| ARCH-03 | Phase 1: Architecture + Secrets | Pending |
| ARCH-04 | Phase 2-4: Domain Extraction | Complete |
| ARCH-05 | Phase 2-4: Domain Extraction | Pending |
| ARCH-06 | Phase 1: Architecture + Secrets | Pending |
| SEC-01 | Phase 1: Architecture + Secrets | Pending |
| SEC-02 | Phase 5: Security & Debt | Pending |
| SEC-03 | Phase 4: Complex Extraction | Pending |
| SEC-04 | Phase 5: Security & Debt | Pending |
| SEC-05 | Phase 5: Security & Debt | Pending |
| SEC-06 | Phase 1: Architecture + Secrets | Pending |
| CICD-01 | Phase 2: Basic CI + Core | Pending |
| CICD-02 | Phase 2: Basic CI + Core | Pending |
| CICD-03 | Phase 2: Basic CI + Core | Pending |
| CICD-04 | Phase 6: Full CI/CD + Obs | Complete |
| CICD-05 | Phase 6: Full CI/CD + Obs | Pending |
| OBS-01 | Phase 6: Full CI/CD + Obs | Complete |
| OBS-02 | Phase 6: Full CI/CD + Obs | Complete |
| OBS-03 | Phase 6: Full CI/CD + Obs | Complete |
| TEST-01 | Phase 7: Test + Contest | Pending |
| TEST-02 | Phase 7: Test + Contest | Complete |
| TEST-03 | Phase 7: Test + Contest | Complete |
| TEST-04 | Phase 7: Test + Contest | Pending |
| TEST-05 | Phase 7: Test + Contest | Pending |
| CONT-01 | Phase 7: Test + Contest | Pending |
| CONT-02 | Phase 7: Test + Contest | Pending |
| CONT-03 | Phase 7: Test + Contest | Pending |
| IMEX-01 | Phase 8: Import/Export | Complete |
| IMEX-02 | Phase 8: Import/Export | Complete |
| IMEX-03 | Phase 8: Import/Export | Complete |
| IMEX-04 | Phase 8: Import/Export | Complete |
| IMEX-05 | Phase 8: Import/Export | Complete |
| JCON-01 | Phase 9: Judge + FT | Complete |
| JCON-02 | Phase 9: Judge + FT | Complete |
| JCON-03 | Phase 9: Judge + FT | Complete |
| JCON-04 | Phase 9: Judge + FT | Complete |
| FTOL-01 | Phase 9: Judge + FT | Complete |
| FTOL-02 | Phase 9: Judge + FT | Complete |
| FTOL-03 | Phase 9: Judge + FT | Complete |
| MIGR-01 | Phase 10: Migration + Delivery | Complete |
| MIGR-02 | Phase 10: Migration + Delivery | Implemented (pending E2E) |
| MIGR-03 | Phase 10: Migration + Delivery | Implemented (pending E2E) |
| MIGR-04 | Phase 10: Migration + Delivery | Implemented (pending E2E) |
| MIGR-05 | Phase 10: Migration + Delivery | Complete |
| MIGR-06 | Phase 10: Migration + Delivery | Complete |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after roadmap revision (10 phases, 43 requirements)*
