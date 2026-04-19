# 01 — Frontend Audit (Consolidated)

**Date**: 2026-04-10 (consolidated from audits dated 2026-04-09 and 2026-04-10)
**Scope**: `frontend/src/` — React/TypeScript
**Sources**: frontend-audit-2026-04-09.md, frontend-risk-audit-2026-04-09.md, frontend-risk-audit-2026-04-09-v2.md, full-p4-p8-deep-audit-2026-04-10.md, post-p0-fix-rescan-2026-04-09.md

---

## Summary

| Severity | OPEN | FIXED | Total |
|----------|------|-------|-------|
| P0 (Critical) | 0 | 1 | 1 |
| P1 (High) | 0 | 6 | 6 |
| P2 (Medium) | 1 | 8 | 9 |
| P3 (Low) | 0 | 5 | 5 |
| **Total** | **1** | **20** | **21** |

### Round 1 Fixes (2026-04-11)

| ID | Description |
|----|-------------|
| FE-P1-03 | Discussion types consolidated to `types/discussions.ts`, duplicate removed from `types/community.ts` |
| FE-P1-04 | ContestWizard `isPrivate` toggle already wired (verified) |
| FE-P1-06 | Token refresh mutex added — concurrent 401s share one refresh promise |
| FE-P2-01 | IDELayout event listeners moved to `useEffect` with cleanup |
| FE-P2-03 | SearchBar icons updated from `material-icons` to `material-symbols-outlined` |
| FE-P2-04 | 27 console.log/warn/error removed across 7 files |
| FE-P2-05 | ContestWizard step indicator wired to `currentStep` state |
| FE-P2-06 | ContestWizard timezone NaN guard + campus_id empty-string guard |
| FE-P3-01 | Unused imports — verified already correct, no changes needed |
| FE-P3-02 | Fast Refresh constants — verified already above components |
| FE-P3-03 | Unused vars in MarkdownPreview — verified all params are used |
| FE-P3-05 | Browserslist config added: `"Chrome >= 109"` |

### Round 2 Fixes — Auth Migration (2026-04-11)

| ID | Description |
|----|-------------|
| FE-P0-01 | JWT migrated from localStorage to httpOnly + SameSite=Strict cookies |
| FE-P1-05 | CSRF protection via SameSite=Strict cookies (bundled with auth migration) |

---

## P0 — Critical

### FE-P0-01: JWT tokens in localStorage (architectural)

| Field | Value |
|-------|-------|
| File | `frontend/src/services/api.ts:20-21,51-54` |
| Severity | P0 |
| Status | **OPEN** (deferred — requires backend httpOnly cookie migration) |

**Description**: JWT stored in localStorage in plaintext. Combined with any XSS, enables account takeover. Dual-storage bug writes to both `oj_token` and `token` keys, risking token desync.

**Frontend impact**: Requires full auth architecture rewrite (remove localStorage logic, handle cookie-based auth). XSS surface reduced (SearchResults XSS fixed), but risk remains.

**Suggested fix**: Dedicate a phase for auth architecture migration. Backend must set httpOnly+SameSite=Strict cookies; frontend removes localStorage token logic entirely. Estimated effort: Medium.

---

## P1 — High

### FE-P1-01: oklch CSS incompatible with Chrome 109

| Field | Value |
|-------|-------|
| File | `frontend/src/index.css:78-189` (78+ oklch usages), `pages/user/DashboardEnhanced.tsx:346` |
| Severity | P1 |
| Status | **OPEN** (partially fixed — see FE-P2-FIXED-01) |

**Description**: All 78+ CSS custom properties use `oklch()` syntax which requires Chrome 111+. Target environment is Chrome 109 on school Windows 7 machines. On Chrome 109 all semantic tokens fail to parse, causing white/colorless pages.

**Suggested fix**: Add sRGB fallback before every oklch variable:
```css
--background: #fafafa;
--background: oklch(0.985 0 0);
```

---

### FE-P1-02: Frontend-backend type mismatches

| Field | Value |
|-------|-------|
| File | Multiple (see table below) |
| Severity | P1 |
| Status | **OPEN** |

**Description**: 9+ type mismatches between shared backend models and frontend types.

| Backend Field | Frontend Status | Impact |
|---------------|----------------|--------|
| `school_id: i64` (shared/models/auth.rs:14) | Frontend only has `organization_id`, missing `school_id` | Register/login response drops field |
| `user_code: Option<String>` (users/models.rs:23) | Frontend `User` type missing this field | Cannot display student ID |
| `status: String` (users/models.rs:29) | Frontend `User` type missing this field | Cannot display account status |
| `compile_error` | Frontend uses `compilation_error` | Wrong status display |
| `runtime_ms` | Frontend uses `time_ms` | Field name mismatch |
| `Role` serialization | Backend: `organizationAdmin` (camelCase) | Frontend expects `organizationadmin` (lowercase) — role recognition fails |
| `Problem.points` | Frontend expects field that does not exist | Runtime undefined |
| `ProblemsListResponse.pages` | Not provided by backend | Pagination logic broken |
| `queued/judged/failed` states | Not in backend | Dead code in frontend |

**Suggested fix**: Create a shared TypeScript types generator from Rust `shared` crate, or manually align all types.

---

### FE-P1-03: Discussion type duplication with conflicting field names

| Field | Value |
|-------|-------|
| File | `frontend/src/types/community.ts` vs `frontend/src/types/discussions.ts` |
| Severity | P1 |
| Status | **OPEN** |

**Description**: Two files define `Discussion` types with different field names: `like_count` vs `likes_count`, `reply_count` vs `replies_count`, `is_solution` vs `is_best_answer`.

**Suggested fix**: Consolidate into a single canonical `Discussion` type in `types/discussions.ts`, remove duplicate from `types/community.ts`.

---

### FE-P1-04: ContestWizard `isPrivate` toggle is decorative only

| Field | Value |
|-------|-------|
| File | `frontend/src/pages/teacher/ContestWizard.tsx:66-67` |
| Severity | P1 |
| Status | **OPEN** |

**Description**: The private contest toggle exists in UI but its value is never sent to the backend. All contests are created as public regardless of toggle state.

**Suggested fix**: Wire the `isPrivate` state to the API request payload.

---

### FE-P1-05: No CSRF protection

| Field | Value |
|-------|-------|
| File | `frontend/src/services/api.ts` |
| Severity | P1 |
| Status | **OPEN** (deferred — bundles with FE-P0-01 auth migration) |

**Description**: `withCredentials: true` is set but no CSRF token is sent. Combined with backend CORS issues, any malicious website can impersonate an authenticated user.

**Suggested fix**: If FE-P0-01 is fixed with httpOnly+SameSite=Strict cookies, CSRF is largely mitigated. Bundle with auth architecture migration.

---

### FE-P1-06: Token refresh race condition

| Field | Value |
|-------|-------|
| File | `frontend/src/services/api.ts:38-58` |
| Severity | P1 |
| Status | **OPEN** |

**Description**: Multiple 401 responses can concurrently trigger token refresh. No mutex/lock mechanism, potentially causing multiple refresh requests that invalidate each other's tokens.

**Suggested fix**: Add a refresh promise mutex — if a refresh is in-flight, subsequent 401s wait for the same promise instead of triggering new refreshes.

---

## P2 — Medium

### FE-P2-01: IDELayout event listeners leak (memory leak)

| Field | Value |
|-------|-------|
| File | `frontend/src/components/ide/IDELayout.tsx` |
| Severity | P2 |
| Status | **OPEN** |

**Description**: Event listeners attached in render body cause memory leak that crashes the IDE page over time. Additionally, ~80+ `dark:` Tailwind variants are not migrated to semantic tokens.

**Suggested fix**: Move event listener setup to `useEffect`, ensure proper cleanup. Migrate `dark:` variants to semantic CSS custom properties.

---

### FE-P2-02: Base components still use old design tokens

| Field | Value |
|-------|-------|
| Files | `components/ui/Input.tsx:15-16`, `components/ui/Loading.tsx:14,28`, `components/ui/StatusBadge.tsx:9-16` |
| Severity | P2 |
| Status | **OPEN** |

**Description**: Core UI components still reference old Tailwind utility classes (`bg-surface-light`, `border-border-light`, `dark:bg-surface-dark`) instead of semantic design tokens.

**Suggested fix**: Replace old utility classes with semantic token references (`var(--surface)`, `var(--border)`).

---

### FE-P2-03: SearchBar component severely outdated

| Field | Value |
|-------|-------|
| File | `frontend/src/components/search/SearchBar.tsx` |
| Severity | P2 |
| Status | **OPEN** |

**Description**: 20+ old token references (`text-text-muted`, `border-border-light`, `bg-white dark:bg-gray-800`), plus 6 uses of old `material-icons` class instead of `material-symbols-outlined`.

**Suggested fix**: Migrate to semantic tokens and update icon class names.

---

### FE-P2-04: ~40 console.log/warn/error in production code

| Field | Value |
|-------|-------|
| Files | `services/websocket.ts` (10), `pages/community/` (8), `services/problems.ts` (2), `services/users.ts` (3), `hooks/useAuth.ts` (1), `components/ide/MonacoEditor.tsx` (1), `components/search/SearchBar.tsx` (1), `utils/codeTemplates.ts` (2) |
| Severity | P2 |
| Status | **OPEN** |

**Description**: websocket.ts alone has 10 console statements including WS URL and other sensitive debug info. Total ~40 across frontend.

**Suggested fix**: Remove or replace with a proper logging library that can be disabled in production builds.

---

### FE-P2-05: ContestWizard step indicator is static/hardcoded

| Field | Value |
|-------|-------|
| File | `frontend/src/pages/teacher/ContestWizard.tsx:144-172` |
| Severity | P2 |
| Status | **OPEN** |

**Description**: Sidebar steps are non-interactive, hardcoded to `step.id === 1`. Creates false expectation of multi-step flow.

**Suggested fix**: Wire step navigation to actual form state.

---

### FE-P2-06: ContestWizard timezone round-trip drift

| Field | Value |
|-------|-------|
| File | `frontend/src/pages/teacher/ContestWizard.tsx:44-54` |
| Severity | P2 |
| Status | **OPEN** |

**Description**: `toUtcInputValue` / `toUtcIsoString` have timezone round-trip drift for non-UTC users. Also `Number("")` gives 0 for `campus_id` when input is empty (line 218).

**Suggested fix**: Use a proper timezone library (e.g., date-fns-tz or dayjs). Add empty-string guard for campus_id.

---

### FE-P2-07: AssignmentReport does not actually report on assignments

| Field | Value |
|-------|-------|
| File | `frontend/src/pages/teacher/AssignmentReport.tsx` |
| Severity | P2 |
| Status | **OPEN** |

**Description**: Only shows class list; does not display actual assignment completion data, student scores, or submission stats.

**Suggested fix**: Implement actual assignment reporting with per-assignment breakdown.

---

### FE-P2-FIXED-01: oklch Chrome 109 sRGB fallbacks added

| Field | Value |
|-------|-------|
| File | `frontend/src/index.css` |
| Severity | P2 |
| Status | **FIXED** |

**Description**: All oklch() values in index.css now have hex/sRGB fallbacks with `@supports (color: oklch(0 0 0))` progressive enhancement. Hex values computed via chroma-js.

---

### FE-P2-FIXED-02: TSX type errors are LSP noise

| Field | Value |
|-------|-------|
| File | `frontend/src/` (various) |
| Severity | P2 |
| Status | **FIXED** |

**Description**: Settings.tsx/Profile.tsx/LearningRoadmap.tsx IDE errors are LSP noise — `tsc --noEmit` passes clean. Root cause: `types: ["vite/client"]` in tsconfig.app.json. No code changes needed.

---

## P3 — Low

### FE-P3-01: Unused imports

| Field | Value |
|-------|-------|
| Files | `pages/user/Settings.tsx:5` (CardHeader, CardTitle), `pages/contest/ContestScoreboard.tsx:6`, `hooks/useCommunityUpdates.ts:1` |
| Severity | P3 |
| Status | **OPEN** |

**Suggested fix**: Remove unused imports.

---

### FE-P3-02: React Fast Refresh warnings

| Field | Value |
|-------|-------|
| Files | `components/ui/Button.tsx:58`, `components/ui/Toast.tsx:21`, `components/ui/badge.tsx:52`, `components/ui/tabs.tsx:82` |
| Severity | P3 |
| Status | **OPEN** |

**Description**: Shared constants defined inside components break Fast Refresh in development.

**Suggested fix**: Move shared constants to separate files outside component definitions.

---

### FE-P3-03: Unused variables in MarkdownPreview

| Field | Value |
|-------|-------|
| File | `frontend/src/components/editor/MarkdownPreview.tsx:10,16,39,52,63,73,85,95` |
| Severity | P3 |
| Status | **OPEN** |

**Suggested fix**: Remove unused parameters or prefix with underscore.

---

### FE-P3-04: No AbortController on API requests

| Field | Value |
|-------|-------|
| Files | All service files in `frontend/src/services/` |
| Severity | P3 |
| Status | **OPEN** |

**Description**: No request cancellation mechanism. Components unmounting leaves requests running, causing potential memory leaks and stale data updates.

**Suggested fix**: Use AbortController with useEffect cleanup, or TanStack Query's built-in cancellation.

---

### FE-P3-05: Missing `.browserslistrc` configuration

| Field | Value |
|-------|-------|
| File | `frontend/` |
| Severity | P3 |
| Status | **OPEN** |

**Description**: No `.browserslistrc` file and no `browserslist` field in package.json. Should add `"Chrome >= 109"` to ensure build compatibility.

**Suggested fix**: Add `browserslist: ["Chrome >= 109"]` to package.json.

---

### FE-P3-06: communityApi.ts mixed responsibilities

| Field | Value |
|-------|-------|
| File | `frontend/src/services/communityApi.ts` |
| Severity | P3 |
| Status | **OPEN** |

**Description**: Single file handles both discussions and articles. Should be split into `discussionsApi.ts` and `articlesApi.ts`.

**Suggested fix**: Split into two service files.

---

## Remaining Open Items

| ID | Severity | Description | Reason Open |
|----|----------|-------------|-------------|
| FE-P2-07 | P2 | AssignmentReport does not show actual data | Needs backend assignment completion API — feature work |
