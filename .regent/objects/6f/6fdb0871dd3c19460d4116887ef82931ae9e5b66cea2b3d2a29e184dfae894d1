---
phase: 09
source: codex-external-review-round2
date: 2026-04-17
---

# Phase 9 Codex Code Review Round 2 Findings

## High

1. **Judge monitor/DLQ endpoints leak cross-tenant data and operations**
   - Files: `api/src/judge_monitor/routes.rs`, `api/src/judge_monitor/service.rs`
   - Issue: Only admin/root role check, no tenant filtering on Redis global streams (submissions*, submissions:dlq).
   - Impact: Tenant A admin can view/retry/delete Tenant B DLQ items, breaking multi-tenant isolation.
   - Fix: Filter by school_id in handlers/service; add tenant field to DLQ entries; validate tenant match on retry/delete.

2. **DLQ retry non-atomic, concurrent duplicate re-delivery**
   - File: `api/src/judge_monitor/service.rs`
   - Issue: XRANGE -> XADD -> XDEL three separate steps, two concurrent retries can both XADD.
   - Impact: Same task judged twice, duplicate results, queue bloat.
   - Fix: Use Lua script or pipeline for atomic read-write-delete with idempotency.

## Medium

1. **Auth semantics wrong: no permission returns 401, should be 403**
   - Files: `api/src/judge_monitor/routes.rs`, `api-infra/src/error.rs`
   - Issue: Logged-in non-admin mapped to Auth (401).
   - Impact: Client/audit misinterprets "not logged in" vs "no permission".
   - Fix: Use Forbidden error variant mapped to 403.

## Low

1. **count parameter can be negative causing 500**
   - File: `api/src/judge_monitor/routes.rs`
   - Issue: Only upper-bound .min(200), no lower-bound check.
   - Impact: Negative value triggers Redis parameter error, returns 500.
   - Fix: Clamp count to 1..=200, invalid values return 400.

## Required Regression Tests

1. Multi-tenant isolation: Tenant A admin cannot view/retry/delete Tenant B DLQ.
2. Concurrent retry idempotency: Same DLQ id retried concurrently enqueues only once.
3. Permission status codes: Logged-in non-admin returns 403; not-logged-in returns 401.
4. Parameter robustness: count=-1/0 should not produce 500.
