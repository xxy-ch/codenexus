# 前后端契约对齐清单（2026-03-06）

## 1. 已对齐的关键契约

- 认证与用户
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/register`
  - `GET /users/me`
  - `PATCH /users/me`

- 题目与提交
  - `GET /problems`
  - `GET /problems/:id`
  - `GET /submissions`
  - `GET /submissions/:id`
  - `GET /submissions/stats`

- 排行榜
  - `GET /leaderboard/global`
  - `GET /leaderboard/user/:user_id/stats`

- 竞赛
  - `GET /contests`
  - `GET /contests/:id`
  - `GET /contests/:id/rankings`
  - `GET /contests/:id/status`
  - `POST /contests/:id/register`

- 社区（讨论）
  - `GET /discussions`
  - `GET /discussions/:id`
  - `POST /discussions/:id/replies`
  - `POST /discussions/:id/like`
  - `POST /discussions/replies/:reply_id/like`
  - 前端已兼容 `parent_reply_id <-> parent_id`
  - 前端已兼容点赞返回 `boolean` 或对象

- 社区（博客）
  - `GET /blog`
  - `GET /blog/:slug_or_id`
  - `POST /blog`
  - `PATCH /blog/:slug_or_id`
  - `GET /blog/:slug_or_id/comments`
  - `POST /blog/:slug_or_id/comments`
  - `POST /blog/:id/like`
  - `POST /blog/comments/:comment_id/like`
  - `GET /blog/categories`
  - `GET /blog/tags/popular`
  - 前端已兼容 `parent_comment_id <-> parent_id`
  - 前端已兼容热门标签元组返回（`[tag,count]`）

- 教师班级
  - `GET /classes`
  - `GET /classes/:class_id/stats`
  - 前端已兼容 `code -> enrollment_code` 字段映射

- 管理端题目配置
  - `GET /problems/:id/test-cases`
  - `POST /problems/:id/test-cases`
  - `PUT /problems/:id/test-cases/:test_case_id`
  - `DELETE /problems/:id/test-cases/:test_case_id`
  - `GET /problems/:id`
  - `PUT /problems/:id`

## 2. 本轮补齐契约（已闭环）

- 私信模块：`/messages/conversations*`
  - 前端已实现页面与 service，后端已补齐同名路由。
  - 发布策略：默认开启（`VITE_ENABLE_DIRECT_MESSAGES=false` 可降级关闭）。

- 反作弊模块：`/admin/plagiarism/*`
  - 前端已实现配置/报告页面与 service。
  - 后端已补齐对应模块路由与基础服务实现。
  - 发布策略：默认开启（`VITE_ENABLE_PLAGIARISM=false` 可降级关闭）。

## 3. 建议发布前验收顺序

1. 验证 `auth -> problem -> submission -> result` 主链路。
2. 验证社区（讨论/博客）创建、评论、点赞链路。
3. 验证教师班级列表与统计接口。
4. 验证管理员题目配置页（测试用例 CRUD）。
5. 验证私信与反作弊链路；若异常则通过 feature flag 降级关闭入口。
