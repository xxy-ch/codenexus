---
phase: "13"
plan: "01"
name: "Core Role Enum + RBAC + Database Migration"
status: complete
executor: orchestrator
date: 2026-04-20
---

## Objective
Replace `OrganizationAdmin` with `GradeAdmin` in the shared Role enum, update RBAC permission mapping, and create database migration.

## Outcome
**Already complete.** The Role enum in `shared/src/models/role.rs` has `GradeAdmin` as the third-highest role:

```
Root > CampusAdmin > GradeAdmin > Teacher > TeachingAssistant > Student
```

RBAC permission mapping updated. Database migration `030_reorg_to_gradeadmin.sql` applied.

## Key Files
- `backend/shared/src/models/role.rs` — GradeAdmin variant with hierarchy
- `backend/shared/src/models/permission.rs` — permission mapping
- `backend/api/migrations/030_reorg_to_gradeadmin.sql` — DB migration

## Self-Check: PASSED
- [x] GradeAdmin in Role enum
- [x] `is_higher_or_equal()` hierarchy correct
- [x] RBAC permissions mapped
- [x] Migration 030 exists
