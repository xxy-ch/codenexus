---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 04
status: planning
last_updated: "2026-04-20T00:40:39.429Z"
last_activity: 2026-04-20
progress:
  total_phases: 15
  completed_phases: 10
  total_plans: 53
  completed_plans: 49
  percent: 92
---

# Project State: AlgoMaster Online Judge

**Status:** Ready to plan
**Current Phase:** 04
**Last Activity:** 2026-04-20

## Phase Status

| Phase | Name | Status | Plans | Progress |
|-------|------|--------|-------|----------|
| 1 | Architecture Foundation + Secret Management | Executed | 4 plans (16 tasks) | 100% |
| 2 | Basic CI + Domain Extraction -- Core | Executed | 3 plans | 100% |
| 3 | Domain Extraction -- Extended | Executed | 3 plans | 100% |
| 4 | Domain Extraction -- Complex + Leaderboard Fix | Executed | 5 plans (10 tasks) | 100% |
| 5 | Security & Technical Debt Clearance | Executed | 2 plans | 100% |
| 6 | Full CI/CD + Observability | Executed | 3 plans in 2 waves | 100% (3/3 plans) |
| 7 | Test Coverage + Contest Enhancement | Executing | 7 plans (3 waves) | 57% (4/7 plans) |
| 8 | Import/Export | Executed | 3 plans | 100% (3/3 plans) |
| 9 | Judge Concurrency + Fault Tolerance | Executed (UAT Blocked) | 7 plans (4 initial + 3 gap closure) | 100% execution, UAT blocked |
| 10 | Data Migration + Final Delivery | Executed (UAT Blocked) | 5 plans (4 waves) | 100% execution, UAT blocked |
| 11 | Feature Gateway Infrastructure | Planned | 0 plans | 0% |
| 12 | AI Analysis Bounded Context | Planned | 0 plans | 0% |
| 13 | Tenant Hierarchy Restructure | Executed | 5 plans | 100% |
| 14 | Grade-Scoped Data Model | Executed | 6 plans (4 waves) | 100% (6/6 plans) |

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-13)

**Core value:** Reliable, secure code judging with multi-tenancy
**Current focus:** Phase 14 — grade-scoped-data-model

---
*State initialized: 2026-04-13*
*Last updated: 2026-04-16 after 08-03-PLAN.md execution*
*Stopped at: Completed 08-03-PLAN.md*
*Phase 9 context gathered: 2026-04-17*
*Phase 9 plan 01 executed: 2026-04-17*
*Phase 9 plan 02 executed: 2026-04-17*
*Phase 9 plan 04 executed: 2026-04-17*
*Stopped at: Completed 09-04-PLAN.md*
*Phase 9 gap closure plans 05-07 executed: 2026-04-17*
*Phase 10 context gathered: 2026-04-17*
*Phase 10 plan 01 executed: 2026-04-18*
*Phase 10 plan 02 executed: 2026-04-18*
*Stopped at: Completed 10-02-PLAN.md*
*Phase 10 plan 05 executed: 2026-04-18*
*Stopped at: Completed 10-05-PLAN.md*
*Phase 10 plan 04 executed: 2026-04-18*
*Phase 10 complete — all 5 plans executed*
*Phase 9 UAT executed: 2026-04-19 — 20/22 pass, blocked by Docker + priority decision*
*Phase 9/10 formal acceptance blocked: Docker env required for ignored tests, priority semantics decision pending*
*Phase 10 UAT executed: 2026-04-19 — 20/22 pass, blocked by Docker E2E*
*D-12 decision recorded: accept bounded priority guarantee for v1.0*
*Phase 11 added to roadmap: 2026-04-19 (Feature Gateway Infrastructure)*
*Phase 12 added to roadmap: 2026-04-19 (AI Analysis Bounded Context)*
*Phase 13 added to roadmap: 2026-04-19 (Tenant Hierarchy Restructure — 6-level role hierarchy)*
*Phase 14 planned: 2026-04-19 — 6 plans in 4 waves (grades table, auth flow, grade filtering, data migration, frontend, verification)*
*Phase 14 plan 02 executed: 2026-04-19 — auth flow grade_id from user_roles*
*Phase 14 plan 03 executed: 2026-04-19 — grade filtering for classes, leaderboard, search*
*Stopped at: Completed 14-03-PLAN.md*
*Phase 14 plan 05 executed: 2026-04-19 — frontend grade types + admin UI*
*Stopped at: Completed 14-05-PLAN.md*
*Phase 14 plan 06 executed: 2026-04-19 — build verification + documentation*
*Phase 14 complete — all 6 plans executed, grade-scoped data model verified*

## Decisions

- D-01: Docker build verification only (no push) on master branch pushes
- D-06: Used Redirect::temporary() (307) instead of Redirect::to() (303) for health redirects
- D-07: health_ready returns 503 with JSON body on any dependency failure
- D-08: OnceLock for global Prometheus recorder to support parallel test execution
- D-09: Path check in track_metrics middleware to skip /metrics self-referencing
- D-10: Bypassed TestFixture::run_migrations closure API due to async lifetime issues; call sqlx::migrate! directly on fixture.db_pool
- D-11: Direct SQL seeding in integration tests instead of service-layer calls where services require complex deps (e.g., Arc<dyn TokenService>)
- [Phase 07]: Handler tests use tower::ServiceExt::oneshot on minimal Router with auth+tenant middleware mirroring main.rs
- [Phase 07]: Tenant isolation tested at service layer since tenant filtering is in SQL WHERE clauses
- [Phase 08 P01]: HashMap-based ZIP content extraction avoids ZipArchive borrow checker issues
- [Phase 08 P01]: Manual CSV header writing ensures header present even for empty user lists
- [Phase 08 P01]: Local ExportProblem/ExportTestCase types keep domain-imex decoupled from DB structs
- [Phase 08 P02]: Box<dyn Any + Send + Sync> preview cache avoids circular dep between api-infra and domain-imex
- [Phase 08 P02]: spawn_blocking for CPU-bound ZIP/CSV parsing to avoid blocking async runtime
- [Phase 08 P02]: Auto-expiring preview tokens via tokio::spawn with 10-minute sleep as best-effort cleanup
- [Phase 08]: [Phase 08 P03]: Single-file BatchOperations with four sub-components keeps import/export UI cohesive
- [Phase 08]: [Phase 08 P03]: Auto-approved checkpoint:human-verify because AUTO_CFG=true
- [Phase 09 P01]: Semaphore created once outside loop and shared via Arc, not recreated per consume_and_process call
- [Phase 09 P01]: Recovery logic extracted into recover_stream() helper to avoid duplication for both streams
- [Phase 09 P01]: send_result_with_retry_breaker checks API breaker proactively; if open, writes directly to DLQ
- [Phase 09 P02]: queue_submission uses dynamic stream_name parameter rather than QueueConfig for per-call routing
- [Phase 09 P02]: Contest active status verified via SQL query before routing to priority stream (T-09-03 mitigation)
- [Phase 09 P02]: DLQ write_to_dlq uses Option<&str> for new params for backward compat during cross-plan intermediate states
- [Phase 09 P03]: Heartbeat uses Redis hash with 30s TTL for auto-cleanup of stale worker entries
- [Phase 09 P03]: ActiveGuard RAII struct ensures active_count is always decremented even if spawned task panics
- [Phase 09 P03]: EMA (alpha=0.3) for avg_wait_ms smooths per-submission spikes in heartbeat reporting
- [Phase 09 P03]: DLQ retry reads result_json field (not data) to match Plan 02 write_to_dlq format
- [Phase 09 P04]: Tab navigation uses simple useState over shadcn Tabs for lighter weight
- [Phase 09 P04]: contestId extracted from URL params via useParams for contest/standalone dual use
- [Phase 10]: Test cases sourced from filesystem via --test-case-dir CLI flag (D-10-1)
- [Phase 10]: Transparent MD5→bcrypt migration with {MD5} prefix marker on first login (D-10-2)
- [Phase 10]: Full scope: Users, Problems, Submissions, Blogs, Contests, Best AC, Likes, Messages (D-10-3)
- [Phase 10]: --org-id or --create-default-org CLI flags for organization assignment (D-10-4)
- [Phase 10]: Persistent migration_mappings table + in-memory HashMap for ID tracking (D-10-5)
- [Phase 10]: New migration-tool/ workspace crate, standalone binary (D-10-6)
- [Phase 10]: Skip-if-exists idempotency via mapping table lookup (D-10-7)
- [Phase 10 P01]: Split migration-tool into lib.rs + main.rs to enable cargo test --lib
- [Phase 10 P01]: Character-by-character state machine parser for MySQL dump values (not regex splitting)
- [Phase 10 P01]: All UOJ model fields as String for parser compatibility; conversion at migration time
- [Phase 10 P02]: PgPool::connect_lazy requires #[tokio::test] even in unit tests that never connect
- [Phase 10 P02]: Combined Task 1+2 into single commit since migrator.rs depends on all new modules
- [Phase 10]: D-10-2: Transparent MD5->bcrypt migration implemented in domain-users login with verify_md5_password helper
- [Phase 10 P03]: Tags appended to problem description as inline note since problems table has no dedicated tags column
- [Phase 10 P03]: Contest rules default to 'acm'; penalty_time defaults to 0 for contest_submissions
- [Phase 10]: decode_blob_result refactored from &self to associated function for testability
- D-12: Accept bounded 1-cycle priority reordering window for v1.0; strict priority deferred to v2
- [Phase 13]: Contest/leaderboard admin checks raised to CampusAdmin; class management stays at GradeAdmin level
- [Phase 14]: D-14-01: Combined 4 tasks into single commit -- adding grade_id to shared structs breaks all construction sites simultaneously
- [Phase 14]: D-14-02: Propagated grade_id from DB through JWT in login/refresh flows for downstream plan consumption
- [Phase 14 P02]: D-14-03: JWT grade_id sourced from user_roles (authorization scope) not users (identity) per D-07/D-08
- [Phase 14 P03]: D-14-04: GradeAdmin grade filtering in domain-classes (grade_id column), leaderboard (users.grade_id), search (author grade); problems/contests/community deferred
- [Phase 14]: D-14-05: Grade CRUD added to domain-classes (not new crate); CampusAdmin+ for mutations, GradeAdmin sees only their grade
- [Phase 14]: D-14-06: Academic year transitions are admin-triggered batch ops (graduate/promote/create-year), not automated cron (D-02)
- [Phase 14]: D-14-07: Frontend grade types, grades service, grade dropdown in user management, GradeManagement admin page with batch operations
- [Phase 14]: D-14-08: Full workspace build verification — cargo build/clippy/test pass, frontend build passes; pre-existing domain-community title column failure confirmed out of scope

## Performance Metrics

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 06-01 | 3min | 1 | 1 |
| 06-02 | 13min | 2 | 3 |
| 06-03 | 21min | 2 | 10 |
| Phase 07 P01 | 14min | 3 tasks | 16 files |
| Phase 07 P04 | 13min | 1 tasks | 5 files |
| Phase 08 P01 | 20min | 3 tasks | 9 files |
| Phase 08 P02 | 12min | 2 tasks | 18 files |
| Phase 08 P03 | 8min | 2 tasks | 3 files |
| Phase 09 P01 | 8min | 2 tasks | 3 files |
| Phase 09 P02 | 8min | 2 tasks | 6 files |
| Phase 09 P03 | 11min | 2 tasks | 7 files |
| Phase 09 P04 | 6min | 3 tasks | 5 files |
| Phase 10 P01 | 9min | 2 tasks | 7 files |
| Phase 10 P02 | 5min | 2 tasks | 5 files |
| Phase 10 P05 | 3min | 1 tasks | 3 files |
| Phase 10 P03 | 4min | 2 tasks | 4 files |
| Phase 10 P04 | 3min | 2 tasks | 2 files |
| Phase 13 P02 | 3min | 1 tasks | 9 files |
| Phase 14 P01 | 15 | 4 tasks | 15 files |
| Phase 14 P02 | 10min | 6 tasks | 4 files |
| Phase 14 P03 | 21min | 7 tasks | 12 files |
| Phase 14 P04 | 19min | 4 tasks | 5 files |
| Phase 14 P05 | 6min | 5 tasks | 9 files |
| Phase 14 P06 | 5min | 5 tasks | 3 files |
