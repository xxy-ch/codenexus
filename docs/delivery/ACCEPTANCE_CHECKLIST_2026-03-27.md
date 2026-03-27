# Acceptance Checklist Baseline - 2026-03-27

## Closure Rule

- Acceptance is not complete until the checklist below can be marked from executable proof, not narrative confidence.
- Any unsupported surface must be labeled as `environment-gated` or `intentionally deferred`.
- A blank or implied behavior is not acceptable for production-facing routes.

## Acceptance Matrix

| Surface | Minimum proof required | Current checklist state |
|---|---|---|
| Auth | `/login`, current-user, refresh, and protected-route redirects match real session state; no fake auth success path remains | [ ] pending |
| User | `/problems`, `/problems/:id`, `/problems/:id/solve`, `/submissions`, and `/submissions/:id` use live data and do not fall back to static fixtures | [ ] pending |
| Settings | persistence messaging matches the actual storage scope; local-only preferences are clearly labeled | [ ] pending |
| Contest scoreboard | `/contests/:contestId/scoreboard` renders the scoreboard workspace and reflects real contest score data behavior | [ ] pending |
| Teacher | `/teacher/classes`, `/teacher/assignment-report`, and `/teacher/contest-wizard` surface unsupported actions explicitly and keep real data paths intact | [ ] pending |
| Admin | `/admin/users`, `/admin/problems`, `/admin/judge-settings`, `/admin/problem-content-config`, and `/admin/similarity-scan-config` avoid runtime mock fallbacks and fake success states | [ ] pending |
| Community | `/discussions`, `/discussions/:id`, `/blog`, `/blog/:id`, authoring pages, and direct-message flows state unsupported or incomplete actions explicitly | [ ] pending |
| Backend runtime | auth middleware, notifications, and supplemental migrations match the checked-in runtime assumptions | [ ] pending |

## Route-Family Checklist

- [ ] Auth routes are truthfully wired to session state, refresh behavior, and protected-route gating.
- [ ] User routes `/problems`, `/problems/:id`, `/problems/:id/solve`, `/submissions`, and `/submissions/:id` render live data without static fallback content.
- [ ] Settings routes distinguish persisted account fields from local preferences and do not imply broader storage than exists.
- [ ] Contest scoreboard routes use the live contest score contract and do not regress mobile overflow behavior.
- [ ] Teacher routes keep unsupported write or expansion actions explicit in the UI and docs.
- [ ] Admin routes keep CRUD and config pages honest about supported backend operations.
- [ ] Community routes `/discussions`, `/blog`, authoring surfaces, and direct-message flows make unsupported boundaries explicit instead of suggesting full parity.
- [ ] Backend runtime checks cover auth middleware, notification runtime assumptions, and migration alignment helpers.

## Service Truthfulness Checklist

- [ ] Frontend services normalize backend responses in one place where shapes differ.
- [ ] No production-facing page depends on a mock branch for a live route.
- [ ] No success toast, banner, or empty-state copy claims persistence that the backend does not provide.
- [ ] Unsupported actions fail explicitly or are hidden behind documented gating.

## Backend And Runtime Checklist

- [ ] `cargo test` remains green for the API crate.
- [ ] Doctest participation does not break the backend test run.
- [ ] Alignment helper checks cover the current migrations and runtime assumptions.
- [ ] Environment-gated backend tests are labeled as such and not treated as true failures.

## Environment-Gated Exceptions

- [ ] PostgreSQL-dependent checks are documented separately from pass/fail evidence.
- [ ] Redis-dependent checks are documented separately from pass/fail evidence.
- [ ] Any ignored integration path must say why it is gated and what service is missing.

## Deferred Or Excluded Surfaces

- [ ] If any routed surface is intentionally excluded from acceptance closure, record the surface name and the reason.
- [ ] If a route is superseded by a replacement surface, record the replacement and the closure boundary.
