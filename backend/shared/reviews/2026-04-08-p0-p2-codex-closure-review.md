# P0–P2 Codex Closure Review

## Scope

This review closes Codex-owned follow-up work across P0–P2 and aligns the phase markers with the code that actually exists in the repository on 2026-04-08.

## Decision

- P0: approved
- P1: approved
- P2: approved

## Stop-Ship Check

### Cleared in this closure

- Student-facing problem flows no longer depend on management-only test-case data.
- Student-facing test-case responses stay metadata-only and do not expose expected answers.
- Admin problem listing now opts into the management contract explicitly instead of inheriting the public/student list behavior.
- Targeted frontend regressions were added for the repaired student/admin contract split.

### Remaining non-blocking follow-ups

1. **Public problem reads remain intentionally public**
   - Status: accepted policy caveat
   - Why it matters: this closure proves tenant enforcement for management views and protected writes, not tenant-local reads for already-public problems.
   - Current truth: public problem reads stay available cross-tenant by contract.

2. **Visibility tiers still share one management boundary**
   - Status: future policy/design follow-up
   - Why it matters: `private` / `campus` / `class` are all enforced with the same organization-scoped management access rule today.
   - Current truth: if later phases need finer campus/class isolation, the access record and policy matrix will need to expand.

3. **Admin mock fallback still exists**
   - File: `frontend/src/services/admin.ts`
   - Risk: `USE_MOCK_DATA` remains available for development mode.
   - Current handling: repaired production-facing query shape is explicit, but mock mode is still documented as a separate non-evidence lane.

4. **GitNexus index is stale**
   - Status: tooling caveat
   - Risk: graph-backed impact analysis was available, but it reflects an older indexed commit.
   - Current handling: low-risk impacts were recorded for the touched route symbols, then corroborated with local diff review and the verification matrix below.

## Evidence

### Contract / code assertions

- `api/src/problems/test_cases.rs`
  - `PublicTestCase` is metadata-only.
  - `build_public_test_cases()` filters hidden cases out entirely.
  - management-only full test-case data now requires management read access, not just a teacher role string.
- `api/src/problems/access.rs`
  - same-tenant create and mutate rules are centralized in `can_create_problem_in_organization()` / `can_mutate_problem()`.
  - new regression test proves that public read access does not automatically grant management visibility.
- `frontend/src/services/problems.ts`
  - student-safe loader: `getPublicTestCases()`
  - management loader: `getTestCases()`
- `frontend/src/pages/user/ProblemIDEEnhanced.tsx`
  - no longer loads management test cases
- `frontend/src/services/admin.ts`
  - admin problem listing appends `is_public=false`

### Verification commands

```bash
cd frontend && npx vitest --run src/services/__tests__/admin.test.ts src/pages/user/__tests__/ProblemIDEEnhanced.test.tsx
cd frontend && npx vitest --run src/services/__tests__/judgeConfig.test.ts src/services/__tests__/smokeCoreFlows.test.ts
cd frontend && npm run typecheck
cd frontend && npm run build
cargo check -p api
cargo test -p api --lib
cargo test -p shared --lib
cargo test -p judge-worker --lib
```

### Observed results

- targeted vitest regressions: **3 passed**
- existing frontend contract smoke: **8 passed**
- frontend typecheck: **pass**
- frontend build: **pass**
- `cargo check -p api`: **pass**
- `cargo test -p api problems::access --lib`: **5 passed**
- `cargo test -p api problems::test_cases::tests --lib`: **2 passed**
- `cargo test -p api --lib`: **46 passed, 0 failed, 8 ignored**
- `cargo test -p shared --lib`: **8 passed, 0 failed**
- `cargo test -p judge-worker --lib`: **15 passed, 0 failed, 1 ignored**
- GitNexus impact (stale index, advisory only): `create_problem`, `list_problems`, `update_problem`, `list_test_cases`, `update_test_case` all reported **LOW** upstream risk

## Review Outcome

Recommendation: **APPROVE WITH FOLLOW-UPS**

Reason:
- the repaired P0–P2 scope is now truthful, tested, and documented
- the original P1/P2 closure blockers (tenant/write proof and the `update_test_case` table mismatch) are resolved
- the remaining notes are policy/tooling follow-ups, not hidden implementation gaps
