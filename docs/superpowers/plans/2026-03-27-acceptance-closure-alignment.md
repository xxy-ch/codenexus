# Acceptance Closure Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining frontend redesign, frontend/backend truthfulness, and acceptance-verification gaps so the repository reaches an acceptance-ready state with evidence.

**Architecture:** Execute three parallel acceptance tracks in one repository: frontend alignment closeout, frontend/backend contract verification, and final release-style evidence gates. Prioritize route families and services that are both user-visible and contract-sensitive, and end with one explicit verification sweep rather than scattered local confidence.

**Tech Stack:** React, React Router, TanStack Query, Tailwind CSS, Vitest, Testing Library, Rust, Axum, SQLx, Python unittest

---

### Task 1: Lock Acceptance Scope And Verification Inventory

**Files:**
- Create or modify: `docs/delivery/ACCEPTANCE_CHECKLIST_2026-03-27.md`
- Create or modify: `docs/delivery/ACCEPTANCE_EVIDENCE_2026-03-27.md`

- [ ] **Step 1: Write the failing checklist expectations**

Record a checklist that is initially incomplete for:
- frontend route-family alignment evidence
- frontend/service truthfulness evidence
- backend verification evidence
- environment-gated exceptions

- [ ] **Step 2: Verify the checklist is incomplete**

Run:

```bash
test -f docs/delivery/ACCEPTANCE_CHECKLIST_2026-03-27.md && sed -n '1,220p' docs/delivery/ACCEPTANCE_CHECKLIST_2026-03-27.md || true
```

Expected:
- no fully completed acceptance checklist yet, or obvious placeholders only

- [ ] **Step 3: Write the initial acceptance inventory**

Document:
- which route families are already partially verified
- which checks are already green
- which checks are missing or environment-gated

- [ ] **Step 4: Re-read the checklist for completeness**

Run:

```bash
sed -n '1,220p' docs/delivery/ACCEPTANCE_CHECKLIST_2026-03-27.md
sed -n '1,220p' docs/delivery/ACCEPTANCE_EVIDENCE_2026-03-27.md
```

Expected:
- checklist clearly maps acceptance goals to executable evidence

- [ ] **Step 5: Commit**

```bash
git add docs/delivery/ACCEPTANCE_CHECKLIST_2026-03-27.md docs/delivery/ACCEPTANCE_EVIDENCE_2026-03-27.md
git commit -m "docs: define acceptance closure inventory"
```

### Task 2: Finish Shared Frontend Closeout Primitives

**Files:**
- Modify: `frontend/src/components/ui/Button.tsx`
- Modify: `frontend/src/components/ui/Input.tsx`
- Modify: `frontend/src/components/ui/Select.tsx`
- Modify: `frontend/src/components/ui/Textarea.tsx`
- Modify: `frontend/src/components/page/FilterBar.tsx`
- Modify: `frontend/src/components/page/PageHeader.tsx`
- Modify: `frontend/src/components/page/SurfaceCard.tsx`
- Modify: `frontend/src/components/page/SectionBlock.tsx`
- Test: `frontend/src/components/ui/__tests__/primitives.test.tsx`
- Test: `frontend/src/components/page/__tests__/page-primitives.test.tsx`

- [ ] **Step 1: Write failing tests for closeout-specific primitive rules**

Add assertions for:
- focus visibility
- no layout-shift hover behavior
- compact density consistency across button/input/select/textarea
- responsive filter and header spacing behavior

- [ ] **Step 2: Run the primitive suites to verify failure**

Run:

```bash
cd frontend && npm test -- --run src/components/ui/__tests__/primitives.test.tsx src/components/page/__tests__/page-primitives.test.tsx
```

Expected:
- FAIL because closeout-specific UX assertions are not fully encoded yet

- [ ] **Step 3: Write the minimal primitive fixes**

Align primitive behavior to the closeout spec:
- visible focus states
- stable hover affordances
- compact editorial density
- responsive padding and filter/header wrapping

- [ ] **Step 4: Re-run the primitive suites**

Run:

```bash
cd frontend && npm test -- --run src/components/ui/__tests__/primitives.test.tsx src/components/page/__tests__/page-primitives.test.tsx
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Button.tsx frontend/src/components/ui/Input.tsx frontend/src/components/ui/Select.tsx frontend/src/components/ui/Textarea.tsx frontend/src/components/page/FilterBar.tsx frontend/src/components/page/PageHeader.tsx frontend/src/components/page/SurfaceCard.tsx frontend/src/components/page/SectionBlock.tsx frontend/src/components/ui/__tests__/primitives.test.tsx frontend/src/components/page/__tests__/page-primitives.test.tsx
git commit -m "feat: finish shared frontend closeout primitives"
```

### Task 3: Close Teacher And Admin Route Family UX Gaps

**Files:**
- Modify: `frontend/src/pages/teacher/ClassManagement.tsx`
- Modify: `frontend/src/pages/teacher/AssignmentReport.tsx`
- Modify: `frontend/src/pages/teacher/ContestWizard.tsx`
- Modify: `frontend/src/pages/admin/UserManagement.tsx`
- Modify: `frontend/src/pages/admin/ProblemManagement.tsx`
- Modify: `frontend/src/pages/admin/JudgeSettings.tsx`
- Modify: `frontend/src/pages/admin/ProblemContentConfig.tsx`
- Modify: `frontend/src/pages/admin/SimilarityScanConfig.tsx`
- Test: `frontend/src/pages/teacher/__tests__/AssignmentReport.alignment.test.tsx`
- Test: `frontend/src/pages/teacher/__tests__/ClassManagement.alignment.test.tsx`
- Test: `frontend/src/pages/teacher/__tests__/ContestWizard.alignment.test.tsx`
- Test: `frontend/src/pages/admin/__tests__/JudgeSettings.alignment.test.tsx`
- Test: `frontend/src/pages/admin/__tests__/ProblemContentConfig.alignment.test.tsx`
- Test: `frontend/src/pages/admin/__tests__/ProblemManagement.alignment.test.tsx`
- Test: `frontend/src/pages/admin/__tests__/SimilarityScanConfig.alignment.test.tsx`
- Test: `frontend/src/pages/admin/__tests__/UserManagement.alignment.test.tsx`

- [ ] **Step 1: Add failing route-family assertions for closeout rules**

Cover:
- honest unsupported-path messaging
- responsive table/panel behavior
- related loading/empty/error treatment
- consistent shell/header/filter composition

- [ ] **Step 2: Run the teacher/admin suites to verify failure**

Run:

```bash
cd frontend && npm test -- --run src/pages/teacher/__tests__/AssignmentReport.alignment.test.tsx src/pages/teacher/__tests__/ClassManagement.alignment.test.tsx src/pages/teacher/__tests__/ContestWizard.alignment.test.tsx src/pages/admin/__tests__/JudgeSettings.alignment.test.tsx src/pages/admin/__tests__/ProblemContentConfig.alignment.test.tsx src/pages/admin/__tests__/ProblemManagement.alignment.test.tsx src/pages/admin/__tests__/SimilarityScanConfig.alignment.test.tsx src/pages/admin/__tests__/UserManagement.alignment.test.tsx
```

Expected:
- FAIL where route-family closeout rules are not yet enforced

- [ ] **Step 3: Write the minimal page fixes**

Tighten each route to:
- use shared primitives consistently
- avoid viewport overflow for dense tables/panels
- keep unsupported actions explicit
- preserve aligned content hierarchy

- [ ] **Step 4: Re-run the teacher/admin suites**

Run the same command from Step 2.

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/teacher frontend/src/pages/admin frontend/src/pages/teacher/__tests__ frontend/src/pages/admin/__tests__
git commit -m "feat: close teacher and admin alignment gaps"
```

### Task 4: Finish User Data Surfaces And Truthful Settings

**Files:**
- Modify: `frontend/src/pages/user/ProblemSet.tsx`
- Modify: `frontend/src/components/problems/ProblemTable.tsx`
- Modify: `frontend/src/components/problems/ProblemFilters.tsx`
- Modify: `frontend/src/pages/user/Settings.tsx`
- Modify: `frontend/src/pages/user/DashboardEnhanced.tsx`
- Modify: `frontend/src/pages/user/ProblemDetail.tsx`
- Modify: `frontend/src/pages/user/ProblemIDEEnhanced.tsx`
- Modify: `frontend/src/pages/user/SubmissionHistory.tsx`
- Modify: `frontend/src/pages/user/SubmissionDetail.tsx`
- Create or modify: `frontend/src/pages/user/__tests__/ProblemSet.test.tsx`
- Create or modify: `frontend/src/pages/user/__tests__/Settings.truthfulness.test.tsx`
- Reuse or extend: `frontend/src/pages/user/__tests__/DashboardEnhanced.test.tsx`
- Reuse or extend: `frontend/src/pages/user/__tests__/auxiliary-shells.alignment.test.tsx`

- [ ] **Step 1: Write or extend failing tests for truthful user data surfaces**

Cover:
- no static curated list fallback on problem pages
- settings persistence messaging matches reality
- dashboard/detail/IDE/history surfaces use consistent aligned state handling

- [ ] **Step 2: Run focused user data suites to verify failure**

Run:

```bash
cd frontend && npm test -- --run src/pages/user/__tests__/ProblemSet.test.tsx src/pages/user/__tests__/Settings.truthfulness.test.tsx src/pages/user/__tests__/DashboardEnhanced.test.tsx src/pages/user/__tests__/auxiliary-shells.alignment.test.tsx
```

Expected:
- at least one failing suite that exposes remaining user truthfulness or alignment gaps

- [ ] **Step 3: Write the minimal user data fixes**

Implement only the changes required to:
- keep live-data pages honest
- align the user workspace surfaces to the shared system
- preserve editorial/workspace rhythm from `stitch`

- [ ] **Step 4: Re-run focused user data suites**

Run the same command from Step 2.

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/user/ProblemSet.tsx frontend/src/components/problems/ProblemTable.tsx frontend/src/components/problems/ProblemFilters.tsx frontend/src/pages/user/Settings.tsx frontend/src/pages/user/DashboardEnhanced.tsx frontend/src/pages/user/ProblemDetail.tsx frontend/src/pages/user/ProblemIDEEnhanced.tsx frontend/src/pages/user/SubmissionHistory.tsx frontend/src/pages/user/SubmissionDetail.tsx frontend/src/pages/user/__tests__/ProblemSet.test.tsx frontend/src/pages/user/__tests__/Settings.truthfulness.test.tsx frontend/src/pages/user/__tests__/DashboardEnhanced.test.tsx frontend/src/pages/user/__tests__/auxiliary-shells.alignment.test.tsx
git commit -m "feat: finish user data surfaces and truthful settings"
```

### Task 5: Finish Contest, Ranking, And Community Editorial Alignment

**Files:**
- Modify: `frontend/src/pages/user/ContestList.tsx`
- Modify: `frontend/src/pages/user/ContestDetail.tsx`
- Modify: `frontend/src/pages/contest/ContestScoreboard.tsx`
- Modify: `frontend/src/pages/user/Ranking.tsx`
- Modify: `frontend/src/pages/community/DiscussionList.tsx`
- Modify: `frontend/src/pages/community/DiscussionDetail.tsx`
- Modify: `frontend/src/pages/community/BlogList.tsx`
- Modify: `frontend/src/pages/community/BlogDetail.tsx`
- Modify: `frontend/src/pages/community/CreateDiscussion.tsx`
- Modify: `frontend/src/pages/community/CreateArticle.tsx`
- Modify: `frontend/src/pages/community/EditArticle.tsx`
- Modify: `frontend/src/pages/community/DirectMessages.tsx`
- Reuse or extend: `frontend/src/pages/user/__tests__/ContestList.alignment.test.tsx`
- Reuse or extend: `frontend/src/pages/contest/__tests__/ContestScoreboard.alignment.test.tsx`
- Reuse or extend: `frontend/src/pages/user/__tests__/auxiliary-shells.alignment.test.tsx`
- Reuse or extend: `frontend/src/pages/community/__tests__/DiscussionList.alignment.test.tsx`
- Reuse or extend: `frontend/src/pages/community/__tests__/DiscussionDetail.alignment.test.tsx`
- Reuse or extend: `frontend/src/pages/community/__tests__/BlogList.alignment.test.tsx`
- Reuse or extend: `frontend/src/pages/community/__tests__/BlogDetail.alignment.test.tsx`
- Reuse or extend: `frontend/src/pages/community/__tests__/community-authoring-pages.test.tsx`

- [ ] **Step 1: Write or extend failing tests for contest and community closeout**

Cover:
- contest/ranking/community pages use consistent aligned shells and state handling
- scoreboard remains acceptance-gated as a first-class contest surface
- unsupported messaging is explicit where needed

- [ ] **Step 2: Run focused contest/community suites to verify failure**

Run:

```bash
cd frontend && npm test -- --run src/pages/user/__tests__/ContestList.alignment.test.tsx src/pages/user/__tests__/ContestDetail.alignment.test.tsx src/pages/user/__tests__/Ranking.alignment.test.tsx src/pages/contest/__tests__/ContestScoreboard.alignment.test.tsx src/pages/user/__tests__/auxiliary-shells.alignment.test.tsx src/pages/community/__tests__/DiscussionList.alignment.test.tsx src/pages/community/__tests__/DiscussionDetail.alignment.test.tsx src/pages/community/__tests__/BlogList.alignment.test.tsx src/pages/community/__tests__/BlogDetail.alignment.test.tsx src/pages/community/__tests__/community-authoring-pages.test.tsx
```

Expected:
- at least one failing suite that exposes remaining contest/community closeout gaps

- [ ] **Step 3: Write the minimal contest/community fixes**

Implement only the changes required to:
- align contest/ranking/community surfaces to the shared system
- preserve editorial reading and workspace rhythm from `stitch`

- [ ] **Step 4: Re-run focused contest/community suites**

Run the same command from Step 2, adjusting to exact file paths if suite names need narrowing.

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/user/ContestList.tsx frontend/src/pages/user/ContestDetail.tsx frontend/src/pages/contest/ContestScoreboard.tsx frontend/src/pages/user/Ranking.tsx frontend/src/pages/community frontend/src/pages/user/__tests__/ContestList.alignment.test.tsx frontend/src/pages/user/__tests__/ContestDetail.alignment.test.tsx frontend/src/pages/user/__tests__/Ranking.alignment.test.tsx frontend/src/pages/contest/__tests__/ContestScoreboard.alignment.test.tsx frontend/src/pages/user/__tests__/auxiliary-shells.alignment.test.tsx frontend/src/pages/community/__tests__
git commit -m "feat: finish contest and community editorial alignment"
```

### Task 6: Verify Frontend/Auth Service Contracts

**Files:**
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/services/auth.ts`
- Modify: `frontend/src/services/admin.ts`
- Modify: `frontend/src/services/problems.ts`
- Modify: `frontend/src/hooks/useAuth.ts`
- Modify: `frontend/src/store/authStore.ts`
- Modify: `frontend/src/types/auth.ts`
- Modify: `frontend/src/components/auth/ProtectedRoute.tsx`
- Test: `frontend/src/services/__tests__/api.refresh-response.test.ts`
- Test: `frontend/src/services/__tests__/auth.current-user-alignment.test.ts`
- Test: `frontend/src/services/__tests__/auth.payloads.test.ts`
- Test: `frontend/src/services/__tests__/auth.refresh-alignment.test.ts`
- Test: `frontend/src/services/__tests__/admin.problem-query-alignment.test.ts`
- Test: `frontend/src/services/__tests__/problems.query-alignment.test.ts`
- Test: `frontend/src/components/auth/__tests__/ProtectedRoute.test.tsx`

- [ ] **Step 1: Add failing tests for any remaining contract mismatches**

Cover:
- refresh response normalization
- current-user payload mapping
- admin/problem query semantics
- protected-route behavior under real auth state transitions

- [ ] **Step 2: Run the service/auth suites to verify failure**

Run:

```bash
cd frontend && npm test -- --run src/services/__tests__/admin.problem-query-alignment.test.ts src/services/__tests__/api.refresh-response.test.ts src/services/__tests__/auth.current-user-alignment.test.ts src/services/__tests__/auth.payloads.test.ts src/services/__tests__/auth.refresh-alignment.test.ts src/services/__tests__/problems.query-alignment.test.ts src/components/auth/__tests__/ProtectedRoute.test.tsx
```

Expected:
- FAIL if any remaining contract drift is still present

- [ ] **Step 3: Write the minimal contract fixes**

Patch frontend boundary code so that:
- auth and refresh are normalized once
- query serialization matches supported backend semantics
- protected-route decisions reflect true auth state

- [ ] **Step 4: Re-run the service/auth suites**

Run the same command from Step 2.

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services frontend/src/hooks/useAuth.ts frontend/src/store/authStore.ts frontend/src/types/auth.ts frontend/src/components/auth/ProtectedRoute.tsx frontend/src/components/auth/__tests__/ProtectedRoute.test.tsx
git commit -m "fix: close frontend auth and service contract gaps"
```

### Task 7: Close Backend Auth And Runtime Alignment Gaps

**Files:**
- Modify: `api/src/middleware/auth.rs`
- Modify: `api/src/middleware/authz.rs`
- Modify: `api/src/middleware/permission.rs`
- Test: existing auth middleware tests in `api/src/middleware/auth.rs`

- [ ] **Step 1: Write a focused failing auth/runtime test**

Add or refine a test covering:
- runtime JWT secret fallback behavior
- test stability around environment mutation
- doctest-safe documentation behavior if auth-adjacent examples participate in `cargo test`

- [ ] **Step 2: Run the scoped backend auth checks to verify failure**

Run:

```bash
cd api && cargo test middleware::auth::tests::
```

Expected:
- FAIL if the targeted auth/runtime assumption is not yet encoded correctly

- [ ] **Step 3: Write the minimal auth/runtime fixes**

Keep fixes bounded to:
- runtime default behavior
- auth test stability
- doc/test harness stability directly tied to these files

- [ ] **Step 4: Re-run the scoped backend auth checks**

Run the same command from Step 2.

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/middleware/auth.rs api/src/middleware/authz.rs api/src/middleware/permission.rs
git commit -m "fix: align backend auth runtime behavior"
```

### Task 8: Close Notification, Migration, And Helper Alignment Gaps

**Files:**
- Modify: `api/src/notifications/models.rs`
- Modify: `api/src/notifications/service.rs`
- Modify: `api/migrations/2026-02-22-003-notifications.sql`
- Modify or create: `api/migrations/2026-02-21-002-discussions-runtime.sql`
- Modify or create: `api/migrations/2026-03-27-001-update-user-login-backfill.sql`
- Modify: `scripts/check_alignment.py`
- Modify: `scripts/apply_runtime_migrations.py`
- Modify: `scripts/tests/test_check_alignment.py`
- Modify: `scripts/tests/test_apply_runtime_migrations.py`

- [ ] **Step 1: Write failing backend/script tests for notification and migration alignment**

Add coverage for:
- notification explicit-column mapping and runtime field types
- migration discovery/order behavior
- repository alignment helper expectations

- [ ] **Step 2: Run the scoped backend/script checks to verify failure**

Run:

```bash
cd api && cargo test notifications::
cd /Users/xiexingyu/Documents/项目/Online_Judge && python3 -m unittest scripts.tests.test_check_alignment scripts.tests.test_apply_runtime_migrations
```

Expected:
- at least one failure in the newly added targeted backend/script coverage if the assumptions are not yet aligned

- [ ] **Step 3: Write the minimal notification/migration/helper fixes**

Keep fixes bounded to:
- explicit schema/runtime alignment
- executable helper correctness

- [ ] **Step 4: Re-run the backend/script checks**

Run the same commands from Step 2.

Expected:
- PASS, with only explicitly environment-gated backend tests ignored

- [ ] **Step 5: Commit**

```bash
git add api/src/notifications/models.rs api/src/notifications/service.rs api/migrations/2026-02-22-003-notifications.sql api/migrations/2026-02-21-002-discussions-runtime.sql api/migrations/2026-03-27-001-update-user-login-backfill.sql scripts/check_alignment.py scripts/apply_runtime_migrations.py scripts/tests/test_check_alignment.py scripts/tests/test_apply_runtime_migrations.py
git commit -m "fix: align notifications migrations and verification helpers"
```

### Task 9: Run Acceptance Closure Verification Sweep

**Files:**
- Modify: `docs/delivery/ACCEPTANCE_CHECKLIST_2026-03-27.md`
- Create or modify: `docs/delivery/ACCEPTANCE_EVIDENCE_2026-03-27.md`
- Create or modify: `docs/delivery/RELEASE_RUNBOOK_2026-03-27.md`

- [ ] **Step 1: Run the focused frontend suites**

Run:

```bash
cd frontend && npm test -- --run src/components/ui/__tests__/primitives.test.tsx src/components/page/__tests__/page-primitives.test.tsx src/components/auth/__tests__/ProtectedRoute.test.tsx src/services/__tests__/admin.problem-query-alignment.test.ts src/services/__tests__/api.refresh-response.test.ts src/services/__tests__/auth.current-user-alignment.test.ts src/services/__tests__/auth.payloads.test.ts src/services/__tests__/auth.refresh-alignment.test.ts src/services/__tests__/problems.query-alignment.test.ts src/pages/user/__tests__/ProblemSet.test.tsx src/pages/user/__tests__/Settings.truthfulness.test.tsx src/pages/user/__tests__/DashboardEnhanced.test.tsx src/pages/user/__tests__/ContestList.alignment.test.tsx src/pages/user/__tests__/ContestDetail.alignment.test.tsx src/pages/user/__tests__/Ranking.alignment.test.tsx src/pages/contest/__tests__/ContestScoreboard.alignment.test.tsx src/pages/user/__tests__/auxiliary-shells.alignment.test.tsx src/pages/teacher/__tests__/AssignmentReport.alignment.test.tsx src/pages/teacher/__tests__/ClassManagement.alignment.test.tsx src/pages/teacher/__tests__/ContestWizard.alignment.test.tsx src/pages/admin/__tests__/JudgeSettings.alignment.test.tsx src/pages/admin/__tests__/ProblemContentConfig.alignment.test.tsx src/pages/admin/__tests__/ProblemManagement.alignment.test.tsx src/pages/admin/__tests__/SimilarityScanConfig.alignment.test.tsx src/pages/admin/__tests__/UserManagement.alignment.test.tsx src/pages/community/__tests__/DiscussionList.alignment.test.tsx src/pages/community/__tests__/DiscussionDetail.alignment.test.tsx src/pages/community/__tests__/BlogList.alignment.test.tsx src/pages/community/__tests__/BlogDetail.alignment.test.tsx src/pages/community/__tests__/community-authoring-pages.test.tsx
```

Expected:
- PASS

- [ ] **Step 2: Run frontend build gates**

Run:

```bash
cd frontend && npm run typecheck
cd frontend && npm run build
```

Expected:
- PASS

- [ ] **Step 3: Run backend and script gates**

Run:

```bash
cd api && cargo test
cd /Users/xiexingyu/Documents/项目/Online_Judge && python3 -m unittest scripts.tests.test_check_alignment scripts.tests.test_apply_runtime_migrations
```

Expected:
- PASS, with only documented environment-gated ignores

- [ ] **Step 4: Write acceptance evidence and residual-risk notes**

Record:
- what commands passed
- what was ignored due to environment
- what was intentionally deferred
- what representative routes were smoke-checked manually:
  - `/login`
  - `/problems`
  - `/problems/:id`
  - `/contests/:contestId/scoreboard`
  - `/settings`
  - `/teacher/classes`
  - `/teacher/assignment-report`
  - `/admin/users`
  - `/admin/problems`
  - `/discussions`
  - `/blog`

- [ ] **Step 5: Commit**

```bash
git add docs/delivery/ACCEPTANCE_CHECKLIST_2026-03-27.md docs/delivery/ACCEPTANCE_EVIDENCE_2026-03-27.md docs/delivery/RELEASE_RUNBOOK_2026-03-27.md
git commit -m "chore: record acceptance closure evidence"
```
