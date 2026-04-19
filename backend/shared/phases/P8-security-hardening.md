# P8: Security Hardening + Chrome 109 Compatibility

## Phase Identity

- Phase: `P8`
- Owner: `Claude Code`
- Status: `completed`
- Date: 2026-04-09

## Goal

Address remaining security and compatibility issues discovered during the post-P0 full security rescan. Ensure the frontend renders correctly on Chrome 109 (last Chrome version available on Windows 7) for school deployment.

## In Scope

### Chrome 109 Compatibility (P7 follow-up)

- Convert all `oklch()` CSS values in `index.css` to hex/srgb fallbacks
- Use `@supports (color: oklch(0 0 0))` for progressive enhancement
- Hex values computed via chroma-js for accuracy
- Vite build target already set to `chrome109`

### Rate Limiting (P1-3)

- Add rate limiting middleware to API using tower-governor
- Protect `/auth/login` and `/auth/register` (10 req/min)
- Protect POST `/submissions` (30 req/min)
- Return 429 with JSON body when rate limited

### TSX Type Errors (IDE noise)

- Settings.tsx, Profile.tsx, LearningRoadmap.tsx show "Property does not exist on JSX.IntrinsicElements" in IDE
- `tsc --noEmit` passes clean — these are IDE/LSP diagnostics, not real build errors
- Root cause: likely `types: ["vite/client"]` in tsconfig.app.json restricting type resolution
- No action needed — builds pass, runtime unaffected

## Out Of Scope (at time of P8)

- ~~P0-L1: JWT in localStorage → httpOnly cookies (requires full auth architecture migration)~~ → **FIXED** in Phase B auth migration (2026-04-11)
- ~~P1-1: Sandbox integration in execution path (needs design work)~~ → **FIXED** in Phase A sandbox integration (2026-04-11)
- ~~P1-5: CSRF protection (bundles with P0-L1 auth migration)~~ → **FIXED** via SameSite=Strict cookies (2026-04-11)

## Files Changed

- `frontend/src/index.css` — oklch → hex fallbacks with @supports
- `api/src/middleware/rate_limit.rs` — new file, tower-governor rate limiter
- `api/src/middleware/mod.rs` — export rate_limit module
- `api/src/main.rs` — wire rate limiting into router
- `api/Cargo.toml` — add tower-governor dependency

## Acceptance Criteria

- [x] CSS uses hex fallbacks that work in Chrome 109
- [x] oklch values preserved for modern browsers via @supports
- [x] Rate limiting active on auth and submission endpoints
- [x] `cargo build` passes
- [x] `vite build` passes with target chrome109
