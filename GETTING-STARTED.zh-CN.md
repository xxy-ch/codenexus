![CodeNexus Banner](codenexus_banner.png)

> 📄 **[Read in English / 英文说明](GETTING-STARTED.zh-CN.md)**

# 快速上手指南

本指南将帮助你在本地搭建 CodeNexus 开发环境。你可以选择 Docker Compose 一键部署所有服务，也可以仅用 Docker 运行基础设施（PostgreSQL、Redis），然后本地启动后端和前端进行开发。

---

## 1. 前置条件

在开始之前，请确认你的系统已安装以下工具：

| 工具 | 版本要求 | 用途 | 安装方式 |
|------|---------|------|---------|
| Docker + Docker Compose | Docker 20.10+，Compose V2 | 一键启动所有服务（推荐） | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| Rust 工具链 | 1.90.0（edition 2021） | 编译运行 API 服务和判题 worker | `rustup install 1.90.0` |
| Node.js | >= 20 | 前端构建与开发服务器 | [nvm](https://github.com/nvm-sh/nvm) 或 [Node.js 官网](https://nodejs.org/) |
| npm | >= 9 | 前端包管理器（随 Node.js 一同安装） | Node.js 自带 |
| psql（可选） | PostgreSQL 16+ 客户端 | 手动执行 SQL 查询和种子脚本 | `brew install libpq` (macOS) 或系统包管理器 |

### Rust 工具链说明

项目的 Rust 工具链版本通过 `backend/rust-toolchain.toml` 固定：

```toml
[toolchain]
channel = "1.90.0"
components = ["rustfmt", "clippy"]
```

如果你使用 `rustup`，进入 `backend/` 目录编译时会自动选择正确的版本。首次安装：

```bash
rustup install 1.90.0
rustup default 1.90.0
```

### 系统要求

- **操作系统**：macOS 或 Linux 均可进行开发。判题 worker（judge-worker）的沙箱功能依赖 Linux cgroups/seccomp，在 macOS 上只能通过 Docker 容器运行。
- **内存**：建议至少 8 GB（Docker 运行全部服务 + Rust 编译需要一定内存）。
- **磁盘**：Rust 编译缓存和 Docker 镜像大约需要 5-10 GB 磁盘空间。

---

## 2. 快速启动（5 分钟）

这是从零开始启动整个系统的最短路径。

### 步骤 1：克隆仓库

```bash
git clone <repository-url> && cd Online_Judge
```

### 步骤 2：启动基础设施服务

使用 Docker Compose 启动 PostgreSQL 和 Redis：

```bash
docker compose up -d postgres redis
```

等待健康检查通过（大约 30 秒）：

```bash
docker compose ps postgres redis
```

确认两个容器的 Status 列显示 `healthy`。

### 步骤 3：启动后端 API 服务

```bash
cd backend
cargo run --bin api
```

首次编译需要几分钟时间（后续增量编译会快很多）。启动成功后你会看到类似输出：

```
INFO api: Connecting to database...
INFO api: Database connection pool created
INFO api: Running embedded database migrations...
INFO api: Database migrations complete
INFO api: Redis connection pool created
INFO api: Starting server on 0.0.0.0:3000
INFO api: Server listening on 0.0.0.0:3000
```

API 服务启动时会自动执行数据库迁移（见第 4 节），无需手动操作。

### 步骤 4：启动前端开发服务器

新开一个终端窗口：

```bash
cd frontend
npm ci
npm run dev
```

Vite 开发服务器启动在 5173 端口，并自动将 `/api` 请求代理到后端 `localhost:3000`。

### 步骤 5：访问应用

在浏览器中打开：

```
http://localhost:5173
```

### 步骤 6：加载演示数据（可选）

```bash
bash scripts/bootstrap_demo.sh
```

此脚本会向数据库插入演示组织（"Demo School"）、测试用户、示例题目和竞赛数据。脚本支持幂等执行，可以安全重复运行。加载完成后可使用以下测试账号（密码均为 `admin123`）：

| 邮箱 | 用户名 | 角色 | 用途 |
|------|--------|------|------|
| `admin@example.com` | 1001 | root（管理员） | 管理后台、用户管理 |
| `student1@example.com` | 2001 | student | 提交代码、参加竞赛 |
| `student2@example.com` | 2002 | student | 第二个学生测试账号 |
| `teacher@example.com` | 3001 | teacher | 创建题目、管理班级 |

---

## 3. 环境变量配置

### 3.1 配置文件位置

项目提供了示例环境变量文件，可以基于它们创建本地配置：

```bash
cp backend/api/.env.example backend/api/.env
cp frontend/.env.example frontend/.env
```

### 3.2 API 服务环境变量

编辑 `backend/api/.env`，以下为本地开发的最小配置：

| 变量名 | 是否必需 | 默认值 | 说明 |
|--------|---------|--------|------|
| `DATABASE_URL` | **必需** | 无 | PostgreSQL 连接字符串 |
| `REDIS_URL` | 可选 | `redis://127.0.0.1:6379` | Redis 连接字符串 |
| `JWT_SECRET` | 生产环境必需 | 不安全的开发默认值 | JWT 签名密钥 |
| `WORKER_SECRET` | 生产环境必需 | 不安全的开发默认值 | 判题 worker 与 API 之间的共享密钥 |
| `API_BIND_ADDRESS` | 可选 | `0.0.0.0:3000` | API 监听地址 |

本地开发连接 Docker 中的 PostgreSQL，`DATABASE_URL` 应设为：

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge
```

`JWT_SECRET` 和 `WORKER_SECRET` 在开发模式下有内置默认值，API 启动时会输出警告日志。**绝不要在生产环境使用默认值。**

### 3.3 判题 Worker 环境变量

| 变量名 | 是否必需 | 默认值 | 说明 |
|--------|---------|--------|------|
| `DATABASE_URL` | **必需** | 无 | PostgreSQL 连接字符串 |
| `REDIS_URL` | 可选 | `redis://127.0.0.1/` | Redis 连接字符串 |
| `API_URL` | 可选 | `http://127.0.0.1:3000` | API 服务地址，用于回传判题结果 |
| `WORKER_SECRET` | **必需** | 无 | 必须与 API 的 `WORKER_SECRET` 一致 |
| `SUBMISSION_STREAM` | 可选 | `submissions` | Redis Stream 名称 |
| `CONSUMER_GROUP` | 可选 | `judge_workers` | Redis 消费者组名称 |
| `CONSUMER_NAME` | 可选 | 自动生成 UUID | 消费者标识 |

### 3.4 前端环境变量

编辑 `frontend/.env`：

| 变量名 | 是否必需 | 默认值 | 说明 |
|--------|---------|--------|------|
| `VITE_API_BASE_URL` | 可选 | `/api` | API 基础 URL |
| `VITE_WS_BASE_URL` | 可选 | 自动检测 | WebSocket URL |
| `VITE_API_PROXY_TARGET` | 可选 | `http://localhost:3000` | Vite 开发代理目标（仅开发时） |
| `VITE_WS_PROXY_TARGET` | 可选 | `ws://localhost:3000` | WebSocket 代理目标 |
| `VITE_ENABLE_WEBSOCKET` | 可选 | `true` | 启用 WebSocket 实时通知 |

前端 Vite 配置（`frontend/vite.config.ts`）已设置代理规则：
- `/api` 请求代理到 `http://localhost:3000`（自动去除 `/api` 前缀）
- `/ws` 请求代理到 `ws://localhost:3000`

因此本地开发时只需保持 `VITE_API_BASE_URL=/api` 即可，无需修改。

---

## 4. 数据库初始化

### 4.1 自动迁移

API 服务在启动时会自动执行数据库迁移。迁移逻辑通过 `sqlx::migrate!()` 宏在编译时嵌入到二进制文件中，运行时执行 `MIGRATOR.run(&pool).await`。

启动日志中的关键信息：

```
INFO api: Running embedded database migrations...
INFO api: Database migrations complete
```

### 4.2 迁移文件位置

所有迁移文件存放在 `backend/api/migrations/` 目录下，以 SQL 文件形式组织：

```
backend/api/migrations/
├── 000_create_update_updated_at_function.sql
├── 001_create_organizations.sql
├── 002_create_campuses.sql
├── 003_create_users.sql
├── 004_create_user_roles.sql
├── 005_create_problems.sql
├── 006_create_test_cases.sql
├── 007_create_submissions.sql
├── 008_create_test_case_results.sql
├── 009_create_classes.sql
├── 010_create_class_enrollments.sql
├── 011_create_assignments.sql
├── 012_create_contests.sql
├── 013_create_contest_problems.sql
├── 014_create_contest_submissions.sql
├── 015_create_discussions.sql
├── 016_create_plagiarism_reports.sql
├── 017_create_direct_messages.sql
├── 018_create_plagiarism_scan.sql
├── 019_update_user_login.sql
├── 020_create_contest_participants.sql
├── 021_add_user_code_and_status.sql
├── 022_create_blog_tables.sql
├── 023_create_judge_language_settings.sql
├── 024_add_class_codes_and_assignment_publish.sql
├── 025_fix_user_roles_check.sql
├── 026_create_contest_leaderboard_snapshots.sql
├── 027_add_is_upsolving_to_contest_submissions.sql
├── 028_drop_redundant_leaderboard_index.sql
├── 029_fix_user_roles_unique_null_campus.sql
└── ...
```

### 4.3 重置数据库

如果需要完全重置数据库（**警告：删除所有数据**）：

```bash
docker compose down -v    # 删除数据卷
docker compose up -d postgres redis   # 重新启动
# 然后重新启动 API 服务，迁移会自动执行
```

### 4.4 手动执行种子数据

```bash
# 方式一：使用 psql 客户端（需要本地安装 psql）
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/online_judge"
bash scripts/bootstrap_demo.sh

# 方式二：通过 Docker 容器中的 psql
bash scripts/bootstrap_demo.sh
# 脚本会自动检测：如果本地有 psql 就直接用，否则通过 docker compose exec 执行
```

---

## 5. Docker Compose 一键部署

### 5.1 启动全部服务

使用 Docker Compose 可以一键启动所有服务（PostgreSQL、Redis、API、前端、判题 Worker）：

```bash
docker compose up -d --build
```

构建过程大约需要 5-10 分钟（Rust 编译较慢）。等待所有容器健康检查通过：

```bash
docker compose ps
```

所有服务状态应为 `healthy`：

| 容器名 | 端口映射 | 用途 |
|--------|---------|------|
| `online-judge-postgres` | 5432:5432 | PostgreSQL 16 数据库 |
| `online-judge-redis` | 6379:6379 | Redis 7 缓存与消息队列 |
| `online-judge-api` | 3000:3000 | REST API + WebSocket 服务器 |
| `online-judge-frontend` | 5173:80 | 前端静态文件（Nginx 托管） |
| `online-judge-judge-worker` | 无外部端口 | 代码判题服务 |

### 5.2 启动单个服务

如果只需要启动部分服务：

```bash
# 仅启动基础设施
docker compose up -d postgres redis

# 启动 API（依赖 postgres 和 redis）
docker compose up -d api

# 启动前端（依赖 api）
docker compose up -d frontend

# 启动判题 worker（依赖 postgres、redis 和 api）
docker compose up -d judge-worker
```

### 5.3 查看日志

```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f api
docker compose logs -f judge-worker
```

### 5.4 停止与清理

```bash
# 停止所有服务（保留数据）
docker compose down

# 停止并删除数据卷（完全清理）
docker compose down -v

# 重新构建并启动（代码变更后）
docker compose up -d --build
```

### 5.5 判题 Worker 注意事项

判题 Worker 容器需要 `SYS_PTRACE` 和 `SYS_ADMIN` 内核能力以支持 cgroups 沙箱隔离，`docker-compose.yml` 中已配置：

```yaml
cap_add:
  - SYS_PTRACE
  - SYS_ADMIN
```

在 Linux 宿主机上可直接运行。在 macOS 或 Windows 上，Docker Desktop 使用虚拟机，这些能力可能受限——判题沙箱功能可能无法正常工作，但其余功能不受影响。

---

## 6. 验证安装

### 6.1 基础设施健康检查

确认 PostgreSQL 和 Redis 正常运行：

```bash
# 检查容器状态
docker compose ps postgres redis

# 测试 Redis 连接
docker compose exec redis redis-cli ping
# 预期输出: PONG

# 测试 PostgreSQL 连接
docker compose exec postgres pg_isready -U postgres -d online_judge
# 预期输出: accepting connections
```

### 6.2 API 健康检查

API 提供了 Kubernetes 风格的健康检查端点：

```bash
# 存活探针 -- 进程是否存活
curl http://localhost:3000/health/live
# 返回: OK

# 就绪探针 -- 数据库和 Redis 是否连接正常
curl http://localhost:3000/health/ready
# 返回: {"status":"ok","db":"connected","redis":"connected"}

# 兼容旧端点
curl http://localhost:3000/health
# 307 重定向到 /health/live
```

如果就绪探针返回 503 状态码，说明数据库或 Redis 连接存在问题，请参考第 7 节排查。

### 6.3 前端验证

1. 浏览器访问 `http://localhost:5173`，应看到登录页面
2. 确认浏览器开发者工具的 Network 面板中，API 请求正常返回（无 500 错误）
3. 如果已加载演示数据，使用 `admin@example.com` / `admin123` 登录

### 6.4 前端测试

```bash
cd frontend

# 运行单元测试
npm run test

# 运行 E2E 测试（需要 API 服务正在运行）
npm run test:e2e:playwright
```

---

## 7. 常见问题排查

### 7.1 端口被占用

如果 3000、5173、5432 或 6379 端口已被其他服务占用，你有两种处理方式：

**方式一：查找并停止占用进程**

```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :5173
lsof -i :5432
lsof -i :6379

# 停止占用进程
kill <PID>
```

**方式二：修改 docker-compose.yml 中的端口映射**

将左侧宿主机端口改为其他可用端口，例如将 API 端口从 `3000:3000` 改为 `3001:3000`。注意：修改后需要同步更新 `VITE_API_PROXY_TARGET` 和 `API_URL` 等环境变量。

### 7.2 数据库连接错误

**症状**：API 启动时报 `connection refused` 或 `no connection pool available`。

**排查步骤**：

1. 确认 PostgreSQL 容器正在运行且健康：
   ```bash
   docker compose ps postgres
   ```
2. 查看 PostgreSQL 日志：
   ```bash
   docker compose logs postgres
   ```
3. 确认 `DATABASE_URL` 配置正确。对于 Docker 中的 PostgreSQL：
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge
   ```
   注意 Docker 容器之间通信使用服务名（如 `postgres`），但从宿主机连接使用 `localhost`。
4. 如果是首次启动，等待 PostgreSQL 健康检查通过后再启动 API（`docker compose ps` 中 Status 应为 `healthy`）。

### 7.3 Redis 连接失败

**症状**：API 日志显示 Redis 连接警告。

**影响**：API 在没有 Redis 的情况下仍可运行，但以下功能不可用：
- WebSocket 实时通知
- JWT 黑名单（注销登录）
- 判题 Worker 消息队列
- 实时排行榜

**排查步骤**：

```bash
# 检查 Redis 容器状态
docker compose ps redis

# 测试 Redis 连接
docker compose exec redis redis-cli ping
# 预期输出: PONG

# 查看 Redis 日志
docker compose logs redis
```

### 7.4 Rust 编译问题

**症状**：`cargo build` 或 `cargo run` 失败。

**常见原因与解决方法**：

1. **工具链版本不匹配**：
   ```bash
   # 检查当前工具链版本
   rustup show

   # 确保使用正确版本
   cd backend
   cargo --version  # 应输出 1.90.0 相关信息
   ```

2. **首次编译时间过长**：Rust 首次编译需要下载所有依赖并编译，通常需要 3-8 分钟，这是正常现象。后续增量编译会快很多。

3. **编译缓存问题**：
   ```bash
   cd backend
   cargo clean    # 清理编译缓存
   cargo build    # 重新编译
   ```

4. **SQLx 编译时检查**：项目使用 `sqlx::migrate!()` 宏在编译时嵌入迁移文件。如果编译时报 SQLx 相关错误，确保 `DATABASE_URL` 指向一个可达的 PostgreSQL 实例，或者设置 `SQLX_OFFLINE=true` 使用缓存的查询元数据。

### 7.5 前端页面空白

**症状**：浏览器可以打开 `http://localhost:5173`，但页面无数据显示。

**排查步骤**：

1. 确认 API 服务正在运行：
   ```bash
   curl http://localhost:3000/health/live
   ```
2. 检查浏览器开发者工具的 Console 面板，查看是否有 JavaScript 错误
3. 检查 Network 面板，确认 `/api` 请求是否正常返回
4. 确认 `VITE_API_BASE_URL` 设置正确，默认 `/api` 配合 Vite 代理即可正常工作

### 7.6 数据库迁移失败

**症状**：API 启动时迁移步骤报错。

**排查步骤**：

```bash
# 查看 PostgreSQL 日志中的 SQL 错误
docker compose logs postgres
```

如果需要从头开始：

```bash
docker compose down -v    # 删除所有数据卷（谨慎操作！）
docker compose up -d postgres redis   # 重新启动基础设施
# 然后重新启动 API 服务
```

### 7.7 判题 Worker 无法处理提交

**症状**：学生提交代码后长时间处于 Pending 状态。

**排查步骤**：

1. 确认判题 Worker 容器正在运行：
   ```bash
   docker compose ps judge-worker
   ```
2. 查看 Worker 日志：
   ```bash
   docker compose logs -f judge-worker
   ```
3. 确认 Worker 能连接到 Redis（消费提交队列）和 API（回传判题结果）
4. Worker 需要 `SYS_PTRACE` 和 `SYS_ADMIN` 能力——检查 Docker 是否正确分配了这些权限
5. 在 macOS 上，由于内核限制，原生沙箱功能可能无法正常工作，建议使用 Linux 环境或接受部分功能受限

---

## 8. 下一步

- **架构概览** -- 阅读 [ARCHITECTURE.md](ARCHITECTURE.zh-CN.md) 了解系统设计、数据流和组件关系。
- **完整配置** -- 阅读 [CONFIGURATION.md](CONFIGURATION.zh-CN.md) 查看所有环境变量的详细说明、默认值和不同环境的配置方式。
- **开发指南** -- 阅读 [DEVELOPMENT.md](DEVELOPMENT.zh-CN.md) 了解本地开发工作流、构建命令和代码风格规范。
- **测试指南** -- 阅读 [TESTING.md](TESTING.zh-CN.md) 了解测试框架、运行测试和编写新测试的方法。
- **API 文档** -- 查看 `docs/api/` 目录获取各端点的详细接口文档。

<!-- GSD:docs -->
