---
phase: 15-frontend-ui-completion-remaining-pages-polish-and-integratio
created: 2026-04-20
status: active
---

# Phase 15: Validation Strategy

## Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 1.6.1 |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest --run` |
| Full suite command | `cd frontend && npx vitest --run --coverage` |
| Coverage provider | v8 (already configured) |
| Coverage threshold | 80% (already in vitest.config.ts) |

## Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | Wave |
|--------|----------|-----------|-------------------|------|
| D-15-01-W1 | UserManagement campus dropdown uses JWT campus_id | unit | `npx vitest --run src/pages/admin/__tests__/UserManagement.test.tsx` | 1 |
| D-15-01-W1 | Settings preferences persist to localStorage | unit | `npx vitest --run src/pages/user/__tests__/Settings.test.tsx` | 1 |
| D-15-01-W1 | Existing test skipped assertions fixed | unit | `npx vitest --run src/pages/user/__tests__/` | 1 |
| D-15-02 | Skeleton screens render during loading | unit | `npx vitest --run` per page test | 2 |
| D-15-02 | EmptyState component renders correctly | unit | `npx vitest --run src/components/ui/__tests__/EmptyState.test.tsx` | 2 |
| D-15-02 | ErrorBoundary catches render errors | unit | `npx vitest --run src/components/error/__tests__/ErrorBoundary.test.tsx` | 2 |
| D-15-03 | 80%+ coverage threshold met | coverage | `npx vitest --coverage` | 3 (gate) |

## Sampling Rate

- **Per task commit:** `cd frontend && npx vitest --run`
- **Per wave merge:** `cd frontend && npx vitest --run --coverage`
- **Phase gate:** Full suite green + coverage >= 80%

## Wave 0 Gaps

- [ ] `src/test/test-utils.tsx` -- shared render helper (QueryClient + Router wrapper)
- [ ] `src/components/ui/__tests__/EmptyState.test.tsx` -- EmptyState component test
- [ ] `src/components/error/__tests__/ErrorBoundary.test.tsx` -- ErrorBoundary test
- [ ] `src/pages/admin/__tests__/UserManagement.test.tsx` -- admin campus dropdown test
- [ ] `src/pages/user/__tests__/Settings.test.tsx` -- settings persistence test
- [ ] 34 page test files needed across waves

## Assumptions Log

| # | Claim | Risk if Wrong | Mitigation |
|---|-------|---------------|------------|
| A1 | JWT claims contain `campus_id` usable for grade filtering | Need to check authStore user shape | Plan 03 reads authStore first |
| A2 | No backend preferences API exists yet | Could implement server persistence | localStorage for v1, server later |
| A3 | DailyChallenge/Achievements endpoints may not exist | Wave 3 evaluation could be short | Plan 11 produces evaluation doc |
