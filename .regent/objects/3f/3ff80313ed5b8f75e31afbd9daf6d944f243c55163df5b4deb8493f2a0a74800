---
phase: 01-architecture-foundation-secret-management
plan: 02
subsystem: infra
tags: [rust, axum, modularization, middleware, websocket, rbac]

# Dependency graph
requires:
  - phase: 01-architecture-foundation-secret-management
    plan: 01
    provides: api-infra crate shell, AppError, RbacService, re-export shim pattern
provides:
  - api-infra middleware module (tenant, authz, permission)
  - api-infra websocket module (server, message, topics)
  - Consolidated require_permission (single implementation in api-infra)
  - Type B DB-dependent permission functions remain in api crate
  - WebSocket handler remains in api crate with sqlx queries
affects: [02-basic-ci-domain-extraction, 03-domain-extraction-extended]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Type A (pure middleware) vs Type B (DB-dependent) split pattern for permission functions
    - api-infra websocket module with connection management, topics, limits
    - AppState deferred to Phase 2 (JwtService abstraction needed)

key-files:
  created:
    - api-infra/src/middleware/mod.rs
    - api-infra/src/middleware/tenant.rs
    - api-infra/src/middleware/authz.rs
    - api-infra/src/middleware/permission.rs
    - api-infra/src/websocket/mod.rs
    - api-infra/src/websocket/server.rs
    - api-infra/src/websocket/message.rs
  modified:
    - api-infra/src/lib.rs
    - api/src/middleware/tenant.rs (re-export shim)
    - api/src/middleware/authz.rs (re-export shim)
    - api/src/middleware/permission.rs (re-export shim + Type B functions)
    - api/src/websocket/server.rs (re-export shim)
    - api/src/websocket/message.rs (re-export shim)

key-decisions:
  - "require_permission consolidated: closure-returning version (Type A) moved to api-infra; old authz.rs version removed, renamed to authz_require_permission in shim to avoid name collision"
  - "Type B functions (require_organization_access, require_campus_access) kept in api crate due to sqlx dependency"
  - "AppState move deferred to Phase 2 -- would require JwtService duplication or trait abstraction"
  - "authz.rs in api-infra contains the canonical implementation; permission.rs is a backward-compat re-export"

patterns-established:
  - "Type A / Type B split: pure logic moves to api-infra, DB-dependent stays in api"
  - "WebSocket handler stays in api (sqlx), while connection management (WebSocketServer) moves to api-infra"

requirements-completed: [ARCH-01]

# Metrics
duration: 8min
completed: 2026-04-13
---

# Phase 1 Plan 02: Move Middleware + WebSocket Server to api-infra Summary

**Tenant middleware, authz/permission middleware (Type A), WebSocketServer, and WebSocketMessage extracted to api-infra; Type B DB-dependent functions and WebSocket handler remain in api**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-13T13:00:00Z
- **Completed:** 2026-04-13T13:08:25Z
- **Tasks:** 4
- **Files modified:** 13

## Accomplishments
- Moved tenant middleware to api-infra with 5 passing tests
- Consolidated duplicate `require_permission` into single implementation in api-infra
- Moved WebSocketServer (connection management, topics, per-user/per-IP limits) and WebSocketMessage to api-infra with 12 passing tests
- Type B DB-dependent functions (require_organization_access, require_campus_access) remain in api crate
- WebSocket handler remains in api crate with 6 sqlx queries intact
- No sqlx references in api-infra; no `use crate::AppState` in api-infra
- All 92 workspace tests pass

## Task Commits

Each task was committed atomically:

1. **Task 02-01: Move TenantContext + tenant_middleware to api-infra** - `388d7ec` (feat)
2. **Task 02-02: Consolidate duplicate require_permission + Move to api-infra** - `71c1598` (feat)
3. **Task 02-03: Move WebSocketServer + WebSocketMessage + topics to api-infra** - `734f359` (feat)
4. **Task 02-04: Defer AppState move, add documentation note** - `8fc0306` (docs)

## Files Created/Modified
- `api-infra/src/middleware/mod.rs` - Module declarations (authz, permission, tenant)
- `api-infra/src/middleware/tenant.rs` - TenantContext + tenant_middleware (219 lines, 5 tests)
- `api-infra/src/middleware/authz.rs` - Consolidated require_permission/any/all/min_role (Type A, 1 test)
- `api-infra/src/middleware/permission.rs` - Backward-compat re-export of authz functions
- `api-infra/src/websocket/mod.rs` - Module declarations (message, server)
- `api-infra/src/websocket/server.rs` - WebSocketServer + topics (554 lines, 10 tests)
- `api-infra/src/websocket/message.rs` - WebSocketMessage enum + MessageFilter (254 lines, 3 tests)
- `api-infra/src/lib.rs` - Added middleware + websocket modules + AppState note
- `api/src/middleware/tenant.rs` - Re-export shim
- `api/src/middleware/authz.rs` - Re-export shim (renamed to authz_require_permission)
- `api/src/middleware/permission.rs` - Re-export shim + Type B DB functions
- `api/src/websocket/server.rs` - Re-export shim
- `api/src/websocket/message.rs` - Re-export shim

## Decisions Made
- **Consolidated require_permission**: The `permission.rs` closure-returning version was kept as the canonical implementation. The `authz.rs` async version was removed and the shim re-exports it as `authz_require_permission` to avoid name collisions.
- **Type A vs Type B split**: Pure middleware functions (no DB, no AppState) moved to api-infra. DB-dependent functions (require_organization_access, require_campus_access) stay in api. This boundary is enforced at compile time (no sqlx in api-infra).
- **AppState deferred**: Moving AppState to api-infra would require duplicating JwtService or creating a trait abstraction. Both add complexity with minimal benefit in Phase 1. Deferred to Phase 2 when domain crates need it.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- api-infra crate now contains: error, rbac, middleware (tenant, authz, permission), websocket (server, message)
- Re-export shim pattern working consistently across all modules
- No circular dependencies; no sqlx in api-infra
- All workspace tests pass (92 passed, 0 failed)
- Ready for Plan 03 (additional type extractions) or Phase 2 (domain crate extraction)

---
*Phase: 01-architecture-foundation-secret-management*
*Completed: 2026-04-13*
