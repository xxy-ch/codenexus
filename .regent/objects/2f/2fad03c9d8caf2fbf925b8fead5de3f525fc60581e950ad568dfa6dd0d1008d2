# P0–P3 Shared Phase Audit

## Scope

This review audits the early `shared/` control-surface artifacts together with the consolidated discussion set:

- `shared/ROADMAP.md`
- `shared/reviews/CODE-REVIEW-STANDARD.md`
- `shared/phases/P0-hard-garbage-purge.md`
- `shared/phases/P1-auth-rbac-tenant.md`
- `shared/phases/P2-problem-testcase-admin.md`
- `shared/phases/P3-submission-worker-sandbox.md`
- `shared/discussions/01-frontend-audit.md`
- `shared/discussions/02-backend-audit.md`
- `shared/discussions/03-full-repo-audit.md`
- `shared/discussions/04-design-recommendations.md`

Date: `2026-04-11`
Reviewer: `Codex`

## Decision Snapshot

- `P0`: approved and materially closed
- `P1`: approved, but the phase file should be read as the authority over the simplified roadmap wording
- `P2`: approved and materially closed
- `P3`: **not ready to close**; Claude lane appears complete, Codex lane remains open on trust + worker + sandbox proof

## Per-Phase Audit

### P0 — Hard Garbage Purge

Verdict: **truthful enough to stay closed**

What is strong:

- goal/scope/acceptance markers still match the closure outcome
- the phase note is consistent with the cleanup intent in `shared/ROADMAP.md`
- the review checkpoint maps cleanly to `R1 Garbage Purge Review`

Follow-up note:

- the closure summary is more precise than the phase brief about every removed file and route; use the summary when exact deletion scope matters

### P1 — Canonical Auth / RBAC / Tenant

Verdict: **closed, but the phase brief is the real canonical contract**

What is strong:

- the phase brief now contains the actual role contract, forbidden aliases, JWT claim shape, and tenant baseline
- acceptance markers are supported by the written evidence and the P1 summary
- the phase brief and the closure review together explain why no DB migration was needed

Important interpretation rule:

- `shared/ROADMAP.md` still uses the simplified shorthand `root / campus / teacher / student`
- the phase brief supersedes that shorthand with the fuller runtime set:
  `root / organizationadmin / campusadmin / teacher / teachingassistant / student`

Carry-forward risk:

- P1 solved canonical-role normalization, but the discussion set still records open auth/session issues outside the exact P1 closure scope:
  - frontend token storage / CSRF / refresh race
  - broken admin-role checks in some backend routes
  - stale JWT role trust window

### P2 — Problem / Test Case / Admin Convergence

Verdict: **closed and aligned with the current review standard**

What is strong:

- the phase brief, Claude summary, and `shared/reviews/2026-04-08-p0-p2-codex-closure-review.md` tell one consistent story
- student-safe vs management contracts are clearly separated
- tenant/ownership enforcement is documented with the right caveat: public problem reads remain public by contract

Carry-forward risk:

- the discussion set still records broader contest/class/community authorization gaps that were intentionally left for later phases

### P3 — Submission / Worker / Sandbox

Verdict: **phase brief needed immediate advancement**

What was out of date before this audit:

- the brief still looked fully `ready` even though the Claude lane already had a written completion note
- the brief did not reflect the audit-driven reality that some backend worker hardening is already in-tree
- the file list was too narrow for the current known work (shared connections, rate limiting, worker query tests, submission UI normalization)

What remains blocking:

- callback trust still needs one explicit proof package
- worker test-case loading must be validated against the real schema/order path
- sandbox wiring still needs proof that the production path is the real isolated path
- ack/retry semantics, shared connections, and judging-path hardening still need closure evidence

## Discussion-Derived Priority Map

### Immediate blockers for the early program

#### Auth / authorization / tenant boundaries

- frontend session storage and CSRF posture
- broken backend admin checks
- missing contest/class mutation authorization
- WebSocket identity/topic/broadcast authorization gaps

Primary sources:

- `shared/discussions/01-frontend-audit.md`
- `shared/discussions/02-backend-audit.md`
- `shared/discussions/03-full-repo-audit.md`

#### Judge-worker / sandbox correctness

- wrong test-case query path
- per-call DB/Redis connection creation
- sandbox not proven live
- seccomp/capability placement problems
- unsafe ack/retry behavior
- inaccurate memory reporting

Primary source:

- `shared/discussions/02-backend-audit.md`

#### Frontend contract integrity

- frontend/backend type mismatches
- duplicated discussion types
- decorative-only contest privacy toggle
- compatibility/browser-target gaps

Primary source:

- `shared/discussions/01-frontend-audit.md`

### Important but later hardening

- dependency CVEs
- password policy
- Redis `KEYS`
- duplicate route error types
- cleanup/healthcheck/polish findings

Primary sources:

- `shared/discussions/02-backend-audit.md`
- `shared/discussions/03-full-repo-audit.md`

## Recommended Execution Order From Here

1. **Finish P3 Codex lane**
   - callback trust + transition validation
   - worker schema/query correctness
   - shared connection lifecycle
   - sandbox live-path proof
   - ack/retry proof

2. **Write one auth/session decision surface before expanding P4/P5/P6**
   - token storage
   - CSRF posture
   - canonical admin-role gate behavior
   - stale-role handling

3. **Promote WebSocket security into a dedicated follow-up doc before P6 closure work**
   - authenticated identity source
   - topic authorization
   - tenant-scoped broadcasts
   - connection limits

4. **Treat the design memo as pending strategy, not implementation authority**
   - `shared/discussions/04-design-recommendations.md` should be reviewed and distilled before it drives UI changes

## Audit Outcome

The early shared program is usable and P0–P2 are closeable as written, but the discussion corpus makes one thing clear:

- the next honest phase gate is **P3 backend/security closure**, not more broad roadmap churn

That is the highest-value place to push the shared control surface next.
