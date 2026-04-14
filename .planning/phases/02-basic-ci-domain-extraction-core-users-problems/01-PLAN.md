---
wave: 1
depends_on: []
files_modified:
  - rust-toolchain.toml
  - .github/workflows/ci.yml
autonomous: true
requirements:
  - CICD-01
  - CICD-02
  - CICD-03
---

# Plan 01: GitHub Actions CI Pipeline

<objective>
Create a GitHub Actions CI workflow that runs on every push and pull request. The workflow has two parallel jobs: Rust (fmt + clippy + test) and Frontend (npm ci + lint + vitest + build). Rust compilation is cached via Swatinem/rust-cache. A `rust-toolchain.toml` at workspace root pins the Rust version for reproducibility.
</objective>

<threat_model>
- **LOW**: CI configuration only -- does not change application code or security behavior.
- **LOW**: No secrets are exposed in CI. DATABASE_URL uses a dummy value for compile-time checks only; no actual database is connected.
- **LOW**: `rust-toolchain.toml` pins toolchain to prevent supply-chain drift in CI.
</threat_model>

<must_haves>
- [ ] Pushing to any branch or PR triggers the CI workflow
- [ ] Rust job runs `cargo fmt --check --all`, `cargo clippy -- -D warnings`, and `cargo test --workspace`
- [ ] Frontend job runs `npm ci`, `npm run lint`, `npm run test -- --run`, and `npm run build`
- [ ] Rust cache via Swatinem/rust-cache reduces rebuild time

## Tasks

### Task T2-01: Create rust-toolchain.toml

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/Cargo.toml (workspace root, verify no existing toolchain file)
</read_first>

<action>
1. Create `/Users/xiexingyu/Documents/项目/Online_Judge/rust-toolchain.toml` with these exact contents:

```toml
[toolchain]
channel = "1.90.0"
components = ["rustfmt", "clippy"]
```

This pins the Rust toolchain to match the local development version (1.90.0 stable) and ensures the required components (rustfmt, clippy) are always available in CI.
</action>

<acceptance_criteria>
- `cat /Users/xiexingyu/Documents/项目/Online_Judge/rust-toolchain.toml` contains `channel = "1.90.0"`
- `cat /Users/xiexingyu/Documents/项目/Online_Judge/rust-toolchain.toml` contains `components = ["rustfmt", "clippy"]`
- `rustup show active-toolchain` (run from project root) returns a line containing `1.90.0`
</acceptance_criteria>

### Task T2-02: Create GitHub Actions CI workflow

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/Cargo.toml (workspace members list, workspace dependencies)
- /Users/xiexingyu/Documents/项目/Online_Judge/frontend/package.json (scripts section for lint/test/build commands)
- /Users/xiexingyu/Documents/项目/Online_Judge/frontend/package-lock.json (must exist for `npm ci`)
</read_first>

<action>
1. Create the directory `.github/workflows/` if it does not exist:
```bash
mkdir -p .github/workflows
```

2. Create `.github/workflows/ci.yml` with these exact contents:

```yaml
name: CI

on:
  push:
    branches: ['*']
  pull_request:
    branches: ['*']

env:
  CARGO_TERM_COLOR: always
  SQLX_OFFLINE: true

jobs:
  rust:
    name: Rust (fmt + clippy + test)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt, clippy

      - uses: Swatinem/rust-cache@v2
        with:
          key: "${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}"

      - name: Install system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y libssl-dev pkg-config

      - name: Check formatting
        run: cargo fmt --check --all

      - name: Clippy
        run: cargo clippy --all-targets -- -D warnings
        env:
          DATABASE_URL: postgres://dummy:dummy@localhost/dummy

      - name: Run tests
        run: cargo test --workspace
        env:
          DATABASE_URL: postgres://dummy:dummy@localhost/dummy

  frontend:
    name: Frontend (lint + test + build)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npx vitest --run

      - name: Build
        run: npm run build
```

Key design decisions:
- `SQLX_OFFLINE: true` at the top-level env ensures sqlx compile-time checks do not require a live database. The codebase uses runtime-checked `query_as::<_, T>()` patterns in users and problems modules (not `query!` macros), so this is safe for those modules. Other modules that may use `query!` macros will need `.sqlx/` offline data prepared in a later phase -- for now, the env var prevents CI failures.
- Note: `npm run lint` currently only lints a subset of source files (specific services, components, and admin pages per `package.json` scripts section). Full-project linting is a separate improvement outside Phase 2 scope.
- `DATABASE_URL` is set to a dummy value because sqlx's `migrate!()` macro and some compile-time checks require it present, even with `SQLX_OFFLINE=true`.
- `cargo clippy --all-targets -- -D warnings` treats all warnings as errors per decision D-03.
- Frontend uses `npx vitest --run` instead of `npm run test` to ensure non-watch mode (the default npm script may run in watch mode).
- Both jobs run in parallel (no dependency between them).
- Triggers on every push to any branch AND every pull request per decision D-02.
</action>

<acceptance_criteria>
- `test -f .github/workflows/ci.yml` returns 0 (file exists)
- `grep "Swatinem/rust-cache@v2" .github/workflows/ci.yml` returns a match
- `grep "cargo fmt --check" .github/workflows/ci.yml` returns a match
- `grep "cargo clippy" .github/workflows/ci.yml` returns a match
- `grep "cargo test --workspace" .github/workflows/ci.yml` returns a match
- `grep "npm ci" .github/workflows/ci.yml` returns a match
- `grep "npx vitest --run" .github/workflows/ci.yml` returns a match
- `grep "npm run build" .github/workflows/ci.yml` returns a match
- `grep "SQLX_OFFLINE: true" .github/workflows/ci.yml` returns a match
- YAML is valid: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` exits 0
</acceptance_criteria>

### Task T2-03: Verify CI configuration locally

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/.github/workflows/ci.yml (just created)
- /Users/xiexingyu/Documents/项目/Online_Judge/rust-toolchain.toml (just created)
</read_first>

<action>
1. Run the Rust checks that CI will run, to confirm they pass locally before pushing:

```bash
cargo fmt --check --all
```

If this fails, run `cargo fmt --all` to fix formatting, then re-check.

2. Run clippy check:

```bash
DATABASE_URL=postgres://dummy cargo clippy --all-targets -- -D warnings 2>&1 | tail -20
```

Note: clippy may produce warnings from modules outside the Phase 2 scope. Record the exit code. If it is non-zero due to pre-existing issues, document them in the verification section -- do NOT fix them in this plan (SEC-04 in Phase 5 addresses dead code/unused imports).

3. Run workspace tests:

```bash
DATABASE_URL=postgres://dummy cargo test --workspace 2>&1 | tail -30
```

Note: Tests that require a database (`#[ignore]` attribute) will be skipped. That is expected.

4. Run frontend checks:

```bash
cd frontend && npm ci && npm run lint && npx vitest --run && npm run build
```

5. Record the results of each command. If all pass (or only pre-existing failures), CI is ready.
</action>

<acceptance_criteria>
- `cargo fmt --check --all` exits 0
- `cargo test --workspace` exits 0 (ignored tests are acceptable)
- Frontend `npm run build` exits 0
- Frontend `npx vitest --run` exits 0
</acceptance_criteria>

## Verification

<verify>
```bash
# 1. Toolchain file exists and is valid
cat rust-toolchain.toml
# Must show channel = "1.90.0"

# 2. CI workflow file exists and is valid YAML
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"

# 3. CI workflow has required elements
grep "Swatinem/rust-cache" .github/workflows/ci.yml
grep "cargo fmt --check" .github/workflows/ci.yml
grep "cargo clippy" .github/workflows/ci.yml
grep "cargo test --workspace" .github/workflows/ci.yml
grep "npm ci" .github/workflows/ci.yml
grep "npx vitest --run" .github/workflows/ci.yml
grep "npm run build" .github/workflows/ci.yml

# 4. Local Rust checks pass
cargo fmt --check --all
DATABASE_URL=postgres://dummy cargo test --workspace

# 5. Local Frontend checks pass
cd frontend && npm ci && npx vitest --run && npm run build
```
</verify>
