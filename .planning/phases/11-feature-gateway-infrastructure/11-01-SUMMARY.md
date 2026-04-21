---
phase: 11-feature-gateway-infrastructure
plan: 01
subsystem: backend/feature-gateway
tags: [feature-flag, standalone-service, rust, axum, postgresql]
dependency_graph:
  requires: []
  provides: [11-02]
  affects: [api-infra]
tech_stack:
  added:
    - "feature-gateway standalone crate (Rust, Axum 0.7, SQLx 0.8, DashMap 6)"
  patterns:
    - "Standalone binary pattern (same as judge-worker)"
    - "WORKER_SECRET Bearer token auth middleware"
    - "DashMap in-process cache with scope hierarchy"
key_files:
  created:
    - "backend/feature-gateway/Cargo.toml"
    - "backend/feature-gateway/src/lib.rs"
    - "backend/feature-gateway/src/main.rs"
    - "backend/feature-gateway/src/models.rs"
    - "backend/feature-gateway/src/service.rs"
    - "backend/feature-gateway/src/routes.rs"
    - "backend/feature-gateway/src/auth.rs"
    - "backend/feature-gateway/Dockerfile"
  modified:
    - "backend/Cargo.toml (workspace member)"
decisions: []
metrics:
  duration: 13min
  completed_date: 2026-04-21
---

# Phase 11 Plan 01: Create Standalone Feature Gateway Crate Summary

Standalone `backend/feature-gateway/` crate extracted from `api-infra/src/feature_gateway/` as an independent binary service with its own HTTP server (port 3001), PostgreSQL connection pool, WORKER_SECRET authentication, and full CRUD + resolve + health endpoints.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1-5 | Create crate skeleton, move models/service, add auth, create routes, create main.rs | 028afbe | Done |
| 6 | Create Dockerfile | 124ce8b | Done |

## What Was Built

### Crate Structure
```
backend/feature-gateway/
  Cargo.toml          # axum, sqlx, dashmap, shared deps; tower dev-dep
  Dockerfile          # multi-stage build, port 3001, HEALTHCHECK
  src/
    lib.rs            # AppState (Clone) + module re-exports
    main.rs           # tokio main, PgPool, env vars, axum::serve
    models.rs         # FeatureSource, ResolvedFeature, SetFlagRequest (+6 tests)
    service.rs        # FeatureGatewayService with DashMap cache (+7 tests)
    routes.rs         # CRUD + resolve + health routes (+9 tests)
    auth.rs           # require_worker_secret middleware (+3 tests)
```

### Endpoints
- `GET /resolve?slug=&campus_id=&grade_id=` -- resolve single feature
- `GET /registry` -- list all feature definitions
- `GET /features/{slug}/flags` -- list flag overrides
- `POST /features/{slug}/flags` -- set/update flag override
- `DELETE /features/{slug}/flags` -- delete flag override
- `GET /health` -- DB connectivity check (SELECT 1)

### Key Design Decisions
- **GatewayError type**: New lightweight JSON error type for gateway routes (not reusing api-infra's AppError, keeping the crate self-contained)
- **Auth as layer**: `require_worker_secret` applied via `.layer()` on the final `Router<()>` rather than `route_layer()`, since `gateway_router()` already converts to `Router<()>` via `.with_state()`
- **No role header in gateway**: CRUD auth (D-06 check_scope_authorization) retained as a utility function but not enforced at the gateway route level -- the API proxy layer will enforce role checks before forwarding. This keeps gateway stateless (no JWT parsing).

## Deviations from Plan

None - plan executed exactly as written.

## Test Coverage

25 unit tests across 4 modules:
- **models** (6 tests): FeatureSource display/from_scope_str, FeatureScope as_str, SetFlagRequest deserialize, ResolvedFeature serialization
- **service** (7 tests): cache key format, emergency-off returns disabled, cache hit/miss, precedence (grade>campus, class>grade), cache invalidation
- **routes** (9 tests): D-06 authorization (Root, CampusAdmin, GradeAdmin, Teacher, Student, TA, invalid scope), DeleteFlagParams deserialize
- **auth** (3 tests): valid token passes, wrong token returns 401, missing header returns 401

## Verification Checklist

- [x] `cargo build -p feature-gateway` compiles without errors or warnings
- [x] `cargo test -p feature-gateway` -- 25/25 tests pass
- [x] `backend/Cargo.toml` workspace members includes "feature-gateway"
- [x] No changes to api-infra or api crates (coexistence preserved)
- [x] Dockerfile with multi-stage build, EXPOSE 3001, HEALTHCHECK

## Self-Check: PASSED
