---
phase: 14-grade-scoped-data-model
plan: 05
subsystem: ui
tags: [grades, frontend, react, typescript, tanstack-query, admin-ui, tanstack-query-mutations]

# Dependency graph
requires:
  - phase: 14-01
    provides: grades table, grade_id on users, Claims with grade_id
  - phase: 14-04
    provides: Grade CRUD endpoints (GET/POST/PUT/DELETE /api/grades)
provides:
  - Frontend Grade type and grades service (CRUD + batch operations)
  - grade_id on User and RegisterRequest frontend types
  - Grade dropdown in admin UserManagement batch create form
  - Grade column in user table with name lookup
  - GradeManagement admin page (list, create, deactivate, promote, graduate)
  - Admin navigation entry for grade management
affects: [14-06]

# Tech tracking
tech-stack:
  added: []
patterns: [grade-dropdown-filtered-by-campus, grade-name-lookup-map, admin-lazy-route]

key-files:
  created:
    - frontend/src/types/grade.ts
    - frontend/src/services/grades.ts
    - frontend/src/pages/admin/GradeManagement.tsx
  modified:
    - frontend/src/types/auth.ts
    - frontend/src/types/admin.ts
    - frontend/src/services/admin.ts
    - frontend/src/pages/admin/UserManagement.tsx
    - frontend/src/App.tsx
    - frontend/src/layouts/AdminLayout.tsx

key-decisions:
  - "Grade dropdown hardcoded to campus_id=1 matching existing batch create pattern; TODO for multi-campus UI"
  - "GradeManagement uses collapsible create form to keep the page compact"
  - "Combined Tasks 4+5 into single commit since page and route registration are tightly coupled"

patterns-established:
  - "gradesService follows same object-literal pattern as classesService/adminService"
  - "Grade name lookup via useMemo Map from TanStack Query cache"
  - "Admin page pattern: header section with stats, action sections, active/inactive table split"

requirements-completed: []

# Metrics
duration: 6min
completed: 2026-04-19
---

# Phase 14 Plan 05: Frontend -- Grade Types + Admin UI Summary

**Frontend grade type, service with CRUD and batch operations, grade dropdown in user management, and GradeManagement admin page with create/deactivate/promote/graduate actions**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-19T22:53:30Z
- **Completed:** 2026-04-19T22:59:20Z
- **Tasks:** 5
- **Files modified:** 9

## Accomplishments

- Added grade_id to User and RegisterRequest frontend types for grade-scoped user identity
- Created Grade type and gradesService with full CRUD plus academic year batch operations (promote, graduate, create-year)
- Added grade dropdown to admin user batch create form, filtered by campus, with guidance text for role-based requirements
- Added grade name column to user table with efficient Map lookup from cached grades data
- Built GradeManagement admin page with active/inactive grade tables, create form, deactivate action, and batch promote/graduate operations
- Registered /admin/grades route with lazy loading and added navigation item in AdminLayout

## Task Commits

1. **Task 1: Update frontend auth types** - `3cc0dec` (feat)
2. **Task 2: Create Grade type and service** - `4b9a345` (feat)
3. **Task 3: Update UserManagement with grade dropdown** - `858b070` (feat)
4. **Tasks 4+5: GradeManagement page + navigation** - `bc62f26` (feat)

**Plan metadata:** pending

## Task Details

| Task | Description | Status |
|------|-------------|--------|
| 1 | Update frontend auth types (User, RegisterRequest) with grade_id | Implemented |
| 2 | Create Grade type and grades service (CRUD + batch) | Implemented |
| 3 | Add grade dropdown to UserManagement batch create + grade column | Implemented |
| 4 | Create GradeManagement admin page | Implemented |
| 5 | Add navigation and route registration | Implemented |

## Files Created/Modified

- `frontend/src/types/auth.ts` - Added grade_id?: number | null to User and RegisterRequest interfaces
- `frontend/src/types/grade.ts` - New Grade, CreateGradeRequest, UpdateGradeRequest types
- `frontend/src/types/admin.ts` - Added grade_id to BatchCreateAdminUser interface
- `frontend/src/services/grades.ts` - New gradesService with listGrades, createGrade, updateGrade, deactivateGrade, graduateGrades, promoteGrades, createAcademicYearGrades
- `frontend/src/services/admin.ts` - Added grade_id parameter to batchCreateUsers payload
- `frontend/src/pages/admin/UserManagement.tsx` - Added grade dropdown in batch create, grade column in table, grade query hook, gradeNameMap lookup
- `frontend/src/pages/admin/GradeManagement.tsx` - New admin page with grade CRUD UI, batch operations, active/inactive tables
- `frontend/src/App.tsx` - Added GradeManagement lazy import and /admin/grades route
- `frontend/src/layouts/AdminLayout.tsx` - Added grade management nav item

## Decisions Made

- **Campus ID hardcoded to 1:** Matches existing batch create pattern in UserManagement. Multi-campus support deferred to future UI enhancement. Marked with TODO comment.
- **Collapsible create form:** GradeManagement uses a toggle button to show/hide the create form, keeping the page compact when not actively creating grades.
- **Combined Tasks 4+5:** Page component and route registration are tightly coupled (missing route = broken page), so committed together.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Frontend grade types and services ready for use across the application
- GradeManagement page accessible at /admin/grades for CampusAdmin+ users
- Grade dropdown in user batch create ready for integration with backend batch endpoint
- Plan 14-06 can perform end-to-end verification of the complete grade-scoped data model

---
*Phase: 14-grade-scoped-data-model*
*Completed: 2026-04-19*

## Self-Check: PASSED

- All 9 created/modified files verified present
- All 4 commits verified in git log (3cc0dec, 4b9a345, 858b070, bc62f26)
- TypeScript compilation: zero errors
