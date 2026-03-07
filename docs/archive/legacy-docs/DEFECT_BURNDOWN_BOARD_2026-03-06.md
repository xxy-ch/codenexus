# 缺陷清零看板（2026-03-06）

## 1. 目标

- Day21 封板前：`P0=0, P1=0`。
- P2/P3 仅允许存在“已登记且不阻断本次交付”的条目。

## 2. 看板字段规范

- ID
- 严重级别（P0/P1/P2/P3）
- 模块（Auth/Problems/Submissions/Community/Admin/Teacher/Infra）
- 现象描述
- 复现步骤
- 影响范围
- 当前状态（Open / In Progress / Fixed / Verified / Deferred）
- Owner
- 计划修复时间
- 验证人

## 3. 当前重点清零项（发布前）

| ID | 级别 | 模块 | 现象 | 状态 | Owner |
|---|---|---|---|---|---|
| D-001 | P0 | Submission | 提交状态无法进入终态（若出现） | Open | 待指定 |
| D-002 | P1 | Community | 博客/讨论点赞计数不一致（历史风险点） | Fixed | 前端 |
| D-003 | P1 | Profile | 个人资料保存后未持久化（历史风险点） | Fixed | 前端 |
| D-004 | P1 | Testing | vitest setup 路径错误导致测试无法启动 | Fixed | 前端 |
| D-005 | P1 | Build | playwright config 语法错误 | Fixed | 前端 |

## 4. 阻塞项转决策（非缺陷）

- B-001：私信后端接口缺失（`/messages/*`）
  - 处置：已补后端，纳入本次发布范围。
  - 状态：Closed。

- B-002：反作弊后端接口缺失（`/admin/plagiarism/*`）
  - 处置：已补后端，纳入本次发布范围。
  - 状态：Closed。

## 5. 每日更新节奏

- 每日 2 次更新：中午、下班前。
- 仅保留事实状态，不记录过程讨论。
- 任何 P0 新增后，停止新增功能开发，优先止血。
