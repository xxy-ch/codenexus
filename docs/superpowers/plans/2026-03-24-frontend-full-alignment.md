# Frontend Full Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully align the frontend to the `stitch` `Architectural Scholar` reference while removing user-visible mock, static, and fake-success behavior.

**Architecture:** Stabilize the shared shell and design primitives first, because the current app mixes partially migrated pages with broken shell offset behavior. Then fix runtime truthfulness in core services and pages, and migrate route families in groups so each domain converges visually and behaviorally under TDD.

**Tech Stack:** React, React Router, TanStack Query, Tailwind CSS, Vitest, Testing Library, Vite

---

### Task 1: Lock The Shell Contract With Failing Tests

**Files:**
- Modify: `frontend/src/layouts/__tests__/shell-layouts.test.tsx`
- Modify: `frontend/src/components/layout/__tests__/Sidebar.test.tsx`
- Test: `frontend/src/layouts/__tests__/shell-layouts.test.tsx`
- Test: `frontend/src/components/layout/__tests__/Sidebar.test.tsx`

- [ ] **Step 1: Write failing tests for the real shell contract**

Add assertions for:
- desktop main content offset reacting to sidebar width
- admin and workspace shells sharing the same offset contract
- sidebar collapsed state updating a width contract instead of only hiding text

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd frontend && npm test -- --run src/layouts/__tests__/shell-layouts.test.tsx src/components/layout/__tests__/Sidebar.test.tsx
```

Expected:
- FAIL because current shell tests do not cover actual layout offset behavior
- or FAIL because the layout contract is not implemented correctly

- [ ] **Step 3: Write minimal shell implementation**

Modify:
- `frontend/src/layouts/MainLayout.tsx`
- `frontend/src/layouts/AdminLayout.tsx`
- `frontend/src/components/layout/Sidebar.tsx`

Use a shared CSS variable contract such as `--sidebar-shell-width` and make both shells read it.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd frontend && npm test -- --run src/layouts/__tests__/shell-layouts.test.tsx src/components/layout/__tests__/Sidebar.test.tsx
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/layouts/MainLayout.tsx frontend/src/layouts/AdminLayout.tsx frontend/src/components/layout/Sidebar.tsx frontend/src/layouts/__tests__/shell-layouts.test.tsx frontend/src/components/layout/__tests__/Sidebar.test.tsx
git commit -m "fix: stabilize shared shell offset contract"
```

### Task 2: Align Global Tokens And Remove Dead Style Paths

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.css`
- Test: `frontend/src/components/ui/__tests__/primitives.test.tsx`

- [ ] **Step 1: Write failing primitive assertions for the canonical token language**

Cover:
- core background and sidebar tokens
- no-line rule fallback expectations where already encoded in shared primitives
- shared type and focus styles

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd frontend && npm test -- --run src/components/ui/__tests__/primitives.test.tsx
```

Expected:
- FAIL if current primitive expectations do not match the refined token contract

- [ ] **Step 3: Write minimal implementation**

Apply `stitch` token alignment in `index.css` and neutralize `App.css` if it is still legacy Vite starter noise.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd frontend && npm test -- --run src/components/ui/__tests__/primitives.test.tsx
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/index.css frontend/src/App.css frontend/src/components/ui/__tests__/primitives.test.tsx
git commit -m "feat: align global design tokens to stitch"
```

### Task 3: Standardize Shared Controls And Remove Raw Control Drift

**Files:**
- Modify: `frontend/src/components/ui/Button.tsx`
- Modify: `frontend/src/components/ui/Input.tsx`
- Modify: `frontend/src/components/page/FilterBar.tsx`
- Modify: `frontend/src/components/page/PageHeader.tsx`
- Modify: `frontend/src/components/page/SurfaceCard.tsx`
- Modify: `frontend/src/components/page/SectionBlock.tsx`
- Test: `frontend/src/components/ui/__tests__/primitives.test.tsx`
- Test: `frontend/src/components/page/__tests__/page-primitives.test.tsx`

- [ ] **Step 1: Write failing tests for shared control density and structure**

Cover:
- consistent button variants
- consistent input states
- page primitives retaining presentational-only boundaries

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd frontend && npm test -- --run src/components/ui/__tests__/primitives.test.tsx src/components/page/__tests__/page-primitives.test.tsx
```

Expected:
- FAIL if shared components do not yet expose the aligned contract

- [ ] **Step 3: Write minimal implementation**

Bring shared controls into closer `stitch` alignment and prepare them to replace page-local raw control styling.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd frontend && npm test -- --run src/components/ui/__tests__/primitives.test.tsx src/components/page/__tests__/page-primitives.test.tsx
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Button.tsx frontend/src/components/ui/Input.tsx frontend/src/components/page/FilterBar.tsx frontend/src/components/page/PageHeader.tsx frontend/src/components/page/SurfaceCard.tsx frontend/src/components/page/SectionBlock.tsx frontend/src/components/ui/__tests__/primitives.test.tsx frontend/src/components/page/__tests__/page-primitives.test.tsx
git commit -m "feat: unify shared controls and page primitives"
```

### Task 4: Remove Runtime Mock Fallback From Admin Services

**Files:**
- Modify: `frontend/src/services/admin.ts`
- Modify: `frontend/src/services/config.ts`
- Test: create `frontend/src/services/__tests__/admin.truthfulness.test.ts`

- [ ] **Step 1: Write the failing service truthfulness test**

Create tests proving:
- admin service methods call `api` instead of returning runtime mock data
- `USE_MOCK_DATA` no longer changes production-facing admin behavior

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd frontend && npm test -- --run src/services/__tests__/admin.truthfulness.test.ts
```

Expected:
- FAIL because current service still branches to mock data

- [ ] **Step 3: Write minimal implementation**

Remove runtime mock branches from `admin.ts`. Keep test-only mocking in test files only.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd frontend && npm test -- --run src/services/__tests__/admin.truthfulness.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/admin.ts frontend/src/services/config.ts frontend/src/services/__tests__/admin.truthfulness.test.ts
git commit -m "fix: remove runtime admin mock fallbacks"
```

### Task 5: Replace Static Problem List With Real Data

**Files:**
- Modify: `frontend/src/pages/user/ProblemSet.tsx`
- Modify: `frontend/src/components/problems/ProblemTable.tsx`
- Modify: `frontend/src/components/problems/ProblemFilters.tsx`
- Test: create `frontend/src/pages/user/__tests__/ProblemSet.test.tsx`

- [ ] **Step 1: Write the failing page test**

Cover:
- page fetches live problems through `problemsService`
- static curated array is gone
- list UI still matches aligned `stitch` table composition

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd frontend && npm test -- --run src/pages/user/__tests__/ProblemSet.test.tsx
```

Expected:
- FAIL because current page still renders static data

- [ ] **Step 3: Write minimal implementation**

Use `problemsService.getProblems()` and align filters/table around real data.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd frontend && npm test -- --run src/pages/user/__tests__/ProblemSet.test.tsx
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/user/ProblemSet.tsx frontend/src/components/problems/ProblemTable.tsx frontend/src/components/problems/ProblemFilters.tsx frontend/src/pages/user/__tests__/ProblemSet.test.tsx
git commit -m "feat: connect problem set to live problem data"
```

### Task 6: Make Settings Behavior Honest

**Files:**
- Modify: `frontend/src/pages/user/Settings.tsx`
- Test: create `frontend/src/pages/user/__tests__/Settings.truthfulness.test.tsx`

- [ ] **Step 1: Write the failing settings truthfulness test**

Cover:
- account update still uses backend mutation
- preferences and notifications are either explicitly local-only or removed as fake backend actions
- success messages match actual persistence scope

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd frontend && npm test -- --run src/pages/user/__tests__/Settings.truthfulness.test.tsx
```

Expected:
- FAIL because current settings page reports fake successful persistence

- [ ] **Step 3: Write minimal implementation**

Make local-only sections explicit and stop pretending backend persistence exists.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd frontend && npm test -- --run src/pages/user/__tests__/Settings.truthfulness.test.tsx
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/user/Settings.tsx frontend/src/pages/user/__tests__/Settings.truthfulness.test.tsx
git commit -m "fix: make settings persistence honest"
```

### Task 7: Align User And Community Route Families

**Files:**
- Modify: `frontend/src/pages/user/DashboardEnhanced.tsx`
- Modify: `frontend/src/pages/user/ProblemDetail.tsx`
- Modify: `frontend/src/pages/user/ProblemIDEEnhanced.tsx`
- Modify: `frontend/src/pages/user/SubmissionHistory.tsx`
- Modify: `frontend/src/pages/user/SubmissionDetail.tsx`
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
- Reuse or extend existing tests in `frontend/src/pages/user/__tests__` and `frontend/src/pages/community/__tests__`

- [ ] **Step 1: Write or update failing tests for each changed route family**
- [ ] **Step 2: Run the focused suites to verify failure**
- [ ] **Step 3: Write minimal implementations per page group, reusing shared primitives**
- [ ] **Step 4: Re-run focused suites to verify pass**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/user frontend/src/pages/community frontend/src/pages/contest frontend/src/pages/user/__tests__ frontend/src/pages/community/__tests__
git commit -m "feat: align user and community route families"
```

### Task 8: Align Teacher Route Family

**Files:**
- Modify: `frontend/src/pages/teacher/ClassManagement.tsx`
- Modify: `frontend/src/pages/teacher/AssignmentReport.tsx`
- Modify: `frontend/src/pages/teacher/ContestWizard.tsx`
- Reuse: `frontend/src/pages/teacher/__tests__/ClassManagement.test.tsx`
- Reuse: `frontend/src/pages/teacher/__tests__/AssignmentReport.test.tsx`
- Reuse: `frontend/src/pages/teacher/__tests__/ContestWizard.test.tsx`

- [ ] **Step 1: Write failing tests for any structure or truthfulness changes**
- [ ] **Step 2: Run the teacher suite to verify failure**
- [ ] **Step 3: Write minimal implementations aligned to the shared system**
- [ ] **Step 4: Re-run the teacher suite to verify pass**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/teacher frontend/src/pages/teacher/__tests__
git commit -m "feat: align teacher workspace pages"
```

### Task 9: Align Admin Route Family

**Files:**
- Modify: `frontend/src/pages/admin/AdminDashboard.tsx`
- Modify: `frontend/src/pages/admin/UserManagement.tsx`
- Modify: `frontend/src/pages/admin/ProblemManagement.tsx`
- Modify: `frontend/src/pages/admin/JudgeSettings.tsx`
- Modify: `frontend/src/pages/admin/ProblemContentConfig.tsx`
- Modify: `frontend/src/pages/admin/SimilarityScanConfig.tsx`
- Modify: `frontend/src/pages/admin/PlagiarismReportList.tsx`
- Modify: `frontend/src/pages/admin/PlagiarismReportDetail.tsx`
- Modify: `frontend/src/pages/admin/ReportManagement.tsx`
- Add or extend focused admin tests as needed

- [ ] **Step 1: Write failing tests for the changed admin pages**
- [ ] **Step 2: Run the focused admin suites to verify failure**
- [ ] **Step 3: Write minimal implementations aligned to `stitch` and shared shell**
- [ ] **Step 4: Re-run focused admin suites to verify pass**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin
git commit -m "feat: align admin workspace pages"
```

### Task 10: Final Verification

**Files:**
- Review all touched frontend files

- [ ] **Step 1: Run all focused route and service suites**
- [ ] **Step 2: Run typecheck**

```bash
cd frontend && npm run typecheck
```

- [ ] **Step 3: Run build**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Run a final shell and route smoke pass**
- [ ] **Step 5: Commit**

```bash
git add frontend docs/superpowers/specs/2026-03-24-frontend-full-alignment-design.md docs/superpowers/plans/2026-03-24-frontend-full-alignment.md
git commit -m "chore: complete frontend full alignment"
```
