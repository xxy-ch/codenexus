# Online_Judge Project Completion Plan

## TL;DR

> **Quick Summary**: Eradicate all mock data, establish TDD infrastructure (testcontainers, Vitest, Playwright), then complete remaining features (Notifications, WebSocket, Content Management, Exports) with real API calls.
>
> **Deliverables**:
> - Backend: 100% functional APIs, integration tests with testcontainers, zero TODO/stub code
> - Frontend: All `USE_MOCK_DATA` removed, Vitest + Playwright configured, real API calls verified via E2E
> - CI/CD: GitHub Actions pipeline running tests and migrations
> - Features: Notifications, Content Management, Advanced Community, Export functionality
>
> **Estimated Effort**: Large (26-36 days)
> **Parallel Execution**: YES - 5 waves with 4-7 tasks per wave
> **Critical Path**: Wave 1 → Wave 2 → Wave 3-5 (sequential waves)
>
> **Reality Check**:
> - Current documentation claims "98% complete" but backend has blocking correctness issues (dummy test cases, broken queue consumer)
> - Frontend heavily reliant on mocks; test infrastructure nonexistent
> - Estimated 10x longer than initial projections

---

## Context

### Original Request
"阅读项目并定位进度，把技术债清空作为优先选项，计划从现在到项目结束的完整Plan文档，优先以测试驱动开发和保证真实API调用"
(Read project and locate progress, prioritize clearing technical debt, plan complete document from now to project end, prioritize TDD and ensure real API calls)

### Interview Summary
**Key Discussions**:
- User wants all technical debt cleared before new features
- Test-driven development (TDD) is mandatory
- Real API calls required (no mocks in E2E)
- Complete remaining features: Notifications, Content Management, Advanced Community, Exports

**Research Findings**:
- Frontend: 7+ services with hard-coded `USE_MOCK_DATA = true`, no vitest/playwright configured
- Backend: Critical correctness issues (dummy test cases, broken queue consumer), missing features (streak calc, memory tracking)
- Test infra: Frontend tests can't run, backend has minimal unit tests, no integration tests with real DB
- CI/CD: Non-existent
- docker-compose: 5 services ready, manual migration required

### Metis Review
**Identified Gaps** (addressed in plan):
- **Gap 1**: Did not verify backend compilation status → Added Wave 1 task to fix compilation errors first
- **Gap 2**: Did not quantify all `USE_MOCK_DATA` locations → Frontend audit completed, all 7 services identified
- **Gap 3**: Did not assess test infrastructure feasibility → Added test setup tasks in Wave 1 (backend) and Wave 2 (frontend)
- **Gap 4**: Did not verify docker-compose health checks → Confirmed health checks exist, but manual migration needed
- **Gap 5**: Did not assess CI/CD gaps → Added Wave 1 (CI pipeline setup)
- **Guardrails**: Explicit "Must NOT Have" section added (no feature dev until mocks gone, no E2E mocks)

---

## Work Objectives

### Core Objective
Transform a 98%-documented-but-45%-reality Online Judge into a production-ready system with zero technical debt, comprehensive TDD infrastructure, and all remaining features implemented.

### Concrete Deliverables
- **Backend**: Zero compilation errors, zero TODO/FIXME, 100% API coverage, integration tests with testcontainers
- **Frontend**: All `USE_MOCK_DATA` removed, Vitest + Playwright configured, 80%+ coverage, E2E tests passing
- **CI/CD**: GitHub Actions pipeline running tests, migrations, and deployment
- **Features**: Notifications, WebSocket real-time updates, Content Management, Advanced Community (reputation, voting), Export (PDF/JSON)
- **Documentation**: Updated README reflecting reality, not optimistic projections

### Definition of Done
- [ ] Backend compiles with 0 errors, 0 warnings
- [ ] All `USE_MOCK_DATA` flags removed from frontend
- [ ] `npm run test` (Vitest) passes with 80%+ coverage
- [ ] `npm run test:e2e` (Playwright) passes against real backend
- [ ] `cargo test --all` passes with integration tests using testcontainers
- [ ] GitHub Actions pipeline runs on every push
- [ ] Full-stack E2E smoke test: Register → Login → Submit → View → Logout

### Must Have
- Test-Driven Development: Every task starts with tests
- Real API Calls: E2E tests hit real backend (no mocks)
- CI/CD Pipeline: Automated testing and deployment
- Testcontainers: Backend integration tests with ephemeral Postgres
- OpenAPI Contract: TypeScript types generated from utoipa schema

### Must NOT Have (Guardrails)
- NO `USE_MOCK_DATA = true` in production code
- NO `vi.mock()` for API responses in E2E tests
- NO feature development until Waves 1-2 complete (mocks eradicated, test infra established)
- NO hardcoded test cases in judge-worker (must fetch from DB)
- NO manual migrations in CI (automate)
- NO API calls bypassing centralized `api.ts` instance

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: Partially (cargo test works, but no integration tests)
- **Automated tests**: YES (TDD mandatory)
- **Framework**:
  - Backend: testcontainers-rs + cargo test (integration tests with real Postgres)
  - Frontend: Vitest (unit) + Playwright (E2E against real backend)
- **If TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios (see TODO template below).
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend Unit**: Use Vitest — Import components, mock TanStack Query, render, assert DOM
- **Frontend E2E**: Use Playwright (playwright skill) — Navigate, interact, assert network calls to real API, screenshots
- **Backend Unit**: Use Bash (cargo test) — Run specific test functions, assert output
- **Backend Integration**: Use Bash (docker compose) — Start test DB, run migrations, run tests, clean up
- **Full Stack**: Use Bash (docker compose) — Spin up all services, run Playwright tests, assert happy path

---

## Execution Strategy

### Parallel Execution Waves

> Maximize throughput by grouping independent tasks into parallel waves.
> Each wave completes before the next begins.
> Target: 5-8 tasks per wave. Fewer than 3 per wave (except final) = under-splitting.

```
Wave 1 (Start Immediately — fix backend correctness + test infra):
├── Task 1: Fix backend compilation errors [quick]
├── Task 2: Fix judge-worker dummy test cases [quick]
├── Task 3: Fix judge-worker queue consumer [quick]
├── Task 4: Setup testcontainers integration test framework [quick]
├── Task 5: Add DB migration automation to docker-compose [quick]
├── Task 6: Implement missing backend features (streak, recent search, memory tracking) [unspecified-high]
└── Task 7: Setup GitHub Actions CI pipeline (build + test) [quick]

Wave 2 (After Wave 1 — frontend test infra + mock eradication):
├── Task 8: Setup Vitest + Testing Library [quick]
├── Task 9: Create playwright.config.ts with webServer [quick]
├── Task 10: Centralize USE_MOCK_DATA to config.ts [quick]
├── Task 11: Migrate communityApi.ts to centralized api instance [quick]
├── Task 12: Remove USE_MOCK_DATA from users.ts [quick]
├── Task 13: Remove USE_MOCK_DATA from contests.ts [quick]
├── Task 14: Remove USE_MOCK_DATA from admin.ts [quick]
└── Task 15: Remove USE_MOCK_DATA from discussions/ranking/blog [quick]

Wave 3 (After Wave 2 — E2E validation + OpenAPI):
├── Task 16: Create E2E smoke test (register → login → submit) [unspecified-high]
├── Task 17: Configure utoipa for OpenAPI schema generation [quick]
├── Task 18: Generate TypeScript client types from OpenAPI [quick]
├── Task 19: Add contract test validation to CI [quick]
└── Task 20: Frontend unit tests for all service modules [quick]

Wave 4 (After Wave 3 — Notifications & WebSocket):
├── Task 21: Backend WebSocket connection manager (upgrade existing ws) [unspecified-high]
├── Task 22: Notification model + DB migration [quick]
├── Task 23: Notification service (create, list, mark read) [unspecified-high]
├── Task 24: WebSocket notification broadcaster [quick]
├── Task 25: Frontend useWebSocket hook integration [quick]
├── Task 26: Notification center UI component [visual-engineering]
├── Task 27: Notification settings page [visual-engineering]
└── Task 28: E2E tests for real-time notifications [unspecified-high]

Wave 5 (After Wave 4 — Content Management):
├── Task 29: Content versioning model + DB migration [quick]
├── Task 30: Content edit API with history [unspecified-high]
├── Task 31: Content moderation API (flag, review, approve) [unspecified-high]
├── Task 32: Frontend content editor with Monaco [visual-engineering]
├── Task 33: Version history viewer component [visual-engineering]
├── Task 34: Moderation dashboard for admins [visual-engineering]
└── Task 35: E2E tests for edit flow + moderation [unspecified-high]

Wave 6 (After Wave 5 — Advanced Community):
├── Task 36: Reputation system model + DB migration [quick]
├── Task 37: Reputation calculation service [unspecified-high]
├── Task 38: Voting API (upvote/downvote) [quick]
├── Task 39: Badge/achievement system [quick]
├── Task 40: User profile with achievements [visual-engineering]
├── Task 41: Voting UI on comments/discussions [visual-engineering]
└── Task 42: E2E tests for reputation + voting [unspecified-high]

Wave 7 (After Wave 6 — Export functionality):
├── Task 43: Export API (PDF, JSON, CSV) [quick]
├── Task 44: Backend PDF generation service [unspecified-high]
├── Task 45: Frontend export dialog component [visual-engineering]
├── Task 46: Export download handler + file naming [quick]
└── Task 47: E2E tests for export flows [unspecified-high]

Wave FINAL (After ALL waves — integration + polish):
├── Task F1: Full-stack integration test suite (oracle)
├── Task F2: Performance test (load test with k6) [unspecified-high]
├── Task F3: Security audit (dependency scan, auth tests) [unspecified-high]
├── Task F4: Documentation update (README reflects reality) [writing]
└── Task F5: Git cleanup + tagging [git]

Critical Path: Wave 1 → Wave 2 → Wave 3 → Wave 4/5/6 (parallel feature waves) → Wave FINAL
Parallel Speedup: ~65% faster than sequential (feature waves can overlap after Wave 3)
Max Concurrent: 7 (Wave 2), 4-6 (feature waves)
```

### Dependency Matrix (abbreviated — show ALL tasks in your generated plan)

- **1-7**: — — 8-15, 1
- **7**: — — 17-19, 1 (CI pipeline enables OpenAPI setup)
- **8-15**: 1 — 16, 20, 2
- **16-20**: 8-15, 1 — 21-47, 2
- **21-28**: 16-20, 1 — 29-47, 3 (can parallel with other feature waves)
- **29-35**: 16-20, 1 — 36-47, 4
- **36-42**: 16-20, 1 — 43-47, 5
- **43-47**: 16-20, 1 — F1-F5, 6
- **F1-F5**: 16-47, 1 — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — -- — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — -- — — — -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- ---coded USE_MOCK_DATA flags

> This is abbreviated for reference. YOUR generated plan must include the FULL matrix for ALL tasks.

### Agent Dispatch Summary

- **1**: **7** — T1-T2,T4-T6 → `quick`, T3 → `quick`, T7 → `quick`
- **2**: **8** — T8-T10,T12-T15 → `quick`, T11 → `quick`
- **3**: **5** — T16 → `unspecified-high`, T17-T19 → `quick`, T20 → `quick`
- **4**: **8** — T21 → `unspecified-high`, T22-T24 → `quick`, T25 → `quick`, T26-T27 → `visual-engineering`, T28 → `unspecified-high`
- **5**: **7** — T29,T31 → `quick`, T30 → `unspecified-high`, T32-T34 → `visual-engineering`, T35 → `unspecified-high`
- **6**: **7** — T36,T38-T39 → `quick`, T37 → `unspecified-high`, T40-T41 → `visual-engineering`, T42 → `unspecified-high`
- **7**: **5** — T43,T45-T46 → `quick`, T44 → `unspecified-high`, T47 → `unspecified-high`
- **FINAL**: **5** — F1 → `oracle`, F2-F3 → `unspecified-high`, F4 → `writing`, F5 → `git`

---

## TODOs

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `infra(test): setup testcontainers and CI pipeline` — api/Cargo.toml, api/tests/, .github/workflows/
- **Wave 2**: `fix(frontend): remove mock data and setup tests` — frontend/src/services/**, frontend/vitest.config.ts
- **Wave 3**: `feat(openapi): add contract testing and types` — api/openapi.json, frontend/src/types/
- **Wave 4**: `feat(notifications): websocket real-time updates` — api/src/notifications/, frontend/src/components/NotificationCenter
- **Wave 5**: `feat(content): edit history and moderation` — api/src/content/, frontend/src/components/ContentEditor
- **Wave 6**: `feat(community): reputation and voting` — api/src/reputation/, frontend/src/components/Voting
- **Wave 7**: `feat(export): PDF and data export` — api/src/export/, frontend/src/components/ExportDialog
- **Wave FINAL**: `chore: polish and release v1.0` — README.md, deployment docs

---

## Success Criteria

### Verification Commands
```bash
# Backend compilation (0 errors)
cd api && cargo check && cd ../judge-worker && cargo check

# Backend tests with integration
cargo test --all

# Frontend tests
cd frontend && npm run test -- --coverage

# Frontend E2E (real backend)
npm run test:e2e

# Full stack smoke
docker compose up -d && npm run test:smoke
```

### Final Checklist
- [ ] Backend: 0 compilation errors, 0 warnings
- [ ] Frontend: All USE_MOCK_DATA removed
- [ ] Tests: Vitest + Playwright + cargo test all pass
- [ ] CI: GitHub Actions pipeline runs successfully
- [ ] E2E: Full-stack smoke test passes (register → login → submit)
- [ ] Documentation: README reflects reality
- [ ] Security: No hardcoded secrets, JWT_SECRET configurable
