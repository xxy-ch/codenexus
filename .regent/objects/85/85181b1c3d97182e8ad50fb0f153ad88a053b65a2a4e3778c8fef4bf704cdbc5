---
phase: 15
milestone: v1.0
created: 2026-04-20
---

# Phase 15 Discussion Log

## Session: 2026-04-20

### Gray Area 1: Page Completion Priority

**Question:** Frontend is more complete than expected. Only 3 real TODOs remain. What should Phase 15 focus on?

**Options presented:**
- A: Fix remaining TODOs only (fast closure)
- B: Add new feature pages (DailyChallenge, Achievements)
- C: Polish existing pages (skeleton, empty states, error boundaries)
- D: All of the above, wave-based

**User chose:** D — All, wave-based

**Rationale:** Phase 15 was created specifically for remaining frontend work. Do everything: fix TODOs first (quick wins), then polish, then evaluate new pages. Prioritize by impact and dependency.

---

### Gray Area 2: UI Polish Level

**Question:** What level of visual polish for existing pages?

**Options presented:**
- A: Production-grade (skeleton, empty state, loading, error boundary, unified design tokens)
- B: Basic usable (loading + error only)
- C: Fix obvious visual issues only

**User chose:** A — Production-grade

**Rationale:** This is the final frontend phase before v1.0 delivery. Pages should feel polished and consistent, not just functional.

---

### Gray Area 3: Testing Strategy

**Question:** Existing test files have format issues. How to handle frontend testing?

**Options presented:**
- A: TDD full coverage — every component gets vitest tests, 80%+ target
- B: E2E critical flows only — Playwright for login/submit/leaderboard
- C: Skip tests this round

**User chose:** A — TDD full coverage

**Rationale:** Test infrastructure exists (vitest, @testing-library/react, jsdom configured). Fixing existing tests and adding new ones ensures regression safety for v1.0.

---

### Gray Area 4: Responsive / Mobile

**Question:** OJ platform is primarily PC. What responsive support level?

**Options presented:**
- A: Full responsive (all pages work on mobile/tablet)
- B: PC only (1280px+)
- C: Critical pages responsive (problems, submissions, leaderboard)

**User chose:** B — PC only

**Rationale:** Educational platform, students use lab PCs. Mobile is nice-to-have but not v1.0 scope. Sidebar always visible, tables use full width.
