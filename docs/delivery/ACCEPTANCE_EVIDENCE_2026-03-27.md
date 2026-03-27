# Acceptance Evidence Inventory - 2026-03-27

## Status Legend

- `verified`: already green in the repo state
- `partially verified`: some proof exists, but the acceptance surface is not fully closed
- `missing`: no usable proof recorded yet
- `environment-gated`: depends on services or runtime conditions outside the repo alone

## Green Today

| Area | Status | What is already green |
|---|---|---|
| Focused frontend suites | verified | `npm test -- --run ...` passed for auth/service suites, teacher/admin alignment suites, and `src/components/ui/__tests__/primitives.test.tsx` in the current repo state |
| Frontend typecheck | verified | `cd frontend && npm run typecheck` is green |
| Frontend build | verified | `cd frontend && npm run build` is green |
| Backend cargo test | verified | `cd api && cargo test` is green |
| Python unittest alignment checks | verified | `python3 -m unittest scripts.tests.test_check_alignment scripts.tests.test_apply_runtime_migrations` is green |

## Acceptance Matrix Inventory

| Surface | Status | What is proved today | What is still missing |
|---|---|---|---|
| Auth | partially verified | `src/services/__tests__/auth.current-user-alignment.test.ts`, `src/services/__tests__/auth.refresh-alignment.test.ts`, `src/services/__tests__/auth.payloads.test.ts`, and `src/components/auth/__tests__/ProtectedRoute.test.tsx` have passed | explicit final acceptance proof for `/login` redirects and session truthfulness |
| User | partially verified | `src/pages/user/__tests__/ProblemSet.test.tsx`, `src/services/__tests__/problems.query-alignment.test.ts`, and existing submission/problem alignment tests are present in the repo | one consolidated acceptance proof for `/problems`, `/problems/:id`, `/problems/:id/solve`, `/submissions`, and `/submissions/:id` |
| Settings | missing | no dedicated acceptance-proof test artifact is recorded yet | explicit proof that displayed persistence scope matches storage reality |
| Contest scoreboard | partially verified | `src/pages/contest/__tests__/ContestScoreboard.alignment.test.tsx` exists in the repo | final acceptance proof for `/contests/:contestId/scoreboard` with real score behavior and smoke coverage |
| Teacher | partially verified | `src/pages/teacher/__tests__/AssignmentReport.alignment.test.tsx`, `ClassManagement.alignment.test.tsx`, and `ContestWizard.alignment.test.tsx` have passed | final proof for explicit unsupported-action messaging across `/teacher/classes`, `/teacher/assignment-report`, and `/teacher/contest-wizard` |
| Admin | partially verified | `src/pages/admin/__tests__/JudgeSettings.alignment.test.tsx`, `ProblemContentConfig.alignment.test.tsx`, `ProblemManagement.alignment.test.tsx`, `SimilarityScanConfig.alignment.test.tsx`, and `UserManagement.alignment.test.tsx` have passed | final proof that `/admin/*` surfaces no longer depend on runtime mock fallback or fake success paths |
| Community | partially verified | `src/pages/community/__tests__/DiscussionList.alignment.test.tsx`, `DiscussionDetail.alignment.test.tsx`, `BlogList.alignment.test.tsx`, and `BlogDetail.alignment.test.tsx` exist in the repo | explicit proof for authoring flows and direct messages, including unsupported-boundary messaging |
| Backend runtime | partially verified | `cd api && cargo test` and `python3 -m unittest scripts.tests.test_check_alignment scripts.tests.test_apply_runtime_migrations` have passed | explicit acceptance proof for supplemental migration handling and service-backed runtime assumptions |

## Route Families Already Partially Verified

- Auth: current-user and refresh alignment checks exist.
- User: problem and submission alignment coverage exists for `/problems`, `/problems/:id`, `/problems/:id/solve`, `/submissions`, and `/submissions/:id`.
- Settings: no acceptance-proof artifact is recorded yet; this remains missing.
- Contest scoreboard: `/contests/:contestId/scoreboard` is routed and has an alignment test file in the repo.
- Teacher: class management, assignment report, and contest wizard alignment coverage exists.
- Admin: user management, problem management, and config pages have alignment coverage.
- Community: discussion and blog surfaces have alignment coverage; direct messages are not yet explicitly evidenced.
- Backend runtime: alignment helper and backend test coverage exists.

## Environment-Gated Backend Evidence

| Area | Status | Notes |
|---|---|---|
| PostgreSQL-backed checks | environment-gated | keep separate from true failures until the database service is available |
| Redis-backed checks | environment-gated | keep separate from true failures until the cache service is available |
| Runtime integration paths that require external services | environment-gated | record as gated, not failed, when the repository cannot start those services locally |

## Missing Or Deferred Evidence

| Area | Status | Notes |
|---|---|---|
| Final acceptance smoke for all named route families | missing | not yet consolidated into one closure pass |
| Explicit residual-risk register | missing | needs a short bounded list after the verification sweep |
| Any intentionally excluded route surface | missing | must be named if the closeout does not cover it |
| Backend runtime assumptions tied to external services | partially verified | helper tests exist, but service-backed proof still needs the gated environment |

## Inventory Note

This document is intentionally narrower than the final release evidence set. It records what is already green, what is only partially closed, and what must stay labeled as gated or deferred instead of being treated as a failure.
