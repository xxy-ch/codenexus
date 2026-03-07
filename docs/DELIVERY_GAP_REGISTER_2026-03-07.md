# Delivery Gap Register - 2026-03-07

## Scope
This register captures unfinished points discovered by a full repository scan across:
- frontend route surface
- backend runtime compatibility with the current database schema
- Docker delivery environment
- reference-template dynamicization status
- release documentation consistency

Status values:
- `blocked`: user-visible failure or delivery blocker
- `high`: not blocking boot, but not acceptable as complete delivery
- `medium`: incomplete or degraded capability that should be closed before production
- `low`: engineering debt or documentation inconsistency

## Resolved In Current Pass

### A. Teacher classes read-path runtime failure
- Resolution:
  - `/classes` and `/classes/:id/stats` are now current-schema compatible
  - browser smoke for `/teacher/classes` now passes
- Evidence:
  - `api/src/classes/service.rs`
  - `api/src/classes/models.rs`
  - `frontend/src/services/classes.ts`

### B. Problem detail mock fallback
- Resolution:
  - `ProblemDetail` now reads real problem data instead of `mockProblems`
  - problem test-case path is aligned to `/test-cases`
- Evidence:
  - `frontend/src/pages/user/ProblemDetail.tsx`
  - `frontend/src/services/problems.ts`

### C. Frontend auth token persistence gap
- Resolution:
  - login/register/logout now synchronize `oj_token` / `oj_refresh_token` with the axios interceptor contract
- Evidence:
  - `frontend/src/store/authStore.ts`
  - `frontend/src/services/api.ts`

### D. Dashboard runtime crash and smoke regression
- Resolution:
  - fixed `weeklyActivity` access-before-initialization bug
  - Playwright smoke suite is now green
- Evidence:
  - `frontend/src/pages/user/DashboardEnhanced.tsx`
  - `frontend/e2e/smoke.spec.ts`

### E. Search UX copy mismatch
- Resolution:
  - search placeholder and header affordances now match the live implementation scope
  - delivered search scope is `problems + discussions`, not `articles/users`
- Evidence:
  - `frontend/src/components/search/SearchBar.tsx`
  - `frontend/src/components/layout/Header.tsx`

### F. Teacher classes schema alignment and downgrade boundary
- Resolution:
  - teacher class read paths are current-schema compatible
  - unsupported write paths now fail explicitly instead of silently assuming historical tables/fields
  - verified runtime behavior:
    - `/classes` -> `200`
    - `/classes/:id/stats` -> `200`
    - `/classes/enroll` -> `501`
    - `/classes/assignments/:id/publish` -> `501`
    - `/classes/assignments/:id/submissions` -> `200` with empty list fallback
  - Playwright smoke remains green after the change
- Evidence:
  - `api/src/classes/models.rs`
  - `api/src/classes/routes.rs`
  - `api/src/classes/service.rs`
  - `frontend/src/pages/teacher/ClassManagement.tsx`
  - `frontend/src/services/classes.ts`
  - `frontend/e2e/smoke.spec.ts`

### G. Plagiarism delivery path no longer falls back to mock data
- Resolution:
  - frontend plagiarism flows now always use the real `/admin/plagiarism/*` endpoints
  - verified runtime endpoints:
    - `/admin/plagiarism/config` -> `200`
    - `/admin/plagiarism/reports` -> `200`
- Evidence:
  - `frontend/src/services/plagiarism.ts`
  - `api/src/plagiarism/routes.rs`

### H. Admin unsupported modules removed from primary entry surface
- Resolution:
  - `/admin` no longer depends on nonexistent stats/health endpoints
  - unsupported `users` and `reports` modules were removed from admin navigation and routes
  - admin problem management is now explicitly read-only instead of exposing nonfunctional write controls
- Evidence:
  - `frontend/src/pages/admin/AdminDashboard.tsx`
  - `frontend/src/layouts/AdminLayout.tsx`
  - `frontend/src/App.tsx`
  - `frontend/src/pages/admin/ProblemManagement.tsx`

### I. Scoped leaderboard rank placeholder removed and verified in live stack
- Resolution:
  - campus/class scoped ranking no longer falls back to `0`
  - refreshed Docker API verified user stats endpoint returns `200`
- Evidence:
  - `api/src/leaderboard/service.rs`

### J. Teacher reference pages advanced from generic placeholders
- Resolution:
  - class management, contest wizard, and assignment report now follow the teacher reference shell much more closely
  - frontend gate checks and Playwright smoke remain green after the redesign
- Evidence:
  - `frontend/src/pages/teacher/ClassManagement.tsx`
  - `frontend/src/pages/teacher/ContestWizard.tsx`
  - `frontend/src/pages/teacher/AssignmentReport.tsx`
  - `frontend/e2e/smoke.spec.ts`

### K. Admin overview and problem management were redesigned without regressing runtime
- Resolution:
  - admin dashboard now uses a reference-style overview shell instead of a generic card list
  - problem management now uses a reference-style management table and toolbar while preserving explicit read-only delivery scope
  - frontend checks and Playwright smoke remain green after the redesign
- Evidence:
  - `frontend/src/pages/admin/AdminDashboard.tsx`
  - `frontend/src/pages/admin/ProblemManagement.tsx`
  - `frontend/e2e/smoke.spec.ts`

### L. Admin configuration pages were redesigned against references without regressing runtime
- Resolution:
  - judge settings, problem content configuration, and similarity scan configuration now use reference-style shells instead of generic forms
  - all three pages remain constrained to the live backend-supported contract rather than exposing fake advanced options
  - frontend checks and Playwright smoke remain green after the redesign
- Evidence:
  - `frontend/src/pages/admin/JudgeSettings.tsx`
  - `frontend/src/pages/admin/ProblemContentConfig.tsx`
  - `frontend/src/pages/admin/SimilarityScanConfig.tsx`
  - `frontend/e2e/smoke.spec.ts`

## Remaining Gaps

## Blocked

Currently no remaining `blocked` items from the latest smoke pass. Remaining gaps are delivery-completeness gaps rather than immediate runtime blockers.

## High Priority

### 4. Reference-template dynamicization is still mostly `partial`
- Status: `high`
- User impact: many pages are functional, but not yet faithful dynamic conversions of `references/`.
- Evidence:
  - `docs/REFERENCE_DYNAMICIZATION_MATRIX_2026-03-07.md`
- Current state:
  - no page is marked `matched`
  - user/admin/community pages remain mostly `partial`
  - teacher core pages have improved, but are still not fully completed against all reference variants
  - admin overview and problem management have improved, but still stop short of full reference completion because unsupported domains remain intentionally hidden
  - admin configuration pages have improved substantially, but still stop at live contract boundaries rather than the full static reference ambition
- Required fix:
  - continue page-by-page convergence until route, real data, layout, and smoke coverage all meet the completion rule

### 5. Teacher module advanced write flows are intentionally out of scope under the live schema
- Status: `medium`
- User impact: teacher class browsing is delivered, but enrollment-by-code and assignment publishing are explicitly unavailable in the current schema.
- Evidence:
  - `api/src/classes/routes.rs`
  - `api/src/classes/service.rs`
  - `api/src/classes/models.rs`
- Current root cause:
  - the current database schema does not provide enrollment-code support or assignment submission tables
  - unsupported paths are now explicitly downgraded instead of silently assuming historical fields/tables
- Required fix:
  - either implement replacement flows against the live schema
  - or keep the unsupported actions hidden/disabled in the delivered teacher UI

### 6. Admin problem management is only partially real
- Status: `high`
- User impact: page exists and is safe to browse, but is delivered as a read-only management view rather than a true admin CRUD backend.
- Evidence:
  - `frontend/src/pages/admin/ProblemManagement.tsx`
  - `frontend/src/services/admin.ts`
- Current root cause:
  - nonexistent `/admin/problems` endpoint was replaced with `/problems`
  - write controls are now hidden, but dedicated admin semantics are still absent
- Required fix:
  - either implement real admin problem endpoints
  - or formally scope the page down to read-only management

## Medium Priority

### 7. Contest runtime is real-data only, but demo coverage is incomplete
- Status: `medium`
- User impact: frontend no longer falls back to fake contests, but the demo environment currently has no contest records and detail/not-found behavior still needs refreshed-stack verification.
- Evidence:
  - `frontend/src/services/contests.ts`
  - `api/src/contests/routes.rs`
- Current root cause:
  - demo seed currently contains no contest records
  - contest detail handling was corrected in code but still needs runtime verification after container refresh
- Required fix:
  - seed at least one demo contest or accept explicit empty-state delivery
  - verify detail/not-found behavior in the rebuilt stack

### 8. Legacy sandbox hardening is not complete
- Status: `medium`
- User impact: not a feature bug, but a production hardening gap for judge execution.
- Evidence:
  - `judge-worker/src/sandbox/seccomp.rs`
- Current root cause:
  - `TODO: Implement proper seccomp filter`
- Required fix:
  - finish sandbox hardening or explicitly document production limitation

## Low Priority

### 9. Release and baseline docs are inconsistent with the current codebase
- Status: `low`
- Evidence:
  - `docs/PROJECT_BASELINE_2026-03-06.md`
  - `docs/IMPLEMENTATION_PLAN_BY_REQUIREMENT_2026-03-06.md`
  - `docs/RELEASE_RUNBOOK_2026-03-06.md`
- Current root cause:
  - old baseline docs still describe outdated progress assumptions
  - runbook language still mentions older search scope
- Required fix:
  - retire old baselines from operational use
  - update runbook to reflect current runtime and delivery constraints

### 10. Delivery workspace still contains generated test/build artifacts
- Status: `low`
- Evidence:
  - `frontend/dist`
  - `frontend/playwright-report`
  - `frontend/test-results`
- Current root cause:
  - generated artifacts are in the workspace and can confuse scan results
- Required fix:
  - clean generated output before final handoff
  - ensure ignore rules and handoff procedure are explicit

### 11. API compiles, but warning count is still high
- Status: `low`
- Evidence:
  - `cargo check -p api`
- Current root cause:
  - many unused imports, dead code, and async trait warnings remain
- Required fix:
  - reduce warning load in stabilized modules
  - keep non-blocking debt out of the critical delivery path

## Immediate Repair Order
1. Continue converting `partial` reference pages, starting with admin and remaining teacher/community pages that are user-visible.
2. Formalize admin problem scope as either true CRUD or explicit read-only delivery.
3. Retire or rewrite outdated baseline documents and keep runbook aligned with the live stack.
4. Clean generated artifacts before final handoff.
