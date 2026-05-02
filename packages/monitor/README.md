# @codenexus/monitor

Browser-based monitoring dashboard for CodeNexus Online Judge — service status, feature flags, AI metrics, stream backlogs, and process control matrix with two-step confirmation.

## Quick Start

```bash
# Run against a remote monitor-server
npx @codenexus/monitor --server http://your-monitor-server:9090

# Custom port (default: 8967)
npx @codenexus/monitor --server http://your-monitor-server:9090 --port 3000
```

The CLI starts a local HTTP server that:
1. Serves the React dashboard on `http://localhost:{port}`
2. Proxies `/api/*` requests to the remote monitor-server
3. Proxies `/ws/*` WebSocket connections to the remote monitor-server

## CLI Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--server` | ✅ | — | Remote monitor-server URL (e.g. `http://localhost:9090`) |
| `--port` | ❌ | `8967` | Local dashboard port |
| `--help` | ❌ | — | Show usage info |

## Monitoring Dimensions

The dashboard displays four monitoring dimensions:

1. **Service Status** — Responsive card grid showing worker heartbeats, health indicators, and circuit breaker status for each service (`api`, `judge-worker`, `llm-worker`, `domain-analysis`, `monitor`)
2. **Stream Backlog** — Sortable table of Redis Stream consumer group backlog depths
3. **AI Analysis Metrics** — Analysis task statistics and performance metrics
4. **Feature Flags** — Current feature flag states

### Control Matrix

The dashboard includes a **Control Matrix** — a 5-target × action grid that allows operators to send pause/resume/restart signals to any service. Each action requires **two-step confirmation**:

1. Click action → receives a confirmation token
2. Confirm in dialog → signal is activated and the target service acts on it

An **Audit Log** panel shows the history of all control actions with operator, result, and timestamp filtering.

## Development

```bash
cd packages/monitor

# Install dependencies
npm ci

# Development server (Vite hot reload)
npm run dev

# Production build
npm run build
```

### Build Pipeline

The build uses a **three-stage pipeline**:

1. `tsc -p tsconfig.app.json --noEmit` — TypeScript type checking
2. `vite build` — Frontend bundle (React + Tailwind → `dist/` + `public/`)
3. `esbuild src/server.ts` — Node.js server bundle → `dist/server.js`

The split is necessary because `server.ts` uses Node.js APIs (`node:http`, `node:net`) that Vite externalizes for browser compatibility.

### Architecture

```
packages/monitor/
├── bin/monitor.js          # CLI entrypoint (--server, --port parsing)
├── src/
│   ├── server.ts           # Node.js HTTP server (static files + REST/WS proxy)
│   ├── App.tsx             # Main dashboard layout
│   ├── types.ts            # TypeScript type definitions
│   ├── hooks/
│   │   ├── useWebSocket.ts # WebSocket with exponential backoff reconnect
│   │   ├── useSnapshot.ts  # REST init + WS live updates + fallback polling
│   │   ├── useControlApi.ts         # Control plane REST API
│   │   └── useTwoStepConfirm.ts     # Two-step confirmation state machine
│   └── components/
│       ├── HeaderBar.tsx           # Server address + connection status
│       ├── ServiceStatusGrid.tsx   # Service card grid
│       ├── ServiceCard.tsx         # Individual service card
│       ├── ControlMatrix.tsx       # Control signal matrix + confirm dialog
│       ├── StreamBacklogTable.tsx  # Sortable backlog table
│       ├── AuditLogPanel.tsx       # Audit log with target filter
│       ├── AnalysisMetricsPanel.tsx
│       ├── FeatureFlagsPanel.tsx
│       └── ConnectionBadge.tsx     # WS connection state indicator
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## npm Publishing

The `prepublishOnly` script automatically runs `npm run build` before publish. The `files` field in `package.json` ensures only `bin/`, `dist/`, and `public/` are included in the published package.
