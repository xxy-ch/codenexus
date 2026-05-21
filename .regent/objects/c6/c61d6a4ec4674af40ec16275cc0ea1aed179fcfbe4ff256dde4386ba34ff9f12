---
phase: 7
slug: test-coverage-contest-enhancement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust: cargo test + testcontainers; Frontend: Vitest 1.0 + Playwright 1.58 |
| **Config file** | frontend/vitest.config.ts, frontend/playwright.config.ts |
| **Quick run command** | `cargo test -p domain-contests` / `npx vitest --run` |
| **Full suite command** | `cargo test --workspace` / `npx vitest --run` + `npx playwright test` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo test -p <changed-crate>` or `npx vitest --run`
- **After every plan wave:** Run `cargo test --workspace && cd frontend && npx vitest --run && npx playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | TEST-01 | — | TestFixture spins up real PG+Redis | integration | `cargo test -p domain-users --test integration` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | TEST-01 | — | All 8 domain crates have integration tests | integration | `cargo test --test integration` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | CONT-01 | — | Freeze snapshot stores and retrieves correctly | integration | `cargo test -p domain-contests --test integration` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | CONT-02 | — | Upsolving submissions tagged and excluded | integration | `cargo test -p domain-contests --test integration` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 3 | CONT-01, CONT-02 | — | Freeze + upsolving integration against real DB | integration | `cargo test -p domain-contests --test integration` | ❌ W0 | ⬜ pending |
| 07-04-01 | 04 | 3 | TEST-02, TEST-03 | T-07-01 | Data in org A never appears in org B queries | integration | `cargo test -p api --test tenant_isolation` | ❌ W0 | ⬜ pending |
| 07-05-01 | 05 | 4 | TEST-04 | — | Frontend hooks and utilities tested | unit | `npx vitest --run src/hooks` | ❌ W0 | ⬜ pending |
| 07-06-01 | 06 | 4 | TEST-05, CONT-01 | — | E2E contest freeze + upsolving flows | e2e | `npx playwright test` | ❌ W0 | ⬜ pending |
| 07-07-01 | 07 | 2 | CONT-03 | — | XPENDING/XCLAIM recovers timed-out submissions | unit + integration | `cargo test -p judge-worker` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `domain-contests/tests/integration.rs` — covers TEST-01, CONT-01, CONT-02
- [ ] `domain-users/tests/integration.rs` — covers TEST-01
- [ ] `domain-problems/tests/integration.rs` — covers TEST-01
- [ ] `domain-submissions/tests/integration.rs` — covers TEST-01
- [ ] `domain-classes/tests/integration.rs` — covers TEST-01
- [ ] `domain-community/tests/integration.rs` — covers TEST-01
- [ ] `domain-leaderboard/tests/integration.rs` — covers TEST-01
- [ ] `domain-search/tests/integration.rs` — covers TEST-01
- [ ] `api/tests/tenant_isolation.rs` — covers TEST-03
- [ ] `frontend/src/hooks/__tests__/useCountdown.test.ts` — covers TEST-04
- [ ] `frontend/src/hooks/__tests__/useAuth.test.ts` — covers TEST-04
- [ ] `frontend/e2e/contest-freeze.spec.ts` — covers CONT-01 E2E
- [ ] Migration: `025_add_is_upsolving_to_contest_submissions.sql` — CONT-02
- [ ] Migration: `026_create_contest_leaderboard_snapshots.sql` — CONT-01
- [ ] Domain crate Cargo.toml updates (8 crates) — add dev-dependencies

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| E2E freeze hides scoreboard in browser | CONT-01 | Requires live backend + frontend + seeded contest data | Create contest with freeze_minutes=5, verify leaderboard shows frozen state during freeze window |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
