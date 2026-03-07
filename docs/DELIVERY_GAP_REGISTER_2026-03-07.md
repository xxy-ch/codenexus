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
  - unsupported `reports` module was removed from admin navigation and routes
  - admin problem management is now explicitly read-only instead of exposing nonfunctional write controls
- Evidence:
  - `frontend/src/pages/admin/AdminDashboard.tsx`
  - `frontend/src/layouts/AdminLayout.tsx`
  - `frontend/src/App.tsx`
  - `frontend/src/pages/admin/ProblemManagement.tsx`

### I. Scoped leaderboard rank placeholder removed and verified in live stack
- Resolution:
  - campus/class scoped ranking no longer falls back to `0`
  - refreshed Docker API verified:
    - `/leaderboard/global` -> `200`
    - `/leaderboard/user/:id/stats` -> `200`
  - leaderboard runtime is now current-schema compatible for:
    - aggregate score decoding
    - total count query
    - empty-submission users
    - users without active class enrollment
- Evidence:
  - `api/src/leaderboard/service.rs`
  - `api/src/leaderboard/models.rs`
  - `api/src/leaderboard/routes.rs`

### M. Contest and ranking production connectors are verified against the live stack
- Resolution:
  - contest frontend service no longer falls back to mock data
  - ranking frontend service now consumes the live leaderboard payload
  - refreshed Docker API verified:
    - `/contests` -> `200`
    - `/leaderboard/global` -> `200`
  - Playwright smoke is green again after connector and assertion updates
- Evidence:
  - `frontend/src/services/contests.ts`
  - `frontend/src/services/ranking.ts`
  - `frontend/e2e/smoke.spec.ts`
  - `scripts/bootstrap_demo.sql`

### N. Admin user management now uses business-facing `user_code` while keeping internal UUIDs
- Resolution:
  - internal `user_id` remains `UUID` across database keys, JWT claims, and route parameters
  - admin bulk account creation now accepts 12-digit `user_code` values and lets the system generate the real UUID primary key
  - live stack verified:
    - `GET /users/admin` -> `200`
    - `POST /users/admin/batch-create` -> `200`
  - seeded demo accounts now carry non-null `user_code` values after re-running the bootstrap script
- Evidence:
  - `api/migrations/021_add_user_code_and_status.sql`
  - `api/src/users/models.rs`
  - `api/src/users/service.rs`
  - `api/src/users/routes.rs`
  - `frontend/src/pages/admin/UserManagement.tsx`
  - `frontend/src/services/admin.ts`
  - `scripts/bootstrap_demo.sql`
  - `frontend/e2e/smoke.spec.ts`

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

### O. Ranking, direct messages, and plagiarism detail pages advanced to richer reference shells
- Resolution:
  - ranking now uses a reference-style hero, podium summary, and leaderboard table fed by the live ranking service
  - direct messages now use a two-pane shell with summary cards and explicit delivery-boundary copy while preserving the live messaging contract
  - plagiarism detail now supports richer report variants from live risk level and suspicious-pair density instead of a single generic table shell
  - refreshed Docker frontend verified by Playwright smoke after rebuilding the runtime image
- Evidence:
  - `frontend/src/pages/user/Ranking.tsx`
  - `frontend/src/pages/community/DirectMessages.tsx`
  - `frontend/src/pages/admin/PlagiarismReportDetail.tsx`
  - `frontend/e2e/smoke.spec.ts`

### P. Profile and settings now share a unified account-center presentation
- Resolution:
  - profile page now uses a reference-style account hero, stat cards, and identity panel while keeping the live profile/update contract
  - settings page now uses the same account-center visual system and explicitly distinguishes live account fields from local preference placeholders
  - frontend quality gates remain green after the redesign
- Evidence:
  - `frontend/src/pages/user/Profile.tsx`
  - `frontend/src/pages/user/Settings.tsx`

### Q. Blog feed and editor now use stable reference-style shells on the live stack
- Resolution:
  - blog feed now uses a reference-style hero, filter rail, featured article block, and live article grid
  - create/edit article pages now use a reference-style editor shell with metadata side panel and split preview
  - the markdown editor runtime was simplified to a stable textarea-based implementation so `/blog/new` no longer blanks the page in Docker
  - Playwright smoke now verifies `/blog` and `/blog/new` against the refreshed frontend image
- Evidence:
  - `frontend/src/pages/community/BlogList.tsx`
  - `frontend/src/pages/community/CreateArticle.tsx`
  - `frontend/src/pages/community/EditArticle.tsx`
  - `frontend/src/components/editor/MarkdownEditor.tsx`
  - `frontend/e2e/smoke.spec.ts`

### R. Read-only and downgrade boundaries are now explicit in the delivered UI
- Resolution:
  - admin problem management now places the read-only delivery scope in a dedicated warning banner rather than leaving the boundary implicit in table copy
  - teacher class management now surfaces the live-schema downgrade boundary and the concrete `501` write paths in the page shell itself
  - this reduces mismatch between visible UI affordances and actual backend capability
- Evidence:
  - `frontend/src/pages/admin/ProblemManagement.tsx`
  - `frontend/src/pages/teacher/ClassManagement.tsx`

### S. Admin user management now uses a reference-style shell and smoke-verified identity boundary
- Resolution:
  - user management now uses a richer admin shell with overview cards, bulk-create panel, and clearer separation between `UUID` and 12-digit `user_code`
  - live role/status actions remain wired to the real admin endpoints
  - Playwright smoke now verifies the identity-boundary copy on `/admin/users`
- Evidence:
  - `frontend/src/pages/admin/UserManagement.tsx`
  - `frontend/e2e/smoke.spec.ts`

### T. Dashboard and problem repository now expose stronger reference-style summary rails
- Resolution:
  - dashboard now includes a weekly focus panel and progress snapshot above the existing analytics blocks
  - problem repository now includes a repository-state summary rail and delivery note above the result table
  - Playwright smoke now checks these summary structures on `/dashboard` and `/problems`
- Evidence:
  - `frontend/src/pages/user/DashboardEnhanced.tsx`
  - `frontend/src/pages/user/ProblemSet.tsx`
  - `frontend/e2e/smoke.spec.ts`

### U. Problem IDE runtime regression is closed and smoke-verified in Docker
- Resolution:
  - fixed the IDE shell contract so the layout receives the live `code` value and submit metadata instead of referencing an undefined variable at runtime
  - aligned the IDE page to the live `problemsService.getProblem` contract and passed the full layout props needed by the docked editor shell
  - rebuilt Docker frontend and re-ran Playwright smoke against the live stack
- Evidence:
  - `frontend/src/components/ide/IDELayout.tsx`
  - `frontend/src/pages/user/ProblemIDEEnhanced.tsx`
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
  - write controls are now hidden and the UI explicitly marks the surface read-only, but dedicated admin semantics are still absent
- Required fix:
  - either implement real admin problem endpoints
  - or formally scope the page down to read-only management

## Medium Priority

### 7. Contest runtime is real-data only, but demo coverage is incomplete
- Status: `medium`
- User impact: live contest list is now delivered from real data, but contest scenario coverage is still thin and remains closer to demo validation than production-ready breadth.
- Evidence:
  - `frontend/src/services/contests.ts`
  - `api/src/contests/routes.rs`
- Current root cause:
  - demo seed now contains one contest, but only a minimal scenario is covered
  - contest detail, registration edge cases, and scoreboard breadth still need broader smoke coverage
- Required fix:
  - expand contest smoke coverage beyond the seed happy path
  - verify detail/not-found behavior and scoreboard edge cases in the rebuilt stack

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
3. Retire or rewrite outdated baseline documents and keep runbook aligned with the live stack and current identity contract.
4. Clean generated artifacts before final handoff.
