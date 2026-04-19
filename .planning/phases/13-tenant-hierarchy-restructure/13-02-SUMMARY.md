---
phase: 13-tenant-hierarchy-restructure
plan: 02
subsystem: api
tags: [role-hierarchy, rbac, gradeadmin, access-control]

requires:
  - phase: 13-01
    provides: "Shared Role enum renamed OrganizationAdmin to GradeAdmin"
provides:
  - "All backend domain route handlers updated to use GradeAdmin role"
  - "Access control logic aligned with new 6-level hierarchy"
  - "Contest and leaderboard admin checks raised to CampusAdmin level"
affects: [frontend-role-references, api-tests, integration-tests]

tech-stack:
  added: []
  patterns: ["GradeAdmin as organizational-level admin below CampusAdmin"]

key-files:
  created: []
  modified:
    - backend/domain-community/src/blog/routes.rs
    - backend/domain-community/src/discussions/routes.rs
    - backend/domain-contests/src/routes.rs
    - backend/domain-leaderboard/src/routes.rs
    - backend/domain-classes/src/routes.rs
    - backend/domain-problems/src/routes.rs
    - backend/domain-problems/src/access.rs
    - backend/domain-users/src/routes.rs
    - backend/api/src/judge_monitor/routes.rs

key-decisions:
  - "Contest and leaderboard admin checks raised from OrganizationAdmin to CampusAdmin since org-wide views require campus-level authority"
  - "Classes admin check uses GradeAdmin since class management is a core GradeAdmin responsibility"
  - "Blog and discussions delete admin checks use GradeAdmin alongside CampusAdmin"

patterns-established:
  - "Hierarchy-aware admin checks: CampusAdmin for cross-tenant views, GradeAdmin for org-level management"

requirements-completed: []

duration: 3min
completed: 2026-04-19
---

# Phase 13 Plan 02: Domain Route GradeAdmin Update Summary

Updated all 9 backend domain route handler files to replace OrganizationAdmin references with GradeAdmin, aligning access control with the new 6-level role hierarchy (Root > CampusAdmin > GradeAdmin > Teacher > TeachingAssistant > Student).

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-19T10:34:03Z
- **Completed:** 2026-04-19T10:37:06Z
- **Tasks:** 1 (batch edit across 9 files)
- **Files modified:** 9

## Accomplishments

- Replaced all `Role::OrganizationAdmin` references in route handlers with `Role::GradeAdmin`
- Updated string-based role checks (`"organizationadmin"` to `"gradeadmin"`)
- Raised contest and leaderboard admin checks to `CampusAdmin` level (org-wide views)
- Kept class management at `GradeAdmin` level (core responsibility)
- Updated all test assertions in `domain-problems/src/access.rs` to use `Role::GradeAdmin`
- Updated test in `api/src/judge_monitor/routes.rs` to verify `gradeadmin` role

## Verification

- `cargo check` passed for all 7 affected crates (0 errors, 0 warnings)
- `cargo test -p domain-problems --lib`: 5/5 unit tests passed
- `cargo test -p api --lib -- judge_monitor`: 37/37 tests passed
- No remaining `OrganizationAdmin` references in domain route files (confirmed via grep)

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

- `e8b4c2a`: refactor(routes): update domain routes to use GradeAdmin hierarchy

## Self-Check: PASSED

All 9 modified files verified present. Commit e8b4c2a verified in git log.
