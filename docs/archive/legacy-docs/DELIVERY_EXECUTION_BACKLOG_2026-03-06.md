# 交付执行 Backlog（按天 + 文件级，2026-03-06）

基于 `docs/archive/legacy-docs/REFERENCE_DRIVEN_WEB_PLAN_2026-03-06.md`，本文件用于直接执行。

## 0. 执行节奏

- 周期：2026-03-07 至 2026-03-27
- 方式：每天产出可验证结果（页面、接口、测试、文档）
- 规则：未通过当天 DoD 不进入下一天

## 当前执行进度（更新于 2026-03-06）

- Day 1：已完成（公开/受保护路由分层，鉴权作用域修复）
- Day 2：已完成（核心路径对齐：leaderboard、community、auth）
- Day 3：进行中（已去除首批静默 mock fallback，blog/discussion 点赞与父级字段兼容修复）
- Day 4：进行中（ProblemSet 动态化、Dashboard 数据映射、ContestScoreboard 已上线）
- Day 5：进行中（Submission 页数据标准化 + 社区详情页交互修复）
- Day 6：进行中（博客流接口字段映射、排序/标签筛选修复）
- Day 8-10：进行中（Teacher 页面骨架已接入真实 `classes` 列表，补齐班级统计映射）
- Day 11-12：进行中（新增 Admin 判题设置页与题面配置页，已接入 `/problems/*` 配置接口）
- Day 13：已完成（Direct Messages 前后端路由与数据迁移已补齐）
- Day 14-15：已完成（相似度配置、抄袭报告前后端路由与数据迁移已补齐）
- Day 16：进行中（新增博客编辑页并打通 `/blog/:slug/edit`，讨论串补齐回复点赞交互）
- Day 17：进行中（Profile/Settings 账户信息改为真实 `users/me` 读取与保存）
- Day 18-19：进行中（新增 service 单测：communityApi/classes；Vitest 配置错误已修复）
- Day 20：进行中（新增契约对齐文档与发布回滚 runbook）
- Day 21：进行中（新增封板验收清单、演示脚本、缺陷清零看板）
- Day 21：已完成（私信/反作弊入口已接入 feature flag，默认开启且可降级关闭）
- Day 21：已完成（发布决策记录已更新为“全量上线”策略）
- Day 21：已完成（发布范围/豁免清单/交付包结构文档已同步）

## 1. Day-by-Day 计划

### Day 1（2026-03-07）鉴权与路由基线修复

- 任务：
  - 调整后端公开路由与受保护路由分层。
  - 确保 `/auth/login`、`/auth/register` 不被全局鉴权拦截。
- 主要文件：
  - `api/src/main.rs`
  - `api/src/middleware/auth.rs`
  - `api/src/auth/routes.rs`
- DoD：
  - 登录/注册接口可匿名访问。
  - 用户接口仍需要 Bearer Token。

### Day 2（2026-03-08）前后端接口路径对齐

- 任务：
  - 统一 `ranking/leaderboard` 路径策略。
  - 统一社区、搜索、提交等 service 路径前缀。
- 主要文件：
  - `frontend/src/services/ranking.ts`
  - `frontend/src/services/communityApi.ts`
  - `frontend/src/services/searchApi.ts`
  - `frontend/src/services/contests.ts`
  - `api/src/leaderboard/routes.rs`
  - `api/src/search/routes.rs`
- DoD：
  - 主导航页面不出现接口 404（路径错配）。

### Day 3（2026-03-09）Mock 回退治理

- 任务：
  - 清理“失败自动 fallback mock”逻辑。
  - 保留环境开关，但失败要显式报错。
- 主要文件：
  - `frontend/src/services/problems.ts`
  - `frontend/src/services/contests.ts`
  - `frontend/src/services/ranking.ts`
  - `frontend/src/services/discussions.ts`
  - `frontend/src/services/blog.ts`
  - `frontend/src/services/admin.ts`
  - `frontend/src/services/config.ts`
- DoD：
  - 关闭 mock 时，服务层仅返回真实 API 结果或明确错误。

### Day 4（2026-03-10）Dashboard/Problem Repository 对齐

- 任务：
  - 对齐 `modular_homepage_dashboard_*` 和 `problem_repository` 设计。
  - 完成指标卡、筛选器、分页交互。
- 主要文件：
  - `frontend/src/pages/user/DashboardEnhanced.tsx`
  - `frontend/src/pages/user/ProblemSet.tsx`
  - `frontend/src/components/problems/ProblemFilters.tsx`
  - `frontend/src/components/problems/ProblemTable.tsx`
- DoD：
  - Dashboard 与题库页面的核心交互可用且数据真实。

### Day 5（2026-03-11）IDE 与提交页面对齐

- 任务：
  - 对齐 `problem_solving_ide`、`submission_history`、`submission_detail_analysis` 设计。
  - 统一状态展示和错误信息。
- 主要文件：
  - `frontend/src/pages/user/ProblemIDEEnhanced.tsx`
  - `frontend/src/components/ide/IDELayout.tsx`
  - `frontend/src/components/ide/SubmissionResult.tsx`
  - `frontend/src/pages/user/SubmissionHistory.tsx`
  - `frontend/src/pages/user/SubmissionDetail.tsx`
- DoD：
  - 提交后可看到状态流转与详情分析。

### Day 6（2026-03-12）排行与博客流对齐

- 任务：
  - 对齐 `global_user_rankings` 与 `community_blog_feed`。
- 主要文件：
  - `frontend/src/pages/user/Ranking.tsx`
  - `frontend/src/pages/community/BlogList.tsx`
  - `frontend/src/services/ranking.ts`
  - `frontend/src/services/blog.ts`
- DoD：
  - 排行与博客页面支持筛选、分页、空态。

### Day 7（2026-03-13）新增实时榜单页

- 任务：
  - 新增 `live_contest_scoreboard_board` 对应页面。
- 新增文件（建议）：
  - `frontend/src/pages/contest/ContestScoreboard.tsx`
  - `frontend/src/components/contest/ScoreboardTable.tsx`
  - `frontend/src/services/scoreboard.ts`
- 关联改动：
  - `frontend/src/App.tsx`（新增路由）
  - `api/src/contests/routes.rs`（若缺接口则补）
- DoD：
  - 竞赛榜单页面可访问并实时/准实时更新。

### Day 8-9（2026-03-14 ~ 2026-03-15）教师场景页面 1

- 任务：
  - 落地 `teacher_class_management_6`（班级管理）。
  - 落地 `teacher_class_management_2`（竞赛创建向导）。
- 新增文件（建议）：
  - `frontend/src/pages/teacher/ClassManagement.tsx`
  - `frontend/src/pages/teacher/ContestWizard.tsx`
  - `frontend/src/services/classes.ts`
  - `frontend/src/services/teacherContests.ts`
- 关联后端：
  - `api/src/classes/routes.rs`
  - `api/src/contests/routes.rs`
- DoD：
  - 教师可创建班级并发起竞赛流程。

### Day 10（2026-03-16）教师场景页面 2

- 任务：
  - 落地 `teacher_class_management_3`（作业表现分析）。
  - 落地 `teacher_class_management_5`（学习路线图）。
- 新增文件（建议）：
  - `frontend/src/pages/teacher/AssignmentReport.tsx`
  - `frontend/src/pages/user/LearningRoadmap.tsx`
- 关联后端：
  - `api/src/classes/service.rs`
  - `api/src/submissions/service.rs`
- DoD：
  - 报表页面与路线图页面可展示真实统计数据。

### Day 11（2026-03-17）管理员增强页面

- 任务：
  - 对齐 `admin_dashboard_overview`、`admin_user_management`、`admin_problem_management`。
- 主要文件：
  - `frontend/src/pages/admin/AdminDashboard.tsx`
  - `frontend/src/pages/admin/UserManagement.tsx`
  - `frontend/src/pages/admin/ProblemManagement.tsx`
  - `frontend/src/services/admin.ts`
- DoD：
  - 管理页支持筛选、分页、批量操作、状态修改。

### Day 12（2026-03-18）判题设置与测试数据页

- 任务：
  - 落地 `test_data_&_judge_settings` 与 `problem_content_configuration` 的配置能力。
- 新增文件（建议）：
  - `frontend/src/pages/admin/JudgeSettings.tsx`
  - `frontend/src/pages/admin/ProblemContentConfig.tsx`
  - `frontend/src/services/judgeConfig.ts`
- 关联后端：
  - `api/src/problems/test_cases.rs`
  - `api/src/problems/routes.rs`
- DoD：
  - 测试用例配置可增删改查并生效。

### Day 13（2026-03-19）私信系统页面

- 任务：
  - 落地 `direct_messages` 页面（会话列表 + 会话详情）。
- 新增文件（建议）：
  - `frontend/src/pages/community/DirectMessages.tsx`
  - `frontend/src/components/messages/ConversationList.tsx`
  - `frontend/src/components/messages/MessageThread.tsx`
  - `frontend/src/services/messages.ts`
- DoD：
  - 可查看会话、发送消息、刷新消息列表。

### Day 14-15（2026-03-20 ~ 2026-03-21）反作弊配置与报告

- 任务：
  - 落地 `code_similarity_scan_config`。
  - 落地 `plagiarism_detection_report_*` 报告视图。
- 新增文件（建议）：
  - `frontend/src/pages/admin/SimilarityScanConfig.tsx`
  - `frontend/src/pages/admin/PlagiarismReportList.tsx`
  - `frontend/src/pages/admin/PlagiarismReportDetail.tsx`
  - `frontend/src/services/plagiarism.ts`
- 关联后端（建议新增模块）：
  - `api/src/plagiarism/mod.rs`
  - `api/src/plagiarism/routes.rs`
  - `api/src/plagiarism/service.rs`
- DoD：
  - 管理员可配置扫描参数并查看报告详情。

### Day 16（2026-03-22）文章编辑与讨论串深化

- 任务：
  - 对齐 `blog_article_editor` 与 `teacher_class_management_4`。
- 主要文件：
  - `frontend/src/pages/community/CreateArticle.tsx`
  - `frontend/src/components/editor/MarkdownEditor.tsx`
  - `frontend/src/pages/community/DiscussionDetail.tsx`
- DoD：
  - 编辑器支持草稿、预览、发布；讨论串交互完整。

### Day 17（2026-03-23）用户档案/设置统一

- 任务：
  - 对齐 `user_settings_&_profile` 设计与交互。
- 主要文件：
  - `frontend/src/pages/user/Profile.tsx`
  - `frontend/src/pages/user/Settings.tsx`
- DoD：
  - 资料编辑、偏好设置、保存反馈完整可用。

### Day 18-19（2026-03-24 ~ 2026-03-25）自动化测试补齐

- 任务：
  - 增加关键流 E2E 冒烟。
  - 增加关键 service 单测。
- 主要文件：
  - `frontend/playwright.config.ts`
  - `frontend/src/test/*`
  - `api/tests/integration/*`
  - `judge-worker/tests/*`
- DoD：
  - 至少 5 条关键链路自动化通过。

### Day 20（2026-03-26）契约与发布准备

- 任务：
  - OpenAPI/前端类型对齐。
  - 更新发布文档与回滚文档。
- 主要文件：
  - `api/src/main.rs`（或 OpenAPI 集成入口）
  - `docs/*`（部署与验收）
- DoD：
  - 前后端契约一致，发布步骤可演练。

### Day 21（2026-03-27）封板与交付

- 任务：
  - 全量回归、缺陷清零（P0/P1）。
  - 交付评审与演示脚本确认。
- 交付物：
  - 代码分支、测试报告、部署文档、验收记录。
- DoD：
  - 可部署、可演示、可验收。

## 2. 里程碑检查点

1. M1（2026-03-09）：一致性修复完成。
2. M2（2026-03-13）：核心用户流可演示。
3. M3（2026-03-18）：教师/管理员核心场景可用。
4. M4（2026-03-23）：社区与反作弊场景可用。
5. M5（2026-03-27）：封板交付。

## 3. 每日站会模板

- 昨日完成：
- 今日计划：
- 阻塞问题：
- 需要决策：
- 风险变化：
