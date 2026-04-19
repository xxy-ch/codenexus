# AlgoMaster Online Judge 配置指南

本文档详细描述 AlgoMaster 在线判题平台的全部配置项，涵盖 API 服务、判题 Worker、迁移工具、前端、Docker Compose 编排、数据库、Redis、安全策略及日志系统。

## 1. 配置概览

AlgoMaster 采用 **环境变量 + `.env` 文件** 的方式管理配置，各服务独立读取自身所需的环境变量：

- **Rust 后端**使用 `dotenvy` 库在启动时加载 `.env` 文件，并通过 `std::env::var` 读取环境变量。
- **React 前端**使用 Vite 的 `import.meta.env` 机制读取以 `VITE_` 前缀开头的环境变量。
- **Docker Compose** 通过 `environment` 字段向各容器注入环境变量，支持 `${VAR:-default}` 语法提供默认值。

配置按环境区分行为（由 `APP_ENV` 环境变量控制）：

| 环境模式 | `APP_ENV` 值 | 密钥行为 | CORS 行为 |
|----------|-------------|---------|----------|
| 开发 | `development`（默认） | 缺少密钥时使用不安全默认值并打印警告 | 允许所有来源（`*`） |
| 生产 | `production` | 缺少密钥时启动失败 | 仅允许 `CORS_ORIGINS` 指定的来源 |
| 测试 | `test` | 由测试框架提供 | 允许所有来源 |

---

## 2. API 服务配置

API 服务配置由 `api-infra/src/config.rs` 中的 `AppConfig` 结构体管理，在启动时通过 `AppConfig::from_env()` 加载并校验。

### 2.1 环境变量一览

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | 是 | — | PostgreSQL 连接字符串，格式：`postgresql://user:password@host:port/database`。缺少时启动立即失败 |
| `REDIS_URL` | 否 | `redis://127.0.0.1:6379` | Redis 连接字符串。API 在 Redis 连接失败时降级启动（打印警告），但 JWT 黑名单、WebSocket 广播和 Worker 心跳等功能将不可用 |
| `JWT_SECRET` | 生产必填 | `dev-only-insecure-jwt-secret-do-not-use-in-production` | JWT 令牌签名密钥（HS256 算法）。生产环境必须设置，否则启动失败 |
| `WORKER_SECRET` | 生产必填 | `dev-only-insecure-worker-secret-do-not-use-in-production` | 判题 Worker 与 API 之间的共享认证密钥，通过 `X-Worker-Secret` 请求头验证。生产环境必须设置 |
| `API_BIND_ADDRESS` | 否 | `0.0.0.0:3000` | API 服务监听地址，格式为 `host:port` |
| `APP_ENV` | 否 | `development` | 运行环境：`development`、`production`、`test`。控制密钥校验严格程度和 CORS 行为 |
| `CORS_ORIGINS` | 生产推荐 | 开发模式为 `*`，生产模式为空（无来源） | 允许的跨域来源，多个来源用逗号分隔。仅在生产模式下生效 |
| `RUST_LOG` | 否 | `api=debug,tower_http=debug,axum=trace` | 日志过滤器，支持 `tracing_subscriber::EnvFilter` 语法 |

### 2.2 演示管理员配置（仅限开发环境）

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `DEMO_ADMIN_EMAIL` | 否 | `admin@example.com` | 自动创建的演示管理员邮箱 |
| `DEMO_ADMIN_PASSWORD` | 否 | `admin123` | 演示管理员密码（存储为 bcrypt 哈希） |
| `DEMO_ADMIN_SCHOOL_ID` | 否 | `1` | 演示管理员所属组织 ID |
| `DEMO_ADMIN_ROLE` | 否 | `admin` | 演示管理员角色 |

### 2.3 配置示例

```bash
# .env（开发环境示例）
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
WORKER_SECRET=your-worker-secret-key
API_BIND_ADDRESS=0.0.0.0:3000
APP_ENV=development
RUST_LOG=api=debug,tower_http=debug,axum=trace
```

```bash
# .env（生产环境示例）
DATABASE_URL=postgresql://appuser:strong_password@db.internal:5432/online_judge
REDIS_URL=redis://redis.internal:6379
JWT_SECRET=<256-bit-random-hex>
WORKER_SECRET=<256-bit-random-hex>
API_BIND_ADDRESS=0.0.0.0:3000
APP_ENV=production
CORS_ORIGINS=https://judge.example.com,https://admin.judge.example.com
RUST_LOG=api=info,tower_http=warn
```

### 2.4 连接池配置

API 服务在 `api/src/db/mod.rs` 中创建 PostgreSQL 连接池，参数硬编码于启动代码（`api/src/main.rs`）：

| 参数 | API 服务 | Judge Worker |
|------|---------|-------------|
| 最大连接数 | 10 | 5 |
| 连接获取超时 | 30 秒 | 30 秒 |
| 驱动 | `sqlx`（runtime-tokio, tls-rustls） | `sqlx`（runtime-tokio-rustls） |

Redis 连接池通过 `deadpool_redis` 的 `Config::from_url` 创建，使用 Tokio1 运行时和默认连接池大小。

### 2.5 启动行为

API 启动时依次执行：

1. 初始化 tracing 日志系统（读取 `RUST_LOG`）
2. 加载 `.env` 文件（`dotenvy::dotenv().ok()`，文件不存在不报错）
3. 从环境变量构建 `AppConfig` 并校验（生产环境校验密钥）
4. 创建 PostgreSQL 连接池
5. 运行嵌入式数据库迁移（`sqlx::migrate!()` 宏，编译时嵌入，启动时自动执行）
6. 创建 Redis 连接池（连接失败时降级运行，不中断启动）
7. 初始化 JWT 服务、WebSocket 服务、Prometheus 指标等
8. 启动 Axum HTTP 服务器

---

## 3. 判题 Worker (judge-worker) 配置

判题 Worker 是独立的 Rust 进程，从 Redis Streams 消费提交任务，在沙箱中执行代码，并将结果回调给 API。

### 3.1 环境变量一览

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | 是 | — | PostgreSQL 连接字符串，用于直接获取测试用例数据 |
| `REDIS_URL` | 否 | `redis://127.0.0.1/` | Redis 连接字符串，用于消费提交流 |
| `API_URL` | 否 | `http://127.0.0.1:3000` | API 服务地址，用于结果回调和心跳上报 |
| `WORKER_SECRET` | 否 | `dev-only-insecure-worker-secret-...` | 与 API 共享的认证密钥，通过 `X-Worker-Secret` 请求头发送 |
| `SUBMISSION_STREAM` | 否 | `submissions` | 普通（非竞赛）提交的 Redis Stream 名称 |
| `CONTEST_STREAM` | 否 | `submissions:contest` | 竞赛提交的 Redis Stream 名称（优先消费） |
| `CONSUMER_GROUP` | 否 | `judge_workers` | Redis Stream 消费者组名称 |
| `CONSUMER_NAME` | 否 | `worker-{uuid}`（自动生成） | 消费者名称，同一组内必须唯一 |
| `MAX_CONCURRENT_JUDGES` | 否 | `4` | 最大并发判题数。必须 >= 1，设为 0 将导致启动 panic |
| `RECOVERY_IDLE_MS` | 否 | `300000`（5 分钟） | 启动时恢复崩溃 Worker 未确认消息的空闲判定阈值（毫秒） |
| `RUST_LOG` | 否 | `judge_worker=debug,redis=warn` | 日志过滤器 |

### 3.2 Worker 心跳机制

Worker 启动后会在后台每 **10 秒** 向 API 发送心跳（`POST /internal/worker/heartbeat`），包含以下信息：

- `worker_id` — 消费者名称
- `active_judgements` — 当前正在判题的任务数
- `total_processed` — 累计处理提交数
- `avg_wait_ms` — 队列平均等待时间（EMA 指数移动平均）
- `redis_breaker_state` — Redis 熔断器状态（Closed / Open / HalfOpen）
- `api_breaker_state` — API 熔断器状态

API 端收到心跳后通过 Lua 脚本原子性地写入 Redis Hash（键名 `worker:heartbeat:{worker_id}`），设置 **30 秒 TTL**。连续 3 次心跳失败后日志级别升级为 ERROR。

### 3.3 双流优先消费

Worker 使用双流优先消费策略：每次读取时先检查竞赛流（`CONTEST_STREAM`），有消息则优先处理；无消息时再读取普通流（`SUBMISSION_STREAM`）。这确保竞赛中的提交获得更快的响应。

### 3.4 容错机制

| 机制 | 配置 |
|------|------|
| 熔断器 | Redis 和 API 各一个，5 次连续失败后开启，30 秒后半开恢复 |
| 结果回调重试 | 最多 3 次，指数退避 + 随机抖动（2s, 4s, 8s） |
| 死信队列（DLQ） | 回调全部失败后写入 Redis DLQ 流（`{stream}:dlq`），保留原始消息和元数据供管理员重试 |
| 主循环退避 | 连续错误时指数退避（2^error_count 秒，上限 60 秒） |
| HTTP 客户端超时 | 30 秒（`reqwest::Client` 全局超时） |
| ACK 重试 | Redis 消息确认失败时最多重试 3 次，间隔 200ms |
| 启动恢复 | 扫描 Pending Entry List，恢复空闲超过 `RECOVERY_IDLE_MS` 的消息 |

### 3.5 Docker 环境特殊要求

Judge Worker 容器需要以下 Linux 能力和安全选项才能运行沙箱：

```yaml
cap_add:
  - SYS_PTRACE    # 沙箱进程追踪
  - SYS_ADMIN     # cgroups、chroot 文件系统隔离、seccomp 系统调用过滤
security_opt:
  - no-new-privileges:true  # 防止权限提升
volumes:
  - /var/run/docker.sock:/var/run/docker.sock  # Docker-in-Docker 沙箱执行
```

---

## 4. 迁移工具 (migration-tool) 配置

迁移工具用于将 UOJ（Universal Online Judge）的 MySQL 数据迁移到 AlgoMaster 的 PostgreSQL 数据库。它是一个一次性命令行工具，使用 `clap` 解析参数。

### 4.1 命令行参数

| 参数 | 必填 | 环境变量 | 说明 |
|------|------|---------|------|
| `--dump-file <PATH>` | 是 | — | UOJ MySQL dump 文件路径 |
| `--database-url <URL>` | 是 | `DATABASE_URL` | PostgreSQL 连接字符串，也可通过环境变量提供 |
| `--test-case-dir <PATH>` | 否 | — | UOJ 测试用例目录路径 |
| `--org-id <ID>` | 二选一 | — | 将迁移数据分配到已有组织的 ID |
| `--create-default-org` | 二选一 | — | 自动创建默认组织存放迁移数据 |

`--org-id` 和 `--create-default-org` 必须至少提供一个。如果同时提供，`--org-id` 优先，`--create-default-org` 被忽略。

### 4.2 使用示例

```bash
# 迁移到已有组织
cargo run --bin migration-tool -- \
  --dump-file /path/to/uoj_dump.sql \
  --database-url postgresql://postgres:password@localhost:5432/online_judge \
  --test-case-dir /path/to/uoj/test_cases \
  --org-id 1

# 创建默认组织并迁移
cargo run --bin migration-tool -- \
  --dump-file /path/to/uoj_dump.sql \
  --database-url postgresql://postgres:password@localhost:5432/online_judge \
  --create-default-org
```

迁移工具还支持 `RUST_LOG` 环境变量控制日志级别，默认为 `info`。

---

## 5. 前端配置

前端使用 Vite 构建工具，环境变量必须以 `VITE_` 前缀才能在客户端代码中通过 `import.meta.env` 访问。配置定义在 `frontend/src/services/config.ts` 中。

### 5.1 API 与 WebSocket 配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `VITE_API_BASE_URL` | 否 | `/api` | API 基础 URL，用于 Axios 请求。生产环境应设为完整 API 地址 |
| `VITE_WS_BASE_URL` | 否 | 自动检测 | WebSocket 基础 URL。根据当前页面协议自动推导（`ws://` 或 `wss://`） |
| `VITE_API_PROXY_TARGET` | 否 | `http://localhost:3000` | Vite 开发服务器 API 代理目标地址（仅开发环境使用） |
| `VITE_WS_PROXY_TARGET` | 否 | `ws://localhost:3000` | Vite 开发服务器 WebSocket 代理目标地址（仅开发环境使用） |

### 5.2 功能开关

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `VITE_ENABLE_MOCK_DATA` | 否 | `false` | 设为 `true` 启用 Mock 数据模式，跳过真实 API 调用 |
| `VITE_ENABLE_DIRECT_MESSAGES` | 否 | `true`（启用） | 设为 `false` 禁用私信功能 |
| `VITE_ENABLE_PLAGIARISM` | 否 | `true`（启用） | 设为 `false` 禁用查重模块 |
| `VITE_ENABLE_WEBSOCKET` | 否 | `true` | WebSocket 功能开关 |

功能开关采用"默认启用"模式：只有显式设为字符串 `"false"` 才会禁用，省略或设为其他值均保持启用。

```typescript
// frontend/src/services/config.ts
export const FEATURE_FLAGS = {
  directMessages: import.meta.env.VITE_ENABLE_DIRECT_MESSAGES !== 'false',
  plagiarism: import.meta.env.VITE_ENABLE_PLAGIARISM !== 'false',
} as const
```

### 5.3 应用配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `VITE_APP_NAME` | 否 | `Online Judge` | 应用名称 |
| `VITE_APP_VERSION` | 否 | `1.0.0` | 应用版本号 |

### 5.4 Vite 开发代理

在开发模式下，Vite 将 API 和 WebSocket 请求代理到后端服务：

```
/api/*  -->  VITE_API_PROXY_TARGET（默认 http://localhost:3000）
         请求路径自动移除 /api 前缀

/ws/*   -->  VITE_WS_PROXY_TARGET（默认 ws://localhost:3000）
         WebSocket 升级代理
```

### 5.5 构建配置

| 配置项 | 值 | 说明 |
|--------|----|------|
| 构建目标 | `chrome109` | 浏览器最低兼容版本 |
| 路径别名 | `@/` → `./src/` | 导入路径简写 |
| 代码分割 | 按 `manualChunks` 分组 | 第三方库分为 `data-core`、`icon-kit`、`charts-kit`、`editor-core`、`markdown-core`、`syntax-highlight`、`form-core` |

---

## 6. Docker Compose 配置

项目根目录的 `docker-compose.yml` 编排五个服务。

### 6.1 服务概览

| 服务 | 镜像 | 端口映射 | 健康检查 | 启动依赖 |
|------|------|---------|---------|---------|
| `postgres` | `postgres:16-alpine` | `5432:5432` | `pg_isready -U postgres -d online_judge`，间隔 10s | — |
| `redis` | `redis:7-alpine` | `6379:6379` | `redis-cli ping`，间隔 10s | — |
| `api` | 自建（`backend/api/Dockerfile`） | `3000:3000` | `curl -f http://localhost:3000/health`，间隔 30s | postgres, redis（需健康） |
| `frontend` | 自建（`frontend/Dockerfile`） | `5173:80` | — | api（需健康） |
| `judge-worker` | 自建（`backend/judge-worker/Dockerfile`） | — | `pgrep -f judge-worker`，间隔 30s | postgres, redis, api（均需健康） |

### 6.2 卷挂载

| 卷名 | 挂载点 | 用途 |
|------|--------|------|
| `postgres_data` | `/var/lib/postgresql/data` | PostgreSQL 持久化存储 |
| `redis_data` | `/data` | Redis 持久化存储 |
| Docker Socket | `/var/run/docker.sock`（judge-worker） | Worker 沙箱执行需要访问 Docker |

### 6.3 服务依赖关系

```
postgres (healthy) ──┐
                     ├──> api (healthy) ──> frontend
redis (healthy) ─────┘                  └──> judge-worker
```

Docker Compose 内部使用服务名作为主机名（如 `postgres`、`redis`、`api`），而非 `localhost`。因此容器内的环境变量引用服务名：

```yaml
# API 容器内
DATABASE_URL: postgresql://postgres:postgres@postgres:5432/online_judge
REDIS_URL: redis://redis:6379

# Judge Worker 容器内
API_URL: http://api:3000
```

### 6.4 常用命令

```bash
# 启动所有服务
docker compose up -d

# 仅启动数据库和缓存（本地开发时常用）
docker compose up -d postgres redis

# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs -f api

# 停止并删除所有数据卷（重置数据）
docker compose down -v
```

---

## 7. 数据库配置

### 7.1 PostgreSQL 连接

API 服务器使用 `sqlx` 异步驱动连接 PostgreSQL：

```rust
// api/src/db/mod.rs -- API 连接池（main.rs 调用时传入 max_connections=10）
PgPoolOptions::new()
    .max_connections(10)
    .acquire_timeout(Duration::from_secs(30))
    .connect(&database_url)
    .await
```

```rust
// judge-worker/src/db/mod.rs -- Worker 连接池
PgPoolOptions::new()
    .max_connections(5)
    .acquire_timeout(Duration::from_secs(30))
    .connect(&database_url)
    .await
```

### 7.2 数据库迁移

API 服务使用 `sqlx::migrate!()` 宏在编译时嵌入迁移文件，并在启动时自动执行：

- 迁移文件位于 `api/migrations/` 目录
- 命名格式：`NNN_description.sql`（三位数字前缀）
- 在每次 API 启动时自动运行（`MIGRATOR.run(&pool).await`），无需手动迁移步骤
- 包含 28+ 个迁移文件，覆盖组织、用户、题目、提交、竞赛、班级、讨论、查重、消息等全部表

### 7.3 Docker 环境中的 PostgreSQL

Docker Compose 使用 `postgres:16-alpine` 镜像，默认配置：

```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=online_judge
```

数据持久化通过 Docker 卷 `postgres_data` 实现。

---

## 8. Redis 配置

### 8.1 连接方式

- **API 服务**使用 `deadpool_redis` 连接池（Tokio1 运行时），通过 `Config::from_url(redis_url)` 创建。连接失败时 API 降级启动（打印警告）。
- **Judge Worker**使用原生 `redis` crate 的 `MultiplexedConnection`（多路复用连接），并用 `tokio::sync::Mutex` 保护以安全共享。

### 8.2 Redis Streams

Judge Worker 通过 Redis Streams 实现消息队列，使用两个流：

| 流名称 | 环境变量 | 默认值 | 用途 |
|--------|---------|--------|------|
| 普通提交流 | `SUBMISSION_STREAM` | `submissions` | 处理日常题目提交 |
| 竞赛提交流 | `CONTEST_STREAM` | `submissions:contest` | 处理竞赛中的提交（优先消费） |
| 死信队列 | 自动（`{stream}:dlq`） | `submissions:dlq` / `submissions:contest:dlq` | 存放无法投递的判题结果 |

Worker 启动时会自动在两个流上创建消费者组（`XGROUP CREATE`，使用 `MKSTREAM` 选项），如果组已存在则忽略错误。

### 8.3 Redis 键空间设计

| 键模式 | TTL | 用途 |
|--------|-----|------|
| `bl:{jti}` | 与 JWT 剩余有效期一致 | JWT 令牌黑名单（登出时添加） |
| `worker:heartbeat:{worker_id}` | 30 秒 | 判题 Worker 心跳数据（通过 Lua 脚本原子写入 + 设置过期） |
| `submissions` | — | 普通提交消息流 |
| `submissions:contest` | — | 竞赛提交消息流 |
| `{stream}:dlq` | — | 死信队列 |

---

## 9. 安全配置

### 9.1 JWT 认证

| 配置项 | 值 | 说明 |
|--------|----|------|
| 算法 | HS256 | 对称密钥签名 |
| Access Token 有效期 | 4 小时 | 硬编码于 `api/src/auth/jwt_service.rs` 的 `ACCESS_TOKEN_EXPIRATION_HOURS` |
| Refresh Token 有效期 | 30 天 | 硬编码于 `api/src/auth/jwt_service.rs` 的 `REFRESH_TOKEN_EXPIRATION_DAYS` |
| Token 载荷（Claims） | `sub`, `email`, `role`, `school_id`, `campus_id`, `iat`, `exp`, `jti` | 包含用户身份和多租户信息 |
| 黑名单机制 | Redis `bl:{jti}` | 登出时将 JWT 的 `jti` 写入 Redis，TTL 等于 token 剩余有效期 |
| Access Token 传输 | `Authorization: Bearer <token>` 请求头 或 `access_token` Cookie | 支持两种方式 |
| Refresh Token 传输 | `refresh_token` Cookie（HttpOnly, SameSite=Strict） | 仅通过 HttpOnly Cookie 传输 |

### 9.2 密码安全

- 使用 `bcrypt` crate 进行密码哈希（`api/src/auth/password.rs`）
- 采用 `DEFAULT_COST`（cost = 12），即 2^12 = 4096 轮哈希迭代
- 迁移工具（`migration-tool/src/password.rs`）支持从 MD5 到 bcrypt 的密码升级

### 9.3 限流配置

API 使用 `tower_governor` 实现基于 IP 的令牌桶限流：

| 参数 | 值 | 说明 |
|------|----|------|
| 速率 | 每秒 1 个令牌 | `per_second(1)` |
| 突发大小 | 30 | `burst_size(30)` |
| 等效限制 | 约 30 请求/分钟 | 令牌桶算法 |

**不限流的端点**（基础设施端点必须放行以避免破坏健康检查和指标采集）：

- `/health/live` — 存活探针
- `/health/ready` — 就绪探针（检查 DB 和 Redis 连通性）
- `/health` → 重定向到 `/health/live`
- `/status` → 重定向到 `/health/ready`
- `/metrics` — Prometheus 指标
- `/internal/worker/heartbeat` — Worker 心跳（通过 `X-Worker-Secret` 认证，非 JWT）

### 9.4 CORS 配置

| 环境 | 行为 |
|------|------|
| 开发（`APP_ENV=development`） | 允许所有来源（`*`），启动时打印警告 |
| 生产（`APP_ENV=production`） | 仅允许 `CORS_ORIGINS` 中指定的来源；未设置时默认为空（阻止所有跨域请求） |

`CORS_ORIGINS` 格式为逗号分隔的 URL 列表，允许的方法为 GET、POST、PUT、PATCH、DELETE、OPTIONS，允许的请求头为 Authorization 和 Content-Type。

```bash
# 生产环境 CORS 示例
CORS_ORIGINS=https://judge.example.com,https://admin.judge.example.com
```

### 9.5 Worker 认证

Judge Worker 与 API 之间的认证通过 `X-Worker-Secret` 请求头实现：

- 使用恒定时间比较（constant-time byte comparison）防止时序攻击
- 密钥通过 `WORKER_SECRET` 环境变量配置，API 和 Worker 必须一致
- 此认证独立于 JWT，仅适用于 `/internal/*` 端点

### 9.6 多租户隔离

AlgoMaster 通过中间件强制执行组织级数据隔离：

1. **Auth 中间件**：验证 JWT 并将 `Claims`（包含 `school_id`）注入请求扩展
2. **Tenant 中间件**：从 JWT Claims 提取 `school_id` 创建 `TenantContext`。**从不信任客户端请求头中的租户标识**
3. **域查询**：所有域服务查询通过 `WHERE organization_id = $1` 过滤

### 9.7 RBAC 权限控制

权限中间件（`api-infra/src/middleware/authz.rs`）提供五种门控函数：

- `require_permission(Permission)` — 单权限检查
- `require_any_permission(&[Permission])` — 任一匹配检查
- `require_all_permissions(&[Permission])` — 全部匹配检查
- `require_min_role(Role)` — 层级角色检查
- `require_organization_access(org_id)` / `require_campus_access(campus_id)` — 数据库支持的成员检查

---

## 10. 日志配置

### 10.1 Rust 后端日志

所有 Rust 服务使用 `tracing` + `tracing-subscriber` 记录日志，通过 `RUST_LOG` 环境变量控制过滤级别。

**语法**：`target=level[,target=level...]`

| 级别 | 适用场景 |
|------|---------|
| `trace` | 最详细的调试信息 |
| `debug` | 开发调试 |
| `info` | 生产环境推荐 |
| `warn` | 仅警告和错误 |
| `error` | 仅错误 |

**各服务默认值**：

| 服务 | 默认 `RUST_LOG` |
|------|----------------|
| API | `api=debug,tower_http=debug,axum=trace` |
| Judge Worker | `judge_worker=debug,redis=warn` |
| Migration Tool | `info` |

### 10.2 日志示例

```bash
# API 生产环境日志配置
RUST_LOG=api=info,tower_http=warn,sqlx=warn

# Judge Worker 详细调试
RUST_LOG=judge_worker=trace,redis=debug

# 全局设为 info 级别
RUST_LOG=info
```

### 10.3 请求追踪与指标

- API 通过 `request_id` 中间件为每个请求分配唯一 ID，便于日志关联追踪
- API 集成了 Prometheus 指标，通过 `/metrics` 端点暴露，可配合外部监控系统采集
- Worker 心跳数据（活跃判题数、处理总数、平均等待时间、熔断器状态）通过 Redis 暴露给管理界面

---

## 11. 熔断器配置（Judge Worker）

Judge Worker 使用内存熔断器（`judge-worker/src/circuit_breaker.rs`）防止 Redis 和 API 的级联故障：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `failure_threshold` | 5 | 连续失败次数达到后开启熔断器 |
| `half_open_timeout_secs` | 30 | 开启后等待此时间进入半开状态 |

**状态机**：Closed（正常）→ Open（拒绝请求）→ HalfOpen（探测一次）→ 成功则 Closed，失败则 Open

熔断器状态包含在心跳负载中上报给 API，管理员可通过监控界面查看。

---

## 12. 生产环境配置建议

### 12.1 安全加固

| 项目 | 建议 |
|------|------|
| `JWT_SECRET` | 使用 256 位（32 字节）以上的随机密钥，可通过 `openssl rand -hex 32` 生成 |
| `WORKER_SECRET` | 同上，独立于 JWT 密钥 |
| `APP_ENV` | 必须设为 `production` |
| `CORS_ORIGINS` | 明确列出允许的前端域名，不要使用通配符 |
| `DATABASE_URL` | 使用最小权限数据库用户，不要使用 `postgres` 超级用户 |
| Docker `POSTGRES_PASSWORD` | 使用强密码，不要使用默认的 `postgres` |
| HTTPS | 在 API 前部署反向代理（Nginx / Caddy）终止 TLS |
| 密钥管理 | 使用 Docker Secrets、HashiCorp Vault 或云厂商的密钥管理服务，不要将密钥写入 `.env` 文件或镜像 |

### 12.2 性能调优

| 项目 | 建议值 | 说明 |
|------|--------|------|
| API 数据库连接池 | 10-20 | 根据并发量和数据库负载调整 |
| Worker 并发数（`MAX_CONCURRENT_JUDGES`） | 2-8 | 取决于服务器 CPU 和内存资源，每个沙箱进程独立运行 |
| Worker 恢复空闲阈值（`RECOVERY_IDLE_MS`） | 300000（5 分钟） | 较短值会更快恢复，但可能误判正在处理的任务 |
| PostgreSQL `shared_buffers` | 系统内存的 25% | PostgreSQL 核心配置 |
| PostgreSQL `max_connections` | 大于所有服务连接池总和 | 避免连接被拒绝 |
| Redis `maxmemory` | 根据实际使用量设置 | 防止 Redis 占用过多内存 |

### 12.3 日志与监控

| 项目 | 建议 |
|------|------|
| `RUST_LOG` | 生产环境设为 `api=info,tower_http=warn`，避免 trace/debug 级别的性能开销 |
| 日志聚合 | 使用 ELK、Loki 或云厂商日志服务收集容器日志 |
| Prometheus | 通过 API 的 `/metrics` 端点采集指标 |
| 健康检查 | 配置负载均衡器定期探测 `/health/ready` 端点 |
| Worker 心跳 | 监控 `worker:heartbeat:*` 键的存在性，缺失超过 30 秒表示 Worker 异常 |

### 12.4 数据备份

- **PostgreSQL**：定期执行 `pg_dump` 或配置 WAL 归档进行增量备份
- **Redis**：如需持久化，配置 `appendonly yes`（AOF 持久化）
- **测试用例文件**：确保 `test_case_dir` 的存储有备份策略

---

## 附录：全部环境变量速查表

### API 服务

| 变量 | 必填 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | 是 | — |
| `REDIS_URL` | 否 | `redis://127.0.0.1:6379` |
| `JWT_SECRET` | 生产必填 | 不安全默认值 |
| `WORKER_SECRET` | 生产必填 | 不安全默认值 |
| `API_BIND_ADDRESS` | 否 | `0.0.0.0:3000` |
| `APP_ENV` | 否 | `development` |
| `CORS_ORIGINS` | 生产推荐 | `*`（开发模式） |
| `RUST_LOG` | 否 | `api=debug,tower_http=debug,axum=trace` |
| `DEMO_ADMIN_EMAIL` | 否 | `admin@example.com` |
| `DEMO_ADMIN_PASSWORD` | 否 | `admin123` |
| `DEMO_ADMIN_SCHOOL_ID` | 否 | `1` |
| `DEMO_ADMIN_ROLE` | 否 | `admin` |

### Judge Worker

| 变量 | 必填 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | 是 | — |
| `REDIS_URL` | 否 | `redis://127.0.0.1/` |
| `API_URL` | 否 | `http://127.0.0.1:3000` |
| `WORKER_SECRET` | 否 | 不安全默认值 |
| `SUBMISSION_STREAM` | 否 | `submissions` |
| `CONTEST_STREAM` | 否 | `submissions:contest` |
| `CONSUMER_GROUP` | 否 | `judge_workers` |
| `CONSUMER_NAME` | 否 | `worker-{uuid}` |
| `MAX_CONCURRENT_JUDGES` | 否 | `4` |
| `RECOVERY_IDLE_MS` | 否 | `300000` |
| `RUST_LOG` | 否 | `judge_worker=debug,redis=warn` |

### Migration Tool

| 参数/变量 | 必填 | 说明 |
|-----------|------|------|
| `--dump-file` | 是 | MySQL dump 文件路径 |
| `--database-url`（或 `DATABASE_URL`） | 是 | PostgreSQL 连接字符串 |
| `--test-case-dir` | 否 | 测试用例目录 |
| `--org-id` | 二选一 | 目标组织 ID |
| `--create-default-org` | 二选一 | 自动创建默认组织 |
| `RUST_LOG` | 否 | 日志级别（默认 `info`） |

### 前端

| 变量 | 必填 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 否 | `/api` |
| `VITE_WS_BASE_URL` | 否 | 自动检测 |
| `VITE_API_PROXY_TARGET` | 否 | `http://localhost:3000` |
| `VITE_WS_PROXY_TARGET` | 否 | `ws://localhost:3000` |
| `VITE_ENABLE_MOCK_DATA` | 否 | `false` |
| `VITE_ENABLE_DIRECT_MESSAGES` | 否 | `true` |
| `VITE_ENABLE_PLAGIARISM` | 否 | `true` |
| `VITE_ENABLE_WEBSOCKET` | 否 | `true` |
| `VITE_APP_NAME` | 否 | `Online Judge` |
| `VITE_APP_VERSION` | 否 | `1.0.0` |
