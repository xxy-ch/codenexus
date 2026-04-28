---
phase: 2
slug: basic-ci-domain-extraction-core-users-problems
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust built-in (`#[test]` / `#[tokio::test]`) + vitest (frontend) |
| **Config file** | `Cargo.toml` (workspace), `frontend/package.json` |
| **Quick run command** | `cargo build --workspace` |
| **Full suite command** | `cargo test --workspace && cargo clippy --all-targets -- -D warnings && cargo fmt --check --all` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo build --workspace`
- **After every plan wave:** Run `cargo test --workspace`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| T2-01 | 01 | 1 | CICD-01 | — | N/A | build | `cargo build --workspace` | — | ⬜ |
| T2-02 | 01 | 1 | CICD-01/02/03 | — | N/A | ci | CI workflow runs with cache | — | ⬜ |
| T2-03 | 01 | 1 | CICD-01/03 | — | N/A | build | `cd frontend && npm ci && npm run lint && npx vitest --run && npm run build` | — | ⬜ |
| T2-04 | 02 | 2 | ARCH-04 | — | N/A | build | `cargo build -p api-infra` | — | ⬜ |
| T2-05 | 02 | 2 | ARCH-04 | — | N/A | build | `cargo build -p api` | — | ⬜ |
| T2-06 | 02 | 2 | ARCH-04/05 | — | N/A | build | `cargo build --workspace` | — | ⬜ |
| T2-07 | 02 | 2 | ARCH-04/05 | — | N/A | build | `cargo build --workspace` | — | ⬜ |
| T2-08 | 02 | 2 | ARCH-04 | — | N/A | build | `cargo build -p domain-problems` | — | ⬜ |
| T2-09 | 02 | 2 | ARCH-04/05 | — | N/A | build | `cargo build -p domain-users` | — | ⬜ |
| T2-10 | 03 | 3 | All | — | N/A | build | `cargo build --workspace` | — | ⬜ |
| T2-11 | 03 | 3 | All | — | N/A | full | `cargo test --workspace && cargo clippy --all-targets -- -D warnings && cargo fmt --check --all` | — | ⬜ |
| T2-12 | 03 | 3 | CICD-01 | — | N/A | ci | CI workflow reflects final state | — | ⬜ |
| T2-13 | 03 | 3 | ARCH-04/05 | — | N/A | build | `cargo tree -p domain-users && cargo tree -p domain-problems` | — | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `rust-toolchain.toml` — Rust toolchain pinned at workspace root
- [ ] `.github/workflows/ci.yml` — CI workflow file
- [ ] `package-lock.json` — Frontend lock file committed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CI pipeline triggers on push to feature branch | CICD-01 | Requires GitHub remote and push action | Push to a test branch, verify CI workflow appears in Actions tab |
| Domain crate compiles independently | ARCH-04 | Already automated via `cargo build -p` | Automated |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
