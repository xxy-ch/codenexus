# Progress Status 2026-03-29

## Current State

This branch is in late-stage acceptance closeout. The frontend redesign and frontend/backend alignment work have already been pushed through the main routed surfaces, and the current focus has shifted from broad implementation to runtime truthfulness, dev-environment usability, and closing the remaining judge-path defects uncovered during manual testing.

The local dev environment is currently usable for interactive verification:

- Frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:3000`
- API health: `GET /health` returns `200 OK`

Verified demo accounts:

- `1001 / admin123` for admin flows
- `2001 / admin123` for student flows
- `3001 / admin123` for teacher flows

## Completed Since Acceptance Closeout

### 1. Dev environment recovery

- Reused the local PostgreSQL and Redis services instead of a separate container stack.
- Rebootstrapped demo data into the local `online_judge` database.
- Restored working demo login credentials in [`scripts/bootstrap_demo.sql`](/Users/xiexingyu/Documents/项目/Online_Judge/scripts/bootstrap_demo.sql).

### 2. Authentication and browser runtime alignment

- Fixed demo password hashes so manual login works again.
- Fixed CORS in [`api/src/main.rs`](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs) by replacing wildcard origin handling with explicit dev origins and enabling credentials.
- Result: authenticated frontend requests from `127.0.0.1:5173` no longer fail at the browser boundary.

### 3. Ranking page recovery

- Fixed the global leaderboard query in [`api/src/leaderboard/service.rs`](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/leaderboard/service.rs).
- Corrected the SQL grouping problem that caused `/ranking` to fail at runtime.
- Result: `/ranking` now renders from live API data instead of dropping into a generic load-failed state.

### 4. Submission request contract alignment

- Fixed the frontend submission payload in [`frontend/src/services/problems.ts`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/services/problems.ts) so `problem_id` is sent as a number instead of a string.
- Added a contract regression test in [`frontend/src/services/__tests__/problems.submissions-alignment.test.ts`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/services/__tests__/problems.submissions-alignment.test.ts).
- Result: submission creation no longer fails due to a frontend/backend type mismatch.

### 5. Problem IDE runtime truthfulness

- Updated [`frontend/src/pages/user/ProblemIDEEnhanced.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/user/ProblemIDEEnhanced.tsx) so the run action uses the real submission path rather than a placeholder interaction.
- Added regression coverage in [`frontend/src/pages/user/__tests__/ProblemIDEEnhanced.test.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/user/__tests__/ProblemIDEEnhanced.test.tsx).
- Result: the problem page can now create a real run/submit task from the IDE.

### 6. Judge worker queue consumption

- Fixed Redis stream consumption in [`judge-worker/src/queue/consumer.rs`](/Users/xiexingyu/Documents/项目/Online_Judge/judge-worker/src/queue/consumer.rs).
- The `XREADGROUP` argument order had been invalid, which left new submissions stuck in `queued`.
- Added targeted worker coverage for the argument builder.
- Result: new submissions are now consumed by the worker instead of remaining indefinitely queued.

### 7. Judge worker schema alignment

- Replaced the stale `problems_test_cases` dependency with the real `test_cases` table in:
  - [`judge-worker/src/db/mod.rs`](/Users/xiexingyu/Documents/项目/Online_Judge/judge-worker/src/db/mod.rs)
  - [`judge-worker/src/processor/service.rs`](/Users/xiexingyu/Documents/项目/Online_Judge/judge-worker/src/processor/service.rs)
  - [`judge-worker/src/processor/tests.rs`](/Users/xiexingyu/Documents/项目/Online_Judge/judge-worker/src/processor/tests.rs)
- Result: the worker now reads actual test case data from the live schema.

### 8. Judge callback writeback path

- Split the judge callback route out of the user-authenticated router in:
  - [`api/src/submissions/routes.rs`](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/submissions/routes.rs)
  - [`api/src/submissions/mod.rs`](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/submissions/mod.rs)
  - [`api/src/main.rs`](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs)
- Result: worker result callbacks are no longer blocked by `401 Unauthorized`.

### 9. Submission result persistence alignment

- Fixed `test_case_results` writes in [`api/src/submissions/service.rs`](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/submissions/service.rs) to match the current schema.
- The API now stores `verdict`, `time_ms`, and `memory_kb` instead of attempting to write removed legacy columns.
- Result: judged runs now persist per-case results instead of failing during result writeback.

### 10. Demo test case recovery

- Added a real test case seed for problem 1 in [`scripts/bootstrap_demo.sql`](/Users/xiexingyu/Documents/项目/Online_Judge/scripts/bootstrap_demo.sql).
- Adjusted the worker fallback so missing test cases surface as `system_error` instead of a misleading `runtime_error`.
- Result: the default demo problem now exercises a valid end-to-end judge path.

### 11. Dashboard runtime/status-badge alignment

- Fixed [`frontend/src/components/ui/StatusBadge.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/ui/StatusBadge.tsx) so live submission statuses such as `judged` and `failed` no longer crash the badge renderer.
- Added a regression check in [`frontend/src/components/ui/__tests__/StatusBadge.regression.test.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/ui/__tests__/StatusBadge.regression.test.tsx).
- Refreshed [`frontend/src/pages/user/__tests__/DashboardEnhanced.test.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/user/__tests__/DashboardEnhanced.test.tsx) so the dashboard suite asserts the current routed UI instead of a stale pre-redesign layout.
- Result: logging into `/dashboard` no longer trips a `StatusBadge` render error when recent activity contains live `judged` submissions.

## Current Verification Evidence

The following runtime evidence has already been confirmed locally:

- Frontend root is reachable at `http://127.0.0.1:5173`
- API health endpoint returns `200 OK`
- Login succeeds for the three seeded demo roles
- Student login (`2001 / admin123`) reaches `/dashboard` in the browser without the previous `StatusBadge` crash
- `/ranking` loads successfully in the browser
- New submissions are accepted by the API
- The worker consumes new queue entries
- Judge callbacks write results back into the API/database
- Submission detail pages render judged results from live data

The latest fully verified submission path produced a correct accepted result rather than stalling:

- A new submission moved from `queued` to a terminal judged state and returned `accepted`
- The submission stored a final `verdict`
- A corresponding `test_case_results` row was written successfully
- The frontend submission detail page displayed the judged outcome correctly

## Known Remaining Boundaries

The main blocker is no longer the live judge path itself. The branch now has fresh proof for login, dashboard rendering, submission enqueueing, worker consumption, callback writeback, and a known-correct accepted solution. The remaining work is mostly repository hygiene and submit-surface cleanup rather than an obvious runtime break on the main demo path.

Current boundaries to keep in view:

- Historical submissions created while the pipeline was broken remain stale and will not self-heal.
- The local environment has many unrelated dirty files and deleted reference assets that are not part of this specific runtime recovery.
- Database- and Redis-gated integration paths still depend on the local services being available.
- The worktree still contains a large mixed set of frontend redesign edits, reference-asset churn, and documentation changes that need deliberate packaging before branch closeout.
- Frontend production builds still emit large Monaco/editor chunk warnings; this is not a correctness blocker, but it remains a release-quality optimization item.

## Recommended Next Step

The highest-value next step is to package the now-verified runtime fixes and the aligned dashboard tests into a deliberate closeout batch: separate deliverable code from incidental reference churn, decide what belongs in the final branch, and only then choose whether to merge locally, open a PR, or keep the branch in place for one more cleanup pass.
