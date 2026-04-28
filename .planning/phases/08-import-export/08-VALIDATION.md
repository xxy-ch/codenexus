---
phase: 8
slug: import-export
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-16
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust: built-in `#[cfg(test)]` + `tokio::test`; Frontend: Vitest |
| **Config file** | Rust: per-crate Cargo.toml; Frontend: vitest.config.ts (existing) |
| **Quick run command** | `cargo test -p domain-imex --lib` |
| **Full suite command** | `cargo test --workspace` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo test -p domain-imex --lib`
- **After every plan wave:** Run `cargo test --workspace`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | IMEX-01 | T-8-01 | ZIP entries validated for path traversal, size limits | unit | `cargo test -p domain-imex --lib problem_import` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | IMEX-01 | T-8-02 | ZIP bomb rejection (size/count limits) | unit | `cargo test -p domain-imex --lib security` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | IMEX-02 | — | Problem data round-trips through export/import | unit | `cargo test -p domain-imex --lib problem_export` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 1 | IMEX-03 | T-8-03 | CSV injection prevention (strip formula prefixes) | unit | `cargo test -p domain-imex --lib user_import` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 1 | IMEX-04 | — | User CSV export matches import format | unit | `cargo test -p domain-imex --lib user_export` | ❌ W0 | ⬜ pending |
| 08-05-01 | 05 | 2 | IMEX-05 | — | Invalid ZIP/CSV produces structured error responses | unit | `cargo test -p domain-imex --lib validation` | ❌ W0 | ⬜ pending |
| 08-06-01 | 06 | 2 | IMEX-01..05 | — | Frontend upload/preview/confirm flow works E2E | manual | Visual test in browser | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `domain-imex/src/problem_import.rs` — test ZIP parsing (path traversal, bomb, valid archive)
- [ ] `domain-imex/src/user_import.rs` — test CSV parsing (missing headers, injection, valid rows)
- [ ] `domain-imex/src/security.rs` — test security validations
- [ ] `domain-imex/src/problem_export.rs` — test round-trip (export then import)
- [ ] `domain-imex/src/user_export.rs` — test CSV output format

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Frontend upload progress bar and preview display | IMEX-01, IMEX-03 | Visual UI behavior | Upload a ZIP file, verify progress bar shows, preview displays item list |
| Download exported file opens correctly | IMEX-02, IMEX-04 | Browser download behavior | Export a problem ZIP, verify browser downloads and file opens |
| Batch Operations page navigation from sidebar | IMEX-01..05 | Frontend routing | Navigate to /batch-operations via sidebar, verify page renders |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
