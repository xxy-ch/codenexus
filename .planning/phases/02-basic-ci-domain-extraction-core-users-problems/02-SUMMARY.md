---
phase: "02"
plan: "02"
name: "Extract Users and Problems Domain Crates"
status: complete
executor: orchestrator
date: 2026-04-20
---

## Objective
Extract `users` and `problems` domain modules into independent workspace crates (`domain-users`, `domain-problems`).

## Outcome
**Already complete.** The extraction was accomplished during subsequent phases (04-10) which rebuilt the entire crate structure. The domain crates now exist and are fully integrated:

- `backend/domain-users/` — models.rs, routes.rs, service.rs, lib.rs
- `backend/domain-problems/` — models.rs, routes.rs, access.rs, problem_access.rs, test_cases.rs, lib.rs

Both crates depend on `api-infra` for shared infrastructure (AppState, AuthExtractor, middleware). The API crate imports routers from these domain crates. Full workspace build passes.

## Key Files

### Created (verified existing)
- `backend/domain-users/Cargo.toml`
- `backend/domain-users/src/lib.rs`
- `backend/domain-users/src/models.rs`
- `backend/domain-users/src/routes.rs`
- `backend/domain-users/src/service.rs`
- `backend/domain-problems/Cargo.toml`
- `backend/domain-problems/src/lib.rs`
- `backend/domain-problems/src/models.rs`
- `backend/domain-problems/src/routes.rs`

### Modified (verified)
- `backend/api/Cargo.toml` — depends on domain-users, domain-problems
- `backend/api/src/main.rs` — imports routers from domain crates
- `backend/api-infra/src/lib.rs` — exports shared types

## Deviations
- The original plan called for defining `TokenService` trait and moving `AppState` to `api-infra`. This was done as part of Phase 1 (architecture foundation) instead.
- `test_cases.rs` and `access.rs` in domain-problems were added beyond the original plan scope, driven by Phase 5+ security requirements.

## Self-Check: PASSED
- [x] domain-users crate exists and compiles
- [x] domain-problems crate exists and compiles
- [x] API imports routers from domain crates
- [x] Full workspace `cargo build` passes
- [x] No duplicate modules between api/ and domain-*/
