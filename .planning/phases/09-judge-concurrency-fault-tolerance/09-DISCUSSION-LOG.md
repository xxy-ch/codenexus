# Phase 9: Judge Concurrency + Fault Tolerance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 09-judge-concurrency-fault-tolerance
**Areas discussed:** Priority queue strategy, Circuit breaker design, Worker health + queue monitoring, DLQ monitoring + retry UX

---

## Priority Queue Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Separate streams | Create `submissions:contest` stream. Workers consume contest first, fall back to normal. | ✓ |
| Single stream with priority field | Keep one stream, add `priority` field. Workers sort by priority before processing. | |
| Dedicated contest workers | Separate worker pools for contest vs normal streams. | |

**User's choice:** Separate streams
**Notes:** True priority — contest submissions never wait behind normal ones. Simple infrastructure change.

### Stream naming

| Option | Description | Selected |
|--------|-------------|----------|
| submissions:contest | Follows existing colon convention (`submissions:dlq`). | ✓ |
| contest-submissions | Clearer but diverges from codebase convention. | |

**User's choice:** submissions:contest

### Fallback behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Drain contest first, then normal | Each poll cycle: non-blocking contest read, then normal read. | ✓ |
| BLOCK on contest, poll normal | BLOCK with timeout on contest, then non-blocking normal read. | |

**User's choice:** Drain contest first, then normal

---

## Circuit Breaker Design

### Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Per-dependency | Separate breakers for Redis and API callback. Granular recovery. | ✓ |
| Unified breaker | Single breaker wraps all external calls. Simpler but less granular. | |
| Grouped by type | Per-dependency grouped by call type. Middle ground. | |

**User's choice:** Per-dependency

### State storage

| Option | Description | Selected |
|--------|-------------|----------|
| In-memory only | AtomicUsize-based. Resets on worker restart. Stateless workers — acceptable. | ✓ |
| Redis-backed state | Persists across restarts. More complex. | |

**User's choice:** In-memory only

### Thresholds

| Option | Description | Selected |
|--------|-------------|----------|
| 5 failures / 30s | Standard values. Good balance of tolerance and recovery speed. | ✓ |
| 3 failures / 60s | More conservative. Trips faster, waits longer. | |
| Configurable via env vars | Maximum flexibility. More configuration to manage. | |

**User's choice:** 5 failures / 30s

### Open behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Fail-open with degradation | Skip failed dependency, continue processing other submissions. Gradual degradation. | ✓ |
| Stop consumption | Pause all submission consumption. Prevents partial failures. | |

**User's choice:** Fail-open with degradation

---

## Worker Health + Queue Monitoring

### Heartbeat mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| HTTP POST heartbeat | Workers POST to API every N seconds. Decoupled from stream processing. | ✓ |
| Redis key heartbeat | Workers update Redis key. API reads directly. Couples health to Redis. | |
| Redis Stream heartbeat | Workers write to `worker:health` stream. Supports history but adds overhead. | |

**User's choice:** HTTP POST heartbeat

### Monitoring endpoint

| Option | Description | Selected |
|--------|-------------|----------|
| Single /judge/status endpoint | One endpoint: queue depths, workers, wait time, breaker states. | ✓ |
| Multiple dedicated endpoints | Separate endpoints per concern. More granular. | |

**User's choice:** Single /judge/status endpoint

### Heartbeat interval

| Option | Description | Selected |
|--------|-------------|----------|
| 10 seconds | Good balance. TTL 30s — 3 missed heartbeats = stale. | ✓ |
| 5 seconds | More responsive. More HTTP traffic. | |
| 30 seconds | Less overhead. Slower failure detection. | |

**User's choice:** 10 seconds

### Wait time calculation

| Option | Description | Selected |
|--------|-------------|----------|
| Timestamp delta | Track submit_time in message, compute (start - submit_time). Accurate. | ✓ |
| Queue depth / throughput estimate | Estimate from depth / rate. Less accurate. | |

**User's choice:** Timestamp delta

---

## DLQ Monitoring + Retry UX

### API surface

| Option | Description | Selected |
|--------|-------------|----------|
| List + Retry + Discard | GET list, POST retry single item, DELETE discard. Standard CRUD. | ✓ |
| List + Bulk retry only | GET list, POST retry-all. Simpler but riskier. | |
| Full CRUD + Purge | Same as recommended plus purge-all. Destructive. | |

**User's choice:** List + Retry + Discard

### Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Redis Stream only (current) | No schema change. Ephemeral but sufficient for ops. | ✓ |
| Redis Stream + PostgreSQL table | Durable. Adds DB writes to failure path. | |

**User's choice:** Redis Stream only (current)

### Retry routing

| Option | Description | Selected |
|--------|-------------|----------|
| Re-enqueue to original stream | Retry XADDs to contest or normal stream. Worker processes as new. | ✓ |
| Worker-initiated retry scan | Worker periodically scans DLQ for retryable items. More complex. | |

**User's choice:** Re-enqueue to original stream

### Frontend

| Option | Description | Selected |
|--------|-------------|----------|
| Admin dashboard section | Tabbed view within existing admin dashboard. Cohesive. | ✓ |
| Dedicated /admin/judge page | Full monitoring page. More space but another page to maintain. | |
| API-only, no frontend | Just API endpoints. Frontend later. | |

**User's choice:** Admin dashboard section — tabbed view with Queue Status | Workers | Dead Letters

---

## Claude's Discretion

- Exact circuit breaker struct implementation
- Heartbeat payload JSON field naming
- Rolling average window size for wait time
- DLQ item pagination approach
- Frontend component organization within admin dashboard
- Whether to make circuit breaker thresholds configurable via env vars

## Deferred Ideas

None — discussion stayed within phase scope.
