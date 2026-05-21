---
phase: 11
slug: feature-gateway-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | cargo test (backend) + vitest (frontend) |
| **Config file** | vitest.config.ts (frontend), none (cargo default) |
| **Quick run command** | `cargo test -p api-infra -- feature_gateway` |
| **Full suite command** | `cargo test --workspace && cd frontend && npx vitest run` |
| **Estimated runtime** | ~30 seconds (backend) + ~15 seconds (frontend) |

---

## Sampling Rate

- **After every task commit:** `cargo test -p api-infra -- feature_gateway` (backend) + `npx vitest run` (frontend if touched)
- **After every plan wave:** `cargo test --workspace && cd frontend && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | FGW-01, FGW-02, FGW-03, FGW-07 | T-11-01 | Emergency-off short-circuits before DB query | unit | `cargo test -p api-infra -- test_feature_gateway` | No -- W0 | pending |
| 11-02-01 | 02 | 2 | FGW-04, FGW-06 | T-11-02 | Middleware returns 404 for disabled features; CRUD enforces scope | unit | `cargo test -p api-infra -- test_feature_gate` | No -- W0 | pending |
| 11-03-01 | 03 | 2 | FGW-01, FGW-03 | — | Frontend service resolves feature state | unit | `npx vitest run featureGateway` | No -- W0 | pending |
| 11-04-01 | 04 | 3 | FGW-05 | — | Admin feature matrix renders | unit | `npx vitest run FeatureManagement` | No -- W0 | pending |
| 11-04-02 | 04 | 3 | FGW-05 | — | Teacher class toggles render with inherited indicators | unit | `npx vitest run ClassFeatureSettings` | No -- W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `backend/api-infra/src/feature_gateway/service.rs` — unit tests for resolution logic
- [ ] `backend/api-infra/src/feature_gateway/middleware.rs` — unit tests for 404 gate behavior
- [ ] `backend/api-infra/src/feature_gateway/routes.rs` — unit tests for CRUD authorization
- [ ] `frontend/src/services/__tests__/featureGateway.test.ts` — unit tests for hooks
- [ ] `frontend/src/pages/admin/__tests__/FeatureManagement.test.tsx` — component tests
- [ ] `frontend/src/pages/teacher/__tests__/ClassFeatureSettings.test.tsx` — component tests
- [ ] Framework install: not needed (cargo test + vitest already configured)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Emergency-off disables all routes without restart | FGW-07 | Requires env var toggle at runtime | Set FEATURE_GATEWAY_ENABLED=false, verify 404 on gated routes, set back to true, verify routes return |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
