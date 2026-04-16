# Phase 7: Test Coverage + Contest Enhancement - Research

**Researched:** 2026-04-15
**Domain:** Rust integration testing (testcontainers + sqlx), Axum handler testing, Vitest/Playwright frontend testing, Redis Streams XPENDING/XCLAIM, contest freeze/upsolving logic
**Confidence:** HIGH

## Summary

This phase combines two concerns: (1) building meaningful test coverage across all domain crates and the frontend, and (2) implementing three contest features (freeze snapshot, upsolving, submission recovery). The project already has a mature testkit infrastructure in `api-infra` with `testcontainers` 0.23 and `testcontainers-modules` 0.11 providing PostgreSQL and Redis containers via a `testkit` feature flag. The `TestFixture` struct in `api-infra/src/testkit/mod.rs` orchestrates both containers and provides a clean migration runner. However, no domain crate currently uses this testkit -- only `domain-problems/src/access.rs` has inline unit tests (6 tests), and `domain-submissions/src/queue.rs` has 2 serialization tests.

For contest enhancements, the existing `domain-contests/src/service.rs` already computes `is_frozen` and `submissions_cutoff` (lines 282-294) but lacks snapshot storage and retrieval. The `contest_submissions` table has no `is_upsolving` column. The judge-worker's Redis consumer uses raw `redis::cmd()` calls (not the `streams` feature) and has no XPENDING/XCLAIM logic. The redis crate version is 0.27 (judge-worker) but the lock file shows both 0.27.6 and 0.32.7 -- the `streams` feature would provide typed APIs for XPENDING/XCLAIM, but raw `redis::cmd()` works too and matches the existing pattern.

**Primary recommendation:** Extend the existing `api-infra` testkit to add Redis container support, add `dev-dependencies` on `api-infra` with `testkit` feature to each domain crate, write integration tests in each crate's `tests/` directory, and use `tower::ServiceExt::oneshot` for API handler tests. For contests, add a `contest_leaderboard_snapshots` DB table for freeze, an `is_upsolving` column to `contest_submissions`, and implement XPENDING/XCLAIM recovery using raw `redis::cmd()` in judge-worker.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Bottom-up execution order (domain crate integration tests -> API handler tests -> frontend tests -> E2E). Ensures foundation stability before higher layers.
- **D-02:** Domain crate integration tests use testcontainers (PostgreSQL + Redis) for real database testing, not mocks.
- **D-03:** Snapshot-style freeze -- during freeze window, leaderboard returns a cached snapshot of rankings up to the freeze cutoff time. After contest ends, auto-unfreeze reveals final rankings.
- **D-04:** Upsolving auto-enables when contest ends. Post-contest submissions tagged `is_upsolving=true`, excluded from official standings. Users submit through the same contest page.
- **D-05:** Worker self-healing -- on startup, judge-worker scans Redis Stream XPENDING, XCLAIMs timed-out messages, and retries them. No API endpoint involvement.

### Claude's Discretion
- Exact test file organization within each domain crate
- Which specific domain crate tests to prioritize (all 8 crates vs subset)
- Frontend test scope (which hooks/components to cover)
- Playwright E2E test scenarios selection
- Frozen leaderboard snapshot storage format (Redis cache vs DB table)
- XPENDING timeout threshold value

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | Integration tests per domain module using sqlx::test + testcontainers (PostgreSQL, Redis) | api-infra testkit already provides TestFixture with PgTestContainer + RedisTestContainer; domain crates need dev-dep on api-infra with testkit feature |
| TEST-02 | API handler tests using tower::ServiceExt::oneshot (no HTTP server needed) | Already used in api/src/middleware/auth.rs tests; pattern is well-established |
| TEST-03 | Multi-tenant isolation test suite -- verify every endpoint respects tenant boundaries | Domain service queries already filter by organization_id; tests need fixtures that seed data in two tenants then verify cross-tenant queries return empty |
| TEST-04 | Frontend unit tests via Vitest for hooks and utility functions | Vitest configured in frontend/vitest.config.ts with jsdom environment, 80% coverage thresholds, v8 provider; 5 hooks and 3 lib files to test |
| TEST-05 | E2E test suite via Playwright covering critical flows | Playwright 1.58 configured in frontend/playwright.config.ts; existing smoke.spec.ts covers login, submission, contest; need to expand with contest-specific E2E |
| CONT-01 | Leaderboard freeze -- standings frozen at configurable time before contest end | Existing is_frozen/submissions_cutoff logic in domain-contests service (lines 282-294); needs snapshot storage + retrieval |
| CONT-02 | Post-contest upsolving -- submissions tagged as upsolving, not counted in official standings | Needs is_upsolving column on contest_submissions; link_submission_to_contest currently blocks post-contest submissions |
| CONT-03 | Submission recovery -- pending submissions in Redis Stream automatically retried via XPENDING + XCLAIM | redis crate supports XPENDING/XCLAIM via raw cmd or streams feature; worker consumer.rs already uses raw redis::cmd() |
</phase_requirements>

## Standard Stack

### Core (Testing)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| testcontainers | 0.23.3 | Docker-managed PostgreSQL + Redis for integration tests | Already in workspace, used by api-infra testkit [VERIFIED: Cargo.lock] |
| testcontainers-modules | 0.11.6 | Pre-built PostgreSQL container image | Already in api-infra with `postgres` feature [VERIFIED: Cargo.lock] |
| sqlx | 0.8 | Database driver + `sqlx::migrate!()` for test DB setup | Already in all domain crates [VERIFIED: Cargo.lock] |
| tower | 0.5 | `ServiceExt::oneshot` for handler tests without HTTP server | Already in api dev-dependencies [VERIFIED: Cargo.toml] |
| vitest | ^1.0.2 | Frontend unit/integration testing | Already configured [VERIFIED: package.json] |
| @playwright/test | ^1.55.0 | E2E browser testing | Already installed, version 1.58 [VERIFIED: package.json] |

### Supporting (Testing)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| deadpool-redis | 0.22 | Redis connection pooling in tests | When domain crate needs Redis (domain-submissions, domain-leaderboard) |
| tokio-test | 0.4 | Async test utilities | For judge-worker tests |
| @testing-library/react | ^16.0.0 | React component testing | Frontend component tests |
| @testing-library/jest-dom | ^6.1.5 | DOM matchers (toBeVisible, etc.) | Frontend assertions |
| jsdom | ^25.0.1 | DOM simulation | Vitest environment |

### Contest Features
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| redis | 0.27.6 | XPENDING/XCLAIM commands via `redis::cmd()` | judge-worker submission recovery |
| chrono | 0.4 | Time calculations for freeze window | Already in domain-contests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| testcontainers raw API | sqlx::test attribute macro | sqlx::test manages per-test DB creation but requires DATABASE_URL at compile time and does not manage containers; testcontainers gives full control [VERIFIED: sqlx issue #3270] |
| Raw redis::cmd() for XPENDING/XCLAIM | redis crate `streams` feature | streams feature provides typed StreamClaimReply etc., but judge-worker uses raw cmd pattern already; raw cmd keeps consistency [VERIFIED: codebase grep] |
| DB table for freeze snapshot | Redis cache for snapshot | DB table is simpler, survives restarts, no cache invalidation complexity; Redis is faster but adds operational complexity for this use case |

**Installation:**
No new installations needed. All dependencies are already in Cargo.lock or package-lock.json. Domain crates need `dev-dependencies` additions:

```toml
# In each domain-*/Cargo.toml
[dev-dependencies]
api-infra = { path = "../api-infra", features = ["testkit"] }
tokio = { workspace = true, features = ["full"] }
```

For judge-worker (redis streams feature -- optional):
```toml
# judge-worker/Cargo.toml -- add "streams" feature to redis
redis = { version = "0.27", features = ["tokio-comp", "connection-manager"] }
# No change needed -- raw cmd() already works for XPENDING/XCLAIM
```

## Architecture Patterns

### Recommended Test Structure
```
domain-contests/
  Cargo.toml          # add [dev-dependencies]
  src/
    service.rs        # existing code
    models.rs         # existing code
  tests/              # NEW: integration tests
    integration.rs    # testcontainers-based service tests

api/
  tests/
    handlers/
      contests_test.rs    # tower::oneshot handler tests
    tenant_isolation.rs   # multi-tenant verification

frontend/
  src/
    hooks/
      __tests__/
        useCountdown.test.ts
        useAuth.test.ts
    services/
      __tests__/          # already exists, 10 test files
  e2e/
    smoke.spec.ts         # existing, expand
    contest-freeze.spec.ts
    contest-upsolving.spec.ts
```

### Pattern 1: Domain Crate Integration Test (TEST-01)
**What:** Each domain crate gets a `tests/integration.rs` file that uses `api-infra::testkit::TestFixture` to spin up real PostgreSQL + Redis containers, run migrations, and test service functions against real databases.
**When to use:** Every domain crate (domain-users, domain-problems, domain-submissions, domain-contests, domain-classes, domain-community, domain-leaderboard, domain-search).
**Example:**
```rust
// domain-contests/tests/integration.rs
// Source: Based on existing api-infra/src/testkit/mod.rs pattern

#[tokio::test]
async fn test_create_and_get_contest() {
    let fixture = api_infra::testkit::TestFixture::new().await;
    fixture.run_migrations(|pool| {
        let migrator = sqlx::migrate!("../../api/migrations");
        async move { migrator.run(pool).await }
    }).await;

    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());

    let req = domain_contests::models::CreateContestRequest {
        organization_id: 1,
        campus_id: None,
        name: "Test Contest".to_string(),
        description: Some("A test contest".to_string()),
        rules: Some("acm".to_string()),
        start_time: chrono::Utc::now() + chrono::Duration::hours(1),
        end_time: chrono::Utc::now() + chrono::Duration::hours(3),
        freeze_minutes: Some(30),
    };

    let contest = service.create_contest(req).await.unwrap();
    assert_eq!(contest.name, "Test Contest");

    let detail = service.get_contest(contest.id).await.unwrap();
    assert_eq!(detail.problem_count, 0);
}
```

### Pattern 2: API Handler Test (TEST-02)
**What:** Use `tower::ServiceExt::oneshot` to test Axum route handlers directly without starting an HTTP server.
**When to use:** Testing API endpoint behavior (auth, tenant filtering, response format).
**Example:**
```rust
// Source: Based on existing pattern in api/src/middleware/auth.rs
use axum::body::Body;
use axum::http::{Request, StatusCode};
use tower::ServiceExt;

#[tokio::test]
async fn test_list_contests_requires_auth() {
    let app = create_test_app().await; // builds the router with test state

    let response = app
        .oneshot(Request::builder().uri("/contests").body(Body::empty()).unwrap())
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}
```

### Pattern 3: Multi-Tenant Isolation Test (TEST-03)
**What:** Seed data in two different organizations, then verify that queries scoped to one tenant never return data from the other.
**When to use:** Critical security requirement -- every endpoint must respect tenant boundaries.
**Example:**
```rust
#[tokio::test]
async fn test_contest_list_is_tenant_isolated() {
    let fixture = TestFixture::new().await;
    fixture.run_migrations(/* ... */).await;
    let service = ContestService::new(fixture.db_pool.clone());

    // Create contest in org 1
    let contest_org1 = create_test_contest(&service, 1, "Org1 Contest").await;
    // Create contest in org 2
    let _contest_org2 = create_test_contest(&service, 2, "Org2 Contest").await;

    // Query org 1 should only see org1 contest
    let (contests, total) = service.list_contests(Some(1), None, None, 1, 10).await.unwrap();
    assert_eq!(total, 1);
    assert_eq!(contests[0].id, contest_org1.id);
}
```

### Pattern 4: Freeze Snapshot (CONT-01)
**What:** When freeze activates, compute current rankings and store as a snapshot. During freeze, return snapshot. After contest ends, return live rankings.
**When to use:** ACM-style contests where standings are hidden before final reveal.
**Example:**
```rust
// In domain-contests service
pub async fn get_contest_rankings(&self, contest_id: i64) -> Result<Vec<ContestRankingEntry>> {
    let contest = self.get_contest(contest_id).await?;
    let now = chrono::Utc::now();

    let is_frozen = /* existing freeze check */;

    if is_frozen {
        // Return cached snapshot
        return self.get_frozen_snapshot(contest_id).await
            .unwrap_or_else(|_| self.compute_rankings(contest_id, submissions_cutoff).await);
    }

    // Not frozen -- compute live rankings
    self.compute_rankings(contest_id, now).await
}

pub async fn store_frozen_snapshot(
    &self,
    contest_id: i64,
    rankings: &[ContestRankingEntry],
) -> Result<()> {
    let snapshot_json = serde_json::to_string(rankings)?;
    sqlx::query(
        "INSERT INTO contest_leaderboard_snapshots (contest_id, snapshot_data)
         VALUES ($1, $2)
         ON CONFLICT (contest_id) DO UPDATE SET snapshot_data = $2, frozen_at = NOW()",
    )
    .bind(contest_id)
    .bind(&snapshot_json)
    .execute(&self.pool)
    .await?;
    Ok(())
}
```

### Pattern 5: XPENDING/XCLAIM Recovery (CONT-03)
**What:** On startup, scan Redis Stream for pending messages older than a threshold and claim them for retry.
**When to use:** Judge worker crash recovery -- ensures no submissions are permanently stuck.
**Example:**
```rust
// In judge-worker/src/queue/consumer.rs or new recovery.rs module

pub async fn recover_pending_submissions(
    conn: &mut MultiplexedConnection,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
    idle_timeout_ms: u64,
) -> Result<Vec<(String, SubmissionMessage)>> {
    // Step 1: XPENDING to find timed-out messages
    let pending: redis::Value = redis::cmd("XPENDING")
        .arg(stream_name)
        .arg(group_name)
        .arg("-")    // start ID
        .arg("+")    // end ID
        .arg(100)    // count
        .query_async(conn)
        .await?;

    // Parse pending entries to get message IDs with idle time > threshold
    // Step 2: XCLAIM those messages
    let messages_to_claim: Vec<String> = /* extract IDs with idle > threshold */;

    if messages_to_claim.is_empty() {
        return Ok(Vec::new());
    }

    // XCLAIM stream group consumer min-idle-time ID [ID ...]
    let mut cmd = redis::cmd("XCLAIM");
    cmd.arg(stream_name)
        .arg(group_name)
        .arg(consumer_name)
        .arg(idle_timeout_ms)
        ; // then add each message ID

    for id in &messages_to_claim {
        cmd.arg(id);
    }

    // Parse claimed messages into SubmissionMessages
    // ... (same deserialization as consume_submission)
    Ok(recovered)
}
```

### Anti-Patterns to Avoid
- **Testing with mocks instead of real DB:** Decision D-02 explicitly mandates testcontainers. Mocks would only test mock behavior, not actual SQL queries. [VERIFIED: CONTEXT.md D-02]
- **Starting an HTTP server for handler tests:** Use `tower::ServiceExt::oneshot` instead -- it is faster, more deterministic, and already the established pattern. [VERIFIED: api/src/middleware/auth.rs tests]
- **Using `#[ignore]` for integration tests:** The existing consumer test uses `#[ignore = "requires Redis"]`. With testcontainers, tests should always work when Docker is running. Do not add `#[ignore]`.
- **Seeding test data with raw SQL across many tables:** Create fixture helper functions in each domain crate's test module that handle the full dependency chain (org -> campus -> user -> problem, etc.).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test DB lifecycle | Custom Docker scripts or manual setup | `api-infra::testkit::TestFixture` | Already built, handles container start/stop, pool creation, and migration running [VERIFIED: api-infra/src/testkit/mod.rs] |
| Test user/org fixtures | Ad-hoc SQL INSERT in each test | `api-infra::testkit::fixtures::build_test_user` + new domain-specific fixtures | Existing fixture pattern, extends cleanly [VERIFIED: api-infra/src/testkit/fixtures.rs] |
| XPENDING/XCLAIM parsing | Custom Redis protocol parsing | `redis::cmd("XPENDING")` + `redis::cmd("XCLAIM")` with typed parsing | redis crate handles protocol details; judge-worker already uses this pattern for XREADGROUP/XACK [VERIFIED: judge-worker/src/queue/consumer.rs] |
| Freeze snapshot serialization | Custom binary format | `serde_json::to_string` into JSONB column | Simple, debuggable, queryable [ASSUMED] |
| Leaderboard ranking computation | New ranking algorithm | Existing `get_contest_rankings` SQL query | Already implements ACM scoring with time penalty calculation [VERIFIED: domain-contests/src/service.rs lines 273-409] |

**Key insight:** The project has already invested in test infrastructure. The `TestFixture` in api-infra manages both PostgreSQL and Redis containers with automatic cleanup on drop. The only missing piece is connecting domain crates to this testkit via dev-dependencies.

## Common Pitfalls

### Pitfall 1: Migration Path Mismatch
**What goes wrong:** Domain crate tests reference migrations at wrong relative path. The existing testkit uses a closure pattern `fixture.run_migrations(|pool| ...)` to let callers specify their migration source.
**Why it happens:** Domain crates live at different directory depths than the api crate which owns `api/migrations/`.
**How to avoid:** Always use `sqlx::migrate!("../../api/migrations")` from domain crate test files. Verify the relative path resolves correctly at test compile time.
**Warning signs:** Compile error "cannot find migration directory" or runtime "relation does not exist".

### Pitfall 2: Foreign Key Dependency Chain
**What goes wrong:** Tests fail because creating a contest requires an organization, campus, user, and problem to exist first -- all with correct foreign key relationships.
**Why it happens:** The database schema has strict referential integrity (contest -> organization, contest_submissions -> submissions -> users -> organizations).
**How to avoid:** Create a `seed_test_data()` helper function for each domain crate that sets up the minimum required dependency chain. For domain-contests, this means: org -> campus -> user -> problem -> contest -> contest_problem.
**Warning signs:** "foreign key constraint violation" errors during test data setup.

### Pitfall 3: Freeze Snapshot Race Condition
**What goes wrong:** Two concurrent requests during freeze transition could compute different snapshots, or a snapshot could be stored after freeze window ends.
**Why it happens:** Freeze activation is time-based (checked against `chrono::Utc::now()`) with no distributed lock.
**How to avoid:** Use `INSERT ... ON CONFLICT DO UPDATE` for snapshot storage (idempotent). The existing `is_frozen` check already uses the same time computation. Store snapshot lazily on first frozen request, not eagerly at freeze time.
**Warning signs:** Leaderboard shows different rankings on refresh during freeze window.

### Pitfall 4: XPENDING Returns Empty for New Streams
**What goes wrong:** Recovery code fails when the stream has never had pending messages (XPENDING returns empty/null).
**Why it happens:** A fresh Redis Stream with a consumer group but no unacknowledged messages returns a different response format.
**How to avoid:** Handle the empty/null XPENDING response gracefully. Check response type before parsing entries. Return early with empty Vec.
**Warning signs:** Worker crashes on startup with "failed to parse XPENDING response".

### Pitfall 5: Upsolving Submissions Blocked by Active Check
**What goes wrong:** The existing `link_submission_to_contest` (line 532) rejects submissions when `now > contest.end_time`. Upsolving needs to bypass this check.
**Why it happens:** The current code was written without upsolving support.
**How to avoid:** Modify `link_submission_to_contest` to accept post-contest submissions when the contest has ended. Set `is_upsolving = true` flag. The submission creation itself (in domain-submissions) is separate from the contest linking.
**Warning signs:** 400 error "Contest is not active" when trying to submit after contest ends.

### Pitfall 6: CI Tests Fail Without Docker
**What goes wrong:** Integration tests requiring testcontainers fail in CI because Docker is not available or the runner doesn't have it enabled.
**Why it happens:** GitHub Actions ubuntu-latest runners have Docker available, but test startup is slow (10-30 seconds for container pull on first run).
**How to avoid:** (1) GitHub Actions CI already runs `cargo test --workspace` -- this works because `SQLX_OFFLINE=true` is set. (2) Integration tests in `tests/` directories are separate from `#[cfg(test)]` inline tests. (3) Consider adding a CI step that runs integration tests with Docker, or use `#[cfg(feature = "integration")]` gate.
**Warning signs:** CI timeout or "Failed to start PostgreSQL test container. Is Docker running?"

## Code Examples

### Domain Crate Integration Test Setup (domain-contests)
```rust
// domain-contests/tests/integration.rs
// Source: Pattern from api-infra/src/testkit/mod.rs + existing domain-contests service

use api_infra::testkit::TestFixture;

async fn setup_test_service() -> (TestFixture, domain_contests::service::ContestService) {
    let fixture = TestFixture::new().await;
    fixture.run_migrations(|pool| {
        let migrator = sqlx::migrate!("../../api/migrations");
        async move { migrator.run(pool).await }
    }).await;

    // Seed required data: organization
    sqlx::query("INSERT INTO organizations (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING")
        .bind(1i64).bind("Test Org")
        .execute(&fixture.db_pool).await.unwrap();

    let service = domain_contests::service::ContestService::new(fixture.db_pool.clone());
    (fixture, service)
}

#[tokio::test]
async fn test_contest_rankings_with_freeze() {
    let (_fixture, service) = setup_test_service().await;

    // Create a contest that is currently in freeze window
    let now = chrono::Utc::now();
    let contest = service.create_contest(domain_contests::models::CreateContestRequest {
        organization_id: 1,
        campus_id: None,
        name: "Freeze Test".to_string(),
        description: None,
        rules: Some("acm".to_string()),
        start_time: now - chrono::Duration::hours(2),
        end_time: now + chrono::Duration::minutes(10), // ends in 10 min
        freeze_minutes: Some(30), // freeze started 20 min ago
    }).await.unwrap();

    // Verify freeze is active
    let status = service.get_contest_status(contest.id).await.unwrap();
    assert!(status.is_frozen);
}
```

### XPENDING/XCLAIM Recovery Implementation
```rust
// Source: Redis command docs https://redis.io/docs/latest/commands/xpending/
// Using raw redis::cmd() consistent with existing consumer.rs pattern

pub async fn recover_pending(
    conn: &mut MultiplexedConnection,
    stream_name: &str,
    group_name: &str,
    consumer_name: &str,
    min_idle_ms: u64,
) -> Result<Vec<(String, SubmissionMessage)>> {
    // XPENDING stream group - + count
    let pending_reply: redis::Value = redis::cmd("XPENDING")
        .arg(stream_name)
        .arg(group_name)
        .arg("-")
        .arg("+")
        .arg(100)
        .query_async(conn)
        .await?;

    // pending_reply format: [[id, consumer, idle_ms, deliveries], ...]
    let entries = match pending_reply {
        redis::Value::Array(arr) => arr,
        _ => return Ok(Vec::new()),
    };

    let mut ids_to_claim = Vec::new();
    for entry in &entries {
        if let redis::Value::Array(ref fields) = entry {
            if fields.len() >= 3 {
                if let (Some(redis::Value::BulkString(id)), Some(redis::Value::Int(idle))) =
                    (fields.get(0), fields.get(2)) {
                    if (*idle as u64) > min_idle_ms {
                        ids_to_claim.push(String::from_utf8_lossy(id).to_string());
                    }
                }
            }
        }
    }

    if ids_to_claim.is_empty() {
        return Ok(Vec::new());
    }

    // XCLAIM stream group consumer min-idle-time id [id ...]
    let mut cmd = redis::cmd("XCLAIM");
    cmd.arg(stream_name).arg(group_name).arg(consumer_name).arg(min_idle_ms);
    for id in &ids_to_claim {
        cmd.arg(id);
    }

    // Parse claimed messages (same format as XREADGROUP response)
    // ... deserialize into SubmissionMessage ...
    Ok(Vec::new()) // placeholder
}
```

### Upsolving Submission Linking
```rust
// Modified link_submission_to_contest in domain-contests service
pub async fn link_submission_to_contest(
    &self,
    contest_id: i64,
    submission_id: i64,
) -> Result<ContestSubmission> {
    let contest = /* get contest */;
    let now = chrono::Utc::now();
    let is_upsolving = now > contest.end_time;

    // Allow post-contest submissions (upsolving)
    // Only block pre-contest submissions
    if now < contest.start_time {
        return Err(anyhow::anyhow!("Contest has not started yet"));
    }

    // ... existing checks ...

    let contest_submission = sqlx::query_as::<_, ContestSubmission>(
        r#"
        INSERT INTO contest_submissions (contest_id, submission_id, is_upsolving)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        RETURNING *
        "#,
    )
    .bind(contest_id)
    .bind(submission_id)
    .bind(is_upsolving)
    .fetch_one(&self.pool)
    .await?;

    Ok(contest_submission)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mock-based DB testing | testcontainers real DB testing | 2023+ standard | Tests validate actual SQL, not mock assumptions |
| HTTP server for API tests | tower::ServiceExt::oneshot | Axum 0.7 era | Faster, no port conflicts, deterministic |
| Manual Redis test setup | testcontainers Redis container | testcontainers 0.20+ | Automatic cleanup, isolated per test |
| Eager contest freeze snapshot | Lazy snapshot on first request | Recommended pattern | Avoids race conditions, simpler code |

**Deprecated/outdated:**
- `testcontainers::clients::Cli` (blocking): The api-infra testkit uses `AsyncRunner` instead, which is the modern approach. The `database.rs` file's `setup_test_db()` uses the old blocking `Cli` but is not used in production tests. [VERIFIED: api-infra/src/testkit/database.rs]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DB table (JSONB column) is the right choice for freeze snapshot storage | Architecture Patterns | If contests have thousands of participants, snapshot JSON could be large; Redis cache might be faster. Mitigation: test with realistic data volumes. |
| A2 | XPENDING idle threshold of 5 minutes is reasonable | Claude's Discretion | If judge normally takes >5 min for complex problems, valid submissions might be re-claimed. Mitigation: make configurable via env var. |
| A3 | `contest_submissions` table can be altered to add `is_upsolving BOOLEAN DEFAULT false` column without breaking existing rows | CONT-02 | Migration needs DEFAULT false for backward compatibility. Standard ALTER TABLE supports this. |
| A4 | GitHub Actions CI runners have Docker available for testcontainers tests | Common Pitfalls | If not, integration tests need `#[ignore]` gate or separate CI job. Ubuntu runners do have Docker. [VERIFIED: GitHub Actions docs] |
| A5 | The `api-infra` testkit `TestFixture` is the right shared infrastructure for all domain crate tests | Architecture Patterns | If testkit needs modifications (e.g., specific seed data), it could become a bottleneck. Mitigation: keep testkit minimal, put domain-specific fixtures in each crate. |

## Open Questions (RESOLVED)

1. **CI Integration Test Strategy**
   - What we know: CI runs `cargo test --workspace` with `SQLX_OFFLINE=true`. Integration tests in `tests/` directories are separate compilation units.
   - What's unclear: Should integration tests (requiring Docker) run in CI by default, or be behind a feature flag like `#[cfg(feature = "integration")]`?
   - Recommendation: Run them in CI. GitHub Actions ubuntu-latest has Docker. Add a 5-minute timeout per integration test. If Docker is unavailable, tests will fail fast with a clear error message. (RESOLVED)

2. **Contest Leaderboard Snapshot Timing**
   - What we know: Freeze is time-based (checked against `chrono::Utc::now()`). Snapshot should be computed when freeze activates.
   - What's unclear: Should snapshot be computed eagerly (background task when freeze time arrives) or lazily (first request during freeze)?
   - Recommendation: Lazy -- compute on first request during freeze, store in DB, return cached version on subsequent requests. Simpler, no background task needed. (RESOLVED)

3. **Upsolving UX Flow**
   - What we know: Users submit through the same contest page. Submissions are tagged `is_upsolving=true`.
   - What's unclear: Should the contest page UI change when contest ends (e.g., show "Practice Mode" banner)?
   - Recommendation: Yes, minimal UI change -- show a banner indicating practice mode. This is Claude's discretion for frontend scope. (RESOLVED)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | testcontainers (integration tests) | available | 29.0.1 | -- |
| cargo | Rust compilation + tests | available | 1.90.0 | -- |
| node | Frontend tests (vitest) | available | 25.8.1 | -- |
| npx/playwright | E2E tests | available | 1.58.0 | -- |
| PostgreSQL (running) | Integration test target | via testcontainers only | 16 (container) | -- |
| Redis (running) | Integration test target | via testcontainers only | 7-alpine (container) | -- |

**Missing dependencies with no fallback:**
- None -- all external dependencies are containerized via testcontainers.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Rust: cargo test + testcontainers; Frontend: Vitest 1.0 + Playwright 1.58 |
| Config file | frontend/vitest.config.ts, frontend/playwright.config.ts |
| Quick run command | `cargo test -p domain-contests` / `npx vitest --run` |
| Full suite command | `cargo test --workspace` / `npx vitest --run` + `npx playwright test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | Domain crate integration tests against real DB | integration | `cargo test -p domain-contests --test integration` | No -- Wave 0 |
| TEST-02 | API handler tests via tower oneshot | unit | `cargo test -p api --test handlers` | Partial -- existing tests in api/tests/ |
| TEST-03 | Multi-tenant isolation verification | integration | `cargo test -p api --test tenant_isolation` | No -- Wave 0 |
| TEST-04 | Frontend hooks and utility tests | unit | `npx vitest --run src/hooks` | No -- Wave 0 |
| TEST-05 | E2E critical flows | e2e | `npx playwright test` | Partial -- smoke.spec.ts exists |
| CONT-01 | Freeze snapshot stores and retrieves correctly | integration | `cargo test -p domain-contests --test integration` | No -- Wave 0 |
| CONT-02 | Upsolving submissions tagged and excluded from rankings | integration | `cargo test -p domain-contests --test integration` | No -- Wave 0 |
| CONT-03 | XPENDING/XCLAIM recovers timed-out submissions | unit + integration | `cargo test -p judge-worker` | Partial -- existing consumer test |

### Sampling Rate
- **Per task commit:** `cargo test -p <changed-crate>` or `npx vitest --run`
- **Per wave merge:** `cargo test --workspace && cd frontend && npx vitest --run && npx playwright test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `domain-contests/tests/integration.rs` -- covers TEST-01, CONT-01, CONT-02
- [ ] `domain-users/tests/integration.rs` -- covers TEST-01
- [ ] `domain-problems/tests/integration.rs` -- covers TEST-01
- [ ] `domain-submissions/tests/integration.rs` -- covers TEST-01
- [ ] `domain-classes/tests/integration.rs` -- covers TEST-01
- [ ] `domain-community/tests/integration.rs` -- covers TEST-01
- [ ] `domain-leaderboard/tests/integration.rs` -- covers TEST-01
- [ ] `domain-search/tests/integration.rs` -- covers TEST-01
- [ ] `api/tests/tenant_isolation.rs` -- covers TEST-03
- [ ] `frontend/src/hooks/__tests__/useCountdown.test.ts` -- covers TEST-04
- [ ] `frontend/src/hooks/__tests__/useAuth.test.ts` -- covers TEST-04
- [ ] `frontend/e2e/contest-freeze.spec.ts` -- covers CONT-01 E2E
- [ ] Migration: `025_add_is_upsolving_to_contest_submissions.sql` -- CONT-02
- [ ] Migration: `026_create_contest_leaderboard_snapshots.sql` -- CONT-01
- [ ] Domain crate Cargo.toml updates (8 crates) -- add dev-dependencies

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT validation in tests; test that unauthenticated requests are rejected |
| V4 Access Control | yes | Multi-tenant isolation tests (TEST-03) verify data never leaks across orgs |
| V5 Input Validation | yes | Test invalid contest creation (negative freeze_minutes, end before start) |

### Known Threat Patterns for Rust + Axum + SQLx

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tenant data leakage | Information disclosure | Multi-tenant isolation test suite (TEST-03) |
| SQL injection | Tampering | sqlx parameterized queries ($1, $2) -- already used throughout [VERIFIED: codebase grep] |
| Upsolving data in official rankings | Spoofing | is_upsolving column + WHERE NOT is_upsolving in ranking queries |
| Freeze snapshot tampering | Tampering | Snapshot stored server-side in DB, not client-controllable |

## Sources

### Primary (HIGH confidence)
- Codebase: api-infra/src/testkit/ -- testkit infrastructure with PgTestContainer, RedisTestContainer, TestFixture
- Codebase: domain-contests/src/service.rs -- existing freeze logic (lines 282-294), rankings computation (lines 273-409)
- Codebase: judge-worker/src/queue/consumer.rs -- existing XREADGROUP/XACK pattern
- Codebase: judge-worker/src/main.rs -- worker startup flow, consumer group setup
- Codebase: api-infra/Cargo.toml -- testkit feature with testcontainers 0.23, testcontainers-modules 0.11
- Cargo.lock -- verified testcontainers 0.23.3, testcontainers-modules 0.11.6, redis 0.27.6
- [docs.rs/redis](https://docs.rs/redis/latest/redis/trait.Commands.html) -- XPENDING/XCLAIM via streams feature or raw cmd

### Secondary (MEDIUM confidence)
- [sqlx issue #3270](https://github.com/launchbadge/sqlx/issues/3270) -- sqlx::test integration with testcontainers challenges
- [rust.testcontainers.org](https://rust.testcontainers.org/) -- official testcontainers Rust documentation
- [redis.io XCLAIM docs](https://redis.io/docs/latest/commands/xclaim/) -- XCLAIM command reference

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all dependencies verified in Cargo.lock and codebase
- Architecture: HIGH - existing testkit infrastructure is well-structured and extensible
- Pitfalls: HIGH - identified from direct codebase analysis (foreign key chains, blocking active check)
- Contest features: MEDIUM - freeze/upsolving/recovery patterns are standard but specific edge cases need testing

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable dependencies)
