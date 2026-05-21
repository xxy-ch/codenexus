# Phase 11: Feature Gateway Infrastructure - Research

**Researched:** 2026-04-21
**Domain:** Runtime feature flag system with scoped hierarchy resolution, Axum middleware, React Query integration
**Confidence:** HIGH

## Summary

This phase builds a three-ring feature gateway for the AlgoMaster Online Judge: a `feature_registry` catalog, a `feature_flags` override table with four-tier scope precedence (class > grade > campus > global > default), an Axum middleware guard that returns 404 for disabled features, and admin/teacher management UIs. The existing `FEATURE_FLAGS` static object in `services/config.ts` (env-var-driven, 2 flags) is replaced entirely by a new `services/featureGateway.ts` that resolves state asynchronously from the backend API via React Query.

The backend implementation lives in `api-infra` (alongside existing middleware, state, and RBAC) since it is cross-cutting infrastructure consumed by all domain routers. The `DashMap` crate (already a dependency of `api-infra` at v6) provides the in-process cache for sub-millisecond resolution. Write-triggered invalidation uses `DashMap::remove()` on the affected cache key after successful flag mutations, with a 60-second TTL safety fallback.

**Primary recommendation:** Implement feature gateway as a new `feature_gateway` module inside `api-infra`, expose a `FeatureGatewayService` trait for testability, and use an Axum `from_fn_with_state` middleware matching the existing `authz.rs` pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Three-ring model: Ring A (global master control), Ring B (tenant hierarchy scope resolution), Ring C (capability-level feature slugs). Treat as separate concerns in data model and service API.
- **D-02:** Scope hierarchy: `global > campus > grade > class > default`. Resolution searches from most specific configured scope upward.
- **D-03:** Resolution precedence: `class > grade > campus > global > default`. Return both `effective_enabled` and `inherited_from`.
- **D-04:** Global master switch is hard system control, not overridable by lower scopes. Evaluate master control before any scoped lookup.
- **D-05:** Normal feature flags remain overridable within scope hierarchy. Only master control is hard.
- **D-06:** Permission boundary: root=global+campus, campusAdmin=campus+grade, gradeAdmin=grade, teacher=class. API CRUD must validate role and scope level before writes.
- **D-07:** Teachers view inherited states above class level but can only mutate class-level overrides.
- **D-08:** Disabled gated backend capabilities return 404, not 403.
- **D-09:** Frontend hides/disables feature entry points, shows inherited-state indicators where relevant.
- **D-10:** In-process cache + write-triggered invalidation; TTL is safety fallback only.
- **D-11:** `FEATURE_GATEWAY_ENABLED=false` env var treats all gated capabilities as disabled, performs no DB queries. Returns source as `system_emergency_off`.
- **D-12:** Phase 11 focuses on architecture, persistence, resolution, permissions, and control surfaces only. No speculative integration adapters.
- **D-13:** Replace `FEATURE_FLAGS` static object entirely. New `services/featureGateway.ts` calls gateway API. `VITE_ENABLE_DIRECT_MESSAGES` and `VITE_ENABLE_PLAGIARISM` deprecated. Consumers: App.tsx, Sidebar.tsx, AdminLayout.tsx, AdminDashboard.tsx, config.ts.
- **D-14:** Feature gate as Axum middleware layer, after auth+tenant, before handler. Routes declare `.feature_gate("slug")` at registration. Returns 404 if disabled.
- **D-15:** Two pages: `/admin/features` (global + scoped overrides) and `/teacher/features` (class-level only with inherited-from indicators).
- **D-16:** Migration inserts 5 seed features (direct_messages, plagiarism, discussions, blog, leaderboard) with `default_enabled=true`. Frontend env vars deprecated. `FEATURE_GATEWAY_ENABLED` retained.

### Claude's Discretion
- Exact table column names as long as they preserve locked semantics
- Whether global master control is stored in registry/flag tables or dedicated settings path
- Cache key shape and invalidation transport inside single-process vs multi-process deployment
- UI component decomposition for admin and teacher pages
- Exact React Query key structure for frontend feature flag cache
- Whether feature_gate middleware uses an extractor or a Layer wrapper

### Deferred Ideas (OUT OF SCOPE)
- Phase 12 AI analysis capability wiring and AI-specific feature-slug rollout
- Assignment-level scope controls (hierarchy stops at class)
- Broader pre-integration of dormant modules
- Feature flag audit logging (who changed what, when)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FGW-01 | `feature_registry` table -- canonical feature catalog (id, slug, name, description, default_enabled, category) | Schema design in Architecture Patterns section; migration #035 |
| FGW-02 | `feature_flags` table -- runtime overrides at global/campus/grade/class scope with precedence resolution | Schema design in Architecture Patterns section; resolution algorithm documented |
| FGW-03 | Feature Gateway service -- query API resolves flag state for (feature_slug + campus_id + optional grade_id/class_id), respecting 3-ring precedence | Service pattern in Architecture Patterns; cache design in Don't Hand-Roll |
| FGW-04 | Admin API endpoints -- CRUD for feature flags at each scope level with role-bound authorization | Authorization model maps to D-06; middleware pattern from authz.rs |
| FGW-05 | Teacher dashboard page -- browse features, toggle per class with inherited-from indicators | Frontend patterns from Sidebar.tsx, AdminLayout.tsx spread pattern |
| FGW-06 | Application-side guard macro/trait -- lightweight `FeatureGate` checker returns 404 when disabled | Axum middleware pattern from authz.rs; `feature_gate(slug)` declarative registration |
| FGW-07 | Emergency-off path -- `FEATURE_GATEWAY_ENABLED=false` bypasses all flag checks, treats everything as disabled, no DB queries | Config pattern from config.rs env var handling |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| DashMap | 6.0 | In-process concurrent cache for resolved feature state | Already in api-infra; lock-free concurrent HashMap, ideal for read-heavy cache |
| sqlx | 0.8 | PostgreSQL queries for registry and flag CRUD | Existing workspace dependency; compile-time checked queries |
| axum | 0.7 | Middleware layer for feature_gate | Existing framework; `from_fn_with_state` pattern matches authz.rs |
| serde | 1.0 | Serialization of feature models | Existing workspace dependency |
| TanStack React Query | ^5.90 | Frontend async feature flag state management | Already in frontend; provides caching, refetching, stale-while-revalidate |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chrono | 0.4 | Timestamp columns (created_at, updated_at) | Feature flag audit timestamps |
| uuid | 1.11 | Feature registry primary keys | Already in workspace |
| zod | ^4.3 | Frontend form validation for admin/teacher feature toggles | Already in frontend for react-hook-form |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DashMap (in-process) | Redis cache | Redis adds network hop (~1-5ms); DashMap is lock-free and sub-microsecond. Redis only needed if multi-process deployment emerges. |
| Axum middleware | Handler-level guard macro | Middleware is declarative at route registration (D-14), impossible to forget. Handler guards require per-function boilerplate. |
| New `services/featureGateway.ts` | Keep `FEATURE_FLAGS` with API overlay | Dual source of truth causes drift. Clean replacement per D-13 is simpler. |
| Separate workspace crate | Module inside api-infra | Feature gateway is cross-cutting infra (like RBAC), not a domain. api-infra already hosts middleware, state, config. |

**Installation:**
```bash
# No new crate dependencies needed -- all already in workspace
# DashMap already in api-infra/Cargo.toml at v6
# TanStack Query already in frontend/package.json at ^5.90
```

**Version verification:** All core dependencies verified from existing Cargo.toml and package.json files. [VERIFIED: project Cargo.toml, package.json]

## Architecture Patterns

### Recommended Project Structure

```
backend/api-infra/src/
├── feature_gateway/
│   ├── mod.rs          # Re-exports public types + service trait
│   ├── models.rs       # FeatureRegistry, FeatureFlag, ResolvedState structs
│   ├── service.rs      # FeatureGatewayService implementation (cache + DB)
│   ├── routes.rs       # Admin CRUD endpoints for feature flags
│   └── middleware.rs    # feature_gate(slug) Axum middleware function
├── middleware/
│   ├── mod.rs
│   ├── auth.rs         # Existing
│   ├── authz.rs        # Existing -- pattern to follow
│   ├── tenant.rs       # Existing -- provides TenantContext
│   └── feature_gate.rs # NEW -- thin wrapper importing from feature_gateway/
└── state.rs            # Existing -- add feature_gateway: Arc<dyn FeatureGatewayService>

backend/api/migrations/
├── 035_create_feature_gateway.sql   # feature_registry + feature_flags tables + seed data

frontend/src/
├── services/
│   ├── featureGateway.ts           # NEW -- gateway API client + React Query hooks
│   └── config.ts                   # MODIFIED -- remove FEATURE_FLAGS (D-13)
├── hooks/
│   └── useFeatureGate.ts           # NEW -- useFeatureEnabled(slug) hook
├── pages/admin/
│   └── FeatureManagement.tsx        # NEW -- /admin/features page (D-15)
├── pages/teacher/
│   └── ClassFeatureSettings.tsx     # NEW -- /teacher/features page (D-15)
├── components/layout/
│   └── Sidebar.tsx                  # MODIFIED -- replace FEATURE_FLAGS with hook
└── layouts/
    └── AdminLayout.tsx              # MODIFIED -- replace FEATURE_FLAGS with hook
```

### Pattern 1: Feature Resolution with Cache

**What:** `FeatureGatewayService` resolves a feature slug in a given scope context, checking cache first, then DB with hierarchical fallback.

**When to use:** Every request that hits a feature-gated route.

**Example:**
```rust
// Source: [VERIFIED: api-infra/src/middleware/authz.rs pattern]
pub struct ResolvedFeature {
    pub enabled: bool,
    pub source: FeatureSource,
}

pub enum FeatureSource {
    Default,
    GlobalOverride,
    CampusOverride,
    GradeOverride,
    ClassOverride,
    SystemEmergencyOff,
}

pub struct FeatureGatewayService {
    db_pool: PgPool,
    cache: Arc<DashMap<String, ResolvedFeature>>,
    enabled: bool,  // from FEATURE_GATEWAY_ENABLED env var
}

impl FeatureGatewayService {
    /// Cache key format: "{slug}:{scope}" where scope is one of:
    /// "global", "campus:{id}", "grade:{id}", "class:{id}"
    fn cache_key(slug: &str, scope: &str) -> String {
        format!("{}:{}", slug, scope)
    }

    /// Resolve feature state for a given context.
    /// Resolution order: class > grade > campus > global > default
    pub async fn resolve(
        &self,
        slug: &str,
        campus_id: Option<i64>,
        grade_id: Option<i64>,
        class_id: Option<i64>,
    ) -> ResolvedFeature {
        // D-11: Emergency-off short-circuit (no DB queries)
        if !self.enabled {
            return ResolvedFeature { enabled: false, source: FeatureSource::SystemEmergencyOff };
        }

        // Check class-level cache
        if let Some(class_id) = class_id {
            let key = Self::cache_key(slug, &format!("class:{}", class_id));
            if let Some(cached) = self.cache.get(&key) {
                return cached.value().clone();
            }
        }

        // DB resolution: query feature_flags in order class > grade > campus > global
        // SELECT enabled, scope FROM feature_flags
        // WHERE feature_slug = $1 AND (
        //   (scope = 'class' AND scope_id = $2) OR
        //   (scope = 'grade' AND scope_id = $3) OR
        //   (scope = 'campus' AND scope_id = $4) OR
        //   (scope = 'global' AND scope_id IS NULL)
        // ) ORDER BY CASE scope WHEN 'class' THEN 1 WHEN 'grade' THEN 2
        //   WHEN 'campus' THEN 3 WHEN 'global' THEN 4 END LIMIT 1

        // Fallback to feature_registry.default_enabled if no override found
        // SELECT default_enabled FROM feature_registry WHERE slug = $1

        // Cache result and return
        todo!()
    }

    /// Invalidate cache entries affected by a flag write at given scope.
    pub fn invalidate(&self, slug: &str, scope: &str) {
        self.cache.remove(&Self::cache_key(slug, scope));
    }
}
```

### Pattern 2: Axum Middleware for Feature Gate

**What:** Declarative middleware applied at route registration time, matching the existing `require_permission` pattern in `authz.rs`.

**When to use:** On every route that should be feature-gated.

**Example:**
```rust
// Source: [VERIFIED: api-infra/src/middleware/authz.rs -- same closure-over-capture pattern]
use shared::models::Claims;
use crate::feature_gateway::FeatureGatewayService;

/// Feature gate middleware -- returns 404 if feature is disabled (D-08).
/// Accesses TenantContext from request extensions for scope resolution.
pub fn feature_gate(
    slug: &'static str,
    gateway: Arc<dyn FeatureGatewayService>,
) -> impl Fn(
    axum::extract::Request,
    axum::middleware::Next,
) -> std::pin::Pin<
    Box<dyn std::future::Future<Output = Result<axum::response::Response, axum::http::StatusCode>> + Send>,
> + Clone {
    move |req: axum::extract::Request, next: axum::middleware::Next| {
        let gateway = gateway.clone();
        Box::pin(async move {
            // Extract TenantContext (inserted by tenant middleware)
            let tenant_ctx = req.extensions().get::<crate::middleware::tenant::TenantContext>();
            let campus_id = tenant_ctx.map(|c| c.campus_id).flatten();
            let grade_id = tenant_ctx.map(|c| c.grade_id).flatten();

            let resolved = gateway.resolve(slug, campus_id, grade_id, None).await;
            if resolved.enabled {
                Ok(next.run(req).await)
            } else {
                Err(axum::http::StatusCode::NOT_FOUND)  // D-08: 404, not 403
            }
        })
    }
}

// Usage at route registration (D-14):
// .route_layer(axum::middleware::from_fn(feature_gate("plagiarism", gateway.clone())))
```

### Pattern 3: Frontend Feature Gateway Service

**What:** React Query-based service that fetches feature states from the backend API, replacing the static `FEATURE_FLAGS` object.

**When to use:** In all components that currently import `FEATURE_FLAGS` from `services/config.ts`.

**Example:**
```typescript
// services/featureGateway.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'

export interface FeatureState {
  slug: string
  enabled: boolean
  source: 'default' | 'global' | 'campus' | 'grade' | 'class' | 'system_emergency_off'
}

export interface FeatureRegistryEntry {
  id: string
  slug: string
  name: string
  description: string
  default_enabled: boolean
  category: string
}

const FEATURE_QUERY_KEY = ['features']

export function useFeatureEnabled(slug: string): { enabled: boolean; isLoading: boolean } {
  const { data: features, isLoading } = useQuery({
    queryKey: [...FEATURE_QUERY_KEY, 'resolved'],
    queryFn: async () => {
      const { data } = await api.get('/features/resolved')
      return data as Record<string, FeatureState>
    },
    staleTime: 60_000, // 1 minute stale-while-revalidate
    retry: 1,
  })

  return {
    enabled: features?.[slug]?.enabled ?? true, // D-13: fail-open for UX
    isLoading,
  }
}

export function useFeatureRegistry() {
  return useQuery({
    queryKey: [...FEATURE_QUERY_KEY, 'registry'],
    queryFn: async () => {
      const { data } = await api.get('/features/registry')
      return data as FeatureRegistryEntry[]
    },
    staleTime: 5 * 60_000,
  })
}
```

### Pattern 4: Scope Precedence Resolution SQL

**What:** Single SQL query that fetches the most specific override for a feature in one round-trip.

**When to use:** In `FeatureGatewayService::resolve()` when cache misses.

**Example:**
```sql
-- Fetch most specific override (if any) for a feature in given context
-- Returns NULL if no override exists (use registry default_enabled)
SELECT ff.enabled, ff.scope
FROM feature_flags ff
WHERE ff.feature_slug = $1
  AND (
    (ff.scope = 'class' AND ff.scope_id = $2)
    OR (ff.scope = 'class' IS NOT TRUE AND ff.scope = 'grade' AND ff.scope_id = $3)
    OR (ff.scope NOT IN ('class', 'grade') AND ff.scope = 'campus' AND ff.scope_id = $4)
    OR (ff.scope = 'global' AND ff.scope_id IS NULL)
  )
ORDER BY
  CASE ff.scope
    WHEN 'class' THEN 1
    WHEN 'grade' THEN 2
    WHEN 'campus' THEN 3
    WHEN 'global' THEN 4
  END
LIMIT 1;

-- $1 = slug, $2 = class_id (nullable), $3 = grade_id (nullable), $4 = campus_id (nullable)
-- If row returned: use ff.enabled, source = ff.scope
-- If no row: query feature_registry.default_enabled, source = 'default'
```

### Anti-Patterns to Avoid
- **Storing master control in feature_flags table:** Master control is a system-level switch, not a per-feature flag. Use the `FEATURE_GATEWAY_ENABLED` env var (D-11) for this, not a DB row.
- **Feature-gating unprotected routes:** Health, metrics, and worker-heartbeat endpoints must never be feature-gated. Only routes inside the protected_router get gates.
- **Frontend-only gating:** Backend must always enforce the gate (D-08). Frontend hiding is UX only; a direct API call should still get 404.
- **Cache without invalidation:** Every flag write (POST/PATCH/DELETE on feature_flags) must invalidate the affected cache key. TTL-only caching creates confusing state drift.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| In-process concurrent cache | Custom `Mutex<HashMap>` | `DashMap` (already in api-infra v6) | Lock-free, sharded, battle-tested for read-heavy workloads |
| Feature flag resolution hierarchy | Manual if/else chain per scope | Single parameterized SQL with ORDER BY + LIMIT 1 | Fewer round-trips, declarative, less error-prone |
| Frontend async state for flags | `useState` + `useEffect` + manual fetch | TanStack React Query `useQuery` | Built-in caching, deduplication, stale-while-revalidate, retry |
| Form validation for admin UI | Manual `if (value === ...)` checks | `zod` schemas (already in frontend v4.3) | Type-safe, composable, reusable validation |
| Axum middleware pattern | Custom tower::Service implementation | `axum::middleware::from_fn` closure (matching authz.rs) | Existing pattern, already understood by codebase |

**Key insight:** The feature gateway domain is straightforward enough that standard library primitives (DashMap, sqlx, axum middleware) cover all needs. There is no credible case for introducing an external feature flag SaaS SDK (LaunchDarkly, Unleash) -- this is an educational OJ, not a multi-region SaaS product.

## Common Pitfalls

### Pitfall 1: Scope ID Confusion Between tenant_id, campus_id, and organization_id
**What goes wrong:** Feature flags are stored with `scope_id` referencing the wrong entity. The codebase uses `school_id` (= `organization_id`) for tenant, but `campus_id` and `grade_id` as separate fields.
**Why it happens:** The project has evolved from single-tenant to multi-tenant. `TenantContext` carries `tenant_id`, `campus_id`, and `grade_id` as separate fields.
**How to avoid:** Use explicit scope types (enum `Scope { Global, Campus, Grade, Class }`) and always pair with `scope_id: Option<i64>`. Validate scope_id is non-null for non-Global scopes.
**Warning signs:** Any SQL query that does not check `scope_id IS NOT NULL` for campus/grade/class levels.

### Pitfall 2: FEATURE_FLAGS Import Remnants After Migration
**What goes wrong:** After D-13 migration, some files still import `FEATURE_FLAGS` from `services/config.ts` and get `undefined`.
**Why it happens:** The grep shows 5 consumer files (App.tsx, Sidebar.tsx, AdminLayout.tsx, AdminDashboard.tsx, config.ts) with 13 total references. Missing even one causes silent failures.
**How to avoid:** Run `grep -r "FEATURE_FLAGS" frontend/src/` after migration as a verification step. The old `FEATURE_FLAGS` export should be deleted entirely.
**Warning signs:** TypeScript errors about missing import, or features that never appear in the UI despite being enabled in the DB.

### Pitfall 3: Caching class_id Without a class_id Source
**What goes wrong:** The middleware resolves features at class scope, but `class_id` is not available in `TenantContext` (it only has `tenant_id`, `campus_id`, `grade_id`).
**Why it happens:** `TenantContext` is populated from JWT claims, which do not include class_id. Class context comes from URL path params (e.g., `/classes/{id}/...`), not from the auth token.
**How to avoid:** Feature gate middleware should only resolve at campus/grade scope by default. Class-level resolution requires either: (a) a `class_id` path parameter extractor, or (b) explicit per-class query from the frontend. The teacher feature page queries flags per-class via API, not via the route-level middleware.
**Warning signs:** Middleware trying to read class_id from TenantContext and getting None.

### Pitfall 4: Emergency-Off Env Var Not Reloaded Without Restart
**What goes wrong:** Operator sets `FEATURE_GATEWAY_ENABLED=false` but the API process has already cached the value as `true`.
**Why it happens:** The env var is read once at startup and stored in the service struct.
**How to avoid:** This is acceptable per D-11 ("immediately disables" means the env var is checked on every request, not cached). Read the env var from the service on each `resolve()` call, or use `std::sync::OnceLock` with a check on each invocation. The simplest approach: store `enabled: bool` in the service and set it from env at construction time. Changing it requires restart, which is standard for env-var-based emergency controls.
**Warning signs:** Tests that mock the env var mid-process and expect different behavior.

### Pitfall 5: Sidebar NavItems Array is Module-Level Const
**What goes wrong:** `Sidebar.tsx` defines `navItems` as a `const` array outside the component, which includes `FEATURE_FLAGS.directMessages` in a spread. This spread executes once at module load time and cannot be reactive.
**Why it happens:** Static feature flags were synchronous and evaluated at import time. The new gateway API is async.
**How to avoid:** Move the FEATURE_FLAGS-dependent nav items inside the component function body, or use the `useFeatureEnabled` hook to filter items reactively. The current pattern must change from:
```typescript
const navItems = [
  ...,
  ...(FEATURE_FLAGS.directMessages ? [{ label: 'Messages', ... }] : []),
]
```
to a filtered array inside the component that uses the hook result.

## Code Examples

### Verified Pattern: Axum Middleware Closure (from existing codebase)
```rust
// Source: [VERIFIED: backend/api-infra/src/middleware/authz.rs lines 20-51]
pub fn require_permission(
    required_permission: Permission,
) -> impl Fn(Request, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Response, StatusCode>> + Send>> + Clone {
    move |req: Request, next: Next| {
        Box::pin(async move {
            let claims = match req.extensions().get::<Claims>() {
                Some(claims) => claims.clone(),
                None => return Err(StatusCode::UNAUTHORIZED),
            };
            // ... check and proceed
        })
    }
}
```
This exact pattern (closure returning pinned boxed future, Clone, extracting from request extensions) must be followed for `feature_gate()`.

### Verified Pattern: DashMap Usage in AppState
```rust
// Source: [VERIFIED: backend/api-infra/src/state.rs line 39]
pub preview_cache: Arc<PreviewCache>,  // where PreviewCache = DashMap<Uuid, Box<dyn Any + Send + Sync>>
```
`DashMap` is already wrapped in `Arc` and stored in `AppState`. The feature gateway cache follows the same pattern.

### Verified Pattern: Frontend Route Gating
```typescript
// Source: [VERIFIED: frontend/src/App.tsx lines 142-144, 172-180]
{FEATURE_FLAGS.directMessages && (
  <Route path="messages" element={renderLazy(DirectMessages)} />
)}
```
This pattern changes to use `useFeatureEnabled('direct_messages')` inside a component wrapper or conditional rendering.

### Verified Pattern: Sidebar NavItem Spread
```typescript
// Source: [VERIFIED: frontend/src/components/layout/Sidebar.tsx line 24]
...(FEATURE_FLAGS.directMessages ? [{ label: 'Messages', path: '/messages', icon: 'mail' }] : []),
```
Must be refactored to use hook-driven filtering inside the component.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static `FEATURE_FLAGS` object from env vars | Runtime API-resolved flags via React Query | This phase (Phase 11) | Async loading, scoped resolution, admin toggles |
| Hardcoded route visibility | Declarative `.feature_gate(slug)` middleware | This phase | Impossible to forget guards, centralized 404 behavior |
| Env-var-only feature control | DB-backed registry + env-var emergency-off | This phase | Granular per-scope control with instant rollback |
| No feature flag caching | DashMap in-process cache + write-triggered invalidation | This phase | Sub-millisecond resolution per D-10/FGW-03 |

**Deprecated/outdated (for this phase):**
- `VITE_ENABLE_DIRECT_MESSAGES` -- replaced by gateway API [D-16]
- `VITE_ENABLE_PLAGIARISM` -- replaced by gateway API [D-16]
- `FEATURE_FLAGS` static object in `services/config.ts` -- deleted entirely [D-13]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DashMap v6 supports `get` + `remove` + `insert` API as documented | Standard Stack | LOW -- DashMap is stable, verified in Cargo.lock |
| A2 | `feature_gate` middleware can use `from_fn` pattern with `Arc<dyn FeatureGatewayService>` shared state | Architecture Patterns | LOW -- same pattern used by auth middleware with `AppState` |
| A3 | The next migration number is 035 (after 034) | Architecture Patterns | LOW -- verified from `ls` of migrations directory |
| A4 | Frontend `useQuery` is already configured with a `QueryClient` in App.tsx | Standard Stack | LOW -- verified from App.tsx structure |
| A5 | Feature resolution at class scope does not need middleware-level class_id from TenantContext | Common Pitfalls #3 | MEDIUM -- confirmed by reading TenantContext struct which has no class_id field. Teacher pages must query per-class via API |

## Open Questions

1. **Should feature flags be workspace-scoped or global-scoped?**
   - What we know: The project is multi-tenant. Feature flags at global scope apply to all tenants.
   - What's unclear: Should each tenant (organization) have independent global overrides, or is "global" truly system-wide?
   - Recommendation: "global" is system-wide (only Root can set it). Campus/grade/class overrides are per-tenant. This matches D-06 where Root = global+campus.

2. **How should the frontend handle the initial loading state before feature flags resolve?**
   - What we know: React Query starts in `isLoading` state. Routes gated by features would briefly not render.
   - What's unclear: Should features default to enabled (fail-open) during load, or show nothing until resolved?
   - Recommendation: Fail-open (show features as enabled during load). This matches D-13 guidance and avoids layout shift. Backend 404 provides security enforcement regardless of frontend state.

## Environment Availability

> Step 2.6: SKIPPED (no new external dependencies identified -- all tools and libraries are already installed in the project workspace)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | cargo test (backend) + vitest (frontend) |
| Config file | None (cargo default + vitest.config.ts) |
| Quick run command | `cargo test -p api-infra -- feature_gateway` |
| Full suite command | `cargo test --workspace` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FGW-01 | Registry table created, seed data inserted | unit | `cargo test -p api -- test_feature_registry_migration` | No -- Wave 0 |
| FGW-02 | Flag table created, scope precedence works | unit | `cargo test -p api-infra -- test_feature_flags_resolution` | No -- Wave 0 |
| FGW-03 | Gateway service resolves correct state | unit | `cargo test -p api-infra -- test_gateway_resolve` | No -- Wave 0 |
| FGW-04 | Admin CRUD endpoints respect role/scope | unit + integration | `cargo test -p api -- test_feature_flag_crud` | No -- Wave 0 |
| FGW-05 | Teacher page renders feature list with state | unit (vitest) | `npx vitest run ClassFeatureSettings` | No -- Wave 0 |
| FGW-06 | Middleware returns 404 for disabled features | unit | `cargo test -p api-infra -- test_feature_gate_middleware` | No -- Wave 0 |
| FGW-07 | Emergency-off env var disables all features | unit | `cargo test -p api-infra -- test_emergency_off` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cargo test -p api-infra -- feature_gateway` (backend) + `npx vitest run --reporter=verbose` (frontend)
- **Per wave merge:** `cargo test --workspace` + `cd frontend && npx vitest run`
- **Phase gate:** Full workspace test suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend/api-infra/src/feature_gateway/service.rs` -- unit tests for resolution logic
- [ ] `backend/api-infra/src/feature_gateway/middleware.rs` -- unit tests for 404 gate behavior
- [ ] `backend/api-infra/src/feature_gateway/routes.rs` -- unit tests for CRUD authorization
- [ ] `frontend/src/services/__tests__/featureGateway.test.ts` -- unit tests for hooks
- [ ] `frontend/src/pages/admin/__tests__/FeatureManagement.test.tsx` -- component tests
- [ ] `frontend/src/pages/teacher/__tests__/ClassFeatureSettings.test.tsx` -- component tests
- [ ] Framework install: not needed (cargo test + vitest already configured)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Feature gate middleware runs AFTER auth middleware (per D-14) |
| V3 Session Management | no | Not applicable to feature flags |
| V4 Access Control | yes | D-06 defines scope/role authorization for flag CRUD; enforced in routes.rs |
| V5 Input Validation | yes | Zod schemas for frontend forms; sqlx parameterized queries for backend |
| V6 Cryptography | no | Not applicable to feature flags |

### Known Threat Patterns for Feature Gateway

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized flag modification | Tampering | Role+scope validation on every write (D-06); SQL parameterized queries |
| Scope escalation (teacher modifying campus flags) | Elevation of Privilege | Server-side role check before accepting scope-level writes; never trust client-sent scope |
| Information disclosure via flag resolution API | Information Disclosure | Only return flags for the authenticated user's tenant scope; Root sees all |
| Denial of service via flag cache invalidation flood | Denial of Service | Rate limiting already applies (tower_governor at 30/min/IP); DashMap operations are O(1) |

## Project Constraints (from CLAUDE.md)

- **Tech Stack:** Rust backend (Axum), React frontend, PostgreSQL + Redis -- no changes needed
- **Compatibility:** Must maintain existing API contracts -- new `/features/*` endpoints are additive, not breaking
- **Database:** PostgreSQL only -- feature_registry and feature_flags are standard PostgreSQL tables
- **Immutability:** Create new objects for cache entries, never mutate cached `ResolvedFeature` in place
- **File size:** Target 200-400 lines per file, 800 max -- the feature_gateway module should be split across mod.rs, models.rs, service.rs, routes.rs, middleware.rs
- **Error handling:** Services return `anyhow::Result<T>`, routes convert to `AppError`
- **Parameterized queries:** All SQL uses `$1`, `$2` etc. -- never string interpolation
- **No console.log:** Frontend uses proper logging patterns
- **Module-per-domain:** Feature gateway is infrastructure (api-infra), following the same module pattern
- **Middleware ordering:** Feature gate goes after auth+tenant, before handler (D-14)

## Sources

### Primary (HIGH confidence)
- [VERIFIED: backend/api-infra/src/middleware/authz.rs] -- existing middleware pattern to replicate
- [VERIFIED: backend/api-infra/src/state.rs] -- AppState structure, DashMap usage pattern
- [VERIFIED: backend/api-infra/src/config.rs] -- env var loading pattern for FEATURE_GATEWAY_ENABLED
- [VERIFIED: backend/api-infra/src/middleware/tenant.rs] -- TenantContext structure with campus_id, grade_id
- [VERIFIED: backend/shared/src/models/role.rs] -- Role hierarchy (Root > CampusAdmin > GradeAdmin > Teacher)
- [VERIFIED: backend/shared/src/models/permission.rs] -- Permission enum
- [VERIFIED: backend/api/src/main.rs] -- protected_router structure, route registration pattern
- [VERIFIED: frontend/src/services/config.ts] -- current FEATURE_FLAGS to be replaced
- [VERIFIED: frontend/src/App.tsx] -- FEATURE_FLAGS usage in route definitions
- [VERIFIED: frontend/src/components/layout/Sidebar.tsx] -- FEATURE_FLAGS usage in navItems
- [VERIFIED: frontend/src/layouts/AdminLayout.tsx] -- FEATURE_FLAGS usage in admin navigation
- [VERIFIED: backend/Cargo.toml] -- workspace dependencies
- [VERIFIED: backend/api-infra/Cargo.toml] -- DashMap v6 already present
- [VERIFIED: frontend/package.json] -- TanStack Query v5.90 already present

### Secondary (MEDIUM confidence)
- [VERIFIED: .planning/STATE.md] -- Phase 11 status and project history
- [VERIFIED: .planning/config.json] -- nyquist_validation enabled, commit_docs enabled

### Tertiary (LOW confidence)
- None -- all findings verified against project source files

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies verified from existing Cargo.toml and package.json
- Architecture: HIGH -- patterns verified from existing codebase (authz.rs, tenant.rs, AppState)
- Pitfalls: HIGH -- scope confusion and Sidebar const pitfalls discovered via code inspection

**Research date:** 2026-04-21
**Valid until:** 30 days (stable domain, no external dependencies)
