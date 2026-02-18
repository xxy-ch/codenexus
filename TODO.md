# Online Judge 开发路线图

## 项目当前状态: MVP v1.0.0
- 已实现基础架构 (Rust + Axum + React)
- 核心功能完成度: ~19%
- 严重缺陷: 3个
- 安全漏洞: 1个

---

## Phase 0: 紧急修复 (P0 - 1-2天)

### 0.1 修复JWT验证安全漏洞 ⚠️ **CRITICAL**
- [ ] 修复 `users/routes.rs` 中的token验证逻辑
- [ ] 修复 `submissions/routes.rs` 中的token验证逻辑
- [ ] 使用 `jwt_service.validate_token()` 替代简单的UUID解析
- [ ] 添加token过期检查
- [ ] 添加单元测试验证修复

**文件**: `api/src/users/routes.rs`, `api/src/submissions/routes.rs`

### 0.2 修复题目创建者ID缺陷
- [ ] 修复 `problems/routes.rs:30` 的 `created_by` 字段
- [ ] 从JWT Claims中提取user_id
- [ ] 添加测试验证创建者ID正确

**文件**: `api/src/problems/routes.rs`

### 0.3 统一认证中间件
- [ ] 创建统一的JWT认证中间件
- [ ] 替换所有手动的token解析逻辑
- [ ] 添加Claims提取器

**文件**: `api/src/middleware/auth.rs`

---

## Phase 1: 判题系统核心 (P0 - 5-7天)

### 1.1 实现消息队列集成
- [ ] 配置Redis Stream作为消息队列
- [ ] 实现提交队列生产者 (API端)
- [ ] 实现提交队列消费者 (judge-worker端)
- [ ] 添加队列错误处理和重试机制
- [ ] 实现消息确认机制

**文件**:
- `api/src/submissions/service.rs`
- `judge-worker/src/queue/mod.rs`
- `judge-worker/src/queue/producer.rs`
- `judge-worker/src/queue/consumer.rs`

### 1.2 实现Judge-Worker主循环
- [ ] 实现 `main.rs` 中的主事件循环
- [ ] 从队列消费提交任务
- [ ] 调用编译器编译代码
- [ ] 在沙箱中执行代码
- [ ] 运行测试用例
- [ ] 收集执行结果
- [ ] 回调API更新提交状态

**文件**: `judge-worker/src/main.rs`, `judge-worker/src/processor/main.rs`

### 1.3 实现判题结果回调
- [ ] 创建API端点接收判题结果
- [ ] 实现测试用例结果存储
- [ ] 更新提交状态和分数
- [ ] 计算运行时间和内存使用
- [ ] 添加错误处理

**文件**: `api/src/submissions/service.rs`, `api/src/submissions/routes.rs`

### 1.4 测试用例管理API
- [ ] `GET /problems/:id/test-cases` - 获取测试用例
- [ ] `POST /problems/:id/test-cases` - 添加测试用例
- [ ] `PATCH /problems/:id/test-cases/:case_id` - 更新测试用例
- [ ] `DELETE /problems/:id/test-cases/:case_id` - 删除测试用例
- [ ] `POST /problems/:id/test-cases/batch` - 批量导入
- [ ] 添加示例输入输出隐藏逻辑

**文件**: `api/src/problems/test_cases.rs` (新建)

### 1.5 前端提交页面集成
- [ ] 实现代码编辑器
- [ ] 实现提交功能
- [ ] 实现实时状态更新 (轮询或WebSocket)
- [ ] 显示测试用例结果
- [ ] 显示资源使用情况

**文件**: `frontend/src/pages/user/SolveProblem.tsx`

---

## Phase 2: 竞赛系统 (P1 - 7-10天)

### 2.1 竞赛基础API
- [ ] `GET /contests` - 获取竞赛列表 (支持分页、过滤)
- [ ] `POST /contests` - 创建竞赛
- [ ] `GET /contests/:id` - 获取竞赛详情
- [ ] `PATCH /contests/:id` - 更新竞赛
- [ ] `DELETE /contests/:id` - 删除竞赛
- [ ] 添加竞赛时间验证 (开始时间、结束时间)

**文件**: `api/src/contests/mod.rs` (新建), `api/src/contests/routes.rs`

### 2.2 竞赛题目管理
- [ ] `POST /contests/:id/problems` - 添加题目到竞赛
- [ ] `DELETE /contests/:id/problems/:problem_id` - 移除题目
- [ ] `GET /contests/:id/problems` - 获取竞赛题目列表
- [ ] 实现题目顺序和分数配置

**文件**: `api/src/contests/problems.rs`

### 2.3 竞赛排行榜
- [ ] `GET /contests/:id/rankings` - 获取排行榜
- [ ] 实现ACM规则排名
- [ ] 实现IOI规则排名
- [ ] 实现封榜功能 (freeze_minutes)
- [ ] 添加缓存优化

**文件**: `api/src/contests/rankings.rs`

### 2.4 竞赛提交
- [ ] `GET /contests/:id/submissions` - 获取竞赛提交
- [ ] 在提交中关联contest_id
- [ ] 实现竞赛专用提交统计

**文件**: `api/src/contests/submissions.rs`

### 2.5 前端竞赛界面
- [ ] 竞赛列表页面
- [ ] 竞赛详情页面
- [ ] 竞赛排行榜组件
- [ ] 实时排行榜更新

**文件**: `frontend/src/pages/user/ContestList.tsx`, `frontend/src/pages/user/ContestDetail.tsx`

---

## Phase 3: 教学系统 (P1 - 5-7天)

### 3.1 机构与校区管理
- [ ] `GET /organizations` - 获取机构列表
- [ ] `POST /organizations` - 创建机构
- [ ] `GET /organizations/:id` - 获取机构详情
- [ ] `PATCH /organizations/:id` - 更新机构
- [ ] `DELETE /organizations/:id` - 删除机构
- [ ] `GET /campuses` - 获取校区列表
- [ ] `POST /campuses` - 创建校区
- [ ] 其他CRUD操作

**文件**: `api/src/organizations/mod.rs` (新建), `api/src/campuses/mod.rs` (新建)

### 3.2 班级管理
- [ ] `GET /classes` - 获取班级列表
- [ ] `POST /classes` - 创建班级
- [ ] `GET /classes/:id` - 获取班级详情
- [ ] `PATCH /classes/:id` - 更新班级
- [ ] `DELETE /classes/:id` - 删除班级
- [ ] `POST /classes/:id/enroll` - 学生加入班级
- [ ] `DELETE /classes/:id/enroll/:user_id` - 退出班级
- [ ] `GET /classes/:id/students` - 获取学生列表

**文件**: `api/src/classes/mod.rs` (新建)

### 3.3 作业系统
- [ ] `GET /assignments` - 获取作业列表
- [ ] `POST /assignments` - 创建作业
- [ ] `GET /assignments/:id` - 获取作业详情
- [ ] `PATCH /assignments/:id` - 更新作业
- [ ] `DELETE /assignments/:id` - 删除作业
- [ ] `GET /classes/:class_id/assignments` - 获取班级作业
- [ ] 实现作业截止时间管理

**文件**: `api/src/assignments/mod.rs` (新建)

### 3.4 前端教学界面
- [ ] 班级管理页面
- [ ] 作业管理页面
- [ ] 学生作业提交查看

**文件**: `frontend/src/pages/teacher/ClassManagement.tsx`

---

## Phase 4: 社区功能 (P2 - 5-7天)

### 4.1 讨论区API
- [ ] `GET /discussions` - 获取讨论列表
- [ ] `POST /discussions` - 创建讨论
- [ ] `GET /discussions/:id` - 获取讨论详情
- [ ] `PATCH /discussions/:id` - 更新讨论
- [ ] `DELETE /discussions/:id` - 删除讨论
- [ ] `POST /discussions/:id/reply` - 回复讨论
- [ ] `GET /problems/:problem_id/discussions` - 获取题目讨论
- [ ] 实现点赞和置顶功能

**文件**: `api/src/discussions/mod.rs` (新建)

### 4.2 前端讨论区
- [ ] 讨论列表组件
- [ ] 讨论详情组件
- [ ] 评论和回复功能
- [ ] Markdown编辑器

**文件**: `frontend/src/components/discussions/DiscussionList.tsx`

### 4.3 排行榜系统
- [ ] `GET /rankings` - 全局排行榜
- [ ] `GET /rankings/contests/:id` - 竞赛排行榜
- [ ] `GET /rankings/problems/:id` - 题目最快解题
- [ ] 实现排行榜缓存

**文件**: `api/src/rankings/mod.rs` (新建)

---

## Phase 5: 增强功能 (P2 - 5-7天)

### 5.1 作弊检测
- [ ] 实现代码相似度检测算法
- [ ] `POST /submissions/:id/check-plagiarism` - 触发检测
- [ ] `GET /plagiarism-reports` - 获取报告列表
- [ ] `GET /plagiarism-reports/:id` - 获取报告详情
- [ ] 实现报告审核功能

**文件**: `api/src/plagiarism/mod.rs` (新建)

### 5.2 实时通知
- [ ] 实现WebSocket连接
- [ ] 判题完成通知
- [ ] 讨论回复通知
- [ ] 竞赛状态通知

**文件**: `api/src/websocket/mod.rs` (新建)

### 5.3 数据统计与分析
- [ ] 用户学习统计
- [ ] 题目难度分布
- [ ] 提交趋势分析
- [ ] 班级教学报告

**文件**: `api/src/analytics/mod.rs` (新建)

---

## Phase 6: 优化与改进 (P3 - 持续进行)

### 6.1 性能优化
- [ ] 添加Redis缓存层
- [ ] 数据库查询优化
- [ ] API响应压缩
- [ ] 静态资源CDN

### 6.2 安全加固
- [ ] 添加速率限制
- [ ] SQL注入防护验证
- [ ] XSS防护
- [ ] CSRF令牌
- [ ] 敏感操作审计日志

### 6.3 代码质量
- [ ] 统一错误处理机制
- [ ] 添加结构化日志
- [ ] 添加请求追踪ID
- [ ] 单元测试覆盖 (目标80%+)
- [ ] 集成测试
- [ ] E2E测试

### 6.4 文档完善
- [ ] API文档 (OpenAPI/Swagger)
- [ ] 部署文档
- [ ] 开发者指南
- [ ] 用户手册

### 6.5 DevOps改进
- [ ] CI/CD流程
- [ ] Docker Compose优化
- [ ] 健康检查完善
- [ ] 监控和告警
- [ ] 备份策略

---

## Phase 7: 清理与技术债 (P3 - 2-3天)

### 7.1 数据库迁移清理
- [ ] 合并重复的迁移文件
- [ ] 验证所有迁移正确执行
- [ ] 添加回滚迁移

### 7.2 代码重构
- [ ] 统一命名规范
- [ ] 提取公共模块
- [ ] 减少代码重复
- [ ] 改进类型安全

### 7.3 配置管理
- [ ] 创建配置结构体
- [ ] 环境变量验证
- [ ] 移除硬编码值
- [ ] 多环境配置支持

---

## 里程碑

- **v1.0.1** - Phase 0完成 (紧急修复)
- **v1.1.0** - Phase 1完成 (判题系统可用)
- **v1.2.0** - Phase 2完成 (竞赛系统上线)
- **v1.3.0** - Phase 3完成 (教学系统上线)
- **v1.4.0** - Phase 4完成 (社区功能上线)
- **v2.0.0** - Phase 5-6完成 (功能增强与优化)
- **v2.1.0** - Phase 7完成 (技术债清理)

---

## 开发规范

### 提交规范
- feat: 新功能
- fix: 修复bug
- refactor: 重构
- docs: 文档
- test: 测试
- chore: 构建/工具

### 分支策略
- `master` - 生产环境
- `develop` - 开发主分支
- `feature/xxx` - 功能分支
- `hotfix/xxx` - 紧急修复分支

### 代码审查
- 所有PR需要至少一人审查
- 运行测试通过
- 代码格式检查通过
- 无clippy警告

---

## 最后更新
- 日期: 2025-02-18
- 版本: v1.0.0
- 状态: Phase 0 待开始
