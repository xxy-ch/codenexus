# Technology Stack

## Overview

Online Judge is a full-stack application with a Rust backend (API + judge-worker), TypeScript/React frontend, shared Rust library, PostgreSQL database, and Redis for caching/messaging.

---

## Languages

| Language | Version | Usage |
|----------|---------|-------|
| Rust | Edition 2021 | API server, judge-worker, shared library |
| TypeScript | ~5.9.3 | Frontend application |
| SQL | PostgreSQL 16 | Database schema and migrations |

## Workspace Structure

```
Online_Judge/              # Cargo workspace root
  Cargo.toml               # Workspace definition (3 members)
  api/                     # REST API + WebSocket server
  judge-worker/            # Code execution service
  shared/                  # Shared types between api and judge-worker
  frontend/                # React SPA
```

## Rust Crates

### Workspace Dependencies (root `Cargo.toml`)

| Crate | Version | Features |
|-------|---------|----------|
| tokio | 1.35 | full |
| axum | 0.7 | json |
| serde | 1.0 | derive |
| serde_json | 1.0 | - |
| tracing | 0.1 | - |
| tracing-subscriber | 0.3 | env-filter |

### API Crate (`api/Cargo.toml`)

| Crate | Version | Purpose |
|-------|---------|---------|
| axum | 0.7 (workspace) | HTTP + WebSocket server |
| sqlx | 0.8 | PostgreSQL driver (runtime-tokio, tls-rustls, postgres, chrono, uuid, migrate) |
| redis | 0.27 | Redis client (tokio-comp, connection-manager) |
| deadpool-redis | 0.22 | Redis connection pool (serde) |
| tower | 0.5 | Middleware stack |
| tower-http | 0.5 | CORS, static files, tracing |
| tower_governor | 0.4 | Rate limiting |
| governor | 0.7 | Rate limiting algorithm |
| jsonwebtoken | 9 | JWT token generation/validation |
| bcrypt | 0.16 | Password hashing |
| chrono | 0.4 | Date/time (serde) |
| uuid | 1.11 | UUID generation (v4, serde) |
| tokio-tungstenite | 0.24 | WebSocket support |
| futures-util | 0.3 | Async stream utilities |
| regex | 1.11 | Search functionality |
| anyhow | 1.0 | Error handling |
| dotenvy | 0.15 | .env file loading |
| headers | 0.4 | HTTP header types |
| hyper | 1 | HTTP types |
| hyper-util | 0.1 | HTTP utilities |
| rand | 0.8 | Random number generation |
| once_cell | 1.20 | Lazy static initialization |

**Dev dependencies**: testcontainers 0.23, testcontainers-modules 0.11, tower (util), tokio-test 0.4, env_logger 0.11

### Judge Worker Crate (`judge-worker/Cargo.toml`)

| Crate | Version | Purpose |
|-------|---------|---------|
| tokio | 1.35 (workspace) | Async runtime |
| sqlx | 0.8 | PostgreSQL driver (runtime-tokio-rustls, postgres, uuid, chrono, time) |
| redis | 0.27 | Redis client (tokio-comp, connection-manager) |
| reqwest | 0.12 | HTTP client to API (json, rustls-tls) |
| nix | 0.29 | Linux syscalls: fs, user, process, hostname |
| libc | 0.2 | Low-level C bindings |
| libseccomp-sys | 0.2 | seccomp sandboxing |
| chrono | 0.4 | Date/time |
| uuid | 1.0 | UUID generation (v4, serde) |

### Shared Crate (`shared/Cargo.toml`)

| Crate | Version | Purpose |
|-------|---------|---------|
| serde | 1.0 (workspace) | Serialization (derive) |
| uuid | 1.11 | UUID types (v4, serde) |

**Dev dependencies**: serde_json 1.0

## Frontend (`frontend/package.json`)

### Package Manager: npm

### Build Target: chrome109

### Framework and Core

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI framework |
| react-dom | ^19.2.0 | DOM renderer |
| react-router-dom | ^7.13.0 | Client-side routing |
| vite | ^7.3.1 | Build tool and dev server |
| typescript | ~5.9.3 | Type system |

### State Management and Data

| Package | Version | Purpose |
|---------|---------|---------|
| zustand | ^5.0.11 | Global state management |
| @tanstack/react-query | ^5.90.21 | Server state / data fetching |
| axios | ^1.13.5 | HTTP client |

### UI and Styling

| Package | Version | Purpose |
|---------|---------|---------|
| tailwindcss | ^4.1.18 | Utility-first CSS |
| @tailwindcss/postcss | ^4.2.1 | PostCSS plugin for Tailwind |
| postcss | ^8.5.6 | CSS processing |
| autoprefixer | ^10.4.24 | Vendor prefixing |
| tw-animate-css | ^1.4.0 | Tailwind animation utilities |
| class-variance-authority | ^0.7.1 | Component variant styling |
| clsx | ^2.1.1 | Conditional class names |
| tailwind-merge | ^3.5.0 | Tailwind class deduplication |
| lucide-react | ^0.577.0 | Icon library |
| @fontsource-variable/geist | ^5.2.8 | Variable font (Geist) |
| shadcn | ^4.2.0 | UI component library |

### Code Editors

| Package | Version | Purpose |
|---------|---------|---------|
| @monaco-editor/react | ^4.7.0 | Monaco editor (code submission) |
| @codemirror/autocomplete | ^6.20.0 | CodeMirror autocomplete |
| @codemirror/commands | ^6.10.2 | CodeMirror commands |
| @codemirror/highlight | ^0.19.8 | CodeMirror syntax highlighting |
| @codemirror/lang-markdown | ^6.5.0 | CodeMirror markdown mode |
| @codemirror/language-data | ^6.5.2 | CodeMirror language support |
| @codemirror/lint | ^6.9.4 | CodeMirror linting |
| @codemirror/search | ^6.6.0 | CodeMirror search |
| @codemirror/state | ^6.5.4 | CodeMirror state |
| @codemirror/theme-one-dark | ^6.1.3 | CodeMirror dark theme |
| @codemirror/view | ^6.39.15 | CodeMirror view |

### Markdown and Content

| Package | Version | Purpose |
|---------|---------|---------|
| react-markdown | ^10.1.0 | Markdown rendering |
| remark-gfm | ^4.0.1 | GitHub Flavored Markdown |
| dompurify | ^3.3.1 | HTML sanitization (XSS prevention) |
| react-syntax-highlighter | ^16.1.0 | Code block syntax highlighting |

### Forms and Validation

| Package | Version | Purpose |
|---------|---------|---------|
| react-hook-form | ^7.71.1 | Form state management |
| zod | ^4.3.6 | Schema validation |
| @hookform/resolvers | ^5.2.2 | Zod resolver for react-hook-form |

### Real-time Communication

| Package | Version | Purpose |
|---------|---------|---------|
| socket.io-client | ^4.8.3 | Socket.IO client (available but native WebSocket used) |

### Charts

| Package | Version | Purpose |
|---------|---------|---------|
| recharts | ^3.7.0 | Charting library |

### Notifications and Misc

| Package | Version | Purpose |
|---------|---------|---------|
| react-hot-toast | ^2.6.0 | Toast notifications |
| uuid | ^13.0.0 | UUID generation |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @vitejs/plugin-react | ^5.1.1 | Vite React plugin |
| vitest | ^1.0.2 | Unit testing framework |
| @testing-library/react | ^16.0.0 | React component testing |
| @testing-library/jest-dom | ^6.1.5 | DOM matchers |
| @testing-library/user-event | ^14.5.2 | User interaction testing |
| jsdom | ^25.0.1 | DOM simulation |
| @playwright/test | ^1.55.0 | E2E testing |
| eslint | ^9.39.1 | Linting |
| eslint-plugin-react-hooks | ^7.0.1 | React hooks linting |
| eslint-plugin-react-refresh | ^0.4.24 | React refresh linting |
| typescript-eslint | ^8.48.0 | TypeScript ESLint |
| @eslint/js | ^9.39.1 | ESLint JS config |
| @types/node | ^24.10.1 | Node type definitions |
| @types/react | ^19.2.7 | React type definitions |
| @types/react-dom | ^19.2.3 | React DOM type definitions |
| @types/react-syntax-highlighter | ^15.5.13 | Syntax highlighter types |
| @types/dompurify | ^3.0.5 | DOMPurify types |
| @types/uuid | ^10.0.0 | UUID types |
| globals | ^16.5.0 | Global type definitions |

## Database

| Component | Version | Image |
|-----------|---------|-------|
| PostgreSQL | 16 | postgres:16-alpine |
| Redis | 7 | redis:7-alpine |

## Build Tools and Configuration

| Tool | Config File | Purpose |
|------|-------------|---------|
| Cargo | `Cargo.toml` (workspace root + per-crate) | Rust package manager and build system |
| npm | `package.json` + `package-lock.json` | Node.js package manager |
| Vite | `vite.config.ts` | Frontend dev server and bundler |
| TypeScript | `tsconfig.json` + `tsconfig.app.json` + `tsconfig.node.json` + `tsconfig.release.json` | TypeScript configuration |
| ESLint | Inline config | JavaScript/TypeScript linting |
| PostCSS | PostCSS plugin chain | CSS processing |
| Docker Compose | `docker-compose.yml` | Multi-container orchestration |

## Docker Images

Each service has its own Dockerfile:
- `api/Dockerfile` -- API server
- `judge-worker/Dockerfile` -- Judge worker (requires SYS_PTRACE, SYS_ADMIN capabilities)
- `frontend/Dockerfile` -- Frontend SPA (served on port 80 via Nginx)

## Runtime Requirements

| Service | Default Port | Description |
|---------|-------------|-------------|
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Caching, JWT blacklist, message queue |
| API (axum) | 3000 | REST API + WebSocket server |
| Frontend (Vite dev) | 5173 | Development server (proxied to API) |
| Frontend (production) | 80 | Nginx-served static assets |

## Environment Variables

### API Server
- `DATABASE_URL` (required) -- PostgreSQL connection string
- `REDIS_URL` (default: `redis://127.0.0.1:6379`) -- Redis connection string
- `JWT_SECRET` (default: insecure placeholder) -- JWT signing key
- `WORKER_SECRET` (default: insecure placeholder) -- Shared secret for judge-worker callbacks
- `API_BIND_ADDRESS` (default: `0.0.0.0:3000`) -- Server bind address

### Judge Worker
- `REDIS_URL` (default: `redis://127.0.0.1/`) -- Redis connection string
- `API_URL` (default: `http://127.0.0.1:3000`) -- API server URL for result callbacks
- `WORKER_SECRET` (required) -- Shared secret for authenticating to API
- `SUBMISSION_STREAM` (default: `submissions`) -- Redis stream name
- `CONSUMER_GROUP` (default: `judge_workers`) -- Redis consumer group name
- `CONSUMER_NAME` (default: auto-generated UUID) -- Consumer identifier

### Frontend
- `VITE_API_BASE_URL` (default: `/api`) -- API base URL
- `VITE_WS_BASE_URL` (default: auto-detected from `window.location`) -- WebSocket URL
- `VITE_API_PROXY_TARGET` (default: `http://localhost:3000`) -- Vite dev proxy target
- `VITE_WS_PROXY_TARGET` (default: `ws://localhost:3000`) -- Vite WebSocket proxy target
- `VITE_ENABLE_MOCK_DATA` -- Enable mock data mode
- `VITE_ENABLE_DIRECT_MESSAGES` (default: enabled) -- Feature toggle for DMs
- `VITE_ENABLE_PLAGIARISM` (default: enabled) -- Feature toggle for plagiarism module

## Vite Build Configuration

- Build target: `chrome109`
- Path alias: `@/` maps to `./src/`
- Code splitting via `manualChunks`:
  - `data-core` -- react-query, axios, zustand
  - `icon-kit` -- lucide-react
  - `charts-kit` -- recharts
  - `editor-core` -- monaco-editor, codemirror
  - `markdown-core` -- react-markdown, remark-gfm, dompurify
  - `syntax-highlight` -- react-syntax-highlighter
  - `form-core` -- react-hook-form, zod, hookform resolvers

## TypeScript Configuration

- Target: ES2022
- Module: ESNext (bundler mode)
- JSX: react-jsx
- Strict mode enabled
- Path alias: `@/*` maps to `./src/*`
