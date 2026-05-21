# Phase 10: Data Migration + Final Delivery - Research

**Researched:** 2026-04-17
**Domain:** Data migration (MySQL-to-PostgreSQL), SQL dump parsing, CLI tooling, password migration
**Confidence:** HIGH

## Summary

Phase 10 builds a one-time migration tool (`migration-tool/` crate) that reads a UOJ MySQL dump file, transforms data, and writes to the AlgoMaster PostgreSQL database. The source SQL dump at `references/app_uoj233.sql` is 729 lines and contains table schemas only (no INSERT data) -- the tool must handle both empty and populated dumps. The UOJ schema has 14 tables to migrate (users, problems, submissions, contests, blogs, and related junction tables) with significant type mapping challenges: varchar PKs to UUIDs, int PKs to BIGSERIAL, MD5 passwords to bcrypt with `{MD5}` prefix marker, and MySQL blob results to verdict enums.

The target PostgreSQL schema has strict CHECK constraints that block straightforward migration of some UOJ data. Most critically, the `submissions.language` constraint only allows `('python3', 'c', 'cpp', 'c++')` while UOJ has Java and Go submissions. The `submissions` table also has no `score` column (score lives in `contest_submissions`). These gaps require either constraint relaxation or data filtering during migration.

**Primary recommendation:** Build the migration tool as a standalone workspace crate with regex-based SQL dump parser (not sqlparser), process entities in strict dependency order (org -> users -> problems -> submissions -> contests -> blogs -> likes/messages), and modify the `domain-users` login flow to support transparent MD5-to-bcrypt password upgrade.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-10-1: Test cases sourced from filesystem via `--test-case-dir` CLI flag (structure: `{dir}/{problem_id}/in/1.txt`, `{dir}/{problem_id}/out/1.txt`)
- D-10-2: Transparent MD5-to-bcrypt migration with `{MD5}` prefix marker on first login
- D-10-3: Full scope: Users, Problems, Submissions, Blogs, Contests, Best AC, Likes, Messages
- D-10-4: `--org-id <id>` or `--create-default-org` CLI flags for organization assignment
- D-10-5: Persistent `migration_mappings` table + in-memory HashMap for ID tracking
- D-10-6: New `migration-tool/` workspace crate, standalone binary
- D-10-7: Skip-if-exists idempotency via mapping table lookup

### Constraints
- SQL dump is empty of data -- tool must handle both empty and populated dumps gracefully
- Test cases on filesystem -- no test case data in the SQL dump
- Single-tenant source -- UOJ has no organization concept, all data belongs to one org
- MD5 passwords -- UOJ uses unsalted MD5, cannot be directly converted to bcrypt
- No frontend changes -- migration is a backend-only tool
- One-time tool -- simplicity over elegance

### Deferred Ideas (OUT OF SCOPE)
- Contest questions/announcements migration (contests_asks, contests_notice)
- Paste migration (pastes)
- Custom test migration (custom_test_submissions)
- Hack migration (hacks)
- Important blogs (important_blogs)
- Submission requirements migration (submission_requirement)
- Incremental/delta migration
- MySQL direct connection -- tool reads SQL dump file only
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MIGR-01 | UOJ schema mapping | Full cross-reference of 14 UOJ tables to AlgoMaster tables documented below, with field-level mapping and type conversions |
| MIGR-02 | User migration | UOJ `user_info` (varchar PK, MD5) -> `users` (UUID PK, bcrypt). D-10-2 prefix marker. D-10-4 org assignment. Role mapping: usergroup char -> role enum |
| MIGR-03 | Problem migration | UOJ `problems` + `problems_contents` -> `problems`. `extra_config` JSON parsed for time/memory limits. D-10-1 filesystem test cases. `author_id` requires system user |
| MIGR-04 | Submission migration | UOJ `submissions` -> `submissions`. Language mapping (C++11->cpp, etc). Status/verdict enum mapping. No `score` column in target. `language` CHECK constraint blocks Java/Go |
| MIGR-05 | Blog migration | UOJ `blogs` -> `articles`, `blogs_comments` -> `article_comments`, `blogs_tags` -> `articles.tags`. Requires slug generation |
| MIGR-06 | Migration CLI tool | New `migration-tool/` crate. clap 4 for CLI. Regex SQL dump parser. sqlx 0.8 for PG writes. Idempotent via migration_mappings table |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| clap | 4.6 | CLI argument parsing | De-facto standard for Rust CLIs. Used with `derive` feature [VERIFIED: cargo search] |
| sqlx | 0.8 | PostgreSQL async driver | Matches workspace version. Features: `runtime-tokio-rustls`, `postgres`, `chrono`, `uuid` [VERIFIED: workspace Cargo.toml] |
| anyhow | 1.0 | Error handling | Matches workspace pattern. All services return `anyhow::Result<T>` [VERIFIED: workspace pattern] |
| tracing | 0.1 | Structured logging | Matches workspace. `tracing-subscriber` with `env-filter` [VERIFIED: workspace Cargo.toml] |
| chrono | 0.4 | Timestamp handling | Matches workspace. `serde` feature for serialization [VERIFIED: workspace Cargo.toml] |
| uuid | 1.11 | UUID generation | Matches workspace. `v4`, `serde` features [VERIFIED: workspace Cargo.toml] |
| serde | 1.0 | Serialization | Workspace standard for JSON parsing (`extra_config` field) [VERIFIED: workspace Cargo.toml] |
| serde_json | 1.0 | JSON parsing | For parsing UOJ `extra_config` JSON field [VERIFIED: workspace Cargo.toml] |
| md-5 | 0.11 | MD5 hashing for password migration | Needed to verify MD5 passwords during transparent migration. From RustCrypto family [VERIFIED: cargo search] |
| bcrypt | 0.16 | Password hashing | Matches api crate version. For transparent MD5->bcrypt upgrade [VERIFIED: api/Cargo.toml] |
| tokio | 1.35 | Async runtime | Workspace standard [VERIFIED: workspace Cargo.toml] |
| regex | 1.11 | SQL dump parsing | For extracting INSERT data from mysqldump format. Matches workspace version [VERIFIED: api/Cargo.toml] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shared | (workspace path) | Shared models (Claims, User) | For type compatibility with existing auth models |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| regex SQL parser | sqlparser 0.61 | sqlparser is a full SQL AST parser -- overkill for extracting INSERT values from mysqldump. Regex is simpler and sufficient for the controlled mysqldump format. sqlparser would add a heavy dependency for a one-time tool [ASSUMED] |
| regex SQL parser | mysql crate (direct connection) | CONTEXT.md explicitly defers MySQL direct connection. Reading dump file is the locked decision [VERIFIED: CONTEXT.md Deferred Ideas] |

**Installation:**
```toml
# migration-tool/Cargo.toml
[package]
name = "migration-tool"
version = "0.1.0"
edition = "2021"

[dependencies]
shared = { path = "../shared" }
tokio = { workspace = true }
sqlx = { version = "0.8", features = ["runtime-tokio-rustls", "postgres", "chrono", "uuid"] }
clap = { version = "4", features = ["derive"] }
anyhow = "1.0"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.11", features = ["v4", "serde"] }
serde = { workspace = true }
serde_json = "1.0"
regex = "1.11"
md-5 = "0.11"
bcrypt = "0.16"
```

## Architecture Patterns

### Recommended Project Structure
```
migration-tool/
  Cargo.toml
  src/
    main.rs           -- CLI entry point with clap arg parsing
    parser.rs         -- SQL dump file parser (regex-based INSERT extraction)
    mapper.rs         -- UOJ -> AlgoMaster field mapping logic
    migrator.rs       -- Orchestrates migration in dependency order
    id_map.rs         -- In-memory HashMap + DB migration_mappings table
    test_cases.rs     -- Filesystem test case reader
    password.rs       -- MD5 -> {MD5}prefix migration
    models.rs         -- Source (UOJ) data structures
```

### Pattern 1: Regex-Based SQL Dump Parser
**What:** Parse mysqldump output using regex to extract table names and INSERT row data.
**When to use:** Reading the UOJ MySQL dump file.
**Why not sqlparser:** The dump format is highly regular and controlled. Full SQL parsing adds unnecessary complexity for a one-time tool. The dump structure follows a predictable pattern:
```
LOCK TABLES `table_name` WRITE;
/*!40000 ALTER TABLE `table_name` DISABLE KEYS */;
INSERT INTO `table_name` VALUES (...),(...);
/*!40000 ALTER TABLE `table_name` ENABLE KEYS */;
UNLOCK TABLES;
```

**Example:**
```rust
// Source: Designed for mysqldump 10.13 format (verified from app_uoj233.sql)
use regex::Regex;

/// Extract table name from CREATE TABLE statement
fn extract_table_name(line: &str) -> Option<String> {
    let re = Regex::new(r"CREATE TABLE `(\w+)`").ok()?;
    re.captures(line).map(|c| c[1].to_string())
}

/// Parse INSERT INTO `table` VALUES (...) rows
fn parse_insert_rows(line: &str) -> Vec<Vec<String>> {
    // mysqldump outputs: INSERT INTO `table` VALUES (val1,'val2',...),(val1,'val2',...);
    // Strategy: find the VALUES keyword, then parse parenthesized groups
    // Handle: escaped quotes (\'), NULL values, blob data (0x...)
    // ...
}
```

### Pattern 2: Dependency-Ordered Migration
**What:** Migrate entities in strict order to satisfy foreign key constraints.
**When to use:** All migrations -- this is the core orchestration pattern.
**Example:**
```rust
// Source: FK constraints verified from PostgreSQL migration files
async fn run_migration(&self) -> Result<()> {
    // 1. Organization + Campus (D-10-4)
    self.migrate_organization().await?;

    // 2. Users (depends on org) -- user_info -> users + user_roles
    self.migrate_users().await?;

    // 3. Problems (depends on users for author_id) + test cases from filesystem
    self.migrate_problems().await?;

    // 4. Submissions (depends on users + problems)
    self.migrate_submissions().await?;

    // 5. Contests (depends on problems)
    self.migrate_contests().await?;

    // 6. Contest participants + contest_problems + contest_submissions
    self.migrate_contest_data().await?;

    // 7. Blogs -> articles + comments (depends on users)
    self.migrate_blogs().await?;

    // 8. Likes (depends on users + articles/problems)
    self.migrate_likes().await?;

    // 9. Direct messages (depends on users)
    self.migrate_messages().await?;
    Ok(())
}
```

### Pattern 3: Transparent Password Migration Hook
**What:** Modify `domain-users/src/service.rs` login to detect `{MD5}` prefix and upgrade.
**When to use:** On every login attempt where password_hash starts with `{MD5}`.
**Example:**
```rust
// Source: domain-users/src/service.rs line 121 (current bcrypt::verify)
// Modified login password check:
if user.password_hash.starts_with("{MD5}") {
    // Transparent MD5 migration path
    let md5_hash = &user.password_hash[5..]; // strip prefix
    let digest = md5::Md5::digest(req.password.as_bytes());
    let computed = format!("{:x}", digest);
    if computed == md5_hash {
        // Upgrade to bcrypt
        let new_hash = bcrypt::hash(&req.password, bcrypt::DEFAULT_COST)?;
        sqlx::query("UPDATE users SET password_hash = $1 WHERE id = $2")
            .bind(&new_hash)
            .bind(user.id)
            .execute(&self.pool)
            .await?;
    } else {
        return Err(anyhow::anyhow!("Invalid credentials"));
    }
} else {
    // Normal bcrypt verification
    bcrypt::verify(&req.password, &user.password_hash)?
        .then_some(())
        .ok_or_else(|| anyhow::anyhow!("Invalid credentials"))?;
}
```

### Anti-Patterns to Avoid
- **Using sqlparser for dump parsing:** Overkill for a one-time tool that reads a controlled mysqldump format. Regex is simpler and produces fewer lines of code. [ASSUMED]
- **Connecting directly to MySQL:** Locked out by CONTEXT.md deferred ideas. Must read dump file only.
- **Batch inserting without idempotency checks:** Every insert must check `migration_mappings` first, or re-runs will duplicate data and violate UNIQUE constraints.
- **Using transactions for the entire migration:** For large datasets, a single transaction can be problematic. Process per-entity with individual mapping checks. [ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MD5 hashing | Custom MD5 implementation | `md-5` crate (RustCrypto) | Constant-time concerns, correctness, well-audited |
| Password hashing | Custom bcrypt implementation | `bcrypt` crate (version 0.16, matches workspace) | Security-critical, well-tested, configurable cost |
| SQL value parsing (strings, escapes, NULLs) | Custom CSV-like parser | Regex with careful escape handling | MySQL string escaping rules are subtle (\\, \', \0, etc.) |
| CLI argument parsing | Manual `std::env::args()` parsing | `clap` with derive macros | Validation, help text, error messages for free |
| UUID generation | Custom UUID logic | `uuid` crate with `v4` feature | Standards compliance, collision resistance |

**Key insight:** The migration tool is a one-time utility, but the password migration hook in `domain-users` is production code and must be correct. Spend more care on the auth change than the tool itself.

## Runtime State Inventory

> This is a greenfield tool creation phase, not a rename/refactor. No runtime state inventory needed.

## Common Pitfalls

### Pitfall 1: Submission Language Constraint Blocks Java/Go
**What goes wrong:** UOJ has Java8/Java11/Java17 and Python2 submissions. The target `submissions` table has `CHECK (language IN ('python3', 'c', 'cpp', 'c++'))`. Java and Go submissions will fail to insert. [VERIFIED: api/migrations/007_create_submissions.sql line 9]
**Why it happens:** AlgoMaster was designed for a subset of languages.
**How to avoid:** Two options: (1) Skip Java/Go/Python2 submissions with a warning, or (2) ALTER TABLE to add missing languages before migration. Recommendation: add missing languages to the CHECK constraint since the judge worker may need them later anyway. [ASSUMED -- planner should confirm with user]
**Warning signs:** sqlx INSERT failing with check constraint violation on `language` column.

### Pitfall 2: No `score` Column in Target Submissions Table
**What goes wrong:** UOJ `submissions` has a `score` column (int, nullable). AlgoMaster `submissions` has no `score` column. Score only exists in `contest_submissions.penalty_time` and `plagiarism_reports.similarity_score`. [VERIFIED: api/migrations/007_create_submissions.sql]
**Why it happens:** Different scoring model -- AlgoMaster uses verdict-based judging, not IOI-style partial scoring at the submission level.
**How to avoid:** Map UOJ `submissions.score` to `contest_submissions.score` if the submission belongs to a contest. For non-contest submissions, the score is lost or could be stored in a comment/metadata field. [ASSUMED -- planner should confirm strategy]
**Warning signs:** Compilation error or runtime error when trying to insert `score` into `submissions` table.

### Pitfall 3: Problems Require `author_id` (UUID FK to Users)
**What goes wrong:** UOJ `problems` table has no author field. AlgoMaster `problems` requires `author_id UUID NOT NULL REFERENCES users(id)`. [VERIFIED: api/migrations/005_create_problems.sql line 8]
**Why it happens:** AlgoMaster tracks problem ownership; UOJ does not.
**How to avoid:** Create a system/migration user during migration and assign all migrated problems to that user. Alternatively, use the first admin user. [ASSUMED -- planner should confirm]
**Warning signs:** NOT NULL violation on `author_id` column.

### Pitfall 4: Blog `slug` Must Be Unique and Non-Null
**What goes wrong:** UOJ `blogs` have no slug field. AlgoMaster `articles` requires `slug VARCHAR(200) UNIQUE NOT NULL`. [VERIFIED: api/migrations/022_create_blog_tables.sql line 4]
**Why it happens:** AlgoMaster uses URL-friendly slugs for blog posts.
**How to avoid:** Generate slugs from blog title + ID (e.g., `my-first-post-123`). Use a slugification function that removes special characters, converts to lowercase, replaces spaces with hyphens.
**Warning signs:** UNIQUE violation or NOT NULL violation on `slug` column.

### Pitfall 5: UOJ `result` Column is a BLOB, Not a String
**What goes wrong:** UOJ `submissions.result` is a MySQL BLOB type, not a simple VARCHAR. The actual verdict string is stored inside the blob with potential binary framing. [VERIFIED: references/app_uoj233.sql line 591]
**Why it happens:** UOJ stores structured judging results in serialized format.
**How to avoid:** When parsing INSERT data from the dump, handle `0x...` hex-encoded blob values. Decode the hex to bytes, then interpret the bytes as UTF-8 string. The verdict strings (e.g., "Accepted", "Wrong Answer") should be extractable as ASCII/UTF-8 text from the blob. [ASSUMED]
**Warning signs:** Parser produces garbled verdict strings or fails on hex-encoded values.

### Pitfall 6: Empty SQL Dump Handling
**What goes wrong:** The current `app_uoj233.sql` has table schemas but NO INSERT statements (all tables are empty). The parser might crash or produce zero results. [VERIFIED: Read entire 729-line file, all INSERT blocks are empty]
**Why it happens:** This is a schema-only dump or the database was empty at dump time.
**How to avoid:** The parser must handle tables with no INSERT statements gracefully. If no data is found, log a warning and proceed. The tool is still useful for validating the schema mapping and testing with populated dumps in the future.
**Warning signs:** Panic or error when expected INSERT data is missing.

### Pitfall 7: User Email Uniqueness with NULL Values
**What goes wrong:** AlgoMaster `users` table has `email TEXT NOT NULL UNIQUE` (from migration 003). Migration 019 makes email nullable: `ALTER TABLE users ALTER COLUMN email DROP NOT NULL`. But UOJ users might have duplicate or empty emails. [VERIFIED: api/migrations/003 + api/migrations/019]
**Why it happens:** UOJ does not enforce email uniqueness well. Multiple users may have the same or empty email.
**How to avoid:** For migrated users with duplicate/empty emails, generate a synthetic email like `{username}@migrated.uoj.local`. PostgreSQL UNIQUE constraint allows multiple NULL values, but empty strings count as duplicates.
**Warning signs:** UNIQUE violation on `email` column during user migration.

## Code Examples

### SQL Dump Parser: Extract INSERT Data
```rust
// Source: Designed for mysqldump 10.13 format observed in app_uoj233.sql
use regex::Regex;
use std::fs;
use std::collections::HashMap;

struct ParsedDump {
    tables: HashMap<String, Vec<Vec<String>>>,
}

fn parse_dump(content: &str) -> ParsedDump {
    let mut tables = HashMap::new();
    // Pattern: INSERT INTO `table_name` VALUES (...),(...);
    let insert_re = Regex::new(r"INSERT INTO `(\w+)` VALUES (.+);").unwrap();
    for line in content.lines() {
        if let Some(caps) = insert_re.captures(line) {
            let table_name = caps[1].to_string();
            let values_str = &caps[2];
            let rows = parse_values(values_str);
            tables.entry(table_name).or_insert_with(Vec::new).extend(rows);
        }
    }
    ParsedDump { tables }
}
```

### ID Mapping Table Creation
```sql
-- Source: CONTEXT.md D-10-5
CREATE TABLE IF NOT EXISTS migration_mappings (
    entity_type TEXT NOT NULL,
    old_id TEXT NOT NULL,
    new_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (entity_type, old_id)
);
```

### Test Case Filesystem Reader
```rust
// Source: CONTEXT.md D-10-1
use std::path::Path;
use anyhow::Result;

struct TestCase {
    input: String,
    output: String,
    order_index: i32,
}

fn read_test_cases(test_case_dir: &Path, problem_id: i64) -> Result<Vec<TestCase>> {
    let problem_dir = test_case_dir.join(problem_id.to_string());
    if !problem_dir.exists() {
        anyhow::bail!("No test case directory for problem {}", problem_id);
    }
    let mut cases = Vec::new();
    let mut idx = 1;
    loop {
        let input_path = problem_dir.join("in").join(format!("{}.txt", idx));
        let output_path = problem_dir.join("out").join(format!("{}.txt", idx));
        if !input_path.exists() || !output_path.exists() { break; }
        cases.push(TestCase {
            input: std::fs::read_to_string(&input_path)?,
            output: std::fs::read_to_string(&output_path)?,
            order_index: idx,
        });
        idx += 1;
    }
    Ok(cases)
}
```

### CLI Entry Point with clap
```rust
// Source: clap 4 derive pattern
use clap::Parser;

#[derive(Parser)]
#[command(name = "uoj-migrate", about = "Migrate UOJ data to AlgoMaster")]
struct Cli {
    /// Path to UOJ MySQL dump file
    #[arg(long)]
    dump_file: String,

    /// PostgreSQL connection string
    #[arg(long, env = "DATABASE_URL")]
    database_url: String,

    /// Path to UOJ test case directory
    #[arg(long)]
    test_case_dir: Option<String>,

    /// Existing organization ID to assign migrated data to
    #[arg(long)]
    org_id: Option<i64>,

    /// Create a default organization for migrated data
    #[arg(long)]
    create_default_org: bool,
}
```

## Schema Cross-Reference

### Complete Field-Level Mapping: UOJ -> AlgoMaster

#### users (user_info)
| UOJ Field | AlgoMaster Field | Transform |
|-----------|-----------------|-----------|
| `username` (varchar PK) | `users.username` (VARCHAR(20)) | Copy directly |
| `username` | `users.id` (UUID PK) | Generate new UUID, store in migration_mappings |
| `email` (varchar) | `users.email` (nullable TEXT) | Copy; if empty/duplicate, generate `{username}@migrated.uoj.local` |
| `password` (char(32), MD5) | `users.password_hash` | Prefix with `{MD5}`: `"{MD5}{md5_hash}"` |
| (none) | `users.organization_id` | From `--org-id` or auto-created org |
| (none) | `users.campus_id` | From auto-created campus or NULL |
| `username` | `users.display_name` | Copy username as display_name |
| (none) | `users.user_code` | NULL or generate from username |
| `usergroup` (char(1)) | `user_roles.role` | Map: 'U'->'student', 'S'->'teacher', 'B'->'student' [ASSUMED -- verify usergroup meanings] |
| `register_time` | `users.created_at` | Convert MySQL datetime to TIMESTAMPTZ |

#### problems (problems + problems_contents)
| UOJ Field | AlgoMaster Field | Transform |
|-----------|-----------------|-----------|
| `id` (int PK) | `problems.id` (BIGSERIAL) | Store mapping in migration_mappings. Insert with explicit ID |
| `title` | `problems.title` | Copy directly |
| `problems_contents.statement_md` | `problems.description` | Copy markdown content |
| `is_hidden` | `problems.visibility` | Map: 0->'public', 1->'private' |
| `extra_config` JSON: `time_limit` | `problems.time_limit_ms` | Parse JSON; default 1000 if absent |
| `extra_config` JSON: `memory_limit` | `problems.memory_limit_kb` | Parse JSON; multiply by 1024 if in MB; default 256000 |
| (none) | `problems.author_id` (UUID) | Use system migration user or first admin |
| `ac_num` | (no direct column) | Could update counter or skip |
| `submit_num` | (no direct column) | Could update counter or skip |
| `problems_tags.tag` | (no tags column on problems) | Tags stored via separate mechanism or skipped |

#### submissions
| UOJ Field | AlgoMaster Field | Transform |
|-----------|-----------------|-----------|
| `id` (int PK) | `submissions.id` (BIGSERIAL) | Store mapping. Insert with explicit ID |
| `submitter` (varchar) | `submissions.user_id` (UUID) | Look up from migration_mappings |
| `problem_id` (int) | `submissions.problem_id` (BIGINT) | Look up from migration_mappings |
| `language` (varchar) | `submissions.language` | Map: see language table below. **WARN: Java/Go blocked by CHECK** |
| `content` | `submissions.code` | Copy directly |
| `status` + `result` | `submissions.status` + `submissions.verdict` | Map: see status/verdict table in CONTEXT.md |
| `used_time` | `submissions.time_ms` | Copy directly |
| `used_memory` | `submissions.memory_kb` | Copy directly |
| `submit_time` | `submissions.created_at` | Convert MySQL datetime to TIMESTAMPTZ |
| `score` | **NO COLUMN** | Lost or mapped to contest_submissions if applicable |
| `contest_id` | (via contest_submissions junction) | If contest_id is set, create contest_submissions row |

#### contests
| UOJ Field | AlgoMaster Field | Transform |
|-----------|-----------------|-----------|
| `id` (int PK) | `contests.id` (BIGSERIAL) | Store mapping. Insert with explicit ID |
| `name` | `contests.name` | Copy directly |
| `start_time` | `contests.start_time` | Convert MySQL datetime to TIMESTAMPTZ |
| `start_time` + `last_min` | `contests.end_time` | Calculate: `start_time + last_min minutes` |
| `extra_config` | `contests.rules` | Parse JSON; default 'acm' |
| (none) | `contests.organization_id` | From CLI flag |

#### blogs -> articles
| UOJ Field | AlgoMaster Field | Transform |
|-----------|-----------------|-----------|
| `id` (int PK) | `articles.id` (BIGSERIAL) | Store mapping |
| `title` | `articles.title` | Copy |
| `id` | `articles.slug` | Generate: slugify(title) + "-" + id |
| `content_md` | `articles.content` | Copy markdown content |
| `poster` (varchar) | `articles.author_id` (UUID) | Look up from migration_mappings |
| `is_hidden` | `articles.is_published` | Invert: 0->true, 1->false |
| `post_time` | `articles.published_at` | Copy |
| `blogs_tags` (multiple) | `articles.tags` (TEXT[]) | Aggregate tags into array |
| `zan` | `articles.like_count` | Copy |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| sqlparser for SQL parsing | Regex for mysqldump | N/A (this tool) | Simpler, fewer dependencies, sufficient for controlled dump format |
| Django-style password prefix markers | Same approach adopted | Battle-tested pattern | `{MD5}` prefix is a proven approach used by Django, Spring Security |
| Direct DB migration (MySQL->PG) | Dump file based migration | Design choice | No MySQL dependency needed, works offline |

**Deprecated/outdated:**
- sqlx 0.9 alpha: Still in alpha. Use stable 0.8 matching the workspace. [VERIFIED: cargo search]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Regex is sufficient for SQL dump parsing (vs sqlparser) | Standard Stack | Parser may fail on edge cases in INSERT data (escaped quotes, newlines in strings, hex blobs). Mitigation: test against actual dump |
| A2 | UOJ `usergroup` mapping: 'U'->'student', 'S'->'teacher', 'B'->'student' | Schema Cross-Reference | Wrong role assignment. Need to verify usergroup meanings from UOJ source code |
| A3 | UOJ `result` blob contains UTF-8 verdict strings extractable as text | Pitfall 5 | Blob format may be binary/serialized, not plain text. May need binary parsing |
| A4 | Java/Go submissions should be skipped or language constraint should be relaxed | Pitfall 1 | Policy decision. User may want all data migrated including Java |
| A5 | `submissions.score` can be dropped for non-contest submissions | Pitfall 2 | Data loss. User may want score preserved somewhere |
| A6 | Problems can be assigned to a system migration user | Pitfall 3 | All problems appear owned by one user. May want per-problem authorship |
| A7 | MySQL INSERT rows can be reliably parsed with regex (handling escaped quotes, NULL, hex blobs) | Code Examples | Complex data (code with quotes, binary blobs) may break simple regex parsing |

## Open Questions

1. **Language constraint relaxation**
   - What we know: `submissions.language` CHECK only allows `('python3', 'c', 'cpp', 'c++')`. UOJ has Java8/11/17 and Python2 submissions.
   - What's unclear: Should the constraint be relaxed to include 'java', 'python2', 'go', 'javascript'? Or should these submissions be skipped?
   - Recommendation: Relax the constraint. Add 'java' and 'python2' at minimum. This requires a new migration file.

2. **Score preservation**
   - What we know: AlgoMaster `submissions` has no `score` column. UOJ has `submissions.score`.
   - What's unclear: Is partial scoring (IOI-style) planned? Should score be preserved?
   - Recommendation: Add a nullable `score` column to `submissions` table, or store in `contest_submissions` for contest submissions and drop for others.

3. **UOJ usergroup meanings**
   - What we know: `usergroup` is char(1) with values 'U', 'S', 'B'.
   - What's unclear: What do these mean? 'U'=User/Student, 'S'=Student?, 'B'=Banned?
   - Recommendation: Check UOJ source code or documentation. Default all to 'student' if uncertain.

4. **`author_id` for problems**
   - What we know: `problems` requires `author_id UUID NOT NULL`. UOJ has no problem author.
   - What's unclear: Should a dedicated migration user be created? Or use the first registered admin?
   - Recommendation: Create a system user "uoj_migration" during migration for problem ownership.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Rust/Cargo | Build migration-tool | Yes | 1.90.0 | -- |
| PostgreSQL (psql) | Verify migration results | Yes | 16.13 | -- |
| MySQL CLI | Not needed (dump file only) | Yes | 8.4.0 | -- |
| sqlx 0.8 | PostgreSQL driver | Yes (workspace) | 0.8 | -- |
| clap 4 | CLI parsing | Not yet installed | 4.6.1 (registry) | -- |

**Missing dependencies with no fallback:**
- None -- all required tools are available.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Rust built-in tests + sqlx::test for integration |
| Config file | None -- tests inline in migration-tool/src/ |
| Quick run command | `cargo test -p migration-tool --lib` |
| Full suite command | `cargo test -p migration-tool` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MIGR-01 | Schema mapping correctness | unit | `cargo test -p migration-tool --lib mapper` | No - Wave 0 |
| MIGR-02 | User migration with MD5 prefix | unit | `cargo test -p migration-tool --lib password` | No - Wave 0 |
| MIGR-03 | Problem migration with test cases | unit | `cargo test -p migration-tool --lib test_cases` | No - Wave 0 |
| MIGR-04 | Submission status/verdict mapping | unit | `cargo test -p migration-tool --lib mapper` | No - Wave 0 |
| MIGR-05 | Blog slug generation | unit | `cargo test -p migration-tool --lib mapper` | No - Wave 0 |
| MIGR-06 | CLI argument parsing | unit | `cargo test -p migration-tool --lib main` | No - Wave 0 |
| MIGR-06 | Idempotent re-run | integration | `cargo test -p migration-tool --test integration` | No - Wave 0 |
| MIGR-02 | MD5->bcrypt transparent upgrade | unit | `cargo test -p domain-users --lib service` | Existing test file |

### Sampling Rate
- **Per task commit:** `cargo test -p migration-tool --lib`
- **Per wave merge:** `cargo test -p migration-tool`
- **Phase gate:** `cargo test -p migration-tool && cargo test -p domain-users`

### Wave 0 Gaps
- [ ] `migration-tool/src/models.rs` -- UOJ source data structures
- [ ] `migration-tool/src/parser.rs` -- SQL dump parser with test coverage
- [ ] `migration-tool/src/mapper.rs` -- Field mapping functions with test coverage
- [ ] `migration-tool/src/password.rs` -- MD5 prefix logic with test coverage
- [ ] `migration-tool/src/test_cases.rs` -- Filesystem reader with test coverage
- [ ] `migration-tool/src/id_map.rs` -- Mapping table management with test coverage
- [ ] Framework install: `cargo add` in migration-tool/Cargo.toml -- no external install needed

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Transparent MD5->bcrypt migration in domain-users login flow |
| V5 Input Validation | Yes | SQL dump parsing must handle malformed input safely |
| V6 Cryptography | Yes | MD5 (legacy verification only), bcrypt (password hashing) |

### Known Threat Patterns for Migration Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| MD5 collision on password migration | Tampering | MD5 is only used for legacy verification. bcrypt upgrade happens on first login. Low risk since attacker would need the original password to trigger upgrade |
| SQL injection via dump data | Tampering | Use parameterized queries (sqlx) for all PostgreSQL writes. Never interpolate parsed values into SQL |
| Sensitive data in logs | Information Disclosure | Don't log password hashes. Log only usernames and mapping IDs |

## Sources

### Primary (HIGH confidence)
- Workspace Cargo.toml -- verified dependency versions
- api/migrations/*.sql -- verified target PostgreSQL schema (30 files read)
- references/app_uoj233.sql -- verified source MySQL schema (729 lines, full read)
- domain-users/src/service.rs -- verified login flow (lines 111-167)
- domain-users/src/models.rs -- verified User struct
- api/src/auth/password.rs -- verified bcrypt usage

### Secondary (MEDIUM confidence)
- cargo search -- verified current crate versions (clap 4.6.1, sqlx 0.8 stable, md-5 0.11, anyhow 1.0.102)
- CONTEXT.md -- verified locked decisions and constraints

### Tertiary (LOW confidence)
- UOJ usergroup meanings -- not verified against UOJ source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all versions verified against workspace and registry
- Architecture: HIGH - schema mapping verified line-by-line against migration files
- Pitfalls: HIGH - discovered from direct schema comparison, not assumed
- UOJ-specific details: MEDIUM - usergroup meanings and blob format not verified against UOJ source

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (stable domain, SQL schema unlikely to change)
