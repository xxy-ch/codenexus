# Unified Policy Matrix

**Date**: 2026-04-11
**Status**: Authoritative — all P4-P7 implementation must reference these rules.

---

## 1. Callback Trust Rule (P3)

| Aspect | Policy |
|--------|--------|
| Auth | Judge result endpoints require `X-Worker-Secret` header matching `WORKER_SECRET` |
| Path/Body ID | `Path(id)` must equal `Json(result).submission_id` — mismatch returns 400 |
| State machine | Terminal states (`accepted`, `wrong_answer`, `runtime_error`, `compilation_error`, `time_limit_exceeded`, `memory_limit_exceeded`, `system_error`) cannot be overwritten. Only `pending` → `judging` → terminal transitions allowed |
| Idempotency | Duplicate callback with same submission_id and same status is accepted (200) but ignored |
| Rate limit | Internal endpoint rate-limited by IP, separate from user-facing limits |

## 2. Class/Assignment Owner Rule (P4)

| Aspect | Policy |
|--------|--------|
| Read access | Must be authenticated. Members see own classes. Teachers see classes they own. Admins see all in their org |
| Write access | `require_teacher_plus` + owner check: `class.teacher_id == claims.sub` OR admin role |
| Tenant scope | `class.organization_id == claims.school_id` for all operations |
| Student list | Only class teacher/admin can view student list |
| Assignment CRUD | Only class teacher/admin can create/update/delete/publish assignments |
| Self-enrollment | Allowed via enrollment code. Student must be in same organization |
| Remove student | Only class teacher/admin, within same tenant |

## 3. Contest Management Rule (P5)

| Aspect | Policy |
|--------|--------|
| Create/Update/Delete | `require_teacher_plus` + `contest.creator_id == claims.sub` OR admin role |
| Tenant scope | `contest.organization_id == claims.school_id` |
| Problem mutation | Only contest creator/admin within same tenant |
| Participant visibility | Participants see contests they registered for. Teachers see all in their org. Admins see all |
| Rankings visibility | Scoped by claims: students see own school, teachers see own school, admins see all |

## 4. Leaderboard Visibility Rule (P5)

| Endpoint | Scope | Auth Required | Visibility |
|----------|-------|--------------|------------|
| `/global` | All users | No | Public top N, no PII beyond username |
| `/school/:id` | School | Yes, `claims.school_id == :id` OR admin | School-scoped |
| `/campus/:id` | Campus | Yes, `claims.campus_id == Some(:id)` OR admin | Campus-scoped |
| `/class/:id` | Class | Yes, user must be class member OR teacher/admin | Class-scoped |
| `/user/:id/stats` | Single user | Yes, `claims.sub == :id` OR teacher/admin of same org | Own stats or admin |
| `/problem/:id` | Problem | No | Public top N solvers |

## 5. Search Visibility Rule (P6)

| Aspect | Policy |
|--------|--------|
| Problem search | Public problems visible to all. Private problems only to teachers/admins in same org |
| Discussion search | Visible based on discussion visibility + tenant scope |
| Article search | Visible based on article visibility + tenant scope |
| Claims usage | If authenticated, filter results to tenant scope. If unauthenticated, public only |

## 6. Community Realtime Rule (P6)

| Aspect | Policy |
|--------|--------|
| WebSocket topics | `submission` (own), `contest` (registered), `contest_chat` (registered) |
| Dead contracts | Frontend hooks for `discussion/article/trending` subscriptions are removed (no backend support) |
| Status | **Downgraded** — community realtime WebSocket features are not implemented. Only submission and contest WS are live |

---

## Test Matrix

| Wave | Test File | Covers |
|------|-----------|--------|
| 1 | `api/tests/callback_trust.rs` | Callback auth, path/body ID match, state machine, idempotency |
| 1 | `api/tests/class_authorization.rs` | Class/assignment CRUD owner/tenant rules |
| 2 | `api/tests/contest_leaderboard_scope.rs` | Contest mutation owner rules, leaderboard visibility |
| 3 | `api/tests/search_scope.rs` | Search claims-aware filtering |

## Change Log

| Date | Change |
|------|--------|
| 2026-04-11 | Initial creation from Codex RALPLAN analysis |
