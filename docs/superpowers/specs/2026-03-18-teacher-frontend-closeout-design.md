# Teacher Frontend Closeout Design

## Goal

Close out the remaining teacher-side frontend scope with a unified flat modern shell that works on Chrome 96+, while keeping all interactions tied to real backend capabilities. The work covers the global sidebar shell, the assignment report page, and the contest wizard.

## Constraints

- Browser target is Chrome 96+.
- Visual style should be flat, modern, and minimal rather than glossy or heavily shadowed.
- The sidebar change is global and must apply across the main application shell, not only teacher pages.
- Pages must avoid fake data and fake successful actions.
- Existing backend contracts should be reused wherever possible.
- If a teacher workflow step has no real backend support, the UI must degrade honestly and route the user to the next real configuration surface instead of pretending the step is finished.

## Existing Context

### Global Shell

- `frontend/src/components/layout/Sidebar.tsx` is currently a fixed-width static sidebar.
- `frontend/src/layouts/MainLayout.tsx` assumes a permanently expanded sidebar.
- `frontend/src/components/layout/Header.tsx` is visually inconsistent with the newer teacher pages.
- `frontend/src/index.css` currently includes styling patterns that are broader than needed and should be kept compatible with Chrome 96+.

### Teacher Pages

- `frontend/src/pages/teacher/ClassManagement.tsx` now has real write-path behavior and should become the visual baseline for the remaining teacher pages.
- `frontend/src/pages/teacher/AssignmentReport.tsx` currently renders a real-data placeholder report driven only by class list data.
- `frontend/src/pages/teacher/ContestWizard.tsx` currently presents a multi-step layout visually, but only the basic contest creation call is real.

### Data Services

- `frontend/src/services/classes.ts` exposes real class, assignment, student, and assignment submission reads.
- Contest creation uses the generic API client directly from `ContestWizard.tsx`; this should be normalized into clearer step-aware behavior during the closeout.

## Design

### 1. Global Sidebar and Layout Shell

#### Sidebar behavior

The sidebar becomes a two-state global shell:

- `expanded`: full labels, grouping, teacher actions visible inline
- `collapsed`: icon-only navigation with accessible labels/tooltips

The state is controlled by both:

- manual toggle from the sidebar header
- automatic collapse at narrower viewport widths

Manual choice should be persisted locally and take precedence when the viewport still reasonably supports it. Automatic collapse should apply when the viewport becomes too narrow for the expanded shell to remain usable.

#### Sidebar visual language

The new shell should follow a flat teacher/admin-compatible style:

- plain neutral surface
- thin borders
- low or nearly absent shadows
- active state via solid fill or subtle tinted row
- simplified typography hierarchy
- no loud gradients or glowing controls

This visual treatment should also make the rest of the application look more consistent once teacher pages are opened from the same shell.

#### Layout impact

`MainLayout` should react to the sidebar width rather than assuming a fixed `w-64` shell. The content region should smoothly adapt to the collapsed width while keeping the header stable. This should be done through explicit CSS classes and standard responsive layout techniques that are safe on Chrome 96+.

### 2. Assignment Report

#### Page objective

`AssignmentReport` should become a real teacher report page that supports:

- class selection
- assignment selection
- refresh
- CSV export
- real summary metrics
- student-level reporting rows

#### Data model

The report is built entirely from real, already-supported data sources:

- classes: `classesService.getClasses`
- assignments: `classesService.listAssignments(classId)`
- class students: `classesService.getClassStudents(classId)`
- assignment submissions: `classesService.getAssignmentSubmissions(assignmentId)`

The frontend composes a report view model by joining:

- every student in the selected class
- every submission for the selected assignment

Each student must appear even if they have no submission.

#### Student row semantics

For each student row:

- submission count = number of submissions for that assignment
- best score = maximum score across that student’s submissions
- latest submission time = most recent submission timestamp
- overdue flag = whether the submission that produced the best score was late
- current status = derived label such as `未提交`, `已提交`, `已逾期`, `高分通过`

The “best-score submission decides overdue” rule is the agreed reporting semantics.

#### Summary metrics

The top summary band should show metrics derived from the joined model:

- total students
- students with at least one submission
- completion rate
- average best score
- on-time rate based on best-score submissions

#### Visualization and tables

The page should keep visualization lightweight and implementation-safe:

- score bucket distribution
- submission status distribution
- recent submission activity summary

Below that, the main report table should include:

- student
- email
- submission count
- best score
- latest submission time
- overdue flag
- derived status

#### Export

CSV export should operate entirely in the browser and export the currently selected class and assignment view. Exported columns should at minimum include:

- class name
- assignment identifier
- student name
- email
- submission count
- best score
- latest submission time
- overdue flag
- status

#### Empty-state and error behavior

The report must honestly degrade:

- no classes: teacher sees a setup prompt
- no assignments: selected class shows a no-assignment state
- no submissions: students still render with zero-state metrics
- request failure: explicit retry state, no fabricated analytics

### 3. Contest Wizard

#### Page objective

`ContestWizard` should become a real step-driven creation flow rather than a single-page form wrapped in step chrome.

#### Step model

The wizard remains a 4-step experience:

1. Basic information
2. Problems
3. Participants
4. Rules and publish settings

The page should support:

- step navigation
- previous/next controls
- local draft preservation
- clear status on which steps are fully real and which are partial

#### Real backend behavior

Step 1 must remain fully real:

- create contest with real backend payload

Steps 2 and 3 should only activate real actions if the current backend already supports them. If not, the UI should not fake completion. Instead, it should:

- explain the missing live configuration step
- route the user to the next real surface if one exists
- keep the contest creation flow coherent

Step 4 should submit only fields that the backend truly accepts now, such as:

- ruleset
- freeze minutes
- basic visibility-related state where supported

Any unsupported visibility or access-control behavior should be clearly marked as not yet active server-side.

#### Post-create continuation

After successful contest creation, the wizard should not dead-end. It should either:

- move the user to a real contest detail/configuration screen, or
- keep them in the wizard with the new contest context loaded for the remaining real steps

The implementation should choose the simplest path that keeps the flow honest and usable.

### 4. Compatibility and Styling Rules

To stay safe on Chrome 96+:

- use standard flex and grid
- avoid depending on newer CSS functions or advanced typographic utilities
- avoid fragile animation patterns
- keep transitions subtle and optional
- prefer explicit sizing and spacing over newer layout abstractions

The visual result should be:

- flatter
- quieter
- more consistent
- easier to render predictably on older Chrome versions

## File Impact

### Primary modifications

- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/layouts/MainLayout.tsx`
- `frontend/src/components/layout/Header.tsx`
- `frontend/src/index.css`
- `frontend/src/pages/teacher/AssignmentReport.tsx`
- `frontend/src/pages/teacher/ContestWizard.tsx`
- `frontend/src/services/classes.ts`

### Likely additional files

- teacher-page tests under `frontend/src/pages/teacher/__tests__/`
- layout-related tests if needed
- a dedicated contest service helper if extracting API logic improves clarity

## Testing Strategy

### Sidebar and shell

- verify manual collapse/expand
- verify automatic collapse behavior at narrower widths
- verify persisted state is restored
- verify navigation remains usable in collapsed mode

### Assignment report

- verify class selection loads assignments and students
- verify assignment selection loads submissions
- verify student rows include zero-submission students
- verify best-score aggregation
- verify overdue derives from the best-score submission
- verify CSV export uses the currently selected report state
- verify no-data and error states

### Contest wizard

- verify step navigation
- verify step 1 real create behavior
- verify local draft restoration
- verify unsupported steps degrade honestly
- verify success path routes to the next real configuration surface

## Risks

- `AssignmentReport` richness is limited by current backend read contracts.
- `ContestWizard` completeness depends on whether contest-problem and participant configuration routes are already usable.
- The global sidebar affects the entire app, so layout regressions are possible outside teacher pages and need targeted smoke verification.

## Recommended Execution Order

1. Global sidebar and layout shell
2. Assignment report real closeout
3. Contest wizard real closeout

This order stabilizes the app shell first, then completes the higher-value teacher report page, then finishes the more conditional contest workflow.
