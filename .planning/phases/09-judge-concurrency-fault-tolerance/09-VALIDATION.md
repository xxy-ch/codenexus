---
phase: 9
slug: judge-concurrency-fault-tolerance
status: draft
nyquist_compliant: false
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

- **After every task commit:** Run `cargo test -p judge-worker` or `cargo test -p domain-submissions` depending on modified crate
- **After every plan wave:** Run `cargo test --workspace`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | JCON-01 | — | Stream routing based on contest context | unit | `cargo test -p domain-submissions queue_routing` | ⬜ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | JCON-01 | — | Dual-stream consumer polls contest first | unit | `cargo test -p judge-worker dual_stream` | ⬜ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | FTOL-01 | — | Breaker opens after 5 failures, half-open after 30s | unit | `cargo test -p judge-worker circuit_breaker` | ⬜ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | FTOL-02 | — | Retry with exponential backoff + jitter | unit | `cargo test -p judge-worker retry_policy` | ⬜ W0 | ⬜ pending |
| 09-03-01 | 03 | 1 | JCON-04 | — | Worker heartbeat POST every 10s | unit | `cargo test -p judge-worker heartbeat` | ⬜ W0 | ⬜ pending |
| 09-03-02 | 03 | 1 | JCON-02 | T-09-01 | Admin status endpoint requires admin role | integration | `cargo test -p api admin_judge_status` | ⬜ W0 | ⬜ pending |
| 09-04-01 | 04 | 2 | FTOL-03 | T-09-02 | DLQ admin endpoints require admin role | integration | `cargo test -p api admin_dlq` | ⬜ W0 | ⬜ pending |
| 09-04-02 | 04 | 2 | FTOL-03 | — | Retry re-enqueues to original stream | unit | `cargo test -p judge-worker dlq_retry` | ⬜ W0 | ⬜ pending |
| 09-05-01 | 05 | 2 | JCON-02 | — | Frontend Judge Queue tab renders | component | `cd frontend && npx vitest run JudgeQueue` | ⬜ W0 | ⬜ pending |
| 09-05-02 | 05 | 2 | FTOL-03 | — | Frontend DLQ list with retry/discard actions | component | `cd frontend && npx vitest run DeadLetters` | ⬜ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `judge-worker/src/circuit_breaker.rs` — CircuitBreaker struct with tests
- [ ] `judge-worker/src/health.rs` — Heartbeat reporter with tests
- [ ] `domain-submissions/src/queue.rs` — Dual-stream routing with tests
- [ ] Existing infrastructure covers Rust testing (cargo test)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Contest submission processed before normal during concurrent load | JCON-01 | Requires running worker + Redis with both streams populated | Submit to both streams simultaneously, verify contest result arrives first |
| Circuit breaker opens and recovers after Redis restart | FTOL-01 | Requires actual Redis connection loss | Stop Redis, observe breaker opens; restart Redis, observe recovery |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
