# Phase 2: Basic CI + Domain Extraction — Core (Users, Problems) - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish a basic CI pipeline (GitHub Actions) to protect refactoring work, then extract the two foundational domain modules (`users` and `problems`) into separate workspace crates. The API binary continues to serve identical endpoints but mounts routers from the new domain crates.

**In scope:**
- GitHub Actions CI workflow (Rust + Frontend)
- Extract `api/src/users/` → `domain-users/` workspace crate
- Extract `api/src/problems/` → `domain-problems/` workspace crate
- API binary re-exports routers from domain crates

**Not in scope:**
- Other domain extractions (community, search, submissions, contests, classes, leaderboard)
- Docker image builds, Codex review
- Dead code cleanup, CORS fixes, Redis pooling
- New features or API endpoint changes
</domain>

<decisions>
## Implementation Decisions

### CI Pipeline
- **D-01:** Combined workflow — single YAML file with separate parallel jobs for Rust (fmt + clippy + test) and Frontend (npm ci + lint + vitest + build)
- **D-02:** Triggers on every push to any branch AND on every pull request
- **D-03:** Clippy strictness: deny warnings (`cargo clippy -- -D warnings`) — all warnings treated as errors

### Crate Naming
- **D-04:** `domain-*` prefix for all extracted crates — `domain-users`, `domain-problems`, etc. Sets the convention for all 8 domain modules across Phases 2-4

### Crate Internal Structure
- **D-05:** Mirror current mod/routes/models/service pattern as-is during extraction — no internal restructuring, just move files
- **D-06:** Cross-domain dependencies route through `api-infra` traits — no direct domain-to-domain crate dependency. The `users → auth::JwtService` dependency is handled via a trait defined in `api-infra`

### Verification
- **D-07:** CI-only verification — if `cargo build --workspace`, `cargo test --workspace`, and `cargo clippy` all pass, the extraction is considered verified

### Claude's Discretion
- Exact GitHub Actions YAML structure and job configuration
- Rust toolchain version pinning
- How to wire AppState/extractors from api-infra into domain crates
- Specific trait design for JwtService abstraction in api-infra
- Whether problems module's access control files (access.rs, problem_access.rs) become sub-modules or stay flat

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Planning
- `.planning/ROADMAP.md` Phase 2 section — scope, requirements, success criteria
- `.planning/REQUIREMENTS.md` — CICD-01, CICD-02, CICD-03, ARCH-04 (partial), ARCH-05 (partial)
- `.planning/phases/01-architecture-foundation-secret-management/01-VALIDATION.md` — Phase 1 validation strategy, api-infra structure

### Codebase Reference
- `.planning/codebase/STRUCTURE.md` — full file/directory structure (users: ~820 lines, problems: ~1000 lines)
- `.planning/codebase/CONVENTIONS.md` — established patterns, naming, module organization

### Existing Code (extraction sources)
- `api/src/users/` — mod.rs, models.rs, routes.rs, service.rs
- `api/src/problems/` — mod.rs, models.rs, routes.rs, service.rs, test_cases.rs, access.rs, problem_access.rs
- `api/src/main.rs` — current router assembly (lines 160-161: `.nest("/users", ...)` and `.nest("/problems", ...)`)
- `api/src/lib.rs` — current AppState definition

### Cross-Domain Dependencies (verified)
- Users → `auth::JwtService` (api/src/users/service.rs:2)
- Users → `AppState`, `AppError`, `AuthExtractor` (routes.rs — → api-infra)
- Problems → `AppState`, `AuthExtractor` (mod.rs, routes.rs, test_cases.rs, access.rs — → api-infra)
- Problems has no cross-domain service dependencies

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api-infra` crate (from Phase 1): AppState, AppConfig, AppError, middleware, extractors, WebSocket server
- Repository trait interfaces defined in `api-infra/src/traits/` (ARCH-02 from Phase 1)
- Test infrastructure with testcontainers (ARCH-06 from Phase 1)
- `shared/` crate: Role enum, Permission enum, Claims struct

### Established Patterns
- Module-per-domain: mod.rs (re-exports) + models.rs + routes.rs + service.rs
- Router functions: `user_router()`, `problems_router()` returning `Router<AppState>`
- Service layer returns `anyhow::Result<T>`, routes convert via `?`
- Inline role checks via `ensure_admin()` and middleware extractors

### Integration Points
- `api/src/main.rs:160-161` — router nesting (change from local module to domain crate re-export)
- `Cargo.toml` workspace root — add `domain-users`, `domain-problems` to workspace members
- `api/Cargo.toml` — add dependencies on `domain-users`, `domain-problems`
- Domain crates depend on `api-infra` for shared types and `shared` for domain models

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for CI and domain extraction.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 02-basic-ci-domain-extraction-core-users-problems*
*Context gathered: 2026-04-14*
