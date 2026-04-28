# P2 Problem Test Case Admin Convergence — Claude Code Lane Summary

## 1. Phase Identity

- Phase: P2
- Owner: Codex
- Parallel lane owner: Claude Code (this summary)
- Branch: master
- Date: 2026-04-08

## 2. Goal

Make the problem domain production-safe: student reads are sanitized, management writes are role-bound, and frontend consumes different contracts for user vs management flows.

## 3. Scope

### In Scope (Claude Code lane — implemented)

- Backend test case list endpoint: student-safe `PublicTestCase` response vs full `ManagementTestCase` for teacher+ roles
- Backend test case CRUD: create, update, delete, batch_import now require `teacher+` role
- Backend problem CRUD: create and update require `teacher+`, delete requires admin
- Backend language settings: update requires admin role
- Frontend test case types: split into `PublicTestCase` (student-safe) and `ManagementTestCase` (full data)
- Frontend service: `getTestCases` explicitly returns `ManagementTestCase[]`, removed unused `PublicTestCase` import

### Out Of Scope

- Worker callback and result persistence (P3)
- Class, contest, or community permissions (P4–P5)
- Broad UI redesign not required by contract cleanup
- Tenant-level enforcement on problem writes (deferred to P1.4 Codex lane)
- Admin page contract cleanup beyond type alignment (P2.4 partial — frontend types aligned, admin page UI not changed)

## 4. Files Changed

### Backend

- `api/src/problems/test_cases.rs` — Added `PublicTestCase` struct. `list_test_cases` now returns `Json<serde_json::Value>`: management roles see full `TestCase` data; students see only non-hidden `PublicTestCase` metadata (id, problem_id, is_hidden, order). Added `require_teacher_plus()` guard to create, update, delete, batch_import.
- `api/src/problems/routes.rs` — Added `require_teacher_plus()` and `require_admin()` helpers. Applied role guards: `create_problem` (teacher+), `update_problem` (teacher+), `delete_problem` (admin), `update_supported_languages` (admin).

### Frontend

- `frontend/src/types/problems.ts` — Split `TestCase` into `PublicTestCase` (student-safe: id, problem_id, is_hidden, order) and `ManagementTestCase` (full: input, expected_output, is_hidden, order, score). `TestCase` kept as deprecated alias for `ManagementTestCase`. `TestCaseResult` fields `input`, `expected_output`, `actual_output` made optional.
- `frontend/src/services/problems.ts` — Updated import to use `ManagementTestCase` instead of old `TestCase`. Removed unused `PublicTestCase` import.

## 5. Architecture Before / After

### Before

- Single `TestCase` type served both student and management flows
- `list_test_cases` returned full data (input, expected_output, score) to all authenticated users
- No role check on test case CRUD — any logged-in user could create/update/delete test cases
- No role check on problem CRUD — any logged-in user could create/update/delete problems
- Language setting updates had no role enforcement
- Frontend imported a single `TestCase` type regardless of role context

### After

- Backend `list_test_cases` returns sanitized `PublicTestCase` (no input/output/score) to students; full `ManagementTestCase` to teacher+ roles
- Test case create/update/delete/batch_import require `teacher+` role
- Problem create/update requires `teacher+`; delete requires admin (root/orgadmin/campusadmin)
- Language setting updates require admin role
- Frontend explicitly uses `ManagementTestCase[]` for management flows

## 6. Contract Changes

- **GET /problems/{id}/test-cases**: Response shape now depends on caller role. Students receive `[{id, problem_id, is_hidden, order}]` — no input, expected_output, or score. Teacher+ roles receive full test case data.
- **POST/PUT/DELETE test cases**: Now return 403 Forbidden for non-teacher roles
- **POST/PUT problems**: Now return 403 Forbidden for non-teacher roles
- **DELETE problems**: Now return 403 Forbidden for non-admin roles
- **PUT language settings**: Now return 403 Forbidden for non-admin roles
- **Frontend types**: `PublicTestCase` and `ManagementTestCase` replace monolithic `TestCase`. `TestCase` remains as deprecated alias.

## 7. Verification Evidence

```bash
# V1: cargo check
cargo check
```
Expected: 0 errors
Actual: Finished dev profile, 66 warnings (pre-existing), 0 errors (pass)

```bash
# V2: TypeScript typecheck
cd frontend && npx tsc --noEmit
```
Expected: exit 0
Actual: no output, exit 0 (pass)

```bash
# V3: Frontend production build
cd frontend && npm run build
```
Expected: successful build
Actual: ✓ built in 18.50s (pass)

```bash
# V4: Backend unit tests
cargo test -p api --lib
cargo test -p shared --lib
cargo test -p judge-worker --lib
```
Expected: all pass
Actual: api 39 passed / shared 8 passed / worker 15 passed = 62 total, 0 failed (pass)

```bash
# V5: No hidden field leaks in frontend user-facing code
grep -rn "expected_output\|is_hidden" frontend/src/pages/user/ --include="*.ts" --include="*.tsx"
```
Expected: no references to expected_output or is_hidden in user pages
Actual: (user pages do not consume test case data directly — they use ProblemSubmission flow)

```bash
# V6: Backend role guards present
grep "require_teacher_plus\|require_admin" api/src/problems/routes.rs api/src/problems/test_cases.rs
```
Expected: guards on all write endpoints
Actual: routes.rs — create/update (teacher+), delete (admin), language update (admin); test_cases.rs — create/update/delete/batch (teacher+) (pass)

```bash
# V7: PublicTestCase struct exists in backend
grep "pub struct PublicTestCase" api/src/problems/test_cases.rs
```
Expected: struct definition
Actual: matches (pass)

## 8. Acceptance Marker Check

- [x] Student-visible problem routes do not expose hidden test data or expected outputs — `list_test_cases` returns `PublicTestCase` for non-management roles
- [x] Problem and test-case writes are restricted by role — teacher+ for create/update, admin for delete
- [x] Language and content config writes are restricted to the correct management roles — admin only
- [x] Frontend user pages no longer depend on management-only fields — `PublicTestCase` type is student-safe; `ManagementTestCase` explicitly used in admin flows
- [ ] Admin problem/config pages map to explicit backend-supported contracts — types aligned, admin page UI cleanup deferred to P2.4 full pass
- [x] Targeted tests and frontend quality checks are green — 62 tests passed, tsc clean, build clean

## 9. Review Checkpoint

- Review checkpoint name: R3 Security Review
- Reviewer: Codex
- Result: pending
- Notes: Claude Code lane complete. P2.4 admin page UI cleanup remains for full pass. Backend role enforcement and student data sanitization are in place.

## 10. Remaining Risks

- `update_test_case` in `test_cases.rs:170` queries `problems_test_cases` table but `list_test_cases` and `create`/`batch_import` query `test_cases` — possible table name inconsistency (Codex should verify).
- Tenant-level enforcement on problem writes is not yet in place (deferred to P1.4).
- Admin pages still use `admin.ts` with `USE_MOCK_DATA` flag — real backend contract alignment for admin flows is partial.

## 11. Handoff

Next phase (P3) can assume:

- Backend `list_test_cases` sanitizes response by role
- Backend problem and test case write endpoints enforce role checks
- Frontend types distinguish `PublicTestCase` (student-safe) from `ManagementTestCase` (full)
- All 62 existing tests still pass
- Frontend compiles and builds without errors

## 12. Blockers Or Follow-Ups

- P2.4 admin page contract cleanup needs Codex review to verify admin pages consume correct contracts
- P1.4 tenant enforcement skeleton remains for Codex lane
- Table name inconsistency between `test_cases` (read/create/batch) and `problems_test_cases` (update) in test_cases.rs needs Codex verification
