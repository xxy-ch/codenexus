---
phase: 09
source: codex-external-review
date: 2026-04-17
---

# Phase 9 Codex Code Review Findings

## Critical

1. **/admin/judge/* missing admin RBAC protection (RBAC bypass)**
   - File: `api/src/judge_monitor/routes.rs`
   - Impact: Any authenticated user can view/retry/delete DLQ entries — privilege escalation.
   - Fix: Add admin auth check to all judge monitor routes (AuthExtractor + ensure_admin).

## High

1. **DLQ retry re-enqueues wrong data type to submissions stream**
   - Files: `api/src/judge_monitor/service.rs`, `judge-worker/src/queue/*`
   - Impact: Retry message becomes invalid payload, causing "retry ineffective / poison message loop".
   - Fix: Retry should use "result callback re-delivery" semantics, or separately save and restore original SubmissionMessage.

2. **Contest priority queue routing can be abused cross-tenant**
   - File: `domain-submissions/src/service.rs`
   - Impact: Only an active contest_id is needed for priority routing, lacking tenant/participant constraints.
   - Fix: Validate contest belongs to user's tenant AND user is a registered participant before routing.

## Medium

1. **Circuit breaker half-open does not limit to single probe**
   - File: `judge-worker/src/circuit_breaker.rs`
   - Impact: Recovery window may allow concurrent burst requests, weakening circuit breaker protection.
   - Fix: Add single-request probe gate in half-open state.

2. **Frontend contest submission chain may still lose contest_id**
   - Files: `frontend/src/pages/user/ProblemIDEEnhanced.tsx`, `frontend/src/App.tsx`, `frontend/src/pages/user/ContestDetail.tsx`
   - Impact: Many contest submissions still go through normal queue, reducing Phase 9 priority routing effectiveness.
   - Fix: Add contest-aware solve route and navigate from contest page to that route.

3. **Worker/API default WORKER_SECRET mismatch**
   - Files: `judge-worker/src/main.rs`, `api-infra/src/config.rs`
   - Impact: Default dev environment heartbeat auth fails, monitoring shows worker offline.
   - Fix: Unify default value or force explicit configuration.

## Required Regression Tests

1. `/admin/judge/*` non-admin access should return 401/403.
2. DLQ retry semantic test (ensure retried payload is consumable/callback-correct).
3. Contest routing auth test (cross-tenant contest_id cannot get priority).
4. Frontend contest entry submission must carry contest_id.
