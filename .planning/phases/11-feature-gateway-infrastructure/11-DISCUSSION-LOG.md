# Phase 11: Feature Gateway Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-21 (v2 -- Gateway independent service architecture)
**Phase:** 11-feature-gateway-infrastructure
**Areas discussed:** Independent form, Communication, Data layer, Deployment topology, API cache, Frontend access, Degradation, Authentication, Endpoint scope, Migration strategy

---

## Standalone Service Form

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone binary (recommended) | Independent main.rs, own Dockerfile, own port (3001). Follows judge-worker pattern. | Y |
| Independent crate (compiled into API) | Separate crate with lib.rs, compiled into API binary. No separate process. | |
| Dual-mode (hybrid) | Feature flag controls embedded vs standalone mode. Development simplicity + production scalability. | |

**User's choice:** Standalone binary
**Notes:** User explicitly wants Gateway "parallel to backend" as a separate component. judge-worker is the proven pattern in this project.

---

## Communication Method

| Option | Description | Selected |
|--------|-------------|----------|
| HTTP REST (recommended) | API calls Gateway resolve endpoint. Simple, consistent with existing patterns. ~1-5ms local latency. | Y |
| Redis communication | Request/response via Redis Pub/Sub. Unified with judge-worker Redis pattern but needs correlation ID. | |
| Redis cache sync + local read | Gateway publishes invalidation events via Redis. API reads from local cache. Zero network on hot path. | |

**User's choice:** HTTP REST
**Notes:** Simplest approach. No need for complex request-response correlation over Redis.

---

## Data Layer Coupling

| Option | Description | Selected |
|--------|-------------|----------|
| Direct DB access (recommended) | Gateway has own PgPool, reads/writes feature tables directly. Zero API dependency. | Y |
| Via API (indirect) | Gateway calls API endpoints for data. Caching/computation layer only. | |

**User's choice:** Direct DB access
**Notes:** judge-worker already validates this pattern. Gateway is fully independent.

---

## Deployment Topology

| Option | Description | Selected |
|--------|-------------|----------|
| Docker Compose (recommended) | Add feature-gateway service with port 3001 exposed. API depends_on gateway. | Y |
| Internal-only (no port exposure) | Gateway not exposed to host, only Docker internal network. | |

**User's choice:** Docker Compose with port exposure
**Notes:** Port exposure enables local debugging and development convenience.

---

## API-Side Cache Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Short TTL cache 10s (recommended) | DashMap with 10s TTL. Reduces HTTP calls. Admin changes propagate within 10s. | Y |
| No cache (passthrough) | Every request hits Gateway. Simple but adds 1-5ms latency per request. | |
| Redis invalidation notification | API caches locally, Gateway publishes invalidation events via Redis. Most precise but complex. | |

**User's choice:** Short TTL cache (10s)

---

## Frontend Access Path

| Option | Description | Selected |
|--------|-------------|----------|
| API proxy (recommended) | Frontend still calls API /features/*. API proxies to Gateway. Zero frontend changes. | Y |
| Direct to Gateway | Frontend calls Gateway port directly. Needs CORS config and new env vars. | |

**User's choice:** API proxy

---

## Degradation Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Fail-open (preserve UX) | Gateway unavailable -> all features treated as enabled. Warning logged. | Y |
| Fail-closed (preserve security) | Gateway unavailable -> all features treated as disabled. Returns 404. | |
| Mixed (per-feature security level) | Low-security features fail-open, high-security features fail-closed. Requires registry change. | |

**User's choice:** Fail-open
**Notes:** User prioritizes user experience continuity. Security implications of temporarily exposing disabled features accepted.

---

## Internal API Authentication

| Option | Description | Selected |
|--------|-------------|----------|
| Shared secret (recommended) | WORKER_SECRET pattern. API sends Bearer token. Simple, proven. | Y |
| No auth (internal trust) | No authentication, rely on network isolation. | |
| Network isolation + no auth | Docker internal network only, no auth. | |

**User's choice:** Shared secret (WORKER_SECRET)

---

## Gateway Endpoint Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only + invalidation (recommended) | Gateway exposes resolve, registry, invalidate. CRUD stays in API. | |
| Full Gateway hosting | Gateway hosts resolve + registry + CRUD + health. API no longer touches feature_flags table. | Y |

**User's choice:** Full Gateway hosting
**Notes:** Gateway becomes the single owner of feature data. Eliminates split-brain risk.

---

## Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| One-step migration (recommended) | Create crate, move code, switch API to HTTP client, delete old module. No intermediate state. | Y |
| Gradual migration (dual-mode) | Support both embedded and remote modes via env var. Transition after validation. | |

**User's choice:** One-step migration
**Notes:** Code not in production, no backward compatibility needed.

---

## Prior Decisions (carried forward, unchanged)

The following decisions were already locked and were not re-discussed:
- D-01 through D-05: Three-ring model, scope hierarchy, resolution precedence, master switch
- D-06, D-07: Permission boundary, teacher visibility
- D-08: 404 behavior (not 403)
- D-11: Emergency-off via FEATURE_GATEWAY_ENABLED env var
- D-12: Phase boundary discipline (architecture-first, no AI wiring)

The following decisions were superseded by new architecture decisions:
- D-09, D-10: Frontend sync and caching -- superseded by D-21 (API-side TTL cache) and D-22 (API proxy)
- D-13, D-14: Frontend migration and backend guard -- D-14 superseded by D-18 (HTTP REST), D-13 unchanged
- D-15: Admin UI layout -- unchanged
- D-16: Seed data -- unchanged

## Claude's Discretion

- HTTP client library choice (reqwest already in workspace)
- TTL cache implementation details (DashMap with timestamps vs tokio::time interval-based eviction)
- Gateway internal module structure within the new crate
- Health check endpoint details (DB ping, memory stats, etc.)
- Whether API proxy routes preserve exact same JSON response format

## Deferred Ideas

- Feature flag audit logging (who changed what, when) -- useful but out of Phase 11 scope
- Gateway Prometheus metrics / tracing -- can be added as a follow-up
- Gateway horizontal scaling (multiple instances behind load balancer) -- not needed for v1
- gRPC communication as alternative to HTTP REST -- overkill for v1
- Assignment-level scope controls -- current hierarchy stops at class
