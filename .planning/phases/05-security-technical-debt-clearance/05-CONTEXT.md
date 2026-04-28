# Phase 5 Context — Security & Technical Debt Clearance

**Phase:** 5
**Created:** 2026-04-15
**Status:** Ready for Planning

---

## Prior Decisions (Carried Forward)

These decisions from prior phases remain binding:

- **D-01** `deny(warnings)` in CI
- **D-02** Push + PR trigger for GitHub Actions
- **D-03** Combined CI workflow with parallel jobs
- **D-04** Crate naming: `domain-*` prefix
- **D-05** Mirror current module structure (models.rs, service.rs, routes.rs per sub-module)
- **D-06** Cross-domain dependencies route through api-infra traits
- **D-07** CI-only verification (no manual smoke tests)
- **D-09** Normalize router signatures to `*_router() -> Router<AppState>`
- **D-11** Four separate domain crates (Phase 4)
- **D-12** SEC-03 org-scoped default, Root sees all (Phase 4)

---

## Phase 5 Decisions

### D-13: CORS — environment-aware, wildcard only in development

**Decision:** Keep environment distinction for CORS policy. Production mode requires explicit `CORS_ORIGINS` env var with specific origins. Development mode allows `*` wildcard for local debugging convenience.

**Rationale:** Current config in `api-infra/src/config.rs` already implements this distinction correctly. The main work is cleaning up the `main.rs` wildcard branch to make the logic clearer and adding documentation. Production enforcement is already in place via config tests.

**Implementation notes:**
- Verify `api-infra/src/config.rs` production mode rejects `*`
- Clean up `api/src/main.rs` CORS branch for clarity
- Ensure `CORS_ORIGINS` env var is documented in README/CLAUDE.md
- Add startup log warning if wildcard CORS is active

---

### D-14: SEC-05 scope — API only, judge-worker deferred to Phase 9

**Decision:** SEC-05 Redis connection pooling requirement applies only to the API server side. Judge-worker uses raw `redis::Client` and this is acceptable — it will be addressed in Phase 9 (Judge Concurrency) when the queue system is refactored.

**Rationale:** API server already uses `deadpool_redis::Pool` consistently after Phase 4 leaderboard normalization. Judge-worker is a standalone process that typically needs only 1-2 Redis connections — pooling provides minimal benefit. Phase 9's priority queue and health reporting work will naturally involve Redis refactoring.

**How to apply:** Verify API-side Redis pooling is complete. Mark SEC-05 as satisfied for API. Note judge-worker as Phase 9 scope.

---

### D-15: SEC-04 dead code — deep manual audit, not clippy-only

**Decision:** SEC-04 dead code removal requires a deep manual audit of all workspace crates, not just relying on clippy. Scan all `pub` functions, structs, constants, and enums that are not referenced by any other crate or used in tests.

**Rationale:** Clippy currently reports zero warnings, but SEC-04 mentions 26 dead code items. These likely include `pub` items that clippy doesn't flag (public items are assumed to be used externally). A manual audit ensures comprehensive cleanup.

**How to apply:**
- Delete `api/src/rbac/` module (dead re-export, no consumers)
- Audit each domain crate for unused `pub` items
- Check `api-infra` for unused exports
- Scan for `#[allow(dead_code)]` annotations — evaluate if they're still needed
- Verify no dead modules remain in `api/src/` after domain extraction

---

## Already-Resolved Work

### SEC-02 CORS — largely done

`api-infra/src/config.rs` already distinguishes production vs development:
- Production: reads `CORS_ORIGINS` env var, empty if unset, rejects `*`
- Development: defaults to `["*"]`

Remaining work: clean up `main.rs` wildcard branch, add documentation.

### SEC-05 Redis pooling — API side done

After Phase 4, all API-side code uses `Option<deadpool_redis::Pool>` from AppState:
- `domain-leaderboard/src/service.rs` — normalized in Phase 4
- `domain-submissions/src/queue.rs` — uses deadpool pool
- `api/src/redis/` — provides pool-based helpers

Remaining work: verify no regressions, document that judge-worker is Phase 9 scope.

---

## Code Context

### Known Dead Code Targets

| Target | Location | Status |
|--------|----------|--------|
| `api/src/rbac/mod.rs` | Re-exports `api_infra::rbac::*` with no consumers | Delete entirely |
| SEC-04 items (26 total) | Scattered across crates | Need manual audit |

### CORS Code Locations

| File | Lines | Content |
|------|-------|---------|
| `api-infra/src/config.rs:114-132` | CORS config loading | Environment-aware logic |
| `api/src/main.rs:96-125` | `create_router` CORS branch | Wildcard vs explicit origins |
| `api-infra/src/config.rs:267-327` | CORS config tests | Verify production/dev behavior |

### Redis Pooling Verification Points

| Crate | Current State |
|-------|---------------|
| `api/src/redis/` | Uses deadpool pool |
| `domain-submissions/src/queue.rs` | Uses deadpool pool |
| `domain-leaderboard/src/service.rs` | Uses deadpool pool |
| `judge-worker/` | Uses raw `redis::Client` — Phase 9 scope |

---

## Canonical References

### Project Planning
- `.planning/ROADMAP.md` Phase 5 section — scope, requirements, success criteria
- `.planning/REQUIREMENTS.md` — SEC-02, SEC-04, SEC-05

### Prior Phase Context
- `.planning/phases/04-domain-extraction-complex-submissions-contests-classes-leaderboard/04-CONTEXT.md` — Phase 4 decisions (D-11, D-12)

### Existing Code (audit targets)
- `api/src/rbac/mod.rs` — dead re-export module
- `api-infra/src/config.rs` — CORS configuration
- `api/src/main.rs` — CORS layer construction
- `api-infra/src/rbac/` — underlying rbac module (verify usage)

---

## Claude's Discretion

The following items are left to Claude's judgment during planning/execution:

- How to clean up the `main.rs` CORS wildcard branch (refactor vs replace)
- Exact method for auditing dead `pub` items across crates
- Whether `api-infra/src/rbac/` should also be removed (if no consumers remain after `api/src/rbac/` deletion)
- How to verify SEC-05 API-side completeness (code review vs metrics)
- Exact clippy flags for comprehensive dead code detection
- Whether to add `CORS_ORIGINS` documentation to README or config comments

---

## Deferred Ideas

- Judge-worker Redis connection pooling — deferred to Phase 9 (Judge Concurrency + Fault Tolerance)
- Production environment enforcement (`APP_ENV=production` secret checks) — Phase 1 scope (SEC-01, SEC-06)
