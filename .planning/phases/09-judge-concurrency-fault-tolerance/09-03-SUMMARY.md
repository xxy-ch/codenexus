---
phase: 09-judge-concurrency-fault-tolerance
plan: 03
subsystem: api+judge-worker
tags: [heartbeat, monitoring, dlq-management, admin-api, redis-hash, circuit-breaker-state]

# Dependency graph
requires:
  - phase: 09-judge-concurrency-fault-tolerance
    plan: 01
    provides: CircuitBreaker with state() and failure_count() methods for heartbeat reporting
  - phase: 09-judge-concurrency-fault-tolerance
    plan: 02
    provides: DLQ with source_stream and submitted_at metadata for retry routing
provides:
  - Worker heartbeat background task posting to API every 10 seconds
  - API heartbeat endpoint storing worker health in Redis hash with 30s TTL
  - GET /admin/judge/status returning queue depths, active workers, aggregate metrics
  - GET /admin/judge/dlq listing DLQ entries with pagination
  - POST /admin/judge/dlq/:id/retry re-enqueueing to original stream
  - DELETE /admin/judge/dlq/:id permanent removal
affects: [09-04]

# Tech tracking
tech-stack:
  added: []
patterns: [heartbeat-redis-hash-ttl, scan-for-heartbeat-discovery, ema-wait-time, active-guard-raii]

key-files:
  created:
    - judge-worker/src/heartbeat.rs
    - api/src/worker_heartbeat.rs
    - api/src/judge_monitor/mod.rs
    - api/src/judge_monitor/routes.rs
    - api/src/judge_monitor/service.rs
  modified:
    - judge-worker/src/main.rs
    - api/src/main.rs

key-decisions:
  - "Heartbeat uses Redis hash with 30s TTL for auto-cleanup of stale worker entries"
  - "ActiveGuard RAII struct increments active_count on creation, decrements on drop for accurate tracking"
  - "Exponential moving average (EMA with alpha=0.3) for avg_wait_ms smooths per-submission spikes"
  - "DLQ retry reads result_json field (not data) to match Plan 02 DLQ write format"
  - "XINFO STREAM with XLEN fallback for stream depth queries"

patterns-established:
  - "Heartbeat pattern: background task with shared atomics, HTTP POST, Redis hash with TTL"
  - "Admin monitoring: service struct with static methods, router function, protected by existing auth middleware"
  - "DLQ retry: XRANGE read -> XADD to original stream -> XDEL from DLQ (atomic-ish, single connection)"

requirements-completed: [JCON-02, JCON-04, FTOL-03]

# Metrics
duration: 11min
completed: 2026-04-17
---

# Phase 9 Plan 3: Worker Heartbeat + Judge Monitoring Summary

**Worker heartbeat reporter posting every 10s with circuit breaker states, plus admin judge monitoring API exposing queue depths, active workers, DLQ list/retry/discard operations**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-17T06:24:24Z
- **Completed:** 2026-04-17T06:35:03Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Heartbeat background task sends worker health (active_judgements, total_processed, avg_wait_ms, breaker states) to API every 10 seconds
- API stores heartbeat in Redis hash `worker:heartbeat:{worker_id}` with 30-second TTL for automatic stale-entry cleanup
- Shared atomic counters (active_count, total_processed, avg_wait_ms) tracked via RAII ActiveGuard in the processing loop
- Admin endpoints: GET /status with queue depths and worker details, GET /dlq with pagination, POST /dlq/:id/retry, DELETE /dlq/:id
- DLQ retry reads entry, re-enqueues to original stream (respecting source_stream metadata from Plan 02), then removes from DLQ

## Task Commits

Each task was committed atomically:

1. **Task 1: Worker heartbeat background task + API heartbeat endpoint** - `ea4ce96` (feat)
2. **Task 2: Admin judge monitoring endpoints -- status + DLQ management** - `40a0af1` (feat)

## Files Created/Modified
- `judge-worker/src/heartbeat.rs` - Background heartbeat reporter with HeartbeatPayload struct and spawn_heartbeat_task function
- `judge-worker/src/main.rs` - Added heartbeat module, shared atomic counters, ActiveGuard RAII struct, heartbeat spawn before processing loop
- `api/src/worker_heartbeat.rs` - Heartbeat endpoint handler with worker secret validation and Redis hash storage
- `api/src/judge_monitor/mod.rs` - Module re-exports for routes and service
- `api/src/judge_monitor/routes.rs` - Admin router with status, DLQ list/retry/delete handlers
- `api/src/judge_monitor/service.rs` - JudgeMonitorService with XINFO/XLEN stream depth, SCAN heartbeat discovery, XRANGE/XADD/XDEL DLQ ops
- `api/src/main.rs` - Added worker_heartbeat and judge_monitor modules, route registrations

## Decisions Made
- Heartbeat uses Redis hash with 30s TTL for auto-cleanup; avoids accumulating stale worker entries without a cleanup task
- ActiveGuard RAII struct ensures active_count is always decremented even if the spawned task panics, giving accurate concurrency metrics
- Exponential moving average (EMA with alpha=0.3, formula `(prev*7 + current*3)/10`) smooths avg_wait_ms to avoid heartbeat jitter from single fast/slow submissions
- DLQ retry reads `result_json` field (matching what write_to_dlq stores from Plan 02) rather than generic `data` field
- SCAN with COUNT 100 (not KEYS) for heartbeat key discovery per T-09-08 mitigation -- production-safe, bounded by active worker count

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing circuit_breaker dead_code warning for failure_count() method in judge-worker (expected -- will be consumed by future monitoring features)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Heartbeat and monitoring infrastructure complete; Plan 04 can build on this for any remaining features
- ActiveGuard pattern is reusable for any future per-task metric tracking
- DLQ retry endpoint correctly routes to source_stream, leveraging Plan 02 metadata

## Self-Check: PASSED

All claimed files exist and all commit hashes verified in git log.

---
*Phase: 09-judge-concurrency-fault-tolerance*
*Completed: 2026-04-17*
