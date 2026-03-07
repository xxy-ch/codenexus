# Online Judge 项目完整开发与维护手册

## 1. 文档信息

- 文档名称：Online Judge 项目完整开发与维护手册
- 文档日期：2026-03-07
- 文档状态：正式交付版
- 适用对象：
  - 产品经理
  - 前端工程师
  - 后端工程师
  - 测试工程师
  - 运维与发布负责人
  - 二次开发接手人员
  - 教师端/管理端业务使用人员
- License：Private License

## 2. 文档目的

本手册是当前仓库的统一长文档，覆盖以下内容：

1. 项目概述与交付范围
2. 系统组成与模块职责
3. 前后端与判题工作器的架构分层
4. 数据流与核心业务链路
5. 本地开发、二次开发与调试方式
6. Docker 部署、发布与回滚
7. API 分组说明
8. 用户手册、运营手册与维护手册
9. 已知边界、风险与后续优化方向

如果其他文档与本手册冲突，应以本手册及以下文档为准：

- [FINAL_SUMMARY.md](/Users/xiexingyu/Documents/项目/Online_Judge/FINAL_SUMMARY.md)
- [RELEASE_RUNBOOK_2026-03-06.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/RELEASE_RUNBOOK_2026-03-06.md)
- [DELIVERY_GAP_REGISTER_2026-03-07.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/DELIVERY_GAP_REGISTER_2026-03-07.md)

## 3. 项目概述

### 3.1 项目定位

本项目是一个面向教学、训练和竞赛场景的在线判题系统，覆盖以下主要能力：

- 用户认证与角色管理
- 题库浏览与题目作答
- 提交、判题与结果分析
- 竞赛与排行榜
- 讨论、博客与私信
- 教师班级管理与作业流
- 管理端题目、用户与反作弊配置

### 3.2 当前交付口径

当前仓库已经进入正式交付状态，但交付口径是“真实可运行的受控范围”，而不是“所有历史设想都全部实现”。

当前已接受的交付原则：

1. 页面必须接真实接口或真实空态。
2. 不允许保留用户可见的 mock fallback。
3. 不存在后端支撑的能力，不应作为正式功能入口暴露。
4. 管理与教师端可接受受控范围交付，但必须写清边界。

### 3.3 核心角色

- 管理员：管理用户、题目、测试数据、反作弊配置与报告
- 教师：管理班级、学生、作业、教学竞赛流
- 学生/普通用户：浏览题目、提交代码、查看排行榜、参与讨论和博客

## 4. 系统组成

项目由 4 个主要交付单元组成：

1. `frontend`
2. `api`
3. `judge-worker`
4. `postgres + redis` 基础服务

### 4.1 仓库结构

```text
Online_Judge/
├── api/                      Rust 后端 API
├── frontend/                 React 前端
├── judge-worker/             判题工作器
├── references/               参考静态设计稿
├── scripts/                  启动与演示数据脚本
├── docs/                     交付、发布、维护文档
├── docker-compose.yml        全栈启动入口
├── README.md                 仓库入口说明
└── LICENSE                   Private License
```

### 4.2 服务关系

```mermaid
flowchart LR
  U["Browser"] --> F["frontend (Vite build + Nginx)"]
  F -->|HTTP /api| A["api (Axum)"]
  F -->|WS /ws| A
  A --> P["PostgreSQL"]
  A --> R["Redis"]
  A -->|judge tasks| R
  W["judge-worker"] --> R
  W --> P
  W --> A
```

## 5. 架构分层

### 5.1 前端分层

前端主要分为以下层次：

1. `pages`
2. `components`
3. `services`
4. `store`
5. `hooks`
6. `types`
7. `lib`

#### 5.1.1 pages

位于 `frontend/src/pages`，负责页面级组合与业务流程承载。

主要分组：

- `auth`
- `user`
- `community`
- `teacher`
- `admin`
- `contest`
- `search`
- `error`

#### 5.1.2 components

位于 `frontend/src/components`，负责通用 UI 和局部业务组件。

典型子目录：

- `auth`
- `contest`
- `editor`
- `layout`
- `messages`
- `ui`
- `ide`

#### 5.1.3 services

位于 `frontend/src/services`，负责接口访问、前端契约映射与异常处理。

这是前端连接件的主层。当前已经收敛到真实接口驱动，主要服务包括：

- `api.ts`
- `auth.ts`
- `users.ts`
- `problems.ts`
- `submissions` 相关能力在 `problems.ts` 中已对齐
- `contests.ts`
- `ranking.ts`
- `messages.ts`
- `plagiarism.ts`
- `blog.ts`
- `discussions.ts`
- `classes.ts`
- `admin.ts`

#### 5.1.4 store

位于 `frontend/src/store`，负责认证状态等全局状态。

当前关键状态：

- 登录用户
- token / refresh token
- 持久化登录态

#### 5.1.5 hooks

位于 `frontend/src/hooks`，负责封装认证、页面交互或数据访问辅助逻辑。

### 5.2 后端分层

后端主入口在：

- [api/src/main.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs)

后端结构以模块为中心，每个模块通常包含：

- `models.rs`
- `service.rs`
- `routes.rs`

其中职责如下：

1. `routes.rs`
   - 负责路由注册
   - 负责输入解析、鉴权边界、HTTP 响应
2. `service.rs`
   - 负责 SQL 查询、业务逻辑、契约映射
3. `models.rs`
   - 负责请求体、响应体、数据库映射结构

### 5.3 判题工作器分层

`judge-worker` 主要包含：

- `processor`
- `queue`
- `sandbox`
- `compiler`

职责如下：

1. `queue`
   - 从 Redis 消费判题任务
2. `processor`
   - 任务调度与结果处理
3. `compiler`
   - 多语言编译与运行命令组织
4. `sandbox`
   - 沙箱执行、资源限制、最小 seccomp 硬化

## 6. 核心模块清单

### 6.1 认证与用户模块

后端位置：

- [api/src/auth/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/auth/routes.rs)
- [api/src/auth/mod.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/auth/mod.rs)
- [api/src/users/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/users/routes.rs)
- [api/src/users/service.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/users/service.rs)

前端位置：

- [frontend/src/pages/auth/LoginPage.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/auth/LoginPage.tsx)
- [frontend/src/pages/auth/RegisterPage.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/auth/RegisterPage.tsx)
- [frontend/src/store/authStore.ts](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/store/authStore.ts)

当前能力：

- 用户登录
- 注册
- token refresh
- `/users/me`
- 管理端用户列表
- 批量创建用户
- `user_code` 12 位业务号

约束：

- 系统内部主键为 `UUID`
- 外部业务号为 `user_code`
- 管理批量建号时使用 `user_code`

### 6.2 题目模块

后端位置：

- [api/src/problems/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/problems/routes.rs)
- [api/src/problems/test_cases.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/problems/test_cases.rs)

前端位置：

- [frontend/src/pages/user/ProblemSet.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/user/ProblemSet.tsx)
- [frontend/src/pages/user/ProblemDetail.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/user/ProblemDetail.tsx)
- [frontend/src/pages/admin/ProblemManagement.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/admin/ProblemManagement.tsx)

当前能力：

- 题目列表
- 题目详情
- 题目创建
- 题目编辑
- 题目删除
- 测试数据维护
- 题目统计聚合

### 6.3 IDE 与提交模块

后端位置：

- [api/src/submissions/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/submissions/routes.rs)
- [api/src/submissions/service.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/submissions/service.rs)

前端位置：

- [frontend/src/pages/user/ProblemIDEEnhanced.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/user/ProblemIDEEnhanced.tsx)
- [frontend/src/pages/user/SubmissionHistory.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/user/SubmissionHistory.tsx)
- [frontend/src/pages/user/SubmissionDetail.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/user/SubmissionDetail.tsx)

当前能力：

- 代码编辑
- 提交代码
- 状态查询
- 提交历史
- 判题分析摘要
- 测试点结果查看

### 6.4 竞赛与榜单模块

后端位置：

- [api/src/contests/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/contests/routes.rs)
- [api/src/contests/service.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/contests/service.rs)
- [api/src/leaderboard/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/leaderboard/routes.rs)
- [api/src/leaderboard/service.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/leaderboard/service.rs)

前端位置：

- [frontend/src/pages/user/ContestList.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/user/ContestList.tsx)
- [frontend/src/pages/user/ContestDetail.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/user/ContestDetail.tsx)
- [frontend/src/pages/contest/ContestScoreboard.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/contest/ContestScoreboard.tsx)
- [frontend/src/pages/user/Ranking.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/user/Ranking.tsx)

当前能力：

- 竞赛列表
- 竞赛详情
- 竞赛榜单
- 全站排行榜
- 学校/班级 scoped rank

### 6.5 班级与教师模块

后端位置：

- [api/src/classes/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/classes/routes.rs)
- [api/src/classes/service.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/classes/service.rs)

前端位置：

- [frontend/src/pages/teacher/ClassManagement.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/teacher/ClassManagement.tsx)
- [frontend/src/pages/teacher/ContestWizard.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/teacher/ContestWizard.tsx)
- [frontend/src/pages/teacher/AssignmentReport.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/teacher/AssignmentReport.tsx)

当前正式交付能力：

- 建班
- 班级列表/详情/统计
- 按邮箱加学生
- 批量导入学生
- 创建作业
- 删除作业

说明：

- 历史兼容端点如 `classes/enroll`、`assignments/:id/publish` 仍保留但不纳入当前交付主流程
- 当前交付采用 live schema 替代流

### 6.6 社区模块

后端位置：

- [api/src/discussions/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/discussions/routes.rs)
- [api/src/blog/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/blog/routes.rs)
- [api/src/messages/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/messages/routes.rs)

前端位置：

- [frontend/src/pages/community/DiscussionList.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/community/DiscussionList.tsx)
- [frontend/src/pages/community/DiscussionDetail.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/community/DiscussionDetail.tsx)
- [frontend/src/pages/community/BlogList.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/community/BlogList.tsx)
- [frontend/src/pages/community/CreateArticle.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/community/CreateArticle.tsx)
- [frontend/src/pages/community/EditArticle.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/community/EditArticle.tsx)
- [frontend/src/pages/community/DirectMessages.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/community/DirectMessages.tsx)

当前能力：

- 讨论列表与详情
- 发起讨论
- 博客列表、详情、创建、编辑
- 私信会话与消息发送

### 6.7 搜索与通知模块

后端位置：

- [api/src/search/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/search/routes.rs)
- [api/src/search/service.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/search/service.rs)
- [api/src/notifications/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/notifications/routes.rs)

前端位置：

- [frontend/src/pages/search/SearchResults.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/search/SearchResults.tsx)

当前能力：

- 搜索真实题目与讨论
- 通知相关接口存在，前端以当前已接入范围使用

### 6.8 反作弊模块

后端位置：

- [api/src/plagiarism/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/plagiarism/routes.rs)

前端位置：

- [frontend/src/pages/admin/SimilarityScanConfig.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/admin/SimilarityScanConfig.tsx)
- [frontend/src/pages/admin/PlagiarismReportList.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/admin/PlagiarismReportList.tsx)
- [frontend/src/pages/admin/PlagiarismReportDetail.tsx](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/pages/admin/PlagiarismReportDetail.tsx)

当前能力：

- 扫描配置
- 报告列表
- 报告详情
- 多风险态展示

### 6.9 判题工作器模块

位置：

- [judge-worker/src/main.rs](/Users/xiexingyu/Documents/项目/Online_Judge/judge-worker/src/main.rs)
- [judge-worker/src/processor/service.rs](/Users/xiexingyu/Documents/项目/Online_Judge/judge-worker/src/processor/service.rs)
- [judge-worker/src/queue/consumer.rs](/Users/xiexingyu/Documents/项目/Online_Judge/judge-worker/src/queue/consumer.rs)
- [judge-worker/src/sandbox/seccomp.rs](/Users/xiexingyu/Documents/项目/Online_Judge/judge-worker/src/sandbox/seccomp.rs)

当前能力：

- 从 Redis 消费任务
- 编译与执行
- 回写结果
- 最小 seccomp 硬化

## 7. 核心数据流

### 7.1 登录流

1. 用户在前端提交用户名和密码
2. 前端调用 `/auth/login`
3. API 校验数据库用户
4. 返回 token / refresh token / user
5. 前端写入 store 和本地存储
6. 后续受保护请求通过 `Authorization: Bearer <token>` 访问

### 7.2 提交流

1. 用户在 IDE 页面提交代码
2. 前端调用 `/submissions`
3. API 入库提交记录并入队
4. `judge-worker` 从 Redis 获取任务
5. `judge-worker` 编译并运行代码
6. 结果回写数据库
7. 前端轮询或刷新后查看结果

### 7.3 竞赛榜单流

1. 前端进入榜单页面
2. 调用 `/contests/:contestId/rankings` 或相关 scoreboard 接口
3. API 聚合提交结果并输出排名
4. 前端每 15 秒刷新

### 7.4 反作弊流

1. 管理员配置扫描参数
2. 触发扫描
3. API 计算/落库存档
4. 前端在列表页看到报告
5. 详情页读取风险摘要与对照关系

## 8. 运行环境与依赖

### 8.1 基础依赖

- Docker / Docker Compose
- Node.js 20+
- npm
- Rust / Cargo
- PostgreSQL 16
- Redis 7

### 8.2 环境变量

#### API

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge
REDIS_URL=redis://localhost:6379
JWT_SECRET=change_me
API_BIND_ADDRESS=0.0.0.0:3000
RUST_LOG=api=debug,tower_http=debug,axum=trace
```

#### Frontend

```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_BASE_URL=ws://localhost:3000
VITE_ENABLE_MOCK_DATA=false
```

#### judge-worker

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge
REDIS_URL=redis://localhost:6379
API_URL=http://localhost:3000
JUDGE_SECCOMP_MODE=strict
```

## 9. 启动方式

### 9.1 推荐：Docker 全栈启动

```bash
docker compose up -d --build

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
./scripts/bootstrap_demo.sh
```

访问：

- 前端：`http://localhost:5173`
- API：`http://localhost:3000`
- 健康检查：`http://localhost:3000/health`

### 9.2 本地开发启动

#### 启动数据库和 Redis

```bash
docker compose up -d postgres redis
```

#### 启动后端

```bash
cd api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
JWT_SECRET=dev-secret \
cargo run
```

#### 启动前端

```bash
cd frontend
npm install
npm run dev
```

#### 启动判题工作器

```bash
cd judge-worker
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
API_URL=http://localhost:3000 \
cargo run
```

## 10. 二次开发指南

### 10.1 前端新增页面

建议顺序：

1. 在 `pages` 新建页面
2. 在 `services` 新增接口适配层
3. 在 `types` 增加契约定义
4. 在 `App.tsx` 中以懒加载方式注册路由
5. 增加最小 smoke 或相关单测

### 10.2 后端新增模块

建议顺序：

1. 新建 `models.rs`
2. 新建 `service.rs`
3. 新建 `routes.rs`
4. 在 `main.rs` 中挂路由
5. 如需新表，先加 migration
6. 如需演示验收，补 demo seed

### 10.3 数据库变更

要求：

1. 一律通过 `api/migrations` 管理
2. 不直接依赖手工 SQL 漂移
3. 迁移需要幂等或明确版本顺序
4. 涉及 demo 验收的数据表，要同步 `scripts/bootstrap_demo.sql`

### 10.4 前端性能开发约束

当前已采用：

- 路由级懒加载
- 手工 vendor chunk 切分

二次开发时要求：

1. 页面组件默认走 `lazy import`
2. 重依赖组件尽量局部加载
3. 不把所有管理页/教师页静态导入主入口

## 11. API 手册

本节按模块给出 API 分组，而不是逐字段 OpenAPI 级别罗列。当前更适合作为开发接手手册。

### 11.1 公共接口

- `GET /health`
- `GET /status`

### 11.2 认证接口

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`

### 11.3 用户接口

- `GET /users/me`
- `GET /users/admin`
- `POST /users/admin/batch-create`
- 用户角色/状态相关管理操作

### 11.4 题目接口

- `GET /problems`
- `GET /problems/:id`
- `POST /problems`
- `PUT /problems/:id`
- `DELETE /problems/:id`
- `GET /problems/:id/statistics`
- `GET /problems/:id/test-cases`
- `POST /problems/:id/test-cases`
- `POST /problems/:id/test-cases/import`

### 11.5 提交接口

- `POST /submissions`
- `GET /submissions`
- `GET /submissions/:id`
- `GET /submissions/stats`

### 11.6 竞赛接口

- `GET /contests`
- `GET /contests/:id`
- `GET /contests/:id/problems`
- `GET /contests/:id/participants`
- `GET /contests/:id/rankings`

### 11.7 排行接口

- `GET /leaderboard/global`
- `GET /leaderboard/school/:id`
- `GET /leaderboard/user/:id/stats`

### 11.8 班级接口

- `GET /classes`
- `GET /classes/:id`
- `GET /classes/:id/stats`
- `POST /classes`
- `POST /classes/:id/students`
- `POST /classes/:id/students/import`
- `GET /classes/:id/assignments`
- `POST /classes/:id/assignments`
- `DELETE /classes/:id/assignments/:assignmentId`

### 11.9 社区接口

- `GET /discussions`
- `GET /discussions/:id`
- `POST /discussions`
- `GET /blog`
- `GET /blog/:slug`
- `POST /blog`
- `PUT /blog/:slug`
- `GET /messages/...`
- `POST /messages/...`

### 11.10 搜索接口

- `GET /search`
- `GET /search/suggestions`

### 11.11 通知接口

- `GET /notifications`
- 相关已读与设置接口

### 11.12 反作弊接口

- `GET /admin/plagiarism/config`
- `PUT /admin/plagiarism/config`
- `POST /admin/plagiarism/scan`
- `GET /admin/plagiarism/reports`
- `GET /admin/plagiarism/reports/:id`

## 12. 前端页面与 reference 对齐说明

当前高价值页面已经按真实数据与 reference 模板做过动态化收敛，详见：

- [REFERENCE_DYNAMICIZATION_MATRIX_2026-03-07.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/REFERENCE_DYNAMICIZATION_MATRIX_2026-03-07.md)

当前判断原则：

1. `matched`
   - 真实数据
   - 视觉层级和结构接近 reference
   - 主交互有 smoke 覆盖
2. `partial`
   - 真实数据可用
   - 但视觉或交互还未完全封顶

## 13. 开发测试与验收

### 13.1 后端门禁

```bash
cargo check -p api
cargo test -p api --no-run
```

### 13.2 判题器门禁

```bash
cargo check -p judge-worker
cargo test -p judge-worker --no-run
```

### 13.3 前端门禁

```bash
cd frontend
npm run typecheck --silent
npm run build --silent
npx playwright test e2e/smoke.spec.ts
```

### 13.4 当前 smoke 覆盖主链路

- 登录页
- 多角色数据库认证
- dashboard
- problems
- blog / blog editor
- admin users / problems / plagiarism
- submissions
- IDE
- teacher classes
- messages
- ranking
- contests / contest detail / contest scoreboard

## 14. 部署手册

### 14.1 Docker Compose

当前编排文件：

- [docker-compose.yml](/Users/xiexingyu/Documents/项目/Online_Judge/docker-compose.yml)

服务包括：

- `postgres`
- `redis`
- `api`
- `frontend`
- `judge-worker`

### 14.2 发布顺序

1. 备份数据库
2. 部署 API
3. 跑迁移
4. 部署 judge-worker
5. 部署 frontend
6. 运行 smoke 验证

### 14.3 回滚顺序

1. 回滚 frontend
2. 回滚 API
3. 回滚 judge-worker
4. 如有必要回滚数据库

详细步骤见：

- [RELEASE_RUNBOOK_2026-03-06.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/RELEASE_RUNBOOK_2026-03-06.md)

## 15. 维护手册

### 15.1 日常维护检查项

1. API `/health` 与 `/status`
2. Redis 可用性
3. PostgreSQL 连接与迁移状态
4. 提交积压
5. 判题工作器是否持续消费
6. 关键页面冒烟是否通过

### 15.2 常见问题

#### 问题：登录成功后页面仍跳回登录页

检查项：

1. token 是否写入 `localStorage`
2. `/users/me` 是否返回 `200`
3. `JWT_SECRET` 是否与签发端一致

#### 问题：提交创建成功但结果不更新

检查项：

1. Redis 是否正常
2. `judge-worker` 是否运行
3. API 与 worker 是否共用同一个数据库

#### 问题：前端白屏

检查项：

1. `npm run build` 是否通过
2. 浏览器控制台是否有 chunk 加载异常
3. 路由懒加载页面是否导出命名正确

### 15.3 数据维护

需要演示环境时，统一执行：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
./scripts/bootstrap_demo.sh
```

## 16. 用户手册

### 16.1 学生/普通用户

1. 登录系统
2. 浏览题库
3. 进入题目详情
4. 打开 IDE 提交代码
5. 在提交历史与提交详情查看结果
6. 查看排行榜
7. 参与讨论、博客、私信

### 16.2 教师

1. 登录教师账号
2. 进入班级管理
3. 创建班级
4. 通过邮箱添加学生或批量导入
5. 创建作业
6. 查看教学相关报告页

### 16.3 管理员

1. 登录管理员账号
2. 进入 `/admin`
3. 管理用户与批量建号
4. 管理题目与测试数据
5. 配置相似度扫描
6. 查看反作弊报告

## 17. 安全与合规

### 17.1 身份约束

- 用户内部主键：`UUID`
- 外部业务号：`user_code`
- 不允许将内部主键直接替换为业务编号

### 17.2 判题安全

当前最小安全措施：

1. 容器化执行
2. `NO_NEW_PRIVS`
3. 可选 `strict seccomp`

说明：

- 当前 seccomp 是最小可交付硬化，不等同于完整生产隔离体系
- 如果进入更高安全等级环境，应进一步补足命名空间、cgroup、seccomp profile、资源审计与宿主机隔离策略

### 17.3 License

当前项目使用：

- [LICENSE](/Users/xiexingyu/Documents/项目/Online_Judge/LICENSE)

即 `Private License`。

## 18. 已知边界与后续优化

当前不阻塞交付，但属于后续工程优化项：

1. 前端仍有大 chunk 告警，虽然已通过路由懒加载和手工 vendor 分包降低主包压力
2. API 与 judge-worker 仍有 warning，可继续降噪
3. 部分 reference 变体仍然合并在同一动态页面中，而不是逐一独立页面
4. `admin/problems` 当前通过共享 `/problems` 合同实现，而不是独立 admin namespace

## 19. 交接建议

如果有新团队接手，建议按以下顺序熟悉：

1. 先看本手册
2. 再看 [FINAL_SUMMARY.md](/Users/xiexingyu/Documents/项目/Online_Judge/FINAL_SUMMARY.md)
3. 再看 [RELEASE_RUNBOOK_2026-03-06.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/RELEASE_RUNBOOK_2026-03-06.md)
4. 最后结合 `api/src/main.rs`、`frontend/src/App.tsx`、`docker-compose.yml` 阅读真实代码结构

## 20. 附录

### 20.1 当前正式文档入口

- [FINAL_SUMMARY.md](/Users/xiexingyu/Documents/项目/Online_Judge/FINAL_SUMMARY.md)
- [DELIVERY_DOCUMENT_SET_2026-03-07.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/DELIVERY_DOCUMENT_SET_2026-03-07.md)
- [PROJECT_HANDBOOK_2026-03-07.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/PROJECT_HANDBOOK_2026-03-07.md)

### 20.2 当前历史文档口径

以下文件为历史快照，不作为当前状态依据：

- [PROJECT_BASELINE_2026-03-06.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/PROJECT_BASELINE_2026-03-06.md)
- [IMPLEMENTATION_PLAN_BY_REQUIREMENT_2026-03-06.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/IMPLEMENTATION_PLAN_BY_REQUIREMENT_2026-03-06.md)
