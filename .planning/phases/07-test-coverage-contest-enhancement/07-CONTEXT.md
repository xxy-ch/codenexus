# Phase 7: Test Coverage + Contest Enhancement - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Build comprehensive test coverage across all domain crates and implement three contest enhancements (freeze snapshot, upsolving, submission recovery). Tests use testcontainers for real database integration. Contest features leverage existing domain-contests infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Test Strategy
- **D-01:** Bottom-up execution order: domain crate integration tests → API handler tests → frontend tests → E2E. Ensures foundation stability before higher layers.
  - **Why:** Lower layers have fewer dependencies and failures are easier to diagnose. E2E tests depend on backend being solid.
  - **How to apply:** Plan wave structure mirrors this order — Wave 1 for domain integration tests, later waves for API/frontend/E2E.

- **D-02:** Domain crate integration tests use testcontainers (PostgreSQL + Redis) for real database testing, not mocks.
  - **Why:** Tests validate actual SQL queries, schema interactions, and Redis operations. Mocks would only test mock behavior.
  - **How to apply:** Use `testcontainers` crate in Rust dev-dependencies. Each domain crate gets its own integration test module with container setup.

### Contest Freeze (CONT-01)
- **D-03:** Snapshot-style freeze — during freeze window, leaderboard returns a cached snapshot of rankings up to the freeze cutoff time. After contest ends, auto-unfreeze reveals final rankings.
  - **Why:** Standard ACM contest behavior. Existing code has `is_frozen` flag and `submissions_cutoff` calculation but lacks snapshot storage/retrieval.
  - **How to apply:** Extend domain-contests to store a frozen leaderboard snapshot when freeze activates. `is_frozen` check returns snapshot; when unfrozen, compute live rankings.

### Upsolving (CONT-02)
- **D-04:** Upsolving auto-enables when contest ends. Post-contest submissions tagged `is_upsolving=true`, excluded from official standings. Users submit through the same contest page.
  - **Why:** Minimal UX change — users continue using the contest interface after end. No teacher action required.
  - **How to apply:** Add `is_upsolving` column to submissions or contest_submissions. Submission creation checks if contest has ended; if so, sets flag. Leaderboard queries exclude upsolving submissions from official rankings.

### Submission Recovery (CONT-03)
- **D-05:** Worker self-healing — on startup, judge-worker scans Redis Stream XPENDING, XCLAIMs timed-out messages, and retries them. No API endpoint involvement.
  - **Why:** Simplest recovery model. Worker already knows how to process submissions. No new API surface area.
  - **How to apply:** Add startup routine in `judge-worker/src/main.rs` that calls XPENDING on the submission stream, claims messages older than a threshold (e.g., 5 minutes), and processes them.

### Claude's Discretion
- Exact test file organization within each domain crate
- Which specific domain crate tests to prioritize (all 8 crates vs subset)
- Frontend test scope (which hooks/components to cover)
- Playwright E2E test scenarios selection
- Frozen leaderboard snapshot storage format (Redis cache vs DB table)
- XPENDING timeout threshold value

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Test Infrastructure
- `api-infra/src/testkit/fixtures.rs` — Shared test fixtures
- `api-infra/src/config.rs` — Example of `#[cfg(test)] mod tests` pattern
- `api/src/middleware/auth.rs` — Example of tower::ServiceExt::oneshot handler tests
- `frontend/src/pages/teacher/__tests__/ClassManagement.test.tsx` — Example Vitest test
- `frontend/e2e/smoke.spec.ts` — Existing Playwright smoke test

### Contest Code
- `domain-contests/src/service.rs` — Existing freeze logic (lines 282-291), is_frozen, submissions_cutoff
- `domain-contests/src/models.rs` — Contest structs with freeze_minutes field
- `domain-submissions/src/service.rs` — Submission creation logic
- `judge-worker/src/main.rs` — Worker startup, Redis stream consumer setup

### CI
- `.github/workflows/ci.yml` — CI pipeline (test stage runs cargo test --workspace)

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api-infra/src/testkit/fixtures.rs`: Test fixture helpers — extend for testcontainers setup
- `tower::ServiceExt::oneshot`: Already used in middleware tests — reuse pattern for API handler tests
- `sqlx::test` attribute: Available in workspace — provides per-test database setup
- Frontend Vitest config: Already configured in `frontend/vitest.config.ts`
- Playwright config: Already in `frontend/playwright.config.ts`

### Established Patterns
- `#[cfg(test)] mod tests` inline in each Rust file — continue this pattern for unit tests
- Integration tests in separate `tests/` directory — use for testcontainers-based tests
- Domain crate structure: `src/models.rs`, `src/routes.rs`, `src/service.rs` — test service layer directly

### Integration Points
- Domain crates need `dev-dependencies` for testcontainers, sqlx::test
- judge-worker Redis stream consumer (XPENDING/XCLAIM) — check `judge-worker/src/queue/` for consumer implementation
- domain-contests service — freeze and upsolving logic extends existing query patterns

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-test-coverage-contest-enhancement*
*Context gathered: 2026-04-15*
