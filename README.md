<!-- generated-by: gsd-doc-writer -->
# Online Judge

在线判题系统，当前仓库已收敛为可交付版本，包含：

- React + TypeScript 前端
- Rust + Axum API
- Rust 判题工作器
- PostgreSQL + Redis 基础设施

## 功能特性

- **6 种编程语言支持** — C、C++、Java、Python、Go、JavaScript，覆盖主流教学场景
- **沙箱安全执行** — 基于 cgroups（内存/CPU 限制）、chroot（文件系统隔离）和 seccomp（系统调用过滤）的 Linux 沙箱
- **多租户多角色** — 支持多学校/多校区，内置 student、teacher、admin、root 四级 RBAC 权限体系
- **实时评测反馈** — WebSocket 推送评测进度、排行榜更新、通知和竞赛状态
- **竞赛系统** — 支持创建竞赛、题目分配、实时排行榜、竞赛聊天
- **班级与作业** — 教师可创建班级、发布作业、查看学生提交报告
- **讨论与博客** — 题目讨论区、技术博客、评论系统
- **代码查重** — 基于代码相似度检测的抄袭检测模块
- **私信系统** — 用户间实时私信功能
- **搜索** — 全文搜索支持题目、用户、讨论、博客

## 架构概览

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend   │────>│   API (Axum)     │     │  Judge Worker   │
│  React + Vite│     │  PostgreSQL      │<────│  Redis Streams  │
│  TypeScript  │     │  Redis           │     │  cgroups/seccomp│
│  Port 5173/80│     │  Port 3000       │     │  Sandbox        │
└──────────────┘     └──────────────────┘     └─────────────────┘
```

用户通过前端提交代码，API 服务器将评测任务发布到 Redis Streams，判题工作器消费任务后在 Linux 沙箱中编译并执行代码，将评测结果回调至 API，API 再通过 WebSocket 实时推送结果给前端。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端 | React + TypeScript + Vite | React 19, TS 5.9, Vite 7 |
| UI | Tailwind CSS v4 + shadcn + Lucide | — |
| 状态管理 | Zustand + TanStack React Query | — |
| API 服务器 | Rust + Axum + SQLx | Rust 2021, Axum 0.7, SQLx 0.8 |
| 判题工作器 | Rust + Redis Streams + cgroups | Rust 2021 |
| 数据库 | PostgreSQL | 16 |
| 缓存/队列 | Redis | 7 |
| 容器编排 | Docker Compose | — |

## 文档

| 文档 | 说明 |
|------|------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | 系统架构与组件概览 |
| [GETTING-STARTED.md](GETTING-STARTED.md) | 环境准备与首次运行 |
| [DEVELOPMENT.md](DEVELOPMENT.md) | 本地开发指南 |
| [TESTING.md](TESTING.md) | 测试框架与规范 |
| [API.md](API.md) | API 接口文档 |
| [CONFIGURATION.md](CONFIGURATION.md) | 配置项说明 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 部署指南 |

## 快速启动

### Docker 全栈

```bash
docker compose up -d --build

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
./scripts/bootstrap_demo.sh
```

访问地址：

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`

### 本地开发

```bash
docker compose up -d postgres redis

cd api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
JWT_SECRET=dev-secret \
cargo run
```

```bash
cd frontend
npm install
npm run dev
```

```bash
cd judge-worker
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
REDIS_URL=redis://localhost:6379 \
API_URL=http://localhost:3000 \
cargo run
```

## 质量门禁

```bash
cargo check -p api
cargo test -p api --no-run

cargo check -p judge-worker
cargo test -p judge-worker --no-run

cd frontend
npm run typecheck --silent
npm run build --silent
npx playwright test e2e/smoke.spec.ts
```

## License

本项目使用 [Private License](LICENSE)。
<!-- GSD:docs -->
