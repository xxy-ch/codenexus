<!-- GSD:docs -->

# 系统架构文档

## 1. 系统架构概览

CodeNexus 是一个面向教育机构的多租户在线评测平台。系统支持六种编程语言（C、C++、Java、Python、Go、JavaScript），提供基于 cgroups/seccomp 的沙箱化代码执行环境，为学生、教师和管理员提供跨学校/校区的隔离服务。

系统采用分布式三服务架构，通过 REST API、Redis Streams 和 WebSocket 三种通信机制协同工作：

```
+----------------+       REST + WebSocket        +------------------+       Redis Streams + HTTP        +------------------+
|                | <---------------------------> |                  | <-----------------------------> |                  |
|   前端服务      |     :5173 (dev) / :80 (prod)  |   API 服务        |     POST /submissions/{id}/results|  评测 Worker      |
|   React 19     |                              |   Axum + Rust    |                              |   独立 Rust 进程   |
|   TypeScript   |                              |   :3000          |                              |  (Linux 沙箱)     |
+----------------+                              +--------+---------+                              +--------+---------+
                                                         |                                            |
                                                         |  sqlx (PgPool)                              |  sqlx (PgPool)
                                                         v                                            v
                                               +------------------+                        +------------------+
                                               |   PostgreSQL 16  |                        |   PostgreSQL 16  |
                                               +------------------+                        +------------------+
                                                         |
                                                         |  deadpool-redis
                                                         v
                                               +------------------+
                                               |    Redis 7       |
                                               | (缓存、队列、     |
                                               |  JWT 黑名单)     |
                                               +------------------+
```

**核心架构特性：**

- **多租户数据隔离**：在查询层面实现，所有领域查询均按 `organization_id` 过滤，确保租户间数据零泄漏
- **异步解耦评测**：提交通过 Redis Streams 异步流向独立 Worker，API 与评测完全解耦
- **进程内 WebSocket**：WebSocket 服务与 API 共进程运行，实现毫秒级实时推送
- **工作区级共享类型**：Rust 工作区通过 `shared` crate 在所有 crate 间共享核心类型（`Claims`、`Role`、`Permission` 等）

---

## 2. 后端架构（`backend/` 目录）

后端采用 Cargo 工作区组织，共包含 14 个 crate，按职责分为基础设施层、业务领域层、评测层和工具层。

### 2.1 工作区结构

```
backend/
├── Cargo.toml              # 工作区定义，声明所有成员 crate 和共享依赖
├── Cargo.lock              # 依赖锁定文件
├── rust-toolchain.toml     # Rust 工具链版本配置
│
├── api/                    # HTTP + WebSocket 服务器（入口 crate）
├── api-infra/              # 共享基础设施（AppState、中间件、错误类型、WebSocket、测试工具包）
│
├── domain-users/           # 用户领域：个人信息、管理员用户管理
├── domain-problems/        # 题目领域：CRUD、测试用例、访问控制
├── domain-contests/        # 比赛领域：比赛生命周期、评分、排行榜快照
├── domain-submissions/     # 提交领域：代码提交、结果查询、重测
├── domain-classes/         # 班级领域：班级管理、选课、作业
├── domain-community/       # 社区领域：讨论、博客、私信
├── domain-search/          # 搜索领域：全文搜索（题目、讨论、用户）
├── domain-leaderboard/     # 排行榜领域：全局/题目/比赛/班级维度的排名
├── domain-imex/            # 导入导出领域：批量导入/导出题目和用户
│
├── judge-worker/           # 独立评测 Worker（Redis Streams 消费者 + 沙箱）
├── migration-tool/         # MySQL 到 PostgreSQL 数据迁移 CLI
└── shared/                 # 跨 crate 共享模型（Claims、Role、Permission、User）
```

### 2.2 API 服务（`api/`）

中央 HTTP 和 WebSocket 服务器，基于 Axum 框架构建。负责认证鉴权、所有 CRUD 操作和实时推送。

**职责：**

- 用户认证（JWT 签发、刷新、登出，配合 Redis 黑名单）
- 从 JWT Claims 中提取租户信息（绝不从客户端请求头提取）
- REST 端点：题目、比赛、提交、班级、讨论、博客、搜索、通知、私信
- WebSocket 服务端：实时评测进度、排行榜、通知、聊天
- Prometheus 指标端点 `/metrics`
- K8s 风格健康探针 `/health/live` 和 `/health/ready`
- 将提交入队到 Redis Streams 供 Worker 消费
- 接收 Worker 的 HTTP 回调并写入评测结果
- Worker 心跳聚合（存储在 Redis 中，30 秒 TTL）

**关键文件：**

| 文件 | 职责 |
|------|------|
| `api/src/main.rs` | 路由注册、中间件堆叠、服务器启动、数据库迁移 |
| `api/src/auth/` | JWT 服务、登录/注册/刷新/登出处理器 |
| `api/src/middleware/` | 认证、租户、请求 ID、指标中间件 |
| `api/src/websocket/` | WebSocket 升级和消息广播 |
| `api/src/db/` | 连接池、Schema 迁移（`sqlx::migrate!()`） |
| `api/src/error.rs` | 重新导出 `api-infra` 中的 `AppError` |
| `api/src/notifications/` | 站内通知 |
| `api/src/plagiarism/` | 代码查重 |
| `api/src/judge_monitor/` | 管理员评测监控 |
| `api/src/worker_heartbeat.rs` | Worker 心跳处理 |

**AppState 结构（定义于 `api-infra/src/state.rs`）：**

```rust
pub struct AppState {
    pub db_pool: PgPool,                                  // PostgreSQL 连接池
    pub redis_pool: Option<deadpool_redis::Pool>,         // Redis 连接池（可选）
    pub redis_url: String,                                // Redis URL
    pub jwt_service: Arc<dyn TokenService>,               // JWT 服务（trait object）
    pub jwt_secret: String,                               // JWT 签名密钥
    pub worker_secret: String,                            // Worker 共享密钥
    pub websocket_server: Arc<WebSocketServer>,           // WebSocket 服务器
    pub class_membership_checker: Arc<dyn ClassMembershipChecker>,  // 班级成员检查器
    pub prometheus_handle: PrometheusHandle,              // Prometheus 指标句柄
    pub preview_cache: Arc<PreviewCache>,                 // 导入预览缓存
}
```

### 2.3 共享基础设施（`api-infra/`）

为 API 和所有领域 crate 提供公共基础设施，避免领域 crate 依赖 API crate 本身。

**模块结构：**

| 模块 | 职责 |
|------|------|
| `state.rs` | `AppState` 定义，包含所有共享资源的引用 |
| `error.rs` | `AppError` 统一错误类型，映射到 HTTP 状态码 |
| `config.rs` | `AppConfig` 环境配置加载与校验（生产环境强制密钥、开发环境宽容默认值） |
| `rbac.rs` | `RbacService` — 内存中的角色-权限矩阵 |
| `metrics.rs` | Prometheus 指标注册与记录 |
| `middleware/auth.rs` | JWT 认证中间件 |
| `middleware/tenant.rs` | 租户提取中间件 |
| `middleware/authz.rs` | RBAC 权限检查中间件 |
| `middleware/permission.rs` | 权限中间件重新导出（指向 `authz`） |
| `websocket/` | WebSocket 服务器和消息类型定义 |
| `testkit/` | 集成测试工具包 |
| `traits/` | 跨 crate 接口（如 `ClassMembershipChecker`、`TokenService`） |

### 2.4 领域 Crate 模式

每个业务领域遵循一致的**三层模块结构**：

```
domain-{name}/
  src/
    mod.rs            -- 重新导出公共路由函数和关键类型
    routes.rs         -- 薄 Axum 路由处理器（HTTP 层）
    models.rs         -- 请求/响应 DTO 和数据库行结构体（serde + sqlx 派生）
    service.rs        -- 业务逻辑、SQL 查询、WebSocket 通知
    {feature}.rs      -- 领域特定模块（如 access.rs、test_cases.rs）
```

**领域 Crate 一览：**

| Crate | 路由函数 | 领域说明 |
|-------|---------|---------|
| `domain-users` | `user_router()` | 用户个人资料、管理员用户管理 |
| `domain-problems` | `problems_router()` | 题目 CRUD、测试用例管理、访问控制 |
| `domain-contests` | `contests_router()` | 比赛生命周期、评分、排行榜快照 |
| `domain-submissions` | `submissions_router()` | 代码提交、结果检索、重测、Redis 入队 |
| `domain-classes` | `classes_router()` | 班级管理、选课、作业 |
| `domain-community` | `discussions_router()` + `blog_router()` + `messages_router()` | 讨论区、博客文章、私信 |
| `domain-search` | `search_router()` | 全文搜索（题目、讨论、用户） |
| `domain-leaderboard` | `leaderboard_router()` | 多维度排行榜（全局/题目/比赛/班级） |
| `domain-imex` | `imex_router()` | 批量导入/导出题目和用户 |

**路由注册（`api/src/main.rs`）：**

```rust
let protected_router = Router::new()
    .nest("/users", domain_users::user_router())
    .nest("/problems", domain_problems::problems_router())
    .nest("/contests", domain_contests::contests_router())
    .nest("/leaderboard", domain_leaderboard::leaderboard_router())
    .nest("/submissions", domain_submissions::submissions_router())
    .nest("/classes", domain_classes::classes_router())
    .nest("/discussions", domain_community::discussions_router())
    .nest("/blog", domain_community::blog_router())
    .nest("/search", domain_search::search_router())
    .nest("/notifications", notifications::notifications_router())
    .nest("/messages", domain_community::messages_router())
    .nest("/imex", domain_imex::imex_router())
    .nest("/admin/plagiarism", plagiarism::plagiarism_router())
    .nest("/admin/judge", judge_monitor::judge_monitor_router())
    .route_layer(tenant_middleware)
    .route_layer(auth_middleware)
    .layer(rate_limit);
```

### 2.5 评测 Worker（`judge-worker/`）

独立的 Rust 二进制程序，从 Redis Streams 消费提交消息，在沙箱中编译执行代码，将结果回调给 API。

**模块结构：**

| 模块 | 职责 |
|------|------|
| `main.rs` | Worker 生命周期、并发处理循环、崩溃恢复 |
| `queue/consumer.rs` | Redis Streams XREADGROUP、双流优先级消费者 |
| `queue/dlq.rs` | 死信队列写入/读取/删除 |
| `queue/recovery.rs` | XPENDING/XCLAIM 崩溃恢复 |
| `queue/producer.rs` | 消息发送（测试用） |
| `processor/service.rs` | 编译、执行、输出对比 |
| `processor/main.rs` | 处理器入口 |
| `compiler/` | 语言检测和编译配置（gcc、g++、javac、go build） |
| `sandbox/cgroups.rs` | cgroups CPU/内存限制 |
| `sandbox/chroot.rs` | chroot 文件系统隔离 |
| `sandbox/seccomp.rs` | seccomp 系统调用过滤 |
| `sandbox/executor.rs` | 进程执行器 |
| `circuit_breaker.rs` | 内存中断路器（Closed/Open/HalfOpen） |
| `heartbeat.rs` | 后台心跳上报任务（每 10 秒） |
| `db/` | 直接 PostgreSQL 连接（获取测试用例） |

**核心设计特性：**

- **双流优先级消费**：比赛提交优先于普通提交
- **并发 Semaphore 控制**：通过 `tokio::sync::Semaphore` 限制同时评测数（默认 4）
- **Fire-and-forget 任务调度**：消息读取后立即 spawn 异步任务，不等待完成
- **RAII 活跃计数器**：`ActiveGuard` 在创建时递增、销毁时递减，准确追踪并发评测数
- **指数移动平均等待时间**：无锁 CAS 循环更新 `avg_wait_ms`，避免并发写入丢失
- **指数退避重试**：API 回调失败后按 2s、4s、8s + 随机抖动重试

### 2.6 共享类型（`shared/`）

跨 crate 共享的核心模型，定义在 `shared/src/models/` 中：

| 模块 | 内容 |
|------|------|
| `auth.rs` | `Claims`（JWT 载荷）、`LoginRequest`、`LoginResponse`、`RefreshRequest` |
| `user.rs` | `User`、`UserPublic` |
| `role.rs` | `Role` 枚举（6 级层次结构）及序列化/反序列化 |
| `permission.rs` | `Permission` 枚举（21 个权限）及分类 |

### 2.7 迁移工具（`migration-tool/`）

MySQL 到 PostgreSQL 的数据迁移 CLI 工具，使用 `clap` 解析命令行参数。

| 模块 | 职责 |
|------|------|
| `main.rs` | CLI 入口 |
| `migrator.rs` | 迁移编排器 |
| `mapper.rs` | MySQL 到 PostgreSQL 数据映射 |
| `parser.rs` | 数据解析 |
| `password.rs` | 密码格式转换（MD5 到 bcrypt） |
| `models.rs` | 迁移数据模型 |
| `id_map.rs` | ID 映射表（MySQL 自增 ID 到 PostgreSQL UUID） |
| `test_cases.rs` | 测试用例迁移 |

### 2.8 前端服务（`frontend/`）

基于 React 19 + Vite + TypeScript 的单页应用。

**技术栈：**

- **框架**：React 19 + Vite 7
- **路由**：react-router-dom v7
- **状态管理**：Zustand（客户端认证状态）、TanStack React Query（服务端状态缓存）
- **HTTP 客户端**：Axios（带自动 Token 刷新拦截器）
- **表单**：react-hook-form + zod 校验
- **UI 组件**：shadcn + class-variance-authority (CVA)
- **样式**：Tailwind CSS v4
- **代码编辑器**：Monaco Editor（代码提交）+ CodeMirror（Markdown）
- **图表**：Recharts
- **实时通信**：原生 WebSocket（非 Socket.IO）

**路由守卫：**

- `ProtectedRoute` — 未登录用户重定向到 `/login`
- `PublicRoute` — 已登录用户重定向到 `/dashboard`
- `AdminRoute` — 非管理员重定向到 `/unauthorized`

---

## 3. 中间件管道

Axum 路由器按以下顺序堆叠中间件（从外到内）：

```
请求 Request
  |
  v
[1] CORS（tower_http::CorsLayer）
  |     支持配置具体域名（生产）或通配符 *（开发）
  v
[2] Request ID（注入唯一追踪 ID）
  v
[3] Metrics（记录请求耗时和状态码）
  v
[4] Rate Limiting（tower_governor：30 请求/分钟/IP）
  |     仅应用于面向用户的端点
  |     不限制：健康探针、指标、Worker 心跳
  v
[5] Auth 中间件（JWT 校验 + Redis 黑名单检查）
  |     注入：Claims、user_id (UUID)
  |     支持来源：Authorization: Bearer 头 或 access_token Cookie
  v
[6] Tenant 中间件（从 Claims 中提取 school_id）
  |     注入：TenantContext { tenant_id }
  |     绝不从客户端请求头读取租户信息
  v
路由处理器 Route Handler
```

**不受限端点**（无速率限制、无认证）：`/health/live`、`/health/ready`、`/health`、`/status`、`/metrics`、`/internal/worker/heartbeat`

**速率受限公共端点**：`/auth/login`、`/auth/register`、`/auth/refresh`、`/auth/logout`、`/ws`

**速率受限受保护端点**：所有 `/users/*`、`/problems/*`、`/contests/*` 等

---

## 4. 数据流

### 4.1 提交生命周期

从用户提交代码到实时显示结果的完整路径：

```
1. 用户提交代码
   前端 -> POST /submissions -> API 服务

2. API 校验并入队
   API -> XADD submissions {data: SubmissionMessage, school_id, submitted_at}
   API -> WebSocket 广播 SubmissionUpdate (status: "queued")

3. Worker 出队并处理
   Worker -> XREADGROUP GROUP judge_workers {consumer} COUNT 1 STREAMS submissions >
   Worker -> 从 PostgreSQL 获取测试用例
   Worker -> 编译源代码（如需）
   Worker -> 在沙箱中执行（cgroups + seccomp）
   Worker -> 对比实际输出与期望输出

4. Worker 将结果发送给 API
   Worker -> POST /submissions/{id}/results {JudgeResult}
   Worker -> XACK submissions {message_id}

5. API 存储结果并通知
   API -> UPDATE submissions SET status, score, ...
   API -> WebSocket 广播 SubmissionUpdate (status: "accepted"/"wrong_answer"/...)
```

**优先级机制**：Worker 从两个流中读取 — `submissions:contest`（高优先级）和 `submissions`（普通）。通过"停放"算法保证比赛提交始终先于普通提交处理，即使普通消息已被读取。

**入队元数据（`domain-submissions/src/queue.rs`）：**

```rust
// XADD 字段包含：
fields = vec![
    ("submission_id", submission_id.to_string()),
    ("data", message_json),                          // 序列化的 SubmissionMessage
    ("submitted_at", chrono::Utc::now().to_rfc3339()),  // 入队时间戳（计算等待时间）
    ("source_stream", stream_name.to_string()),      // 来源流（DLQ 重试路由）
    ("school_id", school_id.to_string()),            // 租户隔离
];
// 如果有 contest_id，则额外包含
fields.push(("contest_id", cid.to_string()));
```

**失败处理策略：**

| 失败类型 | 处理方式 |
|---------|---------|
| 处理错误（编译失败等） | 记录日志，ACK 消息（防止无限重试） |
| API 回调失败 | 3 次重试，指数退避（2s、4s、8s + 随机抖动 0-499ms） |
| 重试耗尽 | 写入 DLQ 流 `submissions:dlq`，保留完整元数据 |
| Worker 崩溃 | 下次启动时通过 XPENDING/XCLAIM 恢复 |

### 4.2 认证流程

```
1. 登录
   POST /auth/login {username, password}
   API -> 校验密码（bcrypt 哈希，支持 MD5 透明升级到 bcrypt）
   API -> 生成 access_token (JWT, 15min) + refresh_token (JWT, 7d)
   API -> 返回 {token, refresh_token, user}

2. 请求认证（中间件链）
   Request -> auth_middleware:
     从 Authorization: Bearer 头 或 access_token Cookie 提取 JWT
     校验签名和过期时间
     检查 Redis 黑名单：EXISTS bl:{jti}
     将 Claims + user_id (UUID) 注入请求扩展
   Request -> tenant_middleware:
     从 Claims 中提取 school_id（绝不从客户端请求头读取）
     将 TenantContext { tenant_id } 注入请求扩展

3. Token 刷新
   POST /auth/refresh {refresh_token} 或从 refresh_token Cookie
   API -> 校验 refresh token
   API -> 生成新 access_token
   API -> 返回 {token}

4. 登出
   POST /auth/logout
   API -> 将 JWT ID 写入 Redis 黑名单：SET bl:{jti} EX 900
   Token 在黑名单 TTL 过期前被 auth_middleware 拒绝
```

**JWT Claims 结构：**

```json
{
  "sub": "uuid",
  "email": "user@example.com",
  "role": "teacher",
  "school_id": 42,
  "campus_id": 10,
  "iat": 1700000000,
  "exp": 1700000900,
  "jti": "uuid"
}
```

### 4.3 比赛流程

```
1. 创建比赛（教师/管理员）
   POST /contests -> 创建比赛记录 -> 设置时间窗口和题目

2. 用户注册
   POST /contests/{id}/register -> 检查时间窗口 -> 注册为参赛者

3. 提交到比赛（通过 priority queue 优先处理）
   POST /submissions (带 contest_id)
   API -> XADD submissions:contest {data, contest_id, school_id, ...}
   Worker -> 优先从 submissions:contest 流消费

4. 实时排行
   API -> WebSocket 推送 LeaderboardUpdate 到订阅者
   前端 -> 实时更新排名表

5. 比赛结束
   API -> 生成排行榜快照 -> 保存最终排名
```

---

## 5. 多租户架构

### 5.1 组织层级

```
组织 Organization (school_id)
  +-- 校区 Campus (campus_id)
  |     +-- 班级 Class
  |     +-- 班级 Class
  +-- 校区 Campus
        +-- 班级 Class
```

### 5.2 租户隔离机制

**1) JWT 内嵌身份标识**

每个已认证请求在 JWT 载荷中携带 `school_id` 和可选的 `campus_id`。`tenant_middleware` 从已验证的 Claims 中提取这些信息，绝不从客户端请求头（如 `X-Tenant-ID`）中读取。

**2) 请求级上下文**

中间件处理后，处理器可从 `Extension<TenantContext>` 中获取 `tenant_id: i64`。`Root` 角色跳过租户检查，拥有系统全局访问权限。

**3) 查询级过滤**

每个领域服务查询都包含 `WHERE organization_id = $1`（或等效子句），确保数据不会跨租户泄漏。这是由处理器提取 `TenantContext` 并将 `tenant_id` 传递给服务方法来实现的。

**4) Worker 租户隔离**

Redis Streams 中的提交消息携带 `school_id` 作为顶级字段。DLQ 条目存储 `school_id` 用于租户范围的管理员重试。Worker 心跳载荷不包含租户信息（Worker 跨租户共享）。

### 5.3 隔离保证总结

| 层级 | 机制 | 说明 |
|------|------|------|
| 传输层 | JWT 签名 | 客户端无法伪造 `school_id` |
| 中间件层 | tenant_middleware | 忽略所有客户端请求头 |
| 查询层 | WHERE organization_id = $1 | 所有领域查询强制租户过滤 |
| 消息层 | school_id 字段 | Redis Stream 消息携带租户标识 |
| 广播层 | broadcast_to_tenant() | WebSocket 消息限定租户范围 |

---

## 6. Redis Streams 架构

### 6.1 流拓扑

```
submissions            -- 普通提交队列
submissions:contest    -- 高优先级比赛提交队列
submissions:dlq        -- 死信队列（失败交付）
```

### 6.2 消费者组模式

所有评测 Worker 在两个流上共享同一个消费者组（默认 `judge_workers`）。Redis Streams 消费者组提供：

- **负载均衡**：每条消息只投递给组内的一个消费者
- **崩溃恢复**：待处理消息（XPENDING）可被其他消费者认领（XCLAIM）
- **显式确认**：Worker 在成功处理后显式 ACK 消息

### 6.3 优先级消费算法

Worker 使用双流优先级消费者，保证严格的"比赛优先"排序：

```
步骤 1：如果存在上一轮"停放"的普通消息，先尝试排空比赛流。
         如果比赛流有消息，继续停放普通消息，返回比赛消息。
         如果比赛流确实为空，返回停放的普通消息。

步骤 2：排空比赛流（非阻塞 XREADGROUP 循环，直到流为空）。

步骤 3：从普通流读取一条消息，设置 200ms 的 BLOCK 超时。

步骤 4（关键重检）：读取普通消息后，再执行一次非阻塞检查。
         如果在间隙中有比赛消息到达，停放普通消息，返回比赛消息。
```

**停放机制**消除了以下竞态条件：比赛消息在普通消息已从流中读取但尚未处理时到达。停放的消息在下一轮消费中优先返回（仅当比赛流为空时）。

### 6.4 崩溃恢复

Worker 启动时，扫描两个流中超过 `RECOVERY_IDLE_MS`（默认 300 秒 / 5 分钟）的待处理消息：

1. **XPENDING** — 分页遍历待处理条目，按空闲时间 > 阈值过滤
2. **XCLAIM** — 将超时消息认领给当前 Worker
3. **处理** — 编译、执行、尝试交付（同正常路径）
4. **ACK 或重试** — 成功则 ACK；交付失败则写入 DLQ

### 6.5 死信队列（DLQ）

当评测结果无法交付给 API 时（3 次重试耗尽或断路器开启），结果连同完整元数据写入 DLQ 流：

```
DLQ 条目包含：
- judge_result: 序列化的 JudgeResult
- original_message: 序列化的 SubmissionMessage（可重入队）
- origin_stream: 来源流名（普通/比赛）
- submitted_at: 原始入队时间
- school_id: 租户标识
- error_message: 失败原因
```

管理员可通过 API 检查 DLQ 并触发重试，重试时消息会被路由回正确的源流。

---

## 7. 断路器

两个内存中断路器保护 Worker 免受级联故障：

| 断路器 | 阈值 | 半开超时 | 用途 |
|--------|------|---------|------|
| Redis 断路器 | 5 次连续失败 | 30 秒 | 防止 Redis 不可用时挂起 |
| API 断路器 | 5 次连续失败 | 30 秒 | 防止 API 不可用时挂起 |

**状态机：**

```
Closed（正常） → 连续 5 次失败 → Open（拒绝请求）
Open（拒绝） → 等待 30 秒 → HalfOpen（试探）
HalfOpen（试探） → 成功 → Closed（恢复）
HalfOpen（试探） → 失败 → Open（重新拒绝）
```

当 API 断路器处于 Open 状态时，评测结果直接写入 DLQ 而非丢弃。断路器状态为内存状态（不持久化），Worker 重启后重置——这是可接受的，因为重启本身就是一种恢复。

---

## 8. 安全架构

### 8.1 角色层次体系

```
Root > OrganizationAdmin > CampusAdmin > Teacher > TeachingAssistant > Student
```

`Role` 枚举（定义在 `shared/src/models/role.rs`）实现 `is_higher_or_equal()` 方法用于层次比较。`Root` 拥有系统全局访问权限并跳过所有租户检查。

### 8.2 基于权限的访问控制（RBAC）

`Permission` 枚举定义了跨 6 个类别的 21 个细粒度权限：

| 类别 | 权限 |
|------|------|
| 用户管理 | `ManageUsers`、`ViewUsers` |
| 题目管理 | `ManageProblems`、`ViewAllProblems`、`SubmitSolution` |
| 比赛管理 | `ManageContests`、`RegisterContests`、`ViewContestProblems` |
| 班级管理 | `ManageClasses`、`ManageAssignments`、`GradeSubmissions`、`ViewClassStats` |
| 组织管理 | `ManageOrganization`、`ManageCampus` |
| 系统管理 | `ViewLeaderboard`、`ViewStatistics`、`ModerateContent`、`ManageTags`、`ManageSystem`、`ViewLogs`、`ManageApiKeys` |

**角色-权限矩阵（`api-infra/src/rbac.rs`）：**

| 角色 | 权限数 | 关键权限 |
|------|--------|---------|
| Root | 21 | 全部权限 |
| OrganizationAdmin | 11 | 用户/题目/比赛/班级/组织管理 + 排行榜/统计/标签 |
| CampusAdmin | 10 | 用户/题目/比赛/班级/校区管理 + 排行榜/统计 |
| Teacher | 11 | 题目/比赛/班级管理 + 提交/评分 + 排行榜/统计 |
| TeachingAssistant | 6 | 查看题目/提交/评分/班级统计 + 排行榜 |
| Student | 3 | 提交代码/注册比赛/查看排行榜 |

`RbacService` 使用内存中的 `HashSet<Permission>` 矩阵映射角色到权限集。路由处理器使用 Axum 中间件提取器：

- `require_permission(Permission)` — 单权限门控
- `require_any_permission(&[Permission])` — 任一匹配门控
- `require_all_permissions(&[Permission])` — 全部匹配门控
- `require_min_role(Role)` — 层次角色检查

### 8.3 Worker 认证

评测 Worker 使用共享密钥（`WORKER_SECRET`）通过 `X-Worker-Secret` 请求头向 API 认证。这与基于 JWT 的用户认证完全独立，仅用于：

- 结果回调：`POST /submissions/{id}/results`
- 心跳上报：`POST /internal/worker/heartbeat`

### 8.4 密码安全

- 新用户密码使用 `bcrypt` 哈希存储
- 从 MySQL 迁移的旧密码（MD5 哈希）支持透明升级：登录时验证 MD5 哈希后自动重新哈希为 bcrypt
- 生产环境强制 `JWT_SECRET` 和 `WORKER_SECRET` 必须设置

### 8.5 沙箱安全

评测沙箱使用三层隔离机制：

| 层 | 技术 | 限制内容 |
|----|------|---------|
| 资源限制 | cgroups | CPU 时间（`cpu_time_limit_ms`）、内存（`memory_limit_bytes`，默认 256MB）、进程数（`pids_max`，默认 64） |
| 文件系统 | chroot | 隔离到 `/var/lib/onlinejudge/sandbox`，限制文件访问范围 |
| 系统调用 | seccomp | 过滤危险系统调用，仅允许评测所需的最小系统调用集 |

`SandboxConfig` 默认配置：

```rust
SandboxConfig {
    sandbox_root: "/var/lib/onlinejudge/sandbox",
    cpu_time_limit_ms: 2000,
    memory_limit_bytes: 268_435_456,  // 256 MB
    pids_max: 64,
}
```

---

## 9. WebSocket 架构

WebSocket 服务端与 API 服务共进程运行。客户端通过 `/ws` 端点连接并可订阅主题。

### 9.1 消息类型

使用 `#[serde(tag = "type")]` 实现的标签联合（tagged union）：

| 类型 | 用途 |
|------|------|
| `SubmissionUpdate` | 实时评测进度（用户的提交） |
| `LeaderboardUpdate` | 排行榜排名变化 |
| `Notification` | 站内通知（特定用户） |
| `ContestUpdate` | 比赛状态/时间变化 |
| `ProblemStats` | 题目提交统计 |
| `ChatMessage` | 比赛讨论聊天 |
| `DiscussionReply` | 题目讨论区新回复 |
| `ArticleComment` | 博客文章新评论 |
| `TrendingArticles` | 博客热门文章更新 |
| `Ping` / `Pong` | 心跳保活 |
| `Error` | 订阅或协议错误 |

### 9.2 广播范围

| 方法 | 范围 | 用途 |
|------|------|------|
| `send_to_user(user_id)` | 用户的所有 WebSocket 连接 | 个人通知、提交进度 |
| `send_to_topic(topic)` | 主题的所有订阅者 | `submission:{id}`、`contest:{id}` |
| `broadcast()` | 所有已连接客户端 | 系统级公告 |
| `broadcast_to_tenant(school_id)` | 租户内的所有客户端 | 组织级通知 |

### 9.3 主题访问控制

| 主题模式 | 访问控制 |
|---------|---------|
| `submission:{id}` | 仅提交者本人 |
| `contest:{id}` | 同组织用户 |
| `contest:{id}:chat` | 教师 + 已注册参赛者 |
| `user:{uuid}` | 自动订阅（个人通知） |
| `leaderboard:{scope}:{id}` | 公开 |

---

## 10. Worker 心跳系统

评测 Worker 每 10 秒通过 `POST /internal/worker/heartbeat` 向 API 上报状态（使用 `X-Worker-Secret` 认证，非 JWT）。

**心跳载荷：**

```json
{
  "worker_id": "worker-<uuid>",
  "active_judgements": 2,
  "total_processed": 1042,
  "avg_wait_ms": 350,
  "redis_breaker_state": "Closed",
  "api_breaker_state": "Closed"
}
```

API 将心跳数据存储在 Redis 中，TTL 为 30 秒。当 TTL 过期（连续 3 次心跳丢失）时，Worker 被视为离线并从管理监控面板移除。

**指标追踪：**

| 指标 | 实现方式 | 说明 |
|------|---------|------|
| `active_judgements` | `AtomicUsize` + RAII `ActiveGuard` | 创建时递增，销毁时递减 |
| `total_processed` | `AtomicUsize` | 完成的提交总数 |
| `avg_wait_ms` | `AtomicUsize` + 无锁 CAS EMA 循环 | 指数移动平均（权重 70/30） |
| 断路器状态 | `CircuitBreaker::state()` | Redis 和 API 各一个 |

---

## 11. 数据库架构

### 11.1 迁移系统

迁移通过 `sqlx::migrate!()` 宏在编译时嵌入（位于 `api/src/db/schema.rs`），服务器启动时自动执行 `MIGRATOR.run(&pool).await`。迁移文件在 `api/migrations/` 目录中，使用 3 位数字前缀命名约定（`NNN_description.sql`）。

### 11.2 核心数据表

| 表名 | 用途 |
|------|------|
| `organizations` | 顶层租户（学校） |
| `campuses` | 学校下的子组织（校区） |
| `users` | 用户账户（含角色、school_id、campus_id） |
| `problems` | 题目定义（难度、标签、可见性） |
| `problems_test_cases` | 题目的输入/输出对及评分权重 |
| `submissions` | 用户代码提交（状态、分数、运行时间、内存） |
| `test_case_results` | 逐测试用例的评测结果 |
| `contests` | 比赛定义（含时间窗口） |
| `contest_problems` | 比赛关联的题目 |
| `contest_participants` | 比赛注册用户 |
| `contest_submissions` | 比赛范围的提交（含 upsolving 标记） |
| `classes` | 校区下的班级 |
| `class_enrollments` | 学生选课记录 |
| `assignments` | 班级作业（题目集） |
| `discussions` | 题目讨论（论坛风格） |
| `blog_articles`、`blog_comments` | 博客文章和评论 |
| `direct_messages` | 用户间私信 |
| `plagiarism_reports`、`plagiarism_scan` | 代码相似度检测结果 |
| `notifications` | 站内通知队列 |
| `judge_language_settings` | 每题目的语言启用/禁用配置 |

### 11.3 查询模式

- 始终使用参数化查询（`$1`、`$2` 等）——绝不使用字符串拼接
- `query_as::<_, T>()` 用于映射到类型化结构体（需派生 `FromRow`）
- `query_scalar::<_, T>()` 用于返回单个值
- `fetch_one` / `fetch_optional` / `fetch_all` 根据预期基数选择
- `sqlx::PgPool` 连接池（API 中 min 10、max 30 连接）

---

## 12. 错误处理

### 12.1 API 错误处理

统一的 `AppError` 枚举（定义在 `api-infra/src/error.rs`）映射到 HTTP 状态码：

| 变体 | HTTP 状态码 | 使用场景 |
|------|-----------|---------|
| `AppError::Auth(msg)` | 401 Unauthorized | JWT 无效或缺失、Token 被拉黑 |
| `AppError::Forbidden(msg)` | 403 Forbidden | 权限不足或租户不匹配 |
| `AppError::NotFound(msg)` | 404 Not Found | 资源不存在 |
| `AppError::Validation(msg)` | 400 Bad Request | 请求体或参数无效 |
| `AppError::Database(msg)` | 500 Internal Server Error | 数据库查询失败 |
| `AppError::Internal(msg)` | 500 Internal Server Error | 未预期的服务器错误 |

响应体格式：

```json
{
  "error": "人类可读的错误描述",
  "status": 401
}
```

转换链：service 方法返回 `anyhow::Result<T>`，路由处理器通过 `?` 运算符经 `From<anyhow::Error> for AppError` 自动转换。

### 12.2 评测 Worker 错误处理

| 错误类别 | 行为 |
|---------|------|
| 编译失败 | 返回 `JudgeResult { status: "compilation_error" }`，ACK 消息 |
| 运行时错误 | 返回 `JudgeResult { status: "runtime_error" }`，ACK 消息 |
| 超时 | 杀死进程，返回 `JudgeResult { status: "time_limit_exceeded" }`，ACK |
| 内存超限 | 通过 cgroups 检测，返回对应状态，ACK |
| 答案错误 | 返回 `JudgeResult { status: "wrong_answer" }` 含逐用例详情，ACK |
| API 回调失败 | 重试 3 次（指数退避 + 抖动），然后写入 DLQ |
| Redis 故障 | 断路器开启，跳过消费直到恢复 |
| 主循环错误 | 指数退避：`min(1000ms * 2^error_count, 60s)` |

---

## 13. 配置系统

### 13.1 环境感知配置

`AppConfig`（`api-infra/src/config.rs`）根据 `APP_ENV` 环境变量区分三种模式：

| 模式 | 行为 |
|------|------|
| `Production` | `JWT_SECRET` 和 `WORKER_SECRET` 为必需，缺失则启动失败；CORS 必须显式配置 |
| `Development` | 缺失密钥使用不安全默认值并输出警告；CORS 默认 `*` |
| `Test` | `test_config()` 提供安全默认值，不触碰环境变量 |

### 13.2 API 服务配置

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `DATABASE_URL` | 是 | - | PostgreSQL 连接字符串 |
| `REDIS_URL` | 否 | `redis://127.0.0.1:6379` | Redis 连接字符串 |
| `JWT_SECRET` | 生产必需 | 不安全默认值 | JWT 签名密钥 |
| `WORKER_SECRET` | 生产必需 | 不安全默认值 | Worker 认证密钥 |
| `API_BIND_ADDRESS` | 否 | `0.0.0.0:3000` | 服务监听地址 |
| `CORS_ORIGINS` | 否 | `*`（开发） | 允许的 CORS 源（逗号分隔） |

### 13.3 评测 Worker 配置

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `REDIS_URL` | 否 | `redis://127.0.0.1/` | Redis 连接字符串 |
| `API_URL` | 否 | `http://127.0.0.1:3000` | API 回调 URL |
| `WORKER_SECRET` | 否 | 不安全默认值 | Worker 认证密钥 |
| `SUBMISSION_STREAM` | 否 | `submissions` | 普通提交流名 |
| `CONTEST_STREAM` | 否 | `submissions:contest` | 比赛提交流名 |
| `CONSUMER_GROUP` | 否 | `judge_workers` | 消费者组名 |
| `CONSUMER_NAME` | 否 | `worker-<uuid>` | 消费者标识（自动生成） |
| `MAX_CONCURRENT_JUDGES` | 否 | `4` | 最大并发评测数（必须 >= 1） |
| `RECOVERY_IDLE_MS` | 否 | `300000`（5 分钟） | 崩溃恢复空闲阈值 |

---

## 14. 关键设计决策

### 为什么选择 Redis Streams 而非消息代理（RabbitMQ/Kafka）？

Redis Streams 在当前规模下提供足够的消费者组语义，避免了引入额外基础设施依赖，并允许通过 XPENDING/XCLAIM 实现崩溃恢复。双流优先级机制（比赛 vs 普通）在传统消息代理中实现会更加复杂。

### 为什么使用独立评测 Worker 而非进程内评测？

沙箱化执行需要 Linux 特有的能力（cgroups、seccomp、chroot）和系统调用级进程控制，与 HTTP 服务器混合运行不稳定。解耦 Worker 允许独立扩展（更多 Worker = 更多并发评测）和跨机器水平部署。Worker 崩溃不会拖垮 API 服务。

### 为什么基于 JWT 的租户身份而非请求头？

将 `school_id` 存储在签名 JWT 内防止客户端伪造组织。`tenant_middleware` 显式忽略任何 `X-Tenant-ID` 请求头，仅从 `auth_middleware` 注入的 JWT Claims 中读取。这使得租户隔离在传输层不可篡改。

### 为什么使用每领域一 crate 而非单体 API crate？

每个领域 crate 有自己的 `routes.rs`、`models.rs` 和 `service.rs`，使代码库更易导航和测试。领域 crate 依赖 `api-infra` 和 `shared` 但互不依赖，防止循环依赖。新领域可作为独立的工作区成员添加。

### 为什么使用内存 RBAC 矩阵而非数据库驱动的权限？

角色-权限映射是静态的且变更不频繁。内存中的 `HashSet` 查找比每次请求的数据库查询快几个数量级。矩阵定义在 `api-infra/src/rbac.rs` 中，未来可以迁移到数据库模型而无需更改权限检查 API。

### 为什么 Worker 使用单一共享 `reqwest::Client`？

每次请求创建新的 HTTP 客户端会丢失 TCP keep-alive 并需要新的 TLS 握手。单一共享 `reqwest::Client` 维护内部连接池，减少到 API 的结果回调延迟。
