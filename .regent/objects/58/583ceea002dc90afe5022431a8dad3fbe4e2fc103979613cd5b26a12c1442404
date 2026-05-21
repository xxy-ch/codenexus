# Code Review Standard

This is the mandatory review rule set for the production-convergence program.

## Stop-Ship Rules

Any of the following is a stop-ship finding:

- a write path checks only login and not role/ownership/tenant
- a student-facing or normal-user-facing path exposes hidden test data or expected answers
- a worker or backend service call uses ordinary user auth instead of service auth
- a frontend save action reports success without a real persisted backend contract
- a runtime-critical security implementation exists only in dead code or unhooked branches
- a new change reintroduces `admin / teacher / user` runtime role branching
- a phase claims production readiness without verification evidence

## Required Review Angles

Every relevant review must check:

1. authorization
2. tenant boundaries
3. data exposure
4. runtime reachability
5. contract consistency
6. test coverage on the changed critical path
7. documentation truthfulness

## Review Checkpoints

### R0 Plan Review

Before P0 starts:

- phase order approved
- hard garbage list approved
- canonical role and tenant intent recorded

### R1 Garbage Purge Review

After P0:

- deleted files were either hard garbage or dead entry points
- no live route, live page, or live contract was removed by mistake

### R2 Identity / Tenant Review

After P1:

- JWT, frontend, backend, and shared models agree on role names
- tenant rules are enforced in backend path selection and write checks

### R3 Security Review

After P2 and P3:

- hidden data protection proven
- worker callback auth proven
- sandbox execution path proven

### R4 Business Domain Review

After P4, P5, and P6:

- teaching, contest, community, messaging, and search flows obey role and tenant rules
- no fake-success UI remains

### R5 Release Review

Before production release:

- runbook matches reality
- acceptance checklist matches reality
- all required gates are green

## Evidence Requirement

No review is accepted without evidence.

Evidence may include:

- command output summaries
- targeted test results
- route inventory
- contract diffs
- screenshots for frontend route changes

## PR Scope Guidance

- one PR should close one clear concern
- avoid mixing backend security, frontend refactor, and doc rewrites in one PR unless they are inseparable
- if a PR touches auth, tenanting, worker callback, or sandboxing, keep it especially small
