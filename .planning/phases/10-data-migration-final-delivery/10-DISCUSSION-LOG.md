# Phase 10 Discussion Log: Data Migration + Final Delivery

**Date:** 2026-04-17
**Mode:** discuss
**Duration:** ~15 minutes

---

## Gray Areas Presented

7 gray areas identified from source/target schema analysis:

1. Test case sourcing (filesystem vs skip vs both)
2. Password migration (MD5→bcrypt strategy)
3. Scope boundary (which UOJ tables to migrate)
4. Default organization (how to handle multi-tenant requirement)
5. ID mapping storage (in-memory vs persistent vs audit trail)
6. Tool architecture (new crate vs API subcommand vs external script)
7. Idempotency strategy (skip-if-exists vs delete-reinsert vs big transaction)

## Decisions Made

| ID | Decision | User Choice |
|---|---|---|
| D-10-1 | Test case sourcing | Filesystem directory via `--test-case-dir` CLI flag |
| D-10-2 | Password migration | Transparent MD5→bcrypt with `{MD5}` prefix marker |
| D-10-3 | Scope boundary | Full: Users, Problems, Submissions, Blogs, Contests, Best AC, Likes, Messages |
| D-10-4 | Organization assignment | `--org-id` or `--create-default-org` CLI flags |
| D-10-5 | ID mapping | Persistent `migration_mappings` table + in-memory HashMap |
| D-10-6 | Tool architecture | New `migration-tool/` workspace crate |
| D-10-7 | Idempotency | Skip-if-exists via mapping table lookup |

## Key Observations

- Source SQL dump (`app_uoj233.sql`) contains schema only, no data rows — tool must handle empty dump gracefully
- UOJ has no time_limit/memory_limit columns — extracted from `extra_config` JSON or use defaults
- UOJ `submissions.result` is a blob, not a string — needs special parsing for verdict mapping
- 11 UOJ tables have no AlgoMaster equivalent and are excluded from migration

---

*Log created: 2026-04-17*
