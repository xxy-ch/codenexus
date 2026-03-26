# Frontend Full Alignment Design

## Summary

This spec defines a full frontend realignment for the `frontend` app using `/Users/xiexingyu/Downloads/stitch` as the highest visual and structural reference source. The target product language is the `Architectural Scholar` system: editorial, data-dense, premium, asymmetrical, and operationally honest. The redesign is not limited to styling. It also realigns shell behavior, page architecture, shared primitives, route-level information density, and runtime truthfulness so the UI no longer presents mock, static, or fake-success behavior as production-ready functionality.

The work covers every routed surface currently mounted in [`frontend/src/App.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/App.tsx), with user, teacher, community, and admin experiences treated as one product family with role-specific navigation and density, not separate design languages.

## Goals

- Converge all routed frontend surfaces onto the `Architectural Scholar` design system from `stitch`.
- Use one shared shell contract across user, teacher, and admin experiences.
- Remove user-visible mock fallbacks, static fake lists, and fake-success actions.
- Standardize information hierarchy, tables, forms, filters, chips, headers, and workspace layouts.
- Preserve and strengthen real backend integration paths.
- Make unsupported backend capabilities degrade honestly instead of pretending to persist.
- Keep compatibility with the existing React, Router, Query, and Tailwind stack.

## Non-Goals

- No framework migration.
- No backend API redesign beyond what is needed to consume existing endpoints correctly.
- No speculative new product features outside alignment and truthfulness work.
- No independent dark-mode project.
- No visual divergence from `stitch` where `stitch` already provides a clear answer.

## Highest Reference Source

`/Users/xiexingyu/Downloads/stitch` is the highest reference source for visual direction and page composition.

Authoritative references include:

- `/Users/xiexingyu/Downloads/stitch/syntax_ledger/DESIGN.md`
- `/Users/xiexingyu/Downloads/stitch/oj_dashboard/code.html`
- `/Users/xiexingyu/Downloads/stitch/oj_problem_list/code.html`
- `/Users/xiexingyu/Downloads/stitch/oj_problem_detail/code.html`
- `/Users/xiexingyu/Downloads/stitch/oj_online_ide/code.html`
- `/Users/xiexingyu/Downloads/stitch/oj_submission_history/code.html`
- `/Users/xiexingyu/Downloads/stitch/oj_user_rankings/code.html`
- `/Users/xiexingyu/Downloads/stitch/oj_discussion_forum/code.html`
- `/Users/xiexingyu/Downloads/stitch/oj_editorials_blog/code.html`
- `/Users/xiexingyu/Downloads/stitch/oj_admin_control_panel/code.html`
- `/Users/xiexingyu/Downloads/stitch/oj_login/code.html`
- `/Users/xiexingyu/Downloads/stitch/oj_registration/code.html`
- `/Users/xiexingyu/Downloads/stitch/oj_unauthorized_access/code.html`

If the current frontend conflicts with these references, the redesign follows `stitch`.

## Creative North Star

The product should feel like a high-focus editorial coding workspace rather than a generic dashboard or a terminal-themed judge clone.

Core characteristics:

- editorial typography with strong heading contrast
- layered surfaces instead of divider-heavy boxes
- dense but readable data presentation
- restrained blue primary accent
- shared shell rhythm across all roles
- no decorative clutter
- clear truthfulness about live data and unsupported actions

## Design System Rules

### Color And Surface Hierarchy

The surface hierarchy from `stitch` becomes canonical:

- page background: `#faf8ff`
- sidebar/background-adjacent surfaces: `#f2f3ff`
- primary workspace surfaces: `#ffffff`
- interactive elevated surfaces: `#dae2fd`
- primary action gradient: `#003d9b` to `#0052cc`

### No-Line Rule

The UI must not rely on visible 1px solid dividers for sectioning in primary workspace composition. Separation should come from spacing and surface shifts first. Where accessibility or table legibility truly requires boundaries, use very low-opacity outlines only as a fallback.

### Typography

- Headings: Manrope
- Body and labels: Inter
- Code and ids: JetBrains Mono or an equivalent mono already in the codebase
- Large headlines appear only where `stitch` uses them
- Dense admin and judge pages should prefer compact meta labels and narrow uppercase eyebrow text

### Radius And Shape

- Primary radius baseline: `8px`
- Cards, inputs, table shells, chips, and buttons follow the same radius family
- Avoid oversized, soft consumer-app radii on operational pages

### Motion

- Use short transitions only
- No large transforms for hover
- Sidebar, filters, drawers, and feedback states should feel stable and tool-like

## Product Architecture

## Shared Shell

The shell must be one system, not two loosely related shells.

Files in scope:

- [`frontend/src/layouts/MainLayout.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/layouts/MainLayout.tsx)
- [`frontend/src/layouts/AdminLayout.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/layouts/AdminLayout.tsx)
- [`frontend/src/components/layout/Sidebar.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/layout/Sidebar.tsx)
- [`frontend/src/components/layout/Header.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/layout/Header.tsx)
- [`frontend/src/components/layout/MobileNav.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/layout/MobileNav.tsx)

Requirements:

- sidebar width and main content offset must be driven by a single contract
- admin mode is a navigation variant of the same shell family, not a separate app
- shell spacing must align with `stitch`
- content must never render under the sidebar in desktop layouts
- mobile navigation must preserve route discoverability without duplicating unrelated visual language

## Shared Primitives

The redesign standardizes and extends these presentational primitives:

- [`frontend/src/components/ui/Button.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/ui/Button.tsx)
- [`frontend/src/components/ui/Input.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/ui/Input.tsx)
- [`frontend/src/components/ui/Card.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/ui/Card.tsx)
- [`frontend/src/components/ui/Loading.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/ui/Loading.tsx)
- [`frontend/src/components/ui/StatusBadge.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/ui/StatusBadge.tsx)
- page primitives under [`frontend/src/components/page`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/page)

Additional alignment rules:

- pages should stop hand-rolling ad hoc raw inputs, selects, and buttons where shared components exist
- tables should align around a shared density and cell rhythm
- filter bars and section headers should follow one composition pattern
- empty, loading, and error states must look related across page families

## Route Families

### User Workspace

Primary targets:

- dashboard
- problem list
- problem detail
- IDE
- submission history
- submission detail
- contest list/detail/scoreboard
- ranking
- profile
- settings
- roadmap

Requirements:

- the problem list must use real problem data instead of a static curated list
- the IDE and problem detail must feel like the same workspace family as `stitch`
- history/detail/ranking pages must adopt the same dense editorial table language

### Community

Primary targets:

- discussions list/detail/create
- blog list/detail/create/edit
- direct messages

Requirements:

- forum and editorial pages should align with `stitch`’s manuscript-like reading structure
- authoring pages should use the same creation/edit shell pattern
- direct messages remain a focused tool surface, not a random detached module

### Teacher Workspace

Primary targets:

- class management
- assignment report
- contest wizard

Requirements:

- teacher pages must keep real data behavior and honest unsupported-path messaging
- wizard and report pages must visually sit inside the same shell as the rest of the product
- forms and data panels should match the same editorial-density system

### Admin Workspace

Primary targets:

- admin dashboard
- user management
- problem management
- judge settings
- problem content config
- plagiarism config/report list/detail
- report management

Requirements:

- admin is denser, but still inside the same product family
- mock fallback code must be removed from runtime admin service usage
- no admin control should return fake success when the backend path is absent

## Runtime Truthfulness

This redesign explicitly includes frontend truthfulness.

### Disallowed Patterns

- runtime mock fallback branches for production-facing pages
- static hard-coded list pages presented as live data
- form mutations that always resolve success without persistence
- placeholder controls for unsupported backend features unless clearly marked as non-persistent

### Required Behavior

- if backend data exists, render live data
- if backend support does not exist, disable or hide the action, or label it as local-only
- if a page is still local preference only, the UI must say so plainly

Known problem areas at the start of this project include:

- [`frontend/src/services/admin.ts`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/services/admin.ts)
- [`frontend/src/pages/user/ProblemSet.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/user/ProblemSet.tsx)
- [`frontend/src/pages/user/Settings.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/user/Settings.tsx)

## Testing Strategy

The entire implementation follows TDD.

Rules:

- no production code before a failing test
- shell behavior changes need layout tests
- page behavior changes need focused route-level tests
- service truthfulness changes need service or integration-style tests
- major visual contract changes should also be verified by build and targeted smoke checks

Test layers:

- component tests for shared primitives
- layout tests for shell and sidebar contract
- page tests for critical route families
- service tests for live API and no-mock guarantees
- build verification for full route bundle compatibility

## Risks

- the current frontend already contains partially migrated pages, so mixed-state regressions are likely if the shell and primitives are not stabilized first
- removing runtime mock branches may expose missing backend support that was previously hidden
- some old pages may still use direct handcrafted styles and require careful convergence rather than a superficial class swap
- admin and teacher pages can regress if visual rewrite and truthfulness changes are split across unrelated passes

## Implementation Order

1. stabilize tokens and shell contract
2. align shared primitives and raw control usage
3. remove truthfulness violations in core user/admin paths
4. migrate user workspace pages
5. migrate community pages
6. migrate teacher pages
7. migrate admin pages
8. run final verification across shell, API truthfulness, and route consistency

## Acceptance Criteria

- desktop shell no longer overlays content beneath the sidebar
- user, teacher, and admin surfaces read as one product family
- problem list uses real backend problem data
- admin runtime services no longer fall back to mock data
- settings page no longer presents fake persistence as backend-backed behavior
- major routed pages visually align with `stitch`
- focused tests pass, build passes, and route families retain real working data flows
