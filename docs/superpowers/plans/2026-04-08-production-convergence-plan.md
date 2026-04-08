# Production Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the current `Online_Judge` repository from the present mixed delivery/demo baseline to a production-grade OJ with a single runtime role model, enforced tenant boundaries, secured judge flow, truthful docs, and green release gates.

**Architecture:** First remove hard garbage and false product surface so the repo only exposes real runtime paths. Then normalize auth, RBAC, and tenant contracts before changing business behavior. After that, close the core security-critical domains in order: problems/test cases, submissions/judge/sandbox, teaching domain, then the remaining product surfaces. Frontend refactor is a parallel lane executed by Claude Code, but every phase closes only after Codex review.

**Tech Stack:** Rust, Axum, SQLx, PostgreSQL, Redis, judge-worker, React 19, Vite, Zustand, TanStack Query, Vitest, Playwright, GitNexus

---

> Filesystem note: the user-facing collaboration surface is called `Shared`, but on this repository's macOS filesystem it is stored and tracked under the git path `shared/`. Use `Shared/...` in agent instructions and `shared/...` in git commands and reviews.

## File Structure And Ownership Map

### Planning And Coordination Files

- Create: `Shared/README.md`
- Create: `Shared/ROADMAP.md`
- Create: `Shared/PHASE-SUMMARY-TEMPLATE.md`
- Create: `Shared/phases/*.md`
- Create: `Shared/discussions/*.md`
- Create: `Shared/reviews/CODE-REVIEW-STANDARD.md`

### Backend Identity / Tenanting Files

- Modify: `shared/src/models/role.rs`
- Modify: `shared/src/models/auth.rs`
- Modify: `api/src/auth/jwt_service.rs`
- Modify: `api/src/middleware/auth.rs`
- Modify: `api/src/middleware/tenant.rs`
- Modify: `api/src/users/service.rs`
- Modify: `api/src/users/routes.rs`
- Modify: `frontend/src/types/auth.ts`
- Modify: `frontend/src/components/auth/ProtectedRoute.tsx`
- Modify: `frontend/src/components/auth/AdminRoute.tsx`

### Problem / Test Case / Admin Files

- Modify: `api/src/problems/mod.rs`
- Modify: `api/src/problems/routes.rs`
- Modify: `api/src/problems/test_cases.rs`
- Modify: `frontend/src/services/problems.ts`
- Modify: `frontend/src/services/admin.ts`
- Modify: `frontend/src/pages/admin/ProblemManagement.tsx`
- Modify: `frontend/src/pages/admin/JudgeSettings.tsx`
- Modify: `frontend/src/pages/admin/ProblemContentConfig.tsx`

### Submission / Judge / Sandbox Files

- Modify: `api/src/submissions/routes.rs`
- Modify: `api/src/submissions/service.rs`
- Modify: `judge-worker/src/main.rs`
- Modify: `judge-worker/src/processor/service.rs`
- Modify: `judge-worker/src/sandbox/mod.rs`
- Modify: `judge-worker/src/sandbox/seccomp.rs`
- Modify: `judge-worker/src/sandbox/executor.rs`

### Teaching / Contest / Community / Settings Files

- Modify: `api/src/classes/routes.rs`
- Modify: `api/src/classes/service.rs`
- Modify: `api/src/contests/routes.rs`
- Modify: `api/src/leaderboard/routes.rs`
- Modify: `api/src/discussions/routes.rs`
- Modify: `api/src/blog/routes.rs`
- Modify: `api/src/messages/routes.rs`
- Modify: `api/src/notifications/routes.rs`
- Modify: `api/src/search/routes.rs`
- Modify: `frontend/src/pages/teacher/*.tsx`
- Modify: `frontend/src/pages/contest/*.tsx`
- Modify: `frontend/src/pages/community/*.tsx`
- Modify: `frontend/src/pages/user/Settings.tsx`

### Verification And Ops Files

- Modify: `docs/delivery/RELEASE_RUNBOOK_2026-03-06.md`
- Modify: `docs/delivery/ACCEPTANCE_CHECKLIST_2026-03-06.md`
- Modify: `docs/delivery/RELEASE_DECISION_RECORD_2026-03-06.md`
- Create: `api/tests/*.rs`
- Create: `judge-worker/tests/*.rs`
- Create: `frontend/e2e/*.spec.ts`

## Global Rules For Every Task

- [ ] Create or update the active phase brief in `Shared/phases/` before changing code.
- [ ] Record scope, owner, parallel lane owner, and acceptance markers before implementation.
- [ ] Keep each PR or change set scoped to one concern.
- [ ] Run the listed verification commands before phase close.
- [ ] Write the phase summary using `Shared/PHASE-SUMMARY-TEMPLATE.md`.
- [ ] Request the correct review checkpoint from `Shared/reviews/CODE-REVIEW-STANDARD.md`.

## Baseline Verification Commands

Run these before and after every phase unless the phase brief narrows them deliberately.

```bash
cargo check -p api
cargo test -p api --no-run
cargo check -p judge-worker
cargo test -p judge-worker --no-run
cd frontend && npm run lint
cd frontend && npm run typecheck
cd frontend && npm run build
cd frontend && npx vitest --run
cd frontend && npx playwright test e2e/smoke.spec.ts
```

Expected:

- all commands green at phase close
- temporary red is allowed only during P0 hard garbage purge and must be documented in the phase brief

### Task 0: Establish The Shared Execution Surface

**Files:**
- Create: `Shared/README.md`
- Create: `Shared/ROADMAP.md`
- Create: `Shared/PHASE-SUMMARY-TEMPLATE.md`
- Create: `Shared/reviews/CODE-REVIEW-STANDARD.md`
- Create: `Shared/phases/P0-hard-garbage-purge.md`

- [ ] **Step 1: Write the initial phase brief for P0**

Include:

- owner
- Claude lane scope
- hard garbage candidate list
- temporary red-light allowance

- [ ] **Step 2: Record the current baseline commands**

Run:

```bash
cargo check -p api
cargo test -p api --no-run
cargo check -p judge-worker
cargo test -p judge-worker --no-run
cd frontend && npm run lint
cd frontend && npm run typecheck
cd frontend && npm run build
```

Expected:

- capture pass/fail status before cleanup begins

- [ ] **Step 3: Write the review checkpoint schedule into the phase brief**

Use:

- `R0` before cleanup starts
- `R1` after cleanup closes

- [ ] **Step 4: Commit the coordination files**

```bash
git add shared docs/superpowers/plans/2026-04-08-production-convergence-plan.md
git commit -m "Create production convergence control surface"
```

### Task 1: P0 Hard Garbage Purge

**Files:**
- Delete: `api/Cargo.toml.bak`
- Delete: `api/src/main.rs.bak`
- Delete: `api/src/problems/mod.rs.bak`
- Delete: `api/src/problems/mod.rs.bak2`
- Delete: `api/src/problems/mod.rs.bak3`
- Delete: `api/src/problems/mod.rs.bak4`
- Delete: `api/src/leaderboard/service.rs.bak`
- Delete: `judge-worker/src/processor/service.rs.bak`
- Delete: `api/.DS_Store`
- Delete: `api/src/.DS_Store`
- Delete: `api/tests/.DS_Store`
- Delete: `judge-worker/src/.DS_Store`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/user/ProblemIDE.tsx`
- Modify: `frontend/src/services/mockSubmissions.ts`
- Modify: `frontend/src/pages/user/Settings.tsx`
- Modify: `docs/architecture/PROJECT_HANDBOOK_2026-03-07.md`
- Modify: `FINAL_SUMMARY.md`

- [ ] **Step 1: Confirm every hard-garbage file is either backup junk or dead runtime surface**

Run:

```bash
rg -n "ProblemIDE|mockSubmissions|USE_MOCK_DATA|updatePreferencesMutation|updateNotificationsMutation" frontend/src
rg --files api judge-worker frontend | rg "\\.bak$|\\.bak[0-9]*$|\\.DS_Store$"
```

Expected:

- all backup/system files confirmed as non-runtime artifacts
- all frontend fake-success or dead mock paths explicitly identified

- [ ] **Step 2: Write or update P0 brief with the deletion list**

Expected:

- the brief says which files are deleted
- the brief says which files are only downgraded or rewritten instead of deleted

- [ ] **Step 3: Delete only hard garbage first**

Expected:

- `.bak` and `.DS_Store` files removed in one change set

- [ ] **Step 4: Remove dead frontend runtime paths**

Minimum target:

- `ProblemIDE` must no longer be a live runtime path if `ProblemIDEEnhanced` is the real page
- `mockSubmissions` must not remain as a runtime dependency
- settings fake-success actions must be deleted or explicitly marked non-product and hidden

- [ ] **Step 5: Rewrite false delivery language in docs**

Expected:

- docs stop claiming security/runtime completeness that does not exist

- [ ] **Step 6: Run the baseline commands**

Expected:

- temporary failures are documented in `Shared/phases/P0-hard-garbage-purge.md`

- [ ] **Step 7: Restore green before closing P0**

Expected:

- no unexplained red remains

- [ ] **Step 8: Write the phase summary and request `R1`**

### Task 2: P1 Canonical Auth / RBAC / Tenant Contract

**Files:**
- Modify: `shared/src/models/role.rs`
- Modify: `shared/src/models/auth.rs`
- Modify: `api/src/auth/jwt_service.rs`
- Modify: `api/src/middleware/auth.rs`
- Modify: `api/src/middleware/tenant.rs`
- Modify: `api/src/users/service.rs`
- Modify: `api/src/users/routes.rs`
- Modify: `api/src/plagiarism/routes.rs`
- Modify: `frontend/src/types/auth.ts`
- Modify: `frontend/src/components/auth/ProtectedRoute.tsx`
- Modify: `frontend/src/components/auth/AdminRoute.tsx`
- Modify: `frontend/src/App.tsx`
- Create: `api/tests/auth_role_tenant_contract.rs`

- [ ] **Step 1: Write the failing role-contract tests**

Test cases:

- root claim roundtrip
- campus claim roundtrip
- teacher claim roundtrip
- student claim roundtrip
- denied write on wrong tenant

- [ ] **Step 2: Run the new tests to verify failure**

Run:

```bash
cargo test -p api auth_role_tenant_contract -- --nocapture
```

Expected:

- failures show current `admin/teacher/user` mapping drift

- [ ] **Step 3: Define the canonical runtime contract in the phase brief**

Must include:

- exact claim shape
- exact role names
- exact tenant-default rule

- [ ] **Step 4: Update shared role models and JWT generation**

Expected:

- no new runtime `admin` or `user` branch remains

- [ ] **Step 5: Update API auth extraction and route guards**

Expected:

- frontend route guards and backend claims agree on role names

- [ ] **Step 6: Update tenant middleware from passive context to enforced contract**

Expected:

- resource reads and writes consume tenant context instead of ignoring it

- [ ] **Step 7: Run targeted tests and full baseline**

Expected:

- role/tenant tests green
- baseline commands green

- [ ] **Step 8: Write the phase summary and request `R2`**

### Task 3: P2 Problem / Test Case / Admin Config Convergence

**Files:**
- Modify: `api/src/problems/mod.rs`
- Modify: `api/src/problems/routes.rs`
- Modify: `api/src/problems/test_cases.rs`
- Modify: `frontend/src/services/problems.ts`
- Modify: `frontend/src/services/admin.ts`
- Modify: `frontend/src/pages/admin/ProblemManagement.tsx`
- Modify: `frontend/src/pages/admin/JudgeSettings.tsx`
- Modify: `frontend/src/pages/admin/ProblemContentConfig.tsx`
- Create: `api/tests/problem_visibility_and_testcase_auth.rs`

- [ ] **Step 1: Write failing tests for hidden test-case exposure**

Scenarios:

- student read path must not return `expected_output`
- student read path must not return hidden samples
- teacher write path must be tenant-bound
- campus-limited writes must reject out-of-scope access

- [ ] **Step 2: Run the tests to confirm failure**

Run:

```bash
cargo test -p api problem_visibility_and_testcase_auth -- --nocapture
```

- [ ] **Step 3: Split the problem domain into student-read and management-write contracts**

Expected:

- frontend user pages only consume student-safe fields
- admin/teacher pages consume explicit management fields

- [ ] **Step 4: Lock test-case CRUD behind role, ownership, and tenant checks**

Expected:

- hidden data never leaks across student or ordinary user routes

- [ ] **Step 5: Remove vague shared admin problem behavior**

Expected:

- frontend admin pages call clearly scoped management contracts

- [ ] **Step 6: Run targeted API tests and frontend smoke**

Run:

```bash
cargo test -p api problem_visibility_and_testcase_auth -- --nocapture
cd frontend && npx vitest --run src/services/__tests__/judgeConfig.test.ts
cd frontend && npx playwright test e2e/smoke.spec.ts
```

- [ ] **Step 7: Write the phase summary and request `R3`**

### Task 4: P3 Submission / Worker / Sandbox Convergence

**Files:**
- Modify: `api/src/submissions/routes.rs`
- Modify: `api/src/submissions/service.rs`
- Modify: `api/src/submissions/models.rs`
- Modify: `judge-worker/src/main.rs`
- Modify: `judge-worker/src/processor/service.rs`
- Modify: `judge-worker/src/sandbox/mod.rs`
- Modify: `judge-worker/src/sandbox/seccomp.rs`
- Modify: `judge-worker/src/sandbox/executor.rs`
- Create: `api/tests/submission_worker_callback_auth.rs`
- Create: `judge-worker/tests/worker_callback_and_sandbox.rs`

- [ ] **Step 1: Write failing tests for worker callback authentication**

Scenarios:

- unauthenticated normal callback rejected
- logged-in user cannot forge judge result
- valid worker callback accepted
- path/body submission mismatch rejected

- [ ] **Step 2: Run tests to confirm failure**

Run:

```bash
cargo test -p api submission_worker_callback_auth -- --nocapture
```

- [ ] **Step 3: Define the service-to-service callback contract**

Must include:

- credential format
- replay or misuse prevention rule
- path/body validation rule
- retry/ack semantics

- [ ] **Step 4: Implement callback auth and state transition validation**

Expected:

- worker no longer depends on ordinary user auth
- callback route is reachable only with service credentials

- [ ] **Step 5: Write failing sandbox-path tests**

Scenarios:

- current execution path must invoke the selected sandbox layer
- unsupported fallback path must be impossible in production mode

- [ ] **Step 6: Wire the real sandbox path before deleting old branches**

Expected:

- `no_new_privs` alone is not the only production safeguard

- [ ] **Step 7: Delete dead sandbox branches only after replacement is active**

- [ ] **Step 8: Run API tests, worker tests, and submission smoke**

Run:

```bash
cargo test -p api submission_worker_callback_auth -- --nocapture
cargo test -p judge-worker -- --nocapture
cd frontend && npx vitest --run src/services/__tests__/smokeCoreFlows.test.ts
```

- [ ] **Step 9: Write the phase summary and request `R3`**

### Task 5: P4 Teaching Domain Convergence

**Files:**
- Modify: `api/src/classes/routes.rs`
- Modify: `api/src/classes/service.rs`
- Modify: `api/src/classes/models.rs`
- Modify: `frontend/src/services/classes.ts`
- Modify: `frontend/src/pages/teacher/ClassManagement.tsx`
- Modify: `frontend/src/pages/teacher/AssignmentReport.tsx`
- Modify: `frontend/src/pages/teacher/ContestWizard.tsx`
- Create: `api/tests/class_and_assignment_authorization.rs`

- [ ] **Step 1: Write failing tests for class and assignment authority**

Scenarios:

- student cannot create/update/delete class
- non-owner teacher cannot mutate another teacher's class
- class operations must respect campus boundary
- assignment publish/delete must require proper authority

- [ ] **Step 2: Run the tests to confirm failure**

Run:

```bash
cargo test -p api class_and_assignment_authorization -- --nocapture
```

- [ ] **Step 3: Implement class ownership and campus checks**

- [ ] **Step 4: Implement assignment ownership and publish rules**

- [ ] **Step 5: Update teacher frontend pages to consume only authorized data**

- [ ] **Step 6: Run backend tests and teacher frontend tests**

Run:

```bash
cargo test -p api class_and_assignment_authorization -- --nocapture
cd frontend && npx vitest --run src/services/__tests__/classes.test.ts src/pages/teacher/__tests__/ClassManagement.test.tsx
```

- [ ] **Step 7: Write the phase summary and request `R4`**

### Task 6: P5 Contest / Leaderboard Convergence

**Files:**
- Modify: `api/src/contests/routes.rs`
- Modify: `api/src/contests/service.rs`
- Modify: `api/src/leaderboard/routes.rs`
- Modify: `api/src/leaderboard/service.rs`
- Modify: `frontend/src/services/contests.ts`
- Modify: `frontend/src/services/ranking.ts`
- Modify: `frontend/src/pages/user/ContestList.tsx`
- Modify: `frontend/src/pages/user/ContestDetail.tsx`
- Modify: `frontend/src/pages/contest/ContestScoreboard.tsx`
- Modify: `frontend/src/pages/user/Ranking.tsx`
- Create: `api/tests/contest_and_leaderboard_scope.rs`

- [ ] **Step 1: Write failing tests for contest write/read scope**

Scenarios:

- wrong-tenant contest mutation rejected
- unauthorized participant data hidden
- leaderboard scope follows tenant and resource visibility

- [ ] **Step 2: Run the tests to confirm failure**

- [ ] **Step 3: Converge contest contracts on stable backend fields**

- [ ] **Step 4: Converge leaderboard scope rules**

- [ ] **Step 5: Remove frontend dependency on speculative multi-call assembly where a stable backend contract should exist**

- [ ] **Step 6: Run contest and ranking frontend tests plus API tests**

Run:

```bash
cargo test -p api contest_and_leaderboard_scope -- --nocapture
cd frontend && npx vitest --run src/services/__tests__/contests.test.ts src/services/__tests__/ranking.test.ts
```

- [ ] **Step 7: Write the phase summary and request `R4`**

### Task 7: P6 Community / Messages / Notifications / Search Convergence

**Files:**
- Modify: `api/src/discussions/routes.rs`
- Modify: `api/src/blog/routes.rs`
- Modify: `api/src/messages/routes.rs`
- Modify: `api/src/notifications/routes.rs`
- Modify: `api/src/search/routes.rs`
- Modify: `frontend/src/pages/community/*.tsx`
- Modify: `frontend/src/pages/user/Settings.tsx`
- Modify: `frontend/src/pages/admin/ReportManagement.tsx`
- Modify: `frontend/src/services/messages.ts`
- Modify: `frontend/src/services/searchApi.ts`
- Create: `api/tests/community_message_search_scope.rs`

- [ ] **Step 1: Write failing tests for fake-success and scope leaks**

Scenarios:

- settings action must fail if no backend contract exists
- cross-tenant message visibility rejected
- search excludes unauthorized resources
- report management must not remain a dead formal product surface

- [ ] **Step 2: Run the tests to confirm failure**

- [ ] **Step 3: Remove or replace fake-success UI actions**

- [ ] **Step 4: Apply tenant/role checks to messaging and search**

- [ ] **Step 5: Either connect report management to real backend or remove it from the formal product surface**

- [ ] **Step 6: Run relevant frontend and backend tests**

Run:

```bash
cargo test -p api community_message_search_scope -- --nocapture
cd frontend && npx vitest --run src/services/__tests__/messages.test.ts src/services/__tests__/searchApi.test.ts src/services/__tests__/communityApi.test.ts
```

- [ ] **Step 7: Write the phase summary and request `R4`**

### Task 8: P7 Release Hardening And Truthful Delivery

**Files:**
- Modify: `docs/delivery/RELEASE_RUNBOOK_2026-03-06.md`
- Modify: `docs/delivery/ACCEPTANCE_CHECKLIST_2026-03-06.md`
- Modify: `docs/delivery/RELEASE_DECISION_RECORD_2026-03-06.md`
- Modify: `docs/architecture/PROJECT_HANDBOOK_2026-03-07.md`
- Create: `api/tests/role_matrix_release_gate.rs`
- Create: `judge-worker/tests/submission_integration.rs`
- Create: `frontend/e2e/production-smoke.spec.ts`

- [ ] **Step 1: Write failing release-gate tests and smoke checks**

Coverage:

- role matrix
- hidden data protection
- worker callback auth
- submission end-to-end
- teacher flow
- admin problem management flow

- [ ] **Step 2: Run them to confirm the remaining real failures**

- [ ] **Step 3: Update runbook and acceptance docs to match actual behavior**

- [ ] **Step 4: Add the final production smoke path**

Required runtime path:

- login
- problem list
- submission
- result transition to terminal state
- teacher class management
- admin problem/test-case management

- [ ] **Step 5: Run the full release gate**

Run:

```bash
cargo check -p api
cargo test -p api -- --nocapture
cargo check -p judge-worker
cargo test -p judge-worker -- --nocapture
cd frontend && npm run lint
cd frontend && npm run typecheck
cd frontend && npm run build
cd frontend && npx vitest --run
cd frontend && npx playwright test
```

Expected:

- all green
- no P0/P1 defects remain
- docs match runtime behavior

- [ ] **Step 6: Write the phase summary and request `R5`**

## Parallel Execution Model

### Codex Lead Lane

Codex owns:

- phase briefs
- backend contracts
- security-critical flows
- review decisions

### Claude Code Parallel Lane

Claude owns:

- frontend refactor and cleanup
- route guard and role-type alignment
- admin/teacher/user page contract alignment
- frontend smoke stabilization

Claude must:

- read `Shared/README.md`
- read the active phase brief
- modify only the files assigned to the Claude lane
- write or update the phase summary before review

## Definition Of Phase Pass

A phase passes only if:

- the in-scope acceptance markers are all checked
- the required tests for the phase are green
- the active phase summary is written
- the required review checkpoint passes
- no unapproved red test remains

## Plan Review Loop

- [ ] Dispatch one plan reviewer after this plan is saved.
- [ ] If the reviewer finds gaps, update this file.
- [ ] Re-run the review once after fixes.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-08-production-convergence-plan.md`.

Recommended execution mode:

1. `Codex lead + Claude frontend parallel lane`
2. one phase at a time
3. no phase overlap until the previous review checkpoint passes
