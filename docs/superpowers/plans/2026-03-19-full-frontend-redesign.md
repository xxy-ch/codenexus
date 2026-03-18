# Full Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite all routed frontend pages into one flat, modern, cold gray-blue design system while preserving current real behaviors and Chrome 96+ compatibility.

**Architecture:** Introduce a shared visual foundation first: tokens, shell, and presentational primitives. Prove the new system on low-risk auth/error/search pages before converging the main and admin shells, then migrate page families in groups so routes, real data flows, and tests remain stable throughout the rewrite.

**Tech Stack:** React, React Router, TanStack Query, Tailwind CSS, Vitest, Testing Library, Vite

---

### Task 1: Stabilize Design Tokens And Shared Primitives

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/ui/Button.tsx`
- Modify: `frontend/src/components/ui/Input.tsx`
- Modify: `frontend/src/components/ui/Card.tsx`
- Modify: `frontend/src/components/ui/Loading.tsx`
- Modify: `frontend/src/components/ui/StatusBadge.tsx`
- Test: `frontend/src/components/ui/__tests__/primitives.test.tsx`

- [ ] **Step 1: Update or add failing primitive tests for the new flat visual and API expectations**
- [ ] **Step 2: Run `cd frontend && npm test -- --run src/components/ui/__tests__/primitives.test.tsx` and confirm failure where behavior changed**
- [ ] **Step 3: Introduce cold gray-blue tokens, shared surface styles, focus styles, and presentational-only primitive APIs**
- [ ] **Step 4: Re-run `cd frontend && npm test -- --run src/components/ui/__tests__/primitives.test.tsx` and confirm pass**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/index.css frontend/src/components/ui/Button.tsx frontend/src/components/ui/Input.tsx frontend/src/components/ui/Card.tsx frontend/src/components/ui/Loading.tsx frontend/src/components/ui/StatusBadge.tsx frontend/src/components/ui/__tests__/primitives.test.tsx
git commit -m "feat: add flat design system primitives"
```

### Task 2: Add Shared Page-Level Composition Components

**Files:**
- Create: `frontend/src/components/page/PageHeader.tsx`
- Create: `frontend/src/components/page/SurfaceCard.tsx`
- Create: `frontend/src/components/page/StatCard.tsx`
- Create: `frontend/src/components/page/FilterBar.tsx`
- Create: `frontend/src/components/page/SectionBlock.tsx`
- Create: `frontend/src/components/page/EmptyState.tsx`
- Create: `frontend/src/components/page/ActionBar.tsx`
- Create: `frontend/src/components/page/FieldGroup.tsx`
- Test: `frontend/src/components/page/__tests__/page-primitives.test.tsx`

- [ ] **Step 1: Write failing tests that prove the page-level primitives render accessible structure without owning route logic**
- [ ] **Step 2: Run `cd frontend && npm test -- --run src/components/page/__tests__/page-primitives.test.tsx` and confirm failure**
- [ ] **Step 3: Implement the new presentational page primitives**
- [ ] **Step 4: Run `cd frontend && npm test -- --run src/components/page/__tests__/page-primitives.test.tsx` and confirm pass**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/page frontend/src/components/page/__tests__/page-primitives.test.tsx
git commit -m "feat: add shared page composition components"
```

### Task 3: Rewrite Auth, Error, And Search Pages On The New System

**Files:**
- Modify: `frontend/src/pages/auth/LoginPage.tsx`
- Modify: `frontend/src/pages/auth/RegisterPage.tsx`
- Modify: `frontend/src/pages/auth/UnauthorizedPage.tsx`
- Modify: `frontend/src/pages/error/NotFound.tsx`
- Modify: `frontend/src/pages/error/ServerError.tsx`
- Modify: `frontend/src/pages/search/SearchResults.tsx`
- Test: existing focused tests if present, otherwise add `frontend/src/pages/auth/__tests__/auth-shell.test.tsx`

- [ ] **Step 1: Add failing tests for any changed auth/error/search structure that needs regression protection**
- [ ] **Step 2: Run the focused auth/error/search test command and confirm failure**
- [ ] **Step 3: Rebuild auth, error, and search pages with the new sparse flat templates**
- [ ] **Step 4: Re-run the focused auth/error/search test command and confirm pass**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/auth frontend/src/pages/error frontend/src/pages/search
git commit -m "feat: redesign auth error and search pages"
```

### Task 4: Converge Main And Admin Shells

**Files:**
- Modify: `frontend/src/layouts/MainLayout.tsx`
- Modify: `frontend/src/layouts/AdminLayout.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/components/layout/Header.tsx`
- Modify: `frontend/src/components/layout/MobileNav.tsx`
- Test: `frontend/src/components/layout/__tests__/Sidebar.test.tsx`
- Test: add `frontend/src/layouts/__tests__/shell-layouts.test.tsx`

- [ ] **Step 1: Add failing layout tests for shell convergence, sidebar persistence, and admin navigation integration**
- [ ] **Step 2: Run `cd frontend && npm test -- --run src/components/layout/__tests__/Sidebar.test.tsx src/layouts/__tests__/shell-layouts.test.tsx` and confirm failure**
- [ ] **Step 3: Implement the unified shell language while preserving route structure and sidebar behavior**
- [ ] **Step 4: Re-run `cd frontend && npm test -- --run src/components/layout/__tests__/Sidebar.test.tsx src/layouts/__tests__/shell-layouts.test.tsx` and confirm pass**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/layouts frontend/src/components/layout frontend/src/layouts/__tests__/shell-layouts.test.tsx
git commit -m "feat: unify application shells"
```

### Task 5: Rewrite User List Pages

**Files:**
- Modify: `frontend/src/pages/user/DashboardEnhanced.tsx`
- Modify: `frontend/src/pages/user/ProblemSet.tsx`
- Modify: `frontend/src/pages/user/SubmissionHistory.tsx`
- Modify: `frontend/src/pages/user/ContestList.tsx`
- Modify: `frontend/src/pages/user/Ranking.tsx`
- Modify: `frontend/src/pages/user/LearningRoadmap.tsx`
- Modify: `frontend/src/pages/community/BlogList.tsx`
- Modify: `frontend/src/pages/community/DiscussionList.tsx`
- Reuse/extend tests:
  - `frontend/src/pages/user/__tests__/DashboardEnhanced.test.tsx`
  - `frontend/src/pages/user/__tests__/SubmissionHistory.test.tsx`
  - `frontend/src/pages/user/__tests__/ContestList.test.tsx`

- [ ] **Step 1: Update focused tests where the list-page structure or accessible labels change**
- [ ] **Step 2: Run the focused user-list regression suite and confirm any intentional failures**
- [ ] **Step 3: Rewrite the user list pages onto `PageHeader`, `FilterBar`, `StatCard`, and unified table/list patterns**
- [ ] **Step 4: Re-run the focused user-list regression suite and confirm pass**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/user/DashboardEnhanced.tsx frontend/src/pages/user/ProblemSet.tsx frontend/src/pages/user/SubmissionHistory.tsx frontend/src/pages/user/ContestList.tsx frontend/src/pages/user/Ranking.tsx frontend/src/pages/user/LearningRoadmap.tsx frontend/src/pages/community/BlogList.tsx frontend/src/pages/community/DiscussionList.tsx frontend/src/pages/user/__tests__/DashboardEnhanced.test.tsx frontend/src/pages/user/__tests__/SubmissionHistory.test.tsx frontend/src/pages/user/__tests__/ContestList.test.tsx
git commit -m "feat: redesign user list pages"
```

### Task 6: Rewrite User Detail And Focused Workspace Pages

**Files:**
- Modify: `frontend/src/pages/user/ProblemDetail.tsx`
- Modify: `frontend/src/pages/user/ProblemIDEEnhanced.tsx`
- Modify: `frontend/src/pages/user/SubmissionDetail.tsx`
- Modify: `frontend/src/pages/user/ContestDetail.tsx`
- Modify: `frontend/src/pages/contest/ContestScoreboard.tsx`
- Modify: `frontend/src/pages/user/Profile.tsx`
- Modify: `frontend/src/pages/user/Settings.tsx`
- Modify: `frontend/src/pages/community/BlogDetail.tsx`
- Modify: `frontend/src/pages/community/DiscussionDetail.tsx`
- Reuse tests:
  - `frontend/src/pages/user/__tests__/ProblemIDEEnhanced.test.tsx`
  - `frontend/src/pages/user/__tests__/SubmissionDetail.test.tsx`
  - `frontend/src/pages/user/__tests__/ContestDetail.test.tsx`

- [ ] **Step 1: Update focused detail/workspace tests for the new structure where needed**
- [ ] **Step 2: Run the focused detail/workspace regression suite and confirm failure if expectations changed**
- [ ] **Step 3: Rewrite detail and focused tool pages using the detail and focused-workspace templates**
- [ ] **Step 4: Re-run the focused detail/workspace regression suite and confirm pass**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/user/ProblemDetail.tsx frontend/src/pages/user/ProblemIDEEnhanced.tsx frontend/src/pages/user/SubmissionDetail.tsx frontend/src/pages/user/ContestDetail.tsx frontend/src/pages/contest/ContestScoreboard.tsx frontend/src/pages/user/Profile.tsx frontend/src/pages/user/Settings.tsx frontend/src/pages/community/BlogDetail.tsx frontend/src/pages/community/DiscussionDetail.tsx frontend/src/pages/user/__tests__/ProblemIDEEnhanced.test.tsx frontend/src/pages/user/__tests__/SubmissionDetail.test.tsx frontend/src/pages/user/__tests__/ContestDetail.test.tsx
git commit -m "feat: redesign user detail and workspace pages"
```

### Task 7: Rewrite Community Creation And Messaging Pages

**Files:**
- Modify: `frontend/src/pages/community/CreateArticle.tsx`
- Modify: `frontend/src/pages/community/EditArticle.tsx`
- Modify: `frontend/src/pages/community/CreateDiscussion.tsx`
- Modify: `frontend/src/pages/community/DirectMessages.tsx`

- [ ] **Step 1: Add or update focused tests for community editing or messaging interactions if required**
- [ ] **Step 2: Run the focused community-page tests and confirm failure if expectations changed**
- [ ] **Step 3: Rewrite creation/editor pages on the new form/wizard template and direct messages on the focused workspace template**
- [ ] **Step 4: Re-run the focused community-page tests and confirm pass**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/community/CreateArticle.tsx frontend/src/pages/community/EditArticle.tsx frontend/src/pages/community/CreateDiscussion.tsx frontend/src/pages/community/DirectMessages.tsx
git commit -m "feat: redesign community authoring pages"
```

### Task 8: Rewrite Teacher Pages On The Shared System

**Files:**
- Modify: `frontend/src/pages/teacher/ClassManagement.tsx`
- Modify: `frontend/src/pages/teacher/AssignmentReport.tsx`
- Modify: `frontend/src/pages/teacher/ContestWizard.tsx`
- Reuse tests:
  - `frontend/src/pages/teacher/__tests__/ClassManagement.test.tsx`
  - `frontend/src/pages/teacher/__tests__/AssignmentReport.test.tsx`
  - `frontend/src/pages/teacher/__tests__/ContestWizard.test.tsx`

- [ ] **Step 1: Update focused teacher tests if accessible names or page-level structure needs new assertions**
- [ ] **Step 2: Run `cd frontend && npm test -- --run src/pages/teacher/__tests__/ClassManagement.test.tsx src/pages/teacher/__tests__/AssignmentReport.test.tsx src/pages/teacher/__tests__/ContestWizard.test.tsx` and confirm failure if expectations changed**
- [ ] **Step 3: Rewrite teacher pages onto the new system without regressing live write paths, joins, export, or honest unsupported-path messaging**
- [ ] **Step 4: Re-run `cd frontend && npm test -- --run src/pages/teacher/__tests__/ClassManagement.test.tsx src/pages/teacher/__tests__/AssignmentReport.test.tsx src/pages/teacher/__tests__/ContestWizard.test.tsx` and confirm pass**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/teacher frontend/src/pages/teacher/__tests__
git commit -m "feat: redesign teacher workspace pages"
```

### Task 9: Rewrite Admin Pages On The Shared System

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

- [ ] **Step 1: Add or update focused admin tests around shared table/filter patterns where needed**
- [ ] **Step 2: Run the focused admin regression suite and confirm failure if expectations changed**
- [ ] **Step 3: Rewrite admin pages with the denser shared management template while preserving existing controls**
- [ ] **Step 4: Re-run the focused admin regression suite and confirm pass**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin
git commit -m "feat: redesign admin workspace pages"
```

### Task 10: Final Verification And Consistency Sweep

**Files:**
- Review all touched frontend routes and shared files
- Update any missed tests or minor inconsistencies discovered during the final pass

- [ ] **Step 1: Run the combined focused regression suite for shared shell, user, teacher, and admin flows**
- [ ] **Step 2: Run `cd frontend && npm run typecheck`**
- [ ] **Step 3: Run `cd frontend && npm run build`**
- [ ] **Step 4: Manually review visual consistency across auth, user, community, teacher, and admin page families**
- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "chore: complete frontend redesign sweep"
```
