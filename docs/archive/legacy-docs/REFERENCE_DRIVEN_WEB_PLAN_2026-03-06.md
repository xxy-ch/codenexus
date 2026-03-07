# References 驱动的动态网页与交付计划（2026-03-06）

## 1. 目标

基于 `references/` 的设计稿，完成以下两件事：

1. 将设计稿落地为可交互的动态页面（真实 API 驱动，非静态展示）。
2. 从当前状态推进到可交付版本（可部署、可验收、可演示）。

## 2. 页面映射总览（Reference -> 当前系统）

| Reference | 目标页面/能力 | 当前状态 | 处理策略 |
|---|---|---|---|
| modular_homepage_dashboard_1/2 | 用户仪表盘 | 已有 `DashboardEnhanced` | 视觉对齐+数据指标补齐 |
| problem_repository | 题库列表 | 已有 `ProblemSet` | 筛选、分页、排序与设计稿对齐 |
| problem_content_configuration | 题目详情/配置 | 部分有 `ProblemDetail` | 增补配置区块与管理入口 |
| problem_solving_ide | 解题 IDE | 已有 `ProblemIDEEnhanced` | 编辑器布局与状态面板对齐 |
| submission_history | 提交历史 | 已有 `SubmissionHistory` | 列表字段与筛选器对齐 |
| submission_detail_analysis | 提交详情分析 | 已有 `SubmissionDetail` | 结果可视化增强 |
| live_contest_scoreboard_board | 实时榜单 | 缺独立页面 | 新增 `ContestScoreboard` 页面 |
| global_user_rankings | 全局排行 | 已有 `Ranking` | 路径/API 对齐，支持多维筛选 |
| community_blog_feed | 社区博客流 | 已有 `BlogList` | 卡片信息层级和过滤器对齐 |
| blog_article_editor | 文章编辑器 | 已有 `CreateArticle` | 补齐编辑/草稿/发布流程 |
| direct_messages | 私信系统 | 缺失 | 新增消息会话与详情页面 |
| user_settings_&_profile | 用户设置/档案 | 已有 `Profile` + `Settings` | 统一信息架构和交互 |
| admin_dashboard_overview | 管理仪表盘 | 已有 `AdminDashboard` | 指标卡与告警区升级 |
| admin_user_management | 用户管理 | 已有 `UserManagement` | 分页筛选/批量操作增强 |
| admin_problem_management | 题目管理 | 已有 `ProblemManagement` | 审核流、状态变更与批操作 |
| teacher_class_management_6 | 班级管理 | 后端有，前端弱 | 新增教师班级管理页 |
| teacher_class_management_2 | 竞赛创建向导 | 缺失 | 新增向导式创建页 |
| teacher_class_management_3 | 作业表现分析 | 缺失 | 新增教学分析页 |
| teacher_class_management_4 | 讨论串 | 已有 `DiscussionDetail` | 结构与交互细节对齐 |
| teacher_class_management_1 | 判题节点监控 | 缺失 | 新增运维监控页（管理员） |
| teacher_class_management_5 | 学习路线图 | 缺失 | 新增个人学习路线图页 |
| test_data_&_judge_settings | 测试数据与判题设置 | 缺失 | 新增题目测试配置页面 |
| code_similarity_scan_config | 相似度扫描配置 | 缺失 | 新增反作弊配置页 |
| plagiarism_detection_report_1..5 | 反作弊报告与相关后台 | 部分缺失 | 新增报告列表/详情/处理流 |

## 3. 动态化实施原则

- 所有页面以真实接口为主，不允许“请求失败自动回退 mock”。
- 统一使用 service 层与类型定义，避免页面直接拼接接口。
- 页面上线标准：`可访问 + 可交互 + 可追踪错误 + 可测试`。
- 对齐路由与接口命名，消除 `ranking`/`leaderboard` 类不一致。

## 4. 交付阶段与日期（建议）

## Phase A（2026-03-07 ~ 2026-03-09）：核心一致性修复

范围：
- 修正公开路由与鉴权中间件作用域。
- 完成前后端路径对齐（用户、题目、提交、排行、社区主路径）。
- 移除高风险 mock fallback（保留显式开关，不静默回退）。

验收：
- 登录/注册可用。
- 主导航页面无 401/404 路径错误。

## Phase B（2026-03-10 ~ 2026-03-13）：Reference 高优先页面对齐

范围：
- Dashboard / ProblemSet / IDE / Submission History / Submission Detail / Ranking / Blog Feed / Admin Dashboard 视觉与交互对齐。
- 新增 `ContestScoreboard`（来自 `live_contest_scoreboard_board`）。

验收：
- 以上页面可访问且由真实接口驱动。
- 至少 1 条端到端流程可演示（登录 -> 做题 -> 提交 -> 查看结果）。

## Phase C（2026-03-14 ~ 2026-03-18）：管理与教学场景补齐

范围：
- 用户管理、题目管理增强。
- 教师场景新增：班级管理、竞赛创建向导、作业表现分析。
- 新增测试数据与判题设置页。

验收：
- 教师与管理员至少各有 1 条完整任务流可跑通。

## Phase D（2026-03-19 ~ 2026-03-23）：社区与反作弊能力

范围：
- 私信页面（会话列表+会话详情）。
- 相似度扫描配置页。
- 反作弊报告列表/详情/处理页（对应 plagiarism references）。

验收：
- 反作弊流程可从配置到报告闭环展示。

## Phase E（2026-03-24 ~ 2026-03-27）：稳定性与交付封板

范围：
- E2E 冒烟集（关键用户流）。
- 接口契约检查（OpenAPI/类型一致性）。
- 文档、部署脚本、发布清单整理。

验收（交付门槛）：
- 关键流 E2E 全绿。
- 无 P0/P1 阻断缺陷。
- 交付文档齐全（部署、回滚、验收清单）。

## 5. 当前到交付的关键路径

1. 先解“接口与鉴权一致性”问题。
2. 再做 references 的高优先页面动态化。
3. 然后补齐教师/管理/反作弊三类缺口。
4. 最后做统一验收与封板发布。

## 6. 风险与应对

- 风险：后端接口与前端 service 不一致导致返工。  
  应对：先做接口对齐清单，再批量改前端调用。

- 风险：页面多、周期长。  
  应对：按“可演示主链路”优先，分阶段交付。

- 风险：测试不足导致回归。  
  应对：每阶段至少补 1 条 E2E 冒烟和对应集成测试。

## 7. 可执行任务清单（首批）

1. 路由/鉴权整改
- 调整后端路由层，使 `/auth/login`、`/auth/register` 保持公开。
- 为受保护路由保留统一鉴权中间件。

2. 接口对齐整改
- 统一排行榜路径（前后端统一为同一命名方案）。
- 统一社区、搜索、提交相关路径前缀策略。

3. 高优先页面动态化
- `DashboardEnhanced`：接入真实统计指标，移除静态 fallback。
- `ProblemSet`：接入服务端分页、筛选、排序。
- `ProblemIDEEnhanced`：提交与状态轮询/推送对齐。
- `SubmissionHistory`、`SubmissionDetail`：字段与状态码标准化展示。
- `Ranking`：接口对齐后接入真实排行数据。
- `BlogList`：接入真实列表、筛选与分页。
- 新增 `ContestScoreboard` 页面并接入竞赛榜单数据。

4. 教学与管理补齐
- 新增教师班级管理页、竞赛创建向导页、作业表现分析页。
- 新增测试数据与判题设置页。
- 强化管理员用户/题目管理页的筛选、批量、状态变更能力。

5. 反作弊与消息系统
- 新增相似度扫描配置页。
- 新增反作弊报告列表/详情/处理页。
- 新增私信会话列表和会话详情页。

6. 验收与交付
- 增加关键 E2E 冒烟用例。
- 对齐 OpenAPI 与前端类型。
- 输出交付文档：部署步骤、验收步骤、回滚步骤。
