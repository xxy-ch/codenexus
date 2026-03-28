# Acceptance Closure Alignment Design

## Summary

This spec defines the closeout phase for the current frontend redesign and the matching frontend/backend verification work. The guiding rule is not "finish the UI" or "finish the APIs" independently. The guiding rule is to reach an acceptance-ready state where the product can be demonstrated, tested, and defended with evidence across user, teacher, admin, and community flows.

The work therefore runs on two tracks in parallel:

- frontend alignment, closeout, and optimization
- frontend/backend contract verification, truthfulness cleanup, and gap filling

Both tracks converge into one release-style acceptance closure pass with explicit proof: focused automated suites, type/build gates, route smoke coverage, contract checks, and a short residual-risk register.

## Why A New Spec Exists

The existing frontend specs already define the visual target and broad alignment scope:

- [`docs/superpowers/specs/2026-03-19-full-frontend-redesign-design.md`](/Users/xiexingyu/Documents/项目/Online_Judge/docs/superpowers/specs/2026-03-19-full-frontend-redesign-design.md)
- [`docs/superpowers/specs/2026-03-24-frontend-full-alignment-design.md`](/Users/xiexingyu/Documents/项目/Online_Judge/docs/superpowers/specs/2026-03-24-frontend-full-alignment-design.md)

This document does not replace those specs. It adds the missing closeout perspective:

- what remains to make the redesign acceptance-ready
- what verification evidence is required before claiming completion
- how frontend and backend truthfulness are closed together instead of drifting apart

## Primary Goal

Reach an acceptance-ready repository state in which the redesigned frontend, the backend contract surface it depends on, and the supporting verification scripts all agree on what is real, what is unsupported, and what has been validated.

## Success Criteria

The closeout is complete only when all of the following are true:

- key role-based route families render with the intended aligned product language
- no production-facing page claims persistence or success for actions the backend does not support
- frontend service shapes match backend response shapes for the routes in active use
- auth, refresh, and protected-route flows behave consistently across frontend and backend
- migration and runtime alignment helpers reflect the actual database/runtime expectations
- required focused tests, type checks, builds, and backend test suites pass in the current repository
- remaining ignored or environment-gated checks are explicitly documented as environmental, not silent gaps

## Scope Continuity And Route Inventory

The route-family-wide scope from the March 24 alignment spec still stands. This closeout spec narrows execution priority, not product scope. No currently routed surface should be silently dropped from acceptance closure without an explicit exclusion note in the acceptance checklist.

Closeout inventory:

- auth and access pages: login, register, recovery, unauthorized, error, not-found
- user pages: dashboard, problem set, problem detail, IDE, submission history, submission detail, contest list, contest detail, ranking, profile, settings, roadmap
- contest surface: scoreboard
- community pages: discussion list/detail/create, blog list/detail/create/edit, direct messages
- teacher pages: class management, assignment report, contest wizard
- admin pages: dashboard, user management, problem management, judge settings, problem content config, similarity/plagiarism config, report list/detail/management
- shared shell and page primitives used by the above routes

If any routed surface is intentionally excluded from this closeout, the exclusion must be named in the acceptance evidence with one of these reasons:

- environment-gated
- intentionally deferred
- superseded by an accepted replacement surface

## Non-Goals

- no new product feature expansion outside closeout work
- no second redesign direction separate from `stitch`
- no speculative backend refactor unrelated to active UI/API mismatches
- no broad performance project beyond targeted closeout fixes
- no visual experimentation that weakens the existing `Architectural Scholar` direction

## Execution Principle

The work is organized by acceptance closure, not by stack boundary.

That means each task should answer one of these questions:

- does this remove a user-visible lie?
- does this bring a routed surface into the intended design family?
- does this prove frontend/backend contract correctness?
- does this increase acceptance confidence with executable evidence?

If a change does not help one of those outcomes, it is probably not closeout work.

## Track A: Frontend Alignment, Closeout, And Optimization

### Objective

Finish the redesign as a coherent product family and remove the last visible rough edges that would weaken acceptance confidence during review or demo.

### Required Outcomes

- user, teacher, admin, and community route families follow one shell contract and one product language with role-calibrated density
- shared primitives are used consistently instead of page-local raw control styling
- loading, empty, and error states are visually related and operationally honest
- responsive behavior for narrow widths is stable, especially tables, filters, side rails, and fixed shell offsets
- visual cleanup is targeted toward consistency, not a new thematic rewrite

### UX Closeout Rules

These rules augment the earlier frontend specs and are mandatory for closeout:

- tables must either scroll safely on mobile or collapse to a card/list fallback; they must not overflow the viewport
- async actions and fetching states must show visible feedback; blank waiting states are not acceptable
- shell and content padding must adapt across breakpoints instead of using one desktop spacing value everywhere
- clickable cards and actionable rows must expose clear hover/focus affordances without layout shift
- `stitch` remains authoritative for tone: editorial, precise, premium, operational

### Optimization Boundaries

Optimization in this phase means:

- removing repeated presentational drift
- tightening route-level loading and empty-state behavior
- improving narrow-width stability
- reducing unnecessary duplicated component structures

Optimization in this phase does not mean:

- introducing a new design system
- large component architecture churn without direct closeout value
- pre-optimizing routes or bundles with no measured acceptance impact

## Track B: Frontend/Backend Contract Verification And Gap Fill

### Objective

Make the active frontend honest relative to the backend that actually exists in this repository and close the highest-risk mismatches before final acceptance.

### Contract Areas In Scope

- auth payloads, current-user shape, refresh behavior, and protected-route gating
- admin problem/user/config service contracts
- problem listing/filter/query behavior
- teacher workspace truthfulness and unsupported-path messaging
- notification runtime and migration alignment
- schema/runtime helper scripts that verify the repository's actual assumptions

### Required Outcomes

- frontend service code no longer depends on runtime mock branches for production-facing flows
- active backend responses are normalized consistently in one place where needed
- database/runtime helper scripts agree with the checked-in migrations and service code
- backend auth middleware and surrounding tests reflect the real runtime default behavior
- Rust doctest examples that participate in `cargo test` must not fail the global backend test run

### Gap-Fill Policy

When a frontend/backend mismatch is found, resolution order is:

1. follow explicit user sign-off if one exists for the contested behavior
2. otherwise follow the March 24 frontend full-alignment spec as the accepted product target
3. otherwise align frontend to the checked-in backend behavior if that behavior is intentional and usable
4. otherwise patch the backend if the change is bounded
5. otherwise mark the surface explicitly unsupported for this closeout phase

Pretending unsupported behavior exists is not an allowed fallback.

A backend patch counts as bounded only if it:

- touches the active route or its direct normalization layer
- does not require a new subsystem or product feature
- can be verified by existing or narrowly extended tests in this repository
- does not expand the closeout into a broad schema or API redesign

## Track C: Acceptance Closure Gates

### Objective

Produce a small, defensible evidence set that proves the redesign and contract cleanup are complete enough for acceptance.

### Mandatory Evidence

- focused frontend route/service suites for touched families
- frontend `typecheck`
- frontend production `build`
- backend `cargo test`
- script/unit verification for alignment helpers
- migration/runtime alignment verification for supplemental migrations and notification runtime assumptions
- an acceptance matrix covering representative auth, user, teacher, admin, and community flows

### Residual Risk Handling

Any remaining risk must be placed into one of three categories:

- environment-gated: needs services such as PostgreSQL or Redis to run
- intentionally deferred: documented and explicitly out of closeout scope
- blocked mismatch: unresolved and acceptance-relevant

Only the first two categories are acceptable at closeout. The third means the closeout is not done.

## Route Prioritization

The closeout pass should prioritize routes and contracts that are simultaneously:

- heavily visible in acceptance demos
- already partially aligned and therefore cheap to finish
- likely to hide truthfulness or contract defects

That yields this priority order:

1. auth and protected-route flow
2. teacher workspace
3. admin workspace
4. user problem/query/service surfaces
5. community and remaining editorial pages

## Acceptance Matrix

The final evidence set must include at least these representative surfaces:

| Family | Route/Surface | Minimum truthfulness assertion | Minimum evidence |
|---|---|---|---|
| Auth | login/current user/refresh/protected route | auth state and redirects reflect real backend/session state | automated tests + manual smoke |
| User | problem list/detail/IDE | no static fake data and no fake persistence | automated tests + manual smoke |
| User | settings | persistence messaging matches actual storage scope | automated tests |
| Contest | scoreboard | scoreboard route stays in the aligned dense workspace family and reflects real contest score data behavior | automated tests + manual smoke |
| Teacher | class management/assignment report/contest wizard | unsupported actions are explicit and real data paths remain intact | automated tests + manual smoke |
| Admin | user/problem/config pages | no runtime mock fallback and no fake success paths | automated tests + manual smoke |
| Community | list/detail/create flows | unsupported or incomplete capabilities are explicit, not implied as complete | automated tests where available + manual smoke |
| Backend runtime | auth middleware + notifications + supplemental migrations | runtime assumptions match checked-in code and migrations | automated backend/script checks |

For each acceptance-matrix row, the final evidence doc must say whether the proof came from:

- automated coverage only
- manual smoke only
- both

## Testing Strategy

### Frontend

- prefer focused alignment and truthfulness suites over broad fragile snapshot coverage
- add tests where current coverage does not protect a high-risk route or service behavior
- assert on structural and behavioral truth, not incidental class string noise

### Backend

- keep `cargo test` green, including unit tests and doctest behavior
- environment-gated tests may remain ignored, but the ignore reason must be explicit
- when backend changes alter runtime assumptions, add or adjust tests at the boundary where the assumption lives
- when migration/runtime assumptions are in scope, verify both helper discovery logic and one repository-level alignment assertion against the checked-in migration files

### Scripts

- repository alignment helper tests must run in a dependency-light way where possible
- use `unittest`-compatible entry points if `pytest` is not guaranteed in the local environment

## Deliverables

- updated frontend pages and shared primitives for final alignment and UX closeout
- aligned frontend services and backend boundary fixes for active contracts
- strengthened alignment/migration verification scripts and tests
- one implementation plan that sequences closeout by acceptance value
- final verification notes that summarize what passed, what was environment-gated, and what remains deferred

## Acceptance Decision Rule

This phase is complete when the repository can answer "show me the proof" without hand-waving.

That proof must come from executable checks and a short list of explicit, bounded exceptions. "Most pages look right" or "the backend should support this" is not sufficient.
