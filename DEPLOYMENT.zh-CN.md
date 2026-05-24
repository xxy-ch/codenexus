![CodeNexus Banner](codenexus_banner.png)

> 📄 **[Read in English / 英文说明](DEPLOYMENT.zh-CN.md)**

# CodeNexus 部署指南

本文档详细描述 CodeNexus 在线判题平台的部署流程，包括 Docker Compose 编排、镜像构建、数据库管理、安全加固、监控运维以及故障排查等内容。

---

## 1. 部署概览

### 架构图

```
                    +-------------------+
                    |   用户浏览器       |
                    +--------+----------+
                             |
                      :80 / :5173
                             |
                    +--------v----------+
                    |  Frontend (Nginx) |
                    |  nginx:1.25-alpine|
                    |  反向代理 + 静态SPA |
                    +--------+----------+
                             |
                    /api/ -->|   /ws -->|
                             |          |
                    +--------v----------+
                    |     API 服务       |
                    |   Rust (Axum)     |
                    |   :3000           |
                    +--+-----+-----+---+
                       |     |     |
            +----------+     |     +----------+
            |                |                |
  +---------v-----+  +------v-------+  +-----v-----------+
  |  PostgreSQL   |  |    Redis      |  |  Judge Worker  |
  |  :5432        |  |  :6379        |  |  (Docker-in-   |
  |  postgres:16  |  |  redis:7      |  |   Docker 沙箱)  |
  +---------------+  +--------------+  +-----------------+
```

### 服务组件

| 服务 | 容器名称 | 镜像来源 | 对外端口 | 说明 |
|------|---------|---------|---------|------|
| postgres | online-judge-postgres | `postgres:16-alpine` | 5432 | 主数据库 |
| redis | online-judge-redis | `redis:7-alpine` | 6379 | 缓存 / 消息队列 / JWT 黑名单 |
| api | online-judge-api | `backend/api/Dockerfile` 构建 | 3000 | REST API + WebSocket 服务 |
| frontend | online-judge-frontend | `frontend/Dockerfile` 构建 | 5173 → 80 | Nginx 静态托管 + 反向代理 |
| judge-worker | online-judge-judge-worker | `backend/judge-worker/Dockerfile` 构建 | 无 | 判题执行服务 |

### 端口映射

| 宿主机端口 | 容器端口 | 服务 | 协议 |
|-----------|---------|------|------|
| 5432 | 5432 | PostgreSQL | TCP |
| 6379 | 6379 | Redis | TCP |
| 3000 | 3000 | API 服务 | HTTP / WebSocket |
| 5173 | 80 | Frontend (Nginx) | HTTP |

> 生产环境中，5432 和 6379 端口不应暴露到公网，仅保留 80/443（通过反向代理）对外。

---

## 2. 系统要求

### 操作系统

- **API / Frontend / PostgreSQL / Redis**：Linux、macOS 或 Windows 均可运行（Docker Desktop）
- **Judge Worker**：**必须运行在 Linux 主机上**，因为沙箱依赖以下 Linux 内核特性：
  - `cgroups` — 限制判题进程的内存和 CPU
  - `chroot` — 隔离用户代码的文件系统
  - `seccomp` — 过滤危险系统调用

### 软件依赖

| 软件 | 最低版本 | 说明 |
|------|---------|------|
| Docker Engine | >= 24.0 | 容器运行时 |
| Docker Compose | >= 2.20 (V2) | 服务编排（`docker compose` 命令） |
| Git | >= 2.30 | 代码拉取 |

### 硬件资源建议

| 规模 | CPU | 内存 | 磁盘 | 适用场景 |
|------|-----|------|------|---------|
| 最小 | 2 核 | 4 GB | 20 GB | 测试 / 开发 |
| 标准 | 4 核 | 8 GB | 50 GB | 小型教学机构（< 200 并发） |
| 推荐 | 8 核 | 16 GB | 100 GB | 中型机构（< 1000 并发） |

> Judge Worker 的资源需求取决于 `MAX_CONCURRENT_JUDGES` 配置和提交代码的语言。编译型语言（C++、Java）比解释型语言（Python）消耗更多内存。

---

## 3. Docker Compose 部署

### 3.1 环境准备

```bash
# 1. 克隆仓库
git clone <repository-url>
cd Online_Judge

# 2. 确认 Docker 和 Docker Compose 已安装
docker --version
docker compose version
```

### 3.2 配置环境变量

创建 `.env` 文件或直接导出环境变量：

```bash
# 生成安全的密钥
export JWT_SECRET=$(openssl rand -base64 64)
export WORKER_SECRET=$(openssl rand -base64 32)

# 可选：生产环境设置
export APP_ENV=production
export RUST_LOG=api=warn,tower_http=warn
```

`docker-compose.yml` 中的环境变量配置如下：

- `JWT_SECRET`：默认为 `default_jwt_secret_change_me`，**必须在生产环境中修改**
- `WORKER_SECRET`：docker-compose.yml 中未显式传递，worker 使用内置开发默认值；生产环境需确保 API 和 worker 设置相同的密钥
- `DATABASE_URL`：默认 `postgresql://postgres:postgres@postgres:5432/online_judge`（Docker 内部服务名）
- `REDIS_URL`：默认 `redis://redis:6379`（Docker 内部服务名）

### 3.3 构建与启动

```bash
# 构建并启动所有服务（后台运行）
docker compose up -d --build

# 查看服务状态
docker compose ps
```

首次启动时，服务按以下依赖顺序启动：

```
1. postgres  ──(healthcheck 通过)──>  2. redis  ──(healthcheck 通过)──>
3. api  ──(healthcheck 通过)──>  4. frontend + judge-worker 同时启动
```

API 启动时会通过 `docker-entrypoint.sh` 等待 PostgreSQL 就绪（使用 `pg_isready` 轮询，间隔 5 秒），然后自动执行数据库迁移，最后启动 HTTP 服务。

### 3.4 健康检查与验证

```bash
# 查看所有服务健康状态
docker compose ps

# 预期输出：所有服务的 Status 列显示 "healthy"
# NAME                      STATUS
# online-judge-postgres     Up (healthy)
# online-judge-redis        Up (healthy)
# online-judge-api          Up (healthy)
# online-judge-frontend     Up (healthy)
# online-judge-judge-worker Up (healthy)

# 手动验证 API 健康
curl http://localhost:3000/health/live
# 预期返回: OK

curl http://localhost:3000/health/ready
# 预期返回: {"status":"ok","db":"connected","redis":"connected"}

# 验证前端页面
curl -I http://localhost:5173
# 预期返回: HTTP/1.1 200 OK
```

### 3.5 常用运维命令

```bash
# 启动指定服务
docker compose up -d postgres redis

# 查看实时日志
docker compose logs -f api

# 查看最近 100 行日志
docker compose logs --tail 100 judge-worker

# 重新构建某个服务（代码更新后）
docker compose build api
docker compose up -d api

# 停止所有服务（保留数据）
docker compose down

# 停止所有服务并清除数据卷（危险操作，不可恢复）
docker compose down -v

# 进入容器 shell
docker compose exec api sh
docker compose exec postgres psql -U postgres online_judge
docker compose exec redis redis-cli
```

---

## 4. Docker 镜像详解

### 4.1 API 镜像（多阶段构建）

**Dockerfile 路径**: `backend/api/Dockerfile`
**构建上下文**: `./backend`

| 阶段 | 基础镜像 | 说明 |
|------|---------|------|
| 构建阶段 | `rust:1.88-alpine` | 编译 Rust 工作空间中的 `api` crate |
| 运行阶段 | `alpine:3.19` | 最小运行时，包含 `postgresql-client`、`ca-certificates`、`curl` |

**依赖缓存策略**：

Dockerfile 采用两层构建优化：
1. 先复制所有 `Cargo.toml` 和 `Cargo.lock`，创建虚拟 `main.rs`/`lib.rs` 文件，执行一次 `cargo build --release -p api`（失败被容忍），缓存编译依赖
2. 再复制实际源码，执行正式编译

这样，只要依赖不变（`Cargo.lock` 未修改），源码变更不会触发依赖重新编译，显著减少构建时间。

**运行时安全**：

- 以非 root 用户 `appuser`（UID/GID 1000）运行
- 仅包含必要的运行时二进制和迁移文件
- 健康检查：`curl -f http://localhost:3000/health`，间隔 30 秒

**入口脚本**（`api/docker-entrypoint.sh`）：

```
1. 从 DATABASE_URL 解析主机、端口、用户名、数据库名
2. 使用 pg_isready 轮询等待 PostgreSQL 就绪（5 秒间隔）
3. PostgreSQL 就绪后，exec 执行传入的 CMD（即 /app/api）
```

API 二进制启动后自动执行嵌入的数据库迁移（`sqlx::migrate!()`），无需手动迁移步骤。

### 4.2 Judge Worker 镜像（含编译器运行时）

**Dockerfile 路径**: `backend/judge-worker/Dockerfile`
**构建上下文**: `./backend`

| 阶段 | 基础镜像 | 说明 |
|------|---------|------|
| 构建阶段 | `rust:1.88-alpine` | 编译 `judge-worker` crate（仅依赖 `shared`） |
| 运行阶段 | `alpine:3.19` | 包含所有 6 种语言的编译器和运行时 |

**内置语言运行时**：

| 语言 | 包 | 用途 |
|------|-----|------|
| C | `gcc`、`musl-dev` | 编译和执行 C 代码 |
| C++ | `g++`、`musl-dev` | 编译和执行 C++ 代码 |
| Java | `openjdk17-jdk` | 编译和执行 Java 代码 |
| Python | `python3` | 执行 Python 代码 |
| Go | `go` | 编译和执行 Go 代码 |
| JavaScript | `nodejs`、`npm` | 执行 JavaScript 代码 |
| Rust | `rust`、`cargo` | 编译和执行 Rust 代码 |

**Docker 特殊配置**：

```yaml
judge-worker:
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock   # Docker-in-Docker 沙箱
  cap_add:
    - SYS_PTRACE    # 进程跟踪（cgroups 管理）
    - SYS_ADMIN     # 系统管理（chroot 隔离）
  security_opt:
    - no-new-privileges:true   # 禁止权限提升
```

- 运行阶段安装了 `docker` CLI，通过挂载宿主机的 Docker socket 实现 Docker-in-Docker 沙箱
- 以非 root 用户 `appuser` 运行，但该用户被加入 `docker` 组以操作 Docker socket
- `no-new-privileges:true` 确保即使容器内有 `SYS_ADMIN` 能力，也无法进一步提权

### 4.3 Frontend 镜像（Nginx 静态托管）

**Dockerfile 路径**: `frontend/Dockerfile`
**构建上下文**: `./frontend`

| 阶段 | 基础镜像 | 说明 |
|------|---------|------|
| 依赖安装 | `node:20-alpine` | `npm ci --only=production` 安装生产依赖 |
| 构建 | `node:20-alpine` | `npm ci` 安装全部依赖，`npm run build` 生成静态资源 |
| 生产 | `nginx:1.25-alpine` | 托管构建产物，包含自定义 Nginx 配置 |

**Nginx 配置**（`frontend/nginx.conf`）：

| 路由 | 行为 |
|------|------|
| `/api/*` | 反向代理到 `http://api:3000`（剥离 `/api` 前缀） |
| `/ws` | WebSocket 反向代理到 `http://api:3000`（含 Upgrade 头） |
| 静态资源（js/css/图片/字体） | 长期缓存（1 年），`Cache-Control: public, immutable` |
| 其他路径 | SPA 回退：`try_files $uri $uri/ /index.html` |
| `/health` | Nginx 级别的健康检查端点（直接返回 200 OK） |

**安全头**：

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; ...
```

**Gzip 压缩**：对大于 1024 字节的文本类资源启用 gzip。

---

## 5. 数据库管理

### 5.1 PostgreSQL 配置与初始化

`docker-compose.yml` 中 PostgreSQL 的配置：

```yaml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    POSTGRES_DB: online_judge
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres -d online_judge"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 30s
```

首次启动时，PostgreSQL 自动创建 `online_judge` 数据库。数据持久化在 `postgres_data` Docker 命名卷中。

> 生产环境中必须修改 `POSTGRES_PASSWORD`，不要使用默认的 `postgres`。

### 5.2 数据库迁移

#### 自动迁移

数据库迁移在编译时通过 `sqlx::migrate!()` 宏嵌入到 API 二进制中（定义在 `api/src/db/schema.rs`），API 启动时自动执行：

```rust
MIGRATOR.run(&db_pool).await?;
```

迁移文件位于 `backend/api/migrations/`，命名格式为 `NNN_description.sql`（3 位数字前缀）。当前包含 29 个迁移文件，覆盖以下数据表：

| 迁移范围 | 相关文件 |
|---------|---------|
| 组织 / 校区 | `001_create_organizations`、`002_create_campuses` |
| 用户与角色 | `003_create_users`、`004_create_user_roles`、`019_update_user_login`、`021_add_user_code_and_status`、`025_fix_user_roles_check`、`029_fix_user_roles_unique_null_campus` |
| 题目与测试用例 | `005_create_problems`、`006_create_test_cases` |
| 提交与判题 | `007_create_submissions`、`008_create_test_case_results` |
| 班级与作业 | `009_create_classes`、`010_create_class_enrollments`、`011_create_assignments`、`024_add_class_codes_and_assignment_publish` |
| 竞赛 | `012_create_contests`、`013_create_contest_problems`、`014_create_contest_submissions`、`020_create_contest_participants`、`026_create_contest_leaderboard_snapshots`、`027_add_is_upsolving_to_contest_submissions`、`028_drop_redundant_leaderboard_index` |
| 讨论区 | `015_create_discussions`、`2026-02-21-001-discussions` |
| 查博客 | `022_create_blog_tables` |
| 查重 | `016_create_plagiarism_reports`、`018_create_plagiarism_scan` |
| 私信 | `017_create_direct_messages` |
| 通知 | `2026-02-22-003-notifications` |
| 搜索索引 | `2026-02-22-002-search-indexes` |
| 判题语言设置 | `023_create_judge_language_settings` |
| 工具函数 | `000_create_update_updated_at_function` |

**无需手动迁移步骤** —— 部署新的 API 版本会自动应用所有未执行的迁移。

#### 手动迁移（仅在故障恢复时需要）

```bash
# 查看已执行的迁移
docker compose exec postgres psql -U postgres online_judge \
  -c "SELECT version, description, success_time FROM sqlx_migrations ORDER BY version;"

# 如果需要回滚某次迁移（手动操作，不推荐）
# 1. 连接数据库
docker compose exec postgres psql -U postgres online_judge
# 2. 手动编写反向 SQL
# 3. 删除 sqlx_migrations 中对应记录
```

### 5.3 备份与恢复

#### 手动备份

```bash
# 创建完整备份
docker compose exec postgres pg_dump -U postgres online_judge \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# 创建压缩备份（推荐，节省空间）
docker compose exec postgres pg_dump -U postgres -Fc online_judge \
  > backup_$(date +%Y%m%d_%H%M%S).dump
```

#### 恢复

```bash
# 从 SQL 文本文件恢复
cat backup_20260419.sql | docker compose exec -T postgres psql -U postgres online_judge

# 从自定义格式（-Fc）恢复
docker compose cp backup_20260419.dump online-judge-postgres:/tmp/
docker compose exec postgres pg_restore -U postgres -d online_judge /tmp/backup_20260419.dump
```

#### 定时备份（推荐）

<!-- VERIFY: 生产环境应配置 cron 或外部备份调度系统 -->

```bash
# 示例：使用 crontab 每天凌晨 2 点自动备份
# 编辑 crontab: crontab -e
0 2 * * * docker compose -f /path/to/Online_Judge/docker-compose.yml exec -T postgres pg_dump -U postgres -Fc online_judge > /backups/oj_$(date +\%Y\%m\%d).dump
```

---

## 6. Redis 配置

### 基础配置

```yaml
redis:
  image: redis:7-alpine
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

Redis 在系统中承担三个角色：

| 角色 | 说明 | 键模式 |
|------|------|--------|
| 缓存 | 题目预览缓存、会话数据 | 多种 |
| JWT 黑名单 | 用户登出后 Token 失效 | `bl:{jti}` |
| 消息队列 | 提交任务分发（Redis Streams） | `submissions`、`submissions:contest` |
| Worker 心跳 | 判题 Worker 状态上报 | `worker:heartbeat:{worker_id}` |

### 持久化

默认配置下，Redis 使用 Docker 卷 `redis_data` 持久化数据。Redis 默认使用 RDB 快照（`save` 配置）。如需更高的持久性保证，可在启动命令中追加 `--appendonly yes` 开启 AOF 模式：

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes
  volumes:
    - redis_data:/data
```

### 内存管理

<!-- VERIFY: 生产环境应根据服务器内存设置 Redis maxmemory -->

建议在 Redis 配置中设置最大内存和淘汰策略：

```yaml
redis:
  command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

---

## 7. 网络配置

### 服务间通信

Docker Compose 自动创建一个桥接网络，服务之间通过**服务名称**作为主机名进行通信：

| 源服务 | 目标服务 | 连接地址 | 协议 |
|--------|---------|---------|------|
| api | postgres | `postgres:5432` | PostgreSQL 协议 |
| api | redis | `redis:6379` | Redis 协议 |
| judge-worker | postgres | `postgres:5432` | PostgreSQL 协议 |
| judge-worker | redis | `redis:6379` | Redis 协议 |
| judge-worker | api | `api:3000` | HTTP |
| frontend (Nginx) | api | `api:3000` | HTTP / WebSocket |

### 端口暴露策略

**开发环境**（当前 docker-compose.yml 默认配置）：

所有服务端口映射到 `localhost`，方便本地调试。

**生产环境建议**：

```yaml
# 不暴露数据库和 Redis 端口
postgres:
  ports: []   # 删除或注释端口映射

redis:
  ports: []   # 删除或注释端口映射

# 仅通过反向代理暴露前端
frontend:
  ports:
    - "80:80"
    # 如需 HTTPS：
    # - "443:443"

# API 不直接对外（仅通过 Nginx 反向代理访问）
api:
  ports: []   # 删除或注释端口映射
```

### 反向代理集成

如需在生产环境中使用外部反向代理（如 Nginx、Caddy、Traefik），前端容器已内置反向代理规则。推荐的部署拓扑：

```
互联网 --> 反向代理 (443/HTTPS) --> Frontend 容器 (80)
                                   |-- /api/* --> API 容器 (3000)
                                   |-- /ws    --> API 容器 (3000, WebSocket)
```

外部反向代理的配置示例（以 Nginx 为例）：

```nginx
server {
    listen 443 ssl http2;
    server_name judge.example.com;

    ssl_certificate /etc/ssl/judge.crt;
    ssl_certificate_key /etc/ssl/judge.key;

    location / {
        proxy_pass http://127.0.0.1:5173;  # Frontend 容器
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 8. 数据迁移工具

### MySQL → PostgreSQL 迁移

`migration-tool` 是一个独立的命令行工具，用于从旧版 MySQL 数据库迁移数据到 PostgreSQL。这是一个**一次性操作**，不属于正常部署流程。

#### 构建

```bash
cd backend
cargo build --release -p migration-tool
```

#### 使用

```bash
# 查看帮助
cargo run --bin migration-tool -- --help

# 典型用法（参数通过环境变量或命令行传递）
cargo run --bin migration-tool -- \
  --mysql-url "mysql://user:pass@mysql-host:3306/old_judge" \
  --pg-url "postgresql://postgres:postgres@postgres:5432/online_judge"
```

该工具的源码位于 `backend/migration-tool/src/`，包含以下模块：

| 模块 | 说明 |
|------|------|
| `main.rs` | CLI 入口，使用 `clap` 解析参数 |
| `migrator.rs` | 迁移编排逻辑 |
| `parser.rs` | MySQL 数据解析 |
| `mapper.rs` | 数据模型映射 |
| `id_map.rs` | ID 映射（处理 MySQL 自增 ID 到 PostgreSQL 的转换） |
| `password.rs` | 密码格式迁移 |
| `test_cases.rs` | 测试用例数据迁移 |
| `models.rs` | 数据模型定义 |

> 迁移工具依赖 `shared` crate 中的公共类型定义。

---

## 9. 监控与日志

### 9.1 健康检查端点

API 提供遵循 Kubernetes 风格的健康探针：

| 端点 | 类型 | 说明 | 成功响应 | 失败响应 |
|------|------|------|---------|---------|
| `GET /health/live` | 存活探针 | 进程是否存活 | `200 OK`，body: `"OK"` | N/A |
| `GET /health/ready` | 就绪探针 | DB 和 Redis 是否可达 | `200`，含 `db`/`redis` 状态 JSON | `503 SERVICE_UNAVAILABLE` |
| `GET /health` | 兼容 | 重定向到 `/health/live` | `307` 重定向 | N/A |
| `GET /status` | 兼容 | 重定向到 `/health/ready` | `307` 重定向 | N/A |

就绪探针执行 `SELECT 1`（PostgreSQL）和 `PING`（Redis），响应体仅包含状态字符串（`"connected"` / `"unavailable"`），不暴露连接信息。

### 9.2 Prometheus 指标

API 暴露 `GET /metrics` 端点，输出 Prometheus 格式的指标数据。指标在 API 启动时初始化，追踪请求级别的遥测数据。

可配置 Prometheus 抓取：

```yaml
# prometheus.yml 示例
scrape_configs:
  - job_name: 'algomaster-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### 9.3 Worker 心跳

Judge Worker 每 **10 秒** 向 API 发送心跳（`POST /internal/worker/heartbeat`），包含：

| 字段 | 说明 |
|------|------|
| `worker_id` | 唯一消费者标识符 |
| `active_judgements` | 当前正在执行的判题任务数 |
| `total_processed` | 累计处理提交数 |
| `avg_wait_ms` | 队列等待时间指数移动平均 |
| `redis_breaker_state` | Redis 熔断器状态（Closed / Open / HalfOpen） |
| `api_breaker_state` | API 熔断器状态 |

心跳数据存储在 Redis 哈希中（`worker:heartbeat:{worker_id}`），TTL 为 30 秒。连续 3 次未上报心跳会触发错误日志。存储使用原子 Lua 脚本（HSET + EXPIRE 单次 EVAL）防止过期键残留。

### 9.4 Judge 监控管理端点

API 提供 `/admin/judge/` 下的管理端点用于监控判题基础设施：

| 端点 | 方法 | 所需角色 | 说明 |
|------|------|---------|------|
| `/admin/judge/status` | GET | root | 队列深度、活跃 Worker 数、平均等待时间 |
| `/admin/judge/dlq` | GET | admin | 列出死信队列条目 |
| `/admin/judge/dlq/{id}/retry` | POST | admin | 将 DLQ 条目重新入队到原始 Stream |
| `/admin/judge/dlq/{id}` | DELETE | admin | 永久丢弃 DLQ 条目 |

`/admin/judge/status` 返回**全局**（跨租户）数据，仅限 `root` 角色访问。

### 9.5 Docker 健康检查

| 服务 | 检查方式 | 间隔 | 超时 | 重试次数 | 启动等待 |
|------|---------|------|------|---------|---------|
| postgres | `pg_isready -U postgres -d online_judge` | 10s | 5s | 5 | 30s |
| redis | `redis-cli ping` | 10s | 5s | 5 | 10s |
| api | `curl -f http://localhost:3000/health` | 30s | 10s | 3 | 40s |
| frontend | `curl -f http://localhost:80/` | 30s | 10s | 3 | 10s |
| judge-worker | `pgrep -f judge-worker` | 30s | 10s | 3 | 10s |

### 9.6 日志

```bash
# 查看所有服务日志
docker compose logs -f

# 查看指定服务日志
docker compose logs -f api
docker compose logs -f judge-worker

# 查看最近 N 行
docker compose logs --tail 100 api
```

日志级别由 `RUST_LOG` 环境变量控制：

| 值 | 适用场景 |
|----|---------|
| `api=debug,tower_http=debug,axum=trace` | 开发（默认） |
| `api=warn,tower_http=warn` | 生产推荐 |
| `api=info` | 生产（适中详细度） |

Judge Worker 的默认日志级别为 `judge_worker=debug,redis=warn`。

---

## 10. 安全加固

### 10.1 密钥管理

| 密钥 | 默认值 | 生产环境要求 |
|------|-------|------------|
| `JWT_SECRET` | `default_jwt_secret_change_me` | **必须修改**。使用 `openssl rand -base64 64` 生成 |
| `WORKER_SECRET` | 开发用不安全默认值 | **必须修改**。API 和 Worker 必须使用相同值 |
| `POSTGRES_PASSWORD` | `postgres` | **必须修改** |
| `DATABASE_URL` | 包含明文密码 | 通过 Docker secrets 或 `.env` 文件管理，不要提交到版本控制 |

**生产环境中，如果 `APP_ENV=production`，API 启动时会在 `JWT_SECRET` 或 `WORKER_SECRET` 未设置的情况下直接拒绝启动**（返回 `AppStartupError::MissingSecret`）。

### 10.2 网络安全

- **不暴露数据库和 Redis 端口**：生产环境删除 docker-compose.yml 中 postgres 和 redis 的 `ports` 映射
- **CORS 配置**：生产环境通过 `CORS_ORIGINS` 环境变量指定允许的来源（逗号分隔），不要使用通配符 `*`
- **Nginx 安全头**：前端 Nginx 配置已包含 `X-Frame-Options`、`X-Content-Type-Options`、`X-XSS-Protection`、`Content-Security-Policy` 头
- **API 限流**：默认 30 次/分钟/IP（由 `tower_governor` 实现），健康检查和指标端点不受限流影响

### 10.3 容器安全

| 措施 | 服务 | 说明 |
|------|------|------|
| 非 root 用户 | api、judge-worker | 使用 `appuser`（UID 1000）运行 |
| `no-new-privileges` | judge-worker | 禁止权限提升 |
| 最小基础镜像 | 全部 | 使用 Alpine 精简镜像 |
| `.dockerignore` | 全部 | 排除 `.git`、`node_modules`、`target`、`.env` 等 |

### 10.4 认证与授权

- **JWT 认证**：`Authorization: Bearer <token>` 或 `access_token` Cookie
- **Refresh Token**：通过 `refresh_token` Cookie（HttpOnly, SameSite=Strict）
- **Token 黑名单**：登出后 Token 写入 Redis 黑名单（`bl:{jti}`）
- **Worker 认证**：判题结果回调使用 `X-Worker-Secret` 头（非 JWT）
- **RBAC**：基于角色的访问控制，21 种权限枚举

---

## 11. 扩缩容

### 11.1 Worker 水平扩展

Judge Worker 支持通过 Docker Compose `--scale` 参数水平扩展：

```bash
# 扩展到 3 个 Worker 实例
docker compose up -d --scale judge-worker=3
```

每个 Worker 自动生成唯一的 `CONSUMER_NAME`（UUID 格式），加入同一个 `judge_workers` 消费者组。Redis Streams 自动在组内消费者之间分配消息。

**扩展注意事项**：

- `MAX_CONCURRENT_JUDGES` 控制每个 Worker 的并发判题数（默认 4）
- 总并发能力 = Worker 实例数 × `MAX_CONCURRENT_JUDGES`
- 增加 Worker 数量时，确保宿主机有足够的 CPU 和内存
- 每个 Worker 都会挂载 Docker socket，多个 Worker 共享宿主机的 Docker 守护进程

### 11.2 资源调整

可在 docker-compose.yml 中为服务设置资源限制：

```yaml
api:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 2G
      reservations:
        cpus: '0.5'
        memory: 512M

judge-worker:
  deploy:
    resources:
      limits:
        cpus: '4.0'
        memory: 4G
      reservations:
        cpus: '1.0'
        memory: 1G
```

### 11.3 数据库连接池

API 的 PostgreSQL 连接池大小在 `db::create_pool()` 中配置（当前最大 10 连接，超时 30 秒）。如果扩展 Worker 数量或增加 API 实例，需相应增加 PostgreSQL 的 `max_connections` 和连接池大小。

---

## 12. 备份与灾难恢复

### 12.1 数据备份策略

| 数据 | 备份方式 | 频率 | 保留期 |
|------|---------|------|--------|
| PostgreSQL | `pg_dump -Fc`（自定义格式） | 每日 | 建议 30 天 |
| Redis | RDB 快照（自动） / AOF | 持续 | 随 Docker 卷 |
| Docker 卷 | `docker volume backup`（可选） | 每周 | 建议 4 周 |

### 12.2 完整恢复流程

```bash
# 1. 停止所有服务
docker compose down

# 2. 恢复数据卷（如果需要全新恢复）
# 注意：此操作会清除现有数据
docker volume rm online_judge_postgres_data online_judge_redis_data

# 3. 启动基础服务
docker compose up -d postgres redis

# 4. 等待 PostgreSQL 就绪
docker compose exec postgres pg_isready -U postgres

# 5. 恢复数据库
cat backup_20260419.dump | docker compose exec -T postgres \
  pg_restore -U postgres -d online_judge

# 6. 启动所有服务
docker compose up -d

# 7. 验证数据完整性
docker compose exec postgres psql -U postgres online_judge \
  -c "SELECT count(*) FROM users;"
curl http://localhost:3000/health/ready
```

### 12.3 部分数据恢复

如果只需恢复特定表的数据：

```bash
# 仅恢复 users 表
docker compose exec postgres psql -U postgres online_judge \
  -c "TRUNCATE users CASCADE;"

# 从备份中提取并恢复指定表
pg_restore -t users -d online_judge backup_file.dump
```

---

## 13. 故障排查

### 13.1 API 无法启动

**症状**：API 容器立即退出或持续重启。

**排查步骤**：

1. 查看日志：`docker compose logs api`
2. 检查 PostgreSQL 状态：`docker compose ps postgres`
3. 确认 `DATABASE_URL` 使用 Docker 服务名（`postgres` 而非 `localhost`）
4. 如果设置了 `APP_ENV=production`，确认 `JWT_SECRET` 和 `WORKER_SECRET` 已设置
5. 入口脚本会持续等待 PostgreSQL 就绪——如果数据库始终不可达，容器会循环等待

**常见原因**：

| 原因 | 解决方法 |
|------|---------|
| `DATABASE_URL` 中主机名错误 | 使用 `postgres`（Docker 服务名）替代 `localhost` |
| 生产环境缺少密钥 | 设置 `JWT_SECRET` 和 `WORKER_SECRET` 环境变量 |
| 迁移冲突 | 检查 `sqlx_migrations` 表，必要时手动修复 |

### 13.2 Judge Worker 无法连接 API

**症状**：Worker 日志反复出现 "Failed to send result to API" 错误。

**排查步骤**：

1. 确认 `API_URL` 使用 Docker 服务名：`http://api:3000`
2. 检查 `WORKER_SECRET` 在 API 和 Worker 之间是否一致
3. 确认 API 健康检查通过：`docker compose ps api`
4. 查看 API 端的错误日志：`docker compose logs api | grep worker`

### 13.3 数据库迁移错误

**症状**：API 日志显示迁移失败。

**排查步骤**：

1. 迁移在编译时嵌入——如果迁移文件有更新，需重新构建镜像：`docker compose build api`
2. 检查 `api/migrations/` 中的 SQL 文件是否有语法错误
3. 查看已执行的迁移记录：

```bash
docker compose exec postgres psql -U postgres online_judge \
  -c "SELECT version, description, success_time FROM sqlx_migrations ORDER BY version;"
```

4. 如果迁移部分应用，可能需要手动检查并修复 `sqlx_migrations` 表中的记录

### 13.4 前端无法访问 API

**症状**：浏览器显示网络错误或空白页面。

**排查步骤**：

1. 生产环境（Nginx）中，前端将 `/api/` 代理到 `http://api:3000`——确认 API 服务健康
2. `VITE_API_BASE_URL` 在构建时嵌入静态资源——修改后需重新构建前端镜像
3. 检查浏览器控制台的 CORS 错误——确认 `CORS_ORIGINS` 配置正确
4. 开发环境中，Vite 通过 `vite.config.ts` 代理到 `http://localhost:3000`

### 13.5 Redis 连接失败

**症状**：API 日志显示 "Redis not configured" 或 Worker 连接错误。

**排查步骤**：

1. 确认 Redis 健康：`docker compose ps redis`
2. 检查 `REDIS_URL` 使用 Docker 服务名：`redis://redis:6379`
3. API 在 Redis 不可用时可以启动（降级模式），但 JWT 黑名单和 WebSocket 功能将不可用
4. 测试 Redis 连接：`docker compose exec redis redis-cli ping`

### 13.6 Worker 不处理提交

**症状**：提交长期保持 "Pending" 状态。

**排查步骤**：

1. 确认 Worker 正在运行：`docker compose ps judge-worker`
2. 检查消费者组成员——Worker 启动时在 `submissions` 和 `submissions:contest` 两个 Stream 上创建 `judge_workers` 消费者组
3. 检查死信队列：通过管理端点 `GET /admin/judge/dlq` 查看失败条目
4. 查看 Worker 日志中是否有熔断器开启事件：`docker compose logs judge-worker | grep breaker`
5. 确认 `MAX_CONCURRENT_JUDGES` 不为 0（会导致永久阻塞）

### 13.7 Docker 构建缓存问题

```bash
# 清除构建缓存后重新构建
docker compose build --no-cache api
docker compose build --no-cache judge-worker
docker compose build --no-cache frontend

# 或清除所有 Docker 构建缓存
docker builder prune
```

---

## 14. 升级与回滚

### 14.1 版本更新流程

```bash
# 1. 拉取最新代码
git pull origin master

# 2. 备份数据库
docker compose exec postgres pg_dump -U postgres -Fc online_judge \
  > pre_upgrade_$(date +%Y%m%d).dump

# 3. 重新构建镜像
docker compose build

# 4. 滚动重启服务（按依赖顺序）
docker compose up -d postgres redis    # 基础服务（通常无变化）
docker compose up -d api               # API（自动执行新迁移）
docker compose up -d judge-worker      # Worker
docker compose up -d frontend          # 前端

# 5. 验证
docker compose ps
curl http://localhost:3000/health/ready
```

### 14.2 回滚流程

```bash
# 1. 停止所有服务
docker compose down

# 2. 切换到之前的版本
git checkout <previous-stable-tag>

# 3. 恢复数据库（如果迁移已执行）
cat pre_upgrade_YYYYMMDD.dump | docker compose exec -T postgres \
  pg_restore -U postgres -d online_judge

# 4. 重新构建并启动
docker compose build
docker compose up -d

# 5. 验证
docker compose ps
curl http://localhost:3000/health/ready
```

### 14.3 数据库迁移回滚注意事项

- `sqlx::migrate!()` 只支持**向前**迁移，不提供自动回滚
- 回滚前**必须**恢复数据库备份
- 如果新迁移尚未执行（API 还没启动），只需切换代码即可
- 如果新迁移已经执行，但你想保留数据，需要**手动编写反向 SQL**

### 14.4 CI/CD 集成

项目配置了 GitHub Actions CI 流水线（`.github/workflows/ci.yml`）：

| 阶段 | 触发条件 | 内容 |
|------|---------|------|
| Rust 检查 | 所有推送和 PR | `cargo fmt --check`、`cargo clippy`、`cargo test --workspace` |
| Frontend 检查 | 所有推送和 PR | `npm ci`、`npm run lint`、`npx vitest --run`、`npm run build` |
| Docker 构建验证 | 推送到 master 分支 | 构建三个 Docker 镜像（验证 Dockerfile 正确性） |

CI 使用 `SQLX_OFFLINE=true` 模式，不需要实际数据库连接即可编译检查。Docker 构建验证仅在 master 分支推送时触发。
