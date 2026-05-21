---
phase: 09-judge-concurrency-fault-tolerance
plan: 04
subsystem: frontend
tags: [react, tanstack-query, admin-dashboard, judge-monitoring, dlq-management, contest-priority]

# Dependency graph
requires:
  - phase: 09-judge-concurrency-fault-tolerance
    plan: 03
    provides: Admin judge monitoring API endpoints (GET /admin/judge/status, GET /admin/judge/dlq, POST /admin/judge/dlq/:id/retry, DELETE /admin/judge/dlq/:id)
  - phase: 09-judge-concurrency-fault-tolerance
    plan: 02
    provides: Backend CreateSubmissionRequest with optional contest_id field for priority queue routing
provides:
  - JudgeQueue admin page with three tabs (Queue Status, Workers, Dead Letters)
  - judgeQueueService with getStatus, getDlqEntries, retryDlqEntry, deleteDlqEntry methods
  - Admin sidebar navigation entry for Judge Queue at /admin/judge-queue
  - Frontend submission service passes contestId for priority queue routing
affects: []

# Tech tracking
tech-stack:
  added: []
patterns: [admin-tabbed-view, useMutation-with-invalidate, contest-id-url-param-routing]

key-files:
  created:
    - frontend/src/pages/admin/JudgeQueue.tsx
  modified:
    - frontend/src/services/admin.ts
    - frontend/src/layouts/AdminLayout.tsx
    - frontend/src/App.tsx
    - frontend/src/services/problems.ts
    - frontend/src/pages/user/ProblemIDEEnhanced.tsx

key-decisions:
  - "Tab navigation uses simple useState over shadcn Tabs for lighter weight and full control over styling"
  - "contestId extracted from URL params via useParams in ProblemIDEEnhanced for seamless contest/standalone dual use"

patterns-established:
  - "Admin service extension: new service objects (judgeQueueService) added alongside existing adminService in admin.ts"
  - "Contest-aware submission: optional contestId parameter passed through service layer to backend for priority routing"

requirements-completed: [JCON-02, FTOL-03, JCON-01]

# Metrics
duration: 6min
completed: 2026-04-17
---

# Phase 9 Plan 4: Judge Queue Admin Dashboard + Contest Submission Routing Summary

**Admin Judge Queue page with tabbed monitoring (queue depths, worker health, DLQ retry/discard) and contest-aware submission routing via URL param contestId**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-17T06:40:27Z
- **Completed:** 2026-04-17T06:46:40Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- JudgeQueue.tsx admin component with three tabs: Queue Status (depths + wait time), Workers (breaker states, relative time), Dead Letters (retry/discard actions)
- judgeQueueService exported from admin.ts with four methods calling Plan 03 API endpoints
- AdminLayout sidebar entry '判题队列' with lazy-loaded route at /admin/judge-queue
- Frontend submitCode accepts optional contestId, passes contest_id to backend for priority queue routing
- ProblemIDEEnhanced extracts contestId from URL params for contest-context submissions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create judgeQueueService in admin.ts and JudgeQueue.tsx component** - `40f0e3e` (feat)
2. **Task 2: Add Judge Queue navigation entry and route registration** - `896f3c9` (feat)
3. **Task 3: Update frontend submission service to pass contestId for priority queue routing** - `2ed68ed` (feat)

## Files Created/Modified
- `frontend/src/pages/admin/JudgeQueue.tsx` - Tabbed admin component for judge monitoring and DLQ management (356 lines)
- `frontend/src/services/admin.ts` - Added judgeQueueService with getStatus, getDlqEntries, retryDlqEntry, deleteDlqEntry
- `frontend/src/layouts/AdminLayout.tsx` - Added '判题队列' navigation entry with dns icon
- `frontend/src/App.tsx` - Added lazy import and route for JudgeQueue at /admin/judge-queue
- `frontend/src/services/problems.ts` - Added optional contestId parameter to submitCode, sends contest_id in POST body
- `frontend/src/pages/user/ProblemIDEEnhanced.tsx` - Extracts contestId from URL params and passes to submitCode

## Decisions Made
- Simple useState-based tab navigation instead of shadcn Tabs for lighter component weight and full styling control
- Breaker states color-coded with Tailwind utility classes: Closed=emerald, HalfOpen=amber, Open=rose
- Relative time formatting (e.g. "3s ago") for worker last_seen using simple Date diff calculation
- contestId passed as optional spread in both service call and POST body to maintain backward compatibility for non-contest usage

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 09 fully complete (all 4 plans executed)
- Admin dashboard has full judge monitoring and DLQ management UI
- Contest submissions correctly route to priority queue when contestId is in URL
- Ready for Phase 10 (Data Migration + Final Delivery)

## Self-Check: PASSED

All claimed files exist and all commit hashes verified in git log.

---
*Phase: 09-judge-concurrency-fault-tolerance*
*Completed: 2026-04-17*
