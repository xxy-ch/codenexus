---
title: "refactor: UI Design System Overhaul"
type: refactor
status: active
date: 2026-04-29
origin: docs/brainstorms/ui-refactoring-requirements.md
---

# UI Design System Overhaul

## Overview

Complete frontend UI refactoring of AlgoMaster Online Judge, adopting Linear design language while retaining shadcn/ui component library. All component styles and variants will be redesigned to create a refined, professional online judge experience with dark mode support.

## Problem Frame

The current frontend has several issues:
- Inconsistent visual style across pages
- Missing form components (Select, Checkbox, Radio, Switch, Textarea, Tooltip)
- Inline style remnants in 12 files
- No dark mode support
- Large libraries (Monaco Editor, Recharts) loaded eagerly on initial page load
- Component interaction states incomplete

The goal is to create a cohesive, Linear-inspired design system that works across Chrome 109+ with full dark mode support.

## Requirements Trace

- R1. Unified design system using Linear design language
- R2. All 24 components implemented with consistent styling
- R3. Chrome 109+ compatibility (no oklch, CSS Nesting, color-mix)
- R4. Dark mode support via CSS custom properties
- R5. Desktop-only responsive (1024px+ minimum)
- R6. Zero inline styles (currently 12 files)
- R7. Monaco Editor/Recharts lazy-loaded (not in initial bundle)
- R8. 80%+ test coverage for all components

## Scope Boundaries

- No backend API changes
- No mobile/tablet responsive design
- No state management architecture changes
- No i18n or a11y audit
- No new framework migrations (stay on React + Tailwind + shadcn)

## Context & Research

### Relevant Code and Patterns

**Component patterns:**
- `frontend/src/components/ui/Button.tsx` — shadcn/CVA pattern with variants
- `frontend/src/components/ui/Card.tsx` — Custom compound component pattern
- All components use `cn()` from `@/lib/utils` for class merging
- Named exports only, no default exports
- `data-slot` attributes for CSS targeting

**Styling patterns:**
- `frontend/src/index.css` — CSS custom properties with oklch progressive enhancement
- `@theme inline` block maps CSS vars for Tailwind consumption
- Shadow scale: whisper/card/elevated/prominent/overlay
- Radius scale: sm/md/lg/xl/2xl/3xl/4xl

**State management:**
- `frontend/src/store/authStore.ts` — Zustand for auth state
- React Query for server state caching
- Services are plain objects with async methods

**Testing patterns:**
- Vitest + @testing-library/react + jsdom
- Component tests in `__tests__/` subdirectories
- `render()` + `screen.getByRole()` + `toHaveClass()`

### Institutional Learnings

- Chrome 109 compatibility is critical — no oklch/CSS Nesting/color-mix
- Design tokens should be CSS custom properties, not JS objects
- Theme persistence via localStorage prevents flash on load
- Both `npm run typecheck` and `npm run lint` must pass

### External References

- Linear design system (design language reference)
- shadcn/ui documentation (component patterns)
- Tailwind CSS v4 documentation (@theme inline, CSS variables)

## Key Technical Decisions

1. **Theme propagation: CSS custom properties** — Use `:root` for light theme, `.dark` class for dark theme. All colors defined as CSS variables. Tailwind references via `var()`. Theme toggle adds/removes `.dark` class on `<html>`.

2. **Chrome 109 compatibility: hex/rgb only** — All color tokens use hex format, not oklch. Use `@supports (color: oklch(0 0 0))` for progressive enhancement where beneficial.

3. **Component architecture: shadcn + CVA** — Retain shadcn/ui primitives (Radix-based). All components use CVA for variant definitions. Consistent prop interfaces extending native HTML elements.

4. **Dark mode persistence: localStorage + inline script** — Add `<script>` in index.html to read theme preference before React hydrates. Prevents light→dark flash.

5. **Performance: React.lazy for heavy libraries** — Monaco Editor and Recharts wrapped in React.lazy with Suspense fallbacks. Route-level code splitting already exists.

6. **Rollback strategy: data-theme-version attribute** — Add `data-theme-version="v2"` to `<body>`. CSS can target old pages if migration breaks.

## Open Questions

### Resolved During Planning

- **Theme mechanism**: CSS custom properties (confirmed by user)
- **Font choice**: Inter (confirmed by user)
- **Primary color**: #f54e00 orange (confirmed by user)
- **Design style**: Linear (confirmed by user)

### Deferred to Implementation

- **Exact CVA variant names**: Will be determined during component implementation
- **Animation timing curves**: Will be refined during visual review
- **Specific shadow values per component**: May need adjustment based on visual testing

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

**Theme Architecture:**
```
index.css
├── :root { --primary: #f54e00; ... }  // Light theme tokens
├── .dark { --primary: #f54e00; ... }  // Dark theme tokens
└── @theme inline { --color-primary: var(--primary); ... }  // Tailwind mapping

Component
└── className="bg-primary text-primary-foreground"  // Uses Tailwind → CSS var
```

**Component Hierarchy:**
```
components/ui/
├── Button.tsx (CVA variants: default/outline/secondary/ghost/destructive/link)
├── Input.tsx (CVA variants: default/error)
├── Select.tsx (NEW - shadcn pattern)
├── Checkbox.tsx (NEW - shadcn pattern)
├── Radio.tsx (NEW - shadcn pattern)
├── Switch.tsx (NEW - shadcn pattern)
├── Textarea.tsx (NEW - shadcn pattern)
├── Tooltip.tsx (NEW - shadcn pattern)
├── Card.tsx (compound: CardHeader/CardTitle/CardContent/CardFooter)
├── Badge.tsx (CVA variants + status/difficulty)
├── Dialog.tsx (Radix primitive + animations)
├── DropdownMenu.tsx (Radix primitive)
├── Tabs.tsx (CVA variants: default/pills/underline)
├── Toast.tsx (CVA variants: success/error/warning/info)
├── Table.tsx (styled with Linear borders)
└── ... (existing components)
```

## Implementation Units

### Phase 1: Design Token Foundation (Week 1)

- [x] **Unit 1.1: Convert oklch to hex tokens**

**Goal:** Ensure all design tokens use hex/rgb format for Chrome 109 compatibility

**Requirements:** R3

**Dependencies:** None

**Files:**
- Modify: `frontend/src/index.css`

**Approach:**
- Replace all oklch color values with hex equivalents
- Keep CSS custom property structure intact
- Preserve `@supports` block for progressive enhancement
- Ensure both light and dark themes use hex

**Patterns to follow:**
- Current `:root` and `.dark` blocks in index.css
- Existing hex fallbacks in the file

**Test scenarios:**
- Happy path: All CSS variables resolve to valid hex values
- Edge case: Browser without oklch support renders correctly
- Verification: `grep -r "oklch" frontend/src/` returns no results in production CSS

**Verification:**
- All colors use hex format
- Light/dark themes render correctly in Chrome 109
- No visual regression from current design

- [x] **Unit 1.2: Redesign color tokens for Linear style**

**Goal:** Create cohesive Linear-inspired color palette

**Requirements:** R1, R4

**Dependencies:** Unit 1.1

**Files:**
- Modify: `frontend/src/index.css`

**Approach:**
- Refine primary/secondary/muted/accent colors for Linear aesthetic
- Add extended surface tokens (background-alt, border-subtle, etc.)
- Ensure sufficient contrast ratios for readability
- Add semantic tokens for interactive states (hover, active, focus)

**Patterns to follow:**
- Linear design system color relationships
- Current token naming conventions

**Test scenarios:**
- Happy path: All color combinations meet WCAG AA contrast (4.5:1 text, 3:1 UI)
- Edge case: Dark mode colors don't cause eye strain
- Verification: Visual review against Linear reference

**Verification:**
- Color palette matches Linear aesthetic
- Dark mode is visually cohesive
- All interactive states have defined colors

- [x] **Unit 1.3: Add theme persistence mechanism**

**Goal:** Prevent theme flash on page load

**Requirements:** R4

**Dependencies:** Unit 1.2

**Files:**
- Create: `frontend/src/lib/theme-persistence.ts`
- Modify: `frontend/index.html`

**Approach:**
- Add inline `<script>` in index.html to read localStorage theme preference
- Apply `.dark` class before React hydrates
- Create utility functions for theme switching
- Handle `prefers-color-scheme` media query as fallback

**Patterns to follow:**
- Standard theme persistence patterns

**Test scenarios:**
- Happy path: User selects dark mode → refresh → dark mode persists
- Edge case: First visit with no localStorage → follows system preference
- Error path: localStorage disabled → falls back to light mode
- Verification: No light→dark flash on page load

**Verification:**
- Theme persists across page refreshes
- No flash of incorrect theme
- System preference respected on first visit

- [x] **Unit 1.4: Enhance typography and spacing tokens**

**Goal:** Complete Linear-style typography scale and spacing system

**Requirements:** R1

**Dependencies:** Unit 1.1

**Files:**
- Modify: `frontend/src/index.css`

**Approach:**
- Refine typography utility classes (.text-display, .text-h1, etc.)
- Ensure consistent line-height and letter-spacing
- Add any missing spacing tokens
- Document the type scale in comments

**Patterns to follow:**
- Current typography utilities in index.css
- Linear typography scale

**Test scenarios:**
- Happy path: All text renders with correct sizes and spacing
- Verification: Typography scale is consistent across components

**Verification:**
- Typography utilities are complete
- Consistent visual hierarchy
- No inline font-size/line-height overrides needed

### Phase 2: Core Component Redesign (Weeks 2-3)

- [x] **Unit 2.1: Redesign Button component**

**Goal:** Create Linear-style Button with all variants and states

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Modify: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/__tests__/Button.test.tsx`

**Approach:**
- Redesign all variants (default/outline/secondary/ghost/destructive/link)
- Add all size variants (xs/sm/default/lg/icon)
- Implement complete interaction states (hover/active/focus/disabled/loading)
- Add micro-interactions (hover lift, click feedback)
- Ensure dark mode compatibility

**Patterns to follow:**
- Current Button.tsx CVA pattern
- Linear button style (subtle shadows, rounded corners)

**Test scenarios:**
- Happy path: Button renders with correct variant classes
- Happy path: Button click triggers onClick handler
- Edge case: Disabled button doesn't respond to clicks
- Edge case: Loading state shows spinner and disables interaction
- Error path: Invalid variant renders default style
- Verification: All variants render correctly in light and dark mode

**Verification:**
- All variants visually match Linear style
- Interactive states work correctly
- Dark mode renders properly
- Test coverage >80%

- [x] **Unit 2.2: Create Select component**

**Goal:** Build accessible dropdown select component

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Create: `frontend/src/components/ui/Select.tsx`
- Create: `frontend/src/components/ui/__tests__/Select.test.tsx`

**Approach:**
- Use Radix UI Select primitive as base
- Style with Linear aesthetic (rounded, shadows, smooth animations)
- Support single and multi-select modes
- Implement keyboard navigation
- Add search/filter capability for long lists

**Patterns to follow:**
- shadcn/ui Select pattern
- Current DropdownMenu.tsx styling

**Test scenarios:**
- Happy path: Select opens on click, shows options
- Happy path: Selecting option updates value and closes dropdown
- Edge case: Keyboard navigation (arrow keys, enter, escape)
- Edge case: Long list scrolls correctly
- Error path: Disabled select doesn't open
- Verification: Works in light and dark mode

**Verification:**
- Select is fully functional
- Keyboard accessible
- Dark mode works
- Test coverage >80%

- [x] **Unit 2.3: Create Checkbox component**

**Goal:** Build styled checkbox with indeterminate state

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Create: `frontend/src/components/ui/Checkbox.tsx`
- Create: `frontend/src/components/ui/__tests__/Checkbox.test.tsx`

**Approach:**
- Use Radix UI Checkbox primitive
- Style with Linear aesthetic
- Support checked/unchecked/indeterminate states
- Add smooth check animation
- Ensure proper label association

**Patterns to follow:**
- shadcn/ui Checkbox pattern

**Test scenarios:**
- Happy path: Click toggles checked state
- Happy path: Indeterminate state renders correctly
- Edge case: Keyboard space toggles checkbox
- Edge case: Disabled checkbox doesn't toggle
- Verification: Animations are smooth

**Verification:**
- All states render correctly
- Keyboard accessible
- Dark mode works
- Test coverage >80%

- [x] **Unit 2.4: Create Radio component**

**Goal:** Build radio button group component

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Create: `frontend/src/components/ui/Radio.tsx`
- Create: `frontend/src/components/ui/__tests__/Radio.test.tsx`

**Approach:**
- Use Radix UI RadioGroup primitive
- Style with Linear aesthetic
- Support radio group with labels
- Ensure proper keyboard navigation

**Patterns to follow:**
- shadcn/ui Radio pattern

**Test scenarios:**
- Happy path: Click selects radio option
- Happy path: Only one option selected in group
- Edge case: Keyboard arrow keys navigate options
- Edge case: Disabled radio doesn't select
- Verification: Works in light and dark mode

**Verification:**
- Radio group functions correctly
- Keyboard accessible
- Dark mode works
- Test coverage >80%

- [x] **Unit 2.5: Create Switch component**

**Goal:** Build toggle switch component

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Create: `frontend/src/components/ui/Switch.tsx`
- Create: `frontend/src/components/ui/__tests__/Switch.test.tsx`

**Approach:**
- Use Radix UI Switch primitive
- Style with Linear aesthetic (smooth slide animation)
- Support on/off states with labels
- Ensure proper accessibility

**Patterns to follow:**
- shadcn/ui Switch pattern

**Test scenarios:**
- Happy path: Click toggles switch state
- Happy path: Switch animates smoothly
- Edge case: Keyboard space toggles switch
- Edge case: Disabled switch doesn't toggle
- Verification: Works in light and dark mode

**Verification:**
- Switch toggles correctly
- Smooth animation
- Dark mode works
- Test coverage >80%

- [x] **Unit 2.6: Create Textarea component**

**Goal:** Build styled textarea with resize support

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Create: `frontend/src/components/ui/Textarea.tsx`
- Create: `frontend/src/components/ui/__tests__/Textarea.test.tsx`

**Approach:**
- Style with Linear aesthetic
- Support resize handle
- Implement focus/blur states
- Add character count display (optional)
- Ensure proper label association

**Patterns to follow:**
- Current Input.tsx styling

**Test scenarios:**
- Happy path: Textarea renders and accepts input
- Happy path: Resize handle works
- Edge case: Focus state shows ring
- Edge case: Disabled textarea doesn't accept input
- Verification: Works in light and dark mode

**Verification:**
- Textarea is functional
- Resize works correctly
- Dark mode works
- Test coverage >80%

- [x] **Unit 2.7: Create Tooltip component**

**Goal:** Build hover tooltip component

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Create: `frontend/src/components/ui/Tooltip.tsx`
- Create: `frontend/src/components/ui/__tests__/Tooltip.test.tsx`

**Approach:**
- Use Radix UI Tooltip primitive
- Style with Linear aesthetic (subtle shadow, rounded)
- Support positioning (top/right/bottom/left)
- Add show/hide animations
- Ensure proper z-index layering

**Patterns to follow:**
- shadcn/ui Tooltip pattern

**Test scenarios:**
- Happy path: Hover shows tooltip after delay
- Happy path: Mouse leave hides tooltip
- Edge case: Keyboard focus shows tooltip
- Edge case: Tooltip repositions when near viewport edge
- Verification: Works in light and dark mode

**Verification:**
- Tooltip shows/hides correctly
- Positioning is accurate
- Dark mode works
- Test coverage >80%

- [x] **Unit 2.8: Redesign Input component**

**Goal:** Enhance Input with Linear style and complete states

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Modify: `frontend/src/components/ui/Input.tsx`
- Create: `frontend/src/components/ui/__tests__/Input.test.tsx`

**Approach:**
- Redesign with Linear aesthetic
- Add all variants (default/error/success)
- Implement complete states (focus/disabled/loading)
- Add prefix/suffix icon support
- Ensure consistent height with other form elements

**Patterns to follow:**
- Current Input.tsx structure
- Linear input style

**Test scenarios:**
- Happy path: Input renders and accepts text
- Happy path: Error state shows red border and message
- Edge case: Focus state shows ring
- Edge case: Disabled input doesn't accept input
- Verification: Works in light and dark mode

**Verification:**
- Input is fully functional
- All states render correctly
- Dark mode works
- Test coverage >80%

- [x] **Unit 2.9: Redesign Card component**

**Goal:** Enhance Card with Linear-style elevation and borders

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Modify: `frontend/src/components/ui/Card.tsx`
- Create: `frontend/src/components/ui/__tests__/Card.test.tsx`

**Approach:**
- Redesign with Linear aesthetic (subtle shadows, clean borders)
- Add variant support (default/elevated/outlined)
- Ensure compound components work (CardHeader, CardTitle, etc.)
- Add hover state for interactive cards

**Patterns to follow:**
- Current Card.tsx compound pattern
- Linear card style

**Test scenarios:**
- Happy path: Card renders with all subcomponents
- Happy path: Elevated variant shows shadow
- Edge case: Hover state lifts card slightly
- Verification: Works in light and dark mode

**Verification:**
- Card renders correctly
- All variants work
- Dark mode works
- Test coverage >80%

- [x] **Unit 2.10: Redesign Badge and StatusBadge**

**Goal:** Create comprehensive badge system with status/difficulty variants

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Modify: `frontend/src/components/ui/badge.tsx`
- Modify: `frontend/src/components/ui/StatusBadge.tsx`
- Create: `frontend/src/components/ui/__tests__/Badge.test.tsx`

**Approach:**
- Redesign Badge with Linear aesthetic
- Add status variants (accepted/wrong/pending/tle/re)
- Add difficulty variants (easy/medium/hard)
- Ensure consistent sizing and padding
- Add icon support

**Patterns to follow:**
- Current badge.tsx CVA pattern
- Status color tokens

**Test scenarios:**
- Happy path: Badge renders with correct variant
- Happy path: StatusBadge shows correct color for each status
- Edge case: Badge with icon renders correctly
- Verification: Works in light and dark mode

**Verification:**
- All badge variants work
- Status colors are correct
- Dark mode works
- Test coverage >80%

### Phase 3: Interactive Components (Week 4)

- [x] **Unit 3.1: Redesign Dialog component**

**Goal:** Create Linear-style modal dialog with smooth animations

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Modify: `frontend/src/components/ui/dialog.tsx`
- Create: `frontend/src/components/ui/__tests__/Dialog.test.tsx`

**Approach:**
- Redesign with Linear aesthetic (subtle overlay, smooth enter/exit)
- Add size variants (sm/md/lg/full)
- Implement focus trap (Radix handles this)
- Add close on escape and overlay click
- Ensure proper z-index layering

**Patterns to follow:**
- shadcn/ui Dialog pattern
- Current dialog.tsx structure

**Test scenarios:**
- Happy path: Dialog opens and closes correctly
- Happy path: Escape key closes dialog
- Edge case: Focus trapped within dialog
- Edge case: Overlay click closes dialog
- Error path: Multiple dialogs stack correctly
- Verification: Works in light and dark mode

**Verification:**
- Dialog opens/closes smoothly
- Focus trap works
- Animations are fluid
- Dark mode works
- Test coverage >80%

- [x] **Unit 3.2: Redesign DropdownMenu component**

**Goal:** Create Linear-style dropdown menu with smooth animations

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Modify: `frontend/src/components/ui/dropdown-menu.tsx`
- Create: `frontend/src/components/ui/__tests__/DropdownMenu.test.tsx`

**Approach:**
- Redesign with Linear aesthetic
- Add smooth enter/exit animations
- Support icons and shortcuts
- Implement keyboard navigation
- Ensure proper positioning

**Patterns to follow:**
- shadcn/ui DropdownMenu pattern

**Test scenarios:**
- Happy path: Menu opens on trigger click
- Happy path: Menu item click triggers action
- Edge case: Keyboard navigation (arrow keys, enter, escape)
- Edge case: Menu repositions when near viewport edge
- Verification: Works in light and dark mode

**Verification:**
- Dropdown menu functions correctly
- Animations are smooth
- Keyboard accessible
- Dark mode works
- Test coverage >80%

- [x] **Unit 3.3: Redesign Tabs component**

**Goal:** Create Linear-style tabs with multiple variants

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Modify: `frontend/src/components/ui/tabs.tsx`
- Create: `frontend/src/components/ui/__tests__/Tabs.test.tsx`

**Approach:**
- Redesign with Linear aesthetic
- Add variants (default/pills/underline)
- Implement smooth tab indicator animation
- Support keyboard navigation
- Ensure proper content switching

**Patterns to follow:**
- shadcn/ui Tabs pattern

**Test scenarios:**
- Happy path: Click switches tab content
- Happy path: Active tab shows indicator
- Edge case: Keyboard arrow keys switch tabs
- Edge case: Disabled tab doesn't switch
- Verification: Works in light and dark mode

**Verification:**
- Tabs switch correctly
- Animations are smooth
- Keyboard accessible
- Dark mode works
- Test coverage >80%

- [x] **Unit 3.4: Redesign Toast component**

**Goal:** Create Linear-style toast notification system

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Modify: `frontend/src/components/ui/Toast.tsx`
- Create: `frontend/src/components/ui/__tests__/Toast.test.tsx`

**Approach:**
- Redesign with Linear aesthetic
- Add variants (success/error/warning/info)
- Implement show/hide animations
- Support auto-dismiss with progress
- Add action buttons
- Ensure proper stacking

**Patterns to follow:**
- react-hot-toast patterns
- Linear notification style

**Test scenarios:**
- Happy path: Toast shows with correct message
- Happy path: Toast auto-dismisses after timeout
- Edge case: Multiple toasts stack correctly
- Edge case: Action button triggers callback
- Verification: Works in light and dark mode

**Verification:**
- Toast notifications work
- Animations are smooth
- Auto-dismiss functions
- Dark mode works
- Test coverage >80%

- [x] **Unit 3.5: Redesign Table component**

**Goal:** Create Linear-style table with clean borders

**Requirements:** R2

**Dependencies:** Unit 1.2

**Files:**
- Modify: `frontend/src/components/ui/table.tsx`
- Create: `frontend/src/components/ui/__tests__/Table.test.tsx`

**Approach:**
- Redesign with Linear aesthetic (whisper borders)
- Add row hover states
- Support sortable columns (header click)
- Ensure proper scrolling for large datasets
- Add loading skeleton state

**Patterns to follow:**
- Current table.tsx structure
- Linear table style (clean borders, subtle hover)

**Test scenarios:**
- Happy path: Table renders with data
- Happy path: Row hover highlights row
- Edge case: Large table scrolls correctly
- Edge case: Empty table shows empty state
- Verification: Works in light and dark mode

**Verification:**
- Table renders correctly
- Hover states work
- Scrolling is smooth
- Dark mode works
- Test coverage >80%

### Phase 4: Page Migration (Weeks 5-6)

- [x] **Unit 4.1: Migrate Dashboard page**

**Goal:** Apply new design system to Dashboard

**Requirements:** R1, R6

**Dependencies:** Phase 2, Phase 3

**Files:**
- Modify: `frontend/src/pages/user/Dashboard.tsx`
- Modify: Related components used by Dashboard

**Approach:**
- Replace inline styles with Tailwind classes
- Use new component variants
- Apply Linear spacing and typography
- Ensure dark mode works
- Remove any style= attributes

**Patterns to follow:**
- New design system tokens
- Linear layout patterns

**Test scenarios:**
- Happy path: Dashboard renders with new design
- Edge case: All interactive elements work
- Edge case: Dark mode renders correctly
- Verification: No inline styles remain

**Verification:**
- Dashboard matches Linear aesthetic
- No inline styles
- Dark mode works
- All functionality preserved

- [x] **Unit 4.2: Migrate ProblemSet page**

**Goal:** Apply new design system to ProblemSet

**Requirements:** R1, R6

**Dependencies:** Phase 2, Phase 3

**Files:**
- Modify: `frontend/src/pages/user/ProblemSet.tsx`
- Modify: Related components

**Approach:**
- Replace inline styles with Tailwind classes
- Use new Badge/StatusBadge variants for difficulty/status
- Apply Linear card styles for problem list
- Ensure dark mode works

**Patterns to follow:**
- New design system tokens
- Linear list/card patterns

**Test scenarios:**
- Happy path: ProblemSet renders with new design
- Edge case: Filter/sort functionality works
- Edge case: Dark mode renders correctly
- Verification: No inline styles remain

**Verification:**
- ProblemSet matches Linear aesthetic
- No inline styles
- Dark mode works
- All functionality preserved

- [x] **Unit 4.3: Migrate Submission page**

**Goal:** Apply new design system to Submission

**Requirements:** R1, R6

**Dependencies:** Phase 2, Phase 3

**Files:**
- Modify: `frontend/src/pages/user/Submission.tsx`
- Modify: Related components

**Approach:**
- Replace inline styles with Tailwind classes
- Use Monaco Editor with lazy loading
- Apply Linear code editor styling
- Ensure dark mode works

**Patterns to follow:**
- New design system tokens
- Linear code editor patterns

**Test scenarios:**
- Happy path: Submission page renders with new design
- Edge case: Monaco Editor loads correctly (lazy)
- Edge case: Dark mode renders correctly
- Verification: No inline styles remain

**Verification:**
- Submission page matches Linear aesthetic
- Monaco Editor works
- Dark mode works
- All functionality preserved

- [x] **Unit 4.4: Migrate Admin pages**

**Goal:** Apply new design system to all admin pages

**Requirements:** R1, R6

**Dependencies:** Phase 2, Phase 3

**Files:**
- Modify: `frontend/src/pages/admin/*.tsx`
- Modify: Related components

**Approach:**
- Replace inline styles with Tailwind classes
- Use new form components (Select, Checkbox, etc.)
- Apply Linear table styles
- Ensure dark mode works

**Patterns to follow:**
- New design system tokens
- Linear admin patterns

**Test scenarios:**
- Happy path: Admin pages render with new design
- Edge case: CRUD operations work
- Edge case: Dark mode renders correctly
- Verification: No inline styles remain

**Verification:**
- Admin pages match Linear aesthetic
- No inline styles
- Dark mode works
- All functionality preserved

- [x] **Unit 4.5: Migrate Community pages**

**Goal:** Apply new design system to community pages

**Requirements:** R1, R6

**Dependencies:** Phase 2, Phase 3

**Files:**
- Modify: `frontend/src/pages/community/*.tsx`
- Modify: Related components

**Approach:**
- Replace inline styles with Tailwind classes
- Apply Linear card/list styles
- Ensure dark mode works

**Patterns to follow:**
- New design system tokens
- Linear content patterns

**Test scenarios:**
- Happy path: Community pages render with new design
- Edge case: Discussion/comment functionality works
- Edge case: Dark mode renders correctly
- Verification: No inline styles remain

**Verification:**
- Community pages match Linear aesthetic
- No inline styles
- Dark mode works
- All functionality preserved

- [x] **Unit 4.6: Migrate remaining pages**

**Goal:** Apply new design system to all remaining pages

**Requirements:** R1, R6

**Dependencies:** Phase 2, Phase 3

**Files:**
- Modify: `frontend/src/pages/**/*.tsx` (remaining)
- Modify: Related components

**Approach:**
- Replace inline styles with Tailwind classes
- Ensure consistency across all pages
- Verify dark mode works everywhere

**Patterns to follow:**
- New design system tokens

**Test scenarios:**
- Happy path: All pages render with new design
- Edge case: All interactive elements work
- Verification: No inline styles remain anywhere

**Verification:**
- All pages match Linear aesthetic
- Zero inline styles across codebase
- Dark mode works everywhere

### Phase 5: Optimization & Testing (Weeks 7-8)

- [x] **Unit 5.1: Implement Monaco Editor lazy loading**

**Goal:** Remove Monaco from initial bundle

**Requirements:** R7

**Dependencies:** None (can start in parallel with Phase 4)

**Files:**
- Modify: `frontend/src/components/editor/MonacoEditor.tsx`
- Modify: Pages using Monaco Editor

**Approach:**
- Wrap Monaco Editor in React.lazy
- Add Suspense with loading skeleton
- Ensure proper error boundary
- Test bundle size reduction

**Patterns to follow:**
- Existing React.lazy patterns in App.tsx

**Test scenarios:**
- Happy path: Monaco Editor loads on demand
- Happy path: Loading skeleton shows while loading
- Edge case: Error boundary catches load failures
- Verification: Monaco not in initial bundle

**Verification:**
- Monaco Editor loads lazily
- Loading state works
- Bundle size reduced
- No functionality regression

- [x] **Unit 5.2: Implement Recharts lazy loading**

**Goal:** Remove Recharts from initial bundle

**Requirements:** R7

**Dependencies:** None (can start in parallel with Phase 4)

**Files:**
- Modify: Pages using Recharts (admin dashboards)

**Approach:**
- Wrap Recharts components in React.lazy
- Add Suspense with loading skeleton
- Ensure proper error boundary

**Patterns to follow:**
- Existing React.lazy patterns

**Test scenarios:**
- Happy path: Charts load on demand
- Happy path: Loading skeleton shows while loading
- Edge case: Error boundary catches load failures
- Verification: Recharts not in initial bundle

**Verification:**
- Recharts loads lazily
- Loading state works
- Bundle size reduced
- No functionality regression

- [x] **Unit 5.3: Add component tests for redesigned components**

**Goal:** Ensure 80%+ test coverage for all new/redesigned components

**Requirements:** R8

**Dependencies:** Phase 2, Phase 3

**Files:**
- Create: `frontend/src/components/ui/__tests__/*.test.tsx` (all components)

**Approach:**
- Write tests for all new components (Select, Checkbox, Radio, Switch, Textarea, Tooltip)
- Write tests for all redesigned components
- Test all variants and states
- Test dark mode rendering

**Patterns to follow:**
- Existing test patterns in __tests__/

**Test scenarios:**
- Happy path: Component renders correctly
- Happy path: All variants work
- Edge case: Interactive states function
- Edge case: Dark mode renders correctly
- Verification: Coverage >80%

**Verification:**
- All components have tests
- Coverage meets 80% threshold
- All tests pass

- [x] **Unit 5.4: Add E2E tests for critical flows**

**Goal:** Ensure core user flows work with new design

**Requirements:** R8

**Dependencies:** Phase 4

**Files:**
- Create: `frontend/e2e/**/*.spec.ts`

**Approach:**
- Write E2E tests for login/register flow
- Write E2E tests for problem submission flow
- Write E2E tests for contest participation flow
- Write E2E tests for admin CRUD operations
- Test dark mode toggle

**Patterns to follow:**
- Existing E2E test patterns

**Test scenarios:**
- Happy path: User can login and access dashboard
- Happy path: User can submit code and see results
- Happy path: Admin can manage problems
- Edge case: Dark mode persists across pages
- Verification: All critical flows pass

**Verification:**
- All E2E tests pass
- Critical flows work correctly
- Dark mode works end-to-end

- [x] **Unit 5.5: Performance optimization and bundle analysis**

**Goal:** Verify bundle size reduction and performance improvements

**Requirements:** R7

**Dependencies:** Unit 5.1, Unit 5.2

**Files:**
- N/A (analysis only)

**Approach:**
- Run bundle analyzer to verify Monaco/Recharts are lazy
- Measure Lighthouse scores
- Identify any remaining optimization opportunities
- Document performance improvements

**Patterns to follow:**
- Vite build analysis tools

**Test scenarios:**
- Happy path: Bundle size reduced by expected amount
- Happy path: Lighthouse score improved
- Verification: Monaco/Recharts not in initial bundle

**Verification:**
- Bundle size meets targets
- Performance improved
- No regressions

- [x] **Unit 5.6: Create component documentation**

**Goal:** Document all components for team reference

**Requirements:** R2

**Dependencies:** Phase 2, Phase 3

**Files:**
- Create: `docs/components/README.md`
- Create: `docs/components/*.md` (per component)

**Approach:**
- Document all component variants
- Add usage examples
- Document props interface
- Add design guidelines

**Patterns to follow:**
- shadcn/ui documentation style

**Test scenarios:**
- N/A (documentation only)

**Verification:**
- All components documented
- Usage examples are clear
- Props are well-documented

## System-Wide Impact

- **Interaction graph:** All pages will use new component variants. Theme toggle affects all components globally.
- **Error propagation:** Component errors should be caught by error boundaries. Toast notifications for user-facing errors.
- **State lifecycle risks:** Theme persistence must sync with localStorage. No partial theme states.
- **API surface parity:** No API changes needed. Frontend-only refactoring.
- **Integration coverage:** Theme switching, component interactions, and page layouts need integration testing.
- **Unchanged invariants:** Backend API contracts remain unchanged. Existing functionality preserved.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| oklch → hex conversion causes color differences | Use precise conversion tools, visual review |
| Dark mode work exceeds timeline | Prioritize core pages, defer non-critical pages |
| Page migration breaks existing functionality | Test each page thoroughly before moving on |
| Bundle size doesn't meet targets | Profile and optimize further if needed |
| Design inconsistency across components | Establish clear design tokens, code review |

## Documentation / Operational Notes

- Component documentation in `docs/components/`
- Design token reference in `frontend/src/index.css` comments
- Theme switching guide for developers
- Migration guide for updating existing pages

## Sources & References

- **Origin document:** [docs/brainstorms/ui-refactoring-requirements.md](docs/brainstorms/ui-refactoring-requirements.md)
- Linear design system (design reference)
- shadcn/ui documentation (component patterns)
- Tailwind CSS v4 documentation (@theme inline)
