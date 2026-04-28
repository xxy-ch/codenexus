---
phase: 9
slug: judge-concurrency-fault-tolerance
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-17
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | cargo test (Rust) + vitest (TypeScript) |
| **Config file** | Cargo.toml (per-crate), frontend/vitest.config.ts |
| **Quick run command** | `cargo test -p judge-worker` |
| **Full suite command** | `cargo test --workspace && cd frontend && npx vitest run` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo test -p <modified-crate>` or `cd frontend && npx tsc --noEmit`
- **After every plan wave:** Run `cargo test --workspace`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 09-01-T1 | 01 | 1 | FTOL-01, FTOL-02 | unit (TDD) | `cargo test -p judge-worker -- circuit_breaker` | ⬜ pending |
| 09-01-T2 | 01 | 1 | JCON-01, JCON-03 | build+test | `cargo build -p judge-worker && cargo test -p judge-worker` | ⬜ pending |
| 09-02-T1 | 02 | 1 | JCON-01 | build+test | `cargo build -p domain-submissions && cargo test -p domain-submissions` | ⬜ pending |
| 09-02-T2 | 02 | 1 | FTOL-03 | build+test | `cargo build -p judge-worker && cargo test -p judge-worker -- dlq` | ⬜ pending |
| 09-03-T1 | 03 | 2 | JCON-04 | build | `cargo build -p judge-worker && cargo build -p api` | ⬜ pending |
| 09-03-T2 | 03 | 2 | JCON-02, FTOL-03 | build | `cargo build -p api` | ⬜ pending |
| 09-04-T1 | 04 | 3 | JCON-02, FTOL-03 | typecheck | `cd frontend && npx tsc --noEmit` | ⬜ pending |
| 09-04-T2 | 04 | 3 | JCON-02 | typecheck | `cd frontend && npx tsc --noEmit` | ⬜ pending |
| 09-04-T3 | 04 | 3 | JCON-01 | typecheck | `cd frontend && npx tsc --noEmit` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — no Wave 0 stubs needed.

- [x] `judge-worker/Cargo.toml` — dependencies for circuit breaker, heartbeat already available (tokio, redis, reqwest)
- [x] `domain-submissions/Cargo.toml` — redis, sqlx already available
- [x] `frontend/package.json` — vitest, tanstack/react-query already available

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Contest submission processed before normal during concurrent load | JCON-01 | Requires running worker + Redis with both streams populated | Submit to both streams simultaneously, verify contest result arrives first |
| Circuit breaker opens and recovers after Redis restart | FTOL-01 | Requires actual Redis connection loss | Stop Redis, observe breaker opens; restart Redis, observe recovery |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
