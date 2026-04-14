# Phase 2: Basic CI + Domain Extraction — Core (Users, Problems) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 02-basic-ci-domain-extraction-core-users-problems
**Areas discussed:** CI Pipeline Structure, Domain Crate Naming, Crate Internal Structure, Extraction Verification

---

## CI Pipeline Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Combined | One YAML with separate parallel jobs for Rust and Frontend | ✓ |
| Separate workflows | Separate rust-ci.yml and frontend-ci.yml | |
| PRs only | Combined but only runs on PRs to main | |

**User's choice:** Combined workflow
**Notes:** Simpler to manage, single place to update, both jobs run in parallel.

**Follow-up: CI trigger scope**

| Option | Description | Selected |
|--------|-------------|----------|
| Push + PR | Every push to any branch AND every PR | ✓ |
| PRs only | Only on pull_request events | |

**User's choice:** Push + PR

**Follow-up: Clippy strictness**

| Option | Description | Selected |
|--------|-------------|----------|
| Deny warnings | cargo clippy -- -D warnings | ✓ |
| Warnings only | cargo clippy without -D | |
| Deny for new crates | Strict only for new domain crate code | |

**User's choice:** Deny warnings

---

## Domain Crate Naming

| Option | Description | Selected |
|--------|-------------|----------|
| domain-* | domain-users, domain-problems — clear prefix, distinguishes from shared/api-infra | ✓ |
| oj-* | oj-users, oj-problems — shorter, project-prefixed | |
| No prefix | users, problems — simplest, risk of crate.io collisions | |

**User's choice:** domain-* prefix
**Notes:** Sets the convention for all 8 domain modules extracted across Phases 2-4.

---

## Crate Internal Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror current | Keep mod/routes/models/service as-is — minimal change | ✓ |
| Subdirectory layout | src/{routes,models,services,repo}/ — more structured | |
| Decompose service | Split service.rs into finer-grained files — cleanest but most work | |

**User's choice:** Mirror current pattern
**Notes:** Minimal change during extraction. Can restructure later when crate boundaries are stable.

**Follow-up: Cross-domain dependency handling**

| Option | Description | Selected |
|--------|-------------|----------|
| Via api-infra traits | JwtService abstraction through trait in api-infra — no domain-to-domain coupling | ✓ |
| Direct crate dependency | Users crate depends directly on auth crate — simpler but more coupling | |

**User's choice:** Via api-infra traits
**Notes:** Users → auth::JwtService is the only cross-domain service dependency. All other deps (AppState, AppError, AuthExtractor) already route through api-infra.

---

## Extraction Verification

| Option | Description | Selected |
|--------|-------------|----------|
| CI-only | cargo build + test + clippy passing is sufficient verification | ✓ |
| CI + manual smoke test | Plus manual endpoint testing against running server | |
| CI + contract tests | Plus automated API contract comparison suite | |

**User's choice:** CI-only
**Notes:** Relies on existing test coverage plus CI gates. Simplest approach appropriate for infrastructure refactoring.

---

## Claude's Discretion

- Exact GitHub Actions YAML structure and job configuration
- Rust toolchain version pinning
- How to wire AppState/extractors from api-infra into domain crates
- Specific trait design for JwtService abstraction in api-infra
- Whether problems module's access control files become sub-modules or stay flat

## Deferred Ideas

None — discussion stayed within phase scope.
