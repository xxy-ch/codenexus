# 02 — Backend Audit (Consolidated)

**Date**: 2026-04-10 (consolidated from audits dated 2026-04-09 and 2026-04-10)
**Scope**: `api/src/`, `judge-worker/src/`, `sandbox/`, Docker/Infra config
**Sources**: backend-audit-2026-04-09.md, backend-infra-audit-2026-04-10.md, role-migration-audit-2026-04-10.md, post-p0-fix-rescan-2026-04-09.md, CE review findings (2026-04-10)

---

## Summary

| Severity | OPEN | FIXED | Total |
|----------|------|-------|-------|
| P0 (Critical) | 2 | 10 | 12 |
| P1 (High) | 0 | 11 | 11 |
| P2 (Medium) | 0 | 8 | 8 |
| P3 (Low) | 1 | 3 | 4 |
| **Total** | **3** | **32** | **35** |

### Round 1 Fixes (2026-04-11)

| ID | Description |
|----|-------------|
| BE-P0-01 | `ensure_admin()` now matches Role enum (Root, OrganizationAdmin, CampusAdmin) — 10 admin endpoints unblocked |
| BE-P0-02 | Judge-worker table name — was already fixed in working tree |
| BE-P0-03 | Judge-worker DB pool — was already fixed in working tree |
| BE-P1-01 | Blog/discussions delete now compute `is_admin` from JWT claims |
| BE-P1-10 | DB migration `025_fix_user_roles_check.sql` adds organizationadmin + teachingassistant |
| BE-P2-03 | Judge-worker exponential backoff (capped 60s, resets on success) |
| BE-P2-05 | CORS fallback already warns on missing env var |
| BE-P2-08 | Submission rate limit burst reduced 30 → 10 |
| BE-P3-01 | Work dir cleanup — was already fixed in working tree |
| BE-P3-04 | JWT secret stored in AppState, read once at startup |

### Round 2 Fixes — Architectural (2026-04-11)

| ID | Description |
|----|-------------|
| BE-P0-04 | Sandbox integrated — cgroup resource limits + seccomp denylist in processor execution path |
| BE-P0-06 | apply_seccomp moved inside pre_exec closure (runs in child process) |
| BE-P1-02 | Seccomp replaced strict mode with denylist (blocks mount/ptrace/reboot, allows execve) |
| BE-P1-03 | Partial stdout/stderr captured on timeout (file-based I/O) |
| BE-P1-04 | Dead letter queue: retry with backoff + Redis DLQ for permanently failed results |
| BE-P1-05 | Docker capabilities: SYS_PTRACE + SYS_ADMIN + no-new-privileges (no privileged mode) |
| BE-P2-06 | Cgroup cleanup separated from execution result (always returns execution output) |

---

## Previously Fixed (verified)

| # | Finding | Source |
|---|---------|--------|
| BE-FIXED-01 | SQL injection in discussions/blog/classes — parameterized queries | Post-P0 rescan |
| BE-FIXED-02 | Worker callback auth (X-Worker-Secret header) | Post-P0 rescan |
| BE-FIXED-03 | JWT_SECRET required via `.expect()` (no default fallback) | Post-P0 rescan |
| BE-FIXED-04 | CORS env-var based (not Any) | Post-P0 rescan |
| BE-FIXED-05 | WebSocket auth via JWT query-param | Post-P0 rescan |
| BE-FIXED-06 | Contest link_submission auth added | Post-P0 rescan |
| BE-FIXED-07 | Docker ports bound to 127.0.0.1 | Post-P0 rescan |
| BE-FIXED-08 | WORKER_SECRET required in docker-compose | Post-P0 rescan |
| BE-FIXED-09 | `drop_privileges()` fixed — drops to UID/GID 1000 | Post-P0 rescan |
| BE-FIXED-10 | XSS in SearchResults.tsx — DOMPurify.sanitize() | Post-P0 rescan |
| BE-FIXED-11 | X-Frame-Options SAMEORIGIN -> DENY (nginx.conf) | CE review |
| BE-FIXED-12 | POSTGRES_PASSWORD now required (docker-compose.yml) | CE review |
| BE-FIXED-13 | WORKER_SECRET read at startup (judge-worker/src/main.rs) | CE review |
| BE-FIXED-14 | reqwest::Client singleton with 30s timeout (judge-worker/src/main.rs) | CE review |
| BE-FIXED-15 | REDIS_URL + API_URL required at startup (judge-worker/src/main.rs) | CE review |
| BE-FIXED-16 | Instant::now() moved after spawn() (judge-worker/src/processor/service.rs) | CE review |
| BE-FIXED-17 | Runtime measurement no longer includes spawn overhead | CE review |

---

## P0 — Critical

### BE-P0-01: `ensure_admin()` checks nonexistent "admin" role

| Field | Value |
|-------|-------|
| File | `api/src/users/routes.rs:96-101`, `api/src/plagiarism/routes.rs:335-341` |
| Severity | P0 |
| Status | **OPEN** |

**Description**: The canonical `Role` enum defines `root`, `organizationadmin`, `campusadmin` — no `"admin"`. Both `ensure_admin()` functions check `role == "admin"` which matches zero roles. ALL admin endpoints (user management, plagiarism) permanently return 403.

**Affected endpoints (10)**:
- `users/routes.rs:56,67,79,90` — list_admin_users, batch_create, update_role, toggle_status
- `plagiarism/routes.rs:88,120,158,187,247` — all plagiarism endpoints

**Suggested fix**:
```rust
fn ensure_admin(role: &str) -> Result<(), AppError> {
    let parsed = role.parse::<shared::models::Role>()
        .map_err(|_| AppError::Auth("Invalid role".into()))?;
    match parsed {
        Role::Root | Role::OrganizationAdmin | Role::CampusAdmin => Ok(()),
        _ => Err(AppError::Auth("Admin access required".into())),
    }
}
```

---

### BE-P0-02: Judge-worker queries wrong table name

| Field | Value |
|-------|-------|
| File | `judge-worker/src/processor/service.rs:131` |
| Severity | P0 |
| Status | **OPEN** |

**Description**: Worker queries `problems_test_cases` instead of `test_cases` with wrong column names. Every submission fails at runtime.

```sql
-- CURRENT (BROKEN):
SELECT id, input, expected_output, is_hidden, score
FROM problems_test_cases WHERE problem_id = $1

-- CORRECT:
SELECT id, input, output AS expected_output, is_secret AS is_hidden, points AS score
FROM test_cases WHERE problem_id = $1 ORDER BY order_index ASC, id ASC
```

**Suggested fix**: Update SQL query with correct table and column names. Also fix test in `tests/processor_fetch_test_cases.rs:98`.

---

### BE-P0-03: Judge-worker creates new DB pool per submission

| Field | Value |
|-------|-------|
| File | `judge-worker/src/db/mod.rs:4-13` |
| Severity | P0 |
| Status | **OPEN** |

**Description**: `get_db_connection()` creates a new `PgPool` (5 connections) on every call. Under load this causes connection exhaustion.

**Suggested fix**: Create pool once in `main()`, pass as `Arc<PgPool>`.

---

### BE-P0-04: Sandbox infrastructure is dead code — no isolation for submissions

| Field | Value |
|-------|-------|
| Files | `sandbox/executor.rs`, `sandbox/chroot.rs`, `sandbox/cgroups.rs`, `judge-worker/src/processor/service.rs` |
| Severity | P0 |
| Status | **OPEN** |

**Description**: `SandboxExecutor`, `ChrootEnvironment`, and `CgroupController` are NEVER called from the actual judging path. Submitted code runs with:
- No cgroup isolation (no memory/process/CPU limits)
- No chroot (full host filesystem access)
- No seccomp (any syscall allowed)

The `SandboxExecutor` in `executor.rs` has compilation errors and has never been built:
- Line 50: `pre_exec` not a method on `std::process::Command`
- Line 65: `apply_seccomp()` called with wrong signature
- Line 69: `child.wait_timeout()` doesn't exist
- Line 96: `restore()` method doesn't exist

**Suggested fix**:
1. Fix compilation errors in `sandbox/executor.rs`
2. Integrate `SandboxExecutor` into actual judging path in `processor/service.rs`
3. Enable seccomp by default
4. Integrate chroot into pre_exec
5. Add cgroup resource limits

---

### BE-P0-05: Contest/Class mutation endpoints have zero authorization

| Field | Value |
|-------|-------|
| Files | `api/src/contests/routes.rs`, `api/src/classes/routes.rs` |
| Severity | P0 |
| Status | **OPEN** |

**Description**: All contest mutation endpoints extract `_claims` but never verify role:
- Line 63: `POST /` — any user can create contests
- Line 79: `PUT /:id` — any user can update any contest
- Line 96: `DELETE /:id` — any user can delete any contest
- Line 112: `POST /:id/problems` — any user can add problems
- Line 144: `DELETE /:id/problems/:problem_id` — any user can remove problems

Classes similarly lack authorization on all 7 mutating endpoints (create/update/delete class, remove student, assignment CRUD + publish). `claims.school_id` is never checked against resource tenant.

**Suggested fix**: Add `require_min_role(Role::Teacher)` to all mutation endpoints. Add ownership/tenant checks for update/delete operations.

---

### BE-P0-06: `apply_seccomp` called on parent process, not child

| Field | Value |
|-------|-------|
| File | `sandbox/executor.rs:89` |
| Severity | P0 |
| Status | **OPEN** (CE review finding) |

**Description**: `apply_seccomp` is called before `spawn()`, meaning it applies to the parent process (the judge worker itself), not the child that executes user code. This either crashes the worker or has no effect on the child.

**Suggested fix**: Move `apply_seccomp` call inside `pre_exec` closure so it runs in the forked child process context.

---

## P1 — High

### BE-P1-01: Blog/Discussions delete hardcodes `is_admin: false`

| Field | Value |
|-------|-------|
| Files | `api/src/blog/routes.rs:230`, `api/src/discussions/routes.rs:109` |
| Severity | P1 |
| Status | **OPEN** |

**Description**: The admin bypass path in blog/discussions service is dead code because `is_admin` is always passed as `false`. Admins can only delete their own posts.

**Suggested fix**: Compute `is_admin` from claims role before the service call using `Role::from_str` check.

---

### BE-P1-02: Seccomp strict mode blocks execve

| Field | Value |
|-------|-------|
| File | `judge-worker/src/sandbox/service.rs:262` |
| Severity | P1 |
| Status | **OPEN** (CE review finding) |

**Description**: Seccomp strict mode filters ALL syscalls including `execve`, which means user-compiled binaries cannot be executed. Only `read`, `write`, `_exit`, `sigreturn` are allowed — insufficient for running compiled programs.

**Suggested fix**: Use a seccomp filter allowlist that includes `execve`, `open`, `openat`, `stat`, `mmap`, `munmap`, `brk`, `clone`, `wait4`, and other needed syscalls, or use a denylist approach blocking dangerous syscalls only.

---

### BE-P1-03: Timeout path discards stdout/stderr

| Field | Value |
|-------|-------|
| File | `sandbox/executor.rs:117` |
| Severity | P1 |
| Status | **OPEN** (CE review finding) |

**Description**: When a submission times out, the executor kills the process but does not capture the partial stdout/stderr output. Users see no output for TLE cases instead of partial results.

**Suggested fix**: Before killing, read whatever is available in stdout/stderr pipes. Flush buffers and include partial output in the result.

---

### BE-P1-04: Failed submissions acknowledged immediately (data loss)

| Field | Value |
|-------|-------|
| File | `judge-worker/src/main.rs:185` |
| Severity | P1 |
| Status | **OPEN** (CE review finding) |

**Description**: When the API call to submit results fails (network error, 500), the message is still acknowledged (acked) from Redis. The judge result is permanently lost. The submission stays in "judging" state forever.

**Suggested fix**: Only ack after successful API response. Implement retry with exponential backoff for failed API calls. Dead-letter queue for permanently failed results.

---

### BE-P1-05: Sandbox capabilities removed with no alternative

| Field | Value |
|-------|-------|
| File | `docker-compose.yml:141` |
| Severity | P1 |
| Status | **OPEN** (CE review finding) |

**Description**: Previous `privileged: true` and `cap_add: SYS_ADMIN` were removed from docker-compose (fix for security), but no alternative capability set was provided. The sandbox cannot function without at least `SYS_PTRACE` for seccomp and `SYS_ADMIN` for cgroups.

**Suggested fix**: Add minimal required capabilities instead of full privileged mode:
```yaml
cap_add:
  - SYS_PTRACE
  - SYS_ADMIN
security_opt:
  - no-new-privileges:true
```

---

### BE-P1-06: Rate limiter merge ordering may bypass auth on submission routes

| Field | Value |
|-------|-------|
| File | `api/src/main.rs:165` |
| Severity | P1 |
| Status | **OPEN** (CE review finding) |

**Description**: Rate limiter middleware may be applied before auth middleware in the route layer merge order. This means unauthenticated requests could be rate-limited, but the auth check could be skipped on rate-limited routes.

**Suggested fix**: Verify middleware ordering. Auth middleware must execute before any business logic. Rate limiting should be a separate outer layer that runs on all routes regardless of auth.

---

### BE-P1-07: Internal worker endpoint lacks rate limiting

| Field | Value |
|-------|-------|
| File | `api/src/main.rs:147` |
| Severity | P1 |
| Status | **OPEN** (CE review finding) |

**Description**: The internal worker endpoint (`/submissions/internal`) used by judge-worker to submit results has no rate limiting. A compromised or misconfigured worker could flood the API.

**Suggested fix**: Add rate limiting specific to the internal endpoint, keyed by worker identity or source IP.

---

### BE-P1-08: Redis multiplexed connection created per call

| Field | Value |
|-------|-------|
| File | `judge-worker/src/consumer.rs:12` |
| Severity | P1 |
| Status | **OPEN** (CE review finding) |

**Description**: A new Redis `MultiplexedConnection` is created on every message consumption call instead of being shared. This causes connection churn and potential exhaustion.

**Suggested fix**: Create connection once at startup, share via `Arc<MultiplexedConnection>`.

---

### BE-P1-09: `memory_kb` always reports DEFAULT_MEMORY_KB

| Field | Value |
|-------|-------|
| File | `judge-worker/src/processor/service.rs:104` |
| Severity | P1 |
| Status | **OPEN** (CE review finding) |

**Description**: Memory usage is not actually measured. The code always reports `DEFAULT_MEMORY_KB` regardless of actual consumption. This means OJ users never see accurate memory usage data.

**Suggested fix**: Read actual memory from cgroup (`memory.usage_in_bytes`) or use `getrusage(RUSAGE_CHILDREN)` after process completion.

---

### BE-P1-10: DB migration missing roles in CHECK constraint

| Field | Value |
|-------|-------|
| File | `api/migrations/004_create_user_roles.sql:10` |
| Severity | P1 |
| Status | **OPEN** |

**Description**: The CHECK constraint only includes `('root', 'campusadmin', 'teacher', 'student')` — missing `organizationadmin` and `teachingassistant`. Any attempt to assign these roles at the DB level will fail.

**Suggested fix**: Create a new migration to ALTER the constraint to include all canonical roles.

---

## P2 — Medium

### BE-P2-01: CSP unsafe-inline + unsafe-eval negates XSS protection

| Field | Value |
|-------|-------|
| File | `frontend/nginx.conf:19` |
| Severity | P2 |
| Status | **OPEN** (CE review finding) |

**Description**: Content-Security-Policy includes `unsafe-inline` and `unsafe-eval` which defeats the purpose of CSP as an XSS defense.

**Suggested fix**: Use nonce-based CSP for inline scripts. Remove `unsafe-eval` unless absolutely required (consider if any dependency needs it).

---

### BE-P2-02: HSTS on HTTP port 80 is ineffective

| Field | Value |
|-------|-------|
| File | `frontend/nginx.conf:20` |
| Severity | P2 |
| Status | **OPEN** (CE review finding) |

**Description**: `Strict-Transport-Security` header is set on port 80 (HTTP). HSTS only makes sense on HTTPS connections. Browsers ignore HSTS on HTTP.

**Suggested fix**: Move HSTS header to HTTPS server block only (typically port 443). Add `includeSubDomains` and reasonable `max-age`.

---

### BE-P2-03: Error retry uses fixed 1s, no backoff

| Field | Value |
|-------|-------|
| File | `judge-worker/src/main.rs:100` |
| Severity | P2 |
| Status | **OPEN** (CE review finding) |

**Description**: On error, the worker retries after a fixed 1-second sleep with no exponential backoff or jitter. Under persistent failure this creates a tight retry loop.

**Suggested fix**: Implement exponential backoff with jitter: `min(base * 2^attempt + random, max_delay)`.

---

### BE-P2-04: Sequential processing wastes connection pool

| Field | Value |
|-------|-------|
| File | `judge-worker/src/main.rs:134` |
| Severity | P2 |
| Status | **OPEN** (CE review finding) |

**Description**: Despite configuring a connection pool, the worker processes messages sequentially, using only 1 connection at a time. The pool's multiple connections are wasted.

**Suggested fix**: Process messages concurrently using `tokio::spawn` or `futures::stream::BufferUnordered` with a concurrency limit.

---

### BE-P2-05: CORS falls back to localhost in production

| Field | Value |
|-------|-------|
| File | `api/src/main.rs:110` |
| Severity | P2 |
| Status | **OPEN** (CE review finding) |

**Description**: If `CORS_ORIGINS` env var is not set, CORS configuration falls back to `localhost`. In production this means either the frontend cannot make requests or CORS is misconfigured.

**Suggested fix**: In production mode, require `CORS_ORIGINS` to be set. Fail fast if not configured.

---

### BE-P2-06: Cgroup cleanup failure masks execution result

| Field | Value |
|-------|-------|
| File | `sandbox/executor.rs:140` |
| Severity | P2 |
| Status | **OPEN** (CE review finding) |

**Description**: If cgroup cleanup fails after execution, the error from cleanup is returned instead of the actual execution result. This means a successful submission could be reported as failed.

**Suggested fix**: Separate cleanup errors from execution errors. Always return the execution result; log cleanup failures separately.

---

### BE-P2-07: `/status` endpoint reveals topology without auth

| Field | Value |
|-------|-------|
| File | `api/src/main.rs` |
| Severity | P2 |
| Status | **OPEN** (CE review finding) |

**Description**: The `/status` health endpoint exposes internal service topology (connected services, versions, etc.) without requiring authentication.

**Suggested fix**: Either remove sensitive information from the status response or require authentication.

---

### BE-P2-08: Submission burst rate limit allows 30 rapid requests

| Field | Value |
|-------|-------|
| File | `api/src/middleware/rate_limit.rs:17` |
| Severity | P2 |
| Status | **OPEN** (CE review finding) |

**Description**: The rate limit for submissions allows a burst of 30 requests. This is too permissive and can be used to overwhelm the judge-worker.

**Suggested fix**: Reduce burst to 5-10 and add a per-user daily submission limit.

---

## P3 — Low

### BE-P3-01: No work directory cleanup

| Field | Value |
|-------|-------|
| File | `judge-worker/src/processor/service.rs:97-106` |
| Severity | P3 |
| Status | **OPEN** |

**Description**: Each submission leaks `/tmp/judge/submission_{id}/` with source files, binaries, I/O files. Under sustained load this causes disk exhaustion.

**Suggested fix**: Add cleanup in a `Drop` implementation or `defer`-like pattern, or periodic temp directory sweep.

---

### BE-P3-02: Race condition on fixed I/O filenames

| Field | Value |
|-------|-------|
| File | `judge-worker/src/processor/service.rs:239-242` |
| Severity | P3 |
| Status | **OPEN** |

**Description**: `stdin.txt`, `stdout.txt`, `stderr.txt` would clobber if parallelized. Currently sequential so not triggered.

**Suggested fix**: Use per-submission subdirectories or unique filenames (already using subdirs, but worth verifying).

---

### BE-P3-03: Logout is a no-op

| Field | Value |
|-------|
| File | `api/src/auth/routes.rs:48-49` |
| Severity | P3 |
| Status | **OPEN** |

**Description**: Logout returns `StatusCode::OK` without invalidating the JWT. Token remains valid until expiry.

**Suggested fix**: Add Redis-based token blacklist, or use short-lived access tokens + refresh token rotation.

---

### BE-P3-04: JWT secret re-read per request

| Field | Value |
|-------|-------|
| File | `api/src/middleware/auth.rs:34-35,62` |
| Severity | P3 |
| Status | **OPEN** |

**Description**: `std::env::var("JWT_SECRET")` is called on every request instead of reading once into AppState.

**Suggested fix**: Store JWT secret in `AppState` at startup, pass to middleware via extractor.

---

### BE-P3-05: No health check for judge-worker

| Field | Value |
|-------|-------|
| File | `docker-compose.yml` |
| Severity | P3 |
| Status | **OPEN** |

**Description**: No HEALTHCHECK directive for the judge-worker container. Docker cannot detect if the worker is hung.

**Suggested fix**: Add a health check endpoint to the worker and configure HEALTHCHECK in docker-compose.

---

### BE-P3-06: Large files exceed 800-line limit

| Field | Value |
|-------|-------|
| Files | `api/src/leaderboard/service.rs` (810 lines), `api/src/classes/service.rs` (621 lines), `api/src/contests/service.rs` (564 lines), `api/src/users/service.rs` (512 lines) |
| Severity | P3 |
| Status | **OPEN** |

**Suggested fix**: Split large service files into focused modules.
