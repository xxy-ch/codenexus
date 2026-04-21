# Phase 11: Feature Gateway Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 11-feature-gateway-infrastructure
**Areas discussed:** Frontend feature flag migration, Backend guard integration, Admin UI layout, Seed data transition

---

## Frontend Feature Flag Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Complete replacement | New `services/featureGateway.ts` calls API, `FEATURE_FLAGS` in config.ts deprecated. All env vars removed. | Yes |
| API-first + env fallback | Gateway API primary, fallback to env vars when API unavailable. | |
| Frontend not migrated | Phase 11 backend only, frontend migration deferred. | |

**User's choice:** Complete replacement
**Notes:** Clean cut preferred. No backwards compatibility with static FEATURE_FLAGS once gateway is live. New service uses React Query or context provider pattern.

---

## Backend Guard Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Axum middleware layer | Declarative `.feature_gate(slug)` on route registration. Placed after auth+tenant, before handler. Returns 404. | Yes |
| Handler-internal calls | `feature_gateway.is_enabled()` inside each handler. Flexible but invasive. | |
| Hybrid | Middleware for hard gates (404), handler for soft checks (hide sub-features). | |

**User's choice:** Axum middleware layer
**Notes:** Middleware accesses TenantContext from request extensions for scope resolution. Follows existing authz.rs pattern.

---

## Admin UI Layout and Routing

| Option | Description | Selected |
|--------|-------------|----------|
| Admin + Teacher dual pages | `/admin/features` for global+scoped, `/teacher/features` for class-level with inherited indicators. | Yes |
| Admin-only + Teacher inline | Admin page only, teacher controls embedded in class management. | |
| Unified page (role-adaptive) | Single page renders different controls based on role. | |

**User's choice:** Admin + Teacher dual pages
**Notes:** Matches existing `/admin` vs `/teacher` routing convention. Avoids conditional rendering complexity for fundamentally different scope visibility.

---

## Seed Data and Environment Variable Transition

| Option | Description | Selected |
|--------|-------------|----------|
| Migration insert + env deprecation | 5 features in migration, all default enabled. VITE_ENABLE_* deprecated. FEATURE_GATEWAY_ENABLED retained. | Yes |
| Seed script + admin creation | Separate seed script, not migration. Production creates features manually. | |
| Code-hardcoded defaults | Fallback defaults in code, no forced seed. | |

**User's choice:** Migration insert + env deprecation
**Notes:** 5 seed features: direct_messages, plagiarism, discussions, blog, leaderboard. Backend FEATURE_GATEWAY_ENABLED retained as emergency-off (D-11).

---

## Prior Decisions (carried forward from 2026-04-19)

The following 12 decisions were already locked in the original CONTEXT.md and were not re-discussed:
- D-01 through D-12: Three-ring model, scope hierarchy, resolution precedence, master switch, permission boundary, teacher visibility, 404 behavior, frontend sync, caching, emergency-off, phase boundary

## Deferred Ideas

- Feature flag audit logging (who changed what, when) — useful but out of Phase 11 scope
