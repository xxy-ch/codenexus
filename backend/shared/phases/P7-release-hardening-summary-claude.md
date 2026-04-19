# P7: Release Hardening — Frontend Migration Summary

**Phase:** P7 Release Hardening (Claude Code lane)
**Date:** 2026-04-09
**Status:** Complete

## Scope

Migrate all remaining admin, auth, and error pages from hardcoded slate colors / Lucide icons to semantic tokens / Material Symbols. Verify production build, update e2e smoke assertions.

## Files Migrated (this phase)

### Admin pages (6 files, full rewrites)
| File | Lucide icons removed | dark: removed | Key changes |
|------|---------------------|---------------|-------------|
| `AdminDashboard.tsx` | 9 (Activity, ArrowRight, BookCopy, ChevronRight, FileSearch, LayoutGrid, ShieldAlert, SlidersHorizontal, Sparkles) | 2 | Module cards → Material Symbols, gradient header → card layout |
| `UserManagement.tsx` | 7 (AlertTriangle, ChevronRight, BadgeCheck, KeyRound, ShieldPlus, UserCog, Users) | 9 | Role/status badges → semantic token maps, English labels |
| `ProblemManagement.tsx` | 13 (AlertTriangle, ArrowLeft, ArrowRight, BookOpen, ChevronRight, EyeOff, LibraryBig, Pencil, Plus, Search, ShieldCheck, SlidersHorizontal, Trash2) | 0 | Difficulty/status config → semantic tokens, English labels |
| `JudgeSettings.tsx` | 9 (ChevronRight, Database, EyeOff, FileArchive, Loader2, RefreshCw, Save, Settings2, Trash2) | 0 | Test case table → semantic tokens, English labels |
| `ProblemContentConfig.tsx` | 7 (BookText, ChevronRight, Eye, Loader2, Save, Search, Timer, Waypoints) | 0 | err:any → error:unknown, toast feedback added |
| `SimilarityScanConfig.tsx` | 7 (AlertCircle, ChevronRight, Loader2, Play, Save, Shield, SlidersHorizontal) | 0 | toast feedback added, English labels |

### User pages (1 file, small fix)
| File | Change |
|------|--------|
| `ProblemDetail.tsx` | Removed `dark:prose-invert` (1 dark: variant) |

### Auth / Error pages (5 files — migrated earlier in this session)
- `LoginPage.tsx`, `RegisterPage.tsx`, `UnauthorizedPage.tsx`, `NotFound.tsx`, `ServerError.tsx`

### Plagiarism pages (2 files — migrated earlier in this session)
- `PlagiarismReportList.tsx`, `PlagiarismReportDetail.tsx`

### E2E test
- `e2e/smoke.spec.ts` — Updated 3 heading assertions from Chinese to English text

## Token Migration Pattern Applied

| Before | After |
|--------|-------|
| `border-slate-200` | `border-border` |
| `bg-white` | `bg-card` |
| `bg-slate-50` / `bg-slate-100` | `bg-muted/50` / `bg-muted` |
| `text-slate-950` / `text-slate-900` | `text-foreground` |
| `text-slate-600` / `text-slate-500` / `text-slate-400` | `text-muted-foreground` |
| `bg-slate-950` | `bg-foreground` |
| `text-white` (on dark bg) | `text-background` |
| `rounded-[28px]` / `rounded-[24px]` | `rounded-lg` |
| `focus:border-blue-400 focus:ring-4 focus:ring-blue-100` | `focus:border-primary focus:ring-2 focus:ring-primary/20` |
| `dark:bg-xxx dark:text-xxx` | Semantic tokens (no dark: needed) |
| `err: any` | `error: unknown` with safe narrowing |
| Lucide `<Icon className="h-4 w-4" />` | `<span className="material-symbols-outlined text-base">icon</span>` |

## Verification

- **Build:** Passes in 18.45s
- **Lucide imports:** 0 remaining in page files
- **dark: variants:** 168 remaining, all in infrastructure components (shadcn/ui primitives, layouts, editor/IDE components) — outside page migration scope
- **E2E smoke:** Updated to match new English headings

## Cumulative Migration Status (P3–P7)

All page-level files now use semantic tokens and Material Symbols. The design system is consistent across the entire frontend surface:

- **P3:** Auth RBAC tenant pages
- **P4:** Problem / testcase admin pages (first pass)
- **P5:** Contest scoreboard, assignment report
- **P6:** Blog, discussions, search (8 community pages)
- **P7:** Remaining admin pages, auth/error pages, plagiarism pages, e2e smoke update

## Chrome 109 Compatibility Note

The semantic token system uses oklch CSS custom properties with fallbacks. oklch is supported from Chrome 111+. For Chrome 109 compatibility on Windows 7, the CSS custom properties should include srgb fallback values. This can be addressed in a follow-up pass if needed — the current build targets modern Chromium and Vite's default targets.
