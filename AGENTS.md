<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Online_Judge** (8392 symbols, 17269 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/Online_Judge/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Online_Judge/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Online_Judge/clusters` | All functional areas |
| `gitnexus://repo/Online_Judge/processes` | All execution flows |
| `gitnexus://repo/Online_Judge/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->


<claude-mem-context>
# Memory Context

# [Online_Judge] recent context, 2026-05-15 10:44pm GMT+8

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (9,859t read) | 1,008,746t work | 99% savings

### Apr 8, 2026
270 6:30p 🟣 Add role-based authorization helpers for test case endpoints
271 6:31p 🟣 Implement role-based test case visibility for student/management views
272 " 🟣 Implement role-based test case visibility for student/management views
### Apr 9, 2026
203 8:01a 🔵 Repository exploration initiated
204 8:10a 🔵 Available tools identified
216 8:28a 🔵 Repository structure and production convergence program understood
239 8:41a 🔵 User initiated exploration of Shared code to understand repository context for role model work
### Apr 10, 2026
248 8:12a 🔵 User requested to examine Shared repository and run gitnexus
### Apr 11, 2026
262 8:11a 🔵 User requested to examine Shared repository and run gitnexus
### Apr 14, 2026
325 8:00a 🔵 Available Tools Queried in Online Judge Project
326 8:01a 🔵 GSD Discuss Mode Configuration Checked
327 " 🔵 GSD Discuss-Phase Workflow Documentation Reviewed
328 " 🔵 GSD Phase 2 Initialization Completed
329 " 🔵 Online Judge PROJECT.md System Overview Reviewed
330 " 🔵 Online Judge REQUIREMENTS.md Phase 2 Mapping Reviewed
331 " 🔵 Online Judge STATE.md Shows Phase 2 Ready to Begin
324 " ✅ GSD Phase 2 Discussion Initiated
332 " 🔵 GSD Phase 2 Scope and Requirements Reviewed
333 8:02a 🔵 No Prior Phase Context Found for GSD Phase 2
378 5:02p 🔵 WebSocketServer struct located in api-infra
386 5:21p 🔵 Discovered Online Judge project workspace structure
403 5:29p 🔵 Blog module structure discovered
### Apr 17, 2026
385 8:04a ✅ No new work observed in primary session
### Apr 18, 2026
427 1:59p ⚖️ Phase 9 Rereview Task Creation
455 2:13p 🔵 Discovered user migration cross-tenant protection logic
### Apr 21, 2026
470 8:10a 🔵 User requested GSD phase 2 discussion
479 8:15a ✅ System status review indicates continued blocking issues
S193 Session started (Apr 21 at 8:06 PM)
S194 Session started (Apr 21 at 8:06 PM)
S195 Session started (Apr 21 at 8:06 PM)
S196 Session started (Apr 21 at 8:06 PM)
S197 Session started (Apr 21 at 8:06 PM)
S198 Session started (Apr 21 at 8:06 PM)
S199 Session started (Apr 21 at 8:06 PM)
S200 Session started (Apr 21 at 8:06 PM)
S201 Launch parallel code reviews and build for Online Judge backend (Apr 21 at 8:06 PM)
### Apr 23, 2026
S202 Parallel code reviews and build verification for Online Judge backend (Apr 23 at 6:14 PM)
535 6:15p 🔵 Discovered JWT implementation with multi-tenancy support
518 7:33p 🔵 Tool search for file editing capabilities initiated
519 " 🔵 Confirmed drop_privileges function escalates to root
521 7:34p 🔵 Direct messaging lacks tenant organization isolation
520 " 🔵 Registration function missing organization_id validation
524 " 🔵 Registration function accepts unverified organization_id
522 " 🔴 Grep tool availability confirmed
514 7:36p 🔵 Untitled
515 " 🔵 Untitled
516 " 🔵 Untitled
517 " 🔵 Security audit report reviewed
### Apr 24, 2026
534 5:17p 🔵 Discovered judge-worker cgroups sandbox implementation
### Apr 29, 2026
587 8:24p 🔵 Discovered available tools for UI refactor planning
588 " 🔵 Mapped frontend component structure for UI refactor
### May 6, 2026
610 10:25p 🔵 Production readiness check initiated
611 " 🔵 Backend dependency check initiated
### May 7, 2026
618 6:41a 🔵 Examined test skill definition
619 " 🔵 Test suite execution results
**621** 6:44a 🔵 **Test suite passes with no failures**
The user continued running the test suite in the Online_Judge Rust project via cargo test. The output reveals that numerous unit and integration tests pass with zero failures. Ignored tests are solely due to missing external services (PostgreSQL, Redis, Docker). This indicates the codebase is stable and recent changes have not introduced regressions.
~218t 🔍 24,706

### May 13, 2026
**681** 7:03p 🔵 **Security bounty hunter command initiated**
The user has initiated a security bounty hunter operation using the everything-claude-code tool suite. This suggests an active security assessment or vulnerability scanning process is beginning, though no specific tool executions or findings have been observed yet in the provided session data.
~152t 🔍 5,845

### May 14, 2026
**682** 7:45p 🔵 **Read seccomp sandbox implementation**
Read the seccomp.rs file to understand the sandboxing mechanism used by the judge worker. The seccomp filter is configured with a deny-by-default policy, allowing only a specific set of syscalls necessary for program execution while blocking potentially dangerous operations like network access, process creation with namespace isolation, privilege escalation, resource limit bypass, filesystem mounts, module loading, ptrace, and reboot. The implementation also includes PR_SET_NO_NEW_PRIVS to prevent gaining new privileges, and the process runs as nobody user. This provides a strong isolation layer for executing untrusted code in the online judge system.
~340t 🔍 19,693

**683** " 🔵 **Read submission processor service**
Read the processor service to understand how submissions are judged. The service orchestrates the entire judging pipeline: creating isolated work directories, saving source code, compiling compiled languages with resource limits and sandboxing, fetching test cases from the database, and executing each test case within a cgroup with enforced CPU and memory limits. Before execution, it drops privileges to the nobody user and applies a deny-by-default seccomp filter to restrict syscalls. Output is compared against expected output to determine verdicts (accepted, wrong answer, runtime error, time limit exceeded, etc.). The design emphasizes security and isolation through multiple layers: per-submission directories, privilege dropping, seccomp, and cgroups.
~392t 🔍 26,256

**691** 8:32p 🔵 **Security Bounty Hunter Command Initiated**
The user has initiated a security bounty hunting session using the everything-claude-code toolset's security-bounty-hunter command. This suggests the user intends to perform security testing, vulnerability assessment, or bug bounty-style activities within their codebase or target systems. The command likely launches a specialized workflow or set of tools designed for security analysis.
~198t 🔍 4,458


Access 1009k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>
