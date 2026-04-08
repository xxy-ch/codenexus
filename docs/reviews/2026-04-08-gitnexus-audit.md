# Online Judge GitNexus 审查记录

## 1. 审查信息

- 日期：2026-04-08
- 方法：GitNexus CLI + 源码阅读
- 索引状态：`npx gitnexus status` 显示 `.gitnexus` 与当前提交 `6b39f18` 一致
- 目标：记录当前仓库的高风险缺陷与架构偏离点，供后续修复与范围确认

## 2. 本次重点关注链路

1. 认证、鉴权、租户隔离
2. 题目与测试用例管理
3. 提交创建、Redis 队列、judge-worker 回写结果
4. 判题执行隔离

## 3. 关键缺陷

### P0. 判题结果回写接口既不可达又可伪造

- 位置：
  - [api/src/submissions/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/submissions/routes.rs)
  - [api/src/main.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs)
  - [judge-worker/src/main.rs](/Users/xiexingyu/Documents/项目/Online_Judge/judge-worker/src/main.rs)
- 现状：
  - `/submissions/:id/results` 被挂在受 `auth_middleware` 和 `tenant_middleware` 保护的统一 `/submissions` 路由下。
  - `judge-worker` 回写结果时未发送任何 Bearer token。
  - `update_judge_result` 本身也没有 worker 级认证、签名校验或 path/body 一致性校验。
- 风险：
  - 正常 worker 回写会被 `401` 拒绝，消息不会 ack，提交链路无法稳定收敛到终态。
  - 任意已登录用户都可以直接 POST 该接口，伪造任意 submission 的判题结果。
- 建议：
  - 将 worker 回写接口拆到独立服务间认证入口。
  - 禁止终端用户 JWT 访问该接口。
  - 校验 path 中的 `id` 与 body 中的 `submission_id` 一致。

### P0. 隐藏测试用例直接对普通用户暴露

- 位置：
  - [api/src/problems/test_cases.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/problems/test_cases.rs)
  - [frontend/src/services/problems.ts](/Users/xiexingyu/Documents/项目/Online_Judge/frontend/src/services/problems.ts)
- 现状：
  - `list_test_cases` 直接返回 `input`、`expected_output`、`is_hidden`。
  - 前端 `problemsService.getTestCases()` 也按完整测试用例模型消费这些字段。
  - 同文件中的创建、更新、删除、批量导入接口都只有登录校验，没有作者、管理员或租户约束。
- 风险：
  - 隐藏样例和标准答案泄露，直接破坏判题有效性。
  - 任意登录用户可修改测试数据，影响题目结果可信度。
- 建议：
  - 对普通用户返回公开 DTO，不暴露隐藏样例内容。
  - 管理测试数据的写接口接入 RBAC 和归属校验。

### P1. 题目管理缺少 RBAC 和租户约束

- 位置：
  - [api/src/problems/routes.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/problems/routes.rs)
  - [api/src/problems/mod.rs](/Users/xiexingyu/Documents/项目/Online_Judge/api/src/problems/mod.rs)
- 现状：
  - `PUT /problems/languages` 只要求登录。
  - `create_problem` 直接信任请求体中的 `organization_id`。
  - `update_problem`、`delete_problem` 不校验作者、管理员身份或租户范围。
- 风险：
  - 任意登录用户可修改全局语言配置。
  - 任意登录用户可向任意组织写题、修改题、删题。
- 建议：
  - `organization_id` 应从 `Claims` 或 `TenantContext` 派生，不能由客户端自由提交。
  - 对语言配置、题目 CRUD、测试数据维护统一接入权限与租户校验。

### P1. 判题沙箱实现未真正接入主执行链路

- 位置：
  - [judge-worker/src/processor/service.rs](/Users/xiexingyu/Documents/项目/Online_Judge/judge-worker/src/processor/service.rs)
  - [judge-worker/src/sandbox/seccomp.rs](/Users/xiexingyu/Documents/项目/Online_Judge/judge-worker/src/sandbox/seccomp.rs)
  - [judge-worker/src/sandbox/mod.rs](/Users/xiexingyu/Documents/项目/Online_Judge/judge-worker/src/sandbox/mod.rs)
- 现状：
  - 实际执行路径只在 `pre_exec` 中调用 `apply_seccomp`。
  - 默认模式只设置 `PR_SET_NO_NEW_PRIVS`，不会启用严格 seccomp。
  - `chroot` / `cgroup` 方案存在于仓库中，但没有接入 `process_submission -> execute_program` 主链路。
- 风险：
  - 不可信代码基本仍在宿主执行上下文中运行。
  - 当前“最小 seccomp 硬化”更接近声明性能力，而不是完整隔离边界。
- 建议：
  - 明确当前是否只支持受控内网演示环境。
  - 若作为真实 OJ 交付，应将 chroot/cgroup/seccomp 的统一执行器接入主流程，并补充失败策略与观测。

## 4. 架构偏离点

### 4.1 文档目标态与运行时实现不一致

- 交付文档将系统描述为已形成“真实运行合同”和“受控可交付版本”。
- 代码中大量权限与隔离能力虽然“存在”，但没有真正挂到路由或执行主链路。

### 4.2 角色模型出现双轨

- 文档和 `shared` 层有较完整的 `Role` / `Permission` / `RBAC` 设计。
- 实际 `users/service.rs` 在登录后把数据库角色压缩成 `admin` / `teacher` / `user` 三类字符串写入 JWT。
- 多数业务路由再直接比较 `claims.role == "admin"` 或仅依赖“已登录”。

### 4.3 租户模型存在，但多为声明式

- `tenant_middleware` 会把 `Claims.school_id` 或 `X-Tenant-ID` 写入 `TenantContext`。
- 但实际业务 service 大量 SQL 没有消费 `TenantContext`，也没有把租户作为强约束条件。

## 5. 后续确认建议

建议先由产品/架构层确认以下三件事，再开始修复：

1. 这个仓库当前目标是“演示可交付”还是“真实生产可隔离 OJ”。
2. 运行时权威角色模型到底是：
   - `root / organizationadmin / campusadmin / teacher / ta / student`
   - 还是 `admin / teacher / user`
3. 题目、测试数据、班级、判题配置这些写操作的租户边界应该以谁为准：
   - 当前登录用户的组织/校区
   - 资源所属组织/校区
   - 还是管理员全局权限

## 6. 本次未做的事

- 未修改业务代码
- 未提交 commit
- 未对全部页面做逐页 UI 验证
- 未对数据库真实数据做渗透式权限测试
