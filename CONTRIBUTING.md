# Contributing to CodeNexus

Thank you for your interest in contributing to CodeNexus! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read and follow it in all interactions.

## How Can I Contribute?

### 1. Reporting Bugs

Bugs are tracked as GitHub issues. Before submitting a bug report, please check existing issues to make sure it hasn't already been reported. 

When creating a bug report, please use our **Bug Report Template** and include:
- A clear, descriptive title.
- Steps to reproduce the bug.
- Expected vs. actual behavior.
- Environment details (browser, OS, versions).

### 2. Suggesting Enhancements

We are always looking for ways to make CodeNexus more robust, performant, and beautiful. If you have an idea for an enhancement:
- Check existing issues to see if a similar proposal has been made.
- Use our **Feature Request Template** to outline your proposal, explaining the use case and implementation thoughts.

### 3. Submitting Pull Requests

We welcome pull requests! To ensure a smooth review process:
1. **Fork the repo** and create your branch from `master`.
2. **Implement your changes** following our coding and design guidelines.
3. **Verify all tests pass** (see [Testing Guidelines](#testing-guidelines) below).
4. **Run GitNexus change analysis** (see [GitNexus Integration](#gitnexus-integration) below).
5. **Open a PR** against the `master` branch using our Pull Request Template.

---

## Technical Stack & Guidelines

### Frontend (React + TypeScript + Tailwind CSS)
- **Vite** is used as the build tool.
- **Tailwind CSS v4** is used for styling.
- **Glassmorphism & Harmonious Palettes**: Always maintain modern, premium aesthetics with frosted glass blurs, HSL Tailored gradients, and clean responsive flexbox layouts. Avoid generic flat buttons and standard borders.
- **State Management**: Zustand and React Query are used for server-state synchronization.

### Backend (Rust + Axum + PostgreSQL + Redis)
- **Axum** is the web server framework.
- **SQLx** is used for type-safe database queries.
- **Security Sandboxing**: The `judge-worker` relies on native Linux kernel cgroups and a strict custom seccomp filter for sandboxing untrusted code execution.

---

## Testing Guidelines

Always run tests locally before committing changes.

### Frontend Tests
We use **Vitest** and **React Testing Library**.
```bash
# Go to frontend folder
cd frontend

# Run all unit and component tests once
npm run test:run

# Run in watch mode
npm run test
```

### Backend Tests
We use Rust's built-in cargo test infrastructure.
```bash
# Run unit and workspace tests
cargo test

# To run integration tests that require PostgreSQL/Redis/Docker, set up testcontainers or run via the CI
```

### Code Formatting & Linting
Ensure your code is clean and properly formatted.
```bash
# Frontend linting
npm run lint

# Backend formatting & linting
cargo fmt --all
cargo clippy --all-targets --all-features -- -D warnings
```

---

## GitNexus Integration

Our project uses **GitNexus** for code intelligence. If you modify functions, classes, or methods:
1. **Analyze symbol impact**: Run `npx gitnexus impact <symbolName>` to analyze caller blast radius and dependencies before making structural changes.
2. **Update the index**: After staging/committing your code changes, re-run `npx gitnexus analyze` to refresh the index.
