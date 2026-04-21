# Phase 11: Feature Gateway Infrastructure - Context

**Gathered:** 2026-04-19
**Updated:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a unified runtime feature gateway that supports the agreed three-ring model, persists feature definitions and scoped overrides, resolves effective feature state at runtime, and exposes admin/teacher control surfaces with inherited-state visibility. This phase establishes the architecture and operational contract only; it does not pre-wire Phase 12 AI analysis endpoints or broaden scope into dormant future integrations.

</domain>

<decisions>
## Implementation Decisions

### Three-Ring Model Definition
- **D-01:** The three-ring model is explicitly:
  - `Ring A`: global master control
  - `Ring B`: tenant hierarchy scope resolution
  - `Ring C`: capability-level feature slugs
  - **Why:** The roadmap text currently mixes scope and capability language. Locking the semantics here avoids schema/API ambiguity downstream.
  - **How to apply:** Treat master control, scope precedence, and per-feature capability registry as separate concerns in the data model and service API.

- **D-02:** Scope hierarchy is standardized to `global > campus > grade > class > default`.
  - **Why:** This matches the user's school deployment model better than the earlier `tenant / class / assignment` wording and gives a single vocabulary for all control surfaces.
  - **How to apply:** Resolution logic should search from most specific configured scope upward, with `default` coming from feature registry metadata.

### Resolution and Override Semantics
- **D-03:** Effective resolution precedence is `class > grade > campus > global > default`.
  - **Why:** The user standardized the hierarchy labels as `global > campus > grade > class > default`; for actual resolution, the nearest configured scope must win.
  - **How to apply:** Feature resolution API should accept the current campus/grade/class context and return both `effective_enabled` and `inherited_from`.

- **D-04:** The global master switch is a hard system control and is not overridable by lower scopes.
  - **Why:** This preserves a true emergency or rollout brake while still allowing ordinary scoped flags to stay flexible.
  - **How to apply:** Evaluate master control before any scoped lookup. If master is off, treat the feature gateway as disabled and short-circuit without DB resolution when the env-level emergency switch is also off.

- **D-05:** Normal feature flags remain overridable within the scope hierarchy; only the master control is hard.
  - **Why:** Teaching operations need local flexibility at grade/class level.
  - **How to apply:** Store scoped overrides independently from the master switch and resolve them only when the gateway is globally active.

### Authorization Boundary
- **D-06:** Permission boundary is locked as:
  - `root`: `global` and `campus`
  - `campusAdmin`: `campus` and `grade`
  - `gradeAdmin`: `grade`
  - `teacher`: `class`
  - **Why:** This matches the school's governance model and avoids over-delegating cross-campus authority. Updated for Phase 13 hierarchy (Root > CampusAdmin > GradeAdmin > Teacher).
  - **How to apply:** API CRUD endpoints must validate both role and requested scope level before accepting writes.

- **D-07:** Teachers can view inherited states above class level but can only mutate class-level overrides.
  - **Why:** Teachers need explainability, not cross-organization control.
  - **How to apply:** Teacher dashboard shows effective state plus inherited source, but only renders writable controls for class scope.

### Runtime Guard and UX Contract
- **D-08:** Disabled gated backend capabilities return `404`, not `403`.
  - **Why:** This is already required by FGW-06 and avoids advertising dormant capabilities.
  - **How to apply:** Route-level or handler-level gate checks should fail closed with `404`.

- **D-09:** Frontend should also hide or disable feature entry points and show inherited-state indicators where relevant.
  - **Why:** Backend-only gating is secure but creates confusing UX; the user accepted the default of synchronized UI behavior.
  - **How to apply:** UI reads effective flag state and inherited source from the gateway API, then hides unavailable actions while preserving management visibility.

### Performance and Invalidation
- **D-10:** Runtime reads use in-process cache plus write-triggered invalidation; TTL is only a safety fallback.
  - **Why:** FGW-03 has a sub-millisecond resolution target. Pure TTL would allow avoidable stale state after administrative changes.
  - **How to apply:** Cache resolved feature metadata and scoped override snapshots in the API process; invalidate on successful writes and use short TTL only as a backstop.

### Emergency-Off Behavior
- **D-11:** `FEATURE_GATEWAY_ENABLED=false` is a system emergency-off path that treats all gated capabilities as disabled and performs no DB queries.
  - **Why:** This is the roadmap contract in FGW-07 and provides a clean rollback path.
  - **How to apply:** Gateway service checks env state first. When false, it returns disabled immediately and marks source as `system_emergency_off`.

### Phase Boundary Discipline
- **D-12:** Phase 11 prioritizes architecture, persistence model, resolution service, permissions, and control surfaces only. It does not add speculative integration adapters or pre-connect future AI endpoints.
  - **Why:** The user explicitly wants Phase 11 to "把架构做好，不发散".
  - **How to apply:** Planning should focus on registry/flags schema, resolver, guard abstraction, admin/teacher UI surfaces, and cache/invalidation. Future consumers remain downstream work.

### Frontend Feature Flag Migration (2026-04-21)
- **D-13:** Replace the existing `FEATURE_FLAGS` static object in `services/config.ts` entirely. Create a new `services/featureGateway.ts` that calls the gateway API to resolve feature state at runtime. The existing env-var-driven `VITE_ENABLE_DIRECT_MESSAGES` and `VITE_ENABLE_PLAGIARISM` are deprecated — all feature state comes from DB via the gateway. Affected consumers: `App.tsx`, `Sidebar.tsx`, `AdminLayout.tsx`, `AdminDashboard.tsx`, `config.ts`.
  - **Why:** Static env-var flags cannot support scoped overrides. The gateway provides per-campus/grade/class resolution which env-vars fundamentally cannot deliver.
  - **How to apply:** New service provides async `useFeatureFlags()` hook (React Query) or a context provider. All existing `FEATURE_FLAGS.xxx` references are replaced with gateway-resolved state. Fallback to enabled when gateway is unavailable (fail-open for UX, fail-closed for security as per D-08).

### Backend Guard Integration (2026-04-21)
- **D-14:** Implement feature gate as an Axum middleware layer, placed after auth+tenant middleware and before the handler. Routes declare required feature slug at registration time (e.g., `.feature_gate("plagiarism")`). The middleware resolves the flag and returns 404 if disabled, without reaching the handler.
  - **Why:** Declarative middleware keeps business logic clean, centralizes the 404 behavior (D-08), and makes it impossible to forget a guard on gated routes.
  - **How to apply:** Add `feature_gate(slug)` as an Axum layer/route extension. The middleware accesses `TenantContext` from request extensions to resolve scope, calls the gateway service (cached), and short-circuits with 404 when disabled.

### Admin UI Layout and Routing (2026-04-21)
- **D-15:** Two separate pages:
  - `/admin/features` — Admin feature management page showing global + scoped overrides at all levels. Admins can toggle at global/campus/grade scope per D-06 permission boundary.
  - `/teacher/features` — Teacher feature management page showing only class-level toggles with inherited-from indicators per D-07. Teachers see effective state for their classes but can only override at class scope.
  - **Why:** Admin and teacher have fundamentally different scope visibility (D-06, D-07). Separate pages avoid conditional rendering complexity and match the existing `/admin` vs `/teacher` routing convention.
  - **How to apply:** `FeatureManagement.tsx` under `pages/admin/`, `ClassFeatureSettings.tsx` under `pages/teacher/`. Both consume the same gateway API but render different scope controls. Sidebar navigation updated to include the new entries.

### Seed Data and Environment Variable Transition (2026-04-21)
- **D-16:** Database migration inserts 5 seed features into `feature_registry` (direct_messages, plagiarism, discussions, blog, leaderboard), all with `default_enabled = true`. The frontend env vars `VITE_ENABLE_DIRECT_MESSAGES` and `VITE_ENABLE_PLAGIARISM` are deprecated — their consumers are migrated to gateway API calls. The backend `FEATURE_GATEWAY_ENABLED` env var is retained as the emergency-off path per D-11.
  - **Why:** Migration-based seeding ensures the registry is populated on first deploy. Deprecating env vars eliminates dual-source-of-truth confusion. Retaining the emergency-off env var preserves the FGW-07 rollback path.
  - **How to apply:** Add migration file with INSERT INTO feature_registry for the 5 features. Update frontend to remove FEATURE_FLAGS static object. Keep FEATURE_GATEWAY_ENABLED env check in gateway service.

### Claude's Discretion
- Exact table column names as long as they preserve the locked semantics above
- Whether `global master control` is stored in registry/flag tables or a dedicated settings path, provided behavior remains a hard non-overridable control
- Cache key shape and invalidation transport inside a single-process vs multi-process deployment
- UI component decomposition for admin and teacher pages
- Exact React Query key structure for frontend feature flag cache
- Whether feature_gate middleware uses an extractor or a Layer wrapper

</decisions>

<specifics>
## Specific Ideas

- Use the school-facing hierarchy language consistently: `global / campus / grade / class`.
- Surface inherited-state indicators clearly in management UI so operators know whether a state is local or inherited.
- Keep Phase 11 architecture-first; do not broaden into AI-specific routes or dormant capability adapters yet.
- Frontend migration should be a clean cut — no backwards compatibility with FEATURE_FLAGS once gateway is live.
- Admin feature page should show a matrix: features as rows, scopes as columns, with toggle indicators and inherited-from labels.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §Phase 11 — official FGW-01..07 requirements and success criteria
- `.planning/STATE.md` — confirms Phase 11 as the active planning focus
- `.planning/PROJECT.md` — school OJ product framing and organizational context
- `.planning/REQUIREMENTS.md` — broader platform constraints and governance baseline

### Existing Backend Integration Surface
- `backend/api/src/main.rs` — current router composition and where feature-gated domain routers/guards would attach
- `backend/api/src/plagiarism/routes.rs` — example admin-governed backend capability that may eventually consume gateway checks, without expanding Phase 11 scope
- `backend/domain-classes/src/service.rs` — class/assignment reporting data access patterns that inform teacher-side management surfaces
- `backend/api-infra/src/middleware/authz.rs` — existing RBAC middleware pattern to follow for feature_gate middleware

### Existing Frontend Integration Surface
- `frontend/src/services/config.ts` — current FEATURE_FLAGS object to be replaced (lines 51-54)
- `frontend/src/App.tsx` — FEATURE_FLAGS consumer (routes 142, 172, 175, 178)
- `frontend/src/components/layout/Sidebar.tsx` — FEATURE_FLAGS consumer (line 24)
- `frontend/src/layouts/AdminLayout.tsx` — FEATURE_FLAGS consumer (lines 15, 40)
- `frontend/src/pages/admin/AdminDashboard.tsx` — FEATURE_FLAGS consumer (lines 14, 54, 121)
- `frontend/src/pages/teacher/AssignmentReport.tsx` — existing teacher surface for inherited-state UI patterns
- `frontend/src/pages/admin/SimilarityScanConfig.tsx` — existing admin configuration surface pattern

### Codebase Guidance
- `.planning/codebase/ARCHITECTURE.md` — current workspace/domain boundaries
- `.planning/codebase/CONVENTIONS.md` — established backend/frontend organization patterns
- `.planning/codebase/STRUCTURE.md` — current file/module layout

### Prior Phase Context
- `.planning/phases/13-tenant-hierarchy-restructure/13-CONTEXT.md` — locked role hierarchy and scope model that D-06 depends on
- `.planning/phases/14-grade-scoped-data-model/14-CONTEXT.md` — grade_id propagation model for scope resolution context

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/api/src/main.rs`: central protected-router assembly where feature-gated middleware layer can be inserted without disturbing unrestricted infrastructure endpoints.
- `backend/api-infra/src/middleware/authz.rs`: existing RBAC middleware pattern — feature_gate middleware should follow the same extractor/layer conventions.
- `frontend/src/pages/teacher/AssignmentReport.tsx`: existing teacher-oriented summary page that models aggregated class-facing data — informs inherited-state UI treatment.
- `frontend/src/pages/admin/SimilarityScanConfig.tsx`: existing admin configuration surface pattern for reference.
- `frontend/src/services/config.ts`: current FEATURE_FLAGS to be replaced — provides the list of consumers to migrate.

### Established Patterns
- Backend domains are mounted as nested routers from `backend/api/src/main.rs`, with auth and tenant middleware already applied at the protected router layer.
- Frontend teacher/admin capability surfaces already exist as dedicated pages rather than ad hoc widgets.
- Frontend feature consumption uses direct import of FEATURE_FLAGS — this pattern shifts to async React Query or context provider.
- Admin/internal operational behavior already uses environment-based control paths, making the emergency-off pattern a natural fit.

### Integration Points
- New feature gateway backend surface plugs into protected API routing, not unrestricted health/worker-heartbeat routes.
- Feature_gate middleware must access `TenantContext` (tenant_id, campus_id, grade_id) from request extensions for scope resolution.
- Teacher-facing feature controls align with existing class/reporting surfaces rather than inventing a separate governance UX model.
- Frontend new `services/featureGateway.ts` must be consumed by all current FEATURE_FLAGS importers (5 files).
- New admin and teacher pages add routes to existing sidebar navigation.

</code_context>

<deferred>
## Deferred Ideas

- Phase 12 AI analysis capability wiring and any AI-specific feature-slug rollout
- Assignment-level scope controls from the earlier draft hierarchy; current locked hierarchy stops at `class`
- Broader pre-integration of dormant modules just to prove the gateway abstraction
- Feature flag audit logging (who changed what, when) — useful but not Phase 11 scope

</deferred>

---

*Phase: 11-feature-gateway-infrastructure*
*Context gathered: 2026-04-19*
*Context updated: 2026-04-21 — added D-13 through D-16 (frontend migration, backend guard, UI layout, seed data)*
