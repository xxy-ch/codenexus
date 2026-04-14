# Phase 4: Domain Extraction — Complex - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 04-domain-extraction-complex-submissions-contests-classes-leaderboard
**Areas discussed:** SEC-03 Leaderboard tenant fix, Extraction grouping

---

## SEC-03 Leaderboard Tenant Fix

| Option | Description | Selected |
|--------|-------------|----------|
| Org-scoped default, Root sees all | Non-admin sees only their org. Root/OrgAdmin sees all. SQL adds WHERE organization_id = ? for non-admin. | Yes |
| Public top-N with org masking | Global top N visible to everyone. Only org-specific details masked. | No |
| Keep global, no tenant fix | All users see global rankings. Document current behavior. | No |

**User's choice:** Org-scoped default, Root sees all
**Notes:** Matches ROADMAP SEC-03 spec exactly. Fixes two endpoints: `/global` and `/problem/:id`. Both currently ignore tenant via `_claims: AuthExtractor`.

---

## Extraction Grouping

| Option | Description | Selected |
|--------|-------------|----------|
| 4 separate crates | domain-submissions, domain-contests, domain-classes, domain-leaderboard. Leaderboard->classes via api-infra trait. | Yes |
| 3 crates (classes+leaderboard combined) | Merge classes and leaderboard into one crate to avoid cross-domain trait. | No |
| You decide | Claude decides grouping based on dependency analysis. | No |

**User's choice:** 4 separate crates
**Notes:** Consistent with D-04 and Phases 2-3 pattern. Leaderboard→classes dependency resolved via api-infra trait per D-06.

---

## Claude's Discretion

Areas where no user discussion was needed:
- ClassMembershipChecker trait design in api-infra
- Redis queue dependency resolution for domain-submissions
- Exact SQL modifications for SEC-03
- Extraction order and wave strategy
- LeaderboardService redis client normalization

## Deferred Ideas

None — discussion stayed within phase scope.
