---
phase: 1
slug: architecture-foundation-secret-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust built-in (`#[test]` / `#[tokio::test]`) + testcontainers |
| **Config file** | `api/Cargo.toml` (dev-deps), `api-infra/Cargo.toml` (feature-gated) |
| **Quick run command** | `cargo build --workspace` |
| **Full suite command** | `cargo test --workspace` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo build --workspace`
- **After every plan wave:** Run `cargo test --workspace`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|--------|
| T1-01 | 01 | 1 | ARCH-01 | N/A | build | `cargo build -p api-infra` | ⬜ |
| T1-02 | 01 | 1 | ARCH-01 | N/A | build | `cargo build --workspace` | ⬜ |
| T1-03 | 02 | 1 | ARCH-01 | N/A | build | `cargo build -p api-infra` | ⬜ |
| T1-04 | 03 | 2 | ARCH-01 | N/A | build | `cargo build --workspace` | ⬜ |
| T1-05 | 04 | 2 | ARCH-02 | N/A | build+doc | `cargo doc -p api-infra --no-deps` | ⬜ |
| T1-06 | 05 | 3 | SEC-01, SEC-06 | Production rejects missing secrets | unit | `cargo test -p api-infra config` | ⬜ |
| T1-07 | 06 | 3 | ARCH-06 | N/A | integration | `cargo test -p api-infra --features testkit` | ⬜ |
| T1-08 | 07 | 4 | All | N/A | full | `cargo test --workspace` | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api-infra/Cargo.toml` — crate definition with dependencies
- [ ] `api-infra/src/lib.rs` — module structure
- [ ] testcontainers already in `api/Cargo.toml` dev-deps (v0.23)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production server refuses start with missing JWT_SECRET | SEC-01 | Requires env var manipulation at process level | `APP_ENV=production cargo run -p api 2>&1` should show error and exit |
| Development server starts with warning on missing secrets | SEC-06 | Same reason | `APP_ENV=development cargo run -p api 2>&1` should show warning |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
