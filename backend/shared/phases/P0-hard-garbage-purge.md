# P0 Hard Garbage Purge

## Phase Identity

- Phase: `P0`
- Owner: `Codex`
- Parallel lane owner: `Claude Code`
- Status: `claude-code-lane-complete`

## Goal

Remove hard garbage and false product surface so the repository exposes only real runtime paths and truthful docs before any deeper security or contract refactor begins.

## In Scope

- delete `.bak` files
- delete `.DS_Store` files
- remove dead mock-only runtime paths
- remove or downgrade fake-success frontend actions
- correct false delivery wording in docs

## Out Of Scope

- deleting half-connected RBAC, tenant, or sandbox modules before their replacement path is defined
- changing business behavior outside cleanup needs
- introducing the final canonical auth model

## Codex Lane

- backend/runtime entry-point inventory
- hard-garbage deletion approval
- doc truthfulness rewrite
- final review

## Claude Code Lane

- frontend route and page inventory
- dead page removal
- fake-success UI removal or explicit downgrade
- frontend smoke stabilization after cleanup

## Files Expected To Change

- `api/Cargo.toml.bak`
- `api/src/main.rs.bak`
- `api/src/problems/mod.rs.bak`
- `api/src/problems/mod.rs.bak2`
- `api/src/problems/mod.rs.bak3`
- `api/src/problems/mod.rs.bak4`
- `api/src/leaderboard/service.rs.bak`
- `judge-worker/src/processor/service.rs.bak`
- `api/.DS_Store`
- `api/src/.DS_Store`
- `api/tests/.DS_Store`
- `judge-worker/src/.DS_Store`
- `frontend/src/App.tsx`
- `frontend/src/pages/user/ProblemIDE.tsx`
- `frontend/src/services/mockSubmissions.ts`
- `frontend/src/pages/user/Settings.tsx`
- `docs/architecture/PROJECT_HANDBOOK_2026-03-07.md`
- `FINAL_SUMMARY.md`

## Target Architecture Flow

### Before

- runtime and docs mix real paths, mock remnants, and false completion claims
- frontend still contains dead or misleading user-facing paths
- repository contains backup files and filesystem junk

### After

- repository contains no backup junk or filesystem junk
- user-visible frontend paths point only to real contracts
- docs stop claiming delivery completeness where the runtime is still incomplete

## Temporary Red-Light Rule

Temporary red is allowed only during this phase and only for cleanup-related breakage.
Every red item must be listed below with cause and owner.

## Temporary Red-Light Log

- none yet

## Verification Commands

```bash
rg --files api judge-worker frontend | rg "\\.bak$|\\.bak[0-9]*$|\\.DS_Store$"
rg -n "ProblemIDE|mockSubmissions|USE_MOCK_DATA|updatePreferencesMutation|updateNotificationsMutation" frontend/src
cargo check -p api
cargo test -p api --no-run
cargo check -p judge-worker
cargo test -p judge-worker --no-run
cd frontend && npm run lint
cd frontend && npm run typecheck
cd frontend && npm run build
```

## Acceptance Markers

- [x] No `.bak` files remain in tracked runtime paths. **Verified**: `find api judge-worker frontend -name "*.bak"` returns empty.
- [x] No `.DS_Store` files remain in the repository. **Verified**: `find . -name ".DS_Store"` returns empty.
- [x] No user-visible runtime route depends on mock-only data. **Verified**: `grep -rn "ProblemIDE[^E]|mockSubmissions|mockProblems" frontend/src` returns empty.
- [x] No fake-success frontend action remains exposed as a formal product feature. **Verified**: `grep -rn "偏好设置更新成功|通知设置更新成功" frontend/src` returns empty.
- [x] Cleanup finishes with baseline verification back to green. **Verified**: `npm run build` ✓ 18.34s; `cargo check` ✓; `npx tsc --noEmit` ✓.

## Review Checkpoint

- Required review: `R1 Garbage Purge Review`
- Reviewer: `Codex`
- Entry condition: all acceptance markers checked
