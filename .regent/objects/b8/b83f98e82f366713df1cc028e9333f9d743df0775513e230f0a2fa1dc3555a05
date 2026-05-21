---
phase: 04
slug: domain-extraction-complex-submissions-contests-classes-leaderboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | cargo test (Rust) |
| **Config file** | Cargo.toml (workspace root) |
| **Quick run command** | `cargo build --workspace` |
| **Full suite command** | `cargo clippy --all-targets -- -D warnings && cargo fmt --check --all` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo build --workspace`
- **After every plan wave:** Run `cargo clippy --all-targets -- -D warnings && cargo fmt --check --all`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| 04-01-01 | 01 | 1 | ARCH-04 | — | domain-submissions compiles independently | build | `cargo build -p domain-submissions` | pending |
| 04-01-02 | 01 | 1 | ARCH-04 | — | domain-contests compiles independently | build | `cargo build -p domain-contests` | pending |
| 04-01-03 | 01 | 1 | ARCH-04 | — | domain-classes compiles independently | build | `cargo build -p domain-classes` | pending |
| 04-01-04 | 01 | 1 | ARCH-04 | — | domain-leaderboard compiles independently | build | `cargo build -p domain-leaderboard` | pending |
| 04-02-01 | 02 | 2 | SEC-03 | T-04-01 | /global filters by org for non-admin | unit | `cargo test -p api` | pending |
| 04-02-02 | 02 | 2 | SEC-03 | T-04-01 | /problem/:id filters by org for non-admin | unit | `cargo test -p api` | pending |
| 04-03-01 | 03 | 2 | ARCH-05 | — | API assembles all routers from domain crates | build | `cargo build -p api` | pending |
| 04-03-02 | 03 | 2 | ARCH-04 | — | No circular dependencies | check | `cargo check --workspace` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `cargo build --workspace` passes before any changes

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Submission lifecycle end-to-end (submit -> queue -> judge -> callback -> WebSocket) | ARCH-04 | Requires running judge-worker, Redis, PostgreSQL | Manual integration test or Phase 7 E2E |
| Leaderboard tenant isolation at runtime | SEC-03 | Requires multi-tenant data setup | Manual query with different org users |

---

## Validation Sign-Off

- [ ] All tasks have automated verify commands
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
