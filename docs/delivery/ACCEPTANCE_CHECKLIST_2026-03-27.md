# Acceptance Checklist Baseline - 2026-03-27

## Closure Rule

- Acceptance is not complete until the checklist below can be marked from executable proof, not narrative confidence.
- Any unsupported surface must be labeled as `environment-gated` or `intentionally deferred`.
- A blank or implied behavior is not acceptable for production-facing routes.

## Acceptance Matrix

| Surface | Minimum proof required | Current checklist state |
|---|---|---|
| Auth | `/login`, current-user, refresh, and protected-route redirects match real session state; no fake auth success path remains | [x] verified by focused auth/service suites |
| User | `/problems`, `/problems/:id`, `/problems/:id/solve`, `/submissions`, and `/submissions/:id` use live data and do not fall back to static fixtures | [x] verified by focused user suites |
| Settings | persistence messaging matches the actual storage scope; local-only preferences are clearly labeled | [x] verified by dedicated truthfulness suite |
| Contest scoreboard | `/contests/:contestId/scoreboard` renders the scoreboard workspace and reflects real contest score data behavior | [x] verified by scoreboard alignment suite |
| Teacher | `/teacher/classes`, `/teacher/assignment-report`, and `/teacher/contest-wizard` surface unsupported actions explicitly and keep real data paths intact | [x] verified by teacher alignment suites |
| Admin | `/admin/users`, `/admin/problems`, `/admin/judge-settings`, `/admin/problem-content-config`, and `/admin/similarity-scan-config` avoid runtime mock fallbacks and fake success states | [x] verified by admin alignment and service suites |
| Community | `/discussions`, `/discussions/:id`, `/blog`, `/blog/:id`, authoring pages, and direct-message flows state unsupported or incomplete actions explicitly | [x] verified by community detail/list/authoring suites |
| Backend runtime | auth middleware, notifications, and supplemental migrations match the checked-in runtime assumptions | [x] verified in non-gated local environment |

## Route-Family Checklist

- [x] Auth routes are truthfully wired to session state, refresh behavior, and protected-route gating.
- [x] User routes `/problems`, `/problems/:id`, `/problems/:id/solve`, `/submissions`, and `/submissions/:id` render live data without static fallback content.
- [x] Settings routes distinguish persisted account fields from local preferences and do not imply broader storage than exists.
- [x] Contest scoreboard routes use the live contest score contract and do not regress mobile overflow behavior.
- [x] Teacher routes keep unsupported write or expansion actions explicit in the UI and docs.
- [x] Admin routes keep CRUD and config pages honest about supported backend operations.
- [x] Community routes `/discussions`, `/blog`, authoring surfaces, and direct-message flows make unsupported boundaries explicit instead of suggesting full parity.
- [x] Backend runtime checks cover auth middleware, notification runtime assumptions, and migration alignment helpers.

## Service Truthfulness Checklist

- [x] Frontend services normalize backend responses in one place where shapes differ.
- [x] No production-facing page depends on a mock branch for a live route.
- [x] No success toast, banner, or empty-state copy claims persistence that the backend does not provide.
- [x] Unsupported actions fail explicitly or are hidden behind documented gating.

## Backend And Runtime Checklist

- [x] `cargo test` remains green for the API crate.
- [x] Doctest participation does not break the backend test run.
- [x] Alignment helper checks cover the current migrations and runtime assumptions.
- [x] Environment-gated backend tests are labeled as such and not treated as true failures.

## Environment-Gated Exceptions

- [x] PostgreSQL-dependent checks are documented separately from pass/fail evidence.
- [x] Redis-dependent checks are documented separately from pass/fail evidence.
- [x] Any ignored integration path must say why it is gated and what service is missing.

## Deferred Or Excluded Surfaces

- [x] If any routed surface is intentionally excluded from acceptance closure, record the surface name and the reason.
- [x] If a route is superseded by a replacement surface, record the replacement and the closure boundary.
