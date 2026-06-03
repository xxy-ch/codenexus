# Main Branch UI Baseline

This folder is the active visual baseline for the modular frontend redesign worktree.
It supersedes the older `references/` comparison artifacts after the user correction on 2026-06-03.

## Capture Scope

- Source app: current `master` branch at `http://127.0.0.1:5173`
- Viewport: desktop `1280x720`
- Screenshots: 40 routes covering public, student, teacher, root/admin, unauthorized, and not found states
- Result manifest: `capture-results.json`

## Coverage

- Public: login, register
- Student: dashboard, problems, problem detail, solve view, submissions, submission detail, contests, scoreboard, ranking, roadmap, discussions, blog, messages, search, profile, settings
- Teacher: classes, assignment report, contest wizard, problem content, batch operations, feature entry
- Root/admin: dashboard, users, problems, judge settings, judge queue, grades, features, problem content, similarity scan, plagiarism reports and detail
- Error states: unauthorized and not found

## Observations

- All captured pages reported `horizontalOverflow: false`.
- Every route logged the same baseline CSP issue: Google Fonts and Material Icons stylesheets are blocked by `style-src 'self' 'unsafe-inline'`.
- The redesign worktree must use these screenshots as the panel, density, color, and navigation baseline. The older `design-audit/screenshots/reference` files are retained only as superseded artifacts.
