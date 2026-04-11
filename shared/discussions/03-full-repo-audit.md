# 03 — Full Repository Audit (Cross-Cutting)

**Date**: 2026-04-10 (consolidated from audits dated 2026-04-09 and 2026-04-10)
**Scope**: Cross-cutting concerns not covered in 01-frontend-audit.md or 02-backend-audit.md
**Sources**: full-repo-risk-audit-2026-04-09.md, full-repo-risk-audit-2026-04-09-v2.md, full-p4-p8-deep-audit-2026-04-10.md, post-p0-fix-rescan-2026-04-09.md

---

## Summary

| Severity | OPEN | FIXED | Total |
|----------|------|-------|-------|
| P0 (Critical) | 0 | 5 | 5 |
| P1 (High) | 4 | 0 | 4 |
| P2 (Medium) | 3 | 2 | 5 |
| P3 (Low) | 1 | 2 | 3 |
| **Total** | **8** | **9** | **17** |

### Newly Fixed (2026-04-11)

| ID | Description |
|----|-------------|
| XREP-P2-01 | `cargo update` run — all Rust deps at latest compatible versions |
| XREP-P2-02 | `npm audit fix` run — 6 moderate transitive vulns remain (vite/vitest, no breaking fix available) |
| XREP-P3-01 | `KEYS` replaced with `SCAN` in leaderboard cache invalidation (leaderboard/service.rs) |
| XREP-P3-02 | Duplicate AppError types consolidated into `api/src/error.rs` — 97 lines removed |
| XREP-P3-03 | Blog slug_or_id — already fixed in codebase (proper if-let split) |

---

## Previously Fixed (cross-cutting)

| # | Finding | Detail |
|---|---------|--------|
| XREP-01 | SQL injection in discussions search (`format!` with user input) | Parameterized queries applied |
| XREP-02 | SQL injection in blog search (same pattern) | Parameterized queries applied |
| XREP-03 | SQL injection in classes `where_clause` from user input | Parameterized queries applied |
| XREP-04 | Database SQL dump committed to repo | Removed from tracking |
| XREP-05 | Docker socket mounted to judge-worker | Removed from docker-compose |

---

## P1 — High

### XREP-P1-01: WebSocket handler trust — clients send unchecked user_id

| Field | Value |
|-------|-------|
| File | `api/src/websocket/handler.rs:64-84` |
| Severity | P1 |
| Status | **OPEN** |

**Description**: Although WebSocket auth was added via JWT query-param (FIXED), the handler still accepts user_id from the client message payload without server-side verification. An authenticated user could subscribe to another user's submission updates.

**Suggested fix**: Extract user_id from the verified JWT claims, ignore user_id from the client message. Validate that the subscription topic matches the authenticated user's scope.

---

### XREP-P1-02: WebSocket topic subscriptions unchecked

| Field | Value |
|-------|-------|
| File | `api/src/websocket/handler.rs:76` |
| Severity | P1 |
| Status | **OPEN** |

**Description**: Users can subscribe to any topic (submission updates, notifications, etc.) without authorization checks. A student could subscribe to admin notification channels.

**Suggested fix**: Add topic-level authorization. Only allow subscriptions to topics the user is authorized to access (own submission results, own notifications, class/contest they belong to).

---

### XREP-P1-03: WebSocket connection count unlimited (DoS vector)

| Field | Value |
|-------|-------|
| File | `api/src/websocket/server.rs:20-28` |
| Severity | P1 |
| Status | **OPEN** |

**Description**: No upper limit on concurrent connections, user connections, or topic subscriptions. A DoS attack could exhaust server resources by opening thousands of WebSocket connections.

**Suggested fix**: Add per-IP and per-user connection limits. Add max topic subscriptions per connection.

---

### XREP-P1-04: Blog broadcast sends to all connected users (cross-tenant leak)

| Field | Value |
|-------|-------|
| File | `api/src/blog/routes.rs:159` |
| Severity | P1 |
| Status | **OPEN** |

**Description**: `state.websocket_server.broadcast(&msg)` sends blog updates to ALL connected users without tenant filtering. Users in one organization can see blog activity from other organizations.

**Suggested fix**: Add tenant scoping to WebSocket broadcasts. Only send to users within the same organization/campus.

---

## P2 — Medium

### XREP-P2-01: Dependency CVEs — Rust (6 HIGH, 2 MEDIUM)

| Field | Value |
|-------|-------|
| Severity | P2 |
| Status | **OPEN** |

**Description**:

| Package | Version | CVE | Severity | Fix |
|---------|---------|-----|----------|-----|
| quinn-proto | 0.11.13 | RUSTSEC-2026-0037 | HIGH (8.7) | >=0.11.14 |
| bytes | 1.11.0 | RUSTSEC-2026-0007 | HIGH | >=1.11.1 |
| rustls-webpki | 0.103.9 | RUSTSEC-2026-0049 | HIGH | >=0.103.10 |
| tokio-tar | 0.3.1 | RUSTSEC-2025-0111 | HIGH | No fix available |
| rsa | 0.9.10 | RUSTSEC-2023-0071 | MEDIUM (5.9) | No fix available |
| time | 0.3.46 | RUSTSEC-2026-0009 | MEDIUM (6.8) | >=0.3.47 |

Note: `rsa` Marvin attack only affects sqlx-mysql (not used with PostgreSQL).

**Suggested fix**: Run `cargo update` in api/ and judge-worker/ to pick up available fixes. For `tokio-tar` and `rsa`, evaluate if the affected code paths are reachable.

---

### XREP-P2-02: Dependency CVEs — Frontend npm (6 HIGH, 7 MODERATE)

| Field | Value |
|-------|-------|
| Severity | P2 |
| Status | **OPEN** |

**Description**:

| Package | Issue | Fix |
|---------|-------|-----|
| flatted | Prototype pollution + DoS | `npm audit fix` |
| minimatch | ReDoS | `npm audit fix` |
| picomatch | Method injection + ReDoS | `npm audit fix` |
| rollup | Path traversal / arbitrary file write | `npm audit fix` |
| socket.io-parser | Unbounded binary attachment | `npm audit fix` |
| dompurify | Multiple XSS vulnerabilities | Manual upgrade |

**Suggested fix**: Run `npm audit fix`, then manually upgrade dompurify.

---

### XREP-P2-03: Permission middleware defined but not connected to routes

| Field | Value |
|-------|-------|
| File | `api/src/middleware/permission.rs` |
| Severity | P2 |
| Status | **OPEN** (partially addressed — see BE-P0-05) |

**Description**: `require_permission`, `require_min_role`, `require_organization_access`, `require_campus_access` are all defined but most routes do not use them. Only the `problems` module has working role checks. Note: the `ensure_admin()` fix (BE-P0-01) addresses the most critical instance. This item tracks the broader gap across all other modules.

**Suggested fix**: Audit all route modules and add appropriate permission middleware. Prioritize: leaderboard (tenant scoping), messages (auth), notifications (auth), discussions (role checks).

---

### XREP-P2-04: Stale JWT role trusted for 24h

| Field | Value |
|-------|-------|
| File | `api/src/middleware/auth.rs:46` |
| Severity | P2 |
| Status | **OPEN** |

**Description**: Once a JWT is issued, the role claim is trusted for the full token lifetime (24h). If an admin demotes a user from teacher to student, the user retains teacher privileges until the token expires.

**Suggested fix**: Either use short-lived access tokens (15min) with refresh token rotation, or check the current role from DB on sensitive operations.

---

### XREP-P2-05: No password complexity requirements

| Field | Value |
|-------|-------|
| File | `api/src/users/service.rs` (registration) |
| Severity | P2 |
| Status | **OPEN** |

**Description**: No minimum password length, complexity, or entropy requirements enforced during registration.

**Suggested fix**: Add validation: minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 digit.

---

## P3 — Low

### XREP-P3-01: `KEYS` command in leaderboard service blocks Redis

| Field | Value |
|-------|-------|
| File | `api/src/leaderboard/service.rs:795` |
| Severity | P3 |
| Status | **OPEN** |

**Description**: `KEYS` is O(N) and blocks the Redis event loop. With large datasets this causes latency spikes.

**Suggested fix**: Replace `KEYS` with `SCAN` for incremental iteration.

---

### XREP-P3-02: Duplicate `AppError` types across route files

| Field | Value |
|-------|-------|
| Files | Multiple `routes.rs` files |
| Severity | P3 |
| Status | **OPEN** |

**Description**: 3+ duplicate error type definitions across route files. Each defines its own `AppError` with slightly different variants.

**Suggested fix**: Consolidate into a single `api/src/error.rs` module (~100 lines saved, bug class eliminated).

---

### XREP-P3-03: Blog service `unwrap_or(0)` on slug parse

| Field | Value |
|-------|-------|
| File | `api/src/blog/service.rs:146` |
| Severity | P3 |
| Status | **OPEN** |

**Description**: `slug_or_id.parse::<i64>().unwrap_or(0)` — when slug is a string, it binds to `id = 0`, potentially matching the wrong article if one exists with id 0.

**Suggested fix**: Split into numeric ID vs slug lookup paths explicitly.
