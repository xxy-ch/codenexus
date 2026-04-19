# Phase 11: Feature Gateway Infrastructure - Context

**Gathered:** 2026-04-19
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

### the agent's Discretion
- Exact table column names as long as they preserve the locked semantics above
- Whether `global master control` is stored in registry/flag tables or a dedicated settings path, provided behavior remains a hard non-overridable control
- Cache key shape and invalidation transport inside a single-process vs multi-process deployment
- UI component decomposition for admin and teacher pages

</decisions>

<specifics>
## Specific Ideas

- Use the school-facing hierarchy language consistently: `global / campus / grade / class`.
- Surface inherited-state indicators clearly in management UI so operators know whether a state is local or inherited.
- Keep Phase 11 architecture-first; do not broaden into AI-specific routes or dormant capability adapters yet.

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

### Existing Frontend Integration Surface
- `frontend/src/pages/teacher/AssignmentReport.tsx` — current teacher reporting surface and a likely place for inherited-state UI patterns
- `frontend/src/pages/admin/SimilarityScanConfig.tsx` — existing admin configuration surface pattern

### Codebase Guidance
- `.planning/codebase/ARCHITECTURE.md` — current workspace/domain boundaries
- `.planning/codebase/CONVENTIONS.md` — established backend/frontend organization patterns
- `.planning/codebase/STRUCTURE.md` — current file/module layout

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/api/src/main.rs`: central protected-router assembly where a feature-gated domain router or middleware hook can be introduced without disturbing unrestricted infrastructure endpoints.
- `frontend/src/pages/teacher/AssignmentReport.tsx`: existing teacher-oriented summary page that already models aggregated class-facing data and can inform inherited-state UI treatment.
- `backend/api/src/plagiarism/routes.rs`: admin CRUD/report route pattern suitable as a reference for future feature-management endpoints.

### Established Patterns
- Backend domains are mounted as nested routers from `backend/api/src/main.rs`, with auth and tenant middleware already applied at the protected router layer.
- Frontend teacher/admin capability surfaces already exist as dedicated pages rather than ad hoc widgets.
- Admin/internal operational behavior already uses environment-based control paths in other areas, which makes the emergency-off pattern a natural fit.

### Integration Points
- New feature gateway backend surface should plug into protected API routing, not unrestricted health/worker-heartbeat routes.
- Teacher-facing feature controls should align with existing class/reporting surfaces rather than invent a separate governance UX model.
- Guard resolution must be cheap enough for route-path usage and must fail safely when the gateway is disabled.

</code_context>

<deferred>
## Deferred Ideas

- Phase 12 AI analysis capability wiring and any AI-specific feature-slug rollout
- Assignment-level scope controls from the earlier draft hierarchy; current locked hierarchy stops at `class`
- Broader pre-integration of dormant modules just to prove the gateway abstraction

</deferred>

---

*Phase: 11-feature-gateway-infrastructure*
*Context gathered: 2026-04-19*
