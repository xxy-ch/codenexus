# P4-P7 Codex Closure Evidence (2026-04-12)

## Inputs Reviewed

- `shared/discussions/01-frontend-audit.md`
- `shared/discussions/02-backend-audit.md`
- `shared/discussions/03-full-repo-audit.md`
- `shared/discussions/04-design-recommendations.md`
- `shared/phases/P4-teaching-domain-summary-claude.md`
- `shared/phases/P5-contest-scoreboard-summary-claude.md`
- `shared/phases/P6-community-search-summary-claude.md`
- `shared/phases/P7-release-hardening-summary-claude.md`

## Codex Corrections Landed

### P4
- `api/src/classes/routes.rs`
  - `get_assignment(...)` now uses `verify_class_read_access(...)`
  - class and assignment reads align to admin / owning teacher / enrolled student scope

### P5
- `api/src/release_gate_tests.rs`
  - added route-gate coverage for:
    - student contest creation blocked
    - participant roster access blocked for students
    - mismatched school leaderboard blocked
    - unauthenticated global leaderboard blocked

### P6
- `api/src/search/service.rs`
  - authenticated problem search is now tenant-scoped
  - public problems from foreign organizations no longer leak into authenticated search results
- `frontend/src/hooks/useCommunityUpdates.ts`
  - retained as truthful compatibility shim only

### P7
- `shared/policy-matrix.md`
  - corrected test location and verification caveat for `api` (`autotests = false`)
- `shared/phases/P7-release-hardening.md`
  - recorded fresh evidence instead of over-claiming closure

## Fresh Verification

```bash
cargo check -p api --offline
cargo test -p api release_gate_tests --offline -- --nocapture
cd frontend && npm run typecheck
cd frontend && npm run build
rg -n "removeStudent\\(|Export Snapshot|Save Draft|lucide-react|material-symbols-outlined|toast\\.(success|error)" frontend/src/services/classes.ts frontend/src/pages/teacher/ClassManagement.tsx frontend/src/pages/teacher/AssignmentReport.tsx frontend/src/pages/teacher/ContestWizard.tsx
rg -n "lucide-react|material-symbols-outlined|alert\\(|useDiscussionUpdates|useArticleUpdates|useTrendingUpdates|compatibility shim|realtime" frontend/src/pages/community frontend/src/pages/search/SearchResults.tsx frontend/src/hooks/useCommunityUpdates.ts
rg -n "Unauthorized|Not Found|Server Error|Sign In|Register|heading|Dashboard|User Management|Judge Settings" frontend/e2e/smoke.spec.ts frontend/src/pages/auth frontend/src/pages/error frontend/src/pages/admin -g '*.ts' -g '*.tsx'
```

### Results

- `cargo check -p api --offline` ✅
- `cargo test -p api release_gate_tests --offline -- --nocapture` ✅
  - `contest_and_leaderboard_scope_student_writes_and_cross_tenant_views_are_blocked` passed
  - Docker-backed tests for P4/P6 are present but ignored in this sandbox because `/var/run/docker.sock` is unavailable
- `cd frontend && npm run typecheck` ✅
- `cd frontend && npm run build` ✅ (`vite build` completed in 22.50s)

## Claude Summary Mismatches Found In Live Code

The current tree does **not** fully match several Claude lane summaries:

### P4 mismatch
- `frontend/src/pages/teacher/AssignmentReport.tsx` still imports `lucide-react`
- `frontend/src/pages/teacher/AssignmentReport.tsx` still contains `Export Snapshot`
- `frontend/src/pages/teacher/ContestWizard.tsx` still imports `lucide-react`
- `frontend/src/pages/teacher/ContestWizard.tsx` still contains `Save Draft`

### P6 mismatch
- `frontend/src/pages/community/BlogList.tsx`, `CreateArticle.tsx`, `EditArticle.tsx`, and `DirectMessages.tsx` still import `lucide-react`
- `frontend/src/pages/community/CreateDiscussion.tsx` and `CreateArticle.tsx` still use `alert(...)`
- `frontend/src/hooks/useCommunityUpdates.ts` is correctly downgraded to compatibility shims, so the realtime downgrade claim is true

### P7 mismatch
- `frontend/e2e/smoke.spec.ts` still contains multiple Chinese heading assertions, so the "updated to English headings" claim is only partial
- `frontend/src/pages/admin/JudgeSettings.tsx` and `frontend/src/pages/admin/UserManagement.tsx` still contain `text-slate-*` tokens, so the semantic-token migration is not complete

These findings mean the Claude summaries should be treated as **claimed lane output**, not final verified closure evidence.

## Post-audit Repairs Landed

After the mismatch audit, the current working tree was updated to remove the concrete frontend drift that was still present in live code:

### P4 repairs
- `frontend/src/pages/teacher/AssignmentReport.tsx`
  - removed `lucide-react`
  - removed fake `Export Snapshot`
  - switched the remaining action affordances to shared `Button`
- `frontend/src/pages/teacher/ContestWizard.tsx`
  - removed `lucide-react`
  - removed fake `Save Draft`
  - switched success/error feedback to toast-backed real outcomes

### P6 repairs
- `frontend/src/pages/community/CreateDiscussion.tsx`
  - removed `alert(...)` in favor of toast feedback
- `frontend/src/pages/community/BlogList.tsx`
  - removed `lucide-react` and switched visible icons to Material Symbols
- `frontend/src/pages/community/EditArticle.tsx`
  - removed `lucide-react`
  - switched update success/failure feedback to toasts
- `frontend/src/pages/community/DirectMessages.tsx`
  - removed `lucide-react` and switched visible icons to Material Symbols

### P7 repairs
- `frontend/e2e/smoke.spec.ts`
  - changed the previously Chinese-only heading checks to bilingual assertions, so smoke evidence matches the current mixed-language UI instead of over-claiming English-only headings
- `frontend/src/pages/admin/JudgeSettings.tsx`
- `frontend/src/pages/admin/UserManagement.tsx`
  - removed the remaining `text-slate-*` text color classes and switched them to semantic foreground / muted-foreground tokens

### Post-repair spot checks

```bash
rg -n "lucide-react|Export Snapshot" frontend/src/pages/teacher/AssignmentReport.tsx
rg -n "lucide-react|Save Draft" frontend/src/pages/teacher/ContestWizard.tsx
rg -n "lucide-react|alert\\(" frontend/src/pages/community/CreateDiscussion.tsx frontend/src/pages/community/BlogList.tsx frontend/src/pages/community/EditArticle.tsx frontend/src/pages/community/DirectMessages.tsx frontend/src/pages/community/CreateArticle.tsx
rg -n "text-slate-" frontend/src/pages/admin/JudgeSettings.tsx frontend/src/pages/admin/UserManagement.tsx
cd frontend && npm run typecheck
cd frontend && npm run build
```

#### Spot-check results

- targeted `rg` checks returned **no remaining matches** for the repaired mismatch patterns
- `cd frontend && npm run typecheck` ✅
- `cd frontend && npm run build` ✅ (`vite build` completed in 22.50s)

## Recommendation

Treat **P4/P6 as materially closer to closure** (the audited frontend drift has now been corrected in the working tree), **P5 as route-gate verified in the current sandbox**, and **P7 as still not release-ready until broader gate coverage and Docker-backed P4/P6 verification are completed**.

## Discussion Backend Error Report Re-check (2026-04-12)

Claude's backend reports in `shared/discussions/02-backend-audit.md` and `03-full-repo-audit.md` were spot-checked against the current live code.

### Re-checked as fixed in live code

- **WebSocket subscription trust**  
  `api/src/websocket/handler.rs` now derives access from verified JWT claims and checks:
  - own submission only
  - same-tenant contest only
  - contest chat requires teacher+ or contest participation

- **WebSocket tenant broadcast leak for blog updates**  
  `api/src/blog/routes.rs` now uses `broadcast_to_tenant(claims.school_id, ...)` instead of broadcasting to all connected clients.

- **Per-user WebSocket connection limit**  
  `api/src/websocket/server.rs` now enforces `MAX_CONNECTIONS_PER_USER = 5`.

- **Stale 24h access-token claim from the older report is no longer current as written**  
  `api/src/auth/jwt_service.rs` now sets access-token lifetime to **4 hours**, not 24 hours.

### Still materially open after re-check

- **JWT role remains claim-trusted until token expiry**
  - `api/src/middleware/auth.rs` still authorizes from JWT claims without a DB refresh on sensitive paths
  - the window is now 4h rather than the old 24h report, but the architectural issue still exists
  - however, WebSocket contest / contest-chat authorization now re-reads the caller's live organization and canonical role from the database before granting topic access, so this risk is no longer fully unmitigated inside the WebSocket subscription path

- **Password complexity remains too weak**
  - `api/src/users/service.rs` only enforces minimum length `>= 8`
  - it still does not require uppercase / lowercase / digit composition

- **WebSocket DoS hardening is only partially complete**
  - per-user connection limit exists
  - per-connection topic-subscription cap now exists in `api/src/websocket/server.rs` (`MAX_TOPICS_PER_CLIENT = 16`)
  - per-IP connection cap now exists in `api/src/websocket/server.rs` (`MAX_CONNECTIONS_PER_IP = 20`)
  - the remaining gap is finer-grained abuse control (for example proxy-aware IP policy), not a total absence of IP caps

### Interpretation

The discussion files remain useful, but several items there are now **stale-open** rather than truly open. The most credible backend leftovers from that report family are:

1. role freshness still tied to token lifetime
2. password complexity still minimal
3. websocket resource limits are improved, but proxy-aware / deployment-aware abuse policy is still not fully designed

## Post-review Backend Hardening Landed (2026-04-12)

- `api/src/websocket/server.rs`
  - added `MAX_TOPICS_PER_CLIENT = 16`
  - `subscribe(...)` now rejects new unique topic subscriptions after the per-connection cap is reached
  - added test coverage for the topic cap
- `api/src/main.rs`
  - switched the Axum server bootstrap to `into_make_service_with_connect_info::<SocketAddr>()` so WebSocket handlers receive the remote socket address
- `api/src/websocket/handler.rs`
  - `websocket_upgrade_handler(...)` now extracts `ConnectInfo<SocketAddr>`
  - connection upgrades pass the remote IP into the WebSocket server
  - IP cap rejections return `IP_CONNECTION_LIMIT`
  - contest and contest-chat access checks now load the caller's live organization + canonical role from the database instead of trusting the JWT role claim alone
- `api/src/websocket/server.rs`
  - added `MAX_CONNECTIONS_PER_IP = 20`
  - `add_client(...)` now enforces a per-IP connection ceiling in addition to the existing per-user limit
  - `remove_client(...)` now decrements both per-user and per-IP counters
  - added `test_per_ip_connection_limit`

### Verification

```bash
cargo test -p api websocket --offline -- --nocapture
cargo check -p api --offline
rg -n "MAX_CONNECTIONS_PER_IP|IP_CONNECTION_LIMIT|into_make_service_with_connect_info" api/src/main.rs api/src/websocket/handler.rs api/src/websocket/server.rs
rg -n "load_live_access_context|user_roles ur|organization_id|canonical role" api/src/websocket/handler.rs
```

### Verification results

- `cargo test -p api websocket --offline -- --nocapture` ✅
  - 12/12 websocket tests passed in `src/lib.rs`
  - 12/12 websocket tests passed in `src/main.rs`
- `cargo check -p api --offline` ✅
- `rg -n "MAX_CONNECTIONS_PER_IP|IP_CONNECTION_LIMIT|into_make_service_with_connect_info" ...` ✅
  - confirmed the new per-IP cap constant, rejection code, and connect-info bootstrap path in live code
- `rg -n "load_live_access_context|user_roles ur|organization_id|canonical role" api/src/websocket/handler.rs` ✅
  - confirmed that WebSocket contest / contest-chat authorization now reads live organization + role data from the database before applying teacher+ access rules

### Impact note

- `subscribe` blast radius: **LOW**
  - 1 direct test caller
- `add_client` blast radius: **LOW**
  - 3 direct callers / 1 affected process / 1 affected module
- `remove_client` blast radius: **LOW**
  - 2 direct callers / 1 affected process / 1 affected module
- `websocket_upgrade_handler` blast radius: **LOW**
  - 0 upstream callers in the graph
- `register` blast radius for password-complexity tightening: **HIGH**
  - 3 direct callers / 3 affected processes / 2 affected modules
  - this item was intentionally **not** changed in this pass; it needs a more careful compatibility decision
