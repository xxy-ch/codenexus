# Draft: Online_Judge Project Completion Plan

## Current State Assessment (2026-02-22)
- **Frontend**: Mostly UI-complete (up to Phase 10) but HEAVILY reliant on mock data (`USE_MOCK_DATA = true`). Almost all API services (`users.ts`, `problems.ts`, `discussions.ts`, `contests.ts`, `admin.ts`, etc.) short-circuit to static mock arrays.
- **Backend**: API routes are defined and DB migrations exist, but there are multiple stubs (e.g. `leaderboard/service.rs`, `judge-worker/sandbox`, `search/service.rs`).
- **Test Infrastructure**:
  - Frontend: Non-existent. `.test.tsx` files exist but `vitest` is not even in `package.json`. Tests that do exist only mock the mock services.
  - Backend: Standard `cargo test` works but coverage needs improvement.

## Requirements (Confirmed)
1. **Prioritize Tech Debt Clearance**: Remove all `USE_MOCK_DATA` flags, connect real APIs, and remove backend stubs/dummies.
2. **Test-Driven Development (TDD)**: Every task must start with tests. Real testing infrastructure must be established first.
3. **Ensure Real API Calls**: End-to-End verification to ensure the frontend is talking to the real Rust backend, not mock data.
4. **Complete Remaining Features**: Implement the remaining Phase 10+ items (Notifications, Content Management, Advanced Community, Exports).

## Strategic Approach
1. **Wave 1: Test Infrastructure & Tech Debt (Backend)** - Clear out all backend dummy data so the APIs are 100% functional.
2. **Wave 2: Test Infrastructure & Tech Debt (Frontend)** - Setup Vitest/Playwright, remove all `USE_MOCK_DATA`, and hook up real Axios API calls. E2E verification.
3. **Wave 3: Notifications & WebSocket** (TDD)
4. **Wave 4: Content Management & Advanced Community** (TDD)
5. **Wave 5: Analytics & Export** (TDD)

## Guardrails (Must NOT Have)
- NO MORE `vi.mock()` for API responses in E2E testing. We must test against the real backend or a real test DB.
- NO NEW FEATURES until `USE_MOCK_DATA` is completely eradicated from the codebase.
