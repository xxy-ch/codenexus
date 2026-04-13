# AlgoMaster Online Judge

## What This Is

AlgoMaster is a multi-tenant, multi-role competitive programming platform (Online Judge) for educational institutions. It supports 6 languages (C/C++/Java/Python/Go/JavaScript), provides sandboxed code execution, and serves students, teachers, and administrators across multiple organizations (schools). The system consists of a Rust (Axum) API server, a standalone judge worker with cgroups/seccomp sandboxing, and a React (TypeScript) frontend.

## Core Value

Reliable, secure code judging with multi-tenancy — every student submission must be correctly evaluated in an isolated sandbox, and data must never leak across organizational boundaries.

## Requirements

### Validated

- Auth system with JWT (access + refresh tokens), Redis blacklist, HttpOnly cookies — existing
- 6-level role hierarchy (Student → TA → Teacher → CampusAdmin → OrgAdmin → Root) — existing
- 21 granular permissions mapped to roles — existing
- Multi-tenant isolation via JWT claims (school_id) enforced at middleware and query level — existing
- Problem CRUD with visibility control (public/private), tag-based categorization — existing
- Test case management per problem — existing
- Code submission lifecycle: submit → Redis Stream queue → judge worker → sandbox compile+execute → result callback → WebSocket push — existing
- 6 language support: C, C++, Java, Python, Go, JavaScript — existing
- Contest system with registration, ACM/IOI scoring, real-time scoreboard, contest chat — existing
- Class + assignment management with invitation code enrollment — existing
- Leaderboard at 5 scopes (global, school, campus, class, personal) — existing
- Community: discussions (problem-linked), blog articles + comments, direct messages (feature-flagged) — existing
- Full-text search across problems, discussions, articles with tenant filtering — existing
- Admin panel: user management, problem management, judge settings, plagiarism detection — existing
- WebSocket real-time: submission progress, contest events, contest chat — existing
- Plagiarism detection with similarity scanning and reports (feature-flagged) — existing
- Docker Compose orchestration for all services — existing

### Active

- [ ] Monorepo internal modularization — backend modules (auth, problems, submissions, contests, classes, community, search, admin) decoupled with clear dependency boundaries
- [ ] Frontend architecture decoupling — components, state management, and services reorganized by feature domain
- [ ] Test coverage — unit tests, integration tests, E2E tests achieving meaningful coverage
- [ ] Documentation — user guide, API docs, deployment guide, architecture docs
- [ ] Observability — structured logging, metrics, health checks, error tracking
- [ ] Problem import/export — batch operations for problems (import from file, export to standard formats)
- [ ] User import/export — batch user provisioning and data export
- [ ] Contest system enhancement — virtual contests, practice mode, post-contest review, leaderboard freeze, improved fault tolerance (submission recovery, timeout handling, timer resilience, reconnection state recovery)
- [ ] Judge service high concurrency — horizontal scaling for judge workers, queue backpressure, daily large-volume handling
- [ ] Backend fault tolerance — graceful degradation, circuit breakers, retry policies, dead letter handling improvements
- [ ] Data migration tool — one-time migration from UOJ (MySQL) at references/app_uoj233.sql to current PostgreSQL schema
- [ ] CI/CD pipeline — automated build, test, lint, and deployment
- [ ] Technical debt clearance — hardcoded secrets, CORS policy, cross-tenant leaderboard leaks, dead code cleanup, frontend bundle optimization
- [ ] Codex integration — automated PR review in GSD workflow

### Out of Scope

- Mobile native app — web-first, responsive is sufficient
- OAuth/social login — email/password sufficient for educational context
- Real-time chat (general purpose) — DMs and contest chat cover the need
- Internationalization (i18n) — Chinese-only for now
- Microservices architecture — monorepo modularization is sufficient
- Payment/billing system — not applicable for educational use

## Context

This is a brownfield project with extensive existing code. The codebase was built through P0-P7 phases and has security audit fixes in progress (Wave 1-3 committed). Key technical context:

**Tech stack:** Rust (Axum 0.7, SQLx 0.8, Tokio), TypeScript (React 19, Vite 7, TanStack Query, Zustand), PostgreSQL 16, Redis 7, Docker Compose.

**Current issues (from codebase map):**
- P0: Hardcoded default JWT/worker secrets
- P0: No CI/CD pipeline
- P1: CORS allows all origins
- P1: Leaderboard `/global` and `/problem/:id` endpoints expose cross-tenant data
- P2: Redis connection created per request (no pooling in some paths)
- P2: Dead rbac/ module, 26 dead code items, 11 unused imports, 14 unused variables
- P2: Frontend bundle oversized (editor 4.2MB, ts worker 7MB)
- WebSocket community features (DiscussionReply, ArticleComment, TrendingArticles) degraded to compatibility shims, not real-time subscriptions

**Migration source:** UOJ (Universal Online Judge) MySQL database at `references/app_uoj233.sql` with tables for best_ac_submissions, blogs, problems, submissions, users, etc.

**Architecture pattern:** Each backend module follows `mod.rs` + `models.rs` + `routes.rs` + `service.rs`. Frontend uses lazy-loaded routes with role-based guards. Shared Rust crate for types between api and judge-worker.

## Constraints

- **Tech Stack:** Rust backend (Axum), React frontend, PostgreSQL + Redis — cannot change core technologies
- **Compatibility:** Must maintain existing API contracts — frontend cannot break during backend refactor
- **Database:** PostgreSQL only — migration tool reads from MySQL but writes to PostgreSQL
- **Sandbox:** Judge sandbox requires Linux (cgroups, chroot, seccomp) — cannot run on macOS/Windows for production judging
- **Deployment:** Docker Compose for now — Kubernetes not required

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Monorepo modularization (not microservices) | Lower risk, better developer experience, no distributed system complexity | — Pending |
| Decouple first, then add features | Clean architecture makes feature work faster and more reliable | — Pending |
| Codex for automated PR review | Cross-AI review catches issues single-model review misses | — Pending |
| UOJ migration as one-time tool | Specific to the source system, not a general-purpose importer | — Pending |
| Daily large-volume concurrency focus | Educational institution usage pattern: steady load with periodic spikes during assignments | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-13 after initialization*
