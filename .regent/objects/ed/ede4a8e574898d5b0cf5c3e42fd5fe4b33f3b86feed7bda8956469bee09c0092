# Phase 5: Security & Technical Debt Clearance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 05-security-technical-debt-clearance
**Areas discussed:** CORS wildcard strategy, SEC-05 judge-worker scope, Dead code audit depth

---

## CORS Wildcard Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Environment-aware, dev allows wildcard | Keep dev mode `*` for convenience, production must have explicit CORS_ORIGINS. Clean up main.rs for clarity. | Yes |
| Completely remove wildcard | Remove `*` support entirely, even in development. More strict but requires env var for local dev. | No |
| Keep current state | Current implementation already works — production enforces, dev defaults to `*`. No additional work. | No |

**User's choice:** Environment-aware, dev allows wildcard
**Notes:** Current config already implements this correctly. Main work is code clarity and documentation. Add startup log warning when wildcard is active.

---

## SEC-05 Judge-Worker Scope

| Option | Description | Selected |
|--------|-------------|----------|
| API only, defer judge-worker | API side already done (Phase 4). Judge-worker pooling deferred to Phase 9 queue refactor. | Yes |
| Process judge-worker too | Add deadpool connection pooling to judge-worker in this phase. | No |

**User's choice:** API only, defer judge-worker
**Notes:** Judge-worker is standalone process with 1-2 connections. Pooling has minimal benefit. Phase 9 will refactor the queue system anyway.

---

## Dead Code Audit Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Clippy + targeted scan | Trust clippy's zero warnings, delete rbac/ module, scan `#[allow(dead_code)]` annotations. | No |
| Deep manual audit | Audit all crate pub APIs manually, remove unused pub functions/structs/constants across all workspace crates. | Yes |

**User's choice:** Deep manual audit
**Notes:** SEC-04 mentions 26 dead code items. Clippy doesn't flag unused pub items. Manual audit ensures comprehensive coverage.

---

## Claude's Discretion

Areas where no user discussion was needed:
- How to clean up CORS main.rs branch
- Exact dead code audit methodology
- Whether api-infra/rbac should also be removed
- SEC-05 API-side verification approach

## Deferred Ideas

None — discussion stayed within phase scope.
