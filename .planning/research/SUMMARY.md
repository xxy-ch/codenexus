# Research Summary: AlgoMaster OJ Modernization

**Synthesized:** 2026-04-13

---

## Key Findings

### Stack
- **Testing:** sqlx::test + testcontainers for Rust integration, tower oneshot for Axum handlers, Vitest + Playwright for frontend. Mock at repository trait boundary, not at SQLx level.
- **Observability:** tracing + tracing-subscriber + metrics-exporter-prometheus. Health checks with liveness (process alive) and readiness (DB + Redis connected).
- **CI/CD:** GitHub Actions with rust-cache, workspace-aware cargo commands, separate frontend job.
- **Concurrency:** Redis Streams already supports consumer groups. Add priority streams for contest submissions and queue monitoring.

### Table Stakes Features (25 total)
- Problem import/export (ZIP format, batch operations)
- User import/export (CSV)
- Contest: leaderboard freeze, upsolving, submission recovery, timer resilience
- Judge: configurable workers, queue monitoring, priority submissions
- Fault tolerance: circuit breakers, retry policies, DLQ monitoring, graceful shutdown
- Migration: full UOJ MySQL → PostgreSQL with ID mapping and type conversion

### Architecture
- Split api/src/ into 8 domain crates + 1 infrastructure crate within the same workspace
- Repository trait pattern for testability and decoupling
- Frontend: feature-based directory structure
- Dependency direction: domain crates → api-infra → shared (never upward)
- Extract in order: users → problems → community → search → submissions → contests → classes → leaderboard

### Watch Out For
- **CRITICAL:** Tenant isolation regressions during every module extraction
- **HIGH:** Circular dependencies when splitting crates, MySQL→PostgreSQL type mismatches, API contract breaks
- **MEDIUM:** Loss of SQLx compile-time checks, Redis consumer group edge cases, scoreboard race conditions

---

## Recommended Build Order

```
Phase 1: Architecture Foundation
  → Extract api-infra crate (AppState, middleware, error types)
  → Define repository traits and service interfaces
  → Set up CI/CD pipeline

Phase 2: Technical Debt + Security
  → Fix hardcoded secrets, CORS policy
  → Fix leaderboard cross-tenant leaks
  → Dead code cleanup

Phase 3: Domain Extraction (low risk first)
  → users, problems, community, search

Phase 4: Domain Extraction (high risk)
  → submissions, contests, classes, leaderboard

Phase 5: Frontend Restructuring
  → Feature-based directory reorganization
  → Component co-location

Phase 6: Testing & Observability
  → Integration tests per domain
  → Prometheus metrics + health checks
  → E2E test suite

Phase 7: Feature Enhancement
  → Contest improvements (freeze, upsolving, virtual)
  → Import/export (problems ZIP, users CSV)
  → Judge concurrency (priority queues, monitoring)

Phase 8: Fault Tolerance
  → Circuit breakers, retry policies
  → DLQ monitoring dashboard
  → Submission recovery

Phase 9: Data Migration
  → UOJ MySQL → PostgreSQL migration tool
  → One-time batch migration

Phase 10: Documentation & Delivery
  → API docs, deployment guide, user guide
  → Final security audit
  → Production readiness checklist
```

---

## Files

| File | Content |
|------|---------|
| STACK.md | Testing, observability, CI/CD, concurrency tools and patterns |
| FEATURES.md | 25 table-stakes + 10 differentiator features with complexity ratings |
| ARCHITECTURE.md | Workspace crate structure, trait patterns, frontend reorganization, migration strategy |
| PITFALLS.md | 20 pitfalls across 6 categories with severity, warning signs, and prevention |
