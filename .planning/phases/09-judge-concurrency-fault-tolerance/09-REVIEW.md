---
phase: 09-judge-concurrency-fault-tolerance
reviewed: 2026-04-17T07:00:00Z
depth: deep
files_reviewed: 19
files_reviewed_list:
  - judge-worker/src/circuit_breaker.rs
  - judge-worker/src/main.rs
  - judge-worker/src/queue/consumer.rs
  - judge-worker/src/queue/dlq.rs
  - judge-worker/src/heartbeat.rs
  - domain-submissions/src/models.rs
  - domain-submissions/src/queue.rs
  - domain-submissions/src/service.rs
  - domain-submissions/src/routes.rs
  - api/src/worker_heartbeat.rs
  - api/src/judge_monitor/mod.rs
  - api/src/judge_monitor/routes.rs
  - api/src/judge_monitor/service.rs
  - api/src/main.rs
  - frontend/src/pages/admin/JudgeQueue.tsx
  - frontend/src/services/admin.ts
  - frontend/src/layouts/AdminLayout.tsx
  - frontend/src/App.tsx
  - frontend/src/services/problems.ts
  - frontend/src/pages/user/ProblemIDEEnhanced.tsx
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-04-17T07:00:00Z
**Depth:** deep
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Phase 9 introduces judge concurrency and fault tolerance: a circuit breaker pattern, dual-stream priority consumer, worker heartbeat monitoring, admin DLQ management, and frontend admin dashboard. The overall architecture is sound -- the circuit breaker uses lock-free atomics for reads, the dual-stream consumer correctly drains contest stream first, and the heartbeat RAII pattern is elegant.

However, there is one **critical data format mismatch** in the DLQ retry path that will cause every retried entry to fail on the worker side. Additionally, there are several warnings around race conditions in the EMA metric, missing contest participation validation, and atomicity gaps in the heartbeat HSET+EXPIRE sequence.

## Critical Issues

### CR-01: DLQ retry re-enqueues JudgeResult as SubmissionMessage -- data type mismatch causes guaranteed parse failure

**File:** `api/src/judge_monitor/service.rs:149-160`
**Issue:** The DLQ entry stores `result_json`, which is a serialized `JudgeResult` struct (fields: `submission_id`, `status`, `score`, `runtime_ms`, `memory_kb`, `test_case_results`). The retry endpoint reads this `result_json` field and writes it back to the queue stream as `data`. However, the consumer in `judge-worker/src/queue/consumer.rs:41-44` reads the `data` field and deserializes it as a `SubmissionMessage` struct (fields: `submission_id`, `problem_id`, `user_id`, `language`, `source_code`, `time_limit_ms`, `memory_limit_mb`). These are completely different structs. Every retried DLQ entry will fail to parse on the worker, immediately creating an infinite retry loop (retry -> parse failure -> DLQ again -> retry again).

```rust
// api/src/judge_monitor/service.rs:149-160
// "data" is set to result_json (a JudgeResult), but the consumer
// expects "data" to be a SubmissionMessage
let data = fields
    .get("result_json")  // <-- This is a JudgeResult JSON
    .ok_or_else(|| anyhow::anyhow!("Missing result_json in DLQ entry"))?;

// ...
.arg("data")
.arg(data)  // <-- Worker will fail to deserialize this as SubmissionMessage
```

**Fix:** The DLQ retry concept needs fundamental reconsideration. DLQ entries represent **failed judge results** (post-processing), not **pending submissions** (pre-processing). Re-enqueueing a `JudgeResult` back to a submission stream makes no semantic sense. There are two valid approaches:

Option A -- Remove DLQ retry from queue entirely. The DLQ entries are failed results; the admin should manually re-trigger the submission via the existing submission API instead. Replace the retry endpoint with a "re-submit" endpoint that creates a new submission.

Option B -- If retry is needed, the DLQ must store the original `SubmissionMessage` (the input to the judge), not the `JudgeResult` (the output). This requires changes to `write_to_dlq` in the judge-worker to store both the original submission message and the error context, then the retry endpoint would re-enqueue the `SubmissionMessage` as `data`.

## Warnings

### WR-01: Contest_id accepted from client without verifying user is a contest participant

**File:** `domain-submissions/src/service.rs:427-436`
**Issue:** The code correctly verifies that the contest is currently active (time bounds check), but does not verify that the submitting user is actually registered for that contest. Any authenticated user who knows or guesses a valid contest ID can get their submission routed to the priority queue. While this is a priority escalation rather than a security bypass (the submission still judges normally), it undermines the contest-first priority guarantee.

```rust
// domain-submissions/src/service.rs:429-436
let contest_active = sqlx::query_scalar::<_, bool>(
    "SELECT EXISTS(SELECT 1 FROM contests WHERE id = $1 AND start_time <= NOW() AND end_time >= NOW())"
)
.bind(cid)
.fetch_one(&self.pool)
.await
.unwrap_or(false);
// Missing: check that user is actually a participant in contest cid
```

**Fix:**
```rust
let contest_active = sqlx::query_scalar::<_, bool>(
    "SELECT EXISTS(
        SELECT 1 FROM contest_participants
        WHERE contest_id = $1 AND user_id = $2
    ) AND EXISTS(
        SELECT 1 FROM contests
        WHERE id = $1 AND start_time <= NOW() AND end_time >= NOW()
    )"
)
.bind(cid)
.bind(user_id)
.fetch_one(&self.pool)
.await
.unwrap_or(false);
```

### WR-02: Race condition in EMA metric update -- read-modify-write is not atomic

**File:** `judge-worker/src/main.rs:417-419`
**Issue:** The exponential moving average for `avg_wait_ms` performs a non-atomic read-modify-write: it loads the current value, computes a new one, then stores it. With concurrent spawned tasks, two tasks can load the same `prev` value, compute their new averages, and one update will be silently lost. This is a minor data accuracy issue (monitoring metrics, not business logic), but it violates the correctness principle.

```rust
// judge-worker/src/main.rs:417-419
let prev = avg_wait_ms.load(Ordering::Relaxed);      // Task A reads 100
let new_avg = if prev == 0 { elapsed_ms } else { (prev * 7 + elapsed_ms * 3) / 10 };
avg_wait_ms.store(new_avg, Ordering::Relaxed);       // Task B also read 100, overwrites
```

**Fix:** Use `compare_exchange` loop for atomic read-modify-write, or accept the imprecision for monitoring and add a comment documenting the known trade-off. Given this is a best-effort monitoring metric, a documented comment is acceptable:

```rust
// NOTE: Non-atomic EMA update -- concurrent tasks may cause minor
// metric drift. Acceptable for monitoring; not used for business logic.
let prev = avg_wait_ms.load(Ordering::Relaxed);
let new_avg = if prev == 0 { elapsed_ms } else { (prev * 7 + elapsed_ms * 3) / 10 };
avg_wait_ms.store(new_avg, Ordering::Relaxed);
```

### WR-03: Heartbeat HSET + EXPIRE is not atomic -- transient stale data on crash

**File:** `api/src/worker_heartbeat.rs:65-91`
**Issue:** The heartbeat handler performs HSET followed by EXPIRE as two separate Redis commands. If the API process crashes between these two commands, the hash key will persist indefinitely without a TTL, creating phantom worker entries that the SCAN-based discovery will report indefinitely (appearing as workers that are always "active" but never update). Similarly, if the worker sends a heartbeat but the EXPIRE command fails, the key will accumulate.

```rust
// api/src/worker_heartbeat.rs:65-91
// Step 1: HSET
cmd.query_async::<()>(&mut conn).await...;
// Step 2: EXPIRE (separate command, non-atomic)
deadpool_redis::redis::cmd("EXPIRE")
    .arg(&key)
    .arg(30)
    .query_async::<()>(&mut conn)
    .await...;
```

**Fix:** Use a Redis pipeline to batch HSET and EXPIRE into a single round-trip, ensuring they either both execute or neither does:

```rust
let mut pipe = deadpool_redis::redis::pipe();
pipe.cmd("HSET")
    .arg(&key)
    .arg("worker_id").arg(&payload.worker_id)
    // ... other fields ...
    .arg("last_seen").arg(&last_seen);
pipe.cmd("EXPIRE").arg(&key).arg(30);
pipe.query_async::<()>(&mut conn)
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;
```

### WR-04: CircuitBreaker HalfOpen detection relies on transient failure history state

**File:** `judge-worker/src/circuit_breaker.rs:98-112`
**Issue:** The `state()` method determines HalfOpen by checking if `last_failure_time` is `Some` and `failure_count > 0` while `is_open` is false. However, `record_success()` (line 82-84) resets `failure_count` to 0 but does **not** clear `last_failure_time`. This means after a breaker closes following a HalfOpen success, `last_failure_time` remains set. If a new, unrelated failure sequence begins, the breaker could momentarily report `HalfOpen` state (when `is_open` becomes true after threshold, then `allow_request` transitions to `is_open=false`), even though it should report `Open` during the cooldown period. The practical impact is misleading monitoring data in heartbeat payloads.

```rust
// circuit_breaker.rs:81-84 -- resets count but not last_failure_time
pub fn record_success(&self) {
    self.failure_count.store(0, Ordering::Relaxed);
    self.is_open.store(false, Ordering::Relaxed);
    // last_failure_time is NOT cleared
}
```

**Fix:** Clear `last_failure_time` on success to cleanly reset the breaker state:

```rust
pub fn record_success(&self) {
    self.failure_count.store(0, Ordering::Relaxed);
    self.is_open.store(false, Ordering::Relaxed);
    if let Ok(mut guard) = self.last_failure_time.lock() {
        *guard = None;
    }
}
```

### WR-05: DLQ entries written during main processing pass None for source_stream and submitted_at

**File:** `judge-worker/src/main.rs:604-610` and `judge-worker/src/main.rs:637-638`
**Issue:** When the circuit breaker is open or retries are exhausted, `write_to_dlq` is called with `None, None` for `source_stream` and `submitted_at`. These default to `"submissions"` and `""` respectively. However, submissions from the contest stream will be incorrectly attributed to the normal stream in DLQ metadata. When an admin later inspects or retries these entries, they will be routed to the wrong stream.

```rust
// judge-worker/src/main.rs:604-610
match queue::dlq::write_to_dlq(
    &mut locked_conn,
    result,
    "API circuit breaker open",
    None,    // <-- should be origin_stream
    None,    // <-- should be submitted_at from original message
)
```

**Fix:** Thread the `origin_stream` and `submitted_at` from the original stream message through to the DLQ write calls. The stream message fields are available in `consume_priority` but are not currently propagated to `send_result_with_retry_breaker`:

1. Add `origin_stream: String` and `submitted_at: Option<String>` parameters to `send_result_with_retry_breaker`
2. Pass them from `consume_and_process` where the message tuple is available
3. Forward them to `write_to_dlq`

## Info

### IN-01: `send_result_to_api` creates a new reqwest::Client on every call

**File:** `judge-worker/src/main.rs:551-575`
**Issue:** A new `reqwest::Client` is constructed inside `send_result_to_api` on every invocation (up to 3 times per submission with retries). The `reqwest` docs recommend reusing a `Client` for connection pooling. This is a performance concern only and does not affect correctness.

**Fix:** Create the `Client` once in `main()` and pass it via `Arc` to the processing functions, similar to how `Arc<CircuitBreaker>` is already shared.

### IN-02: `isLoading` deprecated in TanStack React Query v5

**File:** `frontend/src/pages/admin/JudgeQueue.tsx:146-147`
**Issue:** The code uses `statusQuery.isLoading` which was deprecated in TanStack Query v5 in favor of `statusQuery.isPending`. While it still works today, it may be removed in a future minor version.

**Fix:** Replace `isLoading` with `isPending`:
```typescript
{statusQuery.isPending && (
```

### IN-03: `console.error` statements in production service code

**File:** `frontend/src/services/problems.ts:191` and `frontend/src/pages/user/ProblemIDEEnhanced.tsx:57`
**Issue:** Two `console.error` calls are present in production-facing service code. Per project conventions, these should use proper logging or be removed since React Query handles error states internally.

**Fix:** Remove `console.error` and let the error propagate naturally to the caller/error boundary.

---

_Reviewed: 2026-04-17T07:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
