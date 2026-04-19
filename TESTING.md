
# CodeNexus — 测试指南

## 目录

- [1. 测试策略概览](#1-测试策略概览)
- [2. 后端测试（Rust）](#2-后端测试rust)
  - [2.1 测试框架与工具](#21-测试框架与工具)
  - [2.2 单元测试](#22-单元测试)
  - [2.3 集成测试](#23-集成测试)
  - [2.4 Handler 级测试](#24-handler-级测试)
  - [2.5 多租户隔离测试](#25-多租户隔离测试)
  - [2.6 运行测试](#26-运行测试)
  - [2.7 测试约定与模式](#27-测试约定与模式)
- [3. 前端测试（TypeScript）](#3-前端测试typescript)
  - [3.1 单元/组件测试（Vitest）](#31-单元组件测试vitest)
  - [3.2 E2E 测试（Playwright）](#32-e2e-测试playwright)
  - [3.3 运行测试](#33-运行测试)
- [4. Judge Worker 测试](#4-judge-worker-测试)
  - [4.1 处理器单元测试](#41-处理器单元测试)
  - [4.2 队列消费者集成测试](#42-队列消费者集成测试)
  - [4.3 恢复与心跳测试](#43-恢复与心跳测试)
- [5. Migration Tool 测试](#5-migration-tool-测试)
  - [5.1 单元测试](#51-单元测试)
  - [5.2 E2E 迁移测试](#52-e2e-迁移测试)
- [6. CI 中的测试](#6-ci-中的测试)
  - [6.1 Rust CI 作业](#61-rust-ci-作业)
  - [6.2 Frontend CI 作业](#62-frontend-ci-作业)
  - [6.3 Docker Build Verification](#63-docker-build-verification)
- [7. 测试覆盖率](#7-测试覆盖率)
- [8. 常见问题排查](#8-常见问题排查)

---

## 1. 测试策略概览

CodeNexus 采用经典测试金字塔策略，覆盖三个层次：

```
       ╱  E2E (Playwright)  ╲        — 关键用户流程
      ╱  集成测试             ╲       — 领域服务 + 数据库 + Redis
     ╱  Handler 级测试        ╲      — HTTP 路由 + 中间件
    ╱  单元测试                ╲     — 纯逻辑、序列化、解析
```

| 层次 | 后端 (Rust) | 前端 (TypeScript) |
|------|------------|-------------------|
| 单元测试 | `#[cfg(test)] mod tests` 内联模块 | Vitest + jsdom |
| 集成测试 | `tests/` 目录 + testcontainers | — |
| Handler 测试 | `tower::ServiceExt::oneshot` | — |
| E2E 测试 | — | Playwright |
| 多租户隔离 | 专门的 `tenant_isolation.rs` | — |

**核心原则：**

- 所有涉及数据库的测试使用 testcontainers 启动临时 PostgreSQL/Redis 容器，不依赖共享数据库
- 不需要外部依赖的纯逻辑测试在 CI 中正常执行
- 需要 Docker/Redis 的测试标记为 `#[ignore]`，仅在本地显式运行
- 前端单元测试 mock 掉网络层（`vi.mock`），E2E 测试需要完整环境

---

## 2. 后端测试（Rust）

### 2.1 测试框架与工具

| 工具 | 版本 | 用途 |
|------|------|------|
| `cargo test` | 内置 | 测试运行器 |
| `testcontainers` | 0.23 | Docker 容器管理（PostgreSQL/Redis） |
| `testcontainers-modules` | 0.11 | 预定义容器镜像（postgres、redis） |
| `sqlx` | 0.8 | 数据库查询与迁移 |
| `tokio` | 1.35 | 异步测试运行时（`#[tokio::test]`） |
| `tower` (util feature) | 0.5 | HTTP Handler 级测试（`oneshot`） |

**关键环境变量：**

| 变量 | 用途 | 备注 |
|------|------|------|
| `SQLX_OFFLINE=true` | 使用离线查询元数据编译 | CI 中始终设置 |
| `DATABASE_URL` | PostgreSQL 连接串 | `cargo test --workspace` 用 dummy 值即可；集成测试需真实连接 |

### 2.2 单元测试

每个 crate 使用 Rust 标准的 `#[cfg(test)] mod tests` 模式，测试模块内联于源文件底部。

**覆盖的模块示例：**

| Crate | 文件 | 测试内容 |
|-------|------|---------|
| `api` | `src/auth/jwt_service.rs` | JWT 令牌生成/验证 |
| `api` | `src/auth/password.rs` | 密码哈希/验证 |
| `api` | `src/middleware/auth.rs` | 认证中间件逻辑 |
| `api` | `src/middleware/tenant.rs` | 租户中间件逻辑 |
| `api` | `src/middleware/request_id.rs` | 请求 ID 生成 |
| `api` | `src/middleware/metrics.rs` | 指标中间件 |
| `api` | `src/redis/mod.rs` | Redis 工具函数 |
| `api-infra` | `src/rbac.rs` | RBAC 权限检查 |
| `api-infra` | `src/middleware/authz.rs` | 授权中间件 |
| `api-infra` | `src/testkit/fixtures.rs` | 测试 fixture 工厂 |
| `api-infra` | `src/websocket/message.rs` | WebSocket 消息类型 |
| `shared` | `src/models/role.rs` | Role 枚举与层级 |
| `shared` | `src/models/permission.rs` | Permission 枚举 |
| `domain-users` | `src/service.rs` | 用户服务逻辑 |
| `domain-problems` | `src/access.rs` | 题目访问控制 |
| `domain-submissions` | `src/queue.rs` | 提交队列逻辑 |
| `domain-imex` | `src/problem_import.rs` | 题目导入验证 |
| `domain-imex` | `src/security.rs` | 导入安全检查 |
| `domain-imex` | `src/user_import.rs` / `src/user_export.rs` | 用户导入/导出 |
| `judge-worker` | `src/processor/tests.rs` | 提交处理结构体与序列化 |
| `judge-worker` | `src/circuit_breaker.rs` | 熔断器逻辑 |
| `judge-worker` | `src/heartbeat.rs` | 心跳逻辑 |
| `judge-worker` | `src/queue/consumer.rs` | 队列消费逻辑 |
| `judge-worker` | `src/queue/dlq.rs` | 死信队列逻辑 |
| `judge-worker` | `src/queue/recovery.rs` | 消费者恢复逻辑 |
| `judge-worker` | `src/sandbox/seccomp.rs` | seccomp 沙箱规则 |
| `migration-tool` | `src/parser.rs` | MySQL dump 解析 |
| `migration-tool` | `src/mapper.rs` | 数据映射逻辑 |
| `migration-tool` | `src/id_map.rs` | ID 映射 |
| `migration-tool` | `src/password.rs` | 密码迁移逻辑 |
| `migration-tool` | `src/test_cases.rs` | 测试用例迁移 |
| `migration-tool` | `src/models.rs` | 迁移数据模型 |
| `migration-tool` | `src/migrator.rs` | 迁移执行器 |

**单元测试示例**（来自 `judge-worker/src/processor/tests.rs`）：

```rust
#[cfg(test)]
mod processor_tests {
    #[test]
    fn test_submission_message_structure() {
        let submission = crate::queue::SubmissionMessage {
            submission_id: 1,
            problem_id: 1,
            user_id: uuid::Uuid::new_v4(),
            language: "python3".to_string(),
            source_code: "print('Hello, World!')".to_string(),
            time_limit_ms: 1000,
            memory_limit_mb: 256,
            contest_id: None,
        };
        assert_eq!(submission.submission_id, 1);
        assert_eq!(submission.language, "python3");
    }

    #[test]
    fn test_submission_serialization() {
        // JSON 序列化/反序列化往返测试
        let json = serde_json::to_string(&submission).unwrap();
        let deserialized: SubmissionMessage = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.submission_id, submission.submission_id);
    }
}
```

### 2.3 集成测试

集成测试位于各 crate 的 `tests/` 目录，使用 testcontainers 启动临时数据库容器。

**共享测试基础设施：`api-infra::testkit`**

`TestFixture`（定义于 `api-infra/src/testkit/mod.rs`）是所有集成测试的基础：

```rust
pub struct TestFixture {
    pub database_url: String,
    pub redis_url: String,
    pub db_pool: PgPool,
    pub redis_pool: RedisPool,
    _pg_container: database::PgTestContainer,
    _redis_container: redis::RedisTestContainer,
}
```

- 自动启动 PostgreSQL 15 和 Redis 7 容器
- 提供 `db_pool` 和 `redis_pool` 连接池
- Drop 时自动清理容器（无需手动 teardown）

需要启用 `testkit` feature：`api-infra` 的 `Cargo.toml` 中 `testkit` feature 可选引入 `testcontainers` 和 `testcontainers-modules`。

**集成测试目录结构：**

| 路径 | 内容 |
|------|------|
| `api/tests/basic_test.rs` | 基础编译与运行验证 |
| `api/tests/docker_test.rs` | Docker 可用性检查 |
| `api/tests/tenant_isolation.rs` | 多租户数据隔离验证（5 个测试） |
| `api/tests/handlers/contests_test.rs` | 竞赛 Handler 测试 |
| `api/tests/handlers/users_test.rs` | 用户 Handler 测试 |
| `api/tests/integration/example_test.rs` | 示例集成测试 |
| `domain-users/tests/integration.rs` | 用户领域集成测试（CRUD、邮箱唯一性、MD5 密码升级） |
| `domain-problems/tests/integration.rs` | 题目领域集成测试（CRUD、租户隔离、可见性过滤） |
| `domain-contests/tests/integration.rs` | 竞赛领域集成测试（CRUD、注册、状态转换、封榜、补题） |
| `domain-classes/tests/integration.rs` | 班级领域集成测试 |
| `domain-community/tests/integration.rs` | 社区领域集成测试 |
| `domain-search/tests/integration.rs` | 搜索领域集成测试 |
| `domain-leaderboard/tests/integration.rs` | 排行榜领域集成测试 |
| `domain-submissions/tests/integration.rs` | 提交领域集成测试 |
| `judge-worker/tests/integration_tests.rs` | 判题工作器集成测试 |
| `migration-tool/tests/e2e_migration.rs` | 端到端迁移测试 |

**典型集成测试模式：**

```rust
// 以 domain-problems/tests/integration.rs 为例
use api_infra::testkit::TestFixture;

async fn setup_fixture() -> TestFixture {
    let fixture = TestFixture::new().await;
    let migrator = sqlx::migrate!("../api/migrations");
    migrator.run(&fixture.db_pool).await.expect("Failed to run migrations");
    fixture
}

#[tokio::test]
async fn test_create_and_get_problem() {
    let fixture = setup_fixture().await;
    let (org_id, _campus_id, user_id) = seed_org_and_user(&fixture.db_pool).await;

    let problem_id = insert_problem(&fixture.db_pool, org_id, user_id, "Two Sum", "public").await;

    let row: (String, String, String, String, i32, i32) = sqlx::query_as(
        "SELECT title, description, difficulty, visibility, time_limit_ms, memory_limit_kb FROM problems WHERE id = $1",
    )
    .bind(problem_id)
    .fetch_one(&fixture.db_pool)
    .await
    .unwrap();

    assert_eq!(row.0, "Two Sum");
    assert_eq!(row.2, "easy");
    assert_eq!(row.3, "public");
}
```

### 2.4 Handler 级测试

Handler 测试使用 `tower::ServiceExt::oneshot` 在进程内模拟 HTTP 请求，无需真正启动网络服务器。定义在 `api/tests/handlers/` 目录下。

**核心模式：**

```rust
// api/tests/handlers/contests_test.rs
async fn build_contest_app(pool: PgPool) -> (axum::Router, api::auth::JwtService) {
    let jwt_service = api::auth::JwtService::new(TEST_JWT_SECRET);
    let state = AppState {
        db_pool: pool,
        redis_pool: None,
        jwt_service: std::sync::Arc::new(api::auth::JwtService::new(TEST_JWT_SECRET)),
        // ...其他字段
    };
    // 镜像 main.rs 中的中间件堆叠：auth -> tenant -> 路由
    let protected_router = axum::Router::new()
        .nest("/contests", domain_contests::contests_router())
        .route_layer(axum::middleware::from_fn(tenant_middleware))
        .route_layer(axum::middleware::from_fn_with_state(state.clone(), auth_middleware));
    let app = protected_router.with_state(state);
    (app, jwt_service)
}

#[tokio::test]
async fn test_list_contests_unauthenticated() {
    let fixture = setup_fixture().await;
    let (app, _) = build_contest_app(fixture.db_pool.clone()).await;
    let response = app
        .oneshot(Request::builder().uri("/contests").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}
```

**覆盖的 Handler 测试：**

| 测试文件 | 测试场景 |
|----------|---------|
| `contests_test.rs` | 未认证访问返回 401；认证访问返回 200；学生角色无法创建竞赛返回 403 |
| `users_test.rs` | 未认证访问 /me 返回 401；管理员列表用户返回 200；学生无法列出所有用户返回 401/403 |

### 2.5 多租户隔离测试

`api/tests/tenant_isolation.rs` 是一套专门的安全测试套件（注释中标记为 TEST-03），验证核心安全属性：组织 A 的数据绝不会出现在组织 B 的查询结果中。

**测试矩阵：**

| 测试函数 | 验证内容 |
|----------|---------|
| `test_contest_list_tenant_isolated` | 竞赛列表按组织隔离 |
| `test_problem_list_tenant_isolated` | 题目列表按组织隔离 |
| `test_user_list_tenant_isolated` | 用户列表按组织隔离 |
| `test_submission_list_tenant_isolated` | 提交列表按组织隔离 |
| `test_leaderboard_global_tenant_isolated` | 全局排行榜按组织隔离 |

每个测试在两个组织中分别创建相同类型的数据，然后查询其中一个组织的列表，断言不包含另一个组织的数据。部分测试还通过领域服务层（如 `ContestService`、`LeaderboardService`）验证服务级隔离。

### 2.6 运行测试

**运行所有单元测试（CI 模式，无需 Docker）：**

```bash
cd backend
SQLX_OFFLINE=true DATABASE_URL=postgres://dummy:dummy@localhost/dummy cargo test --workspace
```

**运行单个 crate 的测试：**

```bash
cargo test -p api
cargo test -p domain-contests
cargo test -p judge-worker
cargo test -p api-infra --features testkit
```

**运行特定测试函数：**

```bash
# 通过函数名过滤
cargo test -p api test_list_contests_authenticated

# 运行某个集成测试文件
cargo test -p domain-contests --test integration
```

**运行被忽略的集成测试（需要 Docker）：**

这些测试使用 testcontainers 启动临时容器：

```bash
# 运行所有 ignored 测试
cargo test --workspace -- --ignored

# 运行特定 crate 的集成测试
cargo test -p domain-users --test integration -- --ignored
cargo test -p domain-contests --test integration -- --ignored
cargo test -p migration-tool --test e2e_migration -- --ignored

# 运行需要 Redis 的测试（需要本地 Redis 运行）
cargo test -p judge-worker --test queue_consumer -- --ignored
```

**查看测试输出（显示 println! 和日志）：**

```bash
cargo test -- --nocapture
```

**列出所有测试而不运行：**

```bash
cargo test -- --list
```

### 2.7 测试约定与模式

| 约定 | 说明 |
|------|------|
| 文件位置 | 单元测试：`src/**/*.rs` 中的 `#[cfg(test)] mod tests`；集成测试：`tests/*.rs` |
| 异步测试 | 使用 `#[tokio::test]` 而非 `#[test]` + 手动 Runtime |
| 数据库测试 | 通过 `TestFixture::new()` 启动临时容器，每个测试独立实例，避免状态共享 |
| 种子数据 | 使用 `seed_*` 辅助函数创建测试数据，按依赖链组织（org -> campus -> user -> problem -> submission） |
| 忽略标记 | 需要 Docker/Redis 的测试使用 `#[ignore = "requires Docker"]` 标记 |
| 断言风格 | 使用 `assert_eq!`/`assert!` 带描述性消息 |

---

## 3. 前端测试（TypeScript）

### 3.1 单元/组件测试（Vitest）

**配置文件：** `frontend/vitest.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,           // 自动注入 describe/it/expect
    environment: 'jsdom',    // DOM 环境模拟
    setupFiles: ['./src/test/setup.ts', './src/test/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: { global: { branches: 80, functions: 80, lines: 80, statements: 80 } },
    },
  },
  resolve: { alias: { '@': resolve(__dirname, './src') } },
})
```

**测试设置文件：**

| 文件 | 作用 |
|------|------|
| `src/test/setup.ts` | 导入 `@testing-library/jest-dom`；配置全局 mock（`IntersectionObserver`、`ResizeObserver`、`window.matchMedia`） |
| `src/test/vitest.setup.ts` | mock 全局 `fetch`；`beforeEach` 中调用 `vi.clearAllMocks()` |

**测试文件分布：**

| 目录 | 文件 | 测试类型 |
|------|------|---------|
| `src/services/__tests__/` | `contests.test.ts` | 竞赛服务 — mock API 调用，验证多端点数据聚合 |
| `src/services/__tests__/` | `classes.test.ts` | 班级服务 |
| `src/services/__tests__/` | `judgeConfig.test.ts` | 判题配置服务 |
| `src/services/__tests__/` | `messages.test.ts` | 私信服务 |
| `src/services/__tests__/` | `plagiarism.test.ts` | 抄袭检测服务 |
| `src/services/__tests__/` | `ranking.test.ts` | 排行榜服务 |
| `src/services/__tests__/` | `searchApi.test.ts` | 搜索 API 服务 |
| `src/services/__tests__/` | `admin.test.ts` | 管理员服务 |
| `src/services/__tests__/` | `smokeCoreFlows.test.ts` | 核心流程冒烟测试 |
| `src/services/__tests__/` | `communityApi.test.ts` | 社区 API 服务 |
| `src/hooks/__tests__/` | `useAuth.test.ts` | 认证状态 Hook（login/logout/checkAuth 状态流转） |
| `src/hooks/__tests__/` | `useWebSocket.test.ts` | WebSocket Hook |
| `src/hooks/__tests__/` | `useCountdown.test.ts` | 倒计时 Hook |
| `src/components/ui/__tests__/` | `primitives.test.tsx` | UI 原语组件（Button、Input、Loading 的样式类验证） |
| `src/lib/__tests__/` | `utils.test.ts` | 工具函数 |
| `src/pages/user/__tests__/` | `ContestDetail.test.tsx` | 竞赛详情页面 |
| `src/pages/user/__tests__/` | `ContestList.test.tsx` | 竞赛列表页面 |
| `src/pages/user/__tests__/` | `SubmissionHistory.test.tsx` | 提交历史页面 |
| `src/pages/user/__tests__/` | `SubmissionDetail.test.tsx` | 提交详情页面 |
| `src/pages/user/__tests__/` | `DashboardEnhanced.test.tsx` | 增强仪表板 |
| `src/pages/user/__tests__/` | `ProblemIDEEnhanced.test.tsx` | 题目 IDE 页面 |
| `src/pages/teacher/__tests__/` | `ClassManagement.test.tsx` | 班级管理页面 |

**服务层测试模式：**

服务测试通过 `vi.hoisted()` + `vi.mock()` mock 掉 axios 实例，验证数据映射和 API 调用参数：

```typescript
const { mockApi } = vi.hoisted(() => ({
  mockApi: { get: vi.fn(), post: vi.fn() },
}))
vi.mock('@/services/api', () => ({ default: mockApi }))

describe('contestsService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('maps backend contest resources into frontend contest cards', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { contests: [...], total: 1 } })
      .mockResolvedValueOnce({ data: { problem_count: 1, participant_count: 2 } })
      .mockResolvedValueOnce({ data: [{ difficulty: 'easy' }] })

    const data = await contestsService.getContests({ page: 1, limit: 20 })
    expect(mockApi.get).toHaveBeenCalledWith('/contests?page=1&limit=20')
    expect(data.contests[0].participants_count).toBe(2)
  })
})
```

**Hook 测试模式（Zustand Store）：**

使用 `getState`/`setState` 直接操作状态：

```typescript
beforeEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false })
  mockFetch.mockReset()
})

it('login sets user and isAuthenticated on success', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockAuthResponse })
  await useAuthStore.getState().login({ username: 'testuser', password: 'password123' })
  expect(useAuthStore.getState().isAuthenticated).toBe(true)
})
```

**组件测试模式：**

使用 `@testing-library/react` 的 `render`/`screen` API 验证 DOM 结构和样式类：

```typescript
it('renders primary button with project styling classes', () => {
  render(<Button variant="primary">Sign In</Button>)
  const button = screen.getByRole('button', { name: 'Sign In' })
  expect(button).toHaveClass('bg-primary')
  expect(button).toHaveClass('text-white')
})
```

### 3.2 E2E 测试（Playwright）

**配置文件：** `frontend/playwright.config.ts`

```typescript
const config: PlaywrightTestConfig = {
  testDir: './e2e',
  fullyParallel: false,     // 顺序执行，便于调试
  timeout: 10000,           // 每个测试 10 秒超时
  retries: 0,
  use: { headless: true, channel: 'chrome' },
  reporter: [['html'], ['list']],
};
```

**E2E 测试文件：**

| 文件 | 测试范围 |
|------|---------|
| `e2e/smoke.spec.ts` | 交付冒烟测试：登录页面渲染、多角色登录（学生/教师/管理员）、题目库与搜索、博客编辑、管理后台（用户/题目/抄袭检测）、提交创建与详情、班级管理、私信、排行榜、竞赛 |
| `e2e/contest-freeze.spec.ts` | 竞赛封榜：封榜期间榜单页面渲染、封榜指示器、赛后实时排名恢复 |
| `e2e/contest-upsolving.spec.ts` | 赛后补题：赛后竞赛页面渲染、提交表单可用性 |

**E2E 测试需要完整的运行环境**（API 服务器 + 前端 + 数据库 + 种子数据），通常通过 `docker-compose up` 启动完整环境后执行。可通过 `PLAYWRIGHT_BASE_URL` 环境变量覆盖目标地址（默认 `http://127.0.0.1:5173`）。

### 3.3 运行测试

**运行所有单元测试（CI 模式，单次执行）：**

```bash
cd frontend
npx vitest --run
```

**运行测试并监听文件变化（开发模式）：**

```bash
npx vitest
# 或
npm test
```

**运行特定测试文件：**

```bash
npx vitest --run src/services/__tests__/contests.test.ts
npx vitest --run src/hooks/__tests__/useAuth.test.ts
```

**运行覆盖率报告：**

```bash
npm run test:coverage
```

**运行 E2E 测试：**

```bash
# 需要先启动完整环境（docker-compose up 或手动启动 dev server + API）
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 npx playwright test

# 运行单个 E2E 文件
npx playwright test e2e/smoke.spec.ts
```

---

## 4. Judge Worker 测试

Judge Worker 的测试涵盖队列消费者、处理器、沙箱和心跳模块。

### 4.1 处理器单元测试

位于 `judge-worker/src/processor/tests.rs`（通过 `mod tests` 在 `processor/mod.rs` 中引入），测试提交消息结构体和判题结果结构体：

| 测试 | 验证内容 |
|------|---------|
| `test_submission_message_structure` | Python 提交消息字段正确性 |
| `test_submission_compiled_language` | C++ 编译型语言提交 |
| `test_submission_rust_language` | Rust 语言提交 |
| `test_submission_serialization` | JSON 序列化/反序列化往返 |
| `test_judge_result_structure` | AC 结果结构体 |
| `test_judge_result_with_test_cases` | 带 WA 测试用例的结果结构体 |
| `test_time_limit_validation` | 时间限制合理范围 |
| `test_memory_limit_validation` | 内存限制合理范围 |
| `test_supported_languages` | 6 种支持语言枚举（C/C++/Python3/Rust/Go/Java） |
| `test_error_result` | 编译错误结果 |
| `test_timeout_result` | 超时结果 |

### 4.2 队列消费者集成测试

位于 `judge-worker/tests/queue_consumer.test.rs`，**需要本地 Redis 运行**，所有测试标记为 `#[ignore = "requires Redis"]`。

| 测试 | 验证内容 |
|------|---------|
| `test_ensure_consumer_group` | 消费者组创建与幂等性 |
| `test_consume_and_acknowledge` | 单条消息消费 + ACK + 二次消费返回空 |
| `test_consume_non_blocking` | 空流非阻塞消费返回 0 条消息 |
| `test_consume_multiple_messages` | 3 条消息顺序消费与 ACK |
| `test_acknowledge_nonexistent_message` | ACK 不存在的消息返回 0 |

**运行方式：**

```bash
# 确保本地 Redis 运行
redis-cli ping  # 应返回 PONG

cd backend
cargo test -p judge-worker --test queue_consumer -- --ignored
```

### 4.3 恢复与心跳测试

- `judge-worker/src/queue/recovery.rs` — 消费者恢复逻辑（标记 `#[ignore = "requires Docker"]`）
- `judge-worker/src/heartbeat.rs` — 心跳机制单元测试
- `judge-worker/src/circuit_breaker.rs` — 熔断器状态转换单元测试
- `judge-worker/src/queue/dlq.rs` — 死信队列逻辑单元测试

---

## 5. Migration Tool 测试

### 5.1 单元测试

Migration Tool 在 `src/` 内有大量 `#[cfg(test)] mod tests` 模块，覆盖数据迁移流水线的各个阶段：

| 模块 | 测试内容 |
|------|---------|
| `parser.rs` | MySQL dump 文本解析（`LOCK TABLES`/`INSERT` 语句提取） |
| `mapper.rs` | 数据类型映射（MySQL -> PostgreSQL） |
| `id_map.rs` | 旧 ID 到新 ID 的映射表操作 |
| `password.rs` | `{MD5}` 前缀密码处理与 bcrypt 升级 |
| `test_cases.rs` | 测试用例文件迁移 |
| `models.rs` | 迁移数据模型序列化 |
| `migrator.rs` | 迁移执行器核心逻辑（含 `#[ignore]` 集成测试） |

### 5.2 E2E 迁移测试

位于 `migration-tool/tests/e2e_migration.rs`，**需要 Docker 运行的 PostgreSQL**，所有测试标记为 `#[ignore]`。

**测试 1：完整 E2E 迁移** (`test_full_e2e_migration`)

验证从 MySQL dump 到 PostgreSQL 的完整迁移流水线：

- 解析包含 2 用户、1 题目、1 提交、1 竞赛、1 博客、1 评论、2 赞、2 私信的真实 dump 数据
- 验证用户正确迁移（用户名、邮箱、`{MD5}` 密码前缀）
- 验证被封禁用户（`user_info` 中 `usergroup = 'B'`）未迁移
- 验证系统迁移用户（`uoj_migration_{org_id}`）存在
- 验证题目属性（标题、可见性、时间/内存限制转换正确）
- 验证提交状态映射（Accepted -> judged/ac）
- 验证竞赛、竞赛题目、参赛者关联
- 验证博客转文章、评论、点赞
- 验证私信与对话
- 验证 `migration_mappings` 表至少有 10 条映射记录

**测试 2：幂等性验证** (`test_double_run_idempotent`)

对同一份数据执行两次迁移，验证：

- 第二次运行成功完成（不报错）
- 所有行数不变（用户、题目、提交、竞赛、文章数量一致）
- `migration_mappings` 数量和内容完全相同
- 无重复实体（竞赛参赛者、竞赛题目、点赞、私信、会话、文章评论）

**运行方式：**

```bash
cd backend
cargo test -p migration-tool --test e2e_migration -- --ignored
```

---

## 6. CI 中的测试

CI 配置位于 `.github/workflows/ci.yml`，包含三个独立作业。

### 6.1 Rust CI 作业

**触发条件：** 所有分支的 push 和 PR

**环境：** `ubuntu-latest`，`SQLX_OFFLINE=true`，dummy `DATABASE_URL`

**步骤：**

| 步骤 | 命令 | 说明 |
|------|------|------|
| 格式检查 | `cargo fmt --check --all` | 确保代码格式一致 |
| Lint | `cargo clippy --all-targets -- -W unused-imports -W unused-variables` | 静态分析 |
| 测试 | `cargo test --workspace` | 运行所有非 ignore 测试 |

**注意事项：**
- CI 只运行不需要 Docker 的单元测试
- 标记为 `#[ignore]` 的集成测试不会在 CI 中运行
- `SQLX_OFFLINE=true` 使用预编译的查询元数据（`.sqlx/` 目录），无需连接数据库

### 6.2 Frontend CI 作业

**触发条件：** 所有分支的 push 和 PR

**环境：** `ubuntu-latest`，Node.js 22

**步骤：**

| 步骤 | 命令 | 说明 |
|------|------|------|
| 安装依赖 | `npm ci` | 使用 lockfile 确定安装 |
| Lint | `npm run lint` | ESLint 检查 |
| 测试 | `npx vitest --run` | 单次执行所有单元测试 |
| 构建 | `npm run build` | 验证 Vite 生产构建成功 |

**注意：** Playwright E2E 测试不是 CI 默认流水线的一部分。

### 6.3 Docker Build Verification

**触发条件：** 仅 `master` 分支的 push 事件

验证三个 Docker 镜像都能成功构建（`--no-cache`）：

```bash
docker build -f backend/api/Dockerfile ./backend --no-cache
docker build -f backend/judge-worker/Dockerfile ./backend --no-cache
docker build -f frontend/Dockerfile ./frontend --no-cache
```

这一步确保代码合并到主分支后不会引入构建回归。

---

## 7. 测试覆盖率

### 前端覆盖率

Vitest 配置了 V8 覆盖率提供者，设置了全局最低阈值：

| 指标 | 阈值 |
|------|------|
| Lines | 80% |
| Functions | 80% |
| Branches | 80% |
| Statements | 80% |

**生成覆盖率报告：**

```bash
cd frontend
npm run test:coverage
```

报告输出格式：`text`（终端输出）、`json`、`html`（可在浏览器中查看 `coverage/index.html`）。

### 后端覆盖率

后端目前没有配置自动覆盖率收集。Rust 生态中可以通过 `cargo-tarpaulin` 或 `cargo-llvm-cov` 手动测量：

```bash
# 安装工具
cargo install cargo-tarpaulin

# 运行覆盖率（不含 ignored 集成测试）
cd backend
cargo tarpaulin --workspace --exclude-files "*/tests/*"
```

---

## 8. 常见问题排查

### Rust 编译错误：`error sending request for url`

**原因：** `SQLX_OFFLINE` 未设置，`sqlx` 宏尝试连接数据库验证查询。

**解决：**

```bash
export SQLX_OFFLINE=true
cargo test --workspace
```

### `DATABASE_URL` 相关编译错误

**原因：** 某些 `sqlx` 宏在编译时检查 `DATABASE_URL` 环境变量，即使 `SQLX_OFFLINE=true` 也需要该变量存在。

**解决：** 设置 dummy 值即可：

```bash
DATABASE_URL=postgres://dummy:dummy@localhost/dummy SQLX_OFFLINE=true cargo test --workspace
```

### 集成测试：`Failed to start PostgreSQL test container. Is Docker running?`

**原因：** testcontainers 需要 Docker 守护进程运行。

**解决：**

```bash
# 检查 Docker 状态
docker info

# macOS: 启动 Docker Desktop
open -a Docker
```

### Judge Worker 队列测试失败：`Connection refused (os error 61)`

**原因：** 本地没有运行 Redis。

**解决：**

```bash
# 通过 Docker 启动 Redis
docker run -d --name test-redis -p 6379:6379 redis:7-alpine

# 或通过 docker-compose
docker-compose up -d redis
```

### SQLX 离线模式元数据过期

**原因：** 新增或修改了 SQL 查询，但未更新 `.sqlx/` 目录中的离线元数据。

**解决：**

```bash
# 连接真实数据库重新生成
cargo sqlx prepare --workspace
# 提交 .sqlx/ 目录的变更
git add .sqlx/ && git commit -m "chore: update sqlx offline metadata"
```

### 前端测试：`Cannot find module '@/services/api'`

**原因：** 路径别名未在测试中正确解析。

**解决：** `vitest.config.ts` 中已配置 `resolve.alias`，确保测试使用 `@/` 前缀导入。检查 `tsconfig.json` 中的 `paths` 配置是否一致。

### 前端测试：浏览器 API 未定义（`IntersectionObserver is not defined`）

**原因：** jsdom 不包含某些浏览器 API。

**解决：** 在 `frontend/src/test/setup.ts` 中添加 polyfill。已有 `IntersectionObserver`、`ResizeObserver`、`matchMedia` 的 polyfill。

### 前端测试：`NavigationActedException` 或 `LocationNavigateError`

**原因：** 组件测试中触发了 React Router 导航，但测试环境没有 Router 上下文。

**解决：** 在测试中包裹 `MemoryRouter` 或 mock `useNavigate`：

```typescript
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => vi.fn(),
}))
```

### E2E 测试：页面加载超时

**原因：** Playwright 默认超时 10 秒，前端应用未在超时内响应。

**解决：**
- 确保前端开发服务器正在运行（`npm run dev` 或 Docker 环境）
- 设置 `PLAYWRIGHT_BASE_URL` 指向正确的地址
- 检查 API 后端是否正常运行

### 测试状态污染

**原因：** 测试之间共享了状态。

**解决：**
- **前端：** `beforeEach` 中调用 `vi.clearAllMocks()`（`vitest.setup.ts` 中自动执行）和重置 Zustand store 状态
- **后端集成测试：** 每个测试使用独立的 `TestFixture`（自动创建和销毁临时容器）
- **Migration E2E：** 测试前后调用 `cleanup_migration_data()` 清理数据

### macOS 上运行 Judge Worker 沙箱测试

**原因：** 沙箱依赖 cgroups、chroot、seccomp，仅在 Linux 上可用。

**解决：** 纯单元测试和队列逻辑测试可在任何平台运行。沙箱相关测试在 macOS 上会被跳过或失败，属于预期行为。生产判题环境必须为 Linux。
