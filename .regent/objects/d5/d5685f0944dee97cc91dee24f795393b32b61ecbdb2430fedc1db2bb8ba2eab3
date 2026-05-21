---
phase: "13"
plan: "03"
name: "Import/Export + Backend Tests"
status: complete
executor: orchestrator
date: 2026-04-20
---

## Objective
Update domain-imex and backend integration tests to use GradeAdmin instead of OrganizationAdmin.

## Outcome
**Already complete.** The domain-imex crate uses `is_campus_admin()` and `Role::Root` checks. GradeAdmin campus + grade scope enforcement was added in security fix commit `45805bc`. Integration tests pass.

## Key Files
- `backend/domain-imex/src/routes.rs` — GradeAdmin campus/grade scope enforcement
- `backend/domain-imex/src/user_import.rs` — Role policy with `allow_root_roles`

## Self-Check: PASSED
- [x] No references to OrganizationAdmin in domain-imex
- [x] GradeAdmin scope enforcement in import flow
- [x] Tests compile and pass
