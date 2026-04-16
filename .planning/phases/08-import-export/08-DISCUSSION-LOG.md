# Phase 8: Import/Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 08-import-export
**Areas discussed:** Problem ZIP structure, Import conflict behavior, User CSV format & passwords, Frontend import/export UX

---

## Problem ZIP Structure

| Option | Description | Selected |
|--------|-------------|----------|
| 扁平 + testcases/ 目录 | problem.md 在根目录, 单题目 ZIP | |
| 多题目子文件夹 | problems/{slug}/ 子目录, 一个 ZIP 含多个题目 | ✓ |
| 全在 config.json | 无单独 .in/.out 文件, 测试用例内联 | |

**User's choice:** 多题目子文件夹

| Option | Description | Selected |
|--------|-------------|----------|
| 完整元数据 + 测试用例映射 | config.json 含所有字段 + test_cases 数组 | ✓ |
| 最小化 + 约定自动发现 | config.json 只有 title + difficulty, 测试用例自动发现 | |

**User's choice:** 完整元数据 + 测试用例映射

---

## Import Conflict Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| 全有或全无 | 任何冲突导致整个批次失败 | |
| 尽力而为 | 成功创建, 失败跳过, 返回成功+失败列表 | ✓ |
| 覆盖更新 | 冲突时覆盖旧数据 | |

**User's choice:** 尽力而为

| Option | Description | Selected |
|--------|-------------|----------|
| 组织内 title/username 唯一 | 同组织内同名即重复 | ✓ |
| 完全匹配才算重复 | 所有字段完全一致才重复 | |
| 不检查重复 | 所有条目都当新建 | |

**User's choice:** 组织内 title/username 唯一

---

## User CSV Format & Passwords

| Option | Description | Selected |
|--------|-------------|----------|
| 统一默认密码 | 上传时指定一个默认密码 | ✓ |
| 自动生成随机密码 | 系统生成随机密码, 返回 CSV | |
| CSV 中指定密码 | CSV 包含 password 列 | |

**User's choice:** 统一默认密码

**CSV 必填字段:** username, role, campus_id, display_name（用户自定义）

---

## Frontend Import/Export UX

| Option | Description | Selected |
|--------|-------------|----------|
| 集成到现有管理页面 | 题目管理页/用户管理页加按钮 | |
| 独立的批量操作页面 | 单独的 /import-export 页面 | ✓ |

**User's choice:** 独立的批量操作页面

| Option | Description | Selected |
|--------|-------------|----------|
| 预览后确认 | 上传 → 解析预览 → 用户确认 → 执行 | ✓ |
| 上传即处理 | 上传直接处理返回结果 | |

**User's choice:** 预览后确认
