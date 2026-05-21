# Phase 5 Plan 02 Summary — SEC-04 Dead Code Elimination

## What was done

### Task 1: Delete dead re-export shims
Removed orphaned re-export files left over from domain extraction:
- `api/src/middleware/rbac/` — empty re-export directory
- `api/src/middleware/authz.rs` — dead shim pointing to removed module
- `api/src/middleware/permission.rs` — dead shim pointing to removed module

### Task 2: Clean remaining clippy warnings
- `api/src/middleware/auth.rs` — removed `#![allow(unused_imports, dead_code)]` annotation that was suppressing legitimate warnings
- `api/src/middleware/tenant.rs` — removed unused `extract::Request` import; moved `TENANT_HEADER` const into test module
- `domain-contests/src/service.rs` — removed unused `param_count += 1` assignment (the `is_active` branch uses inline SQL, not parameterized bindings)

## Verification
- `cargo clippy --workspace -- -D warnings` — zero warnings
- `cargo test --workspace` — 66 tests pass, 1 pre-existing env-dependent failure in `api-infra` config tests
- Zero `#[allow(dead_code)]` / `#[allow(unused_imports)]` annotations remain in api/, api-infra/, or domain-* crates
- Remaining annotations in `judge-worker/` are out of scope for this phase
