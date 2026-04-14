---
wave: 3
depends_on: [02-PLAN]
files_modified:
  - .github/workflows/ci.yml
autonomous: true
requirements:
  - CICD-01
  - CICD-02
  - CICD-03
  - ARCH-04
  - ARCH-05
---

# Plan 03: Final Verification + Clippy Cleanup

<objective>
Run the complete verification suite against the workspace after all extractions are complete. Fix any clippy warnings introduced by the extraction work. Confirm that the CI workflow file is valid and that the local verification commands mirror what CI will run. Update the phase validation status.
</objective>

<threat_model>
- **LOW**: This plan only runs verification commands and fixes minor lint issues. No architectural or security changes.
- **LOW**: Clippy fixes may touch code but are restricted to warning elimination (unused imports, dead code annotations), not behavioral changes.
</threat_model>

<must_haves>
- [ ] `cargo build --workspace` succeeds
- [ ] `cargo test --workspace` passes
- [ ] `cargo clippy --all-targets -- -D warnings` passes with zero warnings
- [ ] `cargo fmt --check --all` passes
- [ ] `cargo build -p domain-users -p domain-problems` succeeds independently
- [ ] No circular dependencies between domain crates and api crate
- [ ] CI workflow `.github/workflows/ci.yml` is valid YAML and reflects local verification commands
</must_haves>

## Tasks

### Task T2-10: Full workspace build verification

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/Cargo.toml (verify workspace members include domain-users, domain-problems)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs (verify router assembly uses domain crate routers)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/lib.rs (verify mod users and mod problems removed)
</read_first>

<action>
1. Run the complete build verification sequence:

```bash
# Independent domain crate compilation
cargo build -p domain-users
cargo build -p domain-problems

# Full workspace build (includes api, api-infra, judge-worker, shared)
cargo build --workspace

# API crate specifically (assembles all routers)
cargo build -p api
```

2. If any build fails, investigate and fix. Common issues:
   - Missing `pub` visibility on types that domain crates need from api-infra
   - Import path typos in domain crate files
   - Missing workspace dependency in domain crate Cargo.toml

3. Verify the workspace member count is 6:
```bash
cargo metadata --format-version 1 | python3 -c "import sys,json; d=json.load(sys.stdin); print([p['name'] for p in d['packages'] if p['name'] in ['shared','api-infra','judge-worker','domain-users','domain-problems','api']])"
```

Expected output includes all 6 crate names.
</action>

<acceptance_criteria>
- `cargo build -p domain-users` exits 0
- `cargo build -p domain-problems` exits 0
- `cargo build --workspace` exits 0
- `cargo build -p api` exits 0
</acceptance_criteria>

### Task T2-11: Full test suite + clippy + fmt verification

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/middleware/auth.rs (AuthExtractor -- verify tests exist)
- /Users/xiexingyu/Documents/项目/Online_Judge/domain-problems/src/access.rs (access control tests -- verify they run in new crate)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/auth/jwt_service.rs (TokenService tests -- verify they run)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/middleware/auth.rs (auth middleware tests -- verify they run)
</read_first>

<action>
1. Run the full test suite:
```bash
DATABASE_URL=postgres://dummy cargo test --workspace
```

All tests must pass (except `#[ignore]` tests that require a database). Record the test count.

2. Run clippy with deny-warnings:
```bash
DATABASE_URL=postgres://dummy cargo clippy --all-targets -- -D warnings
```

If clippy produces warnings, fix them. Common extraction-related warnings:
- `unused import` -- remove imports that were needed in the old location but not the new one
- `dead code` -- add `#[allow(dead_code)]` or `pub` visibility as appropriate
- `unused variable` -- prefix with `_`

3. Run format check:
```bash
cargo fmt --check --all
```

If this fails, run `cargo fmt --all` to fix.

4. Verify specific test suites pass:
```bash
# Access control tests in domain-problems
cargo test -p domain-problems access

# JwtService + TokenService tests in api
cargo test -p api jwt

# Auth middleware tests
cargo test -p api middleware

# Auth route tests
cargo test -p api auth
```

5. If any test fails due to the extraction changes, investigate and fix. The fix must be in the same task -- do not defer.
</action>

<acceptance_criteria>
- `cargo test --workspace` exits 0
- `cargo clippy --all-targets -- -D warnings` exits 0
- `cargo fmt --check --all` exits 0
- `cargo test -p domain-problems access` exits 0
- `cargo test -p api jwt` exits 0
</acceptance_criteria>

### Task T2-12: Verify CI workflow reflects final state

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/.github/workflows/ci.yml (CI workflow created in Plan 01)
- /Users/xiexingyu/Documents/项目/Online_Judge/Cargo.toml (final workspace members list)
</read_first>

<action>
1. Verify the CI workflow `ci.yml` references the correct commands that match the local verification:

The CI workflow must include:
- `cargo fmt --check --all`
- `cargo clippy --all-targets -- -D warnings`
- `cargo test --workspace`
- Frontend: `npm ci`, `npx vitest --run`, `npm run build`

2. Verify the CI env vars are correct:
- `SQLX_OFFLINE: true` is set (prevents sqlx from needing a database)
- `DATABASE_URL` is set for clippy and test steps

3. Run the exact commands CI will run, in sequence:
```bash
cargo fmt --check --all
DATABASE_URL=postgres://dummy cargo clippy --all-targets -- -D warnings
DATABASE_URL=postgres://dummy cargo test --workspace
cd frontend && npm ci && npm run lint && npx vitest --run && npm run build
```

All must pass.

4. Validate the YAML one more time:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"
```
</action>

<acceptance_criteria>
- `cargo fmt --check --all` exits 0
- `DATABASE_URL=postgres://dummy cargo clippy --all-targets -- -D warnings` exits 0
- `DATABASE_URL=postgres://dummy cargo test --workspace` exits 0
- `cd frontend && npm run build` exits 0
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` exits 0
</acceptance_criteria>

### Task T2-13: Verify dependency graph has no cycles

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/Cargo.toml (workspace root)
- /Users/xiexingyu/Documents/项目/Online_Judge/domain-users/Cargo.toml
- /Users/xiexingyu/Documents/项目/Online_Judge/domain-problems/Cargo.toml
- /Users/xiexingyu/Documents/项目/Online_Judge/api/Cargo.toml
</read_first>

<action>
1. Verify the dependency graph is a DAG (directed acyclic graph) with the expected structure:

```
shared (no deps)
    |
api-infra (depends on shared)
   /     \
domain-users   domain-problems
(shared, api-infra)  (shared, api-infra)
   \     /
    api (depends on all above)
    |
judge-worker (depends on shared)
```

Run:
```bash
cargo tree -p domain-users 2>&1
cargo tree -p domain-problems 2>&1
```

Neither output should contain `api` (only `api-infra` and `shared`).

2. Verify api depends on both domain crates:
```bash
cargo tree -p api 2>&1 | grep "domain-"
```

Should show both `domain-users` and `domain-problems`.

3. Verify domain crates do NOT depend on each other:
```bash
cargo tree -p domain-users 2>&1 | grep "domain-problems" | wc -l  # should be 0
cargo tree -p domain-problems 2>&1 | grep "domain-users" | wc -l  # should be 0
```
</action>

<acceptance_criteria>
- `cargo tree -p domain-users | grep -c "api "` returns 0 (no dependency on api crate)
- `cargo tree -p domain-problems | grep -c "api "` returns 0 (no dependency on api crate)
- `cargo tree -p api | grep "domain-" | grep -c "domain-"` is >= 2 (api depends on both)
- `cargo tree -p domain-users | grep -c "domain-problems"` returns 0 (no cross-domain deps)
</acceptance_criteria>

## Verification

<verify>
```bash
# === Build ===
cargo build -p domain-users
cargo build -p domain-problems
cargo build --workspace

# === Tests ===
DATABASE_URL=postgres://dummy cargo test --workspace

# === Lint ===
cargo fmt --check --all
DATABASE_URL=postgres://dummy cargo clippy --all-targets -- -D warnings

# === Dependency graph ===
cargo tree -p domain-users 2>&1
cargo tree -p domain-problems 2>&1

# === CI YAML ===
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"

# === Frontend ===
cd frontend && npm ci && npx vitest --run && npm run build

# === Summary ===
echo "Phase 2 verification complete"
echo "Workspace crates: shared, api-infra, domain-users, domain-problems, api, judge-worker"
echo "CI workflow: .github/workflows/ci.yml"
echo "All checks passed"
```
</verify>
