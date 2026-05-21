---
phase: 8
status: pending_approval
created: 2026-04-16
automated_score: 21/21
---

# Phase 8 — Human Acceptance Testing

**Automated verification:** 21/21 must-haves verified (all pass)
**Human verification required:** 6 items below

---

## Human Test Items

### H-01: Problem ZIP Upload End-to-End

**Steps:**
1. Start backend (PostgreSQL + Redis + API)
2. Log in as teacher
3. Navigate to /batch-operations
4. Upload a valid problem ZIP containing `config.json`, `problem.md`, and test case files

**Expected:**
- Preview table shows problem items with "Valid" status
- Clicking "Confirm Import" creates the problem with correct description, test cases, and config

---

### H-02: Problem Round-Trip (Export → Import)

**Steps:**
1. Export an existing problem as ZIP
2. Re-import the ZIP (same or different organization)

**Expected:**
- Re-imported problem matches original — same title, description, test cases, config values

---

### H-03: User CSV Bulk Import

**Steps:**
1. Create a CSV with 100+ rows (mix of valid students, teachers, duplicates, invalid roles)
2. Log in as admin
3. Upload CSV with a default password via User Import tab

**Expected:**
- All valid users created with correct roles and default password
- Duplicates appear as skipped
- Invalid roles appear as errors
- No partial creation of failed rows

---

### H-04: Batch Operations UI Rendering

**Steps:**
1. Log in as teacher
2. Navigate to /batch-operations via sidebar "Batch Ops" link

**Expected:**
- Page renders with 4 tabs: Problem Import, Problem Export, User Import, User Export
- Each tab shows correct content
- User Import tab includes Default Password field
- User Export tab shows Export CSV button

---

### H-05: Tab State Independence

**Steps:**
1. Upload a file in Problem Import tab (do not confirm)
2. Switch to User Export tab
3. Switch back to Problem Import tab

**Expected:**
- Problem Import tab retains the uploaded file and preview state

---

### H-06: User Import Admin-Only Restriction

**Steps:**
1. Log in as teacher (non-admin)
2. Attempt to use User Import or User Export

**Expected:**
- API returns 403 Forbidden
- UI gracefully handles the error

---

## Verdict

- [ ] All items passed — **approve** phase completion
- [ ] Some items failed — list failures for gap-fix planning
