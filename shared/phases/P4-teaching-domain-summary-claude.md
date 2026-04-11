# P4 Claude Code Lane Summary

## Status: `completed`

## Changes Made

### 1. classes.ts — Service Layer Update

**File:** `frontend/src/services/classes.ts`

- Added `removeStudent(classId, studentId)` method for enrollment management
- Existing normalization and type coverage confirmed complete

### 2. ClassManagement.tsx — Full Semantic Token Migration

**File:** `frontend/src/pages/teacher/ClassManagement.tsx`

- Replaced all hardcoded `slate-*` colors with semantic tokens (`text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, `text-primary`, `bg-primary/5`, etc.)
- Replaced all plain `<button>` elements with shadcn `Button` component
- Added `removeStudentMutation` using new service method, with remove button per student row
- Added `toast` feedback for all mutations (create class, add student, remove student, import students, create assignment, publish assignment, delete assignment)
- Replaced Chinese text with English for consistency
- Used `Badge` for published/unpublished assignment states and late submission indicators
- Used `cn()` utility for conditional class merging
- All `rounded-[28px]` and `rounded-[24px]` replaced with consistent `rounded-lg`
- Eliminated hardcoded `focus:border-blue-400 focus:ring-4 focus:ring-blue-100` in favor of `focus:border-primary focus:ring-2 focus:ring-primary/20`

### 3. AssignmentReport.tsx — Lucide → Material Symbols + Token Migration

**File:** `frontend/src/pages/teacher/AssignmentReport.tsx`

- Replaced all Lucide icons (`AlertCircle`, `ArrowUpRight`, `BarChart3`, `BookOpen`, `ChevronRight`, `Download`, `FileSpreadsheet`, `GraduationCap`, `Search`, `Users`) with Material Symbols (`error`, `trending_up`, `bar_chart`, `menu_book`, `chevron_right`, `school`, `refresh`, `description`, `group`)
- Migrated all hardcoded colors to semantic tokens
- Removed fake "Export Snapshot" button (no backend support)
- Used shadcn `Button` component
- Simplified card styling from `rounded-[28px]` to `rounded-lg`

### 4. ContestWizard.tsx — Lucide → Material Symbols + Token Migration

**File:** `frontend/src/pages/teacher/ContestWizard.tsx`

- Replaced all Lucide icons (`CalendarDays`, `ChevronRight`, `Eye`, `FileText`, `Globe2`, `Lock`, `ShieldCheck`, `Timer`, `Trophy`) with Material Symbols (`calendar_today`, `chevron_right`, `visibility`, `verified`, `public`, `lock`, `timer`, `emoji_events`)
- Migrated all hardcoded colors to semantic tokens
- Replaced `setMessage()` with `toast.success()` / `toast.error()` for mutation feedback
- Removed fake "Save Draft" button (no backend support)
- Used `cn()` for conditional step/ruleset styling
- Used shadcn `Button` for submit action
- Used `bg-foreground text-background` for dark card accent (most recent class info)
- Step indicator uses `bg-primary/10 text-primary` for active state

## Removed Fake Actions

| Action | File | Reason |
|--------|------|--------|
| Export Snapshot button | AssignmentReport.tsx | No backend export API |
| Save Draft button | ContestWizard.tsx | No draft persistence API |

## Verification

```
npm run build — ✓ built in 20.08s, no errors
```

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/services/classes.ts` | Added `removeStudent` method |
| `frontend/src/pages/teacher/ClassManagement.tsx` | Full semantic token migration, shadcn Button, toast, removeStudent |
| `frontend/src/pages/teacher/AssignmentReport.tsx` | Material Symbols, semantic tokens, removed fake export |
| `frontend/src/pages/teacher/ContestWizard.tsx` | Material Symbols, semantic tokens, toast, removed fake draft |
| `shared/phases/P4-teaching-domain-summary-claude.md` | This summary |

## Acceptance Markers (Claude Code Lane)

- [x] Teacher pages only expose backend-supported actions (fake Export and Save Draft removed)
- [x] Class management includes student removal capability
- [x] All teacher pages use semantic tokens (no hardcoded dark: variants)
- [x] All teacher pages use Material Symbols (no Lucide imports)
- [x] All mutations provide toast feedback
- [x] Frontend smoke build passes
