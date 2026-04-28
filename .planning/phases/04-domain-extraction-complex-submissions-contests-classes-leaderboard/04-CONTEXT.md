# Phase 4 Context — Domain Extraction: Complex (Submissions, Contests, Classes, Leaderboard)

**Phase:** 4
**Created:** 2026-04-15
**Status:** Context Gathered

---

## Prior Decisions (Carried Forward from Phases 2-3)

These decisions from `02-CONTEXT.md` and `03-CONTEXT.md` remain binding:

- **D-01** `deny(warnings)` in CI
- **D-02** Push + PR trigger for GitHub Actions
- **D-03** Combined CI workflow with parallel jobs
- **D-04** Crate naming: `domain-*` prefix
- **D-05** Mirror current module structure (models.rs, service.rs, routes.rs per sub-module)
- **D-06** Cross-domain dependencies route through api-infra traits
- **D-07** CI-only verification (no manual smoke tests)
- **D-09** Normalize router signatures to `*_router() -> Router<AppState>` (from Phase 3 search normalization)

---

## Phase 4 Decisions

### D-11: Four separate domain crates

**Decision:** Extract into 4 independent workspace crates: `domain-submissions`, `domain-contests`, `domain-classes`, `domain-leaderboard`.

**Rationale:** Consistent with D-04 convention and Phases 2-3 pattern. The leaderboard→classes dependency is resolved via api-infra trait per D-06, not by merging crates.

---

### D-12: SEC-03 leaderboard tenant fix — org-scoped default, Root sees all

**Decision:** `get_global_leaderboard` and `get_problem_leaderboard` filter by the requesting user's `organization_id` by default. Root and OrgAdmin roles bypass the filter and see all data.

**Rationale:** Matches ROADMAP SEC-03 spec exactly. Non-admin users should never see cross-tenant data. The fix adds `WHERE u.organization_id = $N` to both SQL queries, with a runtime bypass for elevated roles. The routes must change from `_claims: AuthExtractor` to `AuthExtractor(claims): AuthExtractor` to access the claims.

**Implementation notes:**
- `routes.rs:get_global_leaderboard` — change `_claims` to `AuthExtractor(claims)`, pass `claims.school_id` and `is_admin(&claims.role)` to service
- `routes.rs:get_problem_leaderboard` — same pattern
- `service.rs:get_global_leaderboard` — add `school_id: Option<i64>` parameter, inject `WHERE u.organization_id = $N` when Some
- `service.rs:get_problem_leaderboard` — add `school_id: Option<i64>` parameter, inject tenant filter
- Redis cache keys must include org scope: `leaderboard:global:{org_id}:{limit}:{offset}`

---

## Already-Resolved Dependencies

### leaderboard → classes — Resolved via api-infra trait (per D-06)

`leaderboard/routes.rs:3` imports `crate::classes::service::ClassService`. Used for:
- `get_class_leaderboard` (routes.rs:139): calls `ClassService.get_class_students(class_id)` to verify enrollment
- `get_campus_leaderboard` (routes.rs:90): instantiates ClassService but only uses raw SQL for org check (line 91-96)

**Resolution:** Define a `ClassMembershipChecker` trait in `api-infra` with `get_class_students(class_id)` method. Domain-classes implements it, domain-leaderboard depends on the trait.

### submissions → redis module — Resolved via direct redis dependency

`submissions/queue.rs:1` imports `crate::redis` for `create_stream` and `add_message` helpers. These are thin Redis operations.

**Resolution:** `domain-submissions` adds `redis` and `deadpool-redis` as direct dependencies (already in api/Cargo.toml). The `redis::create_stream` and `redis::add_message` functions are either duplicated in the domain crate (they're ~10 lines each) or extracted to `api-infra`.

### submissions/contests/classes — No cross-domain deps

No imports between these three modules. Clean extraction.

---

## Code Context

### Module sizes being extracted
| Module | Lines | Files |
|--------|-------|-------|
| `api/src/submissions/` | 1003 | mod.rs, models.rs, queue.rs, routes.rs, service.rs |
| `api/src/contests/` | 1044 | mod.rs, models.rs, routes.rs, service.rs |
| `api/src/classes/` | 1158 | mod.rs, models.rs, routes.rs, service.rs |
| `api/src/leaderboard/` | 1185 | mod.rs, models.rs, routes.rs, service.rs |
| **Total** | **4390** | **17 files** |

### Cross-module imports to resolve
| Source | Import | Resolution |
|--------|--------|------------|
| `leaderboard/routes.rs:3` | `crate::classes::service::ClassService` | → api-infra trait `ClassMembershipChecker` |
| `submissions/queue.rs:1` | `crate::redis` | → direct redis dependency or api-infra re-export |
| All modules | `crate::AppState` | → `api_infra::state::AppState` |
| All modules | `crate::middleware::auth::AuthExtractor` | → `api_infra::middleware::auth::AuthExtractor` |

### External references to Phase 4 modules
| Source | Reference | Action |
|--------|-----------|--------|
| `api/src/release_gate_tests.rs:2-5` | `use crate::classes; use crate::contests; use crate::leaderboard;` | → update to domain crate imports |
| `api/src/main.rs` | `.nest("/contests", contests::contests_router())` etc. | → domain crate re-exports |

### SEC-03 specific SQL locations
- `leaderboard/service.rs:54-100` — global leaderboard SQL, no tenant filter
- `leaderboard/service.rs:777-797` — problem leaderboard SQL, no tenant filter
- `leaderboard/routes.rs:39` — `_claims: AuthExtractor` (unused claims)
- `leaderboard/routes.rs:198` — `_claims: AuthExtractor` (unused claims)

---

## Canonical References

### Project Planning
- `.planning/ROADMAP.md` Phase 4 section — scope, requirements, success criteria
- `.planning/REQUIREMENTS.md` — ARCH-04 (remaining), ARCH-05 (remaining), SEC-03

### Prior Phase Context
- `.planning/phases/02-basic-ci-domain-extraction-core-users-problems/02-CONTEXT.md` — original extraction decisions
- `.planning/phases/03-domain-extraction-extended-community-search/03-CONTEXT.md` — normalization pattern (D-09)

### Existing Code (extraction sources)
- `api/src/submissions/` — mod.rs, models.rs, queue.rs, routes.rs, service.rs
- `api/src/contests/` — mod.rs, models.rs, routes.rs, service.rs
- `api/src/classes/` — mod.rs, models.rs, routes.rs, service.rs
- `api/src/leaderboard/` — mod.rs, models.rs, routes.rs, service.rs
- `api/src/main.rs` — router assembly (lines 148-157)
- `api/src/release_gate_tests.rs` — test imports referencing classes, contests, leaderboard

---

## Claude's Discretion

The following items are left to Claude's judgment during planning/execution:

- How to define the `ClassMembershipChecker` trait in api-infra (method signatures)
- Whether to duplicate `redis::create_stream`/`redis::add_message` in domain-submissions or extract to api-infra
- Exact SQL modifications for SEC-03 tenant filtering
- Whether cache key strategy changes for org-scoped global leaderboard
- Extraction order (which crate first, parallel waves)
- How to handle `LeaderboardService::new(pool, redis_url)` — this creates its own redis client per call; whether to normalize to use AppState's redis_pool
- Leaderboard's `is_admin()` and `is_teacher_plus()` helpers — keep inline or extract to shared role utilities

---

## Deferred Ideas

None — discussion stayed within phase scope.
