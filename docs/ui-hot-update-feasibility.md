# UI Hot Update Feasibility

## Verdict

Runtime hot update is feasible for route-level UI modules, but it should be introduced as a controlled module-manifest reload, not as arbitrary remote JavaScript execution.

## Current Modular Base

- `frontend/src/router/registry.tsx` is now the single route and navigation registry.
- Feature areas export `AppRouteModule` objects under `frontend/src/router/modules/`.
- `App.tsx` renders public, workspace, teacher, and admin routes from registry output.
- Feature flags are evaluated at render time, so route availability can change without mutating route definitions.

## Safe Hot Update Shape

1. The backend or feature gateway publishes a signed module manifest containing module ids, enabled flags, chunk URLs, integrity hashes, and minimum app version.
2. The frontend polls or subscribes to manifest updates, validates the app version and integrity metadata, then reloads the affected route registry entries.
3. Route-level modules are lazy-loaded and mounted behind the same auth, role, and feature-flag gates as built-in modules.
4. Failed module loads fall back to the existing stable route or to `/404`; they must not break the whole shell.

## Constraints

- Do not hot-load unsigned code.
- Do not let a remote module bypass `ProtectedRoute`, `TeacherRoute`, or `AdminRoute`.
- Do not allow remote modules to mutate global query clients, auth state, or transport clients outside an explicit adapter.
- Chrome 119 compatibility should remain a build gate for any remotely loaded UI chunk.

## Recommended Next Step

Introduce a typed `RemoteRouteModuleManifest` contract and a non-executing manifest loader test first. After that, add one internal remote module behind a disabled feature flag and verify rollback behavior before enabling live hot updates.
