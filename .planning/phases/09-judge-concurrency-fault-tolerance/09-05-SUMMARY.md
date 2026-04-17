---
phase: 09-judge-concurrency-fault-tolerance
plan: 05
subsystem: api, judge-worker
tags: [dlq, retry, rbac, admin, redis-streams]

# Dependency graph
requires:
  - phase: 09-judge-concurrency-fault-tolerance/01
    provides: DLQ write_to_dlq function, send_result_with_retry_breaker, circuit breakers
  - phase: 09-judge-concurrency-fault-tolerance/02
    provides: Dual-stream priority consumer, contest stream routing
  - phase: 09-judge-concurrency-fault-tolerance/03
    provides: Heartbeat reporting, ActiveGuard, DLQ retry endpoint
provides:
  - DLQ stores original SubmissionMessage for safe retry re-enqueue
  - Admin RBAC on all /admin/judge/* endpoints (403 for non-admin)
  - Origin stream and submitted_at metadata threaded through processing loop
affects: [10-data-migration-final-delivery]

# Tech tracking
tech-stack:
  added: []
  patterns: [DLQ original_message field for type-safe retry, AuthExtractor+ensure_admin RBAC pattern]

key-files:
  created: []
  modified:
    - judge-worker/src/queue/dlq.rs
    - judge-worker/src/main.rs
    - api/src/judge_monitor/service.rs
    - api/src/judge_monitor/routes.rs

key-decisions:
  - "[Phase 09 P05]: DLQ stores both result_json (admin inspection) and original_message (retry re-enqueue) to fix type mismatch"
  - "[Phase 09 P05]: Recovery path passes default origin values since original metadata unavailable (acceptable limitation)"
  - "[Phase 09 P05]: retry_dlq_entry returns descriptive error for old DLQ entries lacking original_message"

patterns-established:
  - "DLQ original_message: serialized SubmissionMessage stored alongside JudgeResult for type-safe retry"
  - "ensure_admin(role) checks for both 'admin' and 'root' roles on admin-only endpoints"

requirements-completed: [FTOL-03]

# Metrics
duration: 5min
completed: 2026-04-17
---

# Phase 09 Plan 05: Gap Closure Summary

**Fixed DLQ retry type mismatch (SubmissionMessage vs JudgeResult), added admin RBAC to all judge monitor endpoints, and threaded origin metadata through processing loop**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-17T12:42:07Z
- **Completed:** 2026-04-17T12:47:10Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- DLQ retry endpoint now re-enqueues SubmissionMessage (not JudgeResult), so the worker can actually parse retried entries
- All four /admin/judge/* endpoints require admin or root role, mitigating T-09-05-01 elevation-of-service threat
- DLQ entries carry origin_stream and submitted_at from the originating stream message for correct retry routing

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix DLQ retry type mismatch and thread origin metadata** - `5616441` (fix)
2. **Task 2: Add admin RBAC to judge monitor endpoints** - `4699c0e` (fix)

## Files Created/Modified
- `judge-worker/src/queue/dlq.rs` - Added original_message parameter to write_to_dlq, stores serialized SubmissionMessage in Redis
- `judge-worker/src/main.rs` - Updated send_result_with_retry_breaker with origin_stream/submitted_at/original_message params; serialize submission before DLQ write
- `api/src/judge_monitor/service.rs` - Fixed retry_dlq_entry to read original_message instead of result_json for the data field
- `api/src/judge_monitor/routes.rs` - Added AuthExtractor + ensure_admin to all four handlers

## Decisions Made
- DLQ stores both result_json (for admin inspection) and original_message (for retry) since the consumer expects SubmissionMessage in the "data" field
- Recovery path passes "submissions" as default origin_stream with empty original_message since recovery lacks the original stream metadata -- this is documented as an acceptable limitation
- retry_dlq_entry returns a descriptive error if original_message is missing or empty, guiding admins to re-submit via the submission API for old entries
- Removed unused `Claims` import from routes.rs since AuthExtractor destructuring provides the type implicitly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Initial compilation showed unused import warning for `shared::models::Claims` in routes.rs; removed the import since AuthExtractor destructuring makes the type implicit

## Next Phase Readiness
- Phase 09 gap closure complete. DLQ retry is functional, admin endpoints are protected, origin metadata is correctly threaded
- Phase 10 (Data Migration + Final Delivery) can proceed

## Self-Check: PASSED

All 5 files verified present. Both task commits (5616441, 4699c0e) verified in git log.

---
*Phase: 09-judge-concurrency-fault-tolerance*
*Completed: 2026-04-17*
