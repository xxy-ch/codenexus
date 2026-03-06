# 最终交付包目录结构（2026-03-06）

## 1. 交付包建议结构

```text
release/
  01_code/
    api/
    frontend/
    judge-worker/
  02_docs/
    ACCEPTANCE_CHECKLIST_2026-03-06.md
    CONTRACT_ALIGNMENT_2026-03-06.md
    RELEASE_RUNBOOK_2026-03-06.md
    RELEASE_DECISION_RECORD_2026-03-06.md
    RELEASE_SCOPE_2026-03-06.md
    WAIVER_LIST_2026-03-06.md
    DEMO_SCRIPT_2026-03-06.md
    DEFECT_BURNDOWN_BOARD_2026-03-06.md
  03_test_reports/
    unit/
    e2e/
    smoke/
  04_ops/
    env.sample
    migration/
    rollback/
```

## 2. 必交文件

- 验收：`ACCEPTANCE_CHECKLIST_2026-03-06.md`
- 契约：`CONTRACT_ALIGNMENT_2026-03-06.md`
- 发布回滚：`RELEASE_RUNBOOK_2026-03-06.md`
- 决策：`RELEASE_DECISION_RECORD_2026-03-06.md`
- 范围：`RELEASE_SCOPE_2026-03-06.md`
- 豁免：`WAIVER_LIST_2026-03-06.md`
- 演示：`DEMO_SCRIPT_2026-03-06.md`
- 缺陷：`DEFECT_BURNDOWN_BOARD_2026-03-06.md`

## 3. 打包前核对清单

- 代码分支与提交 hash 已记录。
- 文档版本日期一致（2026-03-06）。
- 测试报告路径可追溯。
- 环境变量模板包含 feature flag 默认值。
