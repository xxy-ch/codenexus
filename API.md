# AlgoMaster Online Judge -- API 参考文档

## 1. 概览

### 基础信息

| 项目 | 说明 |
|------|------|
| 基础 URL | `http://{host}:3000` |
| 协议 | HTTP REST + WebSocket |
| 数据格式 | JSON (`application/json`) |
| 字符编码 | UTF-8 |
| 认证方式 | JWT Bearer Token / Cookie |

### 请求格式

所有请求体使用 JSON 格式，需要设置 `Content-Type: application/json`。

### 响应格式

**成功响应**：直接返回资源对象或集合。

```json
{
  "id": 1,
  "title": "两数之和",
  "difficulty": "easy"
}
```

**错误响应**：统一错误信封格式。

```json
{
  "error": "错误描述信息",
  "status": 400
}
```

**分页响应**：列表接口统一返回 `total`、`page`/`offset`、`limit` 字段。

```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### 通用 HTTP 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 成功（无内容，用于删除操作） |
| 400 | 请求参数错误 / 业务校验失败 |
| 401 | 未认证或 Token 无效 |
| 403 | 权限不足（角色不满足或租户不匹配） |
| 404 | 资源不存在 |
| 409 | 资源冲突（如重复注册） |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用（依赖组件异常） |

### 限流

用户面向端点限流策略：每 IP 每分钟最多 30 次请求（令牌桶，burst=30，每秒补充 1 个）。

以下端点**不受限流**：
- `/health/live`、`/health/ready` -- 健康检查
- `/metrics` -- Prometheus 指标
- `/internal/worker/heartbeat` -- 判题 Worker 心跳

---

## 2. 认证与授权

### 2.1 认证机制

系统使用 **JWT (HS256)** 进行身份认证，支持两种 Token 传递方式：

1. **Authorization 头**：`Authorization: Bearer <access_token>`
2. **Cookie**：`access_token=<access_token>`（HttpOnly, SameSite=Strict）

#### Token 类型

| Token | 有效期 | 用途 |
|-------|--------|------|
| Access Token | 4 小时 | API 请求认证 |
| Refresh Token | 30 天 | 刷新 Access Token |

#### JWT Claims 结构

```json
{
  "sub": "uuid-of-user",
  "email": "user@example.com",
  "role": "student",
  "school_id": 1,
  "campus_id": 2,
  "iat": 1700000000,
  "exp": 1700014400,
  "jti": "uuid-of-token"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `sub` | UUID | 用户 ID |
| `email` | string | 用户邮箱 |
| `role` | string | 用户角色（见 2.3） |
| `school_id` | i64 | 所属组织/学校 ID（租户 ID） |
| `campus_id` | i64? | 所属校区 ID（可选） |
| `iat` | i64 | 签发时间（Unix 时间戳） |
| `exp` | i64 | 过期时间（Unix 时间戳） |
| `jti` | UUID | Token 唯一标识，用于黑名单 |

#### 登出机制

登出时将 Token 的 `jti` 写入 Redis 黑名单（key: `bl:{jti}`），TTL 与 Token 剩余有效期一致。认证中间件在验证时会检查黑名单。

### 2.2 认证端点

#### POST /api/auth/login

用户登录。

**请求体**：

```json
{
  "username": "student001",
  "password": "password123"
}
```

**成功响应** (`200`)：

```json
{
  "token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "user": {
    "id": "uuid-string",
    "username": "student001",
    "email": "student@example.com",
    "role": "student",
    "school_id": 1,
    "campus_id": null
  }
}
```

同时在响应头设置 Cookie：
- `access_token`：Path=/，Max-Age=14400（4小时）
- `refresh_token`：Path=/api/auth/refresh，Max-Age=604800（7天）

**失败响应**：`401 Unauthorized`

---

#### POST /api/auth/register

用户注册。

**请求体**：

```json
{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com",
  "organization_id": 1,
  "campus_id": 2,
  "display_name": "张三",
  "user_code": "2024001"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | 是 | 用户名 |
| `password` | string | 是 | 密码 |
| `email` | string? | 否 | 邮箱 |
| `organization_id` | i64 | 是 | 所属学校 ID |
| `campus_id` | i64? | 否 | 所属校区 ID |
| `display_name` | string? | 否 | 显示名称 |
| `user_code` | string? | 否 | 学号/工号 |

**成功响应** (`200`)：

```json
{
  "token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "user": {
    "id": "uuid-string",
    "username": "newuser",
    "email": "user@example.com",
    "role": "student",
    "organization_id": 1,
    "campus_id": 2,
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

#### POST /api/auth/refresh

刷新 Access Token。优先从 Cookie 读取 `refresh_token`，若不存在则从请求体读取。

**请求体**：

```json
{
  "refresh_token": "eyJhbGciOi..."
}
```

**成功响应** (`200`)：

```json
{
  "token": "new-access-token"
}
```

**失败响应**：`401 Unauthorized`

---

#### POST /api/auth/logout

登出当前用户，将 Token 加入黑名单。需要认证。

**成功响应**：`200 OK`（无响应体）

---

### 2.3 角色体系

系统采用 RBAC（基于角色的访问控制），角色层级自低到高：

| 角色 | 标识 | 说明 |
|------|------|------|
| Student | `student` | 学生 -- 提交代码、查看题目和排行榜 |
| TeachingAssistant | `teachingassistant` / `ta` | 助教 -- 辅助批改，受限权限 |
| Teacher | `teacher` | 教师 -- 创建题目、管理班级、批改 |
| CampusAdmin | `campusadmin` | 校区管理员 -- 校区级别管理 |
| OrganizationAdmin | `organizationadmin` | 组织管理员 -- 组织级别管理 |
| Root | `root` | 超级管理员 -- 系统全局访问，跨租户 |

角色层级检查：`Root >= OrganizationAdmin >= CampusAdmin >= Teacher >= TeachingAssistant >= Student`

### 2.4 权限定义

系统定义了 21 种细粒度权限，分为 6 大类：

**用户管理**：`ManageUsers`、`ViewUsers`

**题目管理**：`ManageProblems`、`ViewAllProblems`、`SubmitSolution`

**竞赛管理**：`ManageContests`、`RegisterContests`、`ViewContestProblems`

**班级管理**：`ManageClasses`、`ManageAssignments`、`GradeSubmissions`、`ViewClassStats`

**组织管理**：`ManageOrganization`、`ManageCampus`

**系统管理**：`ViewLeaderboard`、`ViewStatistics`、`ModerateContent`、`ManageTags`、`ManageSystem`、`ViewLogs`、`ManageApiKeys`

### 2.5 多租户隔离

- JWT Claims 中的 `school_id` 标识用户所属租户
- 租户中间件从 Claims 提取租户信息（**绝不从请求头读取**）
- 所有领域查询均过滤租户（`WHERE organization_id = $1`）
- Root 角色绕过租户检查（全局访问）
- 非本租户资源返回 404（而非 403，防止信息泄露）

---

## 3. 用户管理

所有 `/api/users/*` 端点需要认证。

### 3.1 当前用户

#### GET /api/users/me

获取当前用户个人信息。

**响应**：

```json
{
  "id": "uuid-string",
  "user_code": "2024001",
  "username": "student001",
  "email": "student@example.com",
  "display_name": "张三",
  "organization_id": 1,
  "campus_id": 2,
  "role": "student",
  "status": "active",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

#### PATCH /api/users/me

更新当前用户个人信息。

**请求体**：

```json
{
  "email": "new@example.com",
  "password": "newpassword",
  "display_name": "李四",
  "campus_id": 3
}
```

所有字段均可选，仅传递需要更新的字段。

---

### 3.2 用户注册（补充入口）

#### POST /api/users/register

通过 users 模块注册用户（与 `/api/auth/register` 功能相同但返回格式略有差异）。

---

### 3.3 管理员用户管理

以下端点需要 **admin** 角色。

#### GET /api/users/admin

分页查询用户列表。

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `search` | string? | 按用户名/邮箱搜索 |
| `role` | string? | 按角色过滤 |
| `status` | string? | 按状态过滤 |
| `sort` | string? | 排序字段 |
| `page` | i64? | 页码（默认 1） |
| `limit` | i64? | 每页数量（默认 20） |

**响应**：

```json
{
  "users": [
    {
      "id": "uuid-string",
      "user_code": "2024001",
      "username": "student001",
      "email": "student@example.com",
      "display_name": "张三",
      "role": "student",
      "status": "active",
      "organization_id": 1,
      "organization_name": "XX大学",
      "created_at": "2024-01-01T00:00:00Z",
      "submissions_count": 42,
      "problems_solved": 15
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

#### POST /api/users/admin/batch-create

批量创建用户。

**请求体**：

```json
{
  "users": [
    {
      "user_code": "2024001",
      "display_name": "张三",
      "email": "zhang@example.com",
      "campus_id": 1,
      "role": "student"
    }
  ],
  "default_password": "init123456",
  "organization_id": 1,
  "campus_id": 1
}
```

**响应**：

```json
{
  "created": [
    {
      "id": "uuid-string",
      "username": "auto-generated",
      "organization_id": 1,
      "role": "student",
      "status": "active"
    }
  ],
  "skipped": [
    {
      "user_code": "2024001",
      "reason": "Username already exists"
    }
  ]
}
```

---

#### PATCH /api/users/admin/:user_id/role

修改用户角色。

**请求体**：

```json
{
  "role": "teacher"
}
```

**响应**：`{"success": true}`

---

#### PATCH /api/users/admin/:user_id/status

切换用户状态（启用/禁用）。

**响应**：`{"success": true}`

---

## 4. 题目管理

所有 `/api/problems/*` 端点需要认证。

### 4.1 题目 CRUD

#### GET /api/problems

获取题目列表。

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `search` | string? | 标题/描述模糊搜索 |
| `difficulty` | string? | 难度过滤：`easy`、`medium`、`hard` |
| `visibility` | string? | 可见性过滤：`public`、`campus`、`class`、`private` |
| `is_public` | bool? | 是否仅显示公开题（默认 true） |
| `tags` | string[]? | 标签过滤 |
| `page` | i64? | 页码（默认 1） |
| `limit` | i64? | 每页数量（默认 20，最大 100） |
| `sort_by` | string? | 排序字段 |
| `sort_order` | string? | 排序方向：`asc`、`desc` |

**响应**：

```json
{
  "problems": [
    {
      "id": 1,
      "title": "两数之和",
      "description": "给定一个整数数组...",
      "difficulty": "easy",
      "time_limit": 5000,
      "memory_limit": 256,
      "created_by": "uuid-string",
      "organization_id": 1,
      "is_public": true,
      "visibility": "public",
      "tags": ["数组", "哈希表"],
      "source_url": null,
      "author_note": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

---

#### POST /api/problems

创建新题目。需要 **Teacher 及以上** 角色。

**请求体**：

```json
{
  "title": "两数之和",
  "description": "给定一个整数数组 nums...",
  "difficulty": "easy",
  "time_limit": 5000,
  "memory_limit": 256,
  "organization_id": 1,
  "is_public": true,
  "visibility": "public",
  "tags": ["数组", "哈希表"],
  "source_url": "https://leetcode.cn/problems/two-sum/",
  "author_note": "经典入门题"
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `title` | string | 是 | - | 题目标题 |
| `description` | string | 是 | - | 题目描述 |
| `difficulty` | string | 是 | - | `easy`/`medium`/`hard` |
| `time_limit` | i32 | 否 | 5000 | 时间限制（毫秒） |
| `memory_limit` | i32 | 否 | 256 | 内存限制（KB） |
| `organization_id` | i64 | 是 | - | 所属组织 |
| `is_public` | bool | 否 | false | 是否公开 |
| `visibility` | string | 否 | `private` | 可见性策略 |
| `tags` | string[] | 否 | [] | 标签 |

---

#### GET /api/problems/:id

获取题目详情（含测试用例数量）。

**响应**：题目对象 + `test_case_count` + `statistics`(可选)

---

#### PUT /api/problems/:id

更新题目。需要 **Teacher 及以上** 角色。所有字段均可选。

---

#### DELETE /api/problems/:id

删除题目。需要 **Admin** 角色。返回 `204 No Content`。

---

### 4.2 题目统计

#### GET /api/problems/:id/statistics

获取题目提交统计。

**响应**：

```json
{
  "problem_id": 1,
  "total_submissions": 500,
  "accepted_submissions": 200,
  "acceptance_rate": 40.0,
  "fastest_time_ms": 12,
  "first_solver_id": "uuid-string",
  "first_solved_at": "2024-01-01T00:00:00Z",
  "last_solved_at": "2024-06-01T00:00:00Z"
}
```

---

### 4.3 测试用例管理

#### GET /api/problems/:id/test-cases

获取题目的测试用例列表。
- **Teacher 及以上**：查看完整用例数据（输入、输出、分数）
- **学生**：仅查看非隐藏用例的元数据（id、problem_id、is_hidden、order）

---

#### POST /api/problems/:id/test-cases

创建单个测试用例。需要 **Teacher 及以上** 角色。

**请求体**：

```json
{
  "input": "3\n1 2 3",
  "expected_output": "6",
  "is_hidden": false,
  "score": 10,
  "order": 0
}
```

---

#### POST /api/problems/:id/test-cases/import

批量导入测试用例。需要 **Teacher 及以上** 角色。

**请求体**：

```json
{
  "test_cases": [
    {
      "input": "3\n1 2 3",
      "expected_output": "6",
      "is_hidden": false,
      "score": 10
    }
  ]
}
```

**响应**：

```json
{
  "message": "Imported 5 test cases",
  "imported_count": 5,
  "total_count": 5,
  "errors": []
}
```

---

#### PUT /api/problems/:id/test-cases/:test_case_id

更新测试用例。需要 **Teacher 及以上** 角色。所有字段均可选。

---

#### DELETE /api/problems/:id/test-cases/:test_case_id

删除测试用例。需要 **Teacher 及以上** 角色。

---

### 4.4 语言设置

#### GET /api/problems/languages

获取系统支持的编程语言列表。

**响应**：

```json
[
  {"id": "python", "name": "Python 3", "extension": "py", "enabled": true, "is_default": true},
  {"id": "c", "name": "C", "extension": "c", "enabled": false, "is_default": false},
  {"id": "cpp", "name": "C++", "extension": "cpp", "enabled": false, "is_default": false}
]
```

---

#### PUT /api/problems/languages

更新编程语言启用状态。需要 **Admin** 角色。

**请求体**：

```json
{
  "c_enabled": true,
  "cpp_enabled": true
}
```

---

## 5. 提交判题

所有 `/api/submissions/*` 端点需要认证。

### 5.1 提交代码

#### POST /api/submissions

提交代码进行判题。

**请求体**：

```json
{
  "problem_id": 1,
  "code": "print(sum(map(int, input().split())))",
  "language": "python",
  "contest_id": 10
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `problem_id` | i64 | 是 | 题目 ID |
| `code` | string | 是 | 源代码 |
| `language` | string | 是 | 编程语言标识 |
| `contest_id` | i64? | 否 | 竞赛 ID（竞赛内提交时填写） |

提交后代码进入 Redis Streams 队列，由 Judge Worker 异步判题。

**响应**：返回 Submission 对象（状态为 `pending` 或 `queued`）。

---

### 5.2 查询提交

#### GET /api/submissions

获取当前用户的提交列表。

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `problem_id` | i64? | 按题目过滤 |
| `status` | string? | 按状态过滤 |
| `language` | string? | 按语言过滤 |
| `limit` | i64? | 每页数量（默认 20，最大 100） |
| `offset` | i64? | 偏移量（默认 0） |

**响应**：

```json
{
  "submissions": [...],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

#### GET /api/submissions/:id

获取单个提交详情（含测试用例执行结果）。

**响应**：

```json
{
  "id": 100,
  "user_id": "uuid-string",
  "problem_id": 1,
  "problem_title": "两数之和",
  "username": "student001",
  "code": "print(sum(map(int, input().split())))",
  "language": "python",
  "status": "ac",
  "score": 100,
  "runtime_ms": 15,
  "memory_kb": 8192,
  "test_cases": [
    {
      "id": 1,
      "status": "ac",
      "expected_output": "6",
      "actual_output": "6",
      "error_message": null,
      "runtime_ms": 5,
      "memory_kb": 4096
    }
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

#### GET /api/submissions/stats

获取当前用户的提交统计。

**响应**：

```json
{
  "total_submissions": 100,
  "accepted_submissions": 60,
  "acceptance_rate": 60.0,
  "average_runtime": 150.5,
  "average_memory": 8192.0
}
```

---

### 5.3 判题结果回调（内部接口）

#### POST /api/submissions/:id/results

Judge Worker 判题完成后回调此端点提交结果。

**认证方式**：`X-Worker-Secret` 请求头（常量时间比较），**不使用 JWT**。

**请求体**：

```json
{
  "submission_id": 100,
  "status": "ac",
  "score": 100,
  "runtime_ms": 15,
  "memory_kb": 8192,
  "test_case_results": [
    {
      "test_case_id": 1,
      "status": "ac",
      "expected_output": "6",
      "actual_output": "6",
      "error_message": null,
      "runtime_ms": 5,
      "memory_kb": 4096
    }
  ]
}
```

**状态机**：
- 路径 ID 必须与 `submission_id` 一致
- 合法状态转换：`pending/queued` -> `judging` -> 终态（`ac`/`wa`/`tle`/`mle`/`re`/`ce` 等）
- 终态不可覆盖
- 相同状态的重复回调视为幂等，返回成功但不更新

**响应**：

```json
{
  "message": "Judge result updated successfully",
  "submission_id": 100,
  "status": "ac"
}
```

---

## 6. 竞赛管理

所有 `/api/contests/*` 端点需要认证，所有操作在用户所属租户范围内。

### 6.1 竞赛 CRUD

#### GET /api/contests

获取竞赛列表。自动按当前用户租户过滤。

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `campus_id` | i64? | 按校区过滤 |
| `active` | bool? | 仅显示进行中的竞赛 |
| `page` | i64? | 页码（默认 1） |
| `limit` | i64? | 每页数量（默认 20） |

---

#### POST /api/contests

创建竞赛。需要 **Teacher 及以上** 角色。`organization_id` 从 Claims 强制覆盖。

**请求体**：

```json
{
  "name": "2024 春季编程竞赛",
  "description": "面向全校学生的编程竞赛",
  "rules": "acm",
  "start_time": "2024-03-01T09:00:00Z",
  "end_time": "2024-03-01T14:00:00Z",
  "freeze_minutes": 30,
  "campus_id": 1
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 竞赛名称 |
| `rules` | string? | 赛制：`acm`、`ioi`、`education` |
| `start_time` | datetime | 开始时间 |
| `end_time` | datetime | 结束时间 |
| `freeze_minutes` | i32? | 封榜时间（分钟） |

---

#### GET /api/contests/:id

获取竞赛详情（含 `problem_count` 和 `participant_count`）。

---

#### PUT /api/contests/:id

更新竞赛。需要 **Teacher 及以上** 角色 + 租户验证。

---

#### DELETE /api/contests/:id

删除竞赛。需要 **Teacher 及以上** 角色。返回 `204 No Content`。

---

### 6.2 竞赛题目管理

#### GET /api/contests/:id/problems

获取竞赛题目列表。

**响应**：

```json
[
  {
    "id": 1,
    "problem_id": 10,
    "title": "两数之和",
    "difficulty": "easy",
    "points": 100,
    "order_index": 0
  }
]
```

---

#### POST /api/contests/:id/problems

向竞赛添加题目。需要 **Teacher 及以上** 角色。

**请求体**：

```json
{
  "problem_id": 10,
  "points": 100,
  "order_index": 0
}
```

---

#### DELETE /api/contests/:id/problems/:problem_id

从竞赛移除题目。需要 **Teacher 及以上** 角色。

---

### 6.3 竞赛参与

#### POST /api/contests/:id/register

注册参加竞赛。租户范围内任何认证用户可注册。

**响应**：

```json
{
  "id": 1,
  "contest_id": 10,
  "user_id": "uuid-string",
  "registered_at": "2024-01-01T00:00:00Z"
}
```

重复注册返回 `409 Conflict`。

---

#### GET /api/contests/:id/participants

获取竞赛参与者列表。需要 **Teacher 或 Admin** 角色。

---

### 6.4 竞赛排名与状态

#### GET /api/contests/:id/rankings

获取竞赛排名/积分榜。

**响应**：

```json
[
  {
    "user_id": "uuid-string",
    "username": "student001",
    "score": 300,
    "penalty": 120,
    "solved_count": 3,
    "submissions": [
      {
        "problem_id": 10,
        "problem_title": "两数之和",
        "score": 100,
        "attempts": 1,
        "time_penalty": 20,
        "first_solved_at": "2024-03-01T09:20:00Z"
      }
    ]
  }
]
```

---

#### GET /api/contests/:id/status

获取竞赛实时状态。

**响应**：

```json
{
  "status": "active",
  "time_until_start": null,
  "time_until_end": 3600,
  "is_frozen": false
}
```

`status` 取值：`upcoming`、`active`、`ended`

---

### 6.5 竞赛提交关联

#### POST /api/contests/:id/submissions/:submission_id

将提交关联到竞赛。需要 **Teacher 及以上** 角色。

---

## 7. 班级与作业

所有 `/api/classes/*` 端点需要认证，所有操作在用户所属租户范围内。

### 7.1 班级管理

#### POST /api/classes

创建班级。需要 **Teacher 及以上** 角色。

**请求体**：

```json
{
  "name": "2024 数据结构",
  "semester": "2024-春",
  "campus_id": 1
}
```

系统自动生成班级邀请码（`code` 字段），`teacher_id` 从 Claims 设置。

---

#### GET /api/classes

获取班级列表。自动按租户过滤。

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `campus_id` | i64? | 按校区过滤 |
| `teacher_id` | uuid? | 按教师过滤 |
| `is_active` | bool? | 是否活跃 |
| `page` | i64? | 页码 |
| `limit` | i64? | 每页数量 |

---

#### GET /api/classes/:class_id

获取班级详情。

---

#### PUT /api/classes/:class_id

更新班级。需要 **Teacher 及以上** 角色 + 班级所有者或 Admin。

---

#### DELETE /api/classes/:class_id

删除班级。需要 **Teacher 及以上** 角色 + 班级所有者或 Admin。返回 `204 No Content`。

---

#### GET /api/classes/:class_id/stats

获取班级统计数据。

**响应**：

```json
{
  "class_id": 1,
  "total_students": 40,
  "active_students": 35,
  "total_assignments": 5,
  "total_submissions": 150,
  "average_score": 78.5,
  "completion_rate": 0.7
}
```

---

### 7.2 学生管理

#### GET /api/classes/:class_id/students

获取班级学生列表（含进度）。需要班级所有者或 Admin。

**响应**：`StudentProgress[]`

```json
[
  {
    "student_id": "uuid-string",
    "username": "student001",
    "email": "student@example.com",
    "total_assignments": 5,
    "completed_assignments": 4,
    "average_score": 85.0,
    "last_submission": "2024-06-01T10:00:00Z"
  }
]
```

---

#### POST /api/classes/:class_id/students

添加学生到班级。需要 **Teacher 及以上** 角色。

**请求体**：

```json
{
  "username": "student001"
}
```

---

#### POST /api/classes/:class_id/students/import

批量导入学生。需要 **Teacher 及以上** 角色。

**请求体**：

```json
{
  "usernames": ["student001", "student002", "student003"]
}
```

---

#### DELETE /api/classes/:class_id/students/:student_id

从班级移除学生。需要 **Teacher 及以上** 角色。

---

#### POST /api/classes/enroll

学生通过邀请码加入班级。

**请求体**：

```json
{
  "code": "ABC123"
}
```

---

### 7.3 作业管理

#### POST /api/classes/:class_id/assignments

创建作业。需要 **Teacher 及以上** 角色 + 班级所有者。

**请求体**：

```json
{
  "problem_id": 10,
  "deadline": "2024-06-30T23:59:59Z",
  "points": 100
}
```

---

#### GET /api/classes/:class_id/assignments

获取班级的作业列表。

---

#### GET /api/classes/assignments/:assignment_id

获取单个作业详情。

---

#### PUT /api/classes/assignments/:assignment_id

更新作业。需要 **Teacher 及以上** 角色 + 班级所有者。

---

#### DELETE /api/classes/assignments/:assignment_id

删除作业。需要 **Teacher 及以上** 角色 + 班级所有者。

---

#### POST /api/classes/assignments/:assignment_id/publish

发布作业（对学生可见）。需要 **Teacher 及以上** 角色 + 班级所有者。

---

#### GET /api/classes/assignments/:assignment_id/submissions

获取作业的所有提交。需要 **Teacher 及以上** 角色 + 班级所有者。

**响应**：`AssignmentSubmission[]`

```json
[
  {
    "id": 1,
    "assignment_id": 5,
    "user_id": "uuid-string",
    "submission_id": 100,
    "score": 95,
    "is_late": false,
    "late_days": 0,
    "submitted_at": "2024-06-01T10:00:00Z"
  }
]
```

---

## 8. 排行榜

所有 `/api/leaderboard/*` 端点需要认证。排行榜严格遵循租户隔离：
- 非 Admin 用户只能看到本组织的排行榜数据
- Admin 用户可以看到全局数据

### 8.1 排行榜端点

#### GET /api/leaderboard/global

获取全局排行榜。

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `limit` | i64? | 数量限制 |
| `offset` | i64? | 偏移量 |
| `timeframe` | string? | 时间范围过滤 |
| `min_problems` | i64? | 最少解题数 |

**响应**：

```json
{
  "entries": [
    {
      "rank": 1,
      "user_id": "uuid-string",
      "username": "top_student",
      "score": 1500.0,
      "problems_solved": 50,
      "submissions": 120,
      "acceptance_rate": 41.67,
      "organization_id": 1,
      "campus_id": null
    }
  ],
  "total": 200,
  "limit": 20,
  "offset": 0,
  "timeframe": "all"
}
```

---

#### GET /api/leaderboard/school/:school_id

获取学校排行榜。需要 `school_id` 与 Claims 匹配或 Admin 角色。

---

#### GET /api/leaderboard/campus/:campus_id

获取校区排行榜。需要 `campus_id` 与 Claims 匹配且属于同一组织。

---

#### GET /api/leaderboard/class/:class_id

获取班级排行榜。需要是班级成员或 Teacher/Admin。

---

#### GET /api/leaderboard/user/:user_id/stats

获取用户详细统计。

**响应**：

```json
{
  "user_id": "uuid-string",
  "username": "student001",
  "total_problems_solved": 42,
  "total_submissions": 100,
  "acceptance_rate": 42.0,
  "global_rank": 15,
  "school_rank": 3,
  "campus_rank": 1,
  "class_rank": null,
  "streak_days": 7,
  "max_streak_days": 14,
  "last_ac_at": "2024-06-01T10:00:00Z",
  "joined_at": "2024-01-01T00:00:00Z",
  "recent_ac": [
    {
      "problem_id": 10,
      "problem_title": "两数之和",
      "difficulty": "easy",
      "solved_at": "2024-06-01T10:00:00Z"
    }
  ]
}
```

---

#### GET /api/leaderboard/problem/:problem_id

获取题目最快解题排行榜。

**查询参数**：`limit`（默认 10，最大 100）

**响应**：

```json
[
  {
    "rank": 1,
    "user_id": "uuid-string",
    "username": "fast_coder",
    "time_ms": 5,
    "memory_kb": 4096,
    "language": "python",
    "solved_at": "2024-01-01T00:00:00Z"
  }
]
```

---

## 9. 搜索

### 9.1 全文搜索

#### GET /api/search

全文搜索题目、讨论、博客文章。

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string? | 搜索关键词 |
| `type` | string? | 搜索类型：`all`/`problems`/`discussions`/`articles`（默认 `all`） |
| `category` | string? | 按分类过滤 |
| `tag` | string? | 按标签过滤 |
| `author_id` | string? | 按作者过滤 |
| `sort` | string? | 排序：`relevance`/`newest`/`popular`（默认 `relevance`） |
| `page` | u32? | 页码（默认 1） |
| `limit` | u32? | 每页数量（默认 20） |

搜索根据认证状态进行租户隔离：已认证用户仅搜索本租户内的公开题目 + 自己可见的私有题目，未认证用户仅搜索公开题目。

**响应**：

```json
{
  "query": "排序算法",
  "results": [
    {
      "id": 10,
      "title": "快速排序",
      "type": "problem",
      "content": "...",
      "excerpt": "...高亮摘要...",
      "difficulty": "medium",
      "tags": ["排序", "分治"],
      "author_username": "teacher001",
      "relevance_score": 0.95,
      "highlighted_title": "<em>快速排序</em>",
      "like_count": 5,
      "view_count": 100,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total_count": 15,
  "problem_count": 8,
  "discussion_count": 4,
  "article_count": 3,
  "page": 1,
  "limit": 20,
  "has_more": false
}
```

---

#### GET /api/search/suggestions

搜索建议/自动补全。

**查询参数**：`q` -- 搜索关键词

**响应**：

```json
{
  "query": "排序",
  "suggestions": [
    {"text": "排序算法", "type": "keyword", "count": 50},
    {"text": "快速排序", "type": "problem", "count": 10}
  ]
}
```

---

## 10. 讨论区

所有 `/api/discussions/*` 端点需要认证。

### 10.1 讨论 CRUD

#### GET /api/discussions

获取讨论列表。

**查询参数**：`DiscussionFilters`（problem_id, sort, page, limit 等）

---

#### POST /api/discussions

创建讨论。

**请求体**：

```json
{
  "title": "关于时间复杂度的疑问",
  "content": "为什么这个算法是 O(n log n)？",
  "problem_id": 10
}
```

---

#### GET /api/discussions/:id

获取讨论详情（含回复列表）。

---

#### PATCH /api/discussions/:id

更新讨论（仅作者）。

---

#### DELETE /api/discussions/:id

删除讨论（作者或 Admin）。

---

### 10.2 回复与点赞

#### GET /api/discussions/:id/replies

获取讨论的回复列表。

---

#### POST /api/discussions/:id/replies

创建回复。创建成功后通过 WebSocket 向 `discussion:{id}` 频道广播 `DiscussionReply` 消息。

**请求体**：

```json
{
  "content": "因为每次递归将数组分成两半..."
}
```

---

#### POST /api/discussions/:id/like

点赞/取消点赞讨论（切换）。返回 `true`（已点赞）或 `false`（已取消）。

---

#### POST /api/discussions/replies/:reply_id/like

点赞/取消点赞回复。

---

## 11. 博客

所有 `/api/blog/*` 端点需要认证。

### 11.1 文章 CRUD

#### GET /api/blog

获取文章列表。

**查询参数**：`ArticleFilters`（category, tag, author_id, sort, page, limit 等）

---

#### POST /api/blog

创建文章。创建成功后通过 WebSocket 向本租户广播 `TrendingArticles` 消息。

**请求体**：

```json
{
  "title": "动态规划入门指南",
  "content": "# 动态规划\n\n动态规划是一种...",
  "category": "算法",
  "tags": ["动态规划", "教程"],
  "status": "published"
}
```

---

#### GET /api/blog/trending

获取热门文章。

**查询参数**：`limit`（默认 10）

---

#### GET /api/blog/featured

获取精选文章。

**查询参数**：`limit`（默认 5）

---

#### GET /api/blog/categories

获取所有文章分类。

---

#### GET /api/blog/tags/popular

获取热门标签。

**查询参数**：`limit`（默认 20）

---

#### GET /api/blog/:slug_or_id

获取文章详情（支持 slug 或数字 ID）。

---

#### PATCH /api/blog/:slug_or_id

更新文章（仅作者）。

---

#### DELETE /api/blog/:slug_or_id

删除文章（作者或 Admin）。

---

### 11.2 评论与点赞

#### GET /api/blog/:slug_or_id/comments

获取文章评论列表。

---

#### POST /api/blog/:slug_or_id/comments

创建评论。创建成功后通过 WebSocket 向 `article:{id}` 频道广播 `ArticleComment` 消息。

---

#### POST /api/blog/:id/like

点赞/取消点赞文章。

---

#### POST /api/blog/comments/:comment_id/like

点赞/取消点赞评论。

---

## 12. 消息系统

所有 `/api/messages/*` 端点需要认证。

### 12.1 私信

#### GET /api/messages/conversations

获取当前用户的会话列表，按最后消息时间降序排列。

**响应**：

```json
[
  {
    "id": "uuid-string",
    "peer_user_id": "uuid-string",
    "peer_username": "student002",
    "last_message": "你好！",
    "last_message_at": "2024-06-01T10:00:00Z",
    "unread_count": 3
  }
]
```

---

#### GET /api/messages/conversations/:conversation_id

获取会话消息列表。同时将未读消息标记为已读。

**响应**：`DirectMessageDto[]`

```json
[
  {
    "id": "uuid-string",
    "conversation_id": "uuid-string",
    "sender_id": "uuid-string",
    "sender_username": "student002",
    "content": "你好！",
    "created_at": "2024-06-01T10:00:00Z"
  }
]
```

---

#### POST /api/messages/conversations/:conversation_id

发送私信。

**请求体**：

```json
{
  "content": "你好，这道题怎么做？"
}
```

仅允许向已存在的会话发消息（会话由系统在首次交互时创建）。

---

## 13. 通知

所有 `/api/notifications/*` 端点需要认证。

### 13.1 通知管理

#### GET /api/notifications

获取通知列表。

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `unread_only` | bool? | 仅显示未读 |
| `notification_type` | string? | 按类型过滤：`reply`/`comment`/`like`/`system`/`mention` |
| `limit` | i64? | 每页数量 |
| `offset` | i64? | 偏移量 |

**响应**：

```json
{
  "notifications": [
    {
      "id": "uuid-string",
      "user_id": "uuid-string",
      "type": "reply",
      "title": "新回复",
      "content": "老师回复了你的讨论",
      "link": "/discussions/5",
      "is_read": false,
      "created_at": "2024-06-01T10:00:00Z",
      "actor_id": "uuid-string",
      "metadata": {}
    }
  ],
  "total": 10,
  "unread_count": 3,
  "limit": 20,
  "offset": 0
}
```

---

#### GET /api/notifications/stats

获取通知统计（总数、未读数、按类型统计）。

---

#### POST /api/notifications/mark-read

标记通知为已读。

**请求体**：

```json
{
  "notification_ids": ["uuid-1", "uuid-2"]
}
```

---

#### POST /api/notifications/mark-all-read

标记所有通知为已读。

---

#### DELETE /api/notifications/:id

删除通知。

---

### 13.2 通知设置

#### GET /api/notifications/settings

获取通知偏好设置。

**响应**：

```json
{
  "user_id": "uuid-string",
  "email_notifications": true,
  "reply_notifications": true,
  "comment_notifications": true,
  "like_notifications": true,
  "mention_notifications": true,
  "system_notifications": true,
  "digest_mode": "immediate"
}
```

`digest_mode` 取值：`immediate`、`hourly`、`daily`

---

#### PUT /api/notifications/settings

更新通知偏好设置。

---

## 14. 导入导出

所有 `/api/imex/*` 端点需要认证。

### 14.1 题目导入导出

#### POST /api/imex/import/problems/validate

验证题目 ZIP 包并返回预览。需要 **Teacher 及以上** 角色。

**请求格式**：`multipart/form-data`，最大 50 MB。

| 字段 | 类型 | 说明 |
|------|------|------|
| `file` | binary | ZIP 文件 |

**响应**：

```json
{
  "token": "uuid-preview-token",
  "total": 10,
  "valid": 8,
  "warnings": [
    {"item": "已有题目", "reason": "Duplicate title: 两数之和"}
  ],
  "errors": [
    {"item": "bad-problem", "reason": "Missing description"}
  ],
  "preview_items": [
    {
      "title": "三数之和",
      "difficulty": "medium",
      "test_case_count": 5,
      "status": "valid",
      "warning": null
    }
  ]
}
```

Preview Token 有效期 10 分钟。

---

#### POST /api/imex/import/problems/execute

执行题目导入。需要 **Teacher 及以上** 角色。

**请求体**：

```json
{
  "token": "uuid-preview-token"
}
```

**响应**：

```json
{
  "total": 10,
  "created": 8,
  "skipped": 1,
  "errors": 1,
  "created_items": [
    {"title": "三数之和", "id": "42"}
  ],
  "skipped_items": [
    {"item": "两数之和", "reason": "Duplicate title"}
  ],
  "error_items": [
    {"item": "bad-problem", "reason": "Insert failed"}
  ]
}
```

---

#### GET /api/imex/export/problems/:id

导出题目为 ZIP 文件。需要 **Teacher 及以上** 角色。

**响应**：`application/zip`，`Content-Disposition: attachment; filename="problem-{slug}.zip"`

---

### 14.2 用户导入导出

#### POST /api/imex/import/users/validate

验证用户 CSV 并返回预览。需要 **Admin** 角色。

**请求格式**：`multipart/form-data`，最大 10 MB。

| 字段 | 类型 | 说明 |
|------|------|------|
| `file` | binary | CSV 文件 |
| `default_password` | string | 默认密码（最少 6 位） |

---

#### POST /api/imex/import/users/execute

执行用户导入。需要 **Admin** 角色。

CampusAdmin 只能导入属于本校区的用户。

---

#### GET /api/imex/export/users

导出用户列表为 CSV 文件。需要 **Admin** 角色。

CampusAdmin 仅导出所属校区的用户。

**响应**：`text/csv`，`Content-Disposition: attachment; filename="users-export.csv"`

---

## 15. 查重系统

所有 `/api/admin/plagiarism/*` 端点需要认证 + **Admin** 角色。

### 15.1 查重配置

#### GET /api/admin/plagiarism/config

获取查重配置。

**响应**：

```json
{
  "enabled": true,
  "language": "all",
  "threshold": 0.85,
  "min_token_length": 5,
  "window_size": 30,
  "ignore_comments": true,
  "ignore_whitespace": true,
  "max_reports_per_run": 100
}
```

---

#### PUT /api/admin/plagiarism/config

更新查重配置。

---

### 15.2 查重执行与报告

#### POST /api/admin/plagiarism/scan

启动代码查重扫描。

**请求体**：

```json
{
  "contest_id": "10",
  "assignment_id": null
}
```

---

#### GET /api/admin/plagiarism/reports

获取查重报告列表。

**查询参数**：`page`、`limit`

---

#### GET /api/admin/plagiarism/reports/:report_id

获取查重报告详情（含相似代码对）。

**响应**：

```json
{
  "id": "uuid-string",
  "contest_id": "10",
  "status": "completed",
  "overall_risk": "low",
  "total_submissions": 30,
  "suspicious_pairs": 2,
  "top_pairs": [
    {
      "left_submission_id": "100",
      "right_submission_id": "101",
      "left_user": "student001",
      "right_user": "student002",
      "similarity": 0.92,
      "matched_lines": 45
    }
  ]
}
```

---

## 16. 判题监控

所有 `/api/admin/judge/*` 端点需要认证。

### 16.1 判题状态

#### GET /api/admin/judge/status

获取判题系统全局状态。需要 **Root** 角色。

Worker 心跳和队列深度是全局数据（不区分租户），因此仅 Root 可访问以防止跨租户信息泄露。

**响应**：

```json
{
  "scope": "global",
  "queues": {
    "normal_depth": 5,
    "contest_depth": 2
  },
  "active_judges": 3,
  "total_active_judgements": 7,
  "avg_wait_ms": 120,
  "workers": [
    {
      "worker_id": "worker-1",
      "active_judgements": "3",
      "total_processed": "1500",
      "avg_wait_ms": "100",
      "last_seen": "2024-06-01T10:00:00Z"
    }
  ]
}
```

---

### 16.2 死信队列管理

#### GET /api/admin/judge/dlq

获取死信队列条目。需要 **Admin 或 Root** 角色。按租户过滤（Admin 仅见本租户，Root 见全部）。

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `count` | i64? | 数量（默认 50，最大 200） |
| `start_id` | string? | 分页游标 |

---

#### POST /api/admin/judge/dlq/:id/retry

重试死信队列条目（重新入队）。

---

#### DELETE /api/admin/judge/dlq/:id

永久删除死信队列条目。

---

## 17. 内部端点

以下端点不使用 JWT 认证，用于基础设施和内部服务通信。

### 17.1 健康检查

#### GET /health/live

存活探针。进程存活即返回 `200 OK`，响应体：`OK`

---

#### GET /health/ready

就绪探针。检查 PostgreSQL 和 Redis 连接。

**成功响应** (`200`)：

```json
{
  "status": "ok",
  "db": "connected",
  "redis": "connected"
}
```

**失败响应** (`503`)：

```json
{
  "status": "unavailable",
  "db": "unavailable",
  "redis": "connected"
}
```

---

#### GET /health

重定向到 `/health/live`（`307 Temporary Redirect`）。

---

#### GET /status

重定向到 `/health/ready`（`307 Temporary Redirect`）。

---

### 17.2 指标

#### GET /metrics

Prometheus 格式的监控指标。

---

### 17.3 Worker 心跳

#### POST /internal/worker/heartbeat

Judge Worker 定期（约 10 秒）上报心跳。

**认证方式**：`X-Worker-Secret` 请求头（常量时间比较）

**请求体**：

```json
{
  "worker_id": "worker-abc-123",
  "active_judgements": 3,
  "total_processed": 1500,
  "avg_wait_ms": 100,
  "redis_breaker_state": "closed",
  "api_breaker_state": "closed"
}
```

心跳数据存储在 Redis Hash `worker:heartbeat:{worker_id}`，TTL 30 秒。

**响应**：`{"status": "ok"}`

---

## 18. WebSocket 接口

### 18.1 连接

#### GET /api/ws

通过 HTTP Upgrade 建立 WebSocket 连接。

**认证**：通过查询参数或 Cookie 传递 JWT Token。

### 18.2 消息格式

所有 WebSocket 消息使用带标签的 JSON 格式：

```json
{
  "type": "SubmissionUpdate",
  "data": {
    "submission_id": 100,
    "user_id": "uuid-string",
    "problem_id": 1,
    "status": "ac",
    "score": 100,
    "runtime_ms": 15,
    "memory_kb": 8192
  }
}
```

### 18.3 消息类型

| 消息类型 | 说明 |
|----------|------|
| `SubmissionUpdate` | 提交状态更新 |
| `LeaderboardUpdate` | 排行榜变动 |
| `Notification` | 新通知 |
| `ContestUpdate` | 竞赛状态/时间更新 |
| `ProblemStats` | 题目统计更新 |
| `ChatMessage` | 竞赛聊天消息 |
| `DiscussionReply` | 讨论新回复 |
| `ArticleComment` | 博客新评论 |
| `TrendingArticles` | 热门文章更新 |
| `Ping` | 心跳（客户端发送） |
| `Pong` | 心跳响应（服务端回复） |
| `Error` | 错误消息 |

### 18.4 频道订阅

客户端可订阅以下频道模式：

| 频道 | 说明 | 可见性 |
|------|------|--------|
| `submission:{id}` | 用户自己的提交更新 | 仅提交者 |
| `contest:{id}` | 竞赛状态更新 | 同组织用户 |
| `contest:{id}:chat` | 竞赛聊天 | 教师 + 已注册参赛者 |
| `user:{uuid}` | 个人通知频道 | 自动订阅 |
| `leaderboard:{scope}:{id}` | 排行榜更新 | 按权限过滤 |
| `discussion:{id}` | 讨论回复更新 | 所有认证用户 |
| `article:{id}` | 文章评论更新 | 所有认证用户 |

### 18.5 消息过滤

客户端可发送 `MessageFilter` 来限制接收的消息类型：

```json
{
  "message_types": ["submission_update", "contest_update"],
  "submission_ids": [100, 101],
  "contest_ids": [10],
  "problem_ids": null,
  "discussion_ids": null,
  "article_ids": null
}
```

### 18.6 服务端推送方式

| 方法 | 说明 |
|------|------|
| `send_to_user(user_id)` | 推送给用户的所有连接 |
| `send_to_topic(topic)` | 推送给频道的所有订阅者 |
| `broadcast()` | 推送给所有连接的客户端 |
| `broadcast_to_tenant(school_id)` | 推送给租户内的所有客户端 |

---

## 19. 通用规范

### 19.1 分页

列表接口支持分页，有两种分页风格：

**偏移分页**（多数列表接口）：

| 参数 | 说明 |
|------|------|
| `page` | 页码（从 1 开始） |
| `limit` | 每页数量（通常默认 20，最大 100） |
| `offset` | 偏移量（部分接口使用） |

**游标分页**（DLQ 列表等）：

| 参数 | 说明 |
|------|------|
| `count` | 返回数量 |
| `start_id` | 游标起始 ID |

### 19.2 过滤

所有过滤参数均为可选，不传则不过滤。示例：

```
GET /api/problems?difficulty=easy&visibility=public&page=1&limit=20
```

### 19.3 排序

支持 `sort` / `sort_by` + `sort_order` 参数控制排序，默认按创建时间降序。

### 19.4 日期时间

所有日期时间使用 ISO 8601 / RFC 3339 格式：`2024-01-01T00:00:00Z`

### 19.5 ID 类型

| 资源 | ID 类型 |
|------|---------|
| 用户 | UUID (v4) |
| 组织/校区 | i64 (自增) |
| 题目 | i64 (自增) |
| 提交 | i64 (自增) |
| 竞赛 | i64 (自增) |
| 班级 | i64 (自增) |
| 作业 | i64 (自增) |
| 通知 | UUID (v4) |
| 会话 | UUID (v4) |
| 讨论回复 | i64 (自增) |

### 19.6 提交状态

| 状态 | 说明 |
|------|------|
| `pending` | 等待处理 |
| `queued` | 已入队 |
| `judging` | 判题中 |
| `ac` | Accepted（通过） |
| `wa` | Wrong Answer |
| `tle` | Time Limit Exceeded |
| `mle` | Memory Limit Exceeded |
| `re` | Runtime Error |
| `ce` | Compilation Error |

### 19.7 题目可见性

| 可见性 | 说明 |
|--------|------|
| `public` | 全平台公开 |
| `campus` | 校区内可见 |
| `class` | 班级内可见 |
| `private` | 仅作者和管理员可见 |
