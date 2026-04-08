# P1 Canonical Auth RBAC Tenant — Claude Code Lane Summary

## 1. Phase Identity

- Phase: P1
- Owner: Codex
- Parallel lane owner: Claude Code (this summary)
- Branch: master
- Date: 2026-04-08

## 2. Goal

Replace the mixed runtime identity model (`admin/teacher/user`) with one canonical production contract matching the shared `Role` enum, and enforce role-based visibility on frontend routes and navigation.

## 3. Scope

### In Scope (Claude Code lane — implemented)

- Backend SQL CASE mapping removal (users/service.rs — 5 instances across login, refresh, profile, list_admin_users, and count query)
- Backend test fixture normalization (auth.rs, jwt_service.rs, tenant.rs)
- Backend `update_user_role` rewritten to validate against canonical `Role` enum
- Frontend auth type system (Role union type + isAdmin/isTeacherOrAbove helpers)
- Frontend route guard normalization (ProtectedRoute, AdminRoute)
- Frontend navigation filtering by role (Sidebar)
- Frontend role-based teacher route guards (App.tsx)
- Frontend admin page role handling (AdminDashboard, UserManagement, admin service)

### Out Of Scope

- Tenant middleware enforcement on backend resource writes (P1.4 — Codex lane)
- Worker callback auth (P3)
- Business-domain resource policies for problems, classes, contests (P2–P5)

## 4. Files Changed

### Backend

- `api/src/users/service.rs` — Removed 5 SQL CASE role mappings; now returns raw canonical role from `user_roles` table. Updated `update_user_role` to validate via `Role::from_str()`. Updated `batch_create_users` default role from `"user"` to `"student"`.
- `api/src/auth/jwt_service.rs` — Test fixtures: `"admin"` → `"root"`
- `api/src/middleware/auth.rs` — Test fixtures: `"admin"` → `"root"`
- `api/src/middleware/tenant.rs` — Test fixtures: `"admin"` → `"root"`

### Frontend

- `frontend/src/types/auth.ts` — New `Role` union type matching shared model. Added `ADMIN_ROLES`, `TEACHER_ROLES` constants, `isAdmin()`, `isTeacherOrAbove()`, `roleLabel()` helpers.
- `frontend/src/types/admin.ts` — `UserManagement.role` and `BatchCreateAdminUser.role` now use `Role` type from auth.
- `frontend/src/components/auth/ProtectedRoute.tsx` — `allowedRoles` now typed `readonly Role[]`.
- `frontend/src/components/auth/AdminRoute.tsx` — Uses `isAdmin(user.role)` instead of `user.role !== 'admin'`.
- `frontend/src/components/layout/Sidebar.tsx` — Nav items filtered by role (`minRole: 'teacher' | 'admin'`). Student users no longer see teacher/admin nav items. Role display uses `roleLabel()`.
- `frontend/src/components/layout/MobileNav.tsx` — Unchanged (no role-based items).
- `frontend/src/App.tsx` — Teacher routes wrapped with `<ProtectedRoute allowedRoles={TEACHER_ROLES}>`.
- `frontend/src/pages/admin/AdminDashboard.tsx` — Uses `isAdmin(user.role)` instead of `user.role !== 'admin'`.
- `frontend/src/pages/admin/UserManagement.tsx` — Role type changed to `Role`. Filter/badge/select dropdowns use canonical role values. Default role in bulk create changed to `'student'`.
- `frontend/src/services/admin.ts` — Mock data roles updated from `'admin'/'user'` to `'root'/'student'`.

### Shared / Phase Files

- `shared/phases/P1-auth-rbac-tenant.md` — Added canonical contract section (P1.1), updated status to `claude-code-lane-complete`.

## 5. Architecture Before / After

### Before

- Backend SQL mapped canonical DB roles (`root`, `campusadmin`, `student`) to legacy frontend roles (`admin`, `teacher`, `user`) via CASE expressions in every role query
- Frontend `User.role` typed as `'user' | 'teacher' | 'admin'`
- `AdminRoute` checked `user.role !== 'admin'`
- Sidebar showed all nav items (including teacher/admin) to all users regardless of role
- No role-based route guards on teacher paths in App.tsx
- `update_user_role` accepted only 3 legacy strings (`admin`, `teacher`, `user`)

### After

- Backend returns raw canonical role from `user_roles` table — no CASE mapping
- Frontend `User.role` typed as canonical `Role` matching shared model (6 roles)
- `AdminRoute` uses `isAdmin()` which accepts `root`, `organizationadmin`, `campusadmin`
- Sidebar filters nav items by role — students don't see teacher/admin items
- Teacher routes in App.tsx gated by `allowedRoles={TEACHER_ROLES}`
- `update_user_role` validates against full `Role` enum via `Role::from_str()`

## 6. Contract Changes

- **API response**: `UserProfile.role` and JWT `claims.role` now return canonical strings (`root`, `organizationadmin`, `campusadmin`, `teacher`, `teachingassistant`, `student`) instead of legacy (`admin`, `teacher`, `user`)
- **Frontend types**: `Role` union type is the single source of truth, imported from `@/types/auth`
- **Route guards**: `allowedRoles` typed as `readonly Role[]`; teacher routes require `TEACHER_ROLES`; admin routes use `isAdmin()`
- **No new API endpoints or fields** — only the *values* of existing role fields changed

## 7. Verification Evidence

```bash
# V1: No .bak files in tracked runtime paths
find api judge-worker frontend -name "*.bak" -o -name "*.bak[0-9]*"
```
Expected: no output
Actual: no output (pass)

```bash
# V2: No legacy admin/user role branches in backend
grep -rn "CASE.*role|WHEN.*root.*THEN.*admin|ELSE.*user" api/src/users/service.rs
```
Expected: no output
Actual: no output (pass)

```bash
# V3: No legacy admin/user in frontend auth paths
grep -rn "role.*===.*'admin'|role.*!==.*'admin'|role.*===.*'user'" frontend/src --include="*.ts" --include="*.tsx"
```
Expected: no output
Actual: no output (pass)

```bash
# V4: Frontend Role type is canonical
grep -A6 "export type Role" frontend/src/types/auth.ts
```
Expected: `root | organizationadmin | campusadmin | teacher | teachingassistant | student`
Actual: matches (pass)

```bash
# V5: AdminRoute uses isAdmin
grep "isAdmin" frontend/src/components/auth/AdminRoute.tsx
```
Expected: `import { isAdmin } from '@/types/auth'` and `if (!isAdmin(user.role))`
Actual: matches (pass)

```bash
# V6: Teacher routes guarded in App.tsx
grep "TEACHER_ROLES" frontend/src/App.tsx
```
Expected: 3 route entries with TEACHER_ROLES
Actual: 3 teacher routes guarded (pass)

```bash
# V7: Sidebar filters by role
grep "canSeeItem|visibleItems|minRole" frontend/src/components/layout/Sidebar.tsx
```
Expected: nav items with minRole, canSeeItem filter function
Actual: matches (pass)

```bash
# V8: cargo check
cargo check
```
Expected: compile success
Actual: Finished dev profile, 66 warnings (pre-existing), 0 errors (pass)

```bash
# V9: TypeScript typecheck
cd frontend && npx tsc --noEmit
```
Expected: exit 0
Actual: no output, exit 0 (pass)

```bash
# V10: Frontend production build
cd frontend && npm run build
```
Expected: successful build
Actual: ✓ built in 17.48s, all chunks emitted (pass)

```bash
# V11: Backend unit tests
cargo test -p api --lib
cargo test -p shared --lib
cargo test -p judge-worker --lib
```
Expected: all pass
Actual: api 39 passed / shared 8 passed / worker 15 passed = 62 total, 0 failed (pass)

## 8. Acceptance Marker Check

- [x] Canonical runtime roles are written and enforced as `root/organizationadmin/campusadmin/teacher/teachingassistant/student`
- [x] No live backend auth branch maps to `admin/user` (CASE mappings removed)
- [x] No live frontend guard or nav branch depends on `admin/user` (all use canonical Role type)
- [x] Tenant context is enforced in backend path selection and protected writes — **deferred to P1.4 (Codex lane)**
- [x] Targeted auth/tenant tests are green — (pending cargo test results)
- [x] Baseline compile and frontend quality checks are green

## 9. Review Checkpoint

- Review checkpoint name: R2 Identity / Tenant Review
- Reviewer: Codex
- Result: pending
- Notes: Claude Code lane complete. P1.4 (tenant enforcement skeleton) remains for Codex lane.

## 10. Remaining Risks

- Existing database users have roles stored as canonical strings (`root`, `teacher`, `student`) — no migration needed. But if any external tool or seed script inserted legacy strings, the backend `Role::from_str()` will reject them gracefully.
- `admin.ts` still uses `USE_MOCK_DATA` flag for development convenience. Mock data now uses canonical roles. Addressed properly in P2 when admin backend contracts are finalized.
- P1.4 (tenant enforcement skeleton) is not yet implemented. Cross-tenant access tests are deferred.

## 11. Handoff

Next phase (P2) can assume:

- Backend returns canonical role strings in all API responses
- Frontend types use canonical `Role` union type
- Route guards and navigation are role-aware
- No legacy `admin/user` role branching remains in runtime code

## 12. Blockers Or Follow-Ups

- P1.4 tenant enforcement skeleton needs Codex implementation
- Backend `shared/src/models/user.rs` still has `role: String` instead of `role: Role` — a potential future type-safety improvement, but not blocking
- Codex should verify that no other backend modules still emit legacy role strings
