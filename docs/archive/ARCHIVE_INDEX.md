# 历史文档归档索引

## 说明

根目录 Markdown 文档已收敛为正式入口文件：

- [README.md](/Users/xiexingyu/Documents/项目/Online_Judge/README.md)
- [FINAL_SUMMARY.md](/Users/xiexingyu/Documents/项目/Online_Judge/FINAL_SUMMARY.md)

其余历史阶段、计划、报告、快速指南与临时说明文档已归档到 `docs/archive/`。

这些归档文件仅用于追溯历史过程，不作为当前交付状态依据。

## 目录结构

### `reports`

- 阶段完成报告
- 综合测试报告
- 项目完成报告

### `status`

- 历史状态盘点
- 部署状态说明
- 数据存储分析

### `plans`

- 历史集成计划
- 后续阶段计划
- 剩余工作计划

### `phases`

- 各阶段完成记录
- 阶段性文档

### `guides`

- 快速开始
- 快速指南
- 编辑器说明
- TypeScript 修复说明
- WebSocket 接入说明

### `notes`

- 历史 TODO 与临时记录

### `scripts`

- 历史根目录脚本
- 已被当前正式 runbook 与 `docker compose` 启动方式替代

### `assets`

- 历史压缩包
- 备份文件
- 一次性交付或迁移产物

### `legacy-assets`

- 历史根目录迁移脚本
- 历史 shell 测试脚本
- 已不作为当前项目运行入口

## 当前正式文档入口

请优先使用以下文档：

1. [项目完整开发与维护手册](/Users/xiexingyu/Documents/项目/Online_Judge/docs/architecture/PROJECT_HANDBOOK_2026-03-07.md)
2. [交付文档集入口](/Users/xiexingyu/Documents/项目/Online_Judge/docs/delivery/DELIVERY_DOCUMENT_SET_2026-03-07.md)
3. [发布与回滚 Runbook](/Users/xiexingyu/Documents/项目/Online_Judge/docs/delivery/RELEASE_RUNBOOK_2026-03-06.md)
4. [最终交付总结](/Users/xiexingyu/Documents/项目/Online_Judge/FINAL_SUMMARY.md)

## 已清理的冗余目录

以下目录已从仓库根目录移除，不再作为当前项目组成部分保留：

- `examples/`
- `sqlx/`
- `testcontainers-rs/`
- `target/`

清理原因：

- `examples/`、`sqlx/`、`testcontainers-rs/` 为第三方示例或 vendored 副本，不参与当前项目运行
- `target/` 为构建产物目录，可随时重新生成
