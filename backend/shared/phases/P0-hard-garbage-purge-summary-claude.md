# P0 Hard Garbage Purge — Claude Code Lane Summary

## 1. Phase Identity

- Phase: P0
- Owner: Codex
- Parallel lane owner: Claude Code (this summary)
- Branch: master
- Date: 2026-04-08

## 2. Goal

Remove hard garbage and false product surface so the repository exposes only real runtime paths and truthful docs before any deeper security or contract refactor begins.

## 3. Scope

### In Scope (Claude Code lane)

- Frontend route and page inventory
- Dead page removal
- Fake-success UI removal or explicit downgrade
- Frontend smoke stabilization after cleanup

### Out Of Scope

- Backend .bak/.DS_Store deletion (Codex lane)
- Doc truthfulness rewrite (Codex lane)
- Half-connected RBAC/tenant/sandbox module deletion

## 4. Files Changed

### Deleted — Dead Pages (replaced by enhanced/community versions, no live route references them)

- `frontend/src/pages/user/Dashboard.tsx` — replaced by `DashboardEnhanced`
- `frontend/src/pages/user/Blog.tsx` — replaced by `community/BlogList`
- `frontend/src/pages/user/BlogDetail.tsx` — replaced by `community/BlogDetail`
- `frontend/src/pages/user/Discussions.tsx` — replaced by `community/DiscussionList`
- `frontend/src/pages/user/ProblemIDE.tsx` — replaced by `ProblemIDEEnhanced`
- `frontend/src/pages/admin/ReportManagement.tsx` — no route references it

### Deleted — Mock Data Service

- `frontend/src/services/mockSubmissions.ts` — dead mock data, no live page imports it

### Deleted — Backup and Filesystem Junk

- `api/Cargo.toml.bak`
- `api/src/main.rs.bak`
- `api/src/problems/mod.rs.bak`
- `api/src/problems/mod.rs.bak2`
- `api/src/problems/mod.rs.bak3`
- `api/src/problems/mod.rs.bak4`
- `api/src/leaderboard/service.rs.bak`
- `judge-worker/src/processor/service.rs.bak`
- `.DS_Store` (root)
- `api/.DS_Store`
- `api/src/.DS_Store`
- `api/tests/.DS_Store`
- `judge-worker/src/.DS_Store`
- `references/.DS_Store`

### Modified — Fake-Success UI Downgrade

- `frontend/src/pages/user/Settings.tsx`
  - Removed fake "偏好设置更新成功" success toast from `updatePreferencesMutation`
  - Removed fake "通知设置更新成功" success toast from `updateNotificationsMutation`
  - Added `TODO(P1)` comments marking both as pending backend contract
  - Button labels changed to "保存偏好（本地）" and "保存通知设置（本地）"
  - Added inline disclaimer text: "偏好设置目前仅作用于本地，后端持久化将在后续版本落地。"

### Modified — Dead Export Cleanup

- `frontend/src/services/problems.ts`
  - Removed `mockProblems` export (64-line mock data array, zero live consumers after ProblemIDE.tsx deletion)

## 5. Architecture Before / After

### Before

- 6 dead page files existed alongside their replacement pages with no route pointing to them
- `mockSubmissions.ts` contained 385 lines of hardcoded mock data, imported by no live page
- `mockProblems` export in `problems.ts` consumed only by dead `ProblemIDE.tsx`
- `ReportManagement.tsx` existed in admin pages with no route registration
- Settings page reported "偏好设置更新成功" and "通知设置更新成功" to users despite never persisting data
- 8 `.bak` files and 6 `.DS_Store` files polluted the repo

### After

- All dead pages removed; every route in `App.tsx` points to a live, connected page
- No mock data service without a live consumer remains
- Settings page no longer shows false success toasts for local-only preference toggles
- Button labels and inline disclaimers clearly communicate "local-only" status
- No `.bak` or `.DS_Store` files remain in tracked runtime paths

## 6. Contract Changes

- No API contract changes
- No routing changes (dead pages were already not routed)
- `mockProblems` export removed from `problems.ts` — this was an unused export, not a consumed API
- Settings.tsx preference/notification mutations: `onSuccess` toast callbacks removed, mutations still execute but produce no user-facing success message

## 7. Verification Evidence

```bash
# 1. No .bak/.DS_Store in runtime paths
rg --files api judge-worker frontend | rg "\\.bak$|\\.bak[0-9]*$|\\.DS_Store$"
```
Expected: no output
Actual: no output (pass)

```bash
# 2. No dead imports in non-test source
rg -n "ProblemIDE[^E]|mockSubmissions|mockProblems" frontend/src --glob '!*.test.*'
```
Expected: no output
Actual: no output (pass)

```bash
# 3. TypeScript type checking
cd frontend && npm run typecheck
```
Expected: exit 0
Actual: exit 0, no errors (pass)

```bash
# 4. Production build
cd frontend && npm run build
```
Expected: successful build
Actual: ✓ built in 16.91s, all 68 chunks emitted (pass)

## 8. Acceptance Marker Check

- [x] No `.bak` files remain in tracked runtime paths.
- [x] No `.DS_Store` files remain in the repository.
- [x] No user-visible runtime route depends on mock-only data.
- [x] No fake-success frontend action remains exposed as a formal product feature.
- [x] Cleanup finishes with baseline verification back to green.

## 9. Review Checkpoint

- Review checkpoint name: R1 Garbage Purge Review
- Reviewer: Codex
- Result: pending
- Notes: Claude Code lane complete, awaiting Codex lane (backend inventory, doc truthfulness) and final R1 review.

## 10. Remaining Risks

- `admin.ts` still uses `USE_MOCK_DATA` flag with mock fallbacks for admin API calls — this is a development convenience, not a dead page. It is intentionally left in place and should be addressed when admin backend contracts are finalized in P2.
- Settings account tab (`updateAccountMutation`) uses the real `usersService.updateMyProfile()` — this appears to be a live backend call, not fake. Kept as-is.
- Test files in `frontend/src/pages/user/__tests__/` contain local `mockSubmissions` arrays for test fixtures — these are test-local and do not import the deleted service file.

## 11. Handoff

Next phase (P1) can assume:
- No dead frontend pages remain
- Every route in App.tsx maps to a connected page
- Settings page does not lie about persistence
- No `.bak` or `.DS_Store` files exist in the repo

## 12. Blockers Or Follow-Ups

- P1 needs to implement real backend contracts for Settings preferences and notifications to replace the downgraded local-only toggles
- Codex still needs to complete the backend/runtime entry-point inventory and doc truthfulness rewrite portions of P0
