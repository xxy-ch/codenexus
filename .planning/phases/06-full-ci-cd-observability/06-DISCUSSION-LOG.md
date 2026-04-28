# Phase 6: Full CI/CD + Observability - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 06-full-ci-cd-observability
**Areas discussed:** Docker registry, Health check migration, Codex PR review, Prometheus metrics granularity

---

## Docker Registry

| Option | Description | Selected |
|--------|-------------|----------|
| ghcr.io | GitHub 内置 Container Registry，免费，CI 直接用 GITHUB_TOKEN | |
| Docker Hub | 业界最广泛，需要额外账号和 token | |
| 自建/内部 Registry | 适合企业部署 | |
| 仅构建验证，不推送 | CI 只做 docker build 验证，不推送到任何 registry | ✓ |

**User's choice:** 不推送到远程 registry，保持本地。CI 仅做构建验证。
**Notes:** 用户明确表示不需要推送，部署使用 docker-compose 本地构建即可。

---

## Health Check Endpoint Migration

| Option | Description | Selected |
|--------|-------------|----------|
| 新增端点，保留旧端点 | 新增 /health/live + /health/ready，保留 /health 和 /status | |
| 替换旧端点 | 用新端点替换旧端点 | |
| 新增 + 重定向旧端点 | 新增 /health/live + /health/ready，旧端点 307 重定向 | ✓ |

**User's choice:** 新增 + 重定向旧端点。向后兼容同时统一命名。

---

## Codex PR Review

| Option | Description | Selected |
|--------|-------------|----------|
| 所有 PR 自动审查 | 每个 PR 自动触发 Codex 审查 | |
| 条件触发 | label 或路径匹配时触发 | |
| 推迟 Codex 集成 | 先完成其他 4 个需求 | |
| 不自动化，手动介入 | 用户手动审阅，不做自动化集成 | ✓ |

**User's choice:** 不做自动化 Codex 集成，保持手动审阅。
**Notes:** CICD-05 标记为 deferred。

---

## Prometheus Metrics Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| 仅必需指标 | http_request_duration_seconds + submission_queue_depth | |
| 必需 + 运行时指标 | 加上 DB/Redis 连接池、WebSocket 连接数、状态码计数 | |
| 全面可观测 | 上面所有 + P95/P99 + 租户维度细分 | ✓ |

**User's choice:** 全面可观测 — 必需指标 + 运行时指标 + P95/P99 + 租户维度。

---

## Deferred Ideas

- CICD-05 Codex 自动化 PR 审查 — 用户选择手动
- Docker 镜像推送到 registry — 本地构建验证即可
