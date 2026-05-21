# Pitfalls Research: OJ Refactoring & Enhancement

**Researched:** 2026-04-13
**Scope**: Common mistakes when modularizing Rust/Axum OJ, migrating data, scaling concurrency

---

## 1. Rust Monolith Modularization Pitfalls

### Pitfall 1.1: Circular Dependencies in Workspace Crates
**Severity:** HIGH
**Warning signs:** Compiler error: "cyclic package dependency". Usually happens when domain A depends on domain B for a type, and B depends on A for a service call.
**Prevention:**
- Extract shared types into `shared` or `api-infra` crate
- Use trait-based dependency inversion: domain A defines trait, domain B implements it
- Map dependency directions BEFORE creating crates (see ARCHITECTURE.md Section 5)
**Phase to address:** Phase 1 (Architecture foundation)

### Pitfall 1.2: Loss of Compile-Time SQL Query Checking
**Severity:** MEDIUM
**Warning signs:** `sqlx::query!` fails to find migrations when moved to a new crate. Queries that were compile-time verified become runtime errors.
**Prevention:**
- Each domain crate needs its own `migrations/` directory reference OR
- Use `sqlx::query_as::<_, Row>("SQL")` with runtime checking during migration
- Add `sqlx::prepare` step to CI to catch query errors early
**Phase to address:** Phase 2+ (per domain extraction)

### Pitfall 1.3: Orphan Rule Violations
**Severity:** MEDIUM
**Warning signs:** "cannot define inherent `impl` for a type outside the crate where it is defined"
**Prevention:**
- Keep model structs in their owning domain crate
- Use `From`/`Into` for type conversions between domains instead of methods on foreign types
- Define conversion impls in the crate that OWNS the destination type
**Phase to address:** Phase 2+ (per domain extraction)

### Pitfall 1.4: Breaking Axum Router Composition
**Severity:** HIGH
**Warning signs:** Type mismatches when composing routers from different crates. Axum Router requires consistent State types.
**Prevention:**
- All domain routers must use the same `AppState` type from `api-infra`
- Domain routers return `Router<AppState>` (not generic `Router`)
- Use `Router::new()` in domain crate, merge in api binary
**Phase to address:** Phase 1 (Architecture foundation)

### Pitfall 1.5: Trait Object Overhead in Hot Paths
**Severity:** LOW
**Warning signs:** Performance regression in request handlers using `dyn Trait` for repository access.
**Prevention:**
- Trait object dispatch cost is ~5-10ns per call — negligible for I/O-bound web handlers
- Only use generics for CPU-bound hot paths (e.g., judging comparison logic)
- Benchmark before optimizing
**Phase to address:** Only if benchmarks show regression

---

## 2. MySQL to PostgreSQL Migration Pitfalls

### Pitfall 2.1: Data Type Mismatches
**Severity:** HIGH
**Warning signs:** Silent data truncation, charset corruption, or constraint violations during import.

| MySQL Type | PostgreSQL Equivalent | Gotcha |
|------------|----------------------|--------|
| `TINYINT(1)` | `BOOLEAN` or `SMALLINT` | MySQL TINYINT(1) is NOT always boolean |
| `MEDIUMTEXT` | `TEXT` | No issue, TEXT is unlimited in PG |
| `DATETIME` | `TIMESTAMPTZ` | PG stores UTC, MySQL may be local time |
| `INT AUTO_INCREMENT` | `SERIAL` or `BIGSERIAL` | Use BIGSERIAL for safety |
| `VARCHAR(20) COLLATE utf8mb4` | `VARCHAR(20)` | PG uses database-level collation |
| `MyISAM` tables | No equivalent | MyISAM has no FK constraints — verify data integrity manually |

**Prevention:**
- Build a type mapping table before writing migration code
- Test with a copy of production data first
- Add data validation checks (row counts, value ranges) after migration
**Phase to address:** Migration phase

### Pitfall 2.2: ID Mapping (Integer → UUID)
**Severity:** HIGH
**Warning signs:** Foreign key references break because source uses integer IDs but target uses UUIDs.
**Prevention:**
- Create a mapping table: `uoj_id_map(old_int_id, new_uuid, entity_type)`
- Migrate in dependency order: users → problems → submissions → contests
- Validate FK references after each entity migration
**Phase to address:** Migration phase

### Pitfall 2.3: Password Hashing Incompatibility
**Severity:** MEDIUM
**Warning signs:** Users can't log in after migration because password hashes use different algorithms.
**Prevention:**
- UOJ uses `md5(sha256(password))` or similar — NOT compatible with bcrypt
- Generate new random passwords for migrated users
- Force password reset on first login
- Send reset emails or distribute initial passwords via admin
**Phase to address:** Migration phase

### Pitfall 2.4: Character Encoding Issues
**Severity:** MEDIUM
**Warning signs:** Chinese characters appear as `???` or garbled text after migration.
**Prevention:**
- Source is `utf8mb4` — ensure PostgreSQL database is created with `ENCODING 'UTF8'`
- Test with sample data containing CJK characters, emoji, and special symbols
- Use `CLIENT_ENCODING = 'UTF8'` in migration connection
**Phase to address:** Migration phase

### Pitfall 2.5: Missing Foreign Key Constraints (MyISAM)
**Severity:** MEDIUM
**Warning signs:** Orphaned records after migration — submissions referencing non-existent problems.
**Prevention:**
- UOJ uses MyISAM which has NO foreign key enforcement
- Validate referential integrity BEFORE migration
- Log and quarantine orphaned records
- Decide policy: skip orphans or create placeholder parent records
**Phase to address:** Migration phase

---

## 3. High-Concurrency Queue Pitfalls

### Pitfall 3.1: Redis Streams Consumer Group Edge Cases
**Severity:** HIGH
**Warning signs:** Submissions stuck in "pending" state, never delivered to consumers.
**Prevention:**
- Implement `XPENDING` + `XCLAIM` for stale messages (consumer crashed without XACK)
- Set reasonable idle timeout (e.g., 5 minutes) before claiming pending messages
- Monitor pending message count as health metric
**Phase to address:** Judge concurrency phase

### Pitfall 3.2: Race Conditions in Scoreboard Computation
**Severity:** MEDIUM
**Warning signs:** Leaderboard shows wrong rankings during active contests with many submissions.
**Prevention:**
- Use PostgreSQL `SELECT ... FOR UPDATE` or optimistic locking for score updates
- Cache computed rankings, invalidate on new AC submission only
- Add a small delay before recomputing (debounce rapid submissions)
**Phase to address:** Contest enhancement phase

### Pitfall 3.3: Contest Timer Synchronization
**Severity:** MEDIUM
**Warning signs:** Timer drift between different users' browsers, causing fairness issues.
**Prevention:**
- Use server time as source of truth, NOT client clock
- API returns `ends_at` as absolute timestamp, frontend computes remaining time
- WebSocket sends periodic timer sync messages
- Reject submissions after contest end time (server-side check, not client-side)
**Phase to address:** Contest enhancement phase

### Pitfall 3.4: Queue Backpressure Starvation
**Severity:** MEDIUM
**Warning signs:** During contest start, normal submissions are never processed because contest submissions fill the queue.
**Prevention:**
- Use priority queues (separate Redis streams for contest vs normal)
- Reserve worker capacity for each queue (e.g., 3 contest workers + 1 normal)
- Set queue depth alerts
**Phase to address:** Judge concurrency phase

---

## 4. Frontend Refactoring Pitfalls

### Pitfall 4.1: Breaking API Contracts During Backend Changes
**Severity:** HIGH
**Warning signs:** Frontend shows errors after backend route changes. API endpoint paths or response shapes change without frontend updates.
**Prevention:**
- Maintain API versioning or backward-compatible changes
- Use contract tests (API response schema validation)
- Update frontend API services in the same commit as backend route changes
- During modularization, DON'T change API paths — only reorganize internal code
**Phase to address:** Every phase with API changes

### Pitfall 4.2: TanStack Query Cache Invalidation Issues
**Severity:** MEDIUM
**Warning signs:** Stale data showing in UI after mutations. New submission not appearing in list.
**Prevention:**
- Define clear query key hierarchy per domain (e.g., `['problems', id]`, `['submissions', 'list', filter]`)
- Use `queryClient.invalidateQueries()` with domain-level keys on mutations
- Don't over-invalidate — be precise about which queries are affected
**Phase to address:** Frontend restructuring phase

### Pitfall 4.3: State Management Fragmentation
**Severity:** LOW
**Warning signs:** Duplicate state in Zustand and TanStack Query. State sync issues.
**Prevention:**
- TanStack Query manages ALL server state (API data)
- Zustand manages ONLY client state (auth token, UI preferences, theme)
- Never duplicate API data in Zustand
**Phase to address:** Frontend restructuring phase

---

## 5. Multi-Tenant Security Pitfalls

### Pitfall 5.1: Tenant Isolation Regressions During Refactoring
**Severity:** CRITICAL
**Warning signs:** After moving code to a new crate, some queries no longer filter by `organization_id`.
**Prevention:**
- Every domain crate MUST accept `TenantContext` from middleware
- Add integration tests that verify cross-tenant data isolation for EVERY endpoint
- Use a shared helper function for tenant-filtered queries (e.g., `with_tenant(query, tenant_id)`)
- Security review after each domain extraction
**Phase to address:** Every phase (cross-cutting concern)

### Pitfall 5.2: New Endpoints Missing Tenant Filtering
**Severity:** CRITICAL
**Warning signs:** New import/export or migration endpoints accessible without tenant context.
**Prevention:**
- All new routes go through tenant middleware
- Admin-only endpoints still need tenant awareness (except Root role)
- Add tenant check to route handler checklist
**Phase to address:** Every phase with new endpoints

### Pitfall 5.3: Leaderboard Cross-Tenant Exposure (Existing Bug)
**Severity:** HIGH
**Warning signs:** `/global` and `/problem/:id` leaderboard endpoints show data from all organizations.
**Prevention:**
- Fix as part of leaderboard domain extraction
- Add tenant filtering to global leaderboard (show only user's org by default, admin can see all)
- Problem leaderboard should only show submissions from user's org
**Phase to address:** Leaderboard extraction phase

---

## 6. Testing Legacy Rust Code Pitfalls

### Pitfall 6.1: Tightly Coupled Handlers
**Severity:** MEDIUM
**Warning signs:** Can't test a route handler without spinning up a real database because the handler directly calls `sqlx::query()`.
**Prevention:**
- Extract repository layer first (even before full modularization)
- Handlers call service functions, service functions use repository trait
- Test handlers with mock services, test services with real DB
**Phase to address:** Phase 1-2 (before or during modularization)

### Pitfall 6.2: Test Flakiness with Async/Redis
**Severity:** MEDIUM
**Warning signs:** Tests pass locally but fail in CI. Redis-dependent tests timeout intermittently.
**Prevention:**
- Use `testcontainers` for Redis in integration tests (isolated per test)
- Set explicit timeouts for async operations in tests
- Use `tokio::time::pause()` for time-dependent tests
- Don't share Redis instances between test runs
**Phase to address:** Testing phase

### Pitfall 6.3: Multi-Tenant Test Fixtures
**Severity:** LOW
**Warning signs:** Tests that assume single-tenant data pass but real multi-tenant usage breaks.
**Prevention:**
- Test fixtures create data in multiple organizations
- Every query test includes tenant filtering assertion
- Use test helper: `create_test_tenant(name)` that returns org_id
**Phase to address:** Testing phase

---

## Pitfall Summary by Phase

| Phase | Critical Pitfalls | High | Medium | Low |
|-------|------------------|------|--------|-----|
| Architecture foundation | Circular deps, Router composition | 2 | 0 | 0 |
| Per-domain extraction | Tenant isolation regression | 1 | 2 | 1 |
| Data migration | Type mismatch, ID mapping | 0 | 2 | 2 |
| Judge concurrency | Consumer group edge cases | 0 | 2 | 0 |
| Contest enhancement | Timer sync, scoreboard races | 0 | 2 | 0 |
| Frontend restructure | API contract breaks | 1 | 1 | 1 |
| Testing | Tightly coupled handlers | 0 | 0 | 2 |
| **Cross-cutting** | **Tenant isolation regressions** | **1** | **0** | **0** |
