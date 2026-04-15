# Phase 7: Test Coverage + Contest Enhancement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 07-test-coverage-contest-enhancement
**Areas discussed:** Test scope/priority, Contest freeze status, Upsolving behavior, Submission recovery design

---

## Test Scope and Priority

| Option | Description | Selected |
|--------|-------------|----------|
| 自底向上 | domain 集成测试 → API handler → 前端 → E2E | ✓ |
| E2E 优先 | 先 Playwright 关键流程，再回头补单元测试 | |
| 全部并行 | 8 个需求全部并行 | |

**User's choice:** 自底向上

| Option | Description | Selected |
|--------|-------------|----------|
| testcontainers | 真实 PostgreSQL/Redis 容器 | ✓ |
| sqlx::test + mock | 内置 fixture + mock | |
| 纯 mock | 完全模拟数据库 | |

**User's choice:** testcontainers

---

## Contest Freeze

| Option | Description | Selected |
|--------|-------------|----------|
| 快照式冻结 | 冻结期间返回缓存快照，赛后解冻显示最终排名 | ✓ |
| 完全隐藏 | 冻结期间不返回任何数据 | |
| 仅自己排名可见 | 用户只看到自己的排名 | |

**User's choice:** 快照式冻结
**Notes:** 现有实现有 is_frozen 标记 + submissions_cutoff，但缺少快照存储。

---

## Upsolving Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| 自动开启 | 竞赛结束后自动开启，提交标记 is_upsolving=true | ✓ |
| 手动开启 | 老师手动开启，可设置限时 | |

**User's choice:** 自动开启

---

## Submission Recovery

| Option | Description | Selected |
|--------|-------------|----------|
| Worker 自愈 | Worker 启动时扫描 XPENDING + XCLAIM 重试 | ✓ |
| API 端点管理 | API 端点扫描 DLQ + 手动重试 | |
| 混合 | Worker 自愈 + API 监控端点 | |

**User's choice:** Worker 自愈
