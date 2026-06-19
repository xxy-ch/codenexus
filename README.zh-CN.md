![CodeNexus Banner](codenexus_banner.svg)

> 📄 **[Read in English / 英文说明](README.md)**

# CodeNexus

CodeNexus 在线判题系统是一个面向教育机构的多租户、多角色竞赛编程平台，支持 C/C++/Java/Python/Go/JavaScript 六种编程语言的沙箱安全评测，为学生、教师和管理员提供完整的在线编程教学与竞赛体验。

## 架构概览

```
┌──────────────────┐     ┌─────────────────────────────────────────┐     ┌─────────────────┐
│                  │     │              Backend (Rust)              │     │                 │
│    Frontend      │     │  ┌─────────────────────────────────┐    │     │  Judge Worker   │
│  React + Vite    │────>│  │           API (Axum)            │    │     │  Redis Streams  │
│  TypeScript      │     │  │  9 个领域 crate + api-infra     │    │<────│  cgroups/seccomp│
│  Port 5173 / 80  │     │  │  PostgreSQL + Redis + WebSocket │    │     │  编译 / 执行    │
│                  │     │  └─────────────────────────────────┘    │     │  Sandbox        │
└──────────────────┘     │                 Port 3000               │     └─────────────────┘
                         └─────────────────────────────────────────┘
                                    ▲                    ▲
                                    │                    │
                              PostgreSQL 16          Redis 7
```

**核心数据流：** 用户通过前端提交代码，API 服务器将评测任务发布到 Redis Streams，判题工作器消费任务后在 Linux 沙箱中编译并执行代码，将评测结果回调至 API，API 再通过 WebSocket 实时推送结果给前端。

## 核心特性

- **6 种编程语言支持** — C、C++、Java、Python、Go、JavaScript，覆盖主流教学与竞赛场景
- **沙箱安全执行** — 基于 cgroups（内存/CPU 限制）、chroot（文件系统隔离）和 seccomp（系统调用过滤）三层沙箱机制，确保评测隔离与安全
- **多租户多角色** — 支持多学校/多校区独立运作，内置 Root、CampusAdmin、GradeAdmin、Teacher、TeachingAssistant、Student 六级 RBAC 权限体系，数据严格按租户隔离
- **实时评测反馈** — WebSocket 推送评测进度、排行榜更新、竞赛状态和即时通知
- **竞赛系统** — 支持创建竞赛、题目分配、实时排行榜、竞赛聊天室
- **班级与作业** — 教师可创建班级、管理学生、发布作业、查看学生提交报告
- **讨论与博客** — 题目讨论区、技术博客、评论系统，构建学习社区
- **代码查重** — 基于代码相似度检测的抄袭检测模块，支持管理后台配置
- **私信系统** — 用户间一对一会话、历史消息发送/读取与未读消息提醒
- **Feature Gateway 与 AI Worker** — 运行时功能开关控制 LLM 分析、教学卡片、题目推荐、班级认知快照等可选能力
- **学习路线图** — 面向学生的知识拓扑图，将技能节点与题目发现流程关联
- **全文搜索** — 搜索题目、用户、讨论、博客等内容
- **导入导出** — 支持题目 ZIP 批量导入导出与用户 CSV 批量导入导出，便于题库迁移和账号开通

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + TypeScript + Vite | React 19, TypeScript 5.9, Vite 7 |
| UI 组件 | Tailwind CSS v4 + shadcn + Lucide Icons | — |
| 状态管理 | Zustand（客户端状态）+ TanStack React Query（服务端状态） | — |
| 表单校验 | react-hook-form + Zod | — |
| 代码编辑器 | Monaco Editor（提交代码）+ CodeMirror（Markdown 编辑） | — |
| API 服务器 | Rust + Axum + SQLx | Rust Edition 2021, Axum 0.7, SQLx 0.8 |
| Feature Gateway | Rust + Axum + SQLx | 独立服务，支持全局/校区/年级/班级作用域功能开关 |
| LLM Worker | Rust worker | 位于功能开关后的 AI 任务处理 |
| 判题工作器 | Rust + Redis Streams + cgroups/seccomp | Rust Edition 2021 |
| 数据库 | PostgreSQL | 16 |
| 缓存 / 消息队列 | Redis | 7 |
| 容器编排 | Docker Compose | — |

## 项目结构

```
Online_Judge/
├── backend/                          # Rust 工作空间（14 个 crate）
│   ├── Cargo.toml                    # 工作空间根配置
│   ├── rust-toolchain.toml           # Rust 工具链版本
│   │
│   ├── api/                          # API 服务器入口（Axum HTTP + WebSocket）
│   ├── api-infra/                    # API 基础设施层（中间件、数据库、Redis、鉴权等共享组件）
│   ├── shared/                       # 跨 crate 共享类型（Claims、Role、Permission 等）
│   │
│   ├── domain-users/                 # 用户管理领域（注册、登录、个人资料、RBAC）
│   ├── domain-problems/              # 题目管理领域（题目 CRUD、测试用例、标签、可见性）
│   ├── domain-submissions/           # 提交评测领域（提交记录、评测结果、测试用例结果）
│   ├── domain-contests/              # 竞赛管理领域（竞赛创建、参与、排行榜）
│   ├── domain-classes/               # 班级作业领域（班级管理、学生注册、作业发布）
│   ├── domain-community/             # 社区互动领域（讨论、博客、评论）
│   ├── domain-leaderboard/           # 排行榜领域（全局/竞赛/班级排名）
│   ├── domain-search/                # 搜索领域（全文搜索）
│   ├── domain-imex/                  # 导入导出领域（题目 ZIP 与用户 CSV）
│   │
│   ├── judge-worker/                 # 判题工作器（沙箱执行、编译、结果回调）
│   └── migration-tool/               # 数据库迁移工具（MySQL → PostgreSQL）
│
├── frontend/                         # React 前端应用
│   ├── package.json                  # npm 依赖与脚本
│   ├── vite.config.ts                # Vite 构建配置
│   ├── src/
│   │   ├── pages/                    # 页面组件
│   │   ├── components/               # 通用 UI 组件
│   │   ├── services/                 # API 服务层
│   │   ├── hooks/                    # 自定义 Hooks
│   │   ├── store/                    # Zustand 状态管理
│   │   ├── types/                    # TypeScript 类型定义
│   │   ├── layouts/                  # 布局组件
│   │   ├── lib/                      # 工具函数
│   │   └── utils/                    # 辅助工具
│   └── Dockerfile                    # 前端生产构建（Nginx）
│
├── docker-compose.yml                # 全栈容器编排
├── scripts/                          # 辅助脚本（演示数据初始化等）
├── docs/                             # 额外文档
└── LICENSE                           # 私有许可证
```

### Backend 工作空间依赖关系

```
shared ─────────────────────────────────────────────────────────┐
  │                                                             │
  └── api-infra ────────────────────────────────────────────┐   │
        │                                                   │   │
        ├── domain-users                                    │   │
        ├── domain-problems                                 │   │
        ├── domain-submissions                              │   │
        ├── domain-contests                                 │   │
        ├── domain-classes                                  │   │
        ├── domain-community                                │   │
        ├── domain-leaderboard                              │   │
        ├── domain-search                                   │   │
        │                                                   │   │
        └── domain-imex ── domain-problems + domain-users   │   │
                                                            │   │
api ─── 所有 domain-* + api-infra + shared ◄────────────────┘   │
                                                                 │
judge-worker ◄── shared                                         │
migration-tool ◄── shared                                       │
```

## 快速开始

详细的安装与配置指南请参阅 [GETTING-STARTED.md](GETTING-STARTED.zh-CN.md)。

### Docker 全栈部署

```bash
docker compose up -d --build
```

使用演示数据初始化：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
  ./scripts/bootstrap_demo.sh
```

访问地址：

| 服务 | 地址 |
|------|------|
| 前端 | `http://localhost:5173` |
| API | `http://localhost:3000` |
| 健康检查 | `http://localhost:3000/health` |

### 本地开发

**1. 启动基础设施：**

```bash
docker compose up -d postgres redis
```

**2. 启动 API 服务器：**

```bash
cd backend/api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
JWT_SECRET=dev-secret \
cargo run
```

**3. 启动前端开发服务器：**

```bash
cd frontend
npm install
npm run dev
```

**4. 启动判题工作器（可选，需要 Linux 环境）：**

```bash
cd backend/judge-worker
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
API_URL=http://localhost:3000 \
WORKER_SECRET=dev-secret \
cargo run
```

### 质量检查

```bash
# API 编译与测试检查
cd backend
cargo check -p api
cargo test -p api --no-run
cargo check -p judge-worker
cargo test -p judge-worker --no-run

# 前端类型检查与构建
cd frontend
npm run typecheck --silent
npm run build --silent

# 前端 E2E 测试
npx playwright test e2e/smoke.spec.ts
```

## 文档索引

| 文档 | 说明 |
|------|------|
| [GETTING-STARTED.md](GETTING-STARTED.zh-CN.md) | 环境准备、安装步骤与首次运行指南 |
| [ARCHITECTURE.md](ARCHITECTURE.zh-CN.md) | 系统架构、组件关系与数据流详解 |
| [DEVELOPMENT.md](DEVELOPMENT.zh-CN.md) | 本地开发环境配置与编码规范 |
| [TESTING.md](TESTING.zh-CN.md) | 测试框架、运行方式与覆盖率要求 |
| [API.md](API.zh-CN.md) | REST API 接口文档 |
| [CONFIGURATION.md](CONFIGURATION.zh-CN.md) | 环境变量与配置项说明 |
| [DEPLOYMENT.md](DEPLOYMENT.zh-CN.md) | 生产环境部署指南 |

## 许可证

本项目采用私有许可证，详见 [LICENSE](LICENSE)。未经授权不得使用、复制、修改或分发。
<!-- GSD:docs -->
