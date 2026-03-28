# Acceptance Evidence Inventory - 2026-03-27

## Status Legend

- `verified`: already green in the repo state
- `partially verified`: some proof exists, but the acceptance surface is not fully closed
- `missing`: no usable proof recorded yet
- `environment-gated`: depends on services or runtime conditions outside the repo alone

## Green Today

| Area | Status | What is already green |
|---|---|---|
| Focused frontend suites | verified | `npm test -- --run ...` passed for auth/service suites, teacher/admin alignment suites, user truthfulness suites, contest/scoreboard alignment suites, community alignment/detail/authoring suites, and `src/components/ui/__tests__/primitives.test.tsx` in the current repo state |
| Final frontend acceptance sweep | verified | one consolidated frontend sweep passed: 29 files, 71 tests, covering auth, services, shared primitives, admin, teacher, user, contest, scoreboard, community, and authoring flows |
| Frontend typecheck | verified | `cd frontend && npm run typecheck` is green |
| Frontend build | verified | `cd frontend && npm run build` is green |
| Backend cargo test | verified | `cd api && cargo test` is green |
| Python unittest alignment checks | verified | `python3 -m unittest scripts.tests.test_check_alignment scripts.tests.test_apply_runtime_migrations` is green |

## Acceptance Matrix Inventory

| Surface | Status | What is proved today | What is still missing |
|---|---|---|---|
| Auth | verified | `src/services/__tests__/auth.current-user-alignment.test.ts`, `src/services/__tests__/auth.refresh-alignment.test.ts`, `src/services/__tests__/auth.payloads.test.ts`, `src/services/__tests__/api.refresh-response.test.ts`, `src/components/auth/__tests__/ProtectedRoute.test.tsx`, and backend auth middleware tests have passed | none in the local non-gated environment |
| User | verified | `src/pages/user/__tests__/ProblemSet.test.tsx`, `src/pages/user/__tests__/DashboardEnhanced.test.tsx`, `src/pages/user/__tests__/auxiliary-shells.alignment.test.tsx`, and the problem/submission alignment suites have passed | none in the local non-gated environment |
| Settings | verified | `src/pages/user/__tests__/Settings.truthfulness.test.tsx` proves that local-only preference and notification messaging matches actual browser storage | none in the local non-gated environment |
| Contest scoreboard | verified | `src/pages/contest/__tests__/ContestScoreboard.alignment.test.tsx`, `src/pages/user/__tests__/ContestList.alignment.test.tsx`, and `src/pages/user/__tests__/ContestDetail.alignment.test.tsx` have passed | none in the local non-gated environment |
| Teacher | verified | `src/pages/teacher/__tests__/AssignmentReport.alignment.test.tsx`, `ClassManagement.alignment.test.tsx`, and `ContestWizard.alignment.test.tsx` have passed | none in the local non-gated environment |
| Admin | verified | `src/pages/admin/__tests__/JudgeSettings.alignment.test.tsx`, `ProblemContentConfig.alignment.test.tsx`, `ProblemManagement.alignment.test.tsx`, `SimilarityScanConfig.alignment.test.tsx`, `UserManagement.alignment.test.tsx`, and admin service contract suites have passed | none in the local non-gated environment |
| Community | verified | `src/pages/community/__tests__/DiscussionList.alignment.test.tsx`, `DiscussionDetail.alignment.test.tsx`, `BlogList.alignment.test.tsx`, `BlogDetail.alignment.test.tsx`, and `community-authoring-pages.test.tsx` have passed, including authoring and direct-message flows | none in the local non-gated environment |
| Backend runtime | verified | `cd api && cargo test`, `cd api && cargo test --doc`, `cd api && cargo test middleware::auth::tests::`, `cd api && cargo test notifications::`, and `python3 -m unittest scripts.tests.test_check_alignment scripts.tests.test_apply_runtime_migrations` have passed | PostgreSQL/Redis-backed integration paths remain environment-gated |

## Route Families Already Partially Verified

- Auth: current-user, refresh, token persistence, and protected-route alignment checks have passed.
- User: problem, settings, dashboard, submission, and auxiliary-shell coverage exists for `/problems`, `/problems/:id`, `/problems/:id/solve`, `/submissions`, and `/submissions/:id`.
- Settings: dedicated truthfulness coverage exists and has passed.
- Contest scoreboard: `/contests/:contestId/scoreboard`, contest list, and contest detail alignment coverage has passed.
- Teacher: class management, assignment report, and contest wizard alignment coverage has passed.
- Admin: user management, problem management, config pages, and admin service contract coverage has passed.
- Community: discussion, blog, authoring, and direct-message coverage has passed.
- Backend runtime: alignment helper and backend test coverage has passed in the local non-gated environment.

## Environment-Gated Backend Evidence

| Area | Status | Notes |
|---|---|---|
| PostgreSQL-backed checks | environment-gated | keep separate from true failures until the database service is available |
| Redis-backed checks | environment-gated | keep separate from true failures until the cache service is available |
| Runtime integration paths that require external services | environment-gated | record as gated, not failed, when the repository cannot start those services locally |

## Missing Or Deferred Evidence

| Area | Status | Notes |
|---|---|---|
| Final acceptance smoke for all named route families | verified | a consolidated frontend acceptance sweep has passed alongside backend and helper verification |
| Explicit residual-risk register | verified | bounded residual risks are listed below |
| Any intentionally excluded route surface | verified | no intentionally excluded routed surface is recorded at this stage |
| Backend runtime assumptions tied to external services | partially verified | helper tests exist, but service-backed proof still needs the gated environment |

## Residual Risk Register

| Risk | Scope | Current status |
|---|---|---|
| PostgreSQL-gated integration paths remain unproven locally | backend auth/db integration and migration-backed paths that require `DATABASE_URL` | environment-gated, not a local failure |
| Redis-gated stream/cache paths remain unproven locally | Redis-backed queue/stream behavior requiring `REDIS_URL` | environment-gated, not a local failure |
| Frontend bundle still emits large-chunk warnings during build | production asset shaping, especially Monaco/editor chunks | build passes; optimization remains desirable but is not a release blocker for correctness |

## Inventory Note

This document is intentionally narrower than the final release evidence set. It records what is already green, what is only partially closed, and what must stay labeled as gated or deferred instead of being treated as a failure.
