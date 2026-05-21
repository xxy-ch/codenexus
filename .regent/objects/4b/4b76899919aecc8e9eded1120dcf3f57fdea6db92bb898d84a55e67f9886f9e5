---
phase: 15
milestone: v1.0
status: decided
created: 2026-04-20
---

# Phase 15 Context: Frontend UI Completion

## Scope

Frontend React (TypeScript) application — pages, components, services, tests.

## Codebase State

The frontend is more complete than expected:

- **All routes wired** in App.tsx (public + protected + admin)
- **16 API service modules** connected to real backend endpoints
- **12 UI components** (Button, Card, Dialog, Tabs, etc.) via shadcn + custom
- **No mock data flags** — `ENABLE_MOCK_DATA` not found in any source file
- **Zustand auth store** + TanStack Query for server state
- **Tailwind CSS v4** + shadcn base-ui primitives

### Real TODOs (3 items)

1. `UserManagement.tsx:28` — campus dropdown data source not wired
2. `Settings.tsx:69,74` — user preference persistence not connected
3. Test files have format mismatches (API response types, import paths) — non-blocking

### Confirmed False Positives

- Most "TODO" hits are in HTML placeholder attributes or test files, not production code
- All main pages (Problems, Submissions, Contests, Discussions, Blog, Messages, Search, Profile, Admin) render and call real APIs
- Feature flags (`VITE_ENABLE_DIRECT_MESSAGES`, `VITE_ENABLE_PLAGIARISM`) are wired

## Decisions

### D-15-01: Page Completion Priority — All, Wave-Based

**Order:** Fix remaining TODOs first, then polish existing pages, then evaluate new pages.

- Wave 1: Fix 3 real TODOs (UserManagement campus, Settings persistence, test format fixes)
- Wave 2: UI polish across all pages (skeleton screens, empty states, error boundaries, loading states)
- Wave 3: Evaluate and optionally add missing feature pages (DailyChallenge, Achievements, etc.)

### D-15-02: UI Polish Level — Production-Grade

**Standard:** Skeleton screens, empty states, loading animations, error boundaries, unified icon/color/spacing conventions.

Specific requirements:
- Every page with async data shows skeleton during loading
- Every list page has an empty state illustration/message
- Every error path shows user-friendly error boundary (not white screen)
- Consistent Lucide icon usage across all pages
- Unified spacing/sizing via Tailwind tokens

### D-15-03: Testing Strategy — TDD Full Coverage

**Approach:** Every new or modified component gets a vitest unit test. 80%+ coverage target.

- Use `@testing-library/react` for component rendering
- Use `@testing-library/user-event` for interaction simulation
- Mock API calls via MSW or vi.fn() in service layer
- Fix existing broken test files (import paths, API response types)
- New tests written BEFORE implementation (RED-GREEN-REFACTOR)

### D-15-04: Responsive — PC Only (1280px+)

**Scope:** Guarantee consistent experience at 1280px and above. No mobile breakpoints.

- Sidebar always visible (no collapse needed)
- Tables can use full width
- No hamburger menu or mobile navigation
- Mobile support explicitly deferred to a future phase

## Out of Scope (Deferred)

- Mobile responsive design
- PWA / offline support
- Dark mode toggle (dark: prefixes exist but not a feature)
- Accessibility audit (a11y)
- Performance optimization (code splitting, lazy loading — already implemented)
- Backend changes (Phase 15 is frontend-only)

## Dependencies

- Backend API must be running for E2E testing
- No new backend endpoints needed — all frontend work uses existing APIs
