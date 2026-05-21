# Phase 9: Judge Concurrency + Fault Tolerance - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Scale the judge system for daily high-volume usage: priority queues for contest submissions, circuit breakers for cascade failure prevention, worker health reporting with queue monitoring API, and DLQ monitoring with manual retry. Workers remain standalone processes; resilience patterns are added within the worker and exposed via admin API.

</domain>

<decisions>
## Implementation Decisions

### Priority Queue Strategy
- **D-01:** Separate Redis streams for contest vs normal submissions. New stream `submissions:contest` created alongside existing `submissions` stream. Workers consume from contest stream first each poll cycle, fall back to normal stream when contest queue is empty.
  - **Why:** True priority — contest submissions never wait behind normal ones. Simple mental model. No priority field parsing overhead.
  - **How to apply:** Modify worker consumer loop to attempt XREADGROUP on `submissions:contest` first (COUNT 1, non-blocking). If empty, XREADGROUP on `submissions` (existing stream). Submission creation in API must route to correct stream based on whether submission belongs to an active contest.

- **D-02:** Stream name follows existing colon convention: `submissions:contest`. Consumer group `judge_workers` used for both streams (same group name, separate group membership).
  - **Why:** Consistent with existing naming (`submissions:dlq`). No new conventions needed.
  - **How to apply:** Worker creates consumer group on both streams at startup (XGROUP CREATE MKSTREAM).

- **D-03:** Drain contest first, then normal — each poll cycle checks contest stream with non-blocking read, then checks normal stream. No BLOCK on either.
  - **Why:** Simple logic, minimal latency for contest submissions. Normal submissions only delayed when contest queue has items.
  - **How to apply:** Consumer loop: try contest XREADGROUP → if Some, process → if None, try normal XREADGROUP → process or idle.

### Circuit Breaker Design
- **D-04:** Per-dependency circuit breakers — separate breakers for Redis operations and API callback (HTTP POST). A Redis failure does not block API callbacks and vice versa.
  - **Why:** Granular recovery. If Redis is down, worker can still report results via API callback. If API is down, worker can still consume from Redis stream.
  - **How to apply:** Two CircuitBreaker instances in worker: `redis_breaker` and `api_breaker`. Each wraps its respective external calls.

- **D-05:** In-memory circuit breaker state — AtomicUsize-based counters, no external state. Resets on worker restart.
  - **Why:** Workers are stateless processes. If they restart, breakers resetting is acceptable — a fresh start is the correct behavior after a restart.
  - **How to apply:** Simple struct with AtomicUsize for failure count, AtomicBool for open state, Instant for last failure time. No Redis dependency for breaker state.

- **D-06:** Circuit breaker thresholds: open after 5 consecutive failures, half-open after 30 seconds, close on success in half-open state.
  - **Why:** Standard values suitable for judge system. 5 failures gives tolerance for transient issues. 30s half-open is fast enough to recover without flooding a struggling dependency.
  - **How to apply:** Hardcoded defaults. Configurable via env vars is a Claude's Discretion enhancement.

- **D-07:** Fail-open with degradation — when a breaker is open, the worker logs a warning and skips the failed dependency operation, then continues processing other submissions where that dependency is not needed.
  - **Why:** Partial availability is better than total stop. If Redis is down, worker can still finish in-progress judgements and report results via API. If API is down, worker can still consume and process submissions (results go to DLQ).
  - **How to apply:** Wrap external calls in breaker guard. On open state, return a stub error that the caller handles gracefully.

### Worker Health + Queue Monitoring
- **D-08:** Workers report health via HTTP POST to API every 10 seconds. Payload: worker_id, active_judgements, total_processed, stream_lag. API stores latest heartbeat per worker in Redis with 30s TTL.
  - **Why:** Decoupled from stream processing. HTTP is familiar, debuggable, and works even if Redis Streams are having issues. 10s interval gives good responsiveness without excessive traffic.
  - **How to apply:** New endpoint POST /api/internal/worker/heartbeat (internal, authenticated via WORKER_SECRET). Worker spawns a background tokio task that POSTs on interval.

- **D-09:** Single monitoring endpoint GET /api/admin/judge/status returns: queue depths (normal + contest stream), active workers list with last heartbeat age, average wait time, circuit breaker states per worker.
  - **Why:** One endpoint, easy to consume from admin dashboard. Matches existing admin endpoint patterns.
  - **How to apply:** New route in admin router. Reads worker heartbeats from Redis, queries XINFO for stream depths, aggregates.

- **D-10:** Average wait time calculated from timestamp delta — track submission timestamp in Redis message metadata, compute (processing_start - submit_time) for each processed submission, report rolling average of last N submissions.
  - **Why:** Accurate measurement based on actual data. Queue depth / throughput estimate would be a rough guess.
  - **How to apply:** Add `submitted_at` field to submission Redis message. Worker records processing start time, computes delta, includes in heartbeat payload.

### DLQ Monitoring + Retry UX
- **D-11:** DLQ API: GET /api/admin/judge/dlq (list items), POST /api/admin/judge/dlq/:id/retry (re-enqueue single item), DELETE /api/admin/judge/dlq/:id (discard permanently). Standard CRUD pattern.
  - **Why:** Matches existing admin endpoint style. Fine-grained control over individual items. No dangerous bulk operations.
  - **How to apply:** New routes in admin router. Read DLQ stream with XRANGE for listing. Re-enqueue by XADD to original stream + XDEL from DLQ. Discard by XDEL from DLQ.

- **D-12:** DLQ data stays in Redis Stream `submissions:dlq` only — no PostgreSQL persistence. Ephemeral but sufficient for operational purposes.
  - **Why:** No schema change needed. DLQ items are transient operational data, not business records. Redis wipe is a known operational risk that's acceptable.
  - **How to apply:** API endpoint reads directly from Redis DLQ stream.

- **D-13:** Retry re-enqueues the original message back to the appropriate stream (contest or normal based on message metadata). Worker picks it up and processes as new.
  - **Why:** Reuses existing flow entirely. No special retry processing path needed. Worker treats retried messages identically to new ones.
  - **How to apply:** Store original stream name in DLQ message metadata. On retry, XADD to original stream and XDEL from DLQ.

- **D-14:** Frontend: add a "Judge Queue" section to the existing admin dashboard. Tabbed view showing queue status, active workers, DLQ items. No new page.
  - **Why:** Cohesive admin experience. Monitoring and DLQ management belong together. Avoids creating another standalone page.
  - **How to apply:** New component within existing admin layout. Tabs: Queue Status | Workers | Dead Letters.

### Claude's Discretion
- Exact circuit breaker struct implementation details
- Heartbeat payload JSON field naming
- Rolling average window size for wait time calculation
- DLQ item pagination approach
- Frontend component organization within admin dashboard
- Whether to make circuit breaker thresholds configurable via env vars

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Judge Worker Code
- `judge-worker/src/main.rs` — Worker entry point, semaphore concurrency, main processing loop, send_result_with_retry
- `judge-worker/src/queue/consumer.rs` — XREADGROUP consumer with COUNT 1
- `judge-worker/src/queue/dlq.rs` — DLQ read/write/delete logic (no API endpoint yet)
- `judge-worker/src/queue/producer.rs` — Redis stream write (XADD)

### API Code
- `api/src/main.rs` — Router registration pattern for admin routes
- `domain-contests/src/service.rs` — Contest submission creation (where stream routing logic would be added)

### Prior Decisions
- `.planning/phases/07-test-coverage-contest-enhancement/07-CONTEXT.md` §D-05 — Worker self-healing via XPENDING/XCLAIM already implemented

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `judge-worker/src/queue/consumer.rs`: Stream consumer — extend to read from multiple streams
- `judge-worker/src/queue/dlq.rs`: DLQ read/write/delete — reuse for API endpoint data access
- `judge-worker/src/main.rs`: Semaphore-based concurrency — already in place, just make count configurable
- API admin routes: Existing pattern for admin-protected endpoints

### Established Patterns
- Redis Streams with consumer groups (XGROUP, XREADGROUP, XACK) — extend, don't replace
- WORKER_SECRET authentication for internal endpoints — reuse for heartbeat endpoint
- Admin route registration in main.rs via domain crate routers

### Integration Points
- API submission creation must route to correct stream (contest vs normal) based on contest context
- Worker consumer loop needs dual-stream polling logic
- New internal heartbeat endpoint POST /api/internal/worker/heartbeat
- New admin endpoints under /api/admin/judge/

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-judge-concurrency-fault-tolerance*
*Context gathered: 2026-04-17*
