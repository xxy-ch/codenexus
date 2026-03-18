# Teacher Frontend Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the remaining teacher-side frontend scope with a global collapsible sidebar, a real assignment report workflow, and a real step-driven contest wizard that degrades honestly where backend support is limited.

**Architecture:** Update the global shell first so all pages inherit the same flat, Chrome-96-safe layout behavior. Then build the assignment report on top of existing classes and submissions data by composing frontend view models from real APIs. Finally, convert the contest wizard from a static multi-section form into a real stateful flow that uses only supported backend actions and explicitly gates unsupported steps.

**Tech Stack:** React 19, React Router, TanStack Query, TypeScript, Vite, Vitest, Tailwind CSS, browser-side CSV export via Blob APIs.

---

### Task 1: Build the Global Collapsible Sidebar Shell

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/layouts/MainLayout.tsx`
- Modify: `frontend/src/components/layout/Header.tsx`
- Modify: `frontend/src/index.css`
- Test: `frontend/src/components/layout/__tests__/Sidebar.test.tsx`

- [ ] **Step 1: Write the failing sidebar behavior tests**

Create `frontend/src/components/layout/__tests__/Sidebar.test.tsx` covering:
- manual collapse toggle
- restore persisted state from `localStorage`
- collapsed mode still renders nav links accessibly
- auto-collapse when window width is below the chosen breakpoint

Use a minimal `MemoryRouter` harness and mock `useAuth`.

- [ ] **Step 2: Run the sidebar tests to verify they fail**

Run:
```bash
npm test -- --run src/components/layout/__tests__/Sidebar.test.tsx
```

Expected:
- FAIL because the current sidebar has no collapse state, no persistence, and no auto-collapse behavior.

- [ ] **Step 3: Add sidebar state and persistence**

Implement in `frontend/src/components/layout/Sidebar.tsx`:
- `expanded` / `collapsed` rendering states
- manual toggle button in the sidebar header
- `localStorage` persistence key for manual preference
- responsive auto-collapse using safe `window.innerWidth` logic in `useEffect`
- collapsed-mode icon-only rows with `title` or equivalent accessible labeling

Do not introduce a global store unless clearly necessary.

- [ ] **Step 4: Wire layout width classes through `MainLayout`**

Update `frontend/src/layouts/MainLayout.tsx` so content width reacts to the sidebar state instead of assuming a fixed expanded width. Use ordinary flex and explicit width classes compatible with Chrome 96+.

- [ ] **Step 5: Simplify header and shell visual language**

Adjust `frontend/src/components/layout/Header.tsx` and `frontend/src/index.css` to:
- reduce heavy shadows
- flatten gradients
- align with the teacher-page baseline
- avoid newer CSS features not required for Chrome 96+

- [ ] **Step 6: Run the sidebar tests to verify they pass**

Run:
```bash
npm test -- --run src/components/layout/__tests__/Sidebar.test.tsx
```

Expected:
- PASS

- [ ] **Step 7: Commit the shell changes**

```bash
git add frontend/src/components/layout/Sidebar.tsx frontend/src/layouts/MainLayout.tsx frontend/src/components/layout/Header.tsx frontend/src/index.css frontend/src/components/layout/__tests__/Sidebar.test.tsx
git commit -m "feat: add collapsible global sidebar shell"
```

### Task 2: Refactor Assignment Report Data Flow Around Real Class and Assignment Data

**Files:**
- Modify: `frontend/src/pages/teacher/AssignmentReport.tsx`
- Modify: `frontend/src/services/classes.ts`
- Test: `frontend/src/pages/teacher/__tests__/AssignmentReport.test.tsx`

- [ ] **Step 1: Write failing report data tests**

Create `frontend/src/pages/teacher/__tests__/AssignmentReport.test.tsx` covering:
- class selection loads assignments
- assignment selection loads submissions
- students with no submissions still appear
- best score is selected across multiple submissions
- overdue status uses the best-score submission
- empty states for no classes / no assignments / no submissions

- [ ] **Step 2: Run the report tests to verify they fail**

Run:
```bash
npm test -- --run src/pages/teacher/__tests__/AssignmentReport.test.tsx
```

Expected:
- FAIL because the current report page only summarizes classes and has no class/assignment switching or student-level join logic.

- [ ] **Step 3: Normalize any missing class service helpers**

In `frontend/src/services/classes.ts`, add or tidy the exact helpers needed by the report page so the component does not build request URLs inline.

Keep the service focused on:
- listing classes
- listing assignments for a class
- listing students for a class
- listing submissions for an assignment

- [ ] **Step 4: Build the report view-model join**

In `frontend/src/pages/teacher/AssignmentReport.tsx`, replace the placeholder summary-only flow with:
- selected class state
- selected assignment state
- query-driven data loading
- joined student report rows
- derived summary metrics

Derived row fields must include:
- submission count
- best score
- latest submission time
- overdue flag based on the best-score submission
- readable status label

- [ ] **Step 5: Render the flat report UI**

Still in `frontend/src/pages/teacher/AssignmentReport.tsx`, render:
- top filter bar
- summary cards
- light-weight distribution panels
- student report table
- honest zero states and retry states

Use the flat visual language established by Task 1.

- [ ] **Step 6: Add CSV export**

Implement browser-side CSV export from the current selected class and assignment view using `Blob`, `URL.createObjectURL`, and a temporary anchor click.

Export columns must include:
- class name
- assignment id
- student name
- email
- submission count
- best score
- latest submission time
- overdue
- status

- [ ] **Step 7: Run the report tests to verify they pass**

Run:
```bash
npm test -- --run src/pages/teacher/__tests__/AssignmentReport.test.tsx
```

Expected:
- PASS

- [ ] **Step 8: Commit the report changes**

```bash
git add frontend/src/pages/teacher/AssignmentReport.tsx frontend/src/services/classes.ts frontend/src/pages/teacher/__tests__/AssignmentReport.test.tsx
git commit -m "feat: add real teacher assignment report workflow"
```

### Task 3: Convert Contest Wizard Into a Real Step-Driven Flow

**Files:**
- Modify: `frontend/src/pages/teacher/ContestWizard.tsx`
- Modify: `frontend/src/services/contests.ts` or create it if extracting API logic reduces page complexity
- Test: `frontend/src/pages/teacher/__tests__/ContestWizard.test.tsx`

- [ ] **Step 1: Write failing contest wizard tests**

Create `frontend/src/pages/teacher/__tests__/ContestWizard.test.tsx` covering:
- step navigation
- local draft save and restore
- real contest creation from step 1
- unsupported later steps show honest messaging instead of fake completion
- successful create transitions to the next real continuation surface

- [ ] **Step 2: Run the contest wizard tests to verify they fail**

Run:
```bash
npm test -- --run src/pages/teacher/__tests__/ContestWizard.test.tsx
```

Expected:
- FAIL because the current page is not a true step-managed wizard and only partially uses real backend behavior.

- [ ] **Step 3: Move contest API calls behind a service boundary if needed**

If `ContestWizard.tsx` still uses the generic API client directly, extract the minimal helper into `frontend/src/services/contests.ts` or another existing service module so the page logic stays focused on step orchestration.

- [ ] **Step 4: Add explicit step state and draft persistence**

In `frontend/src/pages/teacher/ContestWizard.tsx`, implement:
- active step state
- previous / next controls
- local draft storage and restoration
- per-step validation gates

- [ ] **Step 5: Keep step 1 fully real**

Still in `ContestWizard.tsx`, preserve and harden the real create behavior:
- validate required fields
- transform local datetime input to API payload
- create the contest via backend
- persist the created contest context for later steps

- [ ] **Step 6: Gate steps 2 and 3 on real backend support**

For problems and participants:
- if current backend routes are available, expose the real controls
- if not, render explicit “not yet active” messaging and route the user to the next real screen instead of simulating save success

Do not add fake mutation success states.

- [ ] **Step 7: Finish the flat wizard UI**

Update the visual structure to:
- align with the flat shell from Task 1
- reduce oversized cards and visual noise
- make the left step rail and bottom actions look like a real workflow tool rather than a marketing layout

- [ ] **Step 8: Run the contest wizard tests to verify they pass**

Run:
```bash
npm test -- --run src/pages/teacher/__tests__/ContestWizard.test.tsx
```

Expected:
- PASS

- [ ] **Step 9: Commit the wizard changes**

```bash
git add frontend/src/pages/teacher/ContestWizard.tsx frontend/src/services/contests.ts frontend/src/pages/teacher/__tests__/ContestWizard.test.tsx
git commit -m "feat: convert teacher contest wizard into real workflow"
```

### Task 4: Run Cross-Feature Regression and Build Verification

**Files:**
- Modify: only files required to fix regressions found during verification
- Test: existing teacher and layout tests

- [ ] **Step 1: Run the focused regression suite**

Run:
```bash
npm test -- --run src/components/layout/__tests__/Sidebar.test.tsx src/pages/teacher/__tests__/AssignmentReport.test.tsx src/pages/teacher/__tests__/ContestWizard.test.tsx src/pages/teacher/__tests__/ClassManagement.test.tsx src/pages/user/__tests__/ProblemIDEEnhanced.test.tsx src/services/__tests__/classes.test.ts
```

Expected:
- PASS

- [ ] **Step 2: Run type checking**

Run:
```bash
npm run typecheck
```

Expected:
- exit code 0

- [ ] **Step 3: Run production build**

Run:
```bash
npm run build
```

Expected:
- successful production build
- chunk size warnings are acceptable unless they become materially worse

- [ ] **Step 4: Fix regressions if verification fails**

If any verification command fails:
- fix the smallest responsible surface
- rerun only the failing command first
- rerun the full verification block once green

- [ ] **Step 5: Commit the verification cleanup**

```bash
git add frontend
git commit -m "test: verify teacher frontend closeout"
```

### Task 5: Final Manual Review Checklist

**Files:**
- Review only

- [ ] **Step 1: Manually inspect global shell behavior**

Confirm:
- sidebar collapse/expand works
- collapsed nav is still understandable
- teacher pages still fit correctly in both sidebar widths

- [ ] **Step 2: Manually inspect Assignment Report**

Confirm:
- class switch updates assignments
- assignment switch updates summary and table
- CSV export reflects current selection
- empty and error states are honest

- [ ] **Step 3: Manually inspect Contest Wizard**

Confirm:
- step state is stable
- draft persistence works
- unsupported steps do not pretend to save
- create success has a clear next action

- [ ] **Step 4: Prepare final summary**

Summarize:
- what changed
- what remains intentionally unsupported
- evidence from tests, typecheck, and build

