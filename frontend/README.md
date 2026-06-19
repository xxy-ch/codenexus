# CodeNexus Frontend

React + TypeScript + Vite frontend for the CodeNexus online judge.

## Runtime

- React 19
- TypeScript 5.9
- Vite 7
- Tailwind CSS v4
- TanStack React Query
- Zustand
- React Hook Form + Zod
- Axios
- Lucide icons

## Local Development

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173` and expects the API at `http://localhost:3000` unless `VITE_API_BASE_URL` is set.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
npm run test:run
npm run test:e2e
```

The Docker frontend image serves the production build through nginx on container port `80`; `docker-compose.yml` maps it to host port `5173`.

## Delivered Surfaces

- Authentication: login, registration, protected routes, logout, token refresh.
- Student flows: dashboard, problem set, problem detail, IDE solve page, submissions, submission detail, contests, ranking, learning roadmap, profile, settings.
- Community flows: discussions, blogs, comments, and direct-message conversations.
- Teacher flows: class management, batch student enrollment, assignments, assignment reports, contest wizard, and problem settings.
- Admin/root flows: user and problem management, judge settings, feature flags, plagiarism/similarity controls, batch import/export, and queue views.

## Notes

- Direct messages currently use REST queries/mutations plus unread counts; they are not pushed live over WebSocket.
- Learning roadmap nodes are static topology cards driven by user stats and problem tags.
- Feature availability is resolved through `/features/resolved`; disabled routes are still enforced by backend feature gates.
- Vite splits large editor/chart/flow dependencies into manual vendor chunks to keep the current build warning-free without changing runtime UI.
