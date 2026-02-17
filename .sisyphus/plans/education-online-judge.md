# 教育背景OnlineJudge系统完整实现计划

## Context

### Original Request
用户要求从头开始实现一个基于教育背景的OnlineJudge系统，包含4级角色体系（总Root、校区Root、教师、学生），支持6大核心功能（题目管理、在线评测、排行榜、作业/竞赛、防作弊、社区互动），预期规模<1000用户。

### Interview Summary

**Key Discussions**:
- **技术栈选择**：Rust + Axum（后端）、Angular + TypeScript（前端）、PostgreSQL + Redis（数据库）、原生进程 + chroot/cgroups（沙箱）、Docker Compose（部署）
- **编程语言支持**：Python 3、C/C++
- **用户注册方式**：管理员批量导入，不支持开放注册
- **防作弊策略**：相似度检测、时间分析、运行特征、教师人工审核（显示数据，不自动标记）
- **测试策略**：TDD（红-绿-重构）
- **部署配置**：Docker Compose + 初始化脚本 + 环境变量
- **初始数据**：示例题目、测试用例、初始管理员账号
- **范围边界**：包含通知系统、文档系统、监控系统；排除付费/订阅功能

**Research Findings**:

1. **OnlineJudge架构**：
   - 三层架构 + 微服务模式（单体模块化实现）
   - 核心组件：题目管理、提交服务、评测服务、用户服务、竞赛服务、通知服务
   - 懒惰评测策略：遇到高优先级错误（RTE、MLE、TLE等）立即停止
   - 队列管理：Redis Streams（Rust原生）
   - 评测结果优先级：IE > RTE > OLE > MLE > TLE > WA > AC

2. **权限系统设计**：
   - Tenant ID列 + 应用层过滤（所有表包含organization_id）
   - 中间件自动设置租户上下文
   - TenantAwareModel自动过滤所有查询
   - 层级委托：Root → Campus → Teacher → Student
   - ClassEnrollment中间表管理教师学生关系

3. **评测系统实现**：
   - 沙箱隔离：Linux Cgroups v2 + Chroot + Seccomp-BPF
   - **严禁**：Docker特权模式（有CVE漏洞）
   - 测试用例：Kattis Problem Package格式（Sample + Secret）
   - 防作弊：MOSS算法或AST比对 + 教师最终判定
   - 性能优化：懒惰评测、结果缓存、编译缓存

### Metis Review

**Identified Gaps (addressed in plan)**:

**User's Final Decisions**:
1. **✅ 组织模型**：**学校 == tenant，校区是子层级**（更灵活，适合教育集团）
2. **✅ 题目可见性**：**支持所有级别**（全局/校区/班级/私有，最灵活但最复杂）
3. **✅ 竞赛规则**：**ACM赛制**（标准竞赛模式，排名基于AC数量和总时间，支持封榜和罚时）
4. **✅ 提交策略**：**允许无限提交，取最好成绩**（最适合学习场景，鼓励练习）

**Minor - Self-Resolved (defaults applied)**:
1. **账号生命周期**：默认支持改密码、禁用/毕业归档、找回密码（邮件验证）
2. **班级/课程/学期**：作业挂在班级entity，需要学期切换与历史数据保留
3. **评测一致性**：同题不同语言允许不同限制，支持多组测试数据
4. **讨论区边界**：与题目绑定，支持Markdown、@教师，需要审核与举报
5. **查重范围**：同作业内+同班，报告仅教师/校区Root可见，保存6个月
6. **运维目标**：99%可用性、每日备份、日志保留30天

**Ambiguous - Defaults Applied**:
1. **并发峰值**：作业截止前可能尖峰，预设支持100 QPS
2. **Cgroups可用性**：假设部署环境为Linux，内核>=5.19，cgroups v2已启用
3. **编译环境版本**：Python 3.11、GCC 13、Clang 16（在Docker镜像中固定）
4. **SSO集成**：默认无SSO，仅本地账号
5. **Redis Streams语义**：需要持久化（AOF）、消费组、重试/死信队列
6. **通知实现**：WebSocket + 事件流，降级为短轮询（5秒）
7. **时区处理**：所有时间存储为UTC，前端按校区时区显示

**Guardrails Applied (from Metis review)**:
- **MUST NOT**：开放注册、付费/订阅、复杂微服务拆分、Kubernetes部署
- **评测安全红线**：无特权容器、最小权限用户、网络默认禁用、资源限制强制生效
- **租户隔离红线**：所有查询必须带tenant/campus约束、严禁前端过滤
- **TDD范围**：领域层、服务层、权限层、评测队列必须TDD；UI层可轻测
- **API稳定性**：先定OpenAPI契约，再实现，避免前后端漂移

---

## Work Objectives

### Core Objective
构建一个生产就绪的教育OnlineJudge系统，包含4级角色权限体系、6大核心功能、安全的代码评测沙箱、完整的租户隔离，支持<1000用户的并发访问。

### Concrete Deliverables
- Rust + Axum后端API服务（单体模块化）
- Angular + TypeScript前端应用
- PostgreSQL数据库schema + migrations
- 评测Worker服务（chroot + cgroups隔离）
- Docker Compose部署配置
- 初始化脚本 + 示例数据
- API文档（OpenAPI）
- 帮助文档

### Definition of Done
- [ ] 所有6大核心功能实现并验收通过
- [ ] TDD测试覆盖率达到领域/服务/权限层80%+
- [ ] 评测沙箱安全基线通过（无特权、网络隔离、资源限制）
- [ ] 租户隔离测试通过（无数据泄露）
- [ ] Docker Compose一键启动成功
- [ ] API文档完整并可用
- [ ] 示例数据导入成功
- [ ] 所有已知bug修复

### Must Have
- 4级角色权限系统（Root、校区Root、教师、学生）
- Tenant ID数据隔离
- 题目CRUD + 测试用例管理
- 代码提交 + 评测（Python 3, C/C++）
- 排行榜（学生/班级/校园级别）
- 作业管理（教师布置、截止时间、学生提交）
- 防作弊（相似度显示、时间/运行特征分析、教师审核）
- 社区讨论（与题目绑定、Markdown、@教师）
- WebSocket实时通知
- Docker Compose部署
- 示例数据

### Must NOT Have (Guardrails)
- ❌ 开放注册（仅管理员批量导入）
- ❌ 付费/订阅功能
- ❌ 复杂微服务拆分（保持单体模块化）
- ❌ Kubernetes部署（仅Docker Compose）
- ❌ Docker特权模式（评测沙箱）
- ❌ 前端过滤租户数据
- ❌ 评测结果自动处罚（仅显示数据，教师人工判定）

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Rust内置测试框架 `cargo test`)
- **User wants tests**: YES (TDD - 红绿重构)
- **Framework**: Rust built-in + tarpaulin（代码覆盖率）

### TDD Enabled

**Task Structure (RED-GREEN-REFACTOR)**:

**Phase 1: RED - Write Failing Test**
```bash
# Create test file: src/module_name/tests/integration_test.rs
cargo test module_name::test_name

# Expected: FAIL (test exists, implementation doesn't)
```

**Phase 2: GREEN - Implement Minimum Code**
```rust
// src/module_name/mod.rs
impl Module {
    pub fn function_name(&self) -> Result<...> {
        // Minimum implementation to pass test
    }
}
```

**Phase 3: REFACTOR - Clean Up**
```bash
cargo test module_name

# Expected: PASS (all tests still green)
# Then run clippy, fmt
cargo clippy -- -D warnings
cargo fmt
```

**Test Organization**:
```
src/
├── auth/
│   ├── mod.rs
│   ├── models.rs
│   └── tests/
│       ├── unit_test.rs       # Fast, pure functions
│       └── integration_test.rs # Slower, DB interactions
├── judge/
│   ├── mod.rs
│   ├── sandbox.rs
│   └── tests/
│       ├── sandbox_test.rs
│       └── queue_test.rs
└── ...
```

**Coverage Target**:
- Domain/Service layers: ≥80%
- Permission/RBAC: ≥90% (critical)
- Judge/Sandbox: ≥80%
- Frontend: ≥60% (UI lighter)

**Pre-commit Hooks**:
```bash
#!/bin/bash
# .git/hooks/pre-commit
cargo fmt --check
cargo clippy -- -D warnings
cargo test --quiet
```

### Manual Execution Verification (ALWAYS include, even with tests)

**For Backend/API changes**:
- [ ] Request: `curl -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"password"}'`
- [ ] Response status: 200
- [ ] Response body contains: `{"token":"...","user":{...}}`

**For Frontend/UI changes**:
- [ ] Using playwright browser automation:
  - Navigate to: `http://localhost:4200`
  - Action: Login with admin credentials
  - Verify: Dashboard appears, role displayed correctly
  - Screenshot: Save evidence to `.sisyphus/evidence/[task-id]-login.png`

**For Judge/Sandbox changes**:
- [ ] Manual test submission:
  - Create test problem
  - Submit Python solution (AC, WA, TLE cases)
  - Verify: All verdicts correct, time/memory limits enforced
  - Verify: Chroot isolation works (no file access outside sandbox)

**For Database migrations**:
- [ ] Apply: `diesel migration run`
- [ ] Verify: `diesel migration list` → shows all migrations applied
- [ ] Verify: `psql -d online_judge -c "\dt"` → all tables created correctly

---

## Task Flow

```
Setup → Auth & RBAC → Database Schema → Judge Sandbox → Judge Queue → Problem Management → Submission & Evaluation → Leaderboard → Assignment/Contest → Anti-Cheat → Discussion → Frontend → Deployment → Testing → Documentation
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 2, 3, 4 | Independent infrastructure setup |
| B | 5, 6, 7 | Core backend services (depends on A) |
| C | 12, 13 | Frontend (can start after API skeleton) |

| Task | Depends On | Reason |
|------|------------|--------|
| 5 | 2, 3, 4 | Needs auth + DB schema |
| 6 | 2, 3 | Needs RBAC + DB |
| 9 | 5, 6 | Needs problem + submission services |
| 12 | 2, 3, 5 | Needs auth + problems + API skeleton |
| 16 | 1-15 | Wait for all backend |

---

## TODOs

### Phase 1: Project Setup & Infrastructure

- [ ] 1. **初始化Rust项目结构**

  **What to do**:
  - Create Cargo workspace: `Cargo.toml` with members `api`, `judge-worker`, `shared`
  - Initialize Axum web server in `api/`
  - Set up shared types in `shared/`
  - Configure basic logging (`tracing`, `tracing-subscriber`)

  **Must NOT do**:
  - Start implementing business logic yet
  - Add database models without schema design

  **Parallelizable**: NO

  **References**:

  **Pattern References** (existing code to follow):
  - Axum workspace pattern: `https://github.com/tokio-rs/axum/blob/main/examples/workspace/Cargo.toml`
  - Cargo workspace: `https://doc.rust-lang.org/book/ch14-03-cargo-workspaces.html`

  **API/Type References** (contracts to implement against):
  - OpenAPI 3.0 spec: `https://swagger.io/specification/`

  **Test References**:
  - Rust testing: `https://doc.rust-lang.org/book/ch11-00-testing.html`

  **Documentation References**:
  - Axum docs: `https://docs.rs/axum/latest/axum/`
  - Tokio runtime: `https://tokio.rs/`

  **WHY Each Reference Matters**:
  - Axum workspace pattern: Ensures modular structure from day one
  - OpenAPI spec: Standard API contract for frontend integration

  **Acceptance Criteria**:
  - [ ] **RED**: Test: `cargo test` → Workspace compiles
  - [ ] **GREEN**: Run `cargo build --release` → Success
  - [ ] **REFACTOR**: Run `cargo clippy` → 0 warnings
  - [ ] Manual: Run `cargo run -p api` → Server starts on :8080

  **Manual Execution Verification**:
  - [ ] Command: `cargo new --lib shared && cargo new --bin api`
  - [ ] Verify: `tree -L 2` → Shows workspace structure
  - [ ] Verify: `cargo build` → All packages compile
  - [ ] Verify: `cargo run -p api` → Log: "Listening on http://0.0.0.0:8080"

  **Evidence Required**:
  - [ ] `Cargo.toml` workspace configuration
  - [ ] Terminal output showing successful build
  - [ ] Server startup log

  **Commit**: NO

---

- [ ] 2. **配置数据库连接与ORM**

  **What to do**:
  - Add dependencies: `sqlx`, `tokio-postgres`, `dotenv`
  - Create `.env` template with DATABASE_URL, REDIS_URL
  - Implement database connection pool in `api/db/mod.rs`
  - Add database migrations setup

  **Must NOT do**:
  - Define any domain models yet
  - Create migrations without schema design

  **Parallelizable**: YES (with tasks 1, 3, 4)

  **References**:

  **Pattern References**:
  - SQLx connection pool: `https://docs.rs/sqlx/latest/sqlx/struct.Pool.html`
  - PostgreSQL pool pattern: `https://github.com/launchbadge/sqlx/blob/main/examples/postgres/axum-simple/src/main.rs`

  **Test References**:
  - SQLx test fixtures: `https://github.com/launchbadge/sqlx/blob/main/README.md#testing`

  **Documentation References**:
  - SQLx docs: `https://docs.rs/sqlx/latest/sqlx/`
  - PostgreSQL connection: `https://docs.rs/tokio-postgres/latest/tokio_postgres/`

  **WHY Each Reference Matters**:
  - SQLx pool: Async database access for Axum
  - Test fixtures: Database testing pattern

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Database connection fails → Panic with clear error
  - [ ] **GREEN**: Run `cargo test db::tests::test_connection` → PASS (connects successfully)
  - [ ] **REFACTOR**: Extract pool to module, add `connection_limit` config
  - [ ] Manual: Start app with invalid DATABASE_URL → Graceful error message

  **Manual Execution Verification**:
  - [ ] Command: `psql -d online_judge -c "SELECT 1"` → Returns 1 (DB ready)
  - [ ] Command: `cargo run -p api` → Log: "Connected to PostgreSQL"
  - [ ] Verify: `curl http://localhost:8080/health/db` → `{"status":"healthy","db":"connected"}`

  **Evidence Required**:
  - [ ] `.env` template
  - [ ] Database connection pool code
  - [ ] Terminal output showing successful connection

  **Commit**: NO

---

- [ ] 3. **配置Redis与消息队列**

  **What to do**:
  - Add dependencies: `redis`, `deadpool-redis`
  - Create Redis connection pool in `api/redis/mod.rs`
  - Implement Redis Streams for submission queue
  - Add Redis cache helpers (get, set, delete, exists)

  **Must NOT do**:
  - Implement queue consumer yet
  - Define queue message structure

  **Parallelizable**: YES (with tasks 1, 2, 4)

  **References**:

  **Pattern References**:
  - Redis Streams: `https://redis.io/docs/data-types/streams/`
  - Rust Redis client: `https://docs.rs/redis/latest/redis/`

  **Test References**:
  - Redis integration tests: `https://github.com/redis-rs/redis-rs/blob/master/tests/integration_async.rs`

  **Documentation References**:
  - Redis Streams commands: `https://redis.io/commands/`

  **WHY Each Reference Matters**:
  - Redis Streams: Built-in pub/sub for async job queue
  - Pool pattern: Reuse connections efficiently

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Redis connection fails → Error logged
  - [ ] **GREEN**: Run `cargo test redis::tests::test_stream` → PASS (creates stream, adds message, reads message)
  - [ ] **REFACTOR**: Extract stream operations to trait
  - [ ] Manual: Start app with invalid REDIS_URL → Graceful error

  **Manual Execution Verification**:
  - [ ] Command: `redis-cli ping` → `PONG` (Redis ready)
  - [ ] Command: `redis-cli XLEN submission_queue` → Returns 0 (queue exists)
  - [ ] Verify: `cargo run -p api` → Log: "Connected to Redis"

  **Evidence Required**:
  - [ ] Redis pool code
  - [ ] Redis Streams helper functions
  - [ ] Terminal output showing connection

  **Commit**: NO

---

- [ ] 4. **实现租户隔离中间件**

  **What to do**:
  - Create `api/middleware/tenant.rs`
  - Extract tenant_id from JWT token or request header
  - Store tenant_id in request extension
  - Create `TenantContext` struct for request scope
  - Implement tenant validation middleware

  **Must NOT do**:
  - Define tenant model yet
  - Implement RBAC checks

  **Parallelizable**: YES (with tasks 1, 2, 3)

  **References**:

  **Pattern References**:
  - Axum middleware: `https://docs.rs/axum/latest/axum/middleware/index.html`
  - Request extensions: `https://docs.rs/axum/latest/axum/struct.Extension.html`

  **Test References**:
  - Axum middleware tests: `https://github.com/tokio-rs/axum/blob/main/examples/middleware/src/main.rs`

  **Documentation References**:
  - Axum extractor pattern: `https://docs.rs/axum/latest/axum/extract/index.html`

  **WHY Each Reference Matters**:
  - Middleware pattern: Ensure all requests have tenant context
  - Request extension: Pass tenant_id to handlers

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Request without tenant_id → 401 Unauthorized
  - [ ] **GREEN**: Run `cargo test tenant::tests::test_middleware` → PASS (tenant_id extracted, stored in extension)
  - [ ] **REFACTOR**: Extract tenant extraction logic to trait
  - [ ] Manual: curl with invalid tenant header → 401

  **Manual Execution Verification**:
  - [ ] Command: `curl -H "X-Tenant-ID: invalid" http://localhost:8080/api/v1/health` → 401
  - [ ] Command: `curl -H "Authorization: Bearer <valid-token>" http://localhost:8080/api/v1/health` → 200
  - [ ] Verify: Tenant ID logged in request

  **Evidence Required**:
  - [ ] Middleware code
  - [ ] Tenant context struct
  - [ ] Test output showing 401 for invalid tenant

  **Commit**: NO

---

### Phase 2: Authentication & RBAC

- [ ] 5. **实现用户认证系统（JWT）**

  **What to do**:
  - Define User model in `shared/models/user.rs`
  - Implement password hashing with `argon2`
  - Create JWT token generation/validation with `jsonwebtoken`
  - Implement login endpoint: `POST /api/v1/auth/login`
  - Implement token refresh endpoint: `POST /api/v1/auth/refresh`
  - Add password hash/verify utilities

  **Must NOT do**:
  - Implement password reset yet
  - Define role/permission models

  **Parallelizable**: NO (depends on tasks 1, 2, 3, 4)

  **References**:

  **Pattern References**:
  - JWT with Axum: `https://github.com/tokio-rs/axum/blob/main/examples/jwt/src/main.rs`
  - Argon2 hashing: `https://docs.rs/argon2/latest/argon2/`

  **API References**:
  - Login request: `{"email": "string", "password": "string"}`
  - Login response: `{"token": "string", "refresh_token": "string", "user": {"id": "...", "email": "..."}}`

  **Test References**:
  - JWT validation tests: `https://github.com/tokio-rs/axum/blob/main/examples/jwt/tests/integration_test.rs`

  **Documentation References**:
  - JWT standard: `https://jwt.io/`
  - Argon2 RFC: `https://datatracker.ietf.org/doc/html/rfc9106`

  **WHY Each Reference Matters**:
  - Axum JWT example: Proven pattern for auth in Axum
  - Argon2: Industry-standard password hashing

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Invalid credentials → 401
  - [ ] **GREEN**: Run `cargo test auth::tests::test_login` → PASS (valid credentials return JWT)
  - [ ] **REFACTOR**: Extract JWT config to env variables
  - [ ] Manual: Login with admin credentials → JWT token returned

  **Manual Execution Verification**:
  - [ ] Request: `curl -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"Admin123!"}'`
  - [ ] Response status: 200
  - [ ] Response body contains: `{"token":"...","refresh_token":"..."}`
  - [ ] Verify: Decode JWT with `jwt.io` → Contains user_id, tenant_id

  **Evidence Required**:
  - [ ] User model code
  - [ ] Login endpoint code
  - [ ] JWT token validation code
  - [ ] Test output
  - [ ] curl response

  **Commit**: YES
  - Message: `feat(auth): implement JWT login and token validation`
  - Files: `api/src/auth/mod.rs`, `shared/src/models/user.rs`, `api/src/middleware/auth.rs`
  - Pre-commit: `cargo test auth`

---

- [ ] 6. **实现RBAC权限系统**

  **What to do**:
  - Define Role enum: Root, CampusAdmin, Teacher, Student
  - Define Permission enum (granular permissions)
  - Create UserRole junction table (user_id, organization_id, role)
  - Implement permission checking service
  - Create authorization middleware: `require_permission()`
  - Add permission decorators for routes

  **Must NOT do**:
  - Implement tenant management yet
  - Define teacher-student relationship

  **Parallelizable**: NO (depends on task 5)

  **References**:

  **Pattern References**:
  - RBAC with Axum: `https://github.com/tokio-rs/axum/blob/main/examples/authz/src/main.rs`
  - Enum-based permissions: `https://doc.rust-lang.org/book/ch06-00-enums.html`

  **Test References**:
  - Permission tests: `https://github.com/tokio-rs/axum/blob/main/examples/authz/tests/auth_test.rs`

  **Documentation References**:
  - Oso RBAC guide: `https://www.osohq.com/docs/ruby/api-guide/rbac`

  **WHY Each Reference Matters**:
  - Axum authz example: Middleware-based permission checking
  - Enum permissions: Type-safe permission definitions

  **Acceptance Criteria**:
  - [ ] **RED**: Test: User without permission → 403 Forbidden
  - [ ] **GREEN**: Run `cargo test rbac::tests::test_permission_check` → PASS (admin can access, student cannot)
  - [ ] **REFACTOR**: Extract permission rules to config
  - [ ] Manual: Admin accesses protected endpoint → 200, student → 403

  **Manual Execution Verification**:
  - [ ] Request: `curl -H "Authorization: Bearer <admin-token>" http://localhost:8080/api/v1/admin/users` → 200
  - [ ] Request: `curl -H "Authorization: Bearer <student-token>" http://localhost:8080/api/v1/admin/users` → 403
  - [ ] Verify: RBAC logs show permission check

  **Evidence Required**:
  - [ ] Role/Permission enum code
  - [ ] Permission checking service
  - [ ] Authorization middleware
  - [ ] Test output
  - [ ] curl responses

  **Commit**: YES
  - Message: `feat(rbac): implement role-based access control`
  - Files: `api/src/rbac/mod.rs`, `api/src/middleware/authz.rs`, `shared/src/models/role.rs`
  - Pre-commit: `cargo test rbac`

---

- [ ] 7. **实现租户组织管理**

  **What to do**:
  - Define Organization model (id, name, slug, parent_id, type)
  - Implement tenant CRUD endpoints
  - Add tenant isolation to all queries (via TenantAwareModel trait)
  - Create tenant creation validation (Root only)
  - Implement tenant listing for admin users

  **Must NOT do**:
  - Implement user import yet
  - Define campus hierarchy rules

  **Parallelizable**: NO (depends on task 6)

  **References**:

  **Pattern References**:
  - Tenant-aware queries: `https://github.com/launchbadge/sqlx/blob/main/examples/postgres/axum-simple/src/main.rs`
  - Organization hierarchy: `https://github.com/mozilla/mentat/blob/main/crates/core/src/models/organization.rs`

  **Test References**:
  - Tenant isolation tests: `https://github.com/launchbadge/sqlx/blob/main/tests/integration.rs`

  **Documentation References**:
  - SQLx query builder: `https://docs.rs/sqlx/latest/sqlx/query/index.html`

  **WHY Each Reference Matters**:
  - Tenant-aware pattern: Ensure all queries filter by tenant_id
  - Organization hierarchy: Support multi-level tenant structure

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Query without tenant_id → Return empty
  - [ ] **GREEN**: Run `cargo test tenant::tests::test_isolation` → PASS (tenant1 sees data, tenant2 doesn't)
  - [ ] **REFACTOR**: Extract tenant filtering to macro
  - [ ] Manual: Create tenant1 and tenant2 → Data isolated correctly

  **Manual Execution Verification**:
  - [ ] Command: `psql -d online_judge -c "SELECT id, name FROM organizations WHERE slug='campus-a'"`
  - [ ] Verify: Returns campus-a organization
  - [ ] Verify: Query as tenant1 → sees only tenant1 data

  **Evidence Required**:
  - [ ] Organization model code
  - [ ] Tenant filtering trait
  - [ ] Tenant CRUD endpoints
  - [ ] Test output
  - [ ] SQL query results

  **Commit**: YES
  - Message: `feat(tenant): implement organization model and tenant isolation`
  - Files: `api/src/tenant/mod.rs`, `shared/src/models/organization.rs`, `migrations/00X_create_organizations.sql`
  - Pre-commit: `cargo test tenant`

---

### Phase 3: Database Schema & Migrations

- [ ] 8. **设计并实现完整数据库Schema**

  **What to do**:
  - Design complete schema with all tables and relationships
  - Create SQLx migrations:
    - Organizations (tenant hierarchy)
    - Users (with tenant_id)
    - UserRoles (junction: user-tenant-role)
    - Problems (with tenant_id, author_id)
    - TestCases (problem_id, input, output, is_secret)
    - Submissions (tenant_id, user_id, problem_id, status, verdict, time_ms, memory_kb)
    - TestCaseResults (submission_id, test_case_id, verdict)
    - Classes (tenant_id, name, teacher_id)
    - ClassEnrollments (class_id, student_id, teacher_id, status)
    - Assignments (class_id, problem_id, deadline)
    - Contests (tenant_id, name, start_time, end_time, rules)
    - ContestSubmissions (contest_id, submission_id)
    - Discussions (problem_id, user_id, content, parent_id)
    - DiscussionReplies (discussion_id, user_id, content)
    - PlagiarismReports (submission1_id, submission2_id, similarity_score, status)
  - Add indexes on all tenant_id columns
  - Add foreign key constraints

  **Must NOT do**:
  - Implement business logic yet
  - Create test data (next task)

  **Parallelizable**: NO (foundation for all features)

  **References**:

  **Pattern References**:
  - SQLx migrations: `https://docs.rs/sqlx/latest/sqlx/migrate/`
  - Database schema design: `https://github.com/QingdaoU/OnlineJudge/blob/master/problem/models.py`

  **Test References**:
  - Migration tests: `https://github.com/launchbadge/sqlx/blob/main/tests/migrate.rs`

  **Documentation References**:
  - PostgreSQL schema: `https://www.postgresql.org/docs/current/ddl.html`

  **WHY Each Reference Matters**:
  - SQLx migrations: Version-controlled database schema
  - QingdaoU models: Proven OJ schema patterns

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Migration fails → Clear error
  - [ ] **GREEN**: Run `cargo test schema::tests::test_migrations` → PASS (all tables created, indexes work)
  - [ ] **REFACTOR**: Extract common columns to trait
  - [ ] Manual: Run `diesel migration run` → All migrations applied

  **Manual Execution Verification**:
  - [ ] Command: `diesel migration list` → Shows all migrations
  - [ ] Command: `psql -d online_judge -c "\dt"` → Shows all tables
  - [ ] Command: `psql -d online_judge -c "\d+ users"` → Shows user schema with tenant_id
  - [ ] Verify: All foreign keys exist

  **Evidence Required**:
  - [ ] Migration SQL files
  - [ ] Schema diagram
  - [ ] Terminal output showing successful migrations
  - [ ] `\d+` output for key tables

  **Commit**: YES
  - Message: `feat(schema): design and implement complete database schema`
  - Files: `migrations/*.sql`, `api/src/db/schema.rs`
  - Pre-commit: `cargo test schema`

---

### Phase 4: Judge Sandbox Implementation

- [ ] 9. **实现评测沙箱（chroot + cgroups）**

  **What to do**:
  - Create `judge-worker/src/sandbox/mod.rs`
  - Implement chroot environment setup
  - Implement cgroups v2 configuration (CPU, memory, pids, time limits)
  - Create process spawning with isolation
  - Implement seccomp-BPF syscall filtering
  - Add resource monitoring (CPU time, memory usage, wall time)
  - Implement output capture and truncation
  - Add security checks (no network, read-only filesystem)

  **Must NOT do**:
  - Use Docker privileged mode
  - Allow network access
  - Allow filesystem writes outside sandbox

  **Parallelizable**: NO (core judge component)

  **References**:

  **Pattern References**:
  - chroot setup: `https://man7.org/linux/man-pages/man2/chroot.2.html`
  - cgroups v2: `https://docs.kernel.org/admin-guide/cgroup-v2.html`
  - seccomp-BPF: `https://docs.kernel.org/userspace-api/seccomp.html`

  **Test References**:
  - Sandbox security tests: `https://github.com/judge0/judge0/blob/master/tests/isolate_test.py`

  **Documentation References**:
  - DOMjudge judgehost docs: `https://www.domjudge.org/docs/manual/main/install-judgehost.html`

  **WHY Each Reference Matters**:
  - DOMjudge: Production-proven sandbox pattern
  - cgroups v2: Modern resource limits
  - seccomp: Syscall-level security

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Sandbox escape attempt → Blocked
  - [ ] **GREEN**: Run `cargo test sandbox::tests::test_isolation` → PASS (file access blocked, network disabled, CPU limit enforced)
  - [ ] **REFACTOR**: Extract sandbox operations to trait
  - [ ] Manual: Run Python script reading /etc/passwd → Permission denied

  **Manual Execution Verification**:
  - [ ] Create test Python script: `print(open('/etc/passwd').read())`
  - [ ] Run in sandbox → Output: "Permission denied"
  - [ ] Create infinite loop script → Terminates after time limit
  - [ ] Create memory-hungry script → Terminates after memory limit

  **Evidence Required**:
  - [ ] Sandbox implementation code
  - [ ] chroot setup code
  - [ ] cgroups configuration code
  - [ ] Test output showing security violations blocked
  - [ ] Terminal output showing resource limits enforced

  **Commit**: YES
  - Message: `feat(judge): implement secure sandbox with chroot + cgroups`
  - Files: `judge-worker/src/sandbox/mod.rs`, `judge-worker/src/sandbox/cgroups.rs`, `judge-worker/src/sandbox/chroot.rs`
  - Pre-commit: `cargo test sandbox`

---

- [ ] 10. **实现编译器与运行时配置**

  **What to do**:
  - Create `judge-worker/src/compiler/mod.rs`
  - Implement C/C++ compilation with GCC/Clang
  - Implement Python 3 interpreter configuration
  - Add compilation error capture
  - Implement language-specific limits (Python recursion, threads)
  - Create language registry (version, compiler path, flags)
  - Add compilation timeout

  **Must NOT do**:
  - Allow arbitrary compiler flags (security risk)
  - Use system-wide compiler without isolation

  **Parallelizable**: NO (depends on task 9)

  **References**:

  **Pattern References**:
  - GCC compilation flags: `https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html`
  - Python interpreter config: `https://docs.python.org/3/using/cmdline.html`

  **Test References**:
  - Compiler tests: `https://github.com/DMOJ/online-judge/blob/master/dmoj/judgeenv.py`

  **Documentation References**:
  - Dockerfile patterns: `https://github.com/judge0/judge0/tree/master/images`

  **WHY Each Reference Matters**:
  - DMOJ judgeenv: Proven language configuration
  - GCC flags: Secure compilation settings

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Invalid C++ code → Compilation error captured
  - [ ] **GREEN**: Run `cargo test compiler::tests::test_compilation` → PASS (valid code compiles, errors captured)
  - [ ] **REFACTOR**: Extract language config to TOML file
  - [ ] Manual: Compile test C++ → Binary generated

  **Manual Execution Verification**:
  - [ ] Create test C++ file with syntax error → Compiler error message returned
  - [ ] Create valid C++ "Hello World" → Binary created, runs successfully
  - [ ] Create Python script with import error → Syntax error captured
  - [ ] Verify: Compilation timeout enforced

  **Evidence Required**:
  - [ ] Compiler implementation code
  - [ ] Language registry config
  - [ ] Test output showing compilation errors
  - [ ] Terminal output showing successful compilation

  **Commit**: YES
  - Message: `feat(judge): implement compiler for C/C++ and Python 3`
  - Files: `judge-worker/src/compiler/mod.rs`, `judge-worker/src/compiler/config.toml`
  - Pre-commit: `cargo test compiler`

---

### Phase 5: Judge Queue & Processing

- [ ] 11. **实现提交队列（Redis Streams）**

  **What to do**:
  - Create `judge-worker/src/queue/mod.rs`
  - Define Submission message structure (JSON)
  - Implement Redis Streams producer (add submission to queue)
  - Implement Redis Streams consumer (worker process)
  - Add consumer group for parallel workers
  - Implement message acknowledgment (ACK)
  - Add dead-letter queue for failed tasks
  - Implement retry logic (exponential backoff)

  **Must NOT do**:
  - Implement submission processing yet
  - Define verdict schema yet

  **Parallelizable**: NO (core queue component)

  **References**:

  **Pattern References**:
  - Redis Streams: `https://redis.io/docs/data-types/streams/`
  - Consumer groups: `https://redis.io/docs/data-types/streams/#consumer-groups`

  **Test References**:
  - Queue tests: `https://github.com/redis-rs/redis-rs/blob/master/tests/integration_async.rs`

  **Documentation References**:
  - Redis Streams commands: `https://redis.io/commands/stream`

  **WHY Each Reference Matters**:
  - Redis Streams: Built-in pub/sub for job queues
  - Consumer groups: Parallel processing support

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Queue not available → Error logged
  - [ ] **GREEN**: Run `cargo test queue::tests::test_produce_consume` → PASS (message added, consumed, ACKed)
  - [ ] **REFACTOR**: Extract queue operations to trait
  - [ ] Manual: Add submission to queue → Consumer receives message

  **Manual Execution Verification**:
  - [ ] Command: `redis-cli XADD submission_queue * submission_id 123 problem_id 456` → Message added
  - [ ] Command: `redis-cli XREADGROUP GROUP workers worker1 COUNTS 1 STREAMS submission_queue >` → Message received
  - [ ] Command: `redis-cli XACK submission_queue worker1 <message-id>` → Message ACKed

  **Evidence Required**:
  - [ ] Queue implementation code
  - [ ] Producer/consumer code
  - [ ] Test output
  - [ ] Redis CLI output

  **Commit**: YES
  - Message: `feat(queue): implement Redis Streams for submission queue`
  - Files: `judge-worker/src/queue/mod.rs`, `judge-worker/src/queue/consumer.rs`, `judge-worker/src/queue/producer.rs`
  - Pre-commit: `cargo test queue`

---

- [ ] 12. **实现评测处理逻辑**

  **What to do**:
  - Create `judge-worker/src/processor/mod.rs`
  - Define verdict enum: AC, WA, RTE, TLE, MLE, OLE, CE, IE
  - Implement lazy evaluation (stop on high-priority error)
  - Create test case execution loop
  - Implement output comparison (exact + floating-point tolerance)
  - Add verdict priority handling
  - Implement result serialization to JSON
  - Update submission status in database

  **Must NOT do**:
  - Implement custom validators yet
  - Add plagiarism detection

  **Parallelizable**: NO (depends on tasks 9, 10, 11)

  **References**:

  **Pattern References**:
  - Lazy evaluation: DOMjudge docs `https://www.domjudge.org/docs/manual/main/judging.html`
  - Verdict definitions: DMOJ `https://dmoj.ca/about/codes/`

  **Test References**:
  - Evaluation tests: `https://github.com/QingdaoU/OnlineJudge/blob/master/judge/judge_server.py`

  **Documentation References**:
  - Output comparison: `https://www.kattis.com/problem-package-format/spec/output_validators`

  **WHY Each Reference Matters**:
  - Lazy evaluation: Optimize judge performance
  - Verdict priority: Clear status display

  **Acceptance Criteria**:
  - [ ] **RED**: Test: TLE detected → Verdict: TLE, execution stopped
  - [ ] **GREEN**: Run `cargo test processor::tests::test_lazy_eval` → PASS (AC → all tests, WA → stop after first fail)
  - [ ] **REFACTOR**: Extract verdict logic to enum impl
  - [ ] Manual: Submit AC solution → All tests pass

  **Manual Execution Verification**:
  - [ ] Create problem with 3 test cases (AC, WA, WA)
  - [ ] Submit solution with WA on case 2 → Verdict: WA (stops at case 2, doesn't run case 3)
  - [ ] Submit infinite loop → Verdict: TLE (after time limit)
  - [ ] Submit segmentation fault → Verdict: RTE

  **Evidence Required**:
  - [ ] Processor implementation code
  - [ ] Verdict enum
  - [ ] Lazy evaluation logic
  - [ ] Test output
  - [ ] Database submission record showing verdict

  **Commit**: YES
  - Message: `feat(judge): implement submission evaluation with lazy evaluation`
  - Files: `judge-worker/src/processor/mod.rs`, `shared/src/models/verdict.rs`, `shared/src/models/submission.rs`
  - Pre-commit: `cargo test processor`

---

### Phase 6: Problem Management

- [ ] 13. **实现题目管理API**

  **What to do**:
  - Create problem CRUD endpoints
  - Implement test case upload (sample + secret)
  - Add problem visibility controls (public/private/class-only)
  - Implement problem difficulty tags
  - Create problem search/filter (by difficulty, language)
  - Add problem versioning (immutable test cases)
  - Implement Kattis Problem Package import/export

  **Must NOT do**:
  - Implement custom problem validators yet
  - Add problem discussion (later task)

  **Parallelizable**: NO (depends on tasks 6, 7, 8)

  **References**:

  **Pattern References**:
  - Problem model: QingdaoU `https://github.com/QingdaoU/OnlineJudge/blob/master/problem/models.py`
  - Kattis format: `https://www.kattis.com/problem-package-format/`

  **API References**:
  - POST /api/v1/problems → Create problem
  - GET /api/v1/problems → List problems (filtered by tenant)
  - GET /api/v1/problems/:id → Get problem details
  - PUT /api/v1/problems/:id → Update problem metadata
  - DELETE /api/v1/problems/:id → Delete problem

  **Test References**:
  - Problem CRUD tests: `https://github.com/DMOJ/online-judge/blob/master/dmoj/problem/models.py`

  **Documentation References**:
  - REST API design: `https://restfulapi.net/`

  **WHY Each Reference Matters**:
  - QingdaoU model: Proven problem structure
  - Kattis format: Standard for problem packaging

  **Acceptance Criteria**:
  - [ ] **RED**: Test: User without permission → 403
  - [ ] **GREEN**: Run `cargo test problems::tests::test_crud` → PASS (create, read, update, delete)
  - [ ] **REFACTOR**: Extract problem validation to service
  - [ ] Manual: Create problem via API → Problem visible in list

  **Manual Execution Verification**:
  - [ ] Create problem: `curl -X POST http://localhost:8080/api/v1/problems -H "Authorization: Bearer <teacher-token>" -H "Content-Type: application/json" -d '{"title":"Two Numbers","description":"...","difficulty":"easy"}'`
  - [ ] Response status: 201
  - [ ] List problems: `curl http://localhost:8080/api/v1/problems`
  - [ ] Verify: Problem appears in list

  **Evidence Required**:
  - [ ] Problem CRUD endpoint code
  - [ ] Test case upload code
  - [ ] Problem model code
  - [ ] Test output
  - [ ] curl responses

  **Commit**: YES
  - Message: `feat(problems): implement problem management CRUD API`
  - Files: `api/src/problems/mod.rs`, `api/src/problems/endpoints.rs`, `shared/src/models/problem.rs`
  - Pre-commit: `cargo test problems`

---

### Phase 7: Submission & Evaluation

- [ ] 14. **实现提交评测API**

  **What to do**:
  - Create submission endpoint: `POST /api/v1/submissions`
  - Validate problem exists and is accessible
  - Validate language is supported
  - Implement submission status tracking (QUEUED, COMPILING, RUNNING, JUDGED)
  - Add submission history endpoint
  - Implement submission rejudge (admin only)
  - Create WebSocket channel for real-time updates

  **Must NOT do**:
  - Implement submission filtering by user yet
  - Add plagiarism detection (later task)

  **Parallelizable**: NO (depends on tasks 6, 11, 12, 13)

  **References**:

  **Pattern References**:
  - Submission flow: DOMjudge `https://www.domjudge.org/docs/manual/main/judging.html`
  - WebSocket updates: Axum WebSocket `https://docs.rs/axum/latest/axum/extract/struct.Ws.html`

  **API References**:
  - POST /api/v1/submissions → Submit code
  - GET /api/v1/submissions/:id → Get submission status
  - GET /api/v1/submissions → List submissions (filtered by user/problem)

  **Test References**:
  - Submission tests: `https://github.com/DMOJ/online-judge/blob/master/dmoj/submission/models.py`

  **Documentation References**:
  - Axum WebSocket: `https://docs.rs/axum/latest/axum/extract/struct.Ws.html`

  **WHY Each Reference Matters**:
  - DOMjudge flow: Standard submission lifecycle
  - WebSocket: Real-time status updates

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Submit to non-existent problem → 404
  - [ ] **GREEN**: Run `cargo test submissions::tests::test_submit` → PASS (submission created, status QUEUED)
  - [ ] **REFACTOR**: Extract submission validation to service
  - [ ] Manual: Submit code → Submission queued, judge processes

  **Manual Execution Verification**:
  - [ ] Submit AC solution:
    ```
    curl -X POST http://localhost:8080/api/v1/submissions \
      -H "Authorization: Bearer <student-token>" \
      -H "Content-Type: application/json" \
      -d '{"problem_id":1,"language":"python3","code":"print(input())"}'
    ```
  - [ ] Response status: 201
  - [ ] Response body contains: `{"id": "...", "status": "QUEUED"}`
  - [ ] Verify: Judge worker picks up and processes
  - [ ] Verify: Status updates to JUDGED, verdict AC

  **Evidence Required**:
  - [ ] Submission endpoint code
  - [ ] Status tracking code
  - [ ] WebSocket channel code
  - [ ] Test output
  - [ ] curl responses
  - [ ] Judge worker logs

  **Commit**: YES
  - Message: `feat(submissions): implement submission API and real-time status updates`
  - Files: `api/src/submissions/mod.rs`, `api/src/websocket/mod.rs`, `shared/src/models/submission.rs`
  - Pre-commit: `cargo test submissions`

---

### Phase 8: Leaderboard & Analytics

- [ ] 15. **实现排行榜系统**

  **What to do**:
  - Create leaderboard endpoint: `GET /api/v1/leaderboard`
  - Implement Redis Sorted Sets for ranking
  - Add filtering by scope (class, campus, global)
  - Implement tie-breaking (AC count, total time, last AC)
  - Add leaderboard caching (TTL 5 minutes)
  - Create statistics endpoint (AC rate, submissions per problem)
  - Implement historical ranking snapshots (for contests)

  **Must NOT do**:
  - Implement advanced BI/analytics yet
  - Add export functionality

  **Parallelizable**: NO (depends on tasks 6, 7, 14)

  **References**:

  **Pattern References**:
  - Redis Sorted Sets: `https://redis.io/docs/data-types/sorted-sets/`
  - Leaderboard design: `https://systemdesign.one/leaderboard-system-design/`

  **API References**:
  - GET /api/v1/leaderboard?scope=class&class_id=1 → Class leaderboard
  - GET /api/v1/leaderboard?scope=campus → Campus leaderboard

  **Test References**:
  - Leaderboard tests: `https://github.com/DMOJ/online-judge/blob/master/dmoj/statistics/models.py`

  **Documentation References**:
  - Redis ZSET commands: `https://redis.io/commands/zadd`

  **WHY Each Reference Matters**:
  - Redis ZSET: O(log N) ranking, perfect for leaderboards
  - Tie-breaking: Clear ranking rules

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Filter by invalid scope → 400
  - [ ] **GREEN**: Run `cargo test leaderboard::tests::test_ranking` → PASS (users ranked correctly, ties broken)
  - [ ] **REFACTOR**: Extract ranking logic to service
  - [ ] Manual: Submit solutions → Leaderboard updates

  **Manual Execution Verification**:
  - [ ] Submit AC solutions for user1 (3 ACs, total time 100s) and user2 (3 ACs, total time 90s)
  - [ ] Query leaderboard: `curl http://localhost:8080/api/v1/leaderboard`
  - [ ] Verify: user2 ranked #1 (same AC count, faster time)
  - [ ] Verify: Redis ZSET contains correct scores

  **Evidence Required**:
  - [ ] Leaderboard endpoint code
  - [ ] Redis ZSET code
  - [ ] Test output
  - [ ] curl response
  - [ ] Redis CLI: `redis-cli ZREVRANGE leaderboard 0 10 WITHSCORES`

  **Commit**: YES
  - Message: `feat(leaderboard): implement leaderboard with Redis Sorted Sets`
  - Files: `api/src/leaderboard/mod.rs`, `api/src/leaderboard/ranking.rs`
  - Pre-commit: `cargo test leaderboard`

---

### Phase 9: Assignment & Contest Management

- [ ] 16. **实现作业管理**

  **What to do**:
  - Create class management CRUD
  - Implement student enrollment (batch import)
  - Create assignment endpoint (link problem to class, set deadline)
  - Implement assignment visibility (active students only)
  - Add deadline enforcement (block submissions after deadline)
  - Create assignment submission listing (for teacher)
  - Implement student assignment dashboard

  **Must NOT do**:
  - Implement auto-grading for assignments yet
  - Add group assignments

  **Parallelizable**: NO (depends on tasks 6, 7, 13)

  **References**:

  **Pattern References**:
  - Assignment model: LMS patterns `https://github.com/instructure/canvas-lms`
  - Enrollment: QingdaoU `https://github.com/QingdaoU/OnlineJudge/blob/master/problem/models.py`

  **API References**:
  - POST /api/v1/classes → Create class
  - POST /api/v1/classes/:id/enrollments → Batch enroll students
  - POST /api/v1/assignments → Create assignment
  - GET /api/v1/assignments/:id/submissions → List submissions

  **Test References**:
  - Assignment tests: `https://github.com/DMOJ/online-judge/blob/master/dmoj/problem/models.py`

  **Documentation References**:
  - CSV import: `https://docs.rs/csv/latest/csv/`

  **WHY Each Reference Matters**:
  - Canvas model: Proven LMS structure
  - Batch import: Admin requirement

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Enroll duplicate student → Error
  - [ ] **GREEN**: Run `cargo test assignments::tests::test_enrollment` → PASS (students enrolled, class created)
  - [ ] **REFACTOR**: Extract CSV parsing to service
  - [ ] Manual: Import CSV with 10 students → All enrolled

  **Manual Execution Verification**:
  - [ ] Create CSV file with student data: `students.csv`
  - [ ] Import: `curl -X POST http://localhost:8080/api/v1/classes/1/import -H "Authorization: Bearer <teacher-token>" -F "file=@students.csv"`
  - [ ] Response status: 200
  - [ ] Verify: `psql -d online_judge -c "SELECT COUNT(*) FROM class_enrollments WHERE class_id=1"` → Returns 10

  **Evidence Required**:
  - [ ] Class management code
  - [ ] Enrollment code
  - [ ] Assignment code
  - [ ] CSV parsing code
  - [ ] Test output
  - [ ] curl response
  - [ ] SQL query results

  **Commit**: YES
  - Message: `feat(assignments): implement class and assignment management`
  - Files: `api/src/classes/mod.rs`, `api/src/assignments/mod.rs`, `shared/src/models/class.rs`, `shared/src/models/assignment.rs`
  - Pre-commit: `cargo test assignments`

---

- [ ] 17. **实现竞赛管理**

  **What to do**:
  - Create contest CRUD (name, description, start_time, end_time, rules)
  - Implement contest rules: ACM/IOI/Education
  - Add problem set management (add/remove problems from contest)
  - Implement contest ranking (separate from practice)
  - Create contest freeze (封榜) feature
  - Add contest status (upcoming, active, ended)
  - Implement contest participant registration
  - Add penalty time calculation (for ACM)

  **Must NOT do**:
  - Implement complex contest rules (clarifications, unlocks)
  - Add contest UI (frontend task)

  **Parallelizable**: NO (depends on tasks 6, 7, 13, 15)

  **References**:

  **Pattern References**:
  - Contest model: DMOJ `https://github.com/DMOJ/online-judge/blob/master/dmoj/contest/models.py`
  - ACM rules: ICPC `https://icpc.global/`

  **API References**:
  - POST /api/v1/contests → Create contest
  - POST /api/v1/contests/:id/problems → Add problem
  - GET /api/v1/contests/:id/ranking → Contest ranking

  **Test References**:
  - Contest tests: `https://github.com/DMOJ/online-judge/blob/master/dmoj/contest/models.py`

  **Documentation References**:
  - ACM scoring: `https://icpc.global/regionals/rules`

  **WHY Each Reference Matters**:
  - DMOJ model: Proven contest structure
  - ACM rules: Standard competition format

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Submit after contest end → 403
  - [ ] **GREEN**: Run `cargo test contests::tests::test_ranking` → PASS (ACM scoring correct, freeze works)
  - [ ] **REFACTOR**: Extract contest rules to trait
  - [ ] Manual: Create contest, add problem, submit → Ranking updates

  **Manual Execution Verification**:
  - [ ] Create contest: `curl -X POST http://localhost:8080/api/v1/contests -H "Authorization: Bearer <admin-token>" -H "Content-Type: application/json" -d '{"name":"Contest A","rules":"acm","start_time":"2024-01-01T00:00:00Z","end_time":"2024-01-01T02:00:00Z"}'`
  - [ ] Add problem to contest
  - [ ] Submit AC solution
  - [ ] Query ranking: `curl http://localhost:8080/api/v1/contests/1/ranking`
  - [ ] Verify: Ranking displays correctly

  **Evidence Required**:
  - [ ] Contest CRUD code
  - [ ] Ranking code
  - [ ] Contest rules code
  - [ ] Test output
  - [ ] curl responses

  **Commit**: YES
  - Message: `feat(contests): implement contest management with ACM/IOI rules`
  - Files: `api/src/contests/mod.rs`, `api/src/contests/ranking.rs`, `shared/src/models/contest.rs`
  - Pre-commit: `cargo test contests`

---

### Phase 10: Anti-Cheat & Plagiarism Detection

- [ ] 18. **实现防作弊系统**

  **What to do**:
  - Implement code similarity detection (MOSS-like algorithm or AST comparison)
  - Create submission time analysis (detect simultaneous submissions)
  - Implement runtime characteristic analysis (time/memory similarity)
  - Add plagiarism report generation (JSON format)
  - Create plagiarism review endpoint (teacher/admin only)
  - Implement report visibility (same assignment, same class)
  - Add report retention policy (6 months)

  **Must NOT do**:
  - Auto-punish based on similarity
  - Implement machine learning detection

  **Parallelizable**: NO (depends on tasks 6, 14, 16)

  **References**:

  **Pattern References**:
  - MOSS algorithm: `https://theory.stanford.edu/~aiken/moss/`
  - AST comparison: `https://arxiv.org/pdf/2505.08244`

  **API References**:
  - POST /api/v1/submissions/:id/plagiarism-check → Generate report
  - GET /api/v1/plagiarism-reports → List reports (teacher/admin)
  - GET /api/v1/plagiarism-reports/:id → Get report details

  **Test References**:
  - Plagiarism tests: `https://github.com/DMOJ/online-judge/blob/master/dmoj/problem/models.py`

  **Documentation References**:
  - Code similarity: `https://dl.acm.org/doi/10.1145/1250734.1250753`

  **WHY Each Reference Matters**:
  - MOSS: Industry-standard plagiarism detection
  - AST comparison: Detects obfuscation

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Similar code → Report generated
  - [ ] **GREEN**: Run `cargo test plagiarism::tests::test_detection` → PASS (similar code detected, similarity score calculated)
  - [ ] **REFACTOR**: Extract similarity algorithm to service
  - [ ] Manual: Generate report → Similarity score displayed

  **Manual Execution Verification**:
  - [ ] Submit similar code by user1 and user2
  - [ ] Generate report: `curl -X POST http://localhost:8080/api/v1/plagiarism-check -H "Authorization: Bearer <teacher-token>" -H "Content-Type: application/json" -d '{"submission_id":1,"compare_with":"assignment"}'`
  - [ ] Response status: 200
  - [ ] Response body contains: `{"similar_submissions":[{"submission_id":2,"similarity":0.85}]}`
  - [ ] Verify: Teacher can view report

  **Evidence Required**:
  - [ ] Similarity detection code
  - [ ] Time analysis code
  - [ ] Runtime analysis code
  - [ ] Report generation code
  - [ ] Test output
  - [ ] curl response

  **Commit**: YES
  - Message: `feat(anti-cheat): implement plagiarism detection with similarity analysis`
  - Files: `api/src/anti-cheat/mod.rs`, `api/src/anti-cheat/similarity.rs`, `shared/src/models/plagiarism_report.rs`
  - Pre-commit: `cargo test anti-cheat`

---

### Phase 11: Discussion & Community

- [ ] 19. **实现社区讨论系统**

  **What to do**:
  - Create discussion thread model (linked to problem)
  - Implement thread CRUD (create, read, update, delete)
  - Add Markdown support for posts
  - Implement @mention functionality (notify teacher)
  - Create reply system (nested comments)
  - Add content moderation (flag offensive content)
  - Implement discussion search (by problem)
  - Add teacher pin/stick important discussions

  **Must NOT do**:
  - Implement rich text editor (frontend task)
  - Add file attachments to discussions

  **Parallelizable**: NO (depends on tasks 6, 13)

  **References**:

  **Pattern References**:
  - Discussion model: Reddit-like threads
  - Markdown: `https://github.com/raphlinus/pulldown-cmark`

  **API References**:
  - POST /api/v1/problems/:id/discussions → Create discussion
  - GET /api/v1/problems/:id/discussions → List discussions
  - POST /api/v1/discussions/:id/replies → Reply to discussion

  **Test References**:
  - Discussion tests: `https://github.com/DMOJ/online-judge/blob/master/dmoj/problem/models.py`

  **Documentation References**:
  - Markdown spec: `https://commonmark.org/`

  **WHY Each Reference Matters**:
  - Reddit pattern: Proven discussion structure
  - Markdown: Standard for user-generated content

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Delete other user's post → 403
  - [ ] **GREEN**: Run `cargo test discussions::tests::test_thread` → PASS (thread created, replies work, markdown rendered)
  - [ ] **REFACTOR**: Extract markdown rendering to service
  - [ ] Manual: Create discussion → Thread visible, @mention sends notification

  **Manual Execution Verification**:
  - [ ] Create discussion: `curl -X POST http://localhost:8080/api/v1/problems/1/discussions -H "Authorization: Bearer <student-token>" -H "Content-Type: application/json" -d '{"content":"How do I solve this? @teacher1"}'`
  - [ ] Response status: 201
  - [ ] List discussions: `curl http://localhost:8080/api/v1/problems/1/discussions`
  - [ ] Verify: Thread appears in list
  - [ ] Verify: Teacher receives notification (check notification endpoint)

  **Evidence Required**:
  - [ ] Discussion CRUD code
  - [ ] Reply system code
  - [ ] Markdown rendering code
  - [ ] @mention notification code
  - [ ] Test output
  - [ ] curl responses

  **Commit**: YES
  - Message: `feat(discussions): implement problem discussion system with Markdown support`
  - Files: `api/src/discussions/mod.rs`, `api/src/discussions/markdown.rs`, `shared/src/models/discussion.rs`
  - Pre-commit: `cargo test discussions`

---

### Phase 12: Frontend (Angular + TypeScript)

- [ ] 20. **初始化Angular项目结构**

  **What to do**:
  - Create Angular workspace with CLI: `ng new online-judge-frontend`
  - Set up routing module
  - Configure HTTP client with interceptors (JWT auth, tenant header)
  - Create shared module (common components, services)
  - Set up state management (RxJS or NgRx)
  - Configure environment files (dev, prod)
  - Add TypeScript strict mode

  **Must NOT do**:
  - Create UI components yet
  - Implement API services yet

  **Parallelizable**: YES (can start after task 1-5 skeleton)

  **References**:

  **Pattern References**:
  - Angular architecture: `https://angular.io/guide/architecture`
  - HTTP interceptors: `https://angular.io/guide/http#intercepting-requests-and-responses`

  **Test References**:
  - Angular testing: `https://angular.io/guide/testing`

  **Documentation References**:
  - Angular CLI: `https://angular.io/cli`

  **WHY Each Reference Matters**:
  - Angular architecture: Official best practices
  - HTTP interceptors: Centralized auth handling

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Build fails → Clear error
  - [ ] **GREEN**: Run `ng test --watch=false` → All tests pass
  - [ ] **REFACTOR**: Extract HTTP interceptors to separate module
  - [ ] Manual: Run `ng serve` → App loads at :4200

  **Manual Execution Verification**:
  - [ ] Command: `ng new online-judge-frontend --routing --style=scss`
  - [ ] Verify: Project structure created
  - [ ] Command: `ng serve`
  - [ ] Verify: Navigate to `http://localhost:4200` → "Welcome to Online Judge" displayed

  **Evidence Required**:
  - [ ] Project structure screenshot
  - [ ] Terminal output showing successful build
  - [ ] Browser screenshot at localhost:4200

  **Commit**: NO

---

- [ ] 21. **实现认证UI（登录/注册）**

  **What to do**:
  - Create login component (email, password)
  - Implement JWT token storage (localStorage)
  - Create registration form (if allowed, else show message)
  - Implement password visibility toggle
  - Add form validation (email format, password strength)
  - Create auth service (login, logout, refresh token)
  - Implement auth guard (protected routes)
  - Add tenant selection (if user has multiple tenants)

  **Must NOT do**:
  - Implement password reset yet
  - Add social login (future feature)

  **Parallelizable**: NO (depends on task 20)

  **References**:

  **Pattern References**:
  - Angular auth: `https://angular.io/guide/router#route-parameters`
  - Auth guard: `https://angular.io/guide/router#canactivate`
  - Form validation: `https://angular.io/guide/form-validation`

  **API References**:
  - POST /api/v1/auth/login → Login endpoint

  **Test References**:
  - Angular component tests: `https://angular.io/guide/testing#component-test-basics`

  **Documentation References**:
  - Angular forms: `https://angular.io/guide/forms-overview`

  **WHY Each Reference Matters**:
  - Auth guard: Route protection pattern
  - Form validation: User experience

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Invalid login → Error message
  - [ ] **GREEN**: Run `ng test` → All auth tests pass
  - [ ] **REFACTOR**: Extract form validators to shared module
  - [ ] Manual: Login with admin credentials → Redirected to dashboard

  **Manual Execution Verification**:
  - [ ] Navigate to `http://localhost:4200/login`
  - [ ] Enter email: `admin@example.com`, password: `Admin123!`
  - [ ] Click "Login"
  - [ ] Verify: Redirected to `/dashboard`
  - [ ] Verify: JWT token stored in localStorage
  - [ ] Verify: Auth guard prevents access to `/dashboard` when logged out

  **Evidence Required**:
  - [ ] Login component code
  - [ ] Auth service code
  - [ ] Auth guard code
  - [ ] Test output
  - [ ] Screenshot: Login form
  - [ ] Screenshot: Dashboard after login

  **Commit**: NO

---

- [ ] 22. **实现题目列表与详情页**

  **What to do**:
  - Create problem list component (filter by difficulty, search)
  - Implement problem pagination
  - Create problem detail component (description, input/output format, sample I/O)
  - Add Monaco Editor for code submission
  - Implement language selector (Python 3, C/C++)
  - Create submission button with validation
  - Add problem metadata display (difficulty, tags, AC rate)

  **Must NOT do**:
  - Implement submission history yet
  - Add problem discussion yet

  **Parallelizable**: NO (depends on tasks 20, 21)

  **References**:

  **Pattern References**:
  - Angular components: `https://angular.io/guide/component-overview`
  - Monaco Editor: `https://microsoft.github.io/monaco-editor/`

  **API References**:
  - GET /api/v1/problems → List problems
  - GET /api/v1/problems/:id → Get problem details

  **Test References**:
  - Component tests: `https://angular.io/guide/testing#component-test-basics`

  **Documentation References**:
  - Angular HTTP: `https://angular.io/guide/http`

  **WHY Each Reference Matters**:
  - Monaco Editor: VS Code editor in browser
  - Angular components: Reactive UI pattern

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Load non-existent problem → 404 page
  - [ ] **GREEN**: Run `ng test` → All problem tests pass
  - [ ] **REFACTOR**: Extract problem card to shared component
  - [ ] Manual: Browse problems → List displays, detail page loads

  **Manual Execution Verification**:
  - [ ] Navigate to `http://localhost:4200/problems`
  - [ ] Verify: Problem list displays
  - [ ] Click on "Two Numbers" problem
  - [ ] Verify: Problem detail page loads with description
  - [ ] Verify: Sample I/O displayed
  - [ ] Verify: Monaco Editor loads

  **Evidence Required**:
  - [ ] Problem list component code
  - [ ] Problem detail component code
  - [ ] Monaco Editor integration code
  - [ ] Test output
  - [ ] Screenshot: Problem list
  - [ ] Screenshot: Problem detail with editor

  **Commit**: NO

---

- [ ] 23. **实现提交结果显示**

  **What to do**:
  - Create submission list component (filter by user, problem, status)
  - Implement submission detail component (code, verdict, time, memory)
  - Add WebSocket integration for real-time updates
  - Create verdict badge component (AC in green, WA in red, etc.)
  - Implement submission history chart (pass rate over time)
  - Add rejudge button (admin only)
  - Create test case results display (for AC submissions)

  **Must NOT do**:
  - Implement advanced analytics yet
  - Add submission comparison

  **Parallelizable**: NO (depends on tasks 14, 20, 21)

  **References**:
  - Angular WebSocket: `https://angular.io/guide/websocket`
  - Chart.js: `https://www.chartjs.org/`

  **API References**:
  - GET /api/v1/submissions → List submissions
  - GET /api/v1/submissions/:id → Get submission details

  **Acceptance Criteria**:
  - [ ] **RED**: Test: WebSocket disconnect → Reconnect automatically
  - [ ] **GREEN**: Run `ng test` → All submission tests pass
  - [ ] **REFACTOR**: Extract verdict badge to shared component
  - [ ] Manual: Submit code → Real-time status update, final verdict displayed

  **Manual Execution Verification**:
  - [ ] Submit solution from problem detail page
  - [ ] Verify: Submission appears in list with status "QUEUED"
  - [ ] Verify: Status updates to "RUNNING" → "JUDGED"
  - [ ] Verify: Final verdict displayed (e.g., AC, WA)
  - [ ] Click on submission → View details
  - [ ] Verify: Code, time, memory, test case results displayed

  **Evidence Required**:
  - [ ] Submission list component code
  - [ ] Submission detail component code
  - [ ] WebSocket integration code
  - [ ] Test output
  - [ ] Screenshot: Submission list with real-time updates
  - [ ] Screenshot: Submission detail

  **Commit**: NO

---

- [ ] 24. **实现排行榜页面**

  **What to do**:
  - Create leaderboard component (scope selector: class, campus, global)
  - Implement ranking table (rank, user, AC count, total time)
  - Add filtering by class (for teachers)
  - Implement user search in leaderboard
  - Add export to CSV (for teachers)
  - Create leaderboard chart (top 10 AC count)
  - Implement tie-breaking visualization

  **Must NOT do**:
  - Implement advanced BI/analytics
  - Add leaderboard history snapshots

  **Parallelizable**: NO (depends on tasks 15, 20, 21)

  **References**:
  - Angular tables: `https://material.angular.io/components/table`
  - Chart.js: `https://www.chartjs.org/`

  **API References**:
  - GET /api/v1/leaderboard?scope=class&class_id=1 → Class leaderboard

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Invalid scope → Error message
  - [ ] **GREEN**: Run `ng test` → All leaderboard tests pass
  - [ ] **REFACTOR**: Extract ranking row to shared component
  - [ ] Manual: View leaderboard → Rankings display correctly

  **Manual Execution Verification**:
  - [ ] Navigate to `http://localhost:4200/leaderboard`
  - [ ] Select scope: "Class 101"
  - [ ] Verify: Ranking table displays
  - [ ] Verify: Users ranked correctly (AC count, total time)
  - [ ] Verify: Ties broken correctly
  - [ ] Click "Export to CSV" → CSV file downloaded

  **Evidence Required**:
  - [ ] Leaderboard component code
  - [ ] Table code
  - [ ] Chart code
  - [ ] Test output
  - [ ] Screenshot: Leaderboard page

  **Commit**: NO

---

- [ ] 25. **实现教师管理界面**

  **What to do**:
  - Create class management page (create, edit, delete classes)
  - Implement student enrollment (CSV upload)
  - Create assignment creation page (select problem, set deadline)
  - Implement assignment dashboard (view submissions, grading)
  - Add plagiarism review page (view reports, mark cases)
  - Create class statistics page (AC rate, participation)
  - Implement discussion moderation (pin, delete threads)

  **Must NOT do**:
  - Implement advanced grading rubrics
  - Add bulk operations

  **Parallelizable**: NO (depends on tasks 16, 18, 20, 21)

  **References**:
  - Angular forms: `https://angular.io/guide/forms-overview`
  - Material Design: `https://material.angular.io/`

  **API References**:
  - POST /api/v1/classes → Create class
  - POST /api/v1/assignments → Create assignment
  - GET /api/v1/plagiarism-reports → List reports

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Upload invalid CSV → Error message
  - [ ] **GREEN**: Run `ng test` → All teacher dashboard tests pass
  - [ ] **REFACTOR**: Extract CSV upload component to shared
  - [ ] Manual: Create class, enroll students, create assignment → All operations successful

  **Manual Execution Verification**:
  - [ ] Navigate to `http://localhost:4200/teacher/dashboard`
  - [ ] Click "Create Class", enter name: "Class 101"
  - [ ] Click "Create" → Class created
  - [ ] Click "Enroll Students", upload `students.csv`
  - [ ] Verify: 10 students enrolled
  - [ ] Click "Create Assignment", select problem, set deadline
  - [ ] Click "Create" → Assignment created
  - [ ] Navigate to "Assignments", click assignment
  - [ ] Verify: Submissions displayed

  **Evidence Required**:
  - [ ] Class management code
  - [ ] Enrollment code
  - [ ] Assignment creation code
  - [ ] Plagiarism review code
  - [ ] Test output
  - [ ] Screenshots: Teacher dashboard, class creation, assignment creation

  **Commit**: NO

---

- [ ] 26. **实现学生Dashboard**

  **What to do**:
  - Create student dashboard (recent submissions, assignments due)
  - Implement assignment list (with deadlines, completion status)
  - Create submission history page
  - Add problem progress tracker (AC count, attempt count)
  - Implement notification center (new assignment, discussion reply)
  - Create discussion participation page (my threads, replies)

  **Must NOT do**:
  - Add social features
  - Implement gamification (badges, achievements)

  **Parallelizable**: NO (depends on tasks 16, 19, 20, 21)

  **References**:
  - Angular routing: `https://angular.io/guide/router`
  - RxJS: `https://rxjs.dev/`

  **API References**:
  - GET /api/v1/student/dashboard → Dashboard data
  - GET /api/v1/student/assignments → My assignments

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Load dashboard with no data → Empty state displayed
  - [ ] **GREEN**: Run `ng test` → All student dashboard tests pass
  - [ ] **REFACTOR**: Extract dashboard cards to shared components
  - [ ] Manual: Login as student → Dashboard loads with correct data

  **Manual Execution Verification**:
  - [ ] Login as student
  - [ ] Navigate to `http://localhost:4200/student/dashboard`
  - [ ] Verify: Recent submissions displayed
  - [ ] Verify: Due assignments displayed with deadlines
  - [ ] Click on assignment → Assignment details load
  - [ ] Navigate to "My Submissions" → Submission history displayed
  - [ ] Navigate to "Discussions" → My threads displayed

  **Evidence Required**:
  - [ ] Dashboard component code
  - [ ] Assignment list code
  - [ ] Notification center code
  - [ ] Test output
  - [ ] Screenshot: Student dashboard

  **Commit**: NO

---

### Phase 13: Deployment & Configuration

- [ ] 27. **创建Docker Compose配置**

  **What to do**:
  - Create `docker-compose.yml` with services:
    - `api` (Rust backend)
    - `judge-worker` (Judge worker)
    - `postgres` (PostgreSQL database)
    - `redis` (Redis for cache/queue)
    - `frontend` (Angular, optional for dev)
  - Configure volumes (data persistence for DB/Redis)
  - Set up networks (internal communication)
  - Create environment files (.env, .env.example)
  - Add health checks for all services
  - Configure depends_on with startup conditions

  **Must NOT do**:
  - Use Docker privileged mode (for security)
  - Expose internal ports publicly

  **Parallelizable**: NO (orchestrates all services)

  **References**:
  - Docker Compose: `https://docs.docker.com/compose/`
  - PostgreSQL Docker: `https://hub.docker.com/_/postgres`
  - Redis Docker: `https://hub.docker.com/_/redis`

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Run `docker-compose up` → Services fail to start
  - [ ] **GREEN**: Run `docker-compose up -d` → All services healthy
  - [ ] **REFACTOR**: Extract common env vars to .env
  - [ ] Manual: Run `docker-compose up` → System fully functional

  **Manual Execution Verification**:
  - [ ] Command: `docker-compose up -d`
  - [ ] Command: `docker-compose ps` → All services "Up"
  - [ ] Command: `curl http://localhost:8080/health` → `{"status":"healthy"}`
  - [ ] Command: `psql -h localhost -U postgres -d online_judge -c "SELECT 1"` → Returns 1
  - [ ] Command: `redis-cli ping` → `PONG`

  **Evidence Required**:
  - [ ] `docker-compose.yml` file
  - [ ] `.env.example` file
  - [ ] Terminal output showing services starting
  - [ ] `docker-compose ps` output

  **Commit**: YES
  - Message: `feat(deploy): add Docker Compose configuration`
  - Files: `docker-compose.yml`, `.env.example`, `Dockerfile.api`, `Dockerfile.worker`, `Dockerfile.frontend`
  - Pre-commit: `docker-compose config` (validate config)

---

- [ ] 28. **创建初始化脚本与示例数据**

  **What to do**:
  - Create `scripts/init.sh` to:
    - Run database migrations
    - Create Root user (admin@example.com / Admin123!)
    - Create test organization/campus
    - Import example problems (Hello World, A+B, etc.)
    - Create test users (teacher1, student1, student2)
    - Enroll students in class
    - Create sample assignment
  - Add script to Docker Compose entrypoint
  - Create example problem package (Kattis format)
  - Add SQL seed data file (optional, for faster setup)

  **Must NOT do**:
  - Create production data
  - Hardcode passwords in code

  **Parallelizable**: NO (depends on task 27)

  **References**:
  - SQLx migrations: `https://docs.rs/sqlx/latest/sqlx/migrate/`
  - Shell scripting: `https://tldp.org/LDP/Bash-Beginners-Guide/html/`

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Run init script → Migrations fail
  - [ ] **GREEN**: Run `scripts/init.sh` → All migrations applied, sample data created
  - [ ] **REFACTOR**: Extract user creation to function
  - [ ] Manual: Run init → Can login with admin@example.com

  **Manual Execution Verification**:
  - [ ] Command: `docker-compose up -d`
  - [ ] Command: `docker-compose exec api bash scripts/init.sh`
  - [ ] Verify: Script runs without errors
  - [ ] Verify: Database contains sample data
  - [ ] Verify: Can login at http://localhost:4200/login with admin@example.com / Admin123!
  - [ ] Verify: 3 example problems available

  **Evidence Required**:
  - [ ] `scripts/init.sh` file
  - [ ] Example problem package files
  - [ ] Terminal output showing successful init
  - [ ] Screenshots: Login page, problem list

  **Commit**: YES
  - Message: `feat(deploy): add initialization script and sample data`
  - Files: `scripts/init.sh`, `data/sample-problems/`, `migrations/seed.sql`
  - Pre-commit: `sh -n scripts/init.sh` (syntax check)

---

### Phase 14: Testing & Documentation

- [ ] 29. **实现E2E测试**

  **What to do**:
  - Set up Playwright for E2E tests
  - Create test suite for authentication (login, logout, access control)
  - Create test suite for problem submission (AC, WA, TLE)
  - Create test suite for teacher dashboard (create class, enroll students)
  - Create test suite for student dashboard (view assignments, submit)
  - Add visual regression tests (screenshots)
  - Configure CI/CD integration (optional)

  **Must NOT do**:
  - Test every edge case (focus on critical paths)
  - Create flaky tests (use stable selectors)

  **Parallelizable**: YES (after tasks 20-26)

  **References**:
  - Playwright: `https://playwright.dev/`
  - Angular E2E: `https://angular.io/guide/testing#e2e-testing`

  **Acceptance Criteria**:
  - [ ] **RED**: Test: E2E test fails → Clear error
  - [ ] **GREEN**: Run `npm run test:e2e` → All E2E tests pass
  - [ ] **REFACTOR**: Extract page objects to shared module
  - [ ] Manual: Run E2E tests → All pass

  **Manual Execution Verification**:
  - [ ] Command: `npm run test:e2e`
  - [ ] Verify: Playwright launches browser
  - [ ] Verify: Tests run sequentially
  - [ ] Verify: All tests pass
  - [ ] Verify: Screenshots saved to `playwright-report/`

  **Evidence Required**:
  - [ ] E2E test files
  - [ ] Page objects
  - [ ] Test output
  - [ ] Screenshots

  **Commit**: NO

---

- [ ] 30. **编写API文档**

  **What to do**:
  - Generate OpenAPI 3.0 spec from Rust code
  - Add detailed descriptions for all endpoints
  - Include request/response examples
  - Add authentication requirements (JWT token)
  - Document error responses (400, 401, 403, 404, 500)
  - Generate Swagger UI
  - Add API versioning strategy

  **Must NOT do**:
  - Leave undocumented endpoints
  - Use vague descriptions

  **Parallelizable**: YES (after tasks 1-19)

  **References**:
  - OpenAPI spec: `https://swagger.io/specification/`
  - utoipa (Rust OpenAPI): `https://docs.rs/utoipa/latest/utoipa/`

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Generate spec → Missing endpoints
  - [ ] **GREEN**: Run `cargo doc --open` → All endpoints documented
  - [ ] **REFACTOR**: Extract common examples to shared
  - [ ] Manual: Access Swagger UI → All APIs documented

  **Manual Execution Verification**:
  - [ ] Command: `cargo run --bin api` (starts Swagger UI)
  - [ ] Navigate to `http://localhost:8080/swagger`
  - [ ] Verify: All endpoints listed
  - [ ] Click on POST /api/v1/auth/login
  - [ ] Verify: Request body, response body, auth requirements displayed

  **Evidence Required**:
  - [ ] OpenAPI spec file
  - [ ] Swagger UI screenshots
  - [ ] Generated documentation

  **Commit**: YES
  - Message: `docs(api): generate OpenAPI 3.0 specification and Swagger UI`
  - Files: `api/openapi.yaml`, `api/src/docs.rs`
  - Pre-commit: `cargo test docs`

---

- [ ] 31. **编写用户手册与部署文档**

  **What to do**:
  - Create `README.md` with:
    - Project overview
    - Features
    - Technology stack
    - Quick start guide
    - Prerequisites (Rust, Node.js, Docker)
  - Create `DEPLOYMENT.md` with:
    - Docker Compose setup
    - Environment configuration
    - Database initialization
    - Troubleshooting
  - Create `USER_GUIDE.md` with:
    - Student guide (submit code, view results)
    - Teacher guide (create class, assign homework)
    - Admin guide (manage users, create problems)
  - Add screenshots to user guide
  - Create `DEVELOPMENT.md` for contributors

  **Must NOT do**:
  - Assume knowledge (explain prerequisites)
  - Skip troubleshooting steps

  **Parallelizable**: YES (after tasks 1-28)

  **References**:
  - Markdown: `https://commonmark.org/`
  - Technical writing: `https://developers.google.com/tech-writing`

  **Acceptance Criteria**:
  - [ ] **RED**: Test: Follow quick start guide → Setup fails
  - [ ] **GREEN**: Run through guide → System functional
  - [ ] **REFACTOR**: Extract common steps to sub-docs
  - [ ] Manual: Follow quick start → Success

  **Manual Execution Verification**:
  - [ ] Read README.md
  - [ ] Follow "Quick Start" section
  - [ ] Verify: System starts successfully
  - [ ] Verify: Can login with demo credentials
  - [ ] Read USER_GUIDE.md
  - [ ] Verify: Screenshots match actual UI
  - [ ] Follow "Create Class" section
  - [ ] Verify: Class created successfully

  **Evidence Required**:
  - [ ] `README.md`
  - [ ] `DEPLOYMENT.md`
  - [ ] `USER_GUIDE.md`
  - [ ] `DEVELOPMENT.md`
  - [ ] Screenshots

  **Commit**: YES
  - Message: `docs: add README, deployment guide, and user manual`
  - Files: `README.md`, `docs/DEPLOYMENT.md`, `docs/USER_GUIDE.md`, `docs/DEVELOPMENT.md`
  - Pre-commit: N/A

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 5 | `feat(auth): implement JWT login and token validation` | api/src/auth, shared/src/models | `cargo test auth` |
| 6 | `feat(rbac): implement role-based access control` | api/src/rbac, shared/src/models/role | `cargo test rbac` |
| 7 | `feat(tenant): implement organization model and tenant isolation` | api/src/tenant, shared/src/models/organization | `cargo test tenant` |
| 8 | `feat(schema): design and implement complete database schema` | migrations/*.sql, api/src/db/schema | `cargo test schema` |
| 9 | `feat(judge): implement secure sandbox with chroot + cgroups` | judge-worker/src/sandbox | `cargo test sandbox` |
| 10 | `feat(judge): implement compiler for C/C++ and Python 3` | judge-worker/src/compiler | `cargo test compiler` |
| 11 | `feat(queue): implement Redis Streams for submission queue` | judge-worker/src/queue | `cargo test queue` |
| 12 | `feat(judge): implement submission evaluation with lazy evaluation` | judge-worker/src/processor, shared/src/models/verdict | `cargo test processor` |
| 13 | `feat(problems): implement problem management CRUD API` | api/src/problems, shared/src/models/problem | `cargo test problems` |
| 14 | `feat(submissions): implement submission API and real-time status updates` | api/src/submissions, api/src/websocket | `cargo test submissions` |
| 15 | `feat(leaderboard): implement leaderboard with Redis Sorted Sets` | api/src/leaderboard | `cargo test leaderboard` |
| 16 | `feat(assignments): implement class and assignment management` | api/src/classes, api/src/assignments | `cargo test assignments` |
| 17 | `feat(contests): implement contest management with ACM/IOI rules` | api/src/contests | `cargo test contests` |
| 18 | `feat(anti-cheat): implement plagiarism detection with similarity analysis` | api/src/anti-cheat | `cargo test anti-cheat` |
| 19 | `feat(discussions): implement problem discussion system with Markdown support` | api/src/discussions | `cargo test discussions` |
| 27 | `feat(deploy): add Docker Compose configuration` | docker-compose.yml, Dockerfile.* | `docker-compose config` |
| 28 | `feat(deploy): add initialization script and sample data` | scripts/init.sh, data/sample-problems | `sh -n scripts/init.sh` |
| 30 | `docs(api): generate OpenAPI 3.0 specification and Swagger UI` | api/openapi.yaml, api/src/docs.rs | `cargo test docs` |
| 31 | `docs: add README, deployment guide, and user manual` | README.md, docs/*.md | N/A |

---

## Success Criteria

### Verification Commands
```bash
# Backend tests
cargo test --all

# Frontend tests
ng test --watch=false

# E2E tests
npm run test:e2e

# Docker Compose startup
docker-compose up -d
docker-compose ps  # All services Up

# API health check
curl http://localhost:8080/health

# Database verification
psql -h localhost -U postgres -d online_judge -c "SELECT COUNT(*) FROM problems"
psql -h localhost -U postgres -d online_judge -c "SELECT COUNT(*) FROM users"
psql -h localhost -U postgres -d online_judge -c "SELECT COUNT(*) FROM organizations"

# Redis verification
redis-cli ping
redis-cli XLEN submission_queue

# Frontend verification
curl http://localhost:4200
```

### Final Checklist
- [ ] All 31 tasks completed
- [ ] All unit/integration tests pass (≥80% coverage)
- [ ] All E2E tests pass
- [ ] Docker Compose starts all services successfully
- [ ] Can login with admin@example.com / Admin123!
- [ ] Example problems available (≥3 problems)
- [ ] Can submit code, receive verdict
- [ ] Leaderboard displays rankings
- [ ] Teacher can create class, enroll students
- [ ] Plagiarism reports generate successfully
- [ ] Discussions work (create, reply, markdown)
- [ ] WebSocket notifications work
- [ ] All "Must NOT Have" items excluded
- [ ] All "Must Have" items implemented
- [ ] API documentation complete (Swagger UI)
- [ ] User manual complete with screenshots
- [ ] Deployment guide tested successfully

---

## Appendix: Decision Needed Questions

The following questions require user input before implementation can begin:

1. **[DECISION NEEDED: 组织模型]**
   - 问题：校区(campus) == tenant？还是学校/集团 == tenant，校区是子层级？是否允许跨校区教师/学生？
   - 选项：
     - A: 校区 == tenant（最简单）
     - B: 学校 == tenant，校区是子层级（更灵活）
     - C: 集团 == tenant，学校/校区都是子层级（最复杂）
   - **默认选择**: A (校区 == tenant)

2. **[DECISION NEEDED: 题目可见性]**
   - 问题：题目是全局共享、校区私有、教师私有？是否支持"私有题/共享给某班/公开题库"？
   - 选项：
     - A: 全局共享（所有校区可见）
     - B: 校区私有（仅本校区可见）
     - C: 教师私有 + 可共享给班级
     - D: 支持所有级别（全局/校区/班级/私有）
   - **默认选择**: C (教师私有 + 可共享给班级)

3. **[DECISION NEEDED: 竞赛规则]**
   - 问题：ACM/IOI/教育赛制？是否需要封榜、罚时、题目解锁？
   - 选项：

## Appendix: User Decisions - Final ✅

所有关键决策已由用户确认。以下是实施影响说明：

### 1. 组织模型（学校 == tenant，校区是子层级）✅
**Database Schema**:
- `schools` 表：主租户
- `campuses` 表：school的子层级，有 `school_id` 外键
- 所有业务表包含 `school_id`（租户隔离）
- 用户可以有 `campus_id`（可选）

**Query Filtering**:
- 所有查询必须包含 `WHERE school_id = ?`
- 跨校区用户：同一 `school_id` 下可以有多个 `campus_id`

### 2. 题目可见性（支持所有级别）✅
**Problem Model**:
```rust
enum ProblemVisibility {
    Global,      // 所有学校可见
    School,      // 仅本校可见
    Campus,      // 仅本校区的班级/教师/学生可见
    Class,       // 仅指定班级可见
    Private,     // 仅创建者可见
}
```

**Visibility Logic**:
- Global: `school_id` 为 NULL 或特殊值
- School: 匹配当前用户的 `school_id`
- Campus: 匹配当前用户的 `campus_id`
- Class: 用户在 `class_enrollments` 中
- Private: `author_id` == 当前用户ID

### 3. 竞赛规则（ACM赛制）✅
**Contest Ranking Logic**:
- 排名基于：AC数量（降序）+ 总罚时（升序）+ 最后AC时间（降序）
- 罚时计算：每次WA/TLE/RTE + 20分钟 + AC提交时间（分钟）
- 封榜：竞赛结束前30分钟隐藏排名

### 4. 提交策略（允许无限提交，取最好成绩）✅
**Best Score Calculation**:
- 作业模式：取最高verdict（AC > WA > RTE > TLE > MLE）
- 对于AC：取时间最短的一次
- 对于竞赛：取首次AC（标准ACM规则）

---

## Appendix: Default Decisions (Minor Gaps) ✅

以下项目使用默认值，如需调整请在实施时修改：

- 账号生命周期：支持改密码、禁用/毕业归档、找回密码（邮件验证）
- 班级/课程/学期：作业挂在班级entity，需要学期切换与历史数据保留
- 评测一致性：同题不同语言允许不同限制，支持多组测试数据
- 讨论区边界：与题目绑定，支持Markdown、@教师，需要审核与举报
- 查重范围：同作业内+同班，报告仅教师/校区Root可见，保存6个月
- 运维目标：99%可用性、每日备份、日志保留30天
- 并发峰值：预设支持100 QPS（作业截止前尖峰）
- Cgroups可用性：假设部署环境为Linux，内核>=5.19，cgroups v2已启用
- 编译环境版本：Python 3.11、GCC 13、Clang 16（在Docker镜像中固定）
- SSO集成：默认无SSO，仅本地账号
- Redis Streams语义：需要持久化（AOF）、消费组、重试/死信队列
- 通知实现：WebSocket + 事件流，降级为短轮询（5秒）
- 时区处理：所有时间存储为UTC，前端按校区时区显示

## Appendix: User Decisions - Final ✅

所有关键决策已由用户确认。以下是实施影响说明：

### 1. 组织模型（学校 == tenant，校区是子层级）✅
**Database Schema**:
- `schools` 表：主租户
- `campuses` 表：school的子层级，有 `school_id` 外键
- 所有业务表包含 `school_id`（租户隔离）
- 用户可以有 `campus_id`（可选）

**Query Filtering**:
- 所有查询必须包含 `WHERE school_id = ?`
- 跨校区用户：同一 `school_id` 下可以有多个 `campus_id`

### 2. 题目可见性（支持所有级别）✅
**Problem Model**:
```rust
enum ProblemVisibility {
    Global,      // 所有学校可见
    School,      // 仅本校可见
    Campus,      // 仅本校区的班级/教师/学生可见
    Class,       // 仅指定班级可见
    Private,     // 仅创建者可见
}
```

**Visibility Logic**:
- Global: `school_id` 为 NULL 或特殊值
- School: 匹配当前用户的 `school_id`
- Campus: 匹配当前用户的 `campus_id`
- Class: 用户在 `class_enrollments` 中
- Private: `author_id` == 当前用户ID

### 3. 竞赛规则（ACM赛制）✅
**Contest Ranking Logic**:
- 排名基于：AC数量（降序）+ 总罚时（升序）+ 最后AC时间（降序）
- 罚时计算：每次WA/TLE/RTE + 20分钟 + AC提交时间（分钟）
- 封榜：竞赛结束前30分钟隐藏排名

### 4. 提交策略（允许无限提交，取最好成绩）✅
**Best Score Calculation**:
- 作业模式：取最高verdict（AC > WA > RTE > TLE > MLE）
- 对于AC：取时间最短的一次
- 对于竞赛：取首次AC（标准ACM规则）

---

## Appendix: Default Decisions (Minor Gaps) ✅

以下项目使用默认值，如需调整请在实施时修改：

- 账号生命周期：支持改密码、禁用/毕业归档、找回密码（邮件验证）
- 班级/课程/学期：作业挂在班级entity，需要学期切换与历史数据保留
- 评测一致性：同题不同语言允许不同限制，支持多组测试数据
- 讨论区边界：与题目绑定，支持Markdown、@教师，需要审核与举报
- 查重范围：同作业内+同班，报告仅教师/校区Root可见，保存6个月
- 运维目标：99%可用性、每日备份、日志保留30天
- 并发峰值：预设支持100 QPS（作业截止前尖峰）
- Cgroups可用性：假设部署环境为Linux，内核>=5.19，cgroups v2已启用
- 编译环境版本：Python 3.11、GCC 13、Clang 16（在Docker镜像中固定）
- SSO集成：默认无SSO，仅本地账号
- Redis Streams语义：需要持久化（AOF）、消费组、重试/死信队列
- 通知实现：WebSocket + 事件流，降级为短轮询（5秒）
- 时区处理：所有时间存储为UTC，前端按校区时区显示
---
