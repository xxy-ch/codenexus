# Online Judge 项目交付总结

## 1. 文档信息

- 文档名称：项目交付总结
- 文档日期：2026-03-07
- 文档状态：正式交付版
- 适用范围：当前仓库交付、验收、上线、运维交接
- License：Private License

## 2. 项目结论

当前仓库已完成本阶段交付落地，主链路、运行环境、交付文档和验收材料均已形成闭环。

当前结论：

- 交付状态：`已完成落地交付`
- 前后端连接件：`已收敛到真实运行合同`
- Docker 本地栈：`可启动并完成核心验收`
- 自动化门禁：`通过`
- License：`Private License`

## 3. 已交付范围

### 3.1 用户端

- 登录 / 注册 / 刷新鉴权
- 仪表板
- 题库 / 题目详情 / 解题 IDE
- 提交创建 / 提交历史 / 提交详情
- 排行榜
- 搜索
- 博客列表 / 新建 / 编辑
- 私信
- 竞赛列表 / 详情 / 榜单
- 个人资料 / 设置

### 3.2 教师端

- 班级列表与统计
- 建班
- 按邮箱添加学生
- 批量导入学生
- 创建作业
- 删除作业
- 教师竞赛向导
- 作业报告页

### 3.3 管理端

- 管理总览
- 用户管理
- 批量建号（`user_code`）
- 角色调整 / 状态切换
- 题目管理 CRUD
- 题面配置
- 测试数据管理
- 相似度扫描配置
- 抄袭报告列表 / 详情

### 3.4 后端与运行组件

- API 服务
- PostgreSQL
- Redis
- judge-worker
- WebSocket 主链路
- Docker Compose 本地交付环境

## 4. 身份与数据约束

- 系统内部主键 `user_id` 继续使用 `UUID`
- 后台批量建号使用 `user_code`
- `user_code` 为 12 位纯数字业务号
- 内部 `UUID` 用于：
  - 数据库主外键
  - JWT `sub`
  - 通知 / 消息 / 提交 / 排行榜等内部关联

## 5. 当前验收结果

### 5.1 后端

- `cargo check -p api`：通过
- `cargo test -p api --no-run`：通过

### 5.2 judge-worker

- `cargo check -p judge-worker`：通过
- `cargo test -p judge-worker --no-run`：通过

说明：

- `judge-worker` 已完成最小 seccomp 硬化
- Linux 运行时默认启用 `PR_SET_NO_NEW_PRIVS`
- 可通过 `JUDGE_SECCOMP_MODE=strict` 开启更严格模式

### 5.3 前端

- `npm run typecheck --silent`：通过
- `npm run build --silent`：通过
- `Playwright smoke`：`6 passed`

## 6. 交付文档清单

以下文件构成当前交付包的正式文档集合：

- [docs/RELEASE_RUNBOOK_2026-03-06.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/RELEASE_RUNBOOK_2026-03-06.md)
- [docs/PROJECT_HANDBOOK_2026-03-07.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/PROJECT_HANDBOOK_2026-03-07.md)
- [docs/RELEASE_SCOPE_2026-03-06.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/RELEASE_SCOPE_2026-03-06.md)
- [docs/RELEASE_DECISION_RECORD_2026-03-06.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/RELEASE_DECISION_RECORD_2026-03-06.md)
- [docs/ACCEPTANCE_CHECKLIST_2026-03-06.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/ACCEPTANCE_CHECKLIST_2026-03-06.md)
- [docs/CONTRACT_ALIGNMENT_2026-03-06.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/CONTRACT_ALIGNMENT_2026-03-06.md)
- [docs/DELIVERY_GAP_REGISTER_2026-03-07.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/DELIVERY_GAP_REGISTER_2026-03-07.md)
- [docs/REFERENCE_DYNAMICIZATION_MATRIX_2026-03-07.md](/Users/xiexingyu/Documents/项目/Online_Judge/docs/REFERENCE_DYNAMICIZATION_MATRIX_2026-03-07.md)

## 7. 当前已知事项

以下事项存在，但不阻塞本阶段交付：

1. 仍有部分 reference 变体未一一拆成独立页面，当前以合并后的真实动态页交付。
2. `api` 与 `judge-worker` 仍有 warning，需要后续工程降噪。
3. 前端仍有大 chunk 告警，需要后续性能优化。
4. `admin/problems` 当前采用共享 `/problems` 合同提供 CRUD，而非独立 admin namespace。

## 8. 交付判断

按当前仓库代码、门禁结果、运行态和文档状态判断：

- 可以进入正式交付
- 可以用于上线前演练与交接
- 后续工作应进入优化与维护阶段，而不是继续以“交付未完成”口径处理

## 9. 许可证

本项目采用 `Private License`。

详细条款见：

- [LICENSE](/Users/xiexingyu/Documents/项目/Online_Judge/LICENSE)
