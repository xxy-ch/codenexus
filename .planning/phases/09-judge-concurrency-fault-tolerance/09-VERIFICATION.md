---
phase: 09-judge-concurrency-fault-tolerance
verified: 2026-04-17T08:00:00Z
status: gaps_found
score: 5/9 must-haves verified
overrides_applied: 0

gaps:
  - truth: "DLQ retry correctly re-enqueues entries for worker re-processing"
    status: failed
    reason: "DLQ retry reads result_json (a serialized JudgeResult) and writes it as 'data' on the queue stream, but the worker consumer deserializes 'data' as SubmissionMessage. This is a type mismatch that guarantees every retried entry will fail to parse, creating an infinite retry loop (retry -> parse failure -> DLQ -> retry)."
    artifacts:
      - path: "api/src/judge_monitor/service.rs"
        issue: "retry_dlq_entry (line 149-160) reads result_json (JudgeResult) and writes as data field, but worker expects SubmissionMessage in data field"
      - path: "judge-worker/src/queue/dlq.rs"
        issue: "write_to_dlq stores result_json (JudgeResult), not the original SubmissionMessage needed for re-processing"
    missing:
      - "Either store original SubmissionMessage in DLQ (requires worker-side change) or replace retry with re-submit endpoint that creates a new submission via existing API"
  - truth: "Contest submission routing validates user is a contest participant"
    status: failed
    reason: "Service verifies contest is active (time bounds) but does not check that the submitting user is registered for the contest. Any authenticated user who knows a valid contest ID can get their submission routed to the priority queue."
    artifacts:
      - path: "domain-submissions/src/service.rs"
        issue: "Line 429-436: SELECT EXISTS checks only contest time bounds, not contest_participants table"
    missing:
      - "Add contest_participants check to the routing query to verify submitting user is a registered participant"
  - truth: "DLQ entries carry correct source_stream and submitted_at metadata from origin messages"
    status: failed
    reason: "write_to_dlq is called with None, None for source_stream and submitted_at in both DLQ write paths in main.rs. Contest stream submissions will be incorrectly attributed to the normal stream in DLQ metadata."
    artifacts:
      - path: "judge-worker/src/main.rs"
        issue: "Lines 604-609 and 638: write_to_dlq called with None, None instead of origin_stream and submitted_at from the message tuple"
    missing:
      - "Thread origin_stream and submitted_at from consume_priority message tuple through send_result_with_retry_breaker to write_to_dlq"
  - truth: "REQUIREMENTS.md traceability accurately reflects implementation status"
    status: failed
    reason: "JCON-02 (Queue monitoring API) and JCON-04 (Worker health reporting) are marked 'Pending' in REQUIREMENTS.md traceability table despite being fully implemented in Plans 03 and 04."
    artifacts:
      - path: ".planning/REQUIREMENTS.md"
        issue: "Lines 163, 165: JCON-02 and JCON-04 show 'Pending' but have complete implementations"
    missing:
      - "Update REQUIREMENTS.md traceability for JCON-02 and JCON-04 to 'Complete'"

human_verification: []

---

# Phase 9: Judge Concurrency + Fault Tolerance Verification Report

**Phase Goal:** Add priority queue for contest submissions, per-dependency circuit breakers, worker health monitoring, and DLQ management with admin UI.
**Verified:** 2026-04-17T08:00:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Code Review Input

The phase code review (09-REVIEW.md) identified 1 critical issue (CR-01) and 5 warnings (WR-01 through WR-05), plus 3 info items. This verification independently confirms the critical finding and incorporates the review's warnings into the gap analysis.

**Critical (from review):**
- CR-01: DLQ retry type mismatch -- result_json (JudgeResult) written as data, but consumer expects SubmissionMessage

**Warnings (from review, verified here):**
- WR-01: No contest participant validation (CONFIRMED -- gap above)
- WR-02: Race condition in EMA metric update (accepted as monitoring trade-off)
- WR-03: HSET + EXPIRE not atomic (info -- transient on crash)
- WR-04: CircuitBreaker HalfOpen detection relies on stale last_failure_time (info -- misleading monitoring only)
- WR-05: DLQ entries pass None for source_stream/submitted_at (CONFIRMED -- gap above)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Contest stream submissions consumed before normal stream submissions each poll cycle | VERIFIED | `consume_priority` in consumer.rs:97-125 polls contest stream first (non-blocking), falls back to normal (5s block) |
| 2 | Worker concurrency configurable via MAX_CONCURRENT_JUDGES env var | VERIFIED | main.rs:50 reads `env::var("MAX_CONCURRENT_JUDGES")` with default "4" |
| 3 | Circuit breaker opens after 5 consecutive failures, half-opens after 30s, closes on success | VERIFIED | circuit_breaker.rs: CircuitBreaker::new(5,30), failure_threshold=5, half_open_timeout_secs=30; record_failure opens at threshold, allow_request transitions to HalfOpen after elapsed time, record_success resets |
| 4 | Retries use exponential backoff with jitter | VERIFIED | main.rs:650-657: base_delay = 1 << attempt.min(3), jitter from nanosecond timestamp |
| 5 | Submissions with contest_id routed to submissions:contest stream | VERIFIED | domain-submissions/src/service.rs:427-441: contest-active check, routes to "submissions:contest" when active |
| 6 | DLQ entries include source_stream and submitted_at metadata | VERIFIED | judge-worker/src/queue/dlq.rs:12-13 accepts optional params; domain-submissions/src/queue.rs:113-114 adds submitted_at and source_stream to XADD |
| 7 | DLQ retry correctly re-enqueues entries for worker re-processing | FAILED | service.rs:149-160 reads result_json (JudgeResult) but writes as "data" field; worker consumer expects SubmissionMessage in "data" -- type mismatch guarantees parse failure |
| 8 | Contest submission routing validates user is a contest participant | FAILED | service.rs:429-436: only checks contest time bounds, no contest_participants table check |
| 9 | REQUIREMENTS.md traceability accurately reflects implementation status | FAILED | JCON-02 and JCON-04 marked "Pending" but fully implemented |

**Score:** 5/9 truths verified (additional 2 truths confirmed as partially implemented but with data integrity gaps)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `judge-worker/src/circuit_breaker.rs` (195 lines) | CircuitBreaker with AtomicUsize state | VERIFIED | BreakerState enum, CircuitBreaker struct, 5 unit tests, allow_request/record_success/record_failure/state methods |
| `judge-worker/src/queue/consumer.rs` (157 lines) | Dual-stream consume_priority | VERIFIED | consume_priority polls contest stream first (non-blocking), then normal stream (5s block) |
| `judge-worker/src/main.rs` (709 lines) | Configurable concurrency, dual-stream loop, breakers | VERIFIED | MAX_CONCURRENT_JUDGES env var, submissions:contest stream, two CircuitBreaker instances, consume_priority integration |
| `domain-submissions/src/models.rs` (66 lines) | CreateSubmissionRequest with contest_id | VERIFIED | `pub contest_id: Option<i64>` with serde default |
| `domain-submissions/src/queue.rs` (145 lines) | Dynamic stream_name, metadata in XADD | VERIFIED | submitted_at (RFC3339) and source_stream fields in XADD |
| `domain-submissions/src/service.rs` (606 lines) | Contest-active routing logic | VERIFIED | SQL EXISTS check for contest time bounds, stream routing |
| `judge-worker/src/queue/dlq.rs` (66 lines) | DLQ with source_stream and submitted_at | VERIFIED | Optional params with defaults, pipeline XADD |
| `judge-worker/src/heartbeat.rs` (71 lines) | Background heartbeat task | VERIFIED | spawn_heartbeat_task, 10s interval, HeartbeatPayload with breaker states |
| `api/src/worker_heartbeat.rs` (94 lines) | Internal heartbeat endpoint | VERIFIED | POST handler, worker secret validation, Redis HSET + EXPIRE 30s |
| `api/src/judge_monitor/mod.rs` (9 lines) | Module re-exports | VERIFIED | Re-exports routes and judge_monitor_router |
| `api/src/judge_monitor/routes.rs` (171 lines) | Admin routes for status + DLQ | VERIFIED | GET /status, GET /dlq, POST /dlq/{id}/retry, DELETE /dlq/{id} |
| `api/src/judge_monitor/service.rs` (194 lines) | Redis queries for monitoring | VERIFIED | XINFO/XLEN stream depth, SCAN heartbeat discovery, XRANGE DLQ listing, retry with XADD/XDEL |
| `frontend/src/pages/admin/JudgeQueue.tsx` (331 lines) | Tabbed admin component | VERIFIED | Three tabs: Queue Status, Workers, Dead Letters; useQuery with 10s refetch; useMutation for retry/discard |
| `frontend/src/services/admin.ts` (457 lines) | judgeQueueService | VERIFIED | getStatus, getDlqEntries, retryDlqEntry, deleteDlqEntry methods |
| `frontend/src/layouts/AdminLayout.tsx` (73 lines) | Navigation entry | VERIFIED | `{ name: '判题队列', href: '/admin/judge-queue', icon: 'dns' }` |
| `frontend/src/App.tsx` | Route registration | VERIFIED | Lazy import and `<Route path="judge-queue" element={renderLazy(JudgeQueue)} />` |
| `frontend/src/services/problems.ts` | Optional contestId in submitCode | VERIFIED | Accepts contestId param, sends contest_id in POST body |
| `frontend/src/pages/user/ProblemIDEEnhanced.tsx` | contestId from URL params | VERIFIED | `useParams<{ contestId?: string }>()`, passes to submitCode |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| main.rs | circuit_breaker.rs | `circuit_breaker::CircuitBreaker` | WIRED | Two instances: redis_breaker, api_breaker |
| main.rs | consumer.rs | `consumer::consume_priority` | WIRED | Called in consume_and_process |
| main.rs | heartbeat.rs | `spawn_heartbeat_task` | WIRED | Called at line 115 before processing loop |
| heartbeat.rs | API | POST /internal/worker/heartbeat | WIRED | reqwest POST every 10s with X-Worker-Secret |
| api/main.rs | worker_heartbeat.rs | route registration | WIRED | `.route("/internal/worker/heartbeat", post(...))` |
| api/main.rs | judge_monitor/routes.rs | nest /admin/judge | WIRED | `.nest("/admin/judge", judge_monitor::judge_monitor_router())` |
| judge_monitor/routes.rs | judge_monitor/service.rs | JudgeMonitorService | WIRED | get_stream_depth, get_worker_heartbeats, retry_dlq_entry, etc. |
| domain-submissions/routes.rs | service.rs | contest_id passthrough | WIRED | req.contest_id flows through to create_submission |
| domain-submissions/service.rs | queue.rs | queue_submission with stream_name | WIRED | Dynamic routing based on contest active check |
| JudgeQueue.tsx | admin.ts | judgeQueueService | WIRED | All 4 methods called via useQuery/useMutation |
| AdminLayout.tsx | JudgeQueue.tsx | Link /admin/judge-queue | WIRED | Navigation entry + route in App.tsx |
| ProblemIDEEnhanced.tsx | problems.ts | submitCode with contestId | WIRED | useParams extracts contestId, passes to service |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| JudgeQueue.tsx | statusQuery.data | judgeQueueService.getStatus() -> GET /admin/judge/status | FLOWING | Reads Redis XINFO for queue depths, SCAN for heartbeats -- produces real Redis-backed data |
| JudgeQueue.tsx | dlqQuery.data | judgeQueueService.getDlqEntries() -> GET /admin/judge/dlq | FLOWING | Reads Redis XRANGE for DLQ entries -- produces real data when DLQ has items |
| judge_monitor/service.rs | retry_dlq_entry | Reads result_json from DLQ, writes as data to queue | DISCONNECTED | **Type mismatch:** result_json is JudgeResult, but queue expects SubmissionMessage in data field |

### Behavioral Spot-Checks

Step 7b: SKIPPED (no runnable entry points -- requires Redis, PostgreSQL, and running API server)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| JCON-01 | 01, 02, 04 | Priority submission queue -- contest submissions to higher-priority stream | SATISFIED | Backend: consume_priority + contest-active routing; Frontend: contestId in submitCode |
| JCON-02 | 03, 04 | Queue monitoring API -- queue depth, active judge count, avg wait time | SATISFIED | GET /admin/judge/status returns queues, workers, avg_wait_ms; REQUIREMENTS.md status needs update |
| JCON-03 | 01 | Configurable worker concurrency via env var | SATISFIED | MAX_CONCURRENT_JUDGES env var in main.rs:50 |
| JCON-04 | 03 | Worker health reporting -- periodic status and consumption progress | SATISFIED | heartbeat.rs POSTs every 10s with worker_id, active_judgements, breaker states; REQUIREMENTS.md status needs update |
| FTOL-01 | 01 | Circuit breaker for external dependencies | SATISFIED | CircuitBreaker struct with 5-failure threshold, 30s half-open, close-on-success; two instances for Redis and API |
| FTOL-02 | 01 | Exponential backoff with jitter for retries | SATISFIED | main.rs:650-657: base_delay = 1 << attempt, jitter from nanosecond timestamp |
| FTOL-03 | 02, 03, 04 | DLQ monitoring -- API endpoint listing items; manual retry | BLOCKED | DLQ list/discard endpoints work; retry endpoint has data type mismatch (CR-01) that makes it non-functional |

**Orphaned requirements:** None. All 6 requirement IDs (JCON-01, JCON-02, JCON-03, FTOL-01, FTOL-02, FTOL-03) are claimed across plans. JCON-04 was not listed in any plan's requirements frontmatter but is implemented in Plan 03 and claimed in Plan 03's SUMMARY. FTOL-02 was not explicitly listed but is implemented in Plan 01's retry logic.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| api/src/judge_monitor/service.rs | 149-160 | DLQ retry writes JudgeResult as SubmissionMessage -- type mismatch | BLOCKER | Every retried entry fails to parse on worker, creating infinite retry loop |
| domain-submissions/src/service.rs | 429-436 | No contest participant validation for priority routing | WARNING | Any authenticated user can get priority queue access |
| judge-worker/src/main.rs | 604-609, 638 | write_to_dlq called with None, None for metadata | WARNING | Contest DLQ entries attributed to wrong stream, breaking retry routing |
| .planning/REQUIREMENTS.md | 163, 165 | JCON-02, JCON-04 marked Pending despite being Complete | INFO | Traceability table is stale |

### Gaps Summary

Three code-level gaps block full goal achievement:

1. **CR-01 (Critical): DLQ retry type mismatch.** The retry endpoint reads `result_json` (a serialized `JudgeResult` with fields like status, score, runtime_ms) from the DLQ and writes it as `data` to the queue stream. The worker consumer deserializes the `data` field as a `SubmissionMessage` (with fields like problem_id, user_id, source_code, time_limit_ms). These are completely different structs -- every retried entry will fail to parse, creating an infinite retry loop. This is the most critical gap as it makes the DLQ retry feature non-functional.

2. **WR-01 (Warning): Missing contest participant validation.** The contest submission routing verifies the contest is time-active but does not check that the submitting user is a registered participant. Any authenticated user who knows or guesses a valid contest ID gets priority queue access.

3. **WR-05 (Warning): DLQ metadata not threaded through processing loop.** The `write_to_dlq` calls in main.rs pass `None, None` for `source_stream` and `submitted_at`, meaning contest stream submissions written to DLQ will be incorrectly attributed to the normal stream. When retried, they would go to the wrong queue.

Additionally, REQUIREMENTS.md needs JCON-02 and JCON-04 traceability status updated from "Pending" to "Complete".

---

_Verified: 2026-04-17T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
