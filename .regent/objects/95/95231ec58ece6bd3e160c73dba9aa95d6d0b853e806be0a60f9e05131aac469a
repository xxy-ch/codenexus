---
phase: 10
plan: 05
subsystem: domain-users
tags: [auth, password-migration, md5, bcrypt, security]
dependency_graph:
  requires: [10-02]
  provides: [MD5-to-bcrypt transparent upgrade in production login]
  affects: [domain-users, api]
tech_stack:
  added: [md-5 0.11, tracing 0.1 (domain-users)]
  patterns: [prefix-based password hash migration, transparent upgrade on login]
key_files:
  created: []
  modified:
    - domain-users/Cargo.toml
    - domain-users/src/service.rs
    - Cargo.lock
decisions:
  - "D-10-2: Transparent MD5->bcrypt migration with {MD5} prefix marker on first login"
  - "Extract verify_md5_password as standalone function for testability"
  - "Use iter().map(|b| format!(\"{:02x}\", b)).collect() for hex encoding (md-5 0.11 Array type lacks LowerHex)"
metrics:
  duration: 3min
  tasks: 1
  files: 3
  completed: "2026-04-18"
---

# Phase 10 Plan 05: Transparent MD5-to-bcrypt Password Upgrade Summary

Transparent MD5-to-bcrypt password hash upgrade in the domain-users login flow, implementing D-10-2 production code change.

## What Changed

**domain-users/src/service.rs** -- The `login` method now detects `{MD5}`-prefixed password hashes. On first successful login with a legacy MD5 hash, the password is re-hashed with bcrypt and the database row is updated in-place. The user receives a valid session immediately. Error messages are identical for both MD5 and bcrypt failures ("Invalid credentials").

**domain-users/Cargo.toml** -- Added `md-5 = "0.11"` and `tracing = "0.1"` dependencies.

**Key function: `verify_md5_password`** -- Extracted as a standalone testable helper that computes MD5 digest of the plaintext password and compares against the stored hash (without the `{MD5}` prefix).

## Tests

4 unit tests added, all passing:
- `verify_md5_password_correct` -- known MD5 hash match
- `verify_md5_password_wrong` -- wrong password mismatch
- `verify_md5_password_empty_string` -- empty password with correct MD5("")
- `verify_md5_password_empty_hash_mismatch` -- empty password with wrong hash

## Verification Results

- `cargo build -p domain-users` -- PASSED
- `cargo test -p domain-users --lib` -- 4/4 PASSED
- `cargo clippy -p domain-users` -- PASSED (zero warnings)
- `cargo build --workspace` -- PASSED (all crates compile)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] md-5 0.11 Array type lacks LowerHex trait**
- **Found during:** Task 1 (build)
- **Issue:** `format!("{:x}", digest)` fails because `md5::Md5::digest()` returns a `hybrid_array::Array` that does not implement `LowerHex`
- **Fix:** Changed to `digest.iter().map(|b| format!("{:02x}", b)).collect()` for explicit byte-level hex encoding
- **Files modified:** domain-users/src/service.rs
- **Commit:** 50353a8

## Known Stubs

None.

## Threat Flags

None. No new network endpoints or auth paths introduced. The login endpoint already existed; this modifies its internal password verification logic only.

## Self-Check: PASSED

- FOUND: domain-users/Cargo.toml
- FOUND: domain-users/src/service.rs
- FOUND: Cargo.lock
- FOUND: 10-05-SUMMARY.md
- FOUND: commit 50353a8
