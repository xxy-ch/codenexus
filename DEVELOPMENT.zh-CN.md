![CodeNexus Banner](codenexus_banner.png)

> 📄 **[Read in English / 英文说明](DEVELOPMENT.zh-CN.md)**

# 开发指南

本指南详细说明 CodeNexus 的本地开发环境搭建、项目结构、前后端开发工作流、数据库开发、代码风格规范及 Git 工作流。

CodeNexus 是一个多租户的在线评测平台，采用 Rust (Axum) 构建后端 API、React 19 + TypeScript 构建前端、PostgreSQL + Redis 作为数据层。

## 目录

- [开发环境设置](#开发环境设置)
- [项目结构详解](#项目结构详解)
- [后端开发工作流](#后端开发工作流)
- [前端开发工作流](#前端开发工作流)
- [判题Worker开发](#判题worker开发)
- [数据库开发](#数据库开发)
- [代码风格规范](#代码风格规范)
- [Git工作流](#git工作流)
- [调试技巧](#调试技巧)
- [CI与质量检查](#ci与质量检查)

---

## 开发环境设置

### 必备工具

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| Rust | 1.90.0 | 由 `rust-toolchain.toml` 固定版本，`rustup` 自动管理 |
| Node.js | 22 | 前端构建与开发 |
| npm | 随 Node.js 安装 | 前端包管理器 |
| Docker | 最新稳定版 | 运行 PostgreSQL 和 Redis |
| PostgreSQL | 16 | 通过 Docker (`postgres:16-alpine`) 运行 |
| Redis | 7 | 通过 Docker (`redis:7-alpine`) 运行 |

### Rust 工具链安装

```bash
# 安装 rustup（Rust 版本管理器）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 项目已在 backend/rust-toolchain.toml 中固定版本
# 进入 backend/ 目录后 rustup 会自动安装正确的工具链
cd backend
rustc --version  # 应输出 1.90.0
```

`rust-toolchain.toml` 配置了以下组件：

```toml
[toolchain]
channel = "1.90.0"
components = ["rustfmt", "clippy"]
```

- **rustfmt** — Rust 代码自动格式化工具
- **clippy** — Rust 代码静态分析 linter

### Node.js 安装

```bash
# 推荐使用 nvm 管理 Node.js 版本
nvm install 22
nvm use 22
node --version   # 应输出 v22.x.x
npm --version
```

### IDE 推荐

**VS Code**（推荐）+ 以下扩展：

| 扩展 | 用途 |
|------|------|
| rust-analyzer | Rust 语义分析、代码补全、跳转定义 |
| CodeLLDB | Rust 调试支持 |
| ESLint | TypeScript/JavaScript 代码检查 |
| Tailwind CSS IntelliSense | Tailwind 类名自动补全 |

其他可选编辑器：IntelliJ IDEA（安装 Rust 插件）、Zed。

### 系统依赖

在 Ubuntu/Debian 上构建 Rust 项目可能需要：

```bash
sudo apt-get update
sudo apt-get install -y libssl-dev pkg-config build-essential
```

macOS 上通过 Xcode Command Line Tools 即可：

```bash
xcode-select --install
```

### 第一步：启动基础设施

```bash
# 在项目根目录下启动 PostgreSQL 和 Redis
docker compose up -d postgres redis
```

### 第二步：启动 API 服务

```bash
cd backend
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
JWT_SECRET=dev-secret \
WORKER_SECRET=dev-worker-secret \
cargo run -p api
```

数据库迁移在服务启动时通过嵌入式 `sqlx::migrate!()` 宏自动运行（定义在 `api/src/db/schema.rs`）。API 默认监听 `0.0.0.0:3000`。

生产环境要求设置 `JWT_SECRET` 和 `WORKER_SECRET`，开发环境不设置会使用不安全的默认值并输出警告日志。

### 第三步：启动前端

```bash
cd frontend
npm install
npm run dev
```

Vite 在 `http://localhost:5173` 启动开发服务器，自动将 `/api` 请求代理到后端 API（`http://localhost:3000`），将 `/ws` 请求代理到 WebSocket 端点。

### 第四步（可选）：启动判题 Worker

判题 Worker 需要 Linux 环境（依赖 cgroups、chroot、seccomp）。macOS 上请使用 Docker 运行：

```bash
docker compose up -d judge-worker
```

在 Linux 上可以直接运行：

```bash
cd backend
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
API_URL=http://localhost:3000 \
WORKER_SECRET=dev-worker-secret \
cargo run -p judge-worker
```

---

## 项目结构详解

```
Online_Judge/
├── backend/                    # 所有 Rust crate 所在目录
│   ├── Cargo.toml              # Workspace 根配置（定义 members 和共享依赖）
│   ├── Cargo.lock              # 锁定的依赖版本
│   ├── rust-toolchain.toml     # Rust 工具链固定版本
│   ├── api/                    # API 服务主入口（Axum HTTP 服务器）
│   │   ├── src/
│   │   │   ├── main.rs         # 服务启动、路由注册、中间件配置
│   │   │   ├── auth/           # JWT 认证服务
│   │   │   ├── db/             # 数据库连接池与迁移
│   │   │   ├── middleware/     # 认证、租户、请求ID、指标中间件
│   │   │   ├── websocket/      # WebSocket 服务端
│   │   │   ├── notifications/  # 通知模块
│   │   │   ├── plagiarism/     # 查重模块
│   │   │   ├── judge_monitor/  # 判题监控
│   │   │   └── worker_heartbeat.rs  # Worker 心跳接收
│   │   ├── migrations/         # SQL 迁移文件（000-029+）
│   │   ├── tests/              # 集成测试（租户隔离、handler 测试）
│   │   └── Dockerfile          # API Docker 构建
│   ├── api-infra/              # 共享 API 基础设施
│   │   └── src/
│   │       ├── config.rs       # AppConfig（环境变量加载与校验）
│   │       ├── error.rs        # AppError（统一错误类型）
│   │       ├── state.rs        # AppState（全局共享状态）
│   │       ├── rbac.rs         # RBAC 权限系统
│   │       ├── metrics.rs      # Prometheus 指标
│   │       ├── middleware/     # 中间件实现（auth、tenant、request_id、metrics）
│   │       ├── websocket.rs    # WebSocket 服务器
│   │       ├── traits/         # 共享 trait 定义
│   │       └── testkit/        # 测试工具
│   ├── domain-problems/        # 题目与测试用例领域
│   ├── domain-users/           # 用户管理领域
│   ├── domain-contests/        # 竞赛系统领域
│   ├── domain-submissions/     # 提交生命周期领域
│   ├── domain-classes/         # 班级与作业领域
│   ├── domain-community/       # 讨论、博客、私信领域
│   ├── domain-leaderboard/     # 排行榜领域
│   ├── domain-search/          # 全文搜索领域
│   ├── domain-imex/            # 导入/导出领域
│   ├── judge-worker/           # 独立判题 Worker
│   │   └── src/
│   │       ├── queue/          # Redis Streams 消费者、生产者、死信队列
│   │       ├── processor/      # 提交处理：获取测试用例、编译、执行、对比输出
│   │       ├── compiler/       # 语言检测与编译配置（6 种语言）
│   │       ├── sandbox/        # cgroups 内存/CPU 限制、chroot 文件系统隔离、seccomp 系统调用过滤
│   │       ├── db/             # 直连 PostgreSQL 获取测试用例
│   │       ├── circuit_breaker.rs  # API 不可用时的熔断器
│   │       └── heartbeat.rs    # 周期性健康报告
│   ├── migration-tool/         # MySQL 到 PostgreSQL 数据迁移工具
│   └── shared/                 # 共享类型定义（零内部依赖）
│       └── src/models/
│           ├── role.rs         # Role 枚举与层级
│           ├── permission.rs   # Permission 枚举（21 种权限）
│           └── user.rs         # User、UserPublic 类型
├── frontend/                   # React 19 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/         # UI 组件（按领域组织：ui/、problems/、contest/ 等）
│   │   ├── hooks/              # 自定义 React hooks（useAuth、useWebSocket、useProblems 等）
│   │   ├── services/           # API 服务层（每个领域一个文件）
│   │   ├── store/              # Zustand 状态管理（authStore）
│   │   ├── types/              # TypeScript 类型定义（每个领域一个文件）
│   │   ├── pages/              # 路由级页面组件
│   │   │   ├── admin/          # 管理员页面
│   │   │   ├── auth/           # 登录注册页面
│   │   │   ├── community/      # 社区页面（讨论、博客、私信）
│   │   │   ├── contest/        # 竞赛页面
│   │   │   ├── error/          # 错误页面
│   │   │   ├── search/         # 搜索页面
│   │   │   ├── teacher/        # 教师页面
│   │   │   └── user/           # 用户页面
│   │   ├── layouts/            # 布局组件（MainLayout、AdminLayout）
│   │   ├── lib/                # 工具函数（cn() 等）
│   │   └── utils/              # 错误处理与通用工具
│   ├── e2e/                    # Playwright E2E 测试
│   ├── public/                 # 静态资源
│   ├── Dockerfile              # 前端生产 Docker 构建（Nginx）
│   └── nginx.conf              # Nginx 配置
├── .planning/                  # GSD 项目管理文件
├── docs/                       # 项目文档
│   └── api/                    # API 文档
├── scripts/                    # 引导与工具脚本
├── docker-compose.yml          # 多容器编排配置
└── .github/workflows/ci.yml   # CI 流水线
```

### Workspace 依赖关系图

```
                    ┌─────────┐
                    │   api   │ （主入口，组装所有路由）
                    └────┬────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────┴────┐   ┌──────┴──────┐   ┌───┴───┐
    │api-infra│   │ domain-*×9  │   │shared │
    └────┬────┘   └──────┬──────┘   └───┬───┘
         │               │               │
         └───────┬───────┘               │
                 │                       │
           ┌─────┴─────┐            ┌────┘
           │ api-infra │            │
           │  + shared │◄───────────┘
           └───────────┘

    judge-worker ──► shared （仅依赖共享类型，独立运行）
```

关键依赖关系：

- `api` 依赖 `api-infra`、所有 `domain-*` crate、`shared`
- 每个 `domain-*` crate 依赖 `api-infra`（获取 `AppState`）和 `shared`（获取类型定义）
- `judge-worker` 仅依赖 `shared`
- `shared` 无内部依赖（纯类型定义）
- 所有 Cargo 命令**必须从 `backend/` 目录运行**

---

## 后端开发工作流

### Cargo Workspace 命令

所有后端 Cargo 命令必须在 `backend/` 目录下执行：

```bash
cd backend
```

| 命令 | 说明 |
|------|------|
| `cargo check -p api` | 仅对 API crate 做类型检查（不生成二进制） |
| `cargo check --workspace` | 对所有 workspace crate 做类型检查 |
| `cargo build --workspace` | 以 debug 模式构建所有 crate |
| `cargo build --workspace --release` | 以 release 模式构建（用于性能测试） |
| `cargo test --workspace` | 运行所有 workspace 中的测试 |
| `cargo test -p api` | 仅运行 API crate 的测试 |
| `cargo test -p judge-worker` | 仅运行 judge-worker crate 的测试 |
| `cargo fmt --check --all` | 检查 Rust 代码格式是否符合规范 |
| `cargo fmt --all` | 自动格式化所有 Rust 代码 |
| `cargo clippy --all-targets -- -W unused-imports -W unused-variables` | 运行 Clippy 静态分析 |

### 添加新的领域 Crate

项目遵循 **一个领域一个 crate** 的模式。新增领域时按以下步骤操作：

#### 1. 创建 crate 目录

```bash
cd backend
cargo new --lib domain-your-feature
```

#### 2. 在根 `Cargo.toml` 中注册 workspace 成员

编辑 `backend/Cargo.toml`：

```toml
[workspace]
members = ["api", "api-infra", ..., "domain-your-feature", ...]
```

#### 3. 添加 crate 依赖

编辑 `backend/domain-your-feature/Cargo.toml`：

```toml
[dependencies]
axum = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
sqlx = { version = "0.8", features = ["runtime-tokio", "tls-rustls", "postgres", "chrono", "uuid"] }
api-infra = { path = "../api-infra" }
shared = { path = "../shared" }
```

#### 4. 遵循标准文件结构

```
domain-your-feature/src/
├── lib.rs      # 导出模块和路由函数
├── models.rs   # 请求/响应 DTO、数据库行映射结构体
├── routes.rs   # Axum 路由处理函数（薄 HTTP 层）
└── service.rs  # 业务逻辑和 SQL 查询
```

#### 5. 在 `lib.rs` 中定义路由

```rust
pub mod models;
pub mod routes;
pub mod service;

use api_infra::state::AppState;
use axum::{routing::{get, post, put, delete}, Router};

pub fn your_feature_router() -> Router<AppState> {
    Router::new()
        .route("/", get(routes::list_items))
        .route("/", post(routes::create_item))
        .route("/:id", get(routes::get_item))
        .route("/:id", put(routes::update_item))
        .route("/:id", delete(routes::delete_item))
}
```

#### 6. 在 `api/Cargo.toml` 中添加依赖

```toml
domain-your-feature = { path = "../domain-your-feature" }
```

#### 7. 在 `api/src/main.rs` 的 `create_router()` 中注册路由

```rust
let protected_router = Router::new()
    // ... 已有路由 ...
    .nest("/your-feature", domain_your_feature::your_feature_router())
```

### 模块模式详解：routes.rs → service.rs → models.rs

每个领域 crate 遵循三层架构：

#### routes.rs — 路由处理层（薄层）

路由处理函数只负责提取请求参数、调用 service 函数、返回响应，不包含业务逻辑：

```rust
use axum::extract::{Path, Query, State};
use axum::Json;
use api_infra::middleware::auth::AuthExtractor;
use api_infra::state::AppState;
use api_infra::error::AppError;
use shared::models::role::Role;

use crate::models::*;
use crate::service;

pub async fn list_items(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Query(params): Query<ListQuery>,
) -> Result<Json<Vec<Item>>, AppError> {
    // 内联角色检查
    let role: Role = claims.role.parse()
        .map_err(|_| AppError::Forbidden("无效角色".into()))?;
    if !role.is_higher_or_equal(Role::Teacher) {
        return Err(AppError::Forbidden("权限不足".into()));
    }

    // 委托给 service 层
    let items = service::list_items(&state.db_pool, claims.school_id, &params).await?;
    Ok(Json(items))
}

pub async fn create_item(
    State(state): State<AppState>,
    AuthExtractor(claims): AuthExtractor,
    Json(body): Json<CreateItemRequest>,
) -> Result<Json<Item>, AppError> {
    let item = service::create_item(&state.db_pool, claims.school_id, body).await?;
    Ok(Json(item))
}
```

#### service.rs — 业务逻辑层（核心）

包含业务逻辑和 SQL 查询，返回 `anyhow::Result<T>`：

```rust
use sqlx::PgPool;
use anyhow::Result;

use crate::models::*;

pub async fn list_items(
    pool: &PgPool,
    org_id: i64,
    params: &ListQuery,
) -> Result<Vec<Item>> {
    let rows = sqlx::query_as::<_, ItemRow>(
        "SELECT * FROM items WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    )
    .bind(org_id)
    .bind(params.limit)
    .bind(params.offset())
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(Item::from).collect())
}

pub async fn create_item(
    pool: &PgPool,
    org_id: i64,
    body: CreateItemRequest,
) -> Result<Item> {
    let row = sqlx::query_as::<_, ItemRow>(
        "INSERT INTO items (organization_id, name) VALUES ($1, $2) RETURNING *"
    )
    .bind(org_id)
    .bind(&body.name)
    .fetch_one(pool)
    .await?;

    Ok(Item::from(row))
}
```

#### models.rs — 数据模型层

定义请求/响应 DTO 和数据库行映射结构体：

```rust
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// 数据库行映射（内部使用）
#[derive(Debug, FromRow, Serialize)]
pub struct ItemRow {
    pub id: i64,
    pub organization_id: i64,
    pub name: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// API 响应类型（对外暴露）
#[derive(Debug, Serialize)]
pub struct Item {
    pub id: i64,
    pub name: String,
    pub created_at: String,
}

impl From<ItemRow> for Item {
    fn from(row: ItemRow) -> Self {
        Self {
            id: row.id,
            name: row.name,
            created_at: row.created_at.to_rfc3339(),
        }
    }
}

// 请求类型
#[derive(Debug, Deserialize)]
pub struct CreateItemRequest {
    pub name: String,
}

// 查询参数类型
#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}
```

### 中间件流水线

请求按以下顺序经过中间件（从外到内）：

1. **CORS** — `tower_http::cors::CorsLayer`（可配置允许的源）
2. **请求 ID** — `middleware::request_id::request_id_middleware`（为每个请求分配唯一 ID）
3. **指标追踪** — `middleware::metrics::track_metrics`（Prometheus 指标采集）
4. **限流** — `tower_governor::GovernorLayer`（每 IP 每秒 1 次请求，突发上限 30 次，仅限需要认证的路由）
5. **认证** — `middleware::auth::auth_middleware`（JWT 验证、Redis 黑名单检查）
6. **租户** — `middleware::tenant::tenant_middleware`（从 JWT claims 中提取 `school_id`）

不受限流和认证影响的端点：`/health/live`、`/health/ready`、`/metrics`、`/internal/worker/heartbeat`。

### AppState（全局共享状态）

定义在 `api-infra/src/state.rs` 中：

```rust
pub struct AppState {
    pub db_pool: PgPool,
    pub redis_pool: Option<deadpool_redis::Pool>,
    pub redis_url: String,
    pub jwt_service: Arc<dyn TokenService>,
    pub jwt_secret: String,
    pub worker_secret: String,
    pub websocket_server: Arc<WebSocketServer>,
    pub class_membership_checker: Arc<dyn ClassMembershipChecker>,
    pub prometheus_handle: PrometheusHandle,
    pub preview_cache: Arc<PreviewCache>,
}
```

在路由处理函数中通过 `State(state): State<AppState>` 提取。

### 认证模式

- JWT 通过 `Authorization: Bearer <token>` 请求头或 `access_token` cookie 传递
- 刷新令牌通过 `refresh_token` cookie 传递（HttpOnly、SameSite=Strict）
- 登出时将令牌写入 Redis 黑名单（键名 `bl:{jti}`）
- JWT Claims 包含：`sub`（UUID）、`username`、`email`、`role`、`school_id`、`campus_id`、`exp`、`jti`
- 在路由处理函数中使用 `AuthExtractor(claims)` 提取已认证用户信息

### RBAC 角色层级

```
Root > CampusAdmin > GradeAdmin > Teacher > Student
```

定义在 `shared/src/models/role.rs` 中，包含 21 种权限（定义在 `shared/src/models/permission.rs` 中）。

### 错误处理

使用 `AppError`（定义在 `api-infra/src/error.rs`）处理所有路由错误：

```rust
pub enum AppError {
    Auth(String),       // 401 未认证
    Forbidden(String),  // 403 权限不足
    NotFound(String),   // 404 未找到
    Validation(String), // 400 请求无效
    Database(String),   // 500 数据库错误
    Internal(String),   // 500 内部错误
}
```

响应格式：`{ "error": "<message>", "status": <code> }`。

Service 层函数返回 `anyhow::Result<T>`，`From<anyhow::Error> for AppError` 的转换通过路由处理函数中的 `?` 操作符自动完成。

---

## 前端开发工作流

### 基础命令

所有前端命令在 `frontend/` 目录下执行：

```bash
cd frontend
```

| 命令 | 说明 |
|------|------|
| `npm ci` | 根据 `package-lock.json` 安装依赖（CI/首次安装用） |
| `npm install` | 安装或更新依赖 |
| `npm run dev` | 启动 Vite 开发服务器（端口 5173） |
| `npm run build` | 生产构建，输出到 `frontend/dist/` |
| `npm run typecheck` | TypeScript 类型检查（`tsc --noEmit`） |
| `npm run lint` | ESLint 检查（针对配置的服务和组件路径） |
| `npm run test` | 运行 Vitest 单元测试（watch 模式） |
| `npx vitest --run` | 运行 Vitest 单元测试（单次执行） |
| `npx playwright test` | 运行 Playwright E2E 测试 |

### 路径别名

`@/` 映射到 `./src/`（在 `vite.config.ts` 和 `tsconfig.json` 中同时配置）。导入示例：

```typescript
import { useAuth } from '@/hooks/useAuth'
import { problemsService } from '@/services/problems'
import type { Problem } from '@/types/problems'
import { cn } from '@/lib/utils'
```

### 添加新页面/组件

#### 1. 创建页面组件

在 `frontend/src/pages/` 下对应的领域目录中创建：

```tsx
// frontend/src/pages/your-feature/ItemList.tsx
import { useQuery } from '@tanstack/react-query'
import { yourFeatureService } from '@/services/yourFeature'
import type { Item } from '@/types/yourFeature'

export default function ItemList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['your-feature', 'list'],
    queryFn: () => yourFeatureService.list(),
  })

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>加载失败</div>
  return <div>{/* 渲染 items 列表 */}</div>
}
```

#### 2. 创建服务层

在 `frontend/src/services/` 中创建对应的服务文件：

```typescript
// frontend/src/services/yourFeature.ts
import api from './api'
import type { Item } from '@/types/yourFeature'

export const yourFeatureService = {
  list: async (): Promise<Item[]> => {
    const { data } = await api.get('/your-feature')
    return data
  },
  getById: async (id: number): Promise<Item> => {
    const { data } = await api.get(`/your-feature/${id}`)
    return data
  },
  create: async (input: CreateItemInput): Promise<Item> => {
    const { data } = await api.post('/your-feature', input)
    return data
  },
}
```

后端返回的 `snake_case` 字段名在前端直接使用，不做 camelCase 转换。

#### 3. 创建类型定义

在 `frontend/src/types/` 中创建对应文件：

```typescript
// frontend/src/types/yourFeature.ts
export interface Item {
  id: number
  name: string
  created_at: string
}

export interface CreateItemInput {
  name: string
}
```

#### 4. 注册路由

在 `frontend/src/App.tsx` 中，在对应的布局区域下添加路由：

```tsx
<Route path="/your-feature" element={<ProtectedRoute><ItemList /></ProtectedRoute>} />
```

### 服务层模式

服务是包含异步方法的普通对象（不是类）：

```typescript
import api from './api'

export const contestsService = {
  list: async (params?: ContestListParams): Promise<ContestList> => {
    const { data } = await api.get('/contests', { params })
    return data
  },
  getById: async (id: number): Promise<Contest> => {
    const { data } = await api.get(`/contests/${id}`)
    return data
  },
  register: async (id: number): Promise<void> => {
    await api.post(`/contests/${id}/register`)
  },
}
```

`api` 是在 `services/api.ts` 中配置的 Axios 实例，包含自动刷新令牌的拦截器。

### 状态管理

项目使用三种状态管理方式，各有分工：

#### Zustand — 客户端认证状态

定义在 `frontend/src/store/authStore.ts`，管理用户登录状态：

```typescript
interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  // actions
  setAuth: (user: User, token: string) => void
  logout: () => void
}
```

#### TanStack React Query — 服务端状态缓存

用于所有 API 数据的获取和缓存（题目、竞赛、提交等）：

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['problems', 'list', filters],
  queryFn: () => problemsService.list(filters),
})
```

#### URL 状态 — 筛选器和分页

使用 `useSearchParams` 管理 URL 查询参数，用于筛选、分页、搜索等场景。

### 组件模式

- **UI 基础组件** 在 `frontend/src/components/ui/` — 基于 shadcn 的组件，使用 CVA (class-variance-authority) 定义样式变体
- **领域组件** 在 `frontend/src/components/{domain}/` — 特定功能的组件
- **样式工具** `cn()` 函数来自 `@/lib/utils`（使用 `clsx` + `tailwind-merge` 合并 Tailwind 类名）

### 路由守卫

| 组件 | 行为 |
|------|------|
| `ProtectedRoute` | 未登录则重定向到 `/login` |
| `PublicRoute` | 已登录则重定向到 `/dashboard` |
| `AdminRoute` | 非管理员角色重定向到 `/unauthorized` |

### 表单处理

使用 `react-hook-form` 配合 `zod` 做验证：

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, '名称不能为空'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: FormData) => {
    // 提交逻辑
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
    </form>
  )
}
```

---

## 判题Worker开发

判题 Worker 是一个独立的 Rust 二进制程序，职责如下：

1. 从 Redis Streams（`submissions` 和 `submissions:contest`）消费提交任务
2. 从 PostgreSQL 获取测试用例
3. 在沙箱环境中编译用户代码
4. 使用 cgroups 内存/CPU 限制、chroot 文件系统隔离、seccomp 系统调用过滤执行编译后的二进制文件
5. 比对输出与期望结果
6. 通过 HTTP 回调将结果发送回 API

### 关键模块

| 模块 | 路径 | 功能 |
|------|------|------|
| 队列消费者 | `judge-worker/src/queue/` | Redis Streams XREADGROUP 消费者、死信队列 |
| 处理器 | `judge-worker/src/processor/` | 提交生命周期：获取、编译、执行、对比 |
| 编译器 | `judge-worker/src/compiler/` | 6 种语言的检测与编译配置 |
| 沙箱 | `judge-worker/src/sandbox/` | cgroups、chroot、seccomp 隔离 |
| 熔断器 | `judge-worker/src/circuit_breaker.rs` | API 不可用时防止级联故障 |
| 心跳 | `judge-worker/src/heartbeat.rs` | 周期性向 API 发送健康报告 |

### 沙箱配置

```rust
pub struct SandboxConfig {
    pub sandbox_root: PathBuf,        // /var/lib/onlinejudge/sandbox
    pub cpu_time_limit_ms: u64,       // 2000 ms
    pub memory_limit_bytes: u64,      // 268 MB (256000 KB)
    pub pids_max: u32,                // 64 个进程
}
```

### Docker 要求

判题 Worker 需要 Linux 能力才能执行沙箱操作：

```yaml
cap_add:
  - SYS_PTRACE
  - SYS_ADMIN
security_opt:
  - no-new-privileges:true
```

### 错误处理

- **处理错误**：记录日志后 ACK 消息，防止无限重试
- **API 回调失败**：3 次重试，指数退避（1s、2s、4s）
- **永久性失败**：写入 DLQ（死信队列）流，供人工检查
- **主循环错误**：指数退避，上限 60 秒（2^error_count，最大 6）

---

## 数据库开发

### 创建迁移文件

迁移文件是纯 SQL 文件，存放在 `backend/api/migrations/` 目录下，使用三位数字前缀命名：

```
000_create_update_updated_at_function.sql
001_create_organizations.sql
002_create_campuses.sql
003_create_users.sql
...
029_fix_user_roles_unique_null_campus.sql
```

#### 创建新迁移文件

```sql
-- backend/api/migrations/030_create_your_table.sql
CREATE TABLE your_table (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 多租户查询必须为 organization_id 建索引
CREATE INDEX idx_your_table_org ON your_table(organization_id);

-- updated_at 自动更新触发器
CREATE TRIGGER update_your_table_updated_at
    BEFORE UPDATE ON your_table
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 迁移执行

迁移在 API 服务启动时通过嵌入式 `MIGRATOR`（定义在 `api/src/db/schema.rs`）自动执行：

```rust
pub static MIGRATOR: Migrator = sqlx::migrate!(); // 编译时嵌入所有迁移文件

// main.rs 中执行
MIGRATOR.run(&pool).await?;
```

#### 手动重置数据库

```bash
docker compose down -v
docker compose up -d postgres redis
# 下次启动 API 时迁移会自动运行
cd backend
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge cargo run -p api
```

### sqlx 宏与编译时检查

项目使用 `sqlx` 的编译时查询检查。当使用 `sqlx::query!()`、`sqlx::query_as!()` 等宏时，sqlx 会在编译时连接数据库验证 SQL 语句的正确性。

常用查询模式：

```rust
// 映射到类型化结构体（需要 #[derive(FromRow)]）
let rows = sqlx::query_as::<_, ItemRow>("SELECT * FROM items WHERE id = $1")
    .bind(item_id)
    .fetch_one(pool)
    .await?;

// 查询单个值
let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM items")
    .fetch_one(pool)
    .await?;

// 根据期望的基数选择方法
.fetch_one(pool)      // 恰好一行，否则报错
.fetch_optional(pool) // 零或一行
.fetch_all(pool)      // 零或多行
```

### SQLX_OFFLINE 模式

CI 环境中没有运行的数据库，因此使用 `SQLX_OFFLINE=true` 模式。该模式利用预先生成的 `.sqlx/` 缓存文件进行离线查询验证。

CI 配置（`.github/workflows/ci.yml`）：

```yaml
env:
  SQLX_OFFLINE: true
```

本地开发时，如果修改了 SQL 查询，需要重新生成离线缓存：

```bash
cd backend
cargo sqlx prepare  # 需要运行中的数据库
```

### 数据库约定

- 所有业务表必须包含 `organization_id` 外键（多租户隔离），引用 `organizations(id)`
- 必须为 `organization_id` 创建索引
- 主键使用 `BIGSERIAL` 自增（或 `UUID`，视场景而定）
- 必须包含 `created_at` 和 `updated_at` 时间戳列，默认值为 `NOW()`
- `updated_at` 使用 `update_updated_at_column()` 触发器函数自动更新（定义在 `000` 号迁移文件中）
- 所有查询必须使用参数化占位符（`$1`、`$2` 等），禁止字符串拼接
- 使用 `query_as::<_, T>()` 映射到类型化结构体（结构体需派生 `FromRow`）
- 使用 `query_scalar::<_, T>()` 查询单个值

---

## 代码风格规范

### Rust 命名规范

| 元素 | 规范 | 示例 |
|------|------|------|
| 文件/模块 | `snake_case` | `user_service.rs`、`auth_middleware` |
| 结构体 | `PascalCase` | `AppState`、`AppError` |
| 函数 | `snake_case` | `get_user_profile`、`ensure_admin` |
| 枚举 | `PascalCase` | `AppError::Auth`、`Role::Teacher` |
| 常量 | `SCREAMING_SNAKE_CASE` | `TENANT_HEADER`、`MIGRATOR` |
| 路由函数 | `<domain>_router()` | `user_router()`、`contests_router()` |
| 请求类型 | `*Request` 后缀 | `LoginRequest`、`CreateProblemRequest` |
| 响应类型 | `*Response` 后缀 | `AuthResponse`、`ProblemsListResponse` |
| 查询参数 | `*Query` 后缀 | `AdminUserQuery`、`SearchQuery` |

### TypeScript 命名规范

| 元素 | 规范 | 示例 |
|------|------|------|
| 文件 | `PascalCase.tsx`（组件）、`camelCase.ts`（服务/hooks） | `Button.tsx`、`useAuth.ts` |
| 组件 | `PascalCase` | `MainLayout`、`ProblemDetail` |
| Hooks | `use*` 前缀 | `useAuth`、`useWebSocket`、`useCountdown` |
| 服务 | `<domain>Service` 对象导出 | `contestsService`、`problemsService` |
| 类型 | `PascalCase` 接口 | `Problem`、`Contest`、`User` |
| 常量 | `SCREAMING_SNAKE_CASE` | `API_CONFIG`、`FEATURE_FLAGS`、`SUBMISSION_STATUS` |
| 测试文件 | `<name>.test.ts(x)` | `contests.test.ts`、`primitives.test.tsx` |

### 数据库命名规范

| 元素 | 规范 | 示例 |
|------|------|------|
| 表名 | `snake_case` 复数形式 | `users`、`class_enrollments`、`test_case_results` |
| 列名 | `snake_case` | `organization_id`、`created_at`、`time_limit_ms` |
| 迁移文件 | `NNN_description.sql`（三位数字前缀） | `003_create_users.sql` |
| 主键 | `id`（serial/i64 或 UUID） | 因表而异 |
| 时间戳 | `created_at`、`updated_at` | 通过 SQL 函数自动管理 |

### 格式化与 Lint

#### Rust

```bash
cd backend

# 检查格式
cargo fmt --check --all

# 自动格式化
cargo fmt --all

# Clippy 静态分析
cargo clippy --all-targets -- -W unused-imports -W unused-variables
```

#### TypeScript

```bash
cd frontend

# 类型检查
npm run typecheck

# ESLint 检查
npm run lint

# 构建（包含类型检查）
npm run build
```

ESLint 9 配置包含：`typescript-eslint`、`eslint-plugin-react-hooks`、`eslint-plugin-react-refresh`。

### 文件组织原则

- Rust 文件：典型 200-400 行，最大 800 行。超过时拆分为独立模块。
- 前端文件：按功能/领域组织，不按类型组织。
- 每个领域一个类型定义文件（`frontend/src/types/`）。
- 一个类型定义文件对应一个领域。

### 错误处理模式

#### 后端

- Service 层返回 `anyhow::Result<T>`
- 路由处理函数中使用 `?` 操作符将 `anyhow::Error` 转换为 `AppError`
- 使用 `AppError` 的具体变体（`Auth`、`Forbidden`、`NotFound` 等）返回适当的 HTTP 状态码
- 禁止静默吞掉错误

#### 前端

- Axios 拦截器处理 401 状态码，自动刷新令牌
- React Query 管理加载/错误状态
- `react-hot-toast` 显示用户友好的错误提示
- 禁止在生产代码中使用 `console.log`

### 不可变模式

优先创建新对象，而不是修改已有对象：

```typescript
// 错误：直接修改
function updateItem(item: Item, name: string): Item {
  item.name = name  // 变异！
  return item
}

// 正确：创建新对象
function updateItem(item: Readonly<Item>, name: string): Item {
  return { ...item, name }
}
```

---

## Git工作流

### 分支命名

默认分支为 `master`。建议使用描述性的分支名称：

| 前缀 | 用途 | 示例 |
|------|------|------|
| `feat/` | 新功能 | `feat/contest-wizard` |
| `fix/` | Bug 修复 | `fix/submission-status-race` |
| `refactor/` | 重构 | `refactor/extract-auth-middleware` |
| `docs/` | 文档更新 | `docs/api-reference` |
| `test/` | 测试 | `test/tenant-isolation` |
| `chore/` | 杂项 | `chore/update-dependencies` |
| `perf/` | 性能优化 | `perf/query-optimization` |
| `ci/` | CI 配置 | `ci/add-docker-build` |

### 提交信息格式

使用 Conventional Commits 格式：

```
<type>(<scope>): <description>

<可选的正文>
```

类型列表：`feat`、`fix`、`refactor`、`docs`、`test`、`chore`、`perf`、`ci`

示例：

```
feat(contests): add contest wizard for teachers
fix(judge-worker): fix concurrent judging race condition
refactor(auth): extract JWT validation into shared middleware
docs(api): update endpoint documentation
test(submissions): add tenant isolation tests
```

### 工作流程

1. 从 `master` 创建功能分支
2. 在功能分支上开发和提交
3. 推送到远程并创建 Pull Request
4. CI 自动运行所有检查
5. 代码审查通过后合并

---

## 调试技巧

### 后端调试

#### 日志系统

使用 `tracing` crate 记录日志，默认过滤器为 `api=debug,tower_http=debug,axum=trace`。

通过 `RUST_LOG` 环境变量控制日志级别：

```bash
# 只看 API 层的 debug 级别以上日志
RUST_LOG=api=debug cargo run -p api

# 看所有组件的 trace 级别日志
RUST_LOG=trace cargo run -p api

# 只看特定模块
RUST_LOG=api::auth=trace,api::middleware=debug cargo run -p api

# 生产环境推荐级别
RUST_LOG=api=info,tower_http=warn cargo run -p api
```

日志使用示例：

```rust
use tracing::{info, warn, error, debug};

info!("服务器启动于 {}", addr);
info!("数据库迁移完成");
debug!("处理请求: {} {}", method, path);
warn!("CORS 配置为允许所有源，不应在生产环境中使用");
error!("数据库连接失败: {}", err);
```

#### 健康检查端点

```bash
# 存活探针（进程是否存活）
curl http://localhost:3000/health/live

# 就绪探针（DB 和 Redis 是否可达）
curl http://localhost:3000/health/ready

# Prometheus 指标
curl http://localhost:3000/metrics
```

#### Docker 日志

```bash
# 跟踪 API 日志
docker compose logs -f api

# 跟踪判题 Worker 日志
docker compose logs -f judge-worker

# 查看最近 100 行日志
docker compose logs --tail 100 api
```

### 前端调试

#### React DevTools

安装 React Developer Tools 浏览器扩展，可以：
- 检查组件树和 props
- 查看 Zustand store 状态
- 分析组件渲染性能

#### 网络请求调试

使用浏览器开发者工具的 Network 标签：
- 查看 API 请求和响应
- 检查 WebSocket 消息
- 分析请求耗时

Vite 开发服务器的代理配置（`vite.config.ts`）将 `/api` 代理到 `http://localhost:3000`，将 `/ws` 代理到 WebSocket 端点，开发时不会遇到跨域问题。

#### TanStack Query DevTools

TanStack React Query 支持开发者工具，可以查看：
- 查询缓存状态
- 请求生命周期
- 缓存失效时间

### 数据库调试

#### 直接 SQL 查询

```bash
# 连接到 PostgreSQL
docker compose exec postgres psql -U postgres -d online_judge

# 查看所有表
\dt

# 查看特定表结构
\d users

# 查看提交状态分布
SELECT status, COUNT(*) FROM submissions GROUP BY status;

# 查看租户数据隔离
SELECT organization_id, COUNT(*) FROM problems GROUP BY organization_id;

# 查看最近的迁移
SELECT * FROM _sqlx_migrations ORDER BY version DESC LIMIT 10;
```

#### pgAdmin

可以使用 pgAdmin 或 DBeaver 等图形化工具连接数据库：

```
Host: localhost
Port: 5432
Database: online_judge
Username: postgres
Password: postgres
```

#### Redis 检查

```bash
# 连接 Redis
docker compose exec redis redis-cli

# 检查连接
PING

# 查看 JWT 黑名单键
KEYS bl:*

# 查看提交流
XRANGE submissions - + COUNT 5

# 查看所有流
KEYS submissions*
```

---

## CI与质量检查

### CI 流水线

所有 Pull Request 和推送都经过 `.github/workflows/ci.yml` 中的 CI 检查：

#### Rust 作业

```bash
cd backend
cargo fmt --check --all
cargo clippy --all-targets -- -W unused-imports -W unused-variables
cargo test --workspace
```

使用 `SQLX_OFFLINE=true` 避免在 CI 中需要数据库连接。

#### 前端作业

```bash
cd frontend
npm ci
npm run lint
npx vitest --run
npm run build
```

#### Docker 构建验证

仅在推送到 `master` 分支时运行，验证三个 Dockerfile 都能成功构建：

```bash
docker build -f backend/api/Dockerfile ./backend --no-cache
docker build -f backend/judge-worker/Dockerfile ./backend --no-cache
docker build -f frontend/Dockerfile ./frontend --no-cache
```

### 本地质量检查（合并前必做）

在提交 PR 之前，确保以下所有检查通过：

```bash
# 后端
cd backend
cargo fmt --check --all
cargo clippy --all-targets -- -W unused-imports -W unused-variables
cargo test --workspace

# 前端
cd frontend
npm run typecheck
npm run lint
npx vitest --run
npm run build
```

### PR 检查清单

- 确保 CI 所有检查通过
- PR 应聚焦于单一关注点
- 包含清晰的变更说明
- 为新功能添加测试
- 前端代码中无 `console.log` 语句
<!-- GSD:docs -->
