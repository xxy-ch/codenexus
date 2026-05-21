# Deferred Items - Phase 11

## Pre-existing Test Failure (discovered during 11-01 execution)

**File:** `backend/api/tests/handlers/users_test.rs`
**Test:** `test_admin_list_users_returns_200`
**Issue:** Test seeds a "gradeadmin" role user and expects 200 from `/users/admin` endpoint. After Phase 13/14 security hardening (`is_admin` tightened to Root-only), gradeadmin no longer has admin access. Returns 401 instead of 200.
**Root cause:** Pre-existing -- the test was not updated when `is_admin()` was restricted to Root-only in security audit round 14 (commit reference in STATE.md).
**Action needed:** Update test to use "root" role instead of "gradeadmin", or update the assertion to expect 401/403.
**Scope:** Out of scope for Phase 11 Plan 01 -- not caused by feature gateway changes.
