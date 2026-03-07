# 发布与回滚 Runbook（2026-03-06）

## 1. 发布前检查

1. 后端健康检查通过：`GET /health`、`GET /status`。
2. 数据库迁移版本确认（生产与目标版本一致）。
3. 关键自动化通过：
   - 前端单测（至少服务层关键用例 + 核心冒烟流）
   - 主链路冒烟（登录 -> 题目 -> 提交 -> 结果）
4. 契约对齐清单确认：`docs/CONTRACT_ALIGNMENT_2026-03-06.md`。
5. 环境变量核对：
   - API Base URL
   - JWT Secret
   - Redis/DB 连接
   - CORS 允许来源
6. 本地全栈验收前执行演示数据引导：
   - `DATABASE_URL=<db_url> ./scripts/bootstrap_demo.sh`

## 2. 发布步骤（建议）

1. 冻结发布窗口，停止非发布变更合入。
2. 备份数据库（全量 + 最近增量日志）。
3. 部署后端 API 新版本。
4. 执行数据库迁移（如有）。
5. 部署 judge-worker 新版本。
6. 部署前端静态资源。
7. 执行发布后验证：
   - 登录成功
   - `/leaderboard/global` 与 `/leaderboard/user/:id/stats` 返回 `200`
   - 题目列表/详情可访问
   - 提交状态能从 pending 走到终态
   - 讨论/博客创建与点赞可用
   - `/blog` 与 `/blog/new` 可访问，编辑页不出现空白屏
   - 搜索返回真实题目/讨论结果
   - 私信会话列表与消息发送可用
   - 反作弊配置、触发扫描、报告查看可用
   - 管理端用户列表、批量建号可用
   - 管理端题目页为只读视图，不暴露不存在的 CRUD 动作
8. 监控 30 分钟：
   - 5xx 错误率
   - 提交积压
   - 接口 P95 延迟

## 2.1 发布前命令清单（本仓库）

```bash
# backend compile gate
~/.cargo/bin/cargo check -p api
~/.cargo/bin/cargo test -p api --no-run

# frontend quality gates
cd frontend
npm ci
npm run lint
npm run typecheck
npm run build

# frontend smoke set
npx vitest --run \
  src/services/__tests__/communityApi.test.ts \
  src/services/__tests__/classes.test.ts \
  src/services/__tests__/messages.test.ts \
  src/services/__tests__/plagiarism.test.ts \
  src/services/__tests__/searchApi.test.ts \
  src/services/__tests__/smokeCoreFlows.test.ts

# playwright smoke inventory
npx playwright install chromium
npx playwright test --list
npx playwright test e2e/smoke.spec.ts
```

## 2.2 数据迁移顺序（本次涉及）

按版本顺序执行：

1. `api/migrations/017_create_direct_messages.sql`
2. `api/migrations/018_create_plagiarism_scan.sql`
3. `api/migrations/020_create_contest_participants.sql`
4. `api/migrations/021_add_user_code_and_status.sql`

若使用 `sqlx migrate`：

```bash
cd api
DATABASE_URL=<prod_database_url> ~/.cargo/bin/sqlx migrate run
```

若是本地 Docker 全栈验收：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
./scripts/bootstrap_demo.sh
```

## 2.3 上线开关策略

- 默认开启：
  - `VITE_ENABLE_DIRECT_MESSAGES=true`
  - `VITE_ENABLE_PLAGIARISM=true`
- 紧急降级：
  - `VITE_ENABLE_DIRECT_MESSAGES=false`
  - `VITE_ENABLE_PLAGIARISM=false`

## 2.4 身份标识约束

- 当前系统内部主键 `user_id` 为 `UUID`，用于：
  - 数据库主外键
  - JWT `sub`
  - WebSocket/通知/消息/提交等内部关联
- 不应将内部 `user_id` 直接改成业务编码字符串。
- 如果需要引入类似 `240101070014` 的 12 位业务号，应采用：
  - 外部业务号字段，例如 `user_code`
  - 或受约束的 `username`
  - 内部 `UUID` 继续保留为真实主键
- 当前接口示例：
  - `GET /leaderboard/user/11111111-1111-1111-1111-111111111111/stats`
- 管理端批量建号约束：
  - 输入业务号字段 `user_code`
  - `user_code` 必须为 12 位纯数字，例如 `240101070014`
  - 系统自动生成内部 `UUID`
  - 推荐在后台录入格式中使用：`user_code,display_name,email,role`

## 2.5 当前受控降级边界

- `admin/problems`
  - 当前交付口径为只读运营视图
  - 不提供独立 `/admin/problems` 写接口，也不暴露伪 CRUD 控件
- `teacher` 高级写路径
  - `classes/enroll`、`assignments/:id/publish` 等当前 schema 不支持的动作维持 `501`
  - 前端仅保留说明性入口，不应将其作为可用能力验收
- 博客编辑器
  - 当前采用稳定的 textarea + preview 实现
  - 目标是避免运行态空白页，优先保证发布稳定性而非富文本框架复杂能力

## 3. 回滚条件

满足任一条件触发回滚：

- 主链路不可用超过 5 分钟。
- 5xx 错误率持续超过阈值（例如 > 2%）。
- 判题队列持续增长且无消费。
- 登录或鉴权出现系统性失败。

## 4. 回滚步骤

1. 前端回滚到上一稳定静态版本。
2. 后端 API 切回上一稳定镜像。
3. judge-worker 切回上一稳定镜像。
4. 若迁移不可逆，执行预先准备的数据回滚方案（恢复备份或执行补偿脚本）。
5. 回滚后执行最小验证：
   - 登录
   - 题目列表
   - 提交查询
   - 私信会话列表
   - 反作弊配置页
   - 搜索页

## 4.1 本地 Docker 验收命令

```bash
docker compose up -d postgres redis

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_judge \
./scripts/bootstrap_demo.sh

docker compose up -d api judge-worker frontend

curl http://localhost:3000/health
curl http://localhost:3000/status
curl http://localhost:3000/leaderboard/global -H "Authorization: Bearer <token>"

cd frontend
npx playwright test
```

## 5. 发布后记录

1. 记录发布版本号、时间、操作者。
2. 记录异常与处置时间线。
3. 更新 backlog 中对应阶段状态与阻塞项。

## 6. 关联文档

- 发布范围：`docs/RELEASE_SCOPE_2026-03-06.md`
- 豁免清单：`docs/WAIVER_LIST_2026-03-06.md`
- 交付包结构：`docs/DELIVERY_PACKAGE_STRUCTURE_2026-03-06.md`
- 验收清单：`docs/ACCEPTANCE_CHECKLIST_2026-03-06.md`
