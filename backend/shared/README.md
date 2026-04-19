# Shared Workspace

This folder is the shared control surface for the production-convergence program of `Online_Judge`.

Important filesystem note:

- the user-facing name for this workspace is `Shared`
- on this macOS filesystem, `Shared` and the existing Rust crate directory `shared` resolve to the same physical directory
- in git paths and commits, these files appear under `shared/`
- when talking to Claude Code, it is fine to say "read `Shared/README.md`", but when listing changed files for git or review, use the repository path `shared/...`

Codex is the lead reviewer and final approver.
Claude Code is a parallel implementation agent, with the primary parallel lane being frontend refactor and frontend contract alignment.
The user can dispatch Claude manually using the files in this folder. Claude should treat this folder as the canonical handoff surface, not as optional notes.

## Purpose

Use `Shared/` for:

- the execution roadmap
- per-phase briefs and summaries
- agent discussion notes
- review standards and release gates

Do not use `Shared/` for scratch text that has no owner, no phase, or no acceptance criteria.

## Folder Layout

- `Shared/README.md`
  - entry point for Codex, Claude Code, and the user
- `Shared/ROADMAP.md`
  - master production-convergence roadmap
- `Shared/PHASE-SUMMARY-TEMPLATE.md`
  - required template for every phase completion note
- `Shared/phases/`
  - one markdown file per phase, created before phase execution and updated at phase close
- `Shared/discussions/`
  - agent-to-agent notes, risk discussions, unresolved decisions
- `Shared/reviews/CODE-REVIEW-STANDARD.md`
  - review rules, stop-ship rules, and required review checkpoints

## Operating Model

### Roles

- `Codex`
  - owns the global plan
  - owns backend/security/auth/tenant/judge architecture decisions
  - reviews all Claude output before acceptance
  - decides whether a phase is complete
- `Claude Code`
  - owns the frontend refactor lane unless a phase brief says otherwise
  - may also take bounded parallel tasks listed in the active phase brief
  - must write a phase note before asking for review
- `User`
  - manually dispatches Claude Code
  - resolves business ambiguities when neither agent can derive the answer safely
  - approves final production rollout

### Non-Negotiable Rules

- No code changes without an active phase brief in `Shared/phases/`.
- No phase may start without a clearly named owner.
- No phase may close without a written summary using `Shared/PHASE-SUMMARY-TEMPLATE.md`.
- No frontend refactor is accepted until Codex reviews the resulting contract and runtime behavior.
- No auth/RBAC/tenant/judge/sandbox change is accepted without explicit verification evidence.
- No phase may carry unexplained red tests into the next phase.

## How Claude Code Should Work

Claude should read these files in this order:

1. `Shared/README.md` (`shared/README.md` in git)
2. `Shared/ROADMAP.md` (`shared/ROADMAP.md` in git)
3. `Shared/reviews/CODE-REVIEW-STANDARD.md` (`shared/reviews/CODE-REVIEW-STANDARD.md` in git)
4. the active phase brief in `Shared/phases/` (`shared/phases/` in git)

Claude should then:

1. restate the exact active phase scope
2. list the files it plans to change
3. implement only the tasks assigned to the Claude lane
4. run the required verification commands for that phase
5. write a phase summary or update the existing phase file
6. hand back to Codex for review

Claude should not:

- redefine the phase goal
- expand scope without writing it down in the phase file
- bypass the review standard
- merge backend security changes without Codex review

## Naming Conventions

### Phase brief files

Use:

`Shared/phases/PX-<short-name>.md`

Examples:

- `Shared/phases/P0-hard-garbage-purge.md`
- `Shared/phases/P1-auth-rbac-tenant.md`

### Discussion files

Use:

`Shared/discussions/YYYY-MM-DD-<phase>-<topic>-<agent>.md`

Examples:

- `Shared/discussions/2026-04-08-P1-role-contract-claude.md`
- `Shared/discussions/2026-04-08-P3-worker-auth-codex.md`

## Required Content For Every Phase File

Every active or completed phase file must include:

- phase goal
- scope in and scope out
- owner
- parallel lane ownership
- files to modify
- target architecture flow
- verification commands
- acceptance markers
- open risks
- review checkpoint status

## Execution Order

The canonical execution order is defined in `Shared/ROADMAP.md`.
If any agent proposes a different order, it must be written as a discussion note and reviewed before execution.

## Current Program Rule

This program explicitly allows:

- deleting hard garbage first
- temporary test red during the garbage-purge phase only

This program does not allow:

- deleting half-connected security or tenanting code before the replacement path is defined
- carrying vague technical debt into later phases with no owner
