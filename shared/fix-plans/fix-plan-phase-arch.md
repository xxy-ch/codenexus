# Fix Plan — Phase 3: Architectural Fixes

**Date**: 2026-04-11
**Status**: IN PROGRESS
**Scope**: Sandbox integration, Auth migration (httpOnly cookies), Dead Letter Queue

---

## Summary

Three architectural changes approved by user. All preserve system coherence and runnability.

| Phase | Items Fixed | Audit IDs |
|-------|-------------|-----------|
| A — Sandbox Integration | 6 | BE-P0-04, BE-P0-06, BE-P1-02, BE-P1-03, BE-P1-05, BE-P2-06 |
| B — Auth Migration | 2 | FE-P0-01, FE-P1-05 |
| C — Dead Letter Queue | 1 | BE-P1-04 |

---

## Phase A: Sandbox Integration

### Current State
- `processor/service.rs` already calls `apply_seccomp()` in `pre_exec` (line 254-257)
- `processor/service.rs` already uses file-based stdout/stderr (partial output captured on timeout, lines 304-306)
- `CgroupController` exists in `sandbox/cgroups.rs` but is NEVER called from judging path
- `SandboxExecutor` in `sandbox/executor.rs` is NEVER used (dead code with compilation errors)
- `docker-compose.yml` has `privileged: true` + `cap_add: SYS_ADMIN`

### Changes

#### A1. Fix docker-compose.yml capabilities
- **File**: `docker-compose.yml:139-142`
- Replace `privileged: true` + `cap_add: SYS_ADMIN` with minimal capabilities:
  ```yaml
  cap_add:
    - SYS_PTRACE
    - SYS_ADMIN
  security_opt:
    - no-new-privileges:true
  ```
- Keep docker.sock mount for potential container-based isolation later

#### A2. Improve seccomp filter (denylist approach)
- **File**: `judge-worker/src/sandbox/seccomp.rs`
- Replace current "do nothing by default, strict on env var" with a proper denylist
- Block dangerous syscalls: `mount`, `umount2`, `ptrace`, `fork`, `vfork`, `execveat` (with execve allowed), `clone` (with CLONE_NEWUSER denied), `reboot`, `init_module`, `delete_module`, `keyctl`, `clock_settime`, `pivot_root`, `swapoff`, `swapon`, `chroot`, `sethostname`, `setdomainname`, `iopl`, `ioperm`, `create_module`, `query_module`, `get_kernel_syms`, `nfsservctl`, `lookup_dcookie`, `syslog` (for modify), `vhangup`, `quotactl`
- Use `libseccomp_sys` for BPF filter construction (already a dependency)

#### A3. Integrate CgroupController into processor
- **File**: `judge-worker/src/processor/service.rs`
- Create per-submission cgroup with limits from `submission.memory_limit_mb` and `submission.time_limit_ms`
- Add process to cgroup before execution
- Read memory usage from cgroup after execution (use `get_max_memory_usage()`)
- Clean up cgroup after execution (in a `Drop` or finally block)
- Remove old `getrusage` fallback — use cgroup `memory.peak` as primary, `getrusage` as fallback

#### A4. Clean up SandboxExecutor (dead code)
- **File**: `judge-worker/src/sandbox/executor.rs`
- Remove or mark as deprecated — the actual execution is in processor/service.rs
- Keep `ExecutionResult` type if referenced elsewhere

### Verification
- `cargo check -p judge-worker` passes
- Cgroup paths created under `/sys/fs/cgroup/onlinejudge/judge-worker-{pid}-{submission_id}/`
- Memory limit enforced (test with OOM-prone submission)
- Seccomp blocks mount/ptrace but allows execve/open/mmap

---

## Phase B: Auth Migration (httpOnly Cookies)

### Current State
- Frontend stores JWT in localStorage (`oj_token`, `token`, `oj_refresh_token`, `refresh_token`)
- Frontend sends `Authorization: Bearer <token>` header on every request
- Backend auth middleware reads from `Authorization` header only
- `withCredentials: true` already set in axios config
- zustand `persist` middleware saves to localStorage

### Changes

#### B1. Backend: Set-Cookie on auth responses
- **File**: `api/src/auth/routes.rs`
- On `login`, `register`, `refresh`: add `Set-Cookie` headers:
  - `access_token`: httpOnly, Secure (in production), SameSite=Strict, Path=/, Max-Age=14400 (4h)
  - `refresh_token`: httpOnly, Secure (in production), SameSite=Strict, Path=/api/auth/refresh, Max-Age=604800 (7d)
- Keep returning tokens in JSON body for backward compatibility during transition
- Add cookie helper function to avoid repetition

#### B2. Backend: Auth middleware reads cookie fallback
- **File**: `api/src/middleware/auth.rs`
- Current flow: `Authorization: Bearer <token>` → validate
- New flow: `Authorization` header → validate. If missing, try `access_token` cookie → validate
- This maintains backward compatibility — both header and cookie work

#### B3. Frontend: Remove localStorage token management
- **Files**:
  - `frontend/src/services/api.ts` — Remove request interceptor that reads localStorage for Bearer token. Keep `withCredentials: true` (cookies sent automatically).
  - `frontend/src/services/api.ts` — Remove response interceptor that saves refresh token to localStorage. On 401, call `/auth/refresh` (cookies sent automatically), retry original request.
  - `frontend/src/store/authStore.ts` — Remove `persistAuthSession()` and `clearPersistedAuthSession()`. Remove zustand `persist` middleware. Keep user info in memory only.
  - `frontend/src/hooks/useAuth.ts` — Remove `localStorage.removeItem()` calls. `checkAuth` calls `/users/me` with credentials, no token needed.
  - `frontend/src/services/websocket.ts` — Remove `localStorage.getItem('oj_user')` for WebSocket URL construction.
  - `frontend/src/services/config.ts` — Remove `STORAGE_KEYS.TOKEN` and `STORAGE_KEYS.REFRESH_TOKEN`.

### Verification
- Login sets httpOnly cookies, frontend doesn't touch tokens
- Protected routes work via cookies (no Authorization header needed)
- Token refresh works via httpOnly cookie
- XSS cannot steal tokens (httpOnly)
- `tsc --noEmit` passes

---

## Phase C: Dead Letter Queue

### Current State
- `judge-worker/src/main.rs` already doesn't ack on API send failure (line 167-168 returns false)
- But the spawned task just returns `false` — the message stays in pending state forever
- No retry mechanism within the spawned task

### Changes

#### C1. Add retry with backoff for API result submission
- **File**: `judge-worker/src/main.rs`
- In the spawned task, wrap `send_result_to_api` with retry logic:
  - Max 3 retries with exponential backoff (1s, 2s, 4s)
  - If all retries fail, write to Redis dead letter queue
  - Then ack the original message (don't leave it pending)

#### C2. Add DLQ functions
- **File**: `judge-worker/src/queue/consumer.rs` (or new `queue/dlq.rs`)
- `write_to_dlq(conn, submission_id, result_json)` — XADD to `submissions:dlq` stream
- `get_dlq_entries(conn, count)` — XRANGE for recovery/admin
- DLQ entry format: `{ submission_id, result_json, failed_at, reason }`

#### C3. (Optional) DLQ recovery endpoint on API
- Admin endpoint to replay DLQ entries
- This can be deferred — the DLQ write itself prevents data loss

### Verification
- Failed API calls retry up to 3 times
- After max retries, result written to DLQ
- Original message acked (not left pending)
- DLQ entries readable via Redis CLI

---

## Execution Order

1. **Git checkpoint**: Push current state as checkpoint
2. **Phase A** (sandbox): A1 → A2 → A3 → A4 (sequential, each depends on previous)
3. **Phase B** (auth): B1 → B2 → B3 (backend first, then frontend)
4. **Phase C** (DLQ): C1 → C2 (sequential)
5. **Verify**: cargo check + tsc --noEmit + git commit

Phases B and C are independent and can run in parallel after Phase A completes.
