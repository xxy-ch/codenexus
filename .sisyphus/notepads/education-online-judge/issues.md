## 2026-01-28: Priority A - Problems API 现状分析

### Schema/Model 不匹配问题

**问题发现：**
1. `api/src/problems/models.rs` 中的 `Problem` 结构体使用 `id: Uuid`
   - 但数据库迁移 `005_create_problems.sql` 定义为 `id BIGSERIAL`
   - 这是类型不匹配，会导致查询映射失败

2. 模型包含数据库不存在的字段：
   - `input_format`, `output_format`, `sample_input`, `sample_output`, `tags`
   - 这些字段在 problems 表中不存在
   - `sample_input/output` 应该放在 test_cases 表中（已在 006 迁移中定义）

3. 字段类型不一致：
   - 模型中 `time_limit_ms: i64`，数据库为 `INTEGER`
   - 模型中 `memory_limit_kb: i32`，数据库为 `INTEGER`（这个一致）

4. 缺少 `#[derive(sqlx::FromRow)]`
   - 当前模型只有 `Debug, Clone, Serialize, Deserialize`
   - 需要 FromRow 才能用 `sqlx::query_as` 映射

### 当前处理程序状态

**`api/src/problems/routes.rs`：**
- 所有处理程序返回 `StatusCode::NOT_IMPLEMENTED`
- 处理程序签名正确（`State<AppState>`, `Extension<Claims>`, `Path<id>`, `Query<HashMap>`）
- 缺少数据库查询实现

### RBAC 权限模式

**已确认的模式：**
- `Permission::ManageProblems` 适用于 problems 的 POST/PUT/DELETE 操作
- Teacher 及以上角色拥有此权限
- `require_permission` 中间件需要在 `auth_middleware` 之后使用（需要 Claims）
- 示例用法：`.route_layer(axum::middleware::from_fn(|req, next| require_permission(Permission::ManageProblems, req, next)))`

**问题：**
- 当前 `problems_router()` 未应用权限中间件
- 所有写操作（POST/PUT/DELETE）都是开放的

### 租户隔离模式

**TenantContext：**
```rust
pub struct TenantContext {
    tenant_id: i64, // 映射到 claims.school_id 或 X-Tenant-ID
}
```

**tenant_middleware 行为：**
1. 优先从 `Claims.school_id` 提取（如果 Claims 存在）
2. 回退到 `X-Tenant-ID` 请求头
3. 将 `TenantContext` 插入请求扩展
4. 如果无法确定租户 ID，返回 401

**数据库设计：**
- 所有租户相关表都有 `organization_id BIGINT NOT NULL`
- 可选的 `campus_id BIGINT`（外键到 campuses 表）
- 索引：`idx_<table>_organization_id`, `idx_<table>_campus_id`
- 外键约束：campus 必须属于 organization

### SQLx 查询模式（当前仓库状态）

**关键发现：**
1. **仓库中几乎没有实际的 SQLx 查询**
   - 仅在 `api/src/db/mod.rs:67` 中发现 `sqlx::query_scalar("SELECT 1")` 测试代码
   - 没有在处理程序中使用 `sqlx::query()`, `query_as()`, `fetch_one()`, `fetch_all()`
   - 没有事务使用（`.begin()`, `.commit()`, `.rollback()`）

2. **错误处理约定：**
   ```rust
   StatusCode::UNAUTHORIZED  // 认证失败（缺失/无效 token）
   StatusCode::FORBIDDEN      // 授权失败（无权限）
   StatusCode::NOT_FOUND       // 资源不存在
   StatusCode::INTERNAL_SERVER_ERROR  // 服务器错误
   ```

3. **分页模式：**
   - `ProblemsListResponse` 已定义分页字段：
     ```rust
     pub struct ProblemsListResponse {
         pub problems: Vec<Problem>,
         pub total: i32,
         pub page: u32,
         pub total_pages: u32,
     }
     ```
   - 需要实现：
     - `COUNT(*)` 查询获取总数
     - `LIMIT $1 OFFSET $2` 分页查询
     - 计算总页数：`total_pages = (total + page_size - 1) / page_size`

### 路由结构

**当前 `api/src/main.rs`：**
```rust
Router::new()
    .nest("/problems", problems::problems_router())  // 不在 /api/v1 下
    .route_layer(axum::middleware::from_fn_with_state(..., tenant_middleware))
    .route_layer(axum::middleware::from_fn(auth_middleware))
```

**问题：**
1. 路由不在 `/api/v1` 前缀下（计划要求）
2. 中间件应用在全局，但需要确认顺序正确
3. `/health` 是公开的（不在中间件下）- 正确

### 计划与现实对比

**progress.md 声称：**
- "Task 13.1: Problems Management API - COMPLETED"
- 列出 CRUD 端点已实现

**实际状态：**
- 所有处理程序返回 `NOT_IMPLEMENTED`
- 模型与数据库模式不匹配
- 没有数据库查询实现
- 没有权限保护

**结论：** progress.md 中的记录是过时/不准确的。

### 下一步行动

**必须先修复：**
1. 对齐 `Problem` 模型与数据库模式（id: i64, 移除不存在字段）
2. 添加 `#[derive(sqlx::FromRow)]`
3. 实现实际的数据库查询（sqlx::query, query_as, fetch_one/fetch_optional）
4. 实现分页（COUNT + LIMIT/OFFSET）
5. 应用 RBAC 权限（POST/PUT/DELETE 需要 ManageProblems）
6. 确保所有查询过滤 `organization_id = claims.school_id`

### 参考文件

**关键实现文件：**
- `api/src/problems/models.rs` - 需要对齐模式
- `api/src/problems/routes.rs` - 需要实现实际逻辑
- `api/src/problems/mod.rs` - 需要添加权限路由层
- `api/src/middleware/tenant.rs` - TenantContext 和中间件
- `api/src/middleware/authz.rs` - require_permission 函数
- `shared/src/models/permission.rs` - Permission::ManageProblems
- `api/src/rbac/mod.rs` - RbacService::role_has_permission

**数据库迁移参考：**
- `api/migrations/005_create_problems.sql` - problems 表结构
- `api/migrations/006_create_test_cases.sql` - test_cases 表结构
