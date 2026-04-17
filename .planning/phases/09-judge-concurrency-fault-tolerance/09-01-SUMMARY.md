---
phase: 09-judge-concurrency-fault-tolerance
plan: 01
subsystem: judge-worker
tags: [circuit-breaker, redis-streams, concurrency, priority-queue, fault-tolerance]

# Dependency graph
requires:
  - phase: 07-test-coverage-contest-enhancement
    provides: Recovery mechanism (XPENDING/XCLAIM) already in place
provides:
  - CircuitBreaker struct with AtomicUsize state machine (circuit_breaker.rs)
  - Dual-stream priority consumer (consume_priority in consumer.rs)
  - Configurable worker concurrency via MAX_CONCURRENT_JUDGES env var
  - Per-dependency circuit breakers integrated in main processing loop
  - Exponential backoff with jitter in retry delays
affects: [09-02, 09-03, 09-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [circuit-breaker-atomic, dual-stream-priority-consumer, fail-open-degradation]

key-files:
  created:
    - judge-worker/src/circuit_breaker.rs
  modified:
    - judge-worker/src/main.rs
    - judge-worker/src/queue/consumer.rs

key-decisions:
  - "Circuit breaker uses AtomicUsize + AtomicBool for lock-free reads, Mutex only for last_failure_time Instant"
  - "Semaphore created once outside loop and shared via Arc, rather than recreated per consume_and_process call"
  - "Recovery logic extracted into recover_stream helper to avoid duplication for both streams"
  - "send_result_with_retry_breaker checks API breaker before attempting, writes to DLQ if breaker is open"

patterns-established:
  - "Dual-stream priority: contest stream non-blocking first, normal stream blocking fallback"
  - "Per-dependency circuit breakers: separate instances for Redis and API, independent open/close"
  - "Fail-open: when breaker is open, log warning and degrade gracefully rather than hard fail"
  - "Origin stream tracking: messages carry their source stream name for correct ACK routing"

requirements-completed: [JCON-01, JCON-03, FTOL-01, FTOL-02]

# Metrics
duration: 8min
completed: 2026-04-17
---

# Phase 9 Plan 1: Dual-Stream Consumer + Circuit Breaker Summary

**Priority queue dual-stream consumer with contest-first polling, per-dependency AtomicUsize circuit breakers, configurable concurrency, and jitter-based retry in judge-worker**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-17T05:55:27Z
- **Completed:** 2026-04-17T06:03:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Circuit breaker with 5-failure open threshold, 30s half-open timeout, close-on-success semantics (5 unit tests)
- Dual-stream consume_priority function polls contest stream first (non-blocking), falls back to normal stream (5s block)
- Worker concurrency configurable via MAX_CONCURRENT_JUDGES env var (defaults to 4)
- Per-dependency circuit breakers wrap Redis and API calls in the main processing loop
- Consumer group and recovery run on both submissions and submissions:contest streams at startup
- Retry delays use exponential backoff with nanosecond-based jitter

## Task Commits

Each task was committed atomically:

1. **Task 1: Create circuit_breaker.rs with AtomicUsize-based state machine** - `3b5645c` (feat)
2. **Task 2: Dual-stream consumer + configurable concurrency + circuit breaker integration** - `ca461ff` (feat)

## Files Created/Modified
- `judge-worker/src/circuit_breaker.rs` - CircuitBreaker struct with AtomicUsize/AtomicBool state, BreakerState enum, 5 unit tests
- `judge-worker/src/main.rs` - Dual-stream setup, configurable semaphore, circuit breaker integration, jitter retry, recover_stream helper
- `judge-worker/src/queue/consumer.rs` - Added consume_priority function for contest-first dual-stream polling

## Decisions Made
- Circuit breaker uses AtomicUsize + AtomicBool for lock-free reads; Mutex only guards Instant for half-open timeout check
- Semaphore created once in run_processing_loop and shared via Arc, rather than recreated per consume_and_process call (avoids concurrency limit reset each cycle)
- Recovery logic extracted into recover_stream() helper to avoid code duplication for both streams
- send_result_with_retry_breaker proactively checks API breaker before attempting; if open, writes directly to DLQ
- ACK uses origin_stream from message tuple to route acknowledgment to the correct Redis stream

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing recovery tests (testcontainers-based) fail without Docker -- not related to this plan's changes

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Judge worker now has dual-stream consumption and circuit breakers; Plan 02 can add API-side contest stream routing
- Plan 03 can add heartbeat background task and admin monitoring endpoints
- BreakerState::state() and failure_count() methods are ready for heartbeat payload consumption

## Self-Check: PASSED

All claimed files exist and all commit hashes verified in git log.

---
*Phase: 09-judge-concurrency-fault-tolerance*
*Completed: 2026-04-17*
