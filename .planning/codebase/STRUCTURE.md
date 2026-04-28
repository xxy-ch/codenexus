# Online Judge - File & Directory Structure

## 1. Top-Level Workspace Layout

```
Online_Judge/
|-- Cargo.toml              # Rust workspace root (members: api, judge-worker, shared)
|-- Cargo.lock              # Dependency lock file
|-- docker-compose.yml      # 5-service orchestration (postgres, redis, api, frontend, judge-worker)
|-- CLAUDE.md / AGENTS.md   # AI assistant instructions
|-- README.md               # Project overview
|-- FINAL_SUMMARY.md        # Development summary document
|-- LICENSE                 # MIT license
|-- .gitignore
|-- .dockerignore
|-- references/             # External reference materials (design docs, examples)
|-- scripts/                # Utility scripts
|-- docs/                   # Documentation (archive, guides, reports, phase summaries)
|-- shared/                 # Shared Rust crate
|-- api/                    # API service
|-- judge-worker/           # Judge worker service
|-- frontend/               # React frontend
```

## 2. `api/src/` Module Breakdown (~14,600 lines total, 71 files)

The API follows a module-per-domain pattern. Each domain typically has `mod.rs` (re-exports), `models.rs`, `routes.rs`, and `service.rs`.

### Core Infrastructure

| File | Lines | Purpose |
|------|-------|---------|
| `main.rs` | 200 | Server bootstrap: DB/Redis connections, migrations, router assembly, TCP listener |
| `lib.rs` | 36 | Module declarations + `AppState` struct definition |
| `error.rs` | 51 | Unified `AppError` enum (Auth/Validation/Database/Internal) with Axum response impl |

### Middleware (`middleware/` -- 5 files, ~960 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `mod.rs` | 4 | Re-exports |
| `auth.rs` | 223 | JWT authentication: Bearer header or cookie extraction, token validation, Redis blacklist check |
| `tenant.rs` | 219 | Multi-tenant isolation: extracts school_id from JWT claims, never from headers |
| `permission.rs` | 272 | RBAC middleware: require_permission, require_any/all_permissions, require_min_role, org/campus access |
| `authz.rs` | 244 | Additional authorization utilities |
| `rate_limit.rs` | 27 | Rate limiting configuration |

### Domain Modules

| Module | Files | Total Lines | Purpose |
|--------|-------|-------------|---------|
| **leaderboard/** | 4 files | ~1,180 | Ranking computation and display (service: 838, routes: 219, models: 119) |
| **classes/** | 4 files | ~1,290 | Class management, enrollment, assignments (service: 688, routes: 439, models: 148) |
| **submissions/** | 5 files | ~1,150 | Submission CRUD, Redis queue publishing, result ingestion (service: 600, routes: 267, models: 103, queue: 94) |
| **contests/** | 4 files | ~1,050 | Contest CRUD, registration, participant management (service: 560, routes: 325, models: 154) |
| **users/** | 4 files | ~820 | User profile, admin user management (service: 533, routes: 111, models: 154) |
| **blog/** | 4 files | ~970 | Blog articles, comments, trending (service: 465, routes: 380, models: 108) |
| **problems/** | 6 files | ~1,000 | Problem CRUD, test case management, access control (routes: 467, test_cases: 279, access: 238, problem_access: 73, models: 139) |
| **discussions/** | 4 files | ~740 | Forum discussions, replies, problem-linked threads (service: 349, routes: 231, models: 102) |
| **search/** | 4 files | ~570 | Full-text search across problems, blogs, discussions (service: 403, routes: 67, models: 90) |
| **notifications/** | 4 files | ~480 | In-app notification CRUD and delivery (service: 280, routes: 123, models: 75) |
| **auth/** | 4 files | ~590 | Login, register, logout, JWT service, password hashing (routes: 405, jwt_service: 143, password: 29) |
| **plagiarism/** | 2 files | ~344 | Plagiarism report routes and detection (routes: 341) |
| **messages/** | 2 files | ~237 | Direct messaging between users (routes: 234) |
| **websocket/** | 4 files | ~1,020 | WebSocket server, handler, message types (server: 461, handler: 297, message: 254) |
| **rbac/** | 1 file | ~293 | In-memory role-permission matrix with 6 roles x 21 permissions |
| **redis/** | 1 file | ~292 | Redis pool creation, stream operations, caching helpers |
| **db/** | 2 files | ~103 | Database pool creation (85) and embedded SQLx migrator (18) |

### Tests

| File | Lines | Purpose |
|------|-------|---------|
| `release_gate_tests.rs` | 401 | Integration-level gate tests verifying release readiness |

### Database Migrations (`api/migrations/` -- 28 files)

Numbered sequentially from `000` to `025`, plus date-prefixed migrations:
- `000-003`: Organizations, campuses, users, roles
- `004-008`: Problems, test cases, submissions, test case results
- `009-011`: Classes, enrollments, assignments
- `012-014`: Contests, contest problems/submissions
- `015-017`: Discussions, plagiarism reports, direct messages
- `018-025`: Later additions (plagiarism scan, user login updates, blog tables, judge language settings, class codes)

## 3. `judge-worker/src/` Module Breakdown (~2,500 lines total, 20 files)

| Module | Files | Total Lines | Purpose |
|--------|-------|-------------|---------|
| **main.rs** | - | 304 | Entry point: Redis connection, consumer group setup, processing loop, API callback with retry |
| **lib.rs** | - | 5 | Module declarations |
| **queue/** | 5 files | ~530 | Redis Streams abstraction (consumer: 81, producer: 122, dlq: 62, mod: 109 with SubmissionMessage/JudgeResult/TestCaseResult types) |
| **processor/** | 4 files | ~320 | Submission processing: fetch test cases, compile, execute, compare (service: 62, tests: 51, mod: 24, main: 3) |
| **sandbox/** | 5 files | ~460 | Execution isolation (seccomp: 439, cgroups: 122, executor: 139, chroot: 109, mod: 24) |
| **compiler/** | 3 files | ~95 | Language detection and compilation config (language: 62, config: 33, mod: 5) |
| **db/** | 1 file | ~13 | Direct PostgreSQL connection for fetching test cases |

**Key design**: The sandbox module is the largest, reflecting the security-critical nature of code execution. Seccomp filtering alone is 439 lines defining allowed syscalls per language.

## 4. `frontend/src/` Directory Structure (~23,200 lines total, ~105 TS/TSX files)

### Entry Points

| File | Lines | Purpose |
|------|-------|---------|
| `main.tsx` | - | React DOM render entry |
| `App.tsx` | 188 | Route definitions, lazy loading, provider wrappers (QueryClient, Toast, BrowserRouter) |

### Pages (`pages/`)

#### Auth Pages (`pages/auth/`)
| File | Lines | Purpose |
|------|-------|---------|
| `LoginPage.tsx` | 209 | Login form with username/password |
| `RegisterPage.tsx` | 336 | Registration form |
| `UnauthorizedPage.tsx` | - | 403 error page |

#### User Pages (`pages/user/`)
| File | Lines | Purpose |
|------|-------|---------|
| `DashboardEnhanced.tsx` | 583 | User dashboard with stats, recent submissions, activity |
| `ProblemIDEEnhanced.tsx` | 240 | Monaco editor-based problem solving IDE |
| `ContestDetail.tsx` | 519 | Contest view with problems, countdown, submit |
| `ContestList.tsx` | 471 | Browse and filter contests |
| `SubmissionDetail.tsx` | 500 | Submission result with test case breakdown |
| `SubmissionHistory.tsx` | 355 | Paginated submission history |
| `Ranking.tsx` | 347 | Global leaderboard |
| `ProblemSet.tsx` | 196 | Problem list with filters |
| `ProblemDetail.tsx` | 243 | Problem description, submit button |
| `Settings.tsx` | 317 | User settings/profile |
| `Profile.tsx` | 223 | User profile view |
| `LearningRoadmap.tsx` | - | Learning path recommendations |
| `__tests__/` | 5 files, ~1,680 | Vitest tests for Dashboard, ContestDetail, ContestList, SubmissionHistory, SubmissionDetail, ProblemIDEEnhanced |

#### Teacher Pages (`pages/teacher/`)
| File | Lines | Purpose |
|------|-------|---------|
| `ClassManagement.tsx` | 417 | Create/manage classes, view enrollments |
| `ContestWizard.tsx` | 415 | Step-by-step contest creation |
| `AssignmentReport.tsx` | 353 | Per-assignment student completion stats |
| `__tests__/ClassManagement.test.tsx` | 160 | Class management tests |

#### Admin Pages (`pages/admin/`)
| File | Lines | Purpose |
|------|-------|---------|
| `ProblemManagement.tsx` | 529 | Admin problem CRUD |
| `UserManagement.tsx` | 461 | Admin user management |
| `JudgeSettings.tsx` | 303 | Judge language/time/memory configuration |
| `ProblemContentConfig.tsx` | 256 | Problem content display settings |
| `SimilarityScanConfig.tsx` | 255 | Plagiarism scan configuration |
| `AdminDashboard.tsx` | 166 | Admin overview dashboard |
| `PlagiarismReportDetail.tsx` | 230 | Plagiarism report detail view |
| `PlagiarismReportList.tsx` | - | List of plagiarism reports |

#### Community Pages (`pages/community/`)
| File | Lines | Purpose |
|------|-------|---------|
| `DiscussionDetail.tsx` | 471 | Discussion thread with replies |
| `BlogDetail.tsx` | 408 | Blog article view |
| `DiscussionList.tsx` | 355 | Discussion listing |
| `BlogList.tsx` | 386 | Blog article listing |
| `CreateArticle.tsx` | 264 | Article creation (markdown) |
| `EditArticle.tsx` | 281 | Article editing |
| `CreateDiscussion.tsx` | 204 | New discussion form |
| `DirectMessages.tsx` | 187 | Private messaging interface |

#### Other Pages
| File | Lines | Purpose |
|------|-------|---------|
| `pages/search/SearchResults.tsx` | 321 | Full-text search results |
| `pages/contest/ContestScoreboard.tsx` | 142 | Standalone contest scoreboard |
| `pages/error/NotFound.tsx` | - | 404 page |
| `pages/error/ServerError.tsx` | - | 500 page |

### Components (`components/`)

#### IDE Components (`components/ide/`)
| File | Lines | Purpose |
|------|-------|---------|
| `IDELayout.tsx` | 397 | Split-pane IDE layout (editor + result) |
| `SubmissionResult.tsx` | 296 | Test case result display |
| `MonacoEditor.tsx` | 207 | Monaco editor wrapper with language support |

#### UI Components (`components/ui/`)
| File | Lines | Purpose |
|------|-------|---------|
| `dropdown-menu.tsx` | 266 | Dropdown menu component |
| `dialog.tsx` | 158 | Modal dialog |
| `Button.tsx` | - | Button component |
| `Input.tsx` | - | Input component |
| `Card.tsx` | - | Card container |
| `Badge.tsx` | - | Badge/tag |
| `Loading.tsx` | - | Loading spinner/skeleton |
| `Skeleton.tsx` | - | Content skeleton |
| `StatusBadge.tsx` | - | Status indicator |
| `Toast.tsx` | - | Toast notification provider |
| `Table.tsx` | - | Data table |
| `Tabs.tsx` | - | Tab navigation |
| `Separator.tsx` | - | Visual separator |

#### Layout Components (`components/layout/`)
| File | Lines | Purpose |
|------|-------|---------|
| `Sidebar.tsx` | 147 | Main navigation sidebar |
| `Header.tsx` | - | Top header bar |
| `MobileNav.tsx` | - | Mobile navigation drawer |

#### Domain Components
| File | Lines | Purpose |
|------|-------|---------|
| `components/problems/ProblemFilters.tsx` | 239 | Problem list filter controls |
| `components/problems/ProblemTable.tsx` | 135 | Problem data table |
| `components/problems/LanguageSelector.tsx` | - | Programming language dropdown |
| `components/search/SearchBar.tsx` | 216 | Global search input |
| `components/contest/ContestCountdown.tsx` | - | Contest timer |
| `components/contest/ScoreboardTable.tsx` | - | Scoreboard display |
| `components/notifications/NotificationProvider.tsx` | - | Notification context |
| `components/messages/MessageThread.tsx` | - | Message conversation |
| `components/messages/ConversationList.tsx` | - | Conversation list |
| `components/editor/MarkdownEditor.tsx` | - | Markdown editing |
| `components/editor/EditorWithPreview.tsx` | - | Split markdown editor+preview |
| `components/editor/MarkdownPreview.tsx` | - | Markdown rendering |
| `components/auth/ProtectedRoute.tsx` | - | Auth gate component |
| `components/auth/AdminRoute.tsx` | - | Admin gate component |

### Services (`services/`) -- API client layer

| File | Lines | Purpose |
|------|-------|---------|
| `admin.ts` | 432 | Admin API calls (users, problems, reports, health) |
| `websocket.ts` | 275 | WebSocket singleton service (connect, subscribe, handlers) |
| `problems.ts` | 271 | Problem CRUD, submission, stats |
| `articlesApi.ts` | 257 | Blog article CRUD |
| `contests.ts` | 221 | Contest CRUD, registration |
| `discussionsApi.ts` | 207 | Discussion CRUD |
| `classes.ts` | 176 | Class management API |
| `judgeConfig.ts` | - | Judge settings API |
| `ranking.ts` | - | Leaderboard API |
| `messages.ts` | - | Direct messages API |
| `blog.ts` | - | Blog API |
| `plagiarism.ts` | - | Plagiarism API |
| `api.ts` | 75 | Axios instance with 401 refresh interceptor |
| `config.ts` | 120 | API/WS config, feature flags, constants |
| `__tests__/` | 2 files, ~278 | Service smoke tests |

### Hooks (`hooks/`)

| File | Lines | Purpose |
|------|-------|---------|
| `useWebSocket.ts` | 193 | WebSocket hooks: useWebSocket, useSubmissionUpdates, useContestUpdates, useNotifications, useLeaderboardUpdates |
| `useAuth.ts` | 97 | Authentication hook (login, register, logout, checkAuth) |
| `useCommunityUpdates.ts` | - | Real-time community content updates |
| `useCountdown.ts` | - | Timer/countdown for contests |
| `useProblems.ts` | - | Problem fetching with filters |

### Store (`store/`)

| File | Purpose |
|------|---------|
| `authStore.ts` | Zustand store: user, isAuthenticated, isLoading, error, login/register/logout actions |

### Types (`types/`) -- TypeScript interfaces

| File | Lines | Purpose |
|------|-------|---------|
| `community.ts` | 188 | Discussion, blog, comment types |
| `websocket.ts` | 179 | WebSocket message types, event handlers |
| `auth.ts` | - | Login/Register request/response, user types, role constants |
| `users.ts` | - | User profile types |
| `problems.ts` | - | Problem, test case, difficulty types |
| `contests.ts` | - | Contest, participant, scoreboard types |
| `ranking.ts` | - | Leaderboard entry types |
| `messages.ts` | - | Direct message types |
| `search.ts` | - | Search result types |
| `blog.ts` | - | Blog article types |
| `admin.ts` | - | Admin stats types |

### Utilities

| File | Lines | Purpose |
|------|-------|---------|
| `utils/codeTemplates.ts` | 448 | Default code templates per language |
| `lib/design-tokens.ts` | 196 | Tailwind CSS design tokens |
| `lib/submissionStatus.ts` | 141 | Submission status constants and helpers |
| `lib/utils.ts` | - | General utility functions (cn, formatDate, etc.) |
| `utils/errorHandler.ts` | - | Error formatting utilities |

### Test Configuration

| File | Purpose |
|------|---------|
| `test/setup.ts` | Test environment setup |
| `test/vitest.setup.ts` | Vitest configuration |

## 5. `shared/` Crate

```
shared/
|-- Cargo.toml             # Crate manifest (depends on serde, uuid, chrono)
|-- README.md              # Crate overview
|-- ROADMAP.md             # Development roadmap
|-- policy-matrix.md       # RBAC policy matrix documentation
|-- src/
|   |-- lib.rs             # Crate root: prelude module + models re-exports
|   |-- models/
|       |-- mod.rs         # Re-exports auth, user, role, permission
|       |-- auth.rs        # Claims, LoginRequest, LoginResponse, RefreshRequest
|       |-- user.rs        # User, UserPublic (173 lines)
|       |-- role.rs        # Role enum with hierarchy (146 lines)
|       |-- permission.rs  # Permission enum, 21 variants (173 lines)
|-- phases/                # Development phase plans (P0-P8)
|-- fix-plans/             # Bug fix plans
|-- discussions/           # Design discussion records
|-- reviews/               # Code review records
|-- frontend-skill/        # Frontend development skill documentation
```

## 6. Key Config Files

| File | Purpose |
|------|---------|
| `Cargo.toml` | Workspace definition (members: api, judge-worker, shared; shared deps: tokio, axum, serde, tracing) |
| `api/Cargo.toml` | API dependencies (axum, sqlx, redis, jsonwebtoken, bcrypt, tower-governor, etc.) |
| `judge-worker/Cargo.toml` | Worker dependencies (redis, reqwest, etc.) |
| `shared/Cargo.toml` | Shared crate dependencies (serde, uuid, chrono) |
| `frontend/package.json` | Frontend dependencies (react, vite, @tanstack/react-query, zustand, tailwindcss, etc.) |
| `frontend/vite.config.ts` | Vite build configuration with path aliases |
| `frontend/tsconfig.json` | TypeScript configuration |
| `frontend/tailwind.config.js` | Tailwind CSS configuration |
| `docker-compose.yml` | 5-service orchestration with health checks and volume mounts |
| `api/Dockerfile` | Multi-stage Rust build for API |
| `judge-worker/Dockerfile` | Multi-stage Rust build for worker (requires Docker socket for sandbox) |
| `frontend/Dockerfile` | Multi-stage Node build (Vite build -> nginx) |
| `.gitignore` | Git ignore rules |
| `.dockerignore` | Docker build context exclusions |
| `.mcp.json` | MCP server configuration |

## 7. `docs/` Directory

```
docs/
|-- archive/
|   |-- ARCHIVE_INDEX.md
|   |-- plans/                  # Legacy implementation plans
|   |-- legacy-docs/            # Historical documents (delivery, defect, demo scripts)
|   |-- status/                 # Project status reports
|   |-- guides/                 # Quick start, markdown editor, websocket, TypeScript fixes
|   |-- phases/                 # Phase completion summaries (Phase 2-9)
|   |-- reports/                # Test reports, completion reports
|   |-- scripts/                # Deployment scripts
|   |-- legacy-assets/          # Historical SQL migrations and test scripts
```
