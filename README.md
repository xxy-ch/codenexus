![CodeNexus Banner](codenexus_banner.png)

> 📄 **[Read in Chinese / 中文说明](README.zh-CN.md)**

# CodeNexus

CodeNexus is a modern, multi-tenant, and multi-role online judge and competitive programming platform tailored for educational institutions. It provides a secure, sandboxed environment for compiling and executing student submissions in runtime-configurable programming languages, offering a comprehensive experience for students, teachers, and administrators.

## Architecture Overview

```
┌──────────────────┐       ┌──────────────────┐       ┌────────────────────┐
│    Frontend      │ REST  │   API Server     │ Redis │    Judge Worker    │
│ React + Vite     │◄─────►│ Axum + domains   │◄─────►│ cgroups + seccomp  │
│ Port 5173 / 80   │ WS    │ Port 3000        │ HTTP  │ Compile & run      │
└──────────────────┘       └────────┬─────────┘       └────────────────────┘
                                    │
                       ┌────────────┼────────────┐
                       │            │            │
                 ┌─────▼─────┐ ┌────▼─────┐ ┌────▼────────────┐
                 │PostgreSQL │ │ Redis 7  │ │ Feature Gateway │
                 │16         │ │ Queue    │ │ Port 3001       │
                 └───────────┘ └──────────┘ └────┬────────────┘
                                                  │
                                           ┌──────▼──────┐
                                           │ LLM Worker  │
                                           │ AI analysis │
                                           └─────────────┘
```

**Core Data Flow:** Users submit code via the frontend, the API server publishes judge tasks to Redis Streams, the Judge Worker consumes these tasks and compiles/runs them inside a secure Linux sandbox, and then posts the results back to the API server, which pushes real-time updates to the frontend via WebSocket.

## Core Features

- **Runtime-Configurable Languages** — The judge supports language runtimes through per-language settings; deployments can enable only the compilers/interpreters installed in the worker image.
- **Secure Sandboxing** — Three layers of isolation using Linux `cgroups` (CPU/memory limits), `chroot` (filesystem isolation), and `seccomp` (system call filtering) to ensure security and prevent hostile executions.
- **Multi-Tenant & Multi-Role** — Built for multi-campus operations. Features a 6-level role hierarchy (`Root`, `CampusAdmin`, `GradeAdmin`, `Teacher`, `TeachingAssistant`, `Student`) with strict RBAC boundary checks.
- **Real-Time Updates** — Real-time push notifications, submission status, leaderboard updates, and contest chatrooms using WebSocket.
- **Contest Subsystem** — Create contests with custom problems, real-time leaderboards (with configurable freeze periods), and live chatrooms.
- **Classroom & Homework** — Teachers can create classes, manage student enrollment, assign homework, and review comprehensive submission reports.
- **Discussions & Blogs** — Problem-specific discussion areas, community technical blogs, and nested comment systems.
- **Code Plagiarism Detection** — Integrated plagiarism scanner analyzing code similarity, configurable from the admin control panel.
- **Direct Messaging** — One-to-one conversations with message history, sending, and unread badge indicators.
- **Feature Gateway & AI Worker** — Runtime feature flags control optional capabilities such as LLM-assisted analysis, teaching cards, recommendations, and plagiarism graph features.
- **Learning Roadmap** — Student-facing knowledge topology that links visible skill nodes back into problem discovery.
- **Full-Text Search** — Global search indexing across problems, discussions, blogs, and users.
- **Import/Export** — Batch problem ZIP and user CSV import/export for seamless library migration and user provisioning.

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Frontend Framework | React + TypeScript + Vite | React 19, TypeScript 5.9, Vite 7 |
| Styling / Icons | Tailwind CSS v4 + shadcn + Lucide Icons | — |
| State Management | Zustand (Client) + TanStack React Query (Server) | — |
| Form Validation | React Hook Form + Zod | — |
| Code Editors | Monaco Editor (Code submission) + CodeMirror (Markdown) | — |
| API Server | Rust + Axum + SQLx | Rust 2021 Edition, Axum 0.7, SQLx 0.8 |
| Feature Gateway | Rust + Axum + SQLx | Scoped feature flags, standalone service |
| LLM Worker | Rust worker | AI task processing behind feature flags |
| Judge Worker | Rust + Redis Streams + cgroups/seccomp | Rust 2021 Edition |
| Database | PostgreSQL | 16 |
| Cache & Message Broker | Redis | 7 |
| Containerization | Docker Compose | — |

## Project Structure

```
Online_Judge/
├── backend/                          # Rust Workspace (14 crates)
│   ├── Cargo.toml                    # Workspace Root Config
│   ├── rust-toolchain.toml           # Toolchain Lock (Rust 1.90.0)
│   │
│   ├── api/                          # API Server (Axum HTTP & WebSockets Entry)
│   ├── api-infra/                    # Shared Infrastructure Crate (Middleware, Auth, WS, Helpers)
│   ├── shared/                       # Shared Models (Claims, Role, Permission, User)
│   │
│   ├── domain-users/                 # User domain (Authentication, Registration, Profiles, Roles)
│   ├── domain-problems/              # Problem domain (CRUD, Test cases, Visibility)
│   ├── domain-submissions/           # Submission domain (Submissions, Retests, Verdicts)
│   ├── domain-contests/              # Contest domain (Lifecycle, scoreboards, registration)
│   ├── domain-classes/               # Classroom domain (Grades, Classes, Homework)
│   ├── domain-community/             # Social domain (Discussions, Blogs, Comments)
│   ├── domain-leaderboard/           # Ranking domain (Global/Contest/Class rankings)
│   ├── domain-search/                # Search domain (Full-text search integration)
│   ├── domain-imex/                  # Import/Export domain (Problem ZIP & User CSV)
│   │
│   ├── judge-worker/                 # Independent Judge Worker (Redis Streams Consumer & Sandbox)
│   └── migration-tool/               # Database Migration Tool (MySQL → PostgreSQL)
│
├── frontend/                         # React Frontend Application
│   ├── src/
│   │   ├── pages/                    # Page components
│   │   ├── components/               # Shared UI elements
│   │   ├── services/                 # API Service Layer
│   │   └── store/                    # Zustand Stores
│   └── Dockerfile                    # Nginx deployment config
│
├── docker-compose.yml                # Full-stack orchestrator
├── scripts/                          # Bootstrap & utility scripts
└── LICENSE                           # Private License
```

## Quick Start

For detailed step-by-step instructions, please read [GETTING-STARTED.md](GETTING-STARTED.md).

### Docker Compose Quick Run

```bash
docker compose up -d --build
```

Load demo seeds:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
  ./scripts/bootstrap_demo.sh
```

Service links:

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| API Server | `http://localhost:3000` |
| Health Check | `http://localhost:3000/health` |

## Documentation Index

| Guide | Description |
|-------|-------------|
| [GETTING-STARTED.md](GETTING-STARTED.md) | Local environment preparation, installation, and first run. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture, domain boundaries, and data flow details. |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Backend and frontend local development guidelines. |
| [TESTING.md](TESTING.md) | Unit, integration, E2E testing framework, and guidelines. |
| [API.md](API.md) | Complete REST API endpoint reference. |
| [CONFIGURATION.md](CONFIGURATION.md) | Environment variables and runtime configurations. |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production-grade deployment and operations guide. |

## License

This project is licensed under a Private License. See [LICENSE](LICENSE) for details. Unauthorized use, copying, modification, or distribution is strictly prohibited.
<!-- GSD:docs -->
