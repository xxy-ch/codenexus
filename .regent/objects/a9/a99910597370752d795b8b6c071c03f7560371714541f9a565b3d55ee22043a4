---
phase: 09-judge-concurrency-fault-tolerance
plan: 02
subsystem: api
tags: [redis-streams, priority-queue, contest-routing, dlq-metadata, multi-stream]

# Dependency graph
requires:
  - phase: 09-judge-concurrency-fault-tolerance
    plan: 01
    provides: Dual-stream consumer (consume_priority) already reading submissions:contest stream
provides:
  - Contest-aware queue routing in domain-submissions (contest_id -> submissions:contest stream)
  - submitted_at and source_stream metadata on all queue messages
  - DLQ entries with source_stream and submitted_at for correct retry routing
affects: [09-03, 09-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [contest-active-verification-before-routing, dlq-metadata-threading]

key-files:
  created: []
  modified:
    - domain-submissions/src/models.rs
    - domain-submissions/src/queue.rs
    - domain-submissions/src/service.rs
    - domain-submissions/tests/integration.rs
    - judge-worker/src/queue/dlq.rs
    - judge-worker/src/main.rs

key-decisions:
  - "queue_submission uses dynamic stream_name parameter rather than QueueConfig to enable per-call routing"
  - "Contest active status verified via SQL query before routing to priority stream (T-09-03 mitigation)"
  - "DLQ write_to_dlq uses Option<&str> parameters with defaults for backward compatibility during cross-plan intermediate states"
  - "submitted_at captured at queue time (RFC3339) enables wait time calculation in monitoring"

patterns-established:
  - "API-side stream routing: service layer determines target stream, queue layer is agnostic"
  - "Metadata enrichment: submitted_at and source_stream embedded in Redis Stream entry for DLQ traceability"
  - "Optional DLQ params: new fields passed as Option<&str> so callers in other plans compile without intermediate breakage"

requirements-completed: [JCON-01, FTOL-03]

# Metrics
duration: 8min
completed: 2026-04-17
---

# Phase 9 Plan 2: Contest Queue Routing + DLQ Metadata Summary

**Contest submissions routed to priority Redis stream (submissions:contest) with server-side active-contest verification, plus DLQ entries enriched with source_stream and submitted_at for correct retry routing**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-17T06:11:12Z
- **Completed:** 2026-04-17T06:19:54Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- CreateSubmissionRequest now accepts optional contest_id (backward compatible with serde default)
- queue_submission uses dynamic stream_name parameter; service layer routes to submissions:contest when contest is active
- Contest active status verified via SQL query (T-09-03 mitigation -- does not trust client claim blindly)
- Redis Stream XADD includes submitted_at (RFC3339) and source_stream metadata on every queue message
- DLQ write_to_dlq accepts optional source_stream and submitted_at parameters with sensible defaults

## Task Commits

Each task was committed atomically:

1. **Task 1: Add contest_id to submission creation flow with priority stream routing** - `1e3b0ba` (feat)
2. **Task 2: Enhance DLQ entries with source_stream and submitted_at metadata** - `ddcdc52` (feat)

## Files Created/Modified
- `domain-submissions/src/models.rs` - Added optional contest_id field to CreateSubmissionRequest
- `domain-submissions/src/queue.rs` - Dynamic stream_name parameter, submitted_at and source_stream metadata in XADD
- `domain-submissions/src/service.rs` - Contest-active SQL check, stream routing logic, contest_id threading
- `domain-submissions/tests/integration.rs` - Updated test to include contest_id: None
- `judge-worker/src/queue/dlq.rs` - Optional source_stream and submitted_at parameters in write_to_dlq
- `judge-worker/src/main.rs` - Updated 3 callers to pass None, None for new DLQ parameters

## Decisions Made
- queue_submission uses dynamic stream_name parameter rather than QueueConfig to enable per-call routing without global state changes
- Contest active status verified via SQL query (SELECT EXISTS with time bounds) before routing to priority stream, mitigating T-09-03 spoofing threat
- DLQ write_to_dlq uses Option<&str> for new parameters so existing callers compile during cross-plan intermediate states (Plan 01 and Plan 02 modify different files in the same wave)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Integration tests require Docker (testcontainers) which is not running -- pre-existing issue, not related to this plan's changes
- Pre-existing circuit_breaker dead_code warnings in judge-worker from Plan 01 (expected -- BreakerState::state() and failure_count() will be consumed by heartbeat in Plan 03)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- API-side contest routing complete; combined with Plan 01's dual-stream consumer, the full priority queue path is operational
- DLQ metadata (source_stream, submitted_at) is in place for Plan 03/04 monitoring and retry features
- main.rs callers currently pass None, None for DLQ metadata -- Plan 03 or 04 should thread actual stream message fields through to write_to_dlq for full traceability

## Self-Check: PASSED

All claimed files exist and all commit hashes verified in git log.

---
*Phase: 09-judge-concurrency-fault-tolerance*
*Completed: 2026-04-17*
