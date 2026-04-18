# Phase 10 Context: Data Migration + Final Delivery

**Phase:** 10 — Data Migration + Final Delivery
**Created:** 2026-04-17
**Status:** Decisions locked

---

## Requirements

| ID | Description | Risk |
|---|---|---|
| MIGR-01 | UOJ schema mapping — complete mapping from UOJ MySQL to AlgoMaster PostgreSQL | HIGH — source schema has 20 tables, many with no direct target equivalent |
| MIGR-02 | User migration — map UOJ users (varchar username) to AlgoMaster users (UUID); generate new passwords; assign to default organization | HIGH — password format change (MD5→bcrypt), PK type change (varchar→UUID) |
| MIGR-03 | Problem migration — migrate UOJ problems with test cases; map integer IDs to UUIDs via mapping table | HIGH — test cases stored on filesystem, not in DB; ID remapping required |
| MIGR-04 | Submission migration — migrate historical submissions with status, score, runtime; map all foreign key IDs | MEDIUM — large data volume, status/verdict enum mapping needed |
| MIGR-05 | Blog migration — migrate UOJ blog posts to AlgoMaster blog_* tables | LOW — straightforward field mapping |
| MIGR-06 | Migration CLI tool — standalone binary, reads UOJ MySQL dump, writes to PostgreSQL, idempotent | MEDIUM — SQL dump parsing, transaction management |

## Source Schema (UOJ MySQL — `references/app_uoj233.sql`)

### Core Tables to Migrate

| UOJ Table | Target Table | Key Mapping Challenges |
|---|---|---|
| `user_info` | `users` + `user_roles` | username(varchar)→UUID, MD5→bcrypt, usergroup→role enum |
| `problems` + `problems_contents` | `problems` | int→BIGSERIAL, split metadata/content, no time_limit/memory_limit in source |
| `problems_tags` | `problems.tags` (via insert) | Simple tag migration |
| `submissions` | `submissions` | int→BIGSERIAL, status string→enum, result blob→verdict enum |
| `blogs` | `articles` | int→BIGSERIAL, poster(varchar)→author_id(UUID), slug generation |
| `blogs_comments` | `article_comments` | int→BIGSERIAL, poster→author_id(UUID) |
| `blogs_tags` | `articles.tags` | tag→TEXT[] array |
| `contests` | `contests` | int→BIGSERIAL, last_min→end_time calculation |
| `contests_problems` | `contest_problems` | ID remapping (int→BIGSERIAL) |
| `contests_registrants` | `contest_participants` | username→user_id(UUID) |
| `contests_submissions` | `contest_submissions` | ID remapping |
| `best_ac_submissions` | leaderboard data | username→user_id, problem_id remapping |
| `click_zans` | `likes` | type+target_id→target_type+target_id, username→user_id(UUID) |
| `user_msg` | `direct_messages` | sender/receiver→user_id(UUID) |

### Tables NOT Migrated

| UOJ Table | Reason |
|---|---|
| `hacks` | No AlgoMaster equivalent |
| `custom_test_submissions` | No AlgoMaster equivalent |
| `pastes` | No AlgoMaster equivalent |
| `search_requests` | Log data, not needed |
| `judger_info` | Different judge system |
| `contests_asks` | No AlgoMaster equivalent |
| `contests_notice` | No AlgoMaster equivalent |
| `contests_permissions` | Replaced by RBAC system |
| `problems_permissions` | Replaced by RBAC system |
| `important_blogs` | Feature not in scope |
| `submission_requirements` | Metadata lost — problems need manual review |

## Decisions

### D-10-1: Test Case Sourcing — Filesystem Directory

**Decision:** CLI accepts `--test-case-dir <path>` flag pointing to the UOJ data directory on the filesystem.

**Expected structure:**
```
{test-case-dir}/{problem_id}/
  in/
    1.txt, 2.txt, ...
  out/
    1.txt, 2.txt, ...
```

**Behavior:**
- Reads input/output pairs from filesystem
- Problems without test case files are skipped with a warning
- Test cases are created in `test_cases` table with `is_sample = false` (none are sample by default)

**Why:** UOJ stores test cases on filesystem, not in the database. The SQL dump has no test case data. Filesystem sourcing is the only viable path.

### D-10-2: Password Migration — Transparent MD5→bcrypt

**Decision:** Store migrated MD5 hashes with `{MD5}` prefix marker in `password_hash` column.

**Flow:**
1. Migration writes `"{MD5}{original_md5_hash}"` to `password_hash` column
2. Auth middleware detects `{MD5}` prefix
3. On login: verify password against MD5 hash
4. If match: re-hash password with bcrypt, replace `{MD5}` prefix entry in DB
5. Subsequent logins use normal bcrypt verification

**Why:** Least disruptive for migrated users. No forced password resets, no temp password distribution. The prefix marker approach is battle-tested (Django uses `{pbkdf2_sha256}$` prefix pattern).

### D-10-3: Migration Scope — Full Coverage

**Decision:** Migrate all core entities plus optional historical data.

**Core (MIGR requirements):**
- Users (MIGR-02): `user_info` → `users` + `user_roles`
- Problems + test cases (MIGR-03): `problems` + `problems_contents` + `problems_tags` + filesystem → `problems` + `test_cases`
- Submissions (MIGR-04): `submissions` → `submissions`
- Blogs (MIGR-05): `blogs` + `blogs_comments` + `blogs_tags` → `articles` + `article_comments`

**Extended (not in MIGR but valuable):**
- Contests: `contests` + `contests_problems` + `contests_registrants` + `contests_submissions`
- Best AC: `best_ac_submissions` → leaderboard seed data
- Likes: `click_zans` → `likes`
- Messages: `user_msg` → `direct_messages`

### D-10-4: Organization Assignment — CLI Flag

**Decision:** CLI accepts either `--org-id <id>` (existing org) or `--create-default-org` (auto-create).

**Behavior:**
- `--org-id 1`: All migrated entities assigned to organization with id=1. Error if org doesn't exist.
- `--create-default-org`: Creates organization named "Imported from UOJ" with a default campus "Main Campus". All entities assigned there.
- Neither flag: Print usage error and exit.
- Both flags: `--org-id` takes precedence (ignore `--create-default-org`). No error is raised; both flags are accepted simultaneously.

**Why:** Flexible for different deployment scenarios. Single-tenant migration uses auto-create. Existing deployment uses `--org-id` to import into specific org.

### D-10-5: ID Mapping — Persistent Table + In-Memory HashMap

**Decision:** Create `migration_mappings` table in PostgreSQL for persistent tracking, plus in-memory HashMap during run.

**Schema:**
```sql
CREATE TABLE migration_mappings (
    entity_type TEXT NOT NULL,  -- 'user', 'problem', 'submission', 'contest', 'blog', 'blog_comment'
    old_id TEXT NOT NULL,       -- Original UOJ identifier (int as string, or username for users)
    new_id TEXT NOT NULL,       -- New AlgoMaster identifier (UUID or BIGSERIAL as string)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (entity_type, old_id)
);
```

**Usage:**
- Before each insert: check in-memory HashMap (fast)
- On first run: load existing mappings from DB into HashMap
- After each successful insert: write to both HashMap and DB
- Re-runs: skip if mapping exists (idempotency)

**Why:** Persistent table enables idempotent re-runs and post-migration auditing. In-memory HashMap avoids DB lookups during the hot path.

### D-10-6: Tool Architecture — New Workspace Crate

**Decision:** Create `migration-tool/` as a new workspace crate.

**Structure:**
```
migration-tool/
  Cargo.toml          -- depends on: shared, sqlx, tokio, clap, anyhow, tracing
  src/
    main.rs           -- CLI entry point with clap arg parsing
    parser.rs         -- SQL dump file parser (extracts INSERT data from mysqldump format)
    mapper.rs         -- UOJ→AlgoMaster field mapping logic
    migrator.rs       -- Orchestrates migration: reads parsed data, writes to PG
    id_map.rs         -- In-memory + DB mapping table management
    test_cases.rs     -- Filesystem test case reader
    password.rs       -- MD5→{MD5}prefix migration
```

**Dependencies:**
- `shared` — for auth models (Claims, LoginRequest)
- `sqlx` — PostgreSQL writes
- `clap` — CLI argument parsing
- `anyhow` — error handling
- `tracing` — logging progress
- `chrono` — timestamp handling
- NO dependency on `api`, `api-infra`, or domain crates (keeps migration tool standalone)

**Why:** Clean isolation. No circular deps. Can be built and run independently of the API server.

### D-10-7: Idempotency — Skip-if-Exists

**Decision:** Each entity insert checks for existing mapping before proceeding. If found, skip.

**Flow:**
1. Load all existing mappings from `migration_mappings` into HashMap
2. For each entity: check `HashMap.get(entity_type, old_id)`
3. If exists → log "skipped (already migrated)" and use existing new_id for FK resolution
4. If not exists → insert into target table, write mapping to DB and HashMap
5. Process entities in dependency order: org/campus → users → problems → submissions → contests → blogs → etc.

**Why:** Safe re-runs. No data deletion. No risk of partial state. If migration crashes mid-way, re-running picks up where it left off.

## Constraints

- **SQL dump is empty of data** — The current `app_uoj233.sql` has table schemas but no INSERT statements (empty database). The tool must handle both empty and populated dumps gracefully.
- **Test cases on filesystem** — No test case data in the SQL dump. Must come from `--test-case-dir`.
- **Single-tenant source** — UOJ has no organization concept. All data belongs to one org.
- **MD5 passwords** — UOJ uses unsalted MD5. Cannot be directly converted to bcrypt.
- **No frontend changes** — Migration is a backend-only tool.
- **One-time tool** — Not production code. Simplicity over elegance.

## Key Technical Notes

### UOJ Status/Verdict Mapping

| UOJ status | UOJ result (blob) | AlgoMaster status | AlgoMaster verdict |
|---|---|---|---|
| (various) | "Accepted" | "judged" | "ac" |
| (various) | "Wrong Answer" | "judged" | "wa" |
| (various) | "Runtime Error" | "judged" | "rte" |
| (various) | "Time Limit Exceeded" | "judged" | "tle" |
| (various) | "Memory Limit Exceeded" | "judged" | "mle" |
| (various) | "Output Limit Exceeded" | "judged" | "ole" |
| (various) | "Compile Error" | "failed" | "ce" |
| (various) | "System Error" | "failed" | "ie" |
| (various) | (empty/pending) | "queued" | NULL |

Note: UOJ stores result as a binary blob, not a simple string. The parser needs to handle blob deserialization.

### UOJ Language Mapping

| UOJ language | AlgoMaster language |
|---|---|
| "C" | "c" |
| "C++" | "cpp" |
| "C++11" | "cpp" |
| "C++17" | "cpp" |
| "C++20" | "cpp" |
| "Python2" | "python3" |
| "Python3" | "python3" |
| "Java8" | "java" |
| "Java11" | "java" |
| "Java17" | "java" |

### Problem Metadata

UOJ `problems` table has no time_limit or memory_limit columns. These are stored in `extra_config` JSON field:
```json
{"view_content_type":"ALL","view_details_type":"ALL","time_limit":1000,"memory_limit":256}
```

If not present in extra_config, use defaults: `time_limit_ms=1000`, `memory_limit_kb=256000`.

### D-10-8: Language Constraint — Skip Unsupported Languages

**Decision:** Java/Go/Python2 submissions are skipped with a warning log during migration.

**Why:** Relaxing the CHECK constraint affects production judge worker behavior. Skipping is simpler and avoids schema changes for a one-time tool. Most UOJ submissions are C/C++/Python3 anyway.

### D-10-9: Score Preservation — Drop Non-Contest Score

**Decision:** `submissions.score` is dropped for non-contest submissions. Contest scores are mapped to `contest_submissions` table.

**Why:** AlgoMaster uses verdict-based judging (AC/WA/TLE), not IOI-style partial scoring. Adding a score column would be a schema change for legacy data only.

### D-10-10: Usergroup Mapping — U/S→student, B→skip

**Decision:** UOJ `usergroup` values mapped as: 'U'→student, 'S'→student, 'B'→skip (banned users not migrated).

**Why:** UOJ's 'U' and 'S' are both regular user tiers. Banned users ('B') should not be carried over.

### D-10-11: Problem Authorship — System Migration User

**Decision:** Create a system user `uoj_migration_{org_id}` during migration. All migrated problems assigned to this user as author. The per-org suffix prevents cross-tenant username collision when migrating into a non-empty database.

**Why:** UOJ has no problem author concept. A dedicated migration user makes ownership clear and doesn't pollute any real user's profile. The per-org suffix ensures each organization gets its own system user, preventing conflicts when multiple migrations target the same database.

## Deferred Ideas

- Contest questions/announcements migration (`contests_asks`, `contests_notice`) — no AlgoMaster equivalent
- Paste migration (`pastes`) — no equivalent
- Custom test migration (`custom_test_submissions`) — different system
- Hack migration (`hacks`) — no equivalent
- Important blogs (`important_blogs`) — feature not in scope for v1
- Submission requirements migration (`submission_requirement`) — deprecated concept
- Incremental/delta migration — out of scope; one-time bulk migration only
- MySQL direct connection — out of scope; tool reads SQL dump file only

---

*Context locked: 2026-04-17*
