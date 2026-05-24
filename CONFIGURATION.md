![CodeNexus Banner](codenexus_banner.png)

> 📄 **[Read in Chinese / 中文说明](CONFIGURATION.zh-CN.md)**

# System Configuration Reference

This guide details all configuration variables, environment overrides, and network settings for **CodeNexus**, including the API Server, Judge Worker, Frontend React app, and full Docker container deployments.

---

## 1. System-Wide Environment Modes

CodeNexus determines security profiles, CORS rules, and debug logging strictness at boot using the `APP_ENV` variable:

| Environment | `APP_ENV` value | Secrets Check | CORS policy | Debug Trace |
|-------------|-----------------|---------------|-------------|-------------|
| **Development** | `development` (Default) | Insecure defaults permitted | Wildcard (`*`) | Detailed Stack Traces |
| **Production** | `production` | Panic immediately if default keys found | Strict `CORS_ORIGINS` list | Suspended traces, Info level |
| **Testing** | `test` | Mock payloads, automated injection | Wildcard (`*`) | Suspended |

---

## 2. API Server Configurations

API server variables are managed via the `AppConfig` schema in the `api-infra` crate, parsing `.env` overrides on start.

### Standard System Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | None | PostgreSQL connection pool target. Ex: `postgresql://user:password@db_host:5432/online_judge` |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Redis broker and session cache target. Connections failures fallback to degraded local caches. |
| `JWT_SECRET` | Production Only | Insecure Dev Default | 256-bit signing key for JSON Web Tokens. |
| `WORKER_SECRET` | Production Only | Insecure Dev Default | Shared key to authenticate the judge workers via `X-Worker-Secret`. |
| `API_BIND_ADDRESS` | No | `0.0.0.0:3000` | Local network binding interface. |
| `CORS_ORIGINS` | Production Only | Empty | Comma-separated list of allowed origins. Ex: `https://nexus.edu,https://admin.nexus.edu`. |
| `RUST_LOG` | No | `api=info,tower_http=warn` | Environment log filter overrides. |

### Seed Account Variables (Development Only)
In non-production environments, the database auto-seeds a primary tenant and default administration logins:

- `DEMO_ADMIN_EMAIL` — Default: `admin@example.com`
- `DEMO_ADMIN_PASSWORD` — Default: `admin123`
- `DEMO_ADMIN_ROLE` — Default: `root`

---

## 3. Judge Worker Configurations

The compilation worker operates as a Redis stream consumer and executes code sandboxes.

### Runtime Stream Configurations

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | None | Direct database handle to download test cases. |
| `REDIS_URL` | No | `redis://127.0.0.1/` | Redis server address. |
| `API_URL` | No | `http://127.0.0.1:3000` | HTTP route to callback execution verdicts. |
| `WORKER_SECRET`| **Yes** | None | Key matching backend API configuration. |
| `SUBMISSION_STREAM` | No | `submissions` | Default submissions stream name. |
| `CONTEST_STREAM` | No | `submissions:contest`| High-priority contest submissions stream. |
| `MAX_CONCURRENT_JUDGES` | No | `4` | Maximum compilation processes running in parallel. Must be >= 1. |
| `RECOVERY_IDLE_MS` | No | `300000` (5 min) | Idle time before reclaiming crashed worker submissions. |

### Sandboxing Docker Privileges
To execute cgroups, chroot, and seccomp filters, the judge worker's docker container **must** be launched with elevated Linux kernel namespaces:

```yaml
cap_add:
  - SYS_PTRACE    # Sandbox execution tracing
  - SYS_ADMIN     # cgroups creation and filesystem mounts
security_opt:
  - no-new-privileges:true
```

---

## 4. Frontend Configurations

React utilizes Vite-injected configurations with the `VITE_` prefix to declare gateway endpoints.

### Client Gateway Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | `/api` | Base proxy path for API request routing. |
| `VITE_WS_BASE_URL` | No | Auto-detected | Realtime WebSocket server address. |
| `VITE_API_PROXY_TARGET`| No | `http://localhost:3000`| Dev proxy targets (Vite local development). |
| `VITE_WS_PROXY_TARGET` | No | `ws://localhost:3000` | Dev proxy targets for WS. |
| `VITE_ENABLE_WEBSOCKET`| No | `true` | Set false to disable real-time WebSocket push updates. |
<!-- GSD:docs -->
