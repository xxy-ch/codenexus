---
status: testing
phase: 04-domain-extraction-complex-submissions-contests-classes-leaderboard
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md]
started: 2026-04-15T14:00:00Z
updated: 2026-04-15T14:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Workspace Build
expected: |
  cargo build --workspace succeeds with zero errors. All 9 domain crates (domain-users, domain-problems, domain-community, domain-search, domain-classes, domain-submissions, domain-contests, domain-leaderboard) plus api, api-infra, shared, judge-worker compile cleanly.
awaiting: user response

## Tests

### 1. Workspace Build
expected: cargo build --workspace succeeds with zero errors. All 9 domain crates compile cleanly.
result: [pending]

### 2. Independent Crate Builds
expected: Each of the 4 new domain crates builds independently: cargo build -p domain-classes -p domain-submissions -p domain-contests -p domain-leaderboard succeeds.
result: [pending]

### 3. Clippy Clean
expected: cargo clippy --workspace -- -D warnings produces zero warnings across all workspace crates.
result: [pending]

### 4. Old Modules Removed
expected: The directories api/src/{classes,contests,leaderboard,submissions}/ no longer exist. All domain logic lives in domain-* crates.
result: [pending]

### 5. API main.rs Clean
expected: api/src/main.rs contains only main(), router mounting, and server startup. No domain-specific mod declarations for classes, contests, leaderboard, or submissions remain.
result: [pending]

### 6. SEC-03 Leaderboard Tenant Filtering
expected: domain-leaderboard/src/routes.rs extracts school_id from JWT claims and passes it to service. Global leaderboard SQL includes AND u.organization_id = $4 when school_id is Some. Problem leaderboard SQL includes AND u.organization_id = $3 when org_id is Some. Cache keys include org suffix to prevent cross-tenant cache leakage.
result: [pending]

### 7. Submission Tenant Check
expected: domain-submissions/src/service.rs create_submission validates the problem belongs to the user's organization (SELECT EXISTS(... WHERE id = $1 AND organization_id = $2)). Route handler passes claims.school_id to the service. Cross-tenant submission creation is rejected.
result: [pending]

### 8. Class Enrollment Tenant Check
expected: domain-classes/src/service.rs add_student queries users by username AND organization_id ($1, $2), using class.organization_id as the constraint. Students from other organizations cannot be enrolled. AddStudentRequest uses username (not email).
result: [pending]

### 9. Contest Freeze Logic
expected: domain-contests/src/service.rs get_contest_rankings calculates is_frozen (active during freeze window only, NOT after contest ends). When frozen, submissions_cutoff is the freeze start time. Both participant query and problem_submissions query filter by AND s.created_at < $N. After contest ends, full rankings are revealed.
result: [pending]

### 10. Leaderboard Pagination Totals
expected: All four leaderboard methods (global, school, campus, class) return correct total via independent count queries, not entries.len(). Global caches (total, entries) tuple. School uses COUNT(*) FROM users WHERE organization_id. Campus uses COUNT(*) FROM users WHERE campus_id. Class uses COUNT(*) FROM class_enrollments WHERE class_id AND status='active'.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0

## Gaps

[none yet]
