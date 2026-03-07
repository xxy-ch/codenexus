# Online Judge 项目基线（2026-03-06）

> 已退役。自 2026-03-07 起，本文件仅保留历史快照，不再作为当前项目状态依据。
> 当前状态请改看：
> - `docs/delivery/DELIVERY_GAP_REGISTER_2026-03-07.md`
> - `docs/architecture/REFERENCE_DYNAMICIZATION_MATRIX_2026-03-07.md`
> - `docs/delivery/RELEASE_RUNBOOK_2026-03-06.md`

本文件曾是阶段性状态入口，但内容已明显落后于当前仓库实现。

## 1. 当前结论

- 项目阶段：`功能模块基本齐全，处于集成与验收阶段`
- 进度口径：`约 35%-45% 可交付度`（功能存在，但端到端一致性与可验证性不足）
- 代码状态：
  - 分支：`master`（相对 `origin/master` ahead 28）
  - 工作区：大量未提交改动（后端、前端、文档、测试均有变化）
- 最近开发高峰：`2026-02-21 ~ 2026-02-22`（Phase 8/9/10）

## 2. 已实现的核心能力（按代码入口）

- 后端路由主入口：
  - 认证、用户、题目、提交、竞赛、排行榜、班级、讨论、博客、搜索、通知、WebSocket
  - 参考：`api/src/main.rs`
- 判题工作器：
  - Redis Stream 消费、判题处理、结果回传 API
  - 参考：`judge-worker/src/main.rs`
- 前端能力：
  - React + TS + Vite，包含社区、竞赛、用户、管理等模块
  - 参考：`frontend/src/`

## 3. 当前主要风险（阻断交付）

1. 鉴权中间件作用域风险  
   - 当前路由层级可能导致公开接口（如登录/注册）被统一鉴权。

2. 前后端接口路径不一致风险  
   - 示例：前端存在 `/ranking` 调用，后端主要暴露 `/leaderboard/...`。

3. Mock 分支未完全清理  
   - 多个前端 service 仍保留 `USE_MOCK_DATA` 分支和失败回退 mock。

4. 文档版本冲突  
   - 历史文档存在“后端已修复”与“后端仍无法编译”并存的情况。

## 4. 文档治理规则（从今天开始）

- 本文件维护“当前状态”。
- `docs/archive/legacy-docs/IMPLEMENTATION_PLAN_BY_REQUIREMENT_2026-03-06.md` 维护“执行计划”。
- 其余 `PHASE*`、`*_REPORT.md`、`TODO.md`、`DEPLOYMENT_STATUS.md` 视为历史记录，不作为当前决策依据。

## 5. 下一里程碑定义（M1）

M1 目标：`最小可验收闭环`

- 用户可注册/登录
- 题目列表与详情可读
- 提交可入队、判题、状态回写
- 前端关键页面不依赖 mock
- 提供最小 E2E 冒烟用例（登录 -> 查看题目 -> 提交 -> 查看结果）
