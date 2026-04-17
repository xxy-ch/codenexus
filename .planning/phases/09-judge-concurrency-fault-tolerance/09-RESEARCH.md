# Phase 9: Judge Concurrency + Fault Tolerance - Research

**Researched:** 2026-04-17
**Domain:** Rust async concurrency, Redis Streams priority queuing, circuit breaker pattern, worker health monitoring
**Confidence:** HIGH

## Summary

Phase 9 adds production-grade resilience and concurrency to the judge system. The existing judge-worker already has a solid foundation: Redis Streams consumer with XREADGROUP/XACK, semaphore-based concurrency (`MAX_CONCURRENT_SUBMISSIONS = 4`), DLQ write on delivery failure, and XPENDING/XCLAIM recovery from crashed workers. The phase extends this with: (1) dual-stream priority queuing for contest submissions, (2) in-memory circuit breakers for Redis and API callback, (3) configurable worker concurrency via env var, (4) HTTP heartbeat-based worker health reporting, (5) admin API endpoints for queue monitoring and DLQ management, and (6) a frontend admin dashboard section.

**Primary recommendation:** Extend the existing worker consumer loop to poll two streams (contest-first), add a simple `AtomicUsize`-based circuit breaker struct, make the semaphore count env-configurable, and create new admin routes under `/api/admin/judge/` with a tabbed frontend section inside the existing `AdminLayout`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Separate Redis streams -- `submissions:contest` drained first, `submissions` as fallback
- **D-02:** Stream name `submissions:contest` follows colon convention (same as `submissions:dlq`)
- **D-03:** Non-blocking drain contest-first each poll cycle
- **D-04:** Per-dependency circuit breakers (Redis, API callback)
- **D-05:** In-memory breaker state only (AtomicUsize-based)
- **D-06:** 5 failures / 30s half-open / close on success
- **D-07:** Fail-open with degradation
- **D-08:** HTTP POST heartbeat every 10s, Redis TTL 30s
- **D-09:** Single GET /api/admin/judge/status endpoint
- **D-10:** Wait time from timestamp delta (submit_time -> processing_start)
- **D-11:** DLQ API: GET list, POST retry, DELETE discard
- **D-12:** Redis Stream only storage for DLQ
- **D-13:** Retry re-enqueues to original stream
- **D-14:** Admin dashboard section with tabbed view

### Claude's Discretion
- Exact circuit breaker struct implementation details
- Heartbeat payload JSON field naming
- Rolling average window size for wait time calculation
- DLQ item pagination approach
- Frontend component organization within admin dashboard
- Whether to make circuit breaker thresholds configurable via env vars

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| JCON-01 | Priority submission queue -- contest submissions routed to higher-priority Redis stream | Dual-stream pattern with contest-first polling; API submission creation must accept optional `contest_id` to route to correct stream |
| JCON-02 | Queue monitoring API endpoint -- returns queue depth, active judge count, average wait time | XINFO STREAM for depth, Redis hash for worker heartbeats with TTL, rolling average for wait time |
| JCON-03 | Configurable worker concurrency -- max concurrent judgements per worker via env var | Replace hardcoded `MAX_CONCURRENT_SUBMISSIONS` with `env::var("MAX_CONCURRENT_JUDGES")` reading into existing `Semaphore` |
| JCON-04 | Judge Worker health reporting -- workers periodically report status and consumption progress to API | Background tokio task with 10s interval HTTP POST to `/api/internal/worker/heartbeat`, stored in Redis with 30s TTL |
| FTOL-01 | Circuit breaker for external dependencies (Redis, judge callback) | Per-dependency `AtomicUsize`-based breaker: 5 failures open, 30s half-open, close on success |
| FTOL-02 | Configurable retry policies -- exponential backoff with jitter | Existing retry logic in `send_result_with_retry` already uses exponential backoff (1s, 2s, 4s); add jitter and make configurable |
| FTOL-03 | DLQ monitoring -- API endpoint listing dead letter queue items; manual retry | XRANGE for listing, XADD to original stream + XDEL from DLQ for retry, XDEL for discard |
</phase_requirements>

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| redis | 0.27 | Redis Streams consumer/producer | Already used for XREADGROUP/XADD/XACK; supports raw `redis::cmd()` for XINFO/XRANGE |
| tokio | 1.35 | Async runtime + Semaphore + spawn | Already provides the concurrency primitives needed |
| reqwest | 0.12 | HTTP client for heartbeats + API callbacks | Already used in worker for `send_result_to_api` |
| deadpool-redis | 0.22 | Redis connection pooling (API side) | Used in domain-submissions for XADD operations |
| axum | 0.7 | HTTP routing for admin/heartbeat endpoints | API framework already in use |

### No New Dependencies Required

All requirements can be implemented with existing crate dependencies. No new crates need to be added to either `judge-worker/Cargo.toml` or the API crates.

**Key insight:** The circuit breaker uses `std::sync::atomic::AtomicUsize` and `std::sync::atomic::AtomicBool` -- these are in `std`. The heartbeat uses `tokio::spawn` + `reqwest` -- already present. Queue depth uses XINFO via raw `redis::cmd()` -- already present.

## Architecture Patterns

### Recommended Changes by Component

```
judge-worker/
  src/
    main.rs              -- Modified: dual-stream setup, configurable semaphore, heartbeat spawn
    circuit_breaker.rs   -- NEW: AtomicUsize-based circuit breaker struct
    heartbeat.rs         -- NEW: background task for HTTP POST heartbeats
    queue/
      consumer.rs        -- Modified: dual-stream polling (contest-first, then normal)
      dlq.rs             -- Modified: add `original_stream` field to DLQ entries
  Cargo.toml             -- No changes needed

domain-submissions/
  src/
    queue.rs             -- Modified: queue_submission accepts optional stream_name
    service.rs           -- Modified: create_submission passes contest context to queue
    routes.rs            -- Modified: create_submission accepts optional contest_id

api/
  src/
    main.rs              -- Modified: mount new admin/judge routes + internal/worker routes
  src/judge_monitor/     -- NEW: admin routes for queue status, DLQ management
    mod.rs
    routes.rs            -- GET /judge/status, GET /judge/dlq, POST /judge/dlq/:id/retry, DELETE /judge/dlq/:id
    service.rs           -- Redis queries for XINFO, XRANGE, heartbeat aggregation
  src/worker_heartbeat/  -- NEW: internal heartbeat endpoint
    mod.rs
    routes.rs            -- POST /internal/worker/heartbeat

frontend/
  src/
    pages/admin/
      JudgeQueue.tsx      -- NEW: tabbed component (Queue Status | Workers | Dead Letters)
    services/
      admin.ts            -- Modified: add judgeQueueService methods
    layouts/
      AdminLayout.tsx     -- Modified: add navigation entry for Judge Queue
```

### Pattern 1: Dual-Stream Priority Consumer

**What:** Worker reads from contest stream first each cycle, falls back to normal stream.
**When to use:** Every poll cycle in the main processing loop.
**Key insight:** The contest submission flow is: user creates submission -> `POST /submissions` -> queued to stream. The contest linking (`POST /contests/:id/submissions/:submission_id`) happens AFTER. So the routing decision must happen at submission creation time, NOT at linking time. The `CreateSubmissionRequest` needs an optional `contest_id` field. If present and the contest is active (start_time <= now <= end_time), route to `submissions:contest`.

```rust
// Modified consumer.rs: dual-stream polling
pub async fn consume_priority(
    conn: &mut MultiplexedConnection,
    contest_stream: &str,   // "submissions:contest"
    normal_stream: &str,    // "submissions"
    group_name: &str,
    consumer_name: &str,
) -> Result<Vec<(String, SubmissionMessage, String)>> {
    // Try contest stream first (non-blocking)
    let contest_msgs = consume_submission(conn, contest_stream, group_name, consumer_name, None).await?;
    if !contest_msgs.is_empty() {
        // Tag messages with their origin stream for ACK
        return Ok(contest_msgs.into_iter()
            .map(|(id, msg)| (id, msg, contest_stream.to_string()))
            .collect());
    }
    // Fall back to normal stream (blocking with timeout)
    let normal_msgs = consume_submission(conn, normal_stream, group_name, consumer_name, Some(5000)).await?;
    Ok(normal_msgs.into_iter()
        .map(|(id, msg)| (id, msg, normal_stream.to_string()))
        .collect())
}
```

### Pattern 2: AtomicUsize Circuit Breaker

**What:** Simple in-memory circuit breaker using atomic counters. No external state.
**When to use:** Wrapping all Redis operations and all API callback HTTP calls.

```rust
// Source: [ASSUMED] -- standard pattern, no external crate needed
use std::sync::atomic::{AtomicUsize, AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

pub struct CircuitBreaker {
    failure_count: AtomicUsize,
    state: AtomicBool, // false = closed, true = open
    last_failure: std::sync::Mutex<Option<Instant>>,
    failure_threshold: usize,   // 5
    half_open_timeout_secs: u64, // 30
}

pub enum BreakerState {
    Closed,   // Normal operation
    Open,     // Failing -- reject calls
    HalfOpen, // Testing recovery
}

impl CircuitBreaker {
    pub fn new(failure_threshold: usize, half_open_timeout_secs: u64) -> Self {
        Self {
            failure_count: AtomicUsize::new(0),
            state: AtomicBool::new(false),
            last_failure: std::sync::Mutex::new(None),
            failure_threshold,
            half_open_timeout_secs,
        }
    }

    pub fn allow_request(&self) -> bool {
        // Check state, transition half-open if timeout elapsed
        // ...
    }

    pub fn record_success(&self) {
        // Reset failure count, close breaker
        self.failure_count.store(0, Ordering::Relaxed);
        self.state.store(false, Ordering::Relaxed);
    }

    pub fn record_failure(&self) {
        // Increment count, open breaker if threshold reached
        let count = self.failure_count.fetch_add(1, Ordering::Relaxed) + 1;
        if count >= self.failure_threshold {
            self.state.store(true, Ordering::Relaxed);
            *self.last_failure.lock().unwrap() = Some(Instant::now());
        }
    }
}
```

### Pattern 3: Heartbeat Background Task

**What:** Worker spawns a `tokio::spawn` task that POSTs status to API every 10 seconds.
**When to use:** Started once at worker initialization, runs for worker lifetime.

```rust
// Heartbeat payload stored in Redis hash with 30s TTL
// Key: worker:heartbeat:{consumer_name}
// Fields: worker_id, active_judgements, total_processed, avg_wait_ms, last_seen
// TTL: 30 seconds (auto-expires if worker dies)
```

### Pattern 4: Admin Route Registration

**What:** New admin routes mounted in `api/src/main.rs` following existing pattern.
**When to use:** Judge monitoring and DLQ management endpoints.

```rust
// In create_router() of api/src/main.rs:
let protected_router = Router::new()
    // ... existing routes ...
    .nest("/admin/judge", judge_monitor::routes::judge_router())
    // Internal worker endpoints (no user auth, use WORKER_SECRET)
    .route("/internal/worker/heartbeat", post(worker_heartbeat::handle_heartbeat))
```

### Anti-Patterns to Avoid

- **Blocking on empty contest stream:** D-03 explicitly says non-blocking. Do NOT use BLOCK on the contest stream -- use `None` for block_ms on contest, `Some(5000)` on normal.
- **Single circuit breaker for all deps:** D-04 requires separate breakers for Redis and API. A Redis outage must not prevent API callbacks.
- **Redis-backed breaker state:** D-05 says in-memory only. If Redis is down, the breaker cannot depend on Redis to track state -- that creates a circular dependency.
- **Creating a new page for judge queue:** D-14 says tabbed section in existing admin dashboard, NOT a new standalone page.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Priority queue | Custom priority field in messages with sorting logic | Separate Redis streams with contest-first polling | Simpler, leverages Redis Streams natively, no message parsing overhead |
| Queue depth | Manual counter tracking | Redis XINFO STREAM command | XINFO returns `length` (number of entries) and `groups` info atomically |
| DLQ listing | PostgreSQL table for failed items | Redis XRANGE on `submissions:dlq` stream | Already implemented in `dlq.rs`, just needs API endpoint |
| Worker liveness | Separate health-check service | Redis hash with TTL (auto-expire on worker death) | TTL-based cleanup is automatic; no polling or garbage collection needed |
| Circuit breaker | External crate like `tower` breaker middleware | Simple AtomicUsize struct per D-05 | Worker is standalone, not using tower middleware stack; 50-line struct is sufficient |

## Common Pitfalls

### Pitfall 1: Contest Submission Routing Race Condition
**What goes wrong:** Submission is created and queued to normal stream, THEN linked to contest. The priority queue never sees it.
**Why it happens:** Current flow separates submission creation (`/submissions`) from contest linking (`/contests/:id/submissions/:submission_id`).
**How to avoid:** The `CreateSubmissionRequest` must accept an optional `contest_id`. When present, `queue_for_judging` routes to `submissions:contest` directly. The frontend contest submission page must include `contest_id` in the submission request.
**Warning signs:** Contest submissions showing up in normal stream; priority queue always empty during contests.

### Pitfall 2: Consumer Group Not Created on Contest Stream
**What goes wrong:** Worker starts, creates consumer group on `submissions` stream, but never creates it on `submissions:contest`. XREADGROUP fails silently.
**Why it happens:** Adding a new stream requires calling `XGROUP CREATE MKSTREAM` on it before reading.
**How to avoid:** Call `ensure_consumer_group` for BOTH streams at worker startup. Same group name, different streams.
**Warning signs:** "NOGROUP" errors in worker logs; contest submissions pile up unprocessed.

### Pitfall 3: ACK to Wrong Stream
**What goes wrong:** After processing a contest submission, the worker ACKs the message on the normal stream instead of the contest stream. Message stays in PEL forever.
**Why it happens:** Current code uses a single `stream_name` variable. With dual streams, each message must be ACKed on its origin stream.
**How to avoid:** Return the origin stream name alongside each message from the consumer function. Pass it through to the ACK call.
**Warning signs:** Growing PEL on contest stream; messages never cleaned up.

### Pitfall 4: Heartbeat Flood During Worker Shutdown
**What goes wrong:** Worker shuts down gracefully but heartbeat task keeps running for a while, creating stale heartbeats.
**Why it happens:** Heartbeat task is independent of main processing loop.
**How to avoid:** Use `tokio::select!` with a cancellation token or `tokio::sync::watch` to signal shutdown. The 30s TTL naturally cleans up stale entries even if graceful shutdown fails.
**Warning signs:** "Ghost" workers showing as active in monitoring after shutdown.

### Pitfall 5: DLQ Retry Loses Original Stream Context
**What goes wrong:** DLQ retry re-enqueues to the wrong stream (normal instead of contest).
**Why it happens:** DLQ entry doesn't store which stream the message came from.
**How to avoid:** When writing to DLQ, include `original_stream` field in the message. On retry, read this field and XADD to the correct stream.
**Warning signs:** Retried contest submissions processed with lower priority than expected.

### Pitfall 6: Circuit Breaker Starvation
**What goes wrong:** Breaker opens after 5 failures, then all subsequent calls are rejected for 30+ seconds even if the dependency has recovered.
**Why it happens:** Half-open timeout not properly checked; breaker stays open indefinitely.
**How to avoid:** On `allow_request()`, check if breaker has been open longer than `half_open_timeout_secs`. If so, transition to half-open and allow ONE request through. On success, close immediately.
**Warning signs:** Extended periods where worker skips Redis/API calls despite service being healthy.

## Code Examples

### Dual-Stream Queue Submission (API Side)

```rust
// Source: [VERIFIED: codebase] -- extending domain-submissions/src/queue.rs

// Modified queue_submission to accept target stream
pub async fn queue_submission(
    pool: &Pool,
    message: &SubmissionMessage,
    contest_id: Option<i64>,  // NEW: route to contest stream if present
) -> Result<String> {
    let stream_name = match contest_id {
        Some(_) => "submissions:contest",
        None => "submissions",
    };

    // Ensure stream and consumer group exist
    ensure_stream_and_group(pool, stream_name).await?;

    let message_json = serde_json::to_string(message)?;
    let fields = vec![
        ("submission_id".to_string(), message.submission_id.to_string()),
        ("data".to_string(), message_json),
        ("submitted_at".to_string(), chrono::Utc::now().to_rfc3339()),  // D-10
        ("source_stream".to_string(), stream_name.to_string()),         // D-13
    ];

    add_message(pool, stream_name, &fields).await
}
```

### XINFO for Queue Depth

```rust
// Source: [VERIFIED: codebase] -- using existing redis::cmd pattern
// XINFO STREAM returns: length, radix-tree-keys, radix-tree-nodes, groups, ...
// The `length` field gives the number of entries in the stream.

async fn get_stream_depth(conn: &mut MultiplexedConnection, stream: &str) -> Result<usize> {
    let result: redis::Value = redis::cmd("XINFO")
        .arg("STREAM")
        .arg(stream)
        .query_async(conn)
        .await
        .context("XINFO STREAM failed")?;

    // XINFO returns an array of key-value pairs: [key, value, key, value, ...]
    if let redis::Value::Array(pairs) = result {
        let mut i = 0;
        while i + 1 < pairs.len() {
            if let (redis::Value::BulkString(key), redis::Value::Int(val)) =
                (&pairs[i], &pairs[i + 1])
            {
                if key == b"length" {
                    return Ok(*val as usize);
                }
            }
            i += 2;
        }
    }
    Ok(0)
}
```

### Heartbeat Storage in Redis

```rust
// Source: [VERIFIED: codebase] -- using existing redis::cmd pattern
// Store heartbeat as Redis Hash with TTL
async fn store_heartbeat(
    conn: &mut MultiplexedConnection,
    worker_id: &str,
    payload: &HeartbeatPayload,
) -> Result<()> {
    let key = format!("worker:heartbeat:{}", worker_id);
    let fields = &[
        ("worker_id", worker_id.to_string()),
        ("active_judgements", payload.active_judgements.to_string()),
        ("total_processed", payload.total_processed.to_string()),
        ("avg_wait_ms", payload.avg_wait_ms.to_string()),
        ("last_seen", chrono::Utc::now().to_rfc3339()),
    ];

    // HSET fields then EXPIRE
    let mut cmd = redis::cmd("HSET");
    cmd.arg(&key);
    for (k, v) in fields {
        cmd.arg(k).arg(v);
    }
    cmd.query_async::<()>(conn).await?;

    redis::cmd("EXPIRE")
        .arg(&key)
        .arg(30)  // 30s TTL per D-08
        .query_async::<()>(conn)
        .await?;

    Ok(())
}
```

### Worker Heartbeat Background Task

```rust
// Source: [ASSUMED] -- standard tokio::spawn pattern
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};

async fn spawn_heartbeat_task(
    api_url: String,
    worker_secret: String,
    worker_id: String,
    active_count: Arc<AtomicUsize>,
    total_processed: Arc<AtomicUsize>,
    avg_wait_ms: Arc<AtomicUsize>,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let client = reqwest::Client::new();
        let mut interval = tokio::time::interval(Duration::from_secs(10));

        loop {
            interval.tick().await;
            let payload = serde_json::json!({
                "worker_id": worker_id,
                "active_judgements": active_count.load(Ordering::Relaxed),
                "total_processed": total_processed.load(Ordering::Relaxed),
                "avg_wait_ms": avg_wait_ms.load(Ordering::Relaxed),
            });

            let result = client
                .post(format!("{}/internal/worker/heartbeat", api_url))
                .header("X-Worker-Secret", &worker_secret)
                .json(&payload)
                .timeout(Duration::from_secs(5))
                .send()
                .await;

            if let Err(e) = result {
                tracing::warn!("Heartbeat failed: {}", e);
            }
        }
    })
}
```

### DLQ Retry Endpoint

```rust
// Source: [VERIFIED: codebase] -- extending existing dlq.rs patterns

// POST /api/admin/judge/dlq/:id/retry
async fn retry_dlq_item(
    State(state): State<AppState>,
    Path(entry_id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let pool = state.redis_pool.as_ref().ok_or(AppError::Internal("Redis not configured"))?;
    let mut conn = pool.get().await.map_err(|e| AppError::Internal(e.to_string()))?;

    // 1. Read the DLQ entry
    let entries: Vec<(String, HashMap<String, String>)> = deadpool_redis::redis::cmd("XRANGE")
        .arg("submissions:dlq")
        .arg(&entry_id)
        .arg(&entry_id)
        .query_async(&mut conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let (_, fields) = entries.into_iter().next()
        .ok_or(AppError::Validation("DLQ entry not found".into()))?;

    // 2. Determine original stream (default to "submissions" if missing for backward compat)
    let original_stream = fields.get("source_stream")
        .map(|s| s.as_str())
        .unwrap_or("submissions");

    // 3. Re-enqueue to original stream
    let result_json = fields.get("result_json").ok_or(AppError::Validation("Missing result data".into()))?;
    let submission_id = fields.get("submission_id").ok_or(AppError::Validation("Missing submission_id".into()))?;

    deadpool_redis::redis::cmd("XADD")
        .arg(original_stream)
        .arg("*")
        .arg("submission_id").arg(submission_id)
        .arg("data").arg(result_json)
        .query_async::<String>(&mut conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // 4. Delete from DLQ
    deadpool_redis::redis::cmd("XDEL")
        .arg("submissions:dlq")
        .arg(&entry_id)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(serde_json::json!({
        "message": "DLQ entry retried",
        "entry_id": entry_id,
        "target_stream": original_stream,
    })))
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single submission stream | Dual-stream priority (contest + normal) | Phase 9 | Contest submissions get priority processing |
| Hardcoded MAX_CONCURRENT_SUBMISSIONS | Env-configurable MAX_CONCURRENT_JUDGES | Phase 9 | Adjustable without code changes |
| No circuit breaker | Per-dependency AtomicUsize breakers | Phase 9 | Graceful degradation on dependency failure |
| No worker health visibility | HTTP heartbeat + Redis TTL + admin endpoint | Phase 9 | Real-time worker monitoring |
| DLQ write-only | DLQ read/retry/discard via admin API | Phase 9 | Operational control over failed items |

**Not deprecated, but extended:**
- `queue/consumer.rs`: Extended to support dual-stream polling
- `queue/dlq.rs`: Extended to store `source_stream` and `submitted_at` metadata
- `main.rs`: Extended with heartbeat task and configurable semaphore

## Key Integration Points

### 1. Submission Routing (API -> Redis Stream)

The current flow is:
1. `POST /submissions` -> `SubmissionService::create_submission` -> `queue_for_judging` -> `queue_submission` -> XADD to `submissions`
2. `POST /contests/:id/submissions/:submission_id` -> `link_submission_to_contest`

For priority routing, step 1 must know about the contest. The `CreateSubmissionRequest` needs an optional `contest_id`. When present, the service should verify the contest is active (query contests table) and route to `submissions:contest`. The `queue_submission` function signature needs to accept a stream name parameter.

**Important:** The frontend contest submission flow must pass `contest_id` when creating a submission during an active contest. Currently no evidence of this in the frontend code -- the contest submission page needs to be checked or updated.

### 2. Worker Consumer Dual-Stream Polling

The worker's `consume_and_process` function currently reads from a single stream. It needs to:
1. Call `ensure_consumer_group` for both `submissions:contest` and `submissions` at startup
2. In each loop iteration: try contest stream (non-blocking) -> if empty, try normal stream (5s block)
3. Track origin stream per message for correct ACK

### 3. Worker Heartbeat -> API -> Redis

New internal endpoint `POST /internal/worker/heartbeat`:
- Authenticated via `X-Worker-Secret` header (same as existing `update_judge_result`)
- Stores heartbeat in Redis hash `worker:heartbeat:{worker_id}` with 30s TTL
- No database writes -- purely Redis-based

### 4. Admin Monitoring Endpoints

New routes under `/api/admin/judge/`:
- `GET /status` -- reads worker heartbeats from Redis (SCAN for `worker:heartbeat:*` keys), XINFO for stream depths
- `GET /dlq` -- XRANGE on `submissions:dlq` with pagination
- `POST /dlq/:id/retry` -- XRANGE to read, XADD to original stream, XDEL from DLQ
- `DELETE /dlq/:id` -- XDEL from DLQ

### 5. Frontend Admin Dashboard

Add "Judge Queue" navigation item to `AdminLayout.tsx` (line 13 area) and a new `JudgeQueue.tsx` page component with three tabs:
- Queue Status: stream depths, wait time averages
- Workers: active worker list with last heartbeat age
- Dead Letters: DLQ items with retry/discard actions

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Redis | Priority queue, heartbeat storage, DLQ | In Docker Compose | 7-alpine | -- |
| PostgreSQL | Contest active status check (submission routing) | In Docker Compose | 16-alpine | -- |
| reqwest | Worker heartbeat HTTP POST | In judge-worker Cargo.toml | 0.12 | -- |
| tokio | Async runtime, Semaphore, spawn | Workspace | 1.35 | -- |
| deadpool-redis | API-side Redis pool | In domain-submissions | 0.22 | -- |

**Missing dependencies with no fallback:** None -- all required tools and libraries are available.

**Missing dependencies with fallback:** N/A

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Rust: built-in `#[test]` + `#[tokio::test]` / Frontend: Vitest |
| Config file | `judge-worker/Cargo.toml` (dev-deps) / `frontend/vitest.config.ts` |
| Quick run command | `cargo test -p judge-worker` / `cd frontend && npx vitest run` |
| Full suite command | `cargo test --workspace` / `cd frontend && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JCON-01 | Contest submissions routed to contest stream | unit | `cargo test -p judge-worker -- queue::consumer` | Partial -- Wave 0 extends |
| JCON-01 | Normal submissions routed to normal stream | unit | `cargo test -p judge-worker -- queue::consumer` | Partial -- Wave 0 extends |
| JCON-02 | Queue monitoring endpoint returns depths | integration | `cargo test -p api -- judge_monitor` | Wave 0 creates |
| JCON-03 | Semaphore count from env var | unit | `cargo test -p judge-worker -- config` | Wave 0 creates |
| JCON-04 | Heartbeat stored in Redis with TTL | integration | `cargo test -p api -- worker_heartbeat` | Wave 0 creates |
| FTOL-01 | Circuit breaker opens after 5 failures | unit | `cargo test -p judge-worker -- circuit_breaker` | Wave 0 creates |
| FTOL-01 | Circuit breaker half-open after 30s | unit | `cargo test -p judge-worker -- circuit_breaker` | Wave 0 creates |
| FTOL-02 | Retry with exponential backoff + jitter | unit | `cargo test -p judge-worker -- retry` | Partial -- extends existing |
| FTOL-03 | DLQ list/retry/discard endpoints | integration | `cargo test -p api -- judge_monitor` | Wave 0 creates |

### Sampling Rate
- **Per task commit:** `cargo test -p judge-worker` or `cargo test -p api`
- **Per wave merge:** `cargo test --workspace`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `judge-worker/src/circuit_breaker.rs` -- unit tests for FTOL-01 (open/close/half-open transitions)
- [ ] `judge-worker/src/queue/consumer.rs` -- dual-stream polling tests (existing tests cover single stream)
- [ ] `api/src/judge_monitor/` -- integration tests for JCON-02, FTOL-03
- [ ] `api/src/worker_heartbeat/` -- integration tests for JCON-04
- [ ] Frontend: `JudgeQueue.tsx` component tests

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | WORKER_SECRET constant-time comparison for internal endpoints (existing pattern in `update_judge_result`) |
| V3 Session Management | yes | JWT auth for admin endpoints (existing middleware) |
| V4 Access Control | yes | Admin-only access to /api/admin/judge/* endpoints |
| V5 Input Validation | yes | Validate entry_id format, contest_id range, pagination params |
| V6 Cryptography | no | No new cryptographic operations |

### Known Threat Patterns for Judge Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Worker impersonation | Spoofing | WORKER_SECRET header validation (constant-time comparison) |
| Admin endpoint access by non-admin | Elevation of Privilege | Auth middleware + Role check (existing) |
| DLQ data exposure | Information Disclosure | Admin-only endpoint; DLQ contains source code but already protected |
| Queue flooding | Denial of Service | Rate limiting (existing GovernorLayer: 30 req/min/IP) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Circuit breaker pattern is implementable with ~50 lines of Rust using AtomicUsize | Architecture Patterns | Low -- std library primitives, well-understood pattern |
| A2 | XINFO STREAM returns `length` field as integer in redis 0.27 crate | Code Examples | Low -- verified via redis docs; alternative: XLEN command |
| A3 | Frontend contest submission page currently does NOT pass contest_id in submission request | Integration Points | Medium -- if it does, less work needed; if not, frontend changes required |
| A4 | `ensure_consumer_group` on non-existent stream with MKSTREAM is safe to call repeatedly | Architecture Patterns | Low -- already done in existing code with error suppression |
| A5 | Worker heartbeat Redis keys (`worker:heartbeat:*`) won't conflict with existing keys | Code Examples | Low -- namespace is unique; verified no existing keys use this prefix |

## Open Questions

1. **Frontend contest submission flow**
   - What we know: The API has `link_submission_to_contest` as a separate endpoint. The frontend does not currently appear to pass `contest_id` when creating submissions.
   - What's unclear: Whether the frontend contest problem page creates submissions with a `contest_id` parameter already, or if this needs to be added.
   - Recommendation: Planner should include a task to verify and potentially update the frontend contest submission flow to pass `contest_id`. If the frontend does not currently do this, both the `CreateSubmissionRequest` type and the frontend submission service need updates.

2. **Recovery on contest stream**
   - What we know: The existing `recover_pending_submissions` in `recovery.rs` operates on a single stream.
   - What's unclear: Whether recovery should also run on the contest stream at startup.
   - Recommendation: Yes, recovery should run on both streams at startup. The planner should include this as a task.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `judge-worker/src/main.rs`, `judge-worker/src/queue/consumer.rs`, `judge-worker/src/queue/dlq.rs`
- Codebase analysis: `domain-submissions/src/queue.rs`, `domain-submissions/src/service.rs`, `domain-submissions/src/routes.rs`
- Codebase analysis: `domain-contests/src/routes.rs`, `domain-contests/src/service.rs`
- Codebase analysis: `api/src/main.rs`, `api-infra/src/state.rs`
- Codebase analysis: `frontend/src/layouts/AdminLayout.tsx`, `frontend/src/services/admin.ts`

### Secondary (MEDIUM confidence)
- Redis Streams XINFO documentation: `length` field for queue depth [ASSUMED based on Redis 7 docs]
- Redis Streams XREADGROUP/XACK behavior with multiple streams [ASSUMED based on Redis documentation]

### Tertiary (LOW confidence)
- None -- all findings based on codebase analysis or well-established patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies already in project, no new crates needed
- Architecture: HIGH -- extending existing patterns, no novel approaches
- Pitfalls: HIGH -- derived from code analysis and understanding of Redis Streams semantics
- Integration points: HIGH -- verified by reading actual code paths

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 days -- stable codebase patterns)
