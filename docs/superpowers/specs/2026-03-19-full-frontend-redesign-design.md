# Full Frontend Redesign Design

## Summary

This spec defines a full visual and structural rewrite of the routed frontend surfaces in the `frontend` app. The redesign standardizes the entire product around a flat, modern, minimal visual system with a cold gray-blue palette, a shared shell, and a small set of reusable page templates. The scope covers user, teacher, admin, auth, error, and search pages that are currently mounted in [`frontend/src/App.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/App.tsx).

The goal is not only cosmetic consistency. The redesign also removes repeated one-off page structures, aligns the app around shared UI primitives, preserves the real teacher workflows that were recently repaired, and keeps compatibility with older Chrome versions at or above Chrome 96.

## Goals

- Rewrite all routed frontend pages into one coherent product language.
- Standardize layout, typography, spacing, table patterns, forms, filters, empty states, and action areas.
- Preserve existing real data paths and repaired behaviors, especially in teacher workflows.
- Keep the global sidebar model with both automatic and manual collapse/expand behavior.
- Keep the implementation compatible with Chrome 96+.
- Reduce per-page styling duplication by introducing shared tokens and page-level composition primitives.

## Non-Goals

- No framework migration.
- No large-scale backend API redesign as part of the visual rewrite.
- No dark-mode redesign as a separate product track.
- No replacement of existing editor/judge integrations unless required to preserve consistency.
- No speculative new feature work outside what is needed to complete the redesign.

## Scope

The redesign covers all currently routed pages under the following groups:

### Shared Shell and Layout

- [`frontend/src/layouts/MainLayout.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/layouts/MainLayout.tsx)
- [`frontend/src/layouts/AdminLayout.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/layouts/AdminLayout.tsx)
- [`frontend/src/components/layout/Sidebar.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/layout/Sidebar.tsx)
- [`frontend/src/components/layout/Header.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/layout/Header.tsx)
- [`frontend/src/components/layout/MobileNav.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/layout/MobileNav.tsx)
- [`frontend/src/index.css`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/index.css)

### Auth / Error / Utility

- `src/pages/auth/*`
- `src/pages/error/*`
- `src/pages/search/SearchResults.tsx`

### User Pages

- `src/pages/user/*`
- `src/pages/contest/ContestScoreboard.tsx`

### Community Pages

- `src/pages/community/*`

### Teacher Pages

- `src/pages/teacher/*`

### Admin Pages

- `src/pages/admin/*`

### Shared UI Primitives

- [`frontend/src/components/ui/Button.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/ui/Button.tsx)
- [`frontend/src/components/ui/Input.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/ui/Input.tsx)
- [`frontend/src/components/ui/Card.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/ui/Card.tsx)
- [`frontend/src/components/ui/Loading.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/ui/Loading.tsx)
- [`frontend/src/components/ui/StatusBadge.tsx`](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/components/ui/StatusBadge.tsx)
- related tests

## Design Direction

### Palette

The redesign uses a cold gray-blue base:

- page backgrounds: light gray with slight blue cast, not pure white
- primary surfaces: white or near-white with subtle border separation
- accent: restrained slate-blue for active states, primary actions, and focus
- destructive/warning/success states remain color-coded but muted and flat

The result should feel calm, operational, and product-grade rather than decorative.

### Typography

- Clear hierarchy with three main text tiers: page heading, section heading/body, helper/meta
- Tightened heading usage to avoid oversized hero sections on utility pages
- Monospace reserved for code, ids, invite codes, and judge-related values

### Surfaces

- Flat cards with thin borders and weak shadows
- Consistent radii across shells, cards, tables, filters, and forms
- Minimal gradients only where they help orientation; no glossy or neon styling

### Motion

- Only short fade/expand/collapse transitions
- No heavy transforms, blur layers, or animated decorative backgrounds

## Layout Architecture

### Main Product Shell

User and teacher pages share one shell:

- collapsible left sidebar
- compact top workspace header
- standardized content viewport
- shared page header pattern

The existing sidebar behavior remains:

- manual collapse/expand
- automatic collapse on narrower windows
- persisted preference
- layout width reacts to sidebar state

### Admin Shell

Admin pages move closer to the same shell language instead of remaining a visually separate application. The admin navigation can remain grouped and denser, but it should no longer use an unrelated header-and-tab style. The admin experience should still read as the same product family.

### Mobile and Narrow Width Behavior

- sidebar collapses automatically
- filters stack vertically
- metrics rows become one or two columns
- data tables remain horizontally scrollable when needed
- detail pages collapse side panels below primary content

## Shared Component Model

The redesign introduces or normalizes the following reusable page-level primitives:

- `PageHeader`
- `SurfaceCard`
- `StatCard`
- `FilterBar`
- `SectionBlock`
- `DataTable`
- `EmptyState`
- `ActionBar`
- `StatusPill`
- `FieldGroup`

The principle is to stop rebuilding these patterns inside individual pages with repeated Tailwind class strings.

These primitives are presentational and compositional by default. They must not absorb route-specific business logic such as query param ownership, pagination state, sort state, mutation orchestration, validation rules, or data-fetch policy unless a later implementation step explicitly documents that move. Page containers remain responsible for state, routing, async flows, and API interaction so the rewrite does not quietly relocate business logic into shared UI.

## Page Templates

### Template A: List / Search / Management

Structure:

- `PageHeader`
- `FilterBar`
- optional `StatCard` row
- `DataTable`
- empty/error state fallback

Targets:

- problem list
- contest list
- submission history
- ranking
- admin user/problem/report screens
- search results

### Template B: Detail / Read-Only Workspace

Structure:

- `PageHeader`
- summary panel or hero meta strip
- stacked `SectionBlock`s
- optional side metadata rail

Targets:

- problem detail
- contest detail
- submission detail
- article / discussion detail
- profile

### Template C: Editing / Creation / Wizard

Structure:

- `PageHeader`
- optional step rail
- grouped form sections
- bottom `ActionBar`

Targets:

- login/register
- article/discussion creation
- teacher contest wizard
- settings/admin configuration pages

### Template D: Operational Dashboard / Workspace

Structure:

- `PageHeader`
- `StatCard` row
- primary work panel
- secondary insight or helper panel

Targets:

- dashboard
- teacher class management
- assignment report
- admin dashboard

### Template E: Focused Tool / Real-Time Workspace

Structure:

- task-oriented split layout or focused single-workspace layout
- minimal surrounding chrome
- persistent primary action area
- supporting metadata in compact secondary regions only

Targets:

- problem IDE
- enhanced problem IDE
- direct messages
- scoreboard and other highly interactive single-task views when Template B would add too much overhead

## Page Family Strategy

### Auth / Error / Search

These pages become intentionally sparse and goal-focused. They should not inherit heavy dashboard styling. Login and register should feel clean and centered. Error pages should be high-clarity, low-noise utilities with a single recovery path.

### User List Pages

Problem sets, submissions, contests, rankings, blog/discussion lists, and roadmap move onto one common browsing structure. Filters and stats should align visually instead of changing position and density from page to page.

### User Detail and IDE Pages

Problem detail, contest detail, submission detail, profile, and settings should reduce visual clutter and strengthen the reading or task flow. The IDE family is explicitly mapped to Template E so it is not forced into the same structure as standard detail pages.

### Community Pages

Editing and content pages must stop feeling like a different app. Writing surfaces, meta sections, toolbars, and content containers should align with the main product tokens while keeping enough whitespace for reading. Direct messages are explicitly treated as Template E rather than a generic detail page.

### Teacher Pages

The recently repaired teacher functionality remains intact:

- class management live write paths stay real
- assignment report keeps real joins and CSV export
- contest wizard keeps real create/problem/settings flows and honest participant limitation messaging

Only structure and presentation are rewritten where needed for consistency.

### Admin Pages

Admin pages become denser but still flat and restrained. High-information tables, filters, and state badges should feel deliberate and consistent, not generic control-panel leftovers.

## Technical Constraints

### Browser Compatibility

All styling and layout decisions must work in Chrome 96+.

Avoid relying on:

- container queries
- `color-mix()`
- experimental text wrapping features as a requirement
- complex filter-driven visual effects
- advanced CSS nesting assumptions beyond the current toolchain support

### Accessibility

The redesign must preserve or improve:

- visible keyboard focus on all interactive controls
- sufficient contrast for text, borders, and status states
- keyboard navigation parity for major flows
- reduced-motion friendly behavior for non-essential transitions
- semantic headings, labels, and navigational landmarks where already present or expected

### Incremental Rewrite Safety

The rewrite will land incrementally. Shared shell and primitives are introduced first, then page families migrate in groups. During migration:

- existing routes must continue working
- URL structure, deep links, and route params must remain stable
- existing query-string semantics and filter entry points must remain stable unless a migration step explicitly includes a tested replacement
- existing auth guards, error boundaries, loading states, and navigation hierarchy must remain intact
- existing teacher live write paths must not regress
- tests should move with the pages they cover

### Styling Coexistence

Because the rewrite is incremental, old and new styles will coexist temporarily. The implementation must explicitly prevent token drift and selector collisions by introducing new shared tokens first, migrating primitives before pages that consume them, and removing old one-off styles only after the replacement surfaces are live.

## Implementation Order

1. design tokens, CSS variables, shell foundations, and shared primitives
2. migrate one low-risk contained family onto the new primitives first: auth, error, and search pages
3. validate the new primitives and tokens through focused regression before broad shell convergence
4. converge `MainLayout` and `AdminLayout` onto the new shell language
5. user list pages
6. user detail pages and IDE-related pages
7. community pages
8. teacher pages
9. admin pages
10. final consistency sweep and regression pass

This order minimizes rework because the new primitives are exercised on lower-risk pages before the shell blast radius expands across the application.

## Testing Strategy

### Automated

- keep existing focused tests for sidebar, teacher flows, and user flows
- add or update shared primitive tests when behaviors change
- run focused page tests while migrating each family
- run frontend typecheck
- run frontend build

### Manual

For each page family, visually verify:

- spacing consistency
- primary action placement
- empty/error/loading state quality
- narrow width layout behavior
- sidebar interaction
- form readability and table density

## Success Criteria

The redesign is successful when:

- all routed pages share one recognizable product language
- the admin area no longer feels like a separate UI system
- teacher workflows still use real data paths and remain honest about unsupported flows
- page-level duplication drops in favor of shared composition patterns
- frontend tests, typecheck, and build remain green
- the app is visually coherent on Chrome 96+ without depending on unsupported modern CSS features

## Risks

### Scope Size

This is a large rewrite. The main risk is drifting into uncontrolled one-off page edits without stabilizing the shared layer first.

Mitigation:

- shared shell and primitives must land before broad page migration
- rewrite by page family, not random file order

### Hidden Behavior Regressions

Pages may contain implicit workflow assumptions under their existing styling.

Mitigation:

- preserve or extend focused tests while migrating
- avoid mixing visual rewrite and unrelated feature changes unless required

### Inconsistent Intermediate States

During incremental migration, some pages may temporarily feel newer than others.

Mitigation:

- move whole page families together
- prioritize high-traffic and shell-defining areas first

### Mixed Old/New Style Collisions

Because `index.css`, layouts, and shared UI primitives will change before every page is migrated, the app can end up with overlapping tokens, duplicated utility assumptions, or old/new component mixes on the same screen.

Mitigation:

- migrate primitives before page families that consume them
- keep shared token names and surface rules centralized
- remove superseded one-off page styling only after replacement patterns are adopted

### Accessibility Drift

Flat redesign work often weakens focus visibility, border contrast, and keyboard clarity if those constraints are not treated as first-class.

Mitigation:

- verify focus, contrast, and keyboard flows while migrating each page family
- treat accessible interaction states as part of visual acceptance, not as optional cleanup
