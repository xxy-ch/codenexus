# Features Research: Online Judge Enhancement

**Researched:** 2026-04-13
**Scope:** Missing features for production-grade OJ system

---

## Category: Problem Import/Export

### Table Stakes
| Feature | Description | Complexity | Dependencies |
|---------|-------------|------------|--------------|
| **FPACK**: Problem ZIP import | Upload .zip containing problem.md, test cases (in/out pairs), config.json (time limit, memory limit, tags, difficulty) | MEDIUM | Problem CRUD |
| **FPAEX**: Problem ZIP export | Download problem as .zip with same structure | LOW | Problem CRUD |
| **FPABT**: Batch problem import | Import multiple problems from a single archive (10-100 problems) | MEDIUM | FPACK |
| **FPAVL**: Import validation | Validate archive structure before import, report errors clearly | LOW | FPACK |

### Differentiators
| Feature | Description | Complexity |
|---------|-------------|------------|
| **FPAPL**: Polygon format support | Import from Codeforces Polygon XML/JSON format | HIGH |
| **FPAQD**: QDUOJ format support | Import from QDUOJ problem format | MEDIUM |

### Anti-features
- **DOMjudge import**: Too niche, not worth the complexity for educational use
- **Problem marketplace**: Out of scope — not a platform play

### Research Notes
- Most OJ systems use a ZIP-based format with `problem.yaml`/`config.json` + `testdata/` directory
- Codeforces Polygon uses a complex XML schema — worth supporting as import-only for migration
- QDUOJ uses a simpler JSON-based format that maps well to our schema
- Test case files should support both numbered (1.in/1.out) and named formats

---

## Category: User Import/Export

### Table Stakes
| Feature | Description | Complexity | Dependencies |
|---------|-------------|------------|--------------|
| **FUSCS**: CSV user import | Import users from CSV (username, email, password/name, role) | LOW | User CRUD |
| **FUSEX**: User data export | Export user list as CSV/Excel | LOW | User CRUD |
| **FUSVL**: Import validation | Validate CSV format, check duplicates, report errors | LOW | FUSCS |
| **FUSRL**: Bulk role assignment | Assign roles during import or as batch operation | LOW | RBAC |

### Differentiators
- None — this is straightforward CRUD

### Anti-features
- **LDAP/Active Directory integration**: Enterprise feature, not needed for educational use
- **OAuth bulk provisioning**: Overkill

### Research Notes
- CSV format is universal and sufficient for schools
- Password handling: generate random passwords on import, email them or let admin distribute
- Must validate against existing usernames/emails to prevent conflicts

---

## Category: Contest Enhancement

### Table Stakes
| Feature | Description | Complexity | Dependencies |
|---------|-------------|------------|--------------|
| **FCOFZ**: Leaderboard freeze | Show standings at a frozen time (e.g., last 60 min hidden), reveal after contest | MEDIUM | Leaderboard |
| **FCOUP**: Post-contest upsolving | After contest ends, participants can still submit and see results (not affecting official standings) | MEDIUM | Contest + Submissions |
| **FCORE**: Submission recovery | If judge worker crashes, pending submissions are retried automatically | MEDIUM | Judge Worker |
| **FCOTO**: Contest timer resilience | Timer survives browser refresh, uses server time as source of truth | LOW | Contest |

### Differentiators
| Feature | Description | Complexity |
|---------|-------------|------------|
| **FCOVT**: Virtual contest | Start any past contest at any time, simulating the real experience with timer and scoring | HIGH |
| **FCOPR**: Practice mode | Browse contest problems without timer, submit for practice (no ranking impact) | LOW |
| **FCOCL**: Contest cloning | Clone an existing contest (problems + settings) for a new session | LOW |
| **FCOFT**: Fault tolerance dashboard | Real-time display of submission queue status, judge health, error rates | MEDIUM |

### Anti-features
- **Team contests**: Significant complexity increase, not required for educational use
- **ICPC live scoring**: Too specific, ACM/IOI is sufficient
- **Replay system**: Nice-to-have but not worth the implementation cost

### Research Notes
- **Codeforces virtual contests**: User clicks "Virtual participation", gets a personal timer, submissions are tracked separately from official standings
- **Leaderboard freeze**: DOMjudge and CMS both support this. Implementation: store all submissions but filter the displayed rankings at the freeze time
- **Upsolving**: After contest ends, problems become visible in "practice" mode. Submissions are tagged as upsolving, not counted in official results

---

## Category: Judge High Concurrency

### Table Stakes
| Feature | Description | Complexity | Dependencies |
|---------|-------------|------------|--------------|
| **FJCPW**: Configurable worker pool | Worker count configurable via env var, auto-detect CPU cores | LOW | Judge Worker |
| **FJCMON**: Queue monitoring | API endpoint showing queue depth, active judges, wait times | MEDIUM | Redis Streams |
| **FJCPR**: Priority submissions | Contest submissions get priority in queue over regular submissions | MEDIUM | Redis Streams |

### Differentiators
| Feature | Description | Complexity |
|---------|-------------|------------|
| **FJCAU**: Auto-scaling hints | API monitors queue depth, logs warnings when capacity is exceeded | LOW |
| **FJCBW**: Batch acknowledgment | ACK multiple completed submissions at once for efficiency | LOW |

### Anti-features
- **Kubernetes-based scaling**: Overkill for educational institution scale
- **Judge federation**: Cross-institution judge sharing — not needed

### Research Notes
- DOMjudge scales by running multiple judge daemons on separate machines, all connecting to the same Redis/DB
- CMS (IOI Contest Management System) uses a similar pattern with work stealing
- Current architecture already supports this — just need to run more judge-worker processes
- Key bottleneck is likely PostgreSQL test_case lookups, not the judging itself

---

## Category: Backend Fault Tolerance

### Table Stakes
| Feature | Description | Complexity | Dependencies |
|---------|-------------|------------|--------------|
| **FBFCB**: Circuit breaker | Circuit breaker for external dependencies (Redis, judge callbacks) | MEDIUM | API |
| **FBFRT**: Configurable retry policies | Exponential backoff with jitter for all retry-able operations | LOW | API |
| **FBFDL**: DLQ monitoring | Dashboard for dead letter queue items, manual retry capability | MEDIUM | Redis Streams |
| **FBFHR**: Graceful shutdown | Drain in-flight requests before shutting down, don't accept new ones | LOW | Axum |

### Differentiators
| Feature | Description | Complexity |
|---------|-------------|------------|
| **FBFSA**: Submission audit trail | Every state transition logged (pending→judging→completed/failed), queryable | MEDIUM |
| **FBFHB**: Health dashboard | Real-time system health (DB connections, Redis, queue depth, active judges) | LOW |

### Anti-features
- **Chaos engineering**: Not appropriate for educational platform
- **Multi-region failover**: Not needed

### Research Notes
- Axum's `tokio::signal` handles graceful shutdown via `axum::serve().with_graceful_shutdown()`
- Circuit breaker: use `tower` middleware layer or implement a simple state machine (Closed → Open → Half-Open)
- Current DLQ implementation exists but has no monitoring UI

---

## Category: Data Migration from UOJ

### Table Stakes (One-Time)
| Feature | Description | Complexity | Dependencies |
|---------|-------------|------------|--------------|
| **FMRSC**: Schema mapping | Map UOJ MySQL tables → AlgoMaster PostgreSQL tables | MEDIUM | Both schemas |
| **FMRDT**: Data type conversion | MySQL TINYINT/MEDIUMTEXT/DATETIME → PostgreSQL equivalents | MEDIUM | FMRSC |
| **FMRRU**: User migration | Map UOJ users to AlgoMaster users with role mapping | LOW | FMRSC |
| **FMRPB**: Problem migration | Migrate problems + test cases, convert format | MEDIUM | FMRSC |
| **FMRSB**: Submission migration | Migrate historical submissions with result data | HIGH | FMRSC |
| **FMRBL**: Blog migration | Migrate blog posts and comments | LOW | FMRSC |

### Key Mapping Challenges

| UOJ (MySQL) | AlgoMaster (PostgreSQL) | Challenge |
|-------------|------------------------|-----------|
| `users` (varchar username) | `users` (UUID-based) | Need ID mapping table |
| `problems` (int ID) | `problems` (UUID) | Need ID mapping table |
| `submissions` (int ID) | `submissions` (UUID) | Need ID mapping table |
| `best_ac_submissions` | Leaderboard computed | Different ranking model |
| `blogs` | `blog_*` tables | Schema structure differs |
| No tenant concept | Multi-tenant (school_id) | All migrated data → default org |

### Anti-features
- **Bidirectional sync**: Migration is one-way, one-time
- **Live migration**: System can be down during migration

### Research Notes
- Source: `references/app_uoj233.sql` (MySQL 5.7, utf8mb4)
- Recommended approach: CLI tool that reads MySQL dump, transforms, writes to PostgreSQL via SQLx
- All migrated data assigned to a default organization
- User passwords cannot be migrated (different hashing) — users reset passwords on first login
- Incremental migration not needed — this is a one-time batch operation

---

## Feature Summary

| Category | Table Stakes | Differentiators | Anti-features |
|----------|-------------|-----------------|---------------|
| Problem Import/Export | 4 | 2 | 2 |
| User Import/Export | 4 | 0 | 2 |
| Contest Enhancement | 4 | 4 | 3 |
| Judge Concurrency | 3 | 2 | 2 |
| Backend Fault Tolerance | 4 | 2 | 2 |
| Data Migration | 6 | 0 | 2 |
| **Total** | **25** | **10** | **13** |

### Dependency Graph
```
Problem Import/Export ← Problem CRUD (existing)
User Import/Export ← User CRUD (existing)
Contest Enhancement ← Contest + Submissions + Leaderboard (existing)
Judge Concurrency ← Judge Worker + Redis Streams (existing)
Fault Tolerance ← API + Redis (existing)
Data Migration ← All schemas (existing)
```

### Recommended Priority
1. Data Migration (one-time, unblocks user adoption)
2. Judge Concurrency (infrastructure reliability)
3. Backend Fault Tolerance (system resilience)
4. Contest Enhancement (user-facing features)
5. Problem Import/Export (admin productivity)
6. User Import/Export (admin productivity)
