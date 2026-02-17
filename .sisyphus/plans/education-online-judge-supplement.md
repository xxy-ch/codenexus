# 计划补充：关键改进实施指南

本文件提供原始计划中缺失的5项关键改进，基于Momus审查反馈。

---

## 1. JWT Token Payload 结构定义

### 问题
任务4（租户隔离中间件）和任务5（JWT认证）都依赖JWT Token，但计划中没有明确定义JWT payload应该包含哪些字段。

### 解决方案

#### JWT Claims 结构
```rust
// shared/src/models/jwt_claims.rs
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtClaims {
    /// 用户唯一标识符
    pub sub: String,           // user_id (UUID)

    /// 用户显示名称
    pub name: String,

    /// 用户邮箱
    pub email: String,

    /// 用户角色：Root, CampusAdmin, Teacher, Student
    pub role: String,

    /// 主租户ID（学校ID）- 租户隔离的核心
    pub school_id: i64,         // 对应 schools表主键

    /// 校区ID（可选）- 学校的子层级
    pub campus_id: Option<i64>,

    /// Token签发时间
    pub iat: usize,          // issued at (Unix timestamp)

    /// Token过期时间
    pub exp: usize,           // expiration time (Unix timestamp)

    /// JWT标识符
    pub jti: String,          // JWT ID（用于token撤销）
}
```

#### 生成 JWT 的实现
```rust
// api/src/auth/jwt_service.rs
use jsonwebtoken::{encode, Algorithm, Header, EncodingKey, Validation};

pub fn generate_jwt(
    user: &User,
    secret: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let now = chrono::Utc::now().timestamp();
    let exp = now + chrono::Duration::days(7); // 7天过期

    let claims = JwtClaims {
        sub: user.id.to_string(),
        name: user.name.clone(),
        email: user.email.clone(),
        role: user.role.clone(),
        school_id: user.school_id,
        campus_id: user.campus_id,
        iat: now.timestamp() as usize,
        exp: exp.timestamp() as usize,
        jti: uuid::Uuid::new_v4().to_string(),
    };

    let secret = EncodingKey::from_secret(secret.as_bytes());
    encode(
        &Header::default(),
        &claims,
        &secret,
    ).map_err(|e| e.into())
}
```

#### 租户上下文提取器
```rust
// api/src/middleware/tenant.rs
use axum::{
    extract::FromRequestParts,
    http::{StatusCode, Request},
    Extension,
};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct TenantContext {
    pub school_id: i64,
    pub campus_id: Option<i64>,
}

#[async_trait]
impl<S> FromRequestParts<S> for TenantContext
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(
        parts: &mut Request,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        // 从JWT token中提取租户信息
        let auth_user = parts
            .extensions
            .get::<JwtClaims>()
            .ok_or((StatusCode::UNAUTHORIZED, "missing auth token"))?;

        Ok(TenantContext {
            school_id: auth_user.school_id,
            campus_id: auth_user.campus_id,
        })
    }
}
```

#### 租户隔离查询策略
```rust
// 应用层所有查询必须包含租户过滤
// api/src/db/repository.rs
use sqlx::PgPool;

pub struct Repository {
    pool: PgPool,
}

impl Repository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // 确保所有查询包含租户过滤的辅助方法
    pub async fn find_problems_by_school(
        &self,
        school_id: i64,
    ) -> sqlx::Result<Vec<Problem>> {
        sqlx::query!(
            SELECT * FROM problems WHERE school_id = $1 ORDER BY created_at DESC
        )
        .bind(school_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_problems_by_campus(
        &self,
        school_id: i64,
        campus_id: i64,
    ) -> sqlx::Result<Vec<Problem>> {
        sqlx::query!(
            SELECT * FROM problems WHERE school_id = $1 AND campus_id = $2 ORDER BY created_at DESC
        )
        .bind(school_id, campus_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_problems_by_class(
        &self,
        class_id: i64,
    ) -> sqlx::Result<Vec<Problem>> {
        // 通过 class_enrollments 关联查询
        sqlx::query!(
            SELECT DISTINCT p.* FROM problems p
            INNER JOIN class_problems cp ON p.id = cp.problem_id
            WHERE cp.class_id = $1
            ORDER BY p.created_at DESC
        )
        .bind(class_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_private_problems_for_teacher(
        &self,
        school_id: i64,
        teacher_id: i64,
    ) -> sqlx::Result<Vec<Problem>> {
        sqlx::query!(
            SELECT * FROM problems
            WHERE school_id = $1
              AND author_id = $2
              AND visibility = 'private'
            ORDER BY created_at DESC
        )
        .bind(school_id, teacher_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_public_problems(
        &self,
    ) -> sqlx::Result<Vec<Problem>> {
        sqlx::query!(
            SELECT * FROM problems
            WHERE school_id IS NULL OR visibility = 'global'
            ORDER BY created_at DESC
        )
        .fetch_all(&self.pool)
        .await
    }
}
```

---

## 2. 解决任务4/5/8的循环依赖

### 问题
- 任务4（租户中间件）需要JWT Token结构，应该在任务5（JWT认证）中定义
- 任务5生成JWT，但需要User model，应该在任务8（数据库Schema）中定义
- 任务8定义User model，但字段需要根据JWT Claims确定
- 这形成了循环依赖：任务4 → 任务5 → 任务8 → 回到任务4

### 解决方案

**重新组织任务顺序**：
1. **任务0（新增）**：定义系统核心数据结构
   - 包含：User, Organization/School, Campus, Problem, Submission, Class, Assignment等核心模型
   - 同时定义：JwtClaims, TenantContext, Role, Permission等认证相关结构
   - 不需要数据库连接，纯代码定义

2. **任务1-3**：保持不变（项目初始化、数据库连接、Redis、基础中间件）

3. **任务5**（调整后）：实现JWT认证
   - 依赖：任务0的User模型定义
   - 输出：JWT token生成函数
   - 输出：token验证函数

4. **任务4**（调整后）：实现租户隔离中间件
   - 依赖：任务0的JwtClaims结构
   - 输出：TenantContext提取器
   - 输出：租户验证逻辑

5. **任务6-7**：保持不变（RBAC、组织管理）

6. **任务8**（调整后）：实现数据库Schema和User model
   - 依赖：任务0的数据结构定义
   - 输出：PostgreSQL migrations
   - 输出：User表（包含school_id, campus_id, role_id等字段）

### 依赖关系图（修复后）
```
任务0: 核心数据结构定义
  ↓
任务1-3: 基础设施
  ↓
任务5: JWT认证（依赖任务0）
  ↓
任务4: 租户中间件（依赖任务0、5）
  ↓
任务6-7: RBAC/组织管理
  ↓
任务8: 数据库Schema（依赖任务0）
  ↓
任务9-18: 其他功能实现
```

---

## 3. 数据库Schema详细设计指导

### 问题
任务8要求"设计并实现完整数据库Schema"，但计划中只列出了表名，缺少字段定义、索引、外键约束等详细指导。

### 解决方案

#### 核心表设计

```sql
-- =====================================================
-- 1. Schools Table (主租户)
-- =====================================================
CREATE TABLE schools (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_schools_slug ON schools(slug);
CREATE INDEX idx_schools_name ON schools(name);


-- =====================================================
-- 2. Campuses Table (学校的子层级)
-- =====================================================
CREATE TABLE campuses (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_campuses_school_id ON campuses(school_id);
CREATE INDEX idx_campuses_name ON campuses(name);


-- =====================================================
-- 3. Users Table
-- =====================================================
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- argon2哈希
    name VARCHAR(255) NOT NULL,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    campus_id BIGINT REFERENCES campuses(id) ON DELETE SET NULL,  -- 软删除设为NULL
    role VARCHAR(50) NOT NULL CHECK (role IN ('Root', 'CampusAdmin', 'Teacher', 'Student')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_campus_id ON users(campus_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);


-- =====================================================
-- 4. Problems Table
-- =====================================================
CREATE TABLE problems (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,  -- 主租户
    campus_id BIGINT REFERENCES campuses(id) ON DELETE CASCADE,   -- 子校区
    author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    input_format TEXT,
    output_format TEXT,
    difficulty VARCHAR(50) CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    time_limit_ms INT NOT NULL CHECK (time_limit_ms > 0),          -- 1秒 = 1000ms
    memory_kb INT NOT NULL CHECK (memory_kb > 0),             -- 256MB = 262144KB
    total_tests INT DEFAULT 0,
    sample_cases JSONB,  -- 示例测试用例
    secret_cases JSONB,  -- 隐藏测试用例（加密或压缩）
    visibility VARCHAR(20) NOT NULL CHECK (visibility IN ('global', 'school', 'campus', 'class', 'private')),
    tags TEXT[],           -- PostgreSQL数组类型
    is_public BOOLEAN DEFAULT false,
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_problems_school_id ON problems(school_id);
CREATE INDEX idx_problems_campus_id ON problems(campus_id);
CREATE INDEX idx_problems_author_id ON problems(author_id);
CREATE INDEX idx_problems_visibility ON problems(visibility);
CREATE INDEX idx_problems_difficulty ON problems(difficulty);
CREATE INDEX idx_problems_created_at ON problems(created_at);


-- =====================================================
-- 5. Test Cases Table
-- =====================================================
CREATE TABLE test_cases (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    is_secret BOOLEAN NOT NULL,  -- true=隐藏测试，false=示例测试
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    input_size INT DEFAULT 0,
    output_size INT DEFAULT 0,
    time_limit_ms INT NOT NULL,   -- 继承problem的时间限制
    memory_kb INT NOT NULL,     -- 继承problem的内存限制
    score REAL DEFAULT 0.0,          -- 该用例分值（用于部分分）
    order_num INT NOT NULL,        -- 测试用例顺序
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_test_cases_problem_id ON test_cases(problem_id);
CREATE INDEX idx_test_cases_order ON test_cases(order_num);


-- =====================================================
-- 6. Submissions Table
-- =====================================================
CREATE TABLE submissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    language VARCHAR(20) NOT NULL CHECK (language IN ('python3', 'cpp', 'c', 'gcc', 'clang', 'clang++', 'g++', 'python'),
    source_code TEXT NOT NULL,     -- 原始代码
    status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'compiling', 'running', 'judged', 'failed'),
    verdict VARCHAR(20),  -- AC, WA, RTE, TLE, MLE, OLE, CE, IE
    time_ms INT DEFAULT 0,         -- 执行时间（毫秒）
    memory_kb INT DEFAULT 0,        -- 内存使用（KB）
    attempt INT DEFAULT 1,           -- 尝试次数
    score REAL DEFAULT 0.0,         -- 评测分数（用于竞赛排名）
    submission_ip VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_submissions_school_id ON submissions(school_id);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_problem_id ON submissions(problem_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_verdict ON submissions(verdict);
CREATE INDEX idx_submissions_created_at ON submissions(created_at);


-- =====================================================
-- 7. Test Case Results Table
-- =====================================================
CREATE TABLE test_case_results (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    test_case_id BIGINT NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    verdict VARCHAR(20) NOT NULL CHECK (verdict IN ('AC', 'WA', 'RTE', 'TLE', 'MLE', 'OLE')),
    time_ms INT DEFAULT 0,
    memory_kb INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_test_case_results_submission_id ON test_case_results(submission_id);
CREATE INDEX idx_test_case_results_test_case_id ON test_case_results(test_case_id);


-- =====================================================
-- 8. Classes Table
-- =====================================================
CREATE TABLE classes (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    campus_id BIGINT REFERENCES campuses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE SET NULL,  -- 软删除教师后设为NULL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_classes_campus_id ON classes(campus_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);


-- =====================================================
-- 9. Class Enrollments Table
-- =====================================================
CREATE TABLE class_enrollments (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'teaching_assistant', 'auditor')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'dropped', 'graduated')),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 唯一约束：一个学生在同一班级中只有一个active enrollment
CREATE UNIQUE INDEX idx_enrollments_class_student_active
    ON class_enrollments(class_id, student_id) 
    WHERE status = 'active';


-- =====================================================
-- 10. Assignments Table
-- =====================================================
CREATE TABLE assignments (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_published BOOLEAN DEFAULT true,  -- 是否发布给学生
    scoring_strategy VARCHAR(20) DEFAULT 'best_score' CHECK (scoring_strategy IN ('best_score', 'last_score', 'first_ac')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_assignments_class_id ON assignments(class_id);
CREATE INDEX idx_assignments_problem_id ON assignments(problem_id);
CREATE INDEX idx_assignments_start_time ON assignments(start_time);
CREATE INDEX idx_assignments_end_time ON assignments(end_time);


-- =====================================================
-- 11. Contests Table
-- =====================================================
CREATE TABLE contests (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rules VARCHAR(20) NOT NULL CHECK (rules IN ('acm', 'ioi', 'education')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    freeze_minutes INT DEFAULT 0,  -- 封榜时间（分钟，0=不封榜）
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_contests_school_id ON contests(school_id);
CREATE INDEX idx_contests_start_time ON contests(start_time);
CREATE INDEX idx_contests_end_time ON contests(end_time);


-- =====================================================
-- 12. Contest Problems Table (竞赛题目关联)
-- =====================================================
CREATE TABLE contest_problems (
    id BIGSERIAL PRIMARY KEY,
    contest_id BIGINT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    point_value INT DEFAULT 0,           -- 题目分值
    order_num INT NOT NULL,          -- 题目顺序
    created_at TIMESTAMP WITH TIME DEFAULT NOW()
);

-- 索引
CREATE UNIQUE INDEX idx_contest_problems_contest_problem ON contest_id, problem_id;


-- =====================================================
-- 13. Leaderboard Cache Table (可选，用于实时排名缓存)
-- =====================================================
CREATE TABLE leaderboard_cache (
    id BIGSERIAL PRIMARY KEY,
    scope_type VARCHAR(20) NOT NULL,  -- 'class', 'campus', 'school', 'global'
    scope_id BIGINT NOT NULL,         -- class_id/campus_id/school_id/0
    user_id BIGINT NOT NULL,
    ac_count INT DEFAULT 0,
    total_time_ms BIGINT DEFAULT 0,
    last_ac_time TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE UNIQUE INDEX idx_leaderboard_scope_user ON leaderboard_cache(scope_type, scope_id, user_id);


-- =====================================================
-- 14. Discussions Table
-- =====================================================
CREATE TABLE discussions (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES discussions(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,    -- 教师锁定，禁止回复
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_discussions_problem_id ON discussions(problem_id);
CREATE INDEX idx_discussions_user_id ON discussions(user_id);
CREATE INDEX idx_discussions_parent_id ON discussions(parent_id);
CREATE INDEX idx_discussions_created_at ON discussions(created_at);


-- =====================================================
-- 15. Discussion Replies Table
-- =====================================================
CREATE TABLE discussion_replies (
    id BIGSERIAL PRIMARY KEY,
    discussion_id BIGINT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_replies_discussion_id ON discussion_replies(discussion_id);
CREATE INDEX idx_replies_user_id ON discussion_replies(user_id);
CREATE INDEX idx_replies_created_at ON discussion_replies(created_at);


-- =====================================================
-- 16. Plagiarism Reports Table
-- =====================================================
CREATE TABLE plagiarism_reports (
    id BIGSERIAL PRIMARY KEY,
    submission1_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    submission2_id BIGINT REFERENCES submissions(id) ON DELETE CASCADE,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,  -- 报告范围
    scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('assignment', 'class', 'school')),
    scope_id BIGINT,                   -- assignment_id/class_id/school_id
    similarity_score REAL NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
    similarity_type VARCHAR(50),           -- 'winnowing', 'ast_based', 'runtime', 'time_analysis'
    details JSONB,                      -- 详细的相似度分析数据
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'cleared'),
    created_by BIGINT REFERENCES users(id) ON DELETE CASCADE,  -- 教师或管理员
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 教师审核时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retention_until TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '6 months')  -- 报告保留6个月
);

-- 索引
CREATE INDEX idx_plagiarism_reports_school_id ON plagiarism_reports(school_id);
CREATE INDEX idx_plagiarism_reports_scope ON plagiarism_reports(scope_type, scope_id);
CREATE INDEX idx_plagiarism_reports_status ON plagiarism_reports(status);
```

#### 字段类型约定

| 类型 | PostgreSQL | 说明 |
|------|------------|------|
| 主键 | `BIGSERIAL` | 自动递增的64位整数 |
| 外键 | `BIGINT` | 引用另一个表的主键，支持级联删除（ON DELETE CASCADE） |
| 字符串 | `VARCHAR(N)` | 固定长度字符串 |
| 文本 | `TEXT` | 不限长度文本 |
| 时间戳 | `TIMESTAMP WITH TIME ZONE` | 自动带时区，存储UTC |
| 布尔 | `BOOLEAN` | true/false |
| JSON | `JSONB` | 二进制JSON，比TEXT快 |
| 数组 | `TEXT[]` | PostgreSQL数组类型 |
| 枚举 | `CHECK (status IN (...))` | 确保只有枚举值 |

#### 索引设计原则

1. **所有外键字段必须有索引**：`FOREIGN KEY (referenced_table(id) ON DELETE CASCADE)`
2. **查询条件字段必须有索引**：经常用于WHERE条件的字段
3. **多值枚举字段不索引**：因为查询性能差
4. **复合索引**：多个字段的组合索引
5. **唯一索引**：确保业务约束（如：user email唯一、active enrollment唯一）

#### 迁移命名规范

文件格式：`YYYYMMDDHHMMSS_description.sql`
- 示例：`20240126150000_create_schools_table.sql`

---

## 4. 系统架构详细说明

### 14个组件架构图（详细版）

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                                            │
│  [14. Redis Cache] ───────────────────────────────┐  │
│  (leaderboard, stats,                          │
│   problem caches)                                  │
│                                                            │
└────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                            │
│  [12. PostgreSQL]                                      │
│  (持久化存储)                                        │
│                                                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                 │
│  │ - users (RBAC数据结构完整)                 │ │
│  │ - schools/campuses (租户层级)              │
│  │ - problems (含租户字段)                   │
│  │ - submissions (评测记录)                   │
│  │ - test_cases (测试用例)                    │
│  │ - classes/enrollments (班级)              │
│  │ - assignments (作业)                      │
│  │ - contests/contest_problems (竞赛)           │
│  │ - discussions/replies (讨论)              │
│  │ - plagiarism_reports (防作弊)             │
│  └────────────────────────────────────────────────────┘ │
│                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                            │
│  [11. Judge Workers]                                 │
│  (评测工作进程池)                                       │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                 │
│  │  [10. Sandbox (chroot+cgroups)]       │
│  │  ├─ Linux Cgroups v2                   │ │
│  │ ├─ Chroot 文件系统隔离              │ │
│  │ └─ Seccomp-BPF 系统调用过滤   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                 │
│  │ [13. Compilation Service]                   │
│  │ ├─ GCC/C++ 编译器                     │ │
│  │ └─ Python 3 解释器                   │
│  └─────────────────────────────────────────────┘ │
│  └─────────────────────────────────────────────────────┘
│                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                            │
│  [8. Redis Streams Queue]                               │
│  (消息队列，异步处理)                                   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Submission Messages                             │
│  │ (submission_id, problem_id, user_id,          │
│  │  school_id, language, code, time_limit)   │
│  │                                                 │
│  │ Consumer Groups                                │
│ │ ├─ worker-1, worker-2, ...                    │
│  │ └─ Pending List (PEL)                     │
│  │                                                 │
│  │ Retry Logic                                   │
│  │ ├─ 指数退避（exponential backoff）   │
│  │ ├─ 最大重试3次                             │
│  │ └─ 失败消息 → Dead Letter Queue │ │
│  └─────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                            │
│  [2. API Gateway]                                     │
│  (Axum Web服务器)                                         │
│                                                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                 │
│  │ [3. Auth/JWT Service]                          │
│  │ - 登录验证                                   │
│ │ - JWT token生成/验证                          │
│  │ - Token刷新                                    │
│  │ └─────────────────────────────────────────────┘ │
│  │                                                 │
│  ├─────────────────────────────────────────────┐ │
│  │ [4. RBAC Middleware]                            │
│ │ ├─ 权限检查 (require_permission)          │
│  │ ├─ User context提取器 (TenantContext)    │
│  │ └─ 角色映射 → 权限清单             │
│  │                                                 │
│  │ ├─────────────────────────────────────────────┐ │
│  │ [5. Tenant Middleware]                           │
│ │ └─ 租户ID提取 → 上下文设置       │
│ │                                                 │
│  │ ├─────────────────────────────────────────────┐ │
│  │ [6. Problem Service]                          │
│  │ ├─ 题目CRUD API                           │
│ │ ├─ 权限过滤 (仅租户内题目)            │
│ │ ├─ 测试用例管理                           │
│  │ └─ Kattis Package导入导出           │
│ │                                                 │
│ │ ├─────────────────────────────────────────────┐ │
│ │ [7. Submission Service]                       │
│ │ ├─ 提交接口（接收代码）                   │
│ │ ├─ 排队到Redis Streams                    │
│ │ └─ 实时状态查询                          │
│ │                                                 │
│ │ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│  │ [9. Leaderboard Service]                     │ │
│ │ ├─ Redis Sorted Sets排名                      │
│ │ ├─ 实时更新                               │
│ │ ├─ 缓存失效策略                           │
│ │ └─ 导出CSV（教师可用）                     │
│ │                                                 │
│ │ ├─────────────────────────────────────────────┐ │
│ │ [15. Anti-Cheat Service]                    │ │
│ │ ├─ 代码相似度检测（MOSS/AST）         │
│ │ ├─ 提交时间分析                           │
│ │ ├─ 运行时特征分析                         │
│ │ └─ 报告生成（JSON）                     │
│ │                                                 │
│ │ └─────────────────────────────────────────────┘ │
│                                                 │
│ ├─────────────────────────────────────────────┐ │
│ │ [16. Notification Service]                     │
│ │ ├─ WebSocket服务器                           │
│ │ ├─ 实时状态推送                           │
│ │ ├─ 邮件通知系统                         │
│ │ └─ 短轮询降级（可选）                  │
│ │ └─────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                            │
│  [1. Angular UI]                                       │
│  (Web应用 + 管理界面)                                   │
│                                                            │
│  ├─ 组件层级结构                                 │
│ │ ├─ [20-26] 页面模块                           │
│ │ │   ├─ Auth Pages (20-21)                   │
│ │ │   │   ├─ Login Page                      │
│ │ │   │   └─ Registration Message      │
│ │ │   │
│ │ │   ├─ Problem Pages (22)                     │
│ │ │   │   ├─ Problem List                   │
│ │ │   │   ├─ Problem Detail                  │
│ │ │   │   └─ Code Editor (Monaco)      │
│ │ │   │
│ │ │   ├─ Submission Pages (23)                  │
│ │ │   │   ├─ Submission List                │
│ │ │   │   ├─ Submission Detail              │
│ │ │   │   ├─ Real-time Status Update      │
│ │ │ │   └─ Verdict Badges              │
│ │ │   │
│ │ │   ├─ Leaderboard Page (24)                │
│ │ │   │   ├─ Scope Selector                 │
│ │   │   ├─ Ranking Table                   │
│ │   │   ├─ Charts (Chart.js)              │
│ │ │   │   └─ Export CSV                     │
│ │ │   │
│ │ │   ├─ Teacher Dashboard (25)              │
│ │ │   │   ├─ Class Management            │
│ │ │   │   ├─ Student Enrollment (CSV)      │
│ │ │   │   ├─ Assignment Creation         │
│ │ │   │   ├─ Assignment Dashboard        │
│ │ │   │   ├─ Plagiarism Review          │
│ │ │   │   └─ Discussion Moderation     │
│ │   │   │
│ │ │   └─ Student Dashboard (26)              │
│ │ │       ├─ Assignment List              │
│ │ │       ├─ Recent Submissions          │
│ │ │       ├─ Problem Progress          │
│ │ │       └─ Notification Center      │
│ │ │
│   │   └─ Common Components
│ │       ├─ Shared Module (通用组件)
│ │       ├─ HTTP Client (带JWT + Tenant)
│ │       ├─ State Management (RxJS/NgRx)
│ │       └── Error Handling
│ │                                                            │
│ └─────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 沙箱实现：详细实现示例

### chroot环境设置完整示例

```rust
// judge-worker/src/sandbox/chroot.rs
use nix::unistd::{chroot, chdir, setgid, setuid, Gid};
use nix::mount::mount;
use std::{fs, path::Path};
use std::os::unix::process::CommandExt;

const SANDBOX_USER: Gid = from_raw(1000);
const SANDBOX_GROUP: Gid = from_raw(1000);
const SANDBOX_ROOT: &Path = Path::new("/var/lib/onlinejudge/sandbox");

pub struct ChrootEnvironment {
    pub root_path: PathBuf,
    pub original_pid: i32,
}

impl ChrootEnvironment {
    pub fn new(root_path: Path, original_pid: i32) -> Self {
        Self { root_path, original_pid }
    }

    pub fn setup(&self) -> std::io::Result<()> {
        // 1. 确保root目录存在
        fs::create_dir_all(self.root_path)?;

        // 2. 准备进程文件系统
        let proc_path = self.root_path.join("proc");
        fs::create_dir_all(proc_path)?;
        let sys_path = self.root_path.join("sys");
        fs::create_dir_all(sys_path)?;

        // 3. mount proc和sys
        mount::mount(
            Some("proc"), "/proc", Some("proc"),
            mount::MsFlags::empty(), None::<&str>
        )?;
        mount::mount(
            Some("sys"), "/sys", Some("sys"),
            mount::MsFlags::empty(), None::<&str>
        )?;

        Ok(())
    }

    pub fn enter(&self) -> std::io::Result<()> {
        // 降权并chroot
        chroot(&self.root_path)?;
        chdir("/")?;

        // 设置用户和组
        setuid(SANDBOX_USER)?;
        setgid(SANDBOX_GROUP)?;

        // 确认权限
        let uid = getuid()?;
        let gid = getgid()?;
        println!("Dropped to UID={}, GID={}", uid, gid);

        Ok(())
    }

    pub fn restore(&self) -> std::io::Result<()> {
        // chroot的进程已经结束，这里不需要操作
        Ok(())
    }
}

pub fn drop_privileges() {
    unsafe {
        libc::seteuid(0);
        libc::setegid(0);
    }
}

unsafe fn getuid() -> libc::uid_t {
    libc::getuid()
}

unsafe fn getgid() -> libc::gid_t {
    libc::getgid()
}
```

### cgroups v2 配置完整示例

```rust
// judge-worker/src/sandbox/cgroups_v2.rs
use std::{fs, path::Path, io::Write};

#[derive(Debug)]
pub struct CgroupConfig {
    pub cpu_time_limit_ms: u64,
    pub memory_limit_bytes: u64,
    pub pids_max: u32,
}

pub struct CgroupController {
    cgroup_path: PathBuf,
}

impl CgroupController {
    pub fn new(cgroup_name: &str) -> Self {
        let path = Path::new("/sys/fs/cgroup/onlinejudge");
        Self {
            cgroup_path: path.join(cgroup_name),
        }
    }

    pub fn create(&self) -> std::io::Result<()> {
        fs::create_dir_all(&self.cgroup_path)?;

        // 创建cgroup
        let _ = fs::write(self.cgroup_path.join("cgroup.type"), "0")?;  // 0表示threaded，1=unthreaded
        let _ = fs::write(self.cgroup_path.join("cgroup.controllers"), "cpu,memory,pids")?;

        // 设置CPU限制（20% = 20000ms = 20毫秒 = 100000微秒）
        // CFS使用100000微秒作为基本单位，所以20% = 20000
        let cpu_quota = (self.config.cpu_time_limit_ms * 1000) / 20000;
        fs::write(self.cgroup_path.join("cpu.max"), &format!("{}", cpu_quota))?;

        // 设置内存限制
        fs::write(self.cgroup_path.join("memory.max"), &format!("{}", self.config.memory_limit_bytes))?;

        // 设置进程数限制
        fs::write(self.cgroup_path.join("pids.max"), &format!("{}", self.config.pids_max))?;

        println!("Created cgroup at {:?}", self.cgroup_path);
        Ok(())
    }

    pub fn add_process(&self, pid: i32) -> std::io::Result<()> {
        let pid_str = pid.to_string();
        fs::write(self.cgroup_path.join("cgroup.procs"), &pid_str)?;

        println!("Added process {} to cgroup", pid);
        Ok(())
    }

    pub fn remove_process(&self, pid: i32) -> std::io::Result<()> {
        let pid_str = pid.to_string();
        fs::write(self.cgroup_path.join("cgroup.procs"), &pid_str)?;

        println!("Removed process {} from cgroup", pid);
        Ok(())
    }
}

impl Default for CgroupConfig {
    fn default() -> Self {
        Self {
            cpu_time_limit_ms: 2000,   // 2秒
            memory_limit_bytes: 268435456,  // 256MB
            pids_max: 64,                   // 最多64个进程
        }
    }
}
```

### seccomp-BPF 过滤器配置示例

```rust
// judge-worker/src/sandbox/seccomp.rs
use libseccomp::{ScmpFilterContext, ScmpAction, ScmpSyscall, ScmpFilterContext::new_filter};

pub fn apply_seccomp() -> Result<(), Box<dyn std::error::Error>> {
    let mut filter = ScmpFilterContext::new_filter(ScmpAction::KillProcess)?;

    // 允许的syscall白名单（最小权限）
    let allowed_syscalls = [
        "read", "write", "exit", "exit_group", "fstat",
        "mmap", "mprotect", "brk", "rt_sigaction", "rt_sigprocmask",
        "arch_prctl", "close", "execve", "access", "open",
        "stat", "lstat", "fstat", "getrlimit", "gettimeofday"
    ];

    for name in allowed_syscalls {
        filter.add_rule(
            ScmpAction::Allow,
            ScmpSyscall::from_name(name)?,
            &[]
        )?;
    }

    // 禁止网络相关的syscall
    let blocked_syscalls = [
        "socket", "connect", "bind", "listen", "accept", "send",
        "sendto", "recvfrom", "shutdown", "getpeername"
    ];

    for name in blocked_syscalls {
        filter.add_rule(
            ScmpAction::KillProcess,  // 直接杀死进程
            ScmpSyscall::from_name(name)?,
            &[]
        )?;
    }

    filter.load()?;

    // 设置为当前进程
    unsafe {
        libc::prctl(libc::PR_SET_SECCOMP, &filter);
    }

    Ok(())
}

pub fn cleanup_seccomp() {
    unsafe {
        libc::prctl(libc::PR_SET_SECCOMP, &Default::default());
    }
}
```

### 进程启动与执行

```rust
// judge-worker/src/sandbox/executor.rs
use std::process::{Command, Stdio};
use std::time::Duration;

pub fn execute_sandboxed(
    chroot_env: &ChrootEnvironment,
    cgroup: &CgroupController,
    program: &str,
    args: &[&str],
    timeout_ms: u64,
) -> Result<(String, i32), String> {
    // 1. 进入chroot环境
    chroot_env.enter()?;

    // 2. 添加到cgroup
    let child = Command::new(program)
        .args(args)
        .pre_exec(move || {
            // 降权
            nix::unistd::setuid(SANDBOX_USER)?;
            nix::unistd::setgid(SANDBOX_GROUP)?;
            nix::unistd::chroot(&chroot_env.root_path)?;
            nix::unistd::chdir("/")?;
            Ok(())
        })
        .spawn()?;

    let pid = child.id();

    // 3. 添加到cgroup进行资源控制
    cgroup.add_process(pid)?;

    // 4. 应用seccomp过滤器
    apply_seccomp()?;

    // 5. 等待完成或超时
    let output = match child.wait_timeout(Duration::from_millis(timeout_ms as u64)) {
        Ok(status) if status.success() => {
            String::from_utf8(status.stdout)
        }
        Err(e) if e.kind() == io::ErrorKind::TimedOut => {
            // 超时，杀死进程
            libc::kill(pid, libc::SIGKILL);
            format!("Process timed out ({}ms)", timeout_ms)
        }
        Err(e) => {
            e.to_string()
        }
    };

    // 6. 清理：从cgroup移除，恢复chroot
    cgroup.remove_process(pid)?;
    drop_privileges();
    chroot_env.restore()?;

    Ok((output, pid))
}
```

### 已知注意事项

1. **chroot要求**：
   - root用户或CAP_SYS_CHROOT能力
   - 新的root目录不能包含原目录的硬链接（会逃逸）
   - 需要复制必要的库文件

2. **cgroups v2要求**：
   - Linux内核 >= 5.19
   - 内核启用了cgroups v2（可以通过/proc/filesystems/cgroup v2查看）
   - 需要root权限操作/sys/fs/cgroup

3. **seccomp-BPF要求**：
   - 内核支持seccomp-BPF（大多数现代内核都支持）
   - 需要root权限加载seccomp过滤器
   - 某些架构（如arm64）可能有额外的限制

4. **安全性**：
   - 必须按顺序操作：chroot → 降权 → seccomp → 执行 → 清理
   - 任何步骤失败都必须记录安全日志
   - 进程超时后立即kill，不要等待

---

## 6. Redis Streams队列：消费者组完整实现

### Consumer Group设置

```rust
// judge-worker/src/queue/consumer.rs
use redis::{AsyncCommands, streams::StreamReadOptions, StreamReadReply};
use tokio::sync::mpsc::UnboundedReceiver;

pub struct SubmissionConsumer {
    client: redis::Client,
    stream_name: String,
    group_name: String,
    consumer_name: String,
}

impl SubmissionConsumer {
    pub fn new(client: redis::Client) -> Self {
        Self {
            client,
            stream_name: "submission_queue".to_string(),
            group_name: "judge-workers".to_string(),
            consumer_name: format!("judge-worker-{}", std::process::id()),
        }
    }

    pub async fn consume(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // 确保消费组存在
        let _: () = self.client
            .xgroup_create_mkstream(
                &self.stream_name,
                &self.group_name,
                "0"  // 使用MKSTREAM创建，从头开始
            ).await?;

        loop {
            let opts = StreamReadOptions::default()
                .group(&self.group_name, &self.consumer_name)
                .count(1)
                .block(5000); // 阻塞5秒

            let reply: StreamReadReply = self
                .xread_options(
                    &[&self.stream_name],
                    &[
                        ">".to_string(),
                        &[&self.group_name, &self.consumer_name]
                    ],
                    &opts,
                ).await?;

            if reply.keys.is_empty() {
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                continue;
            }

            for (key, ids) in &reply.keys {
                for id in ids.ids {
                    if let Some(submission_id) = id.get("submission_id").and_then(|v| v.as_str()) {
                        match self.process_submission(submission_id).await {
                            Ok(true) => {
                                // 处理成功，ACK消息
                                let _: () = self.client
                                    .xack(
                                        &self.stream_name,
                                        &self.group_name,
                                        &[&id.id],
                                    ).await?;
                            }
                            Err(e) => {
                                eprintln!("Error processing {}: {}", submission_id, e);
                                let attempt: u32 = id
                                    .get("attempt")
                                    .and_then(|v| v.as_str())
                                    .and_then(|v| v.parse().unwrap_or(0u32));

                                if attempt >= 3 {
                                    // 3次失败，转入DLQ
                                    let mut fields = id.map(|(k, v)| (k.to_string(), v.as_ref().unwrap_or(&"".to_string()));
                                    fields.insert("error".into(), e.to_string());
                                    let _: () = self.client
                                        .xadd(
                                            "submission_queue_dlq",
                                            "*",
                                            &fields,
                                        ).await?;

                                    // ACK原消息
                                    let _: () = self.client
                                        .xack(
                                                &self.stream_name,
                                                &self.group_name,
                                                &[&id.id],
                                            ).await?;
                                } else {
                                    // 重试：增加attempt计数，重新入队
                                    let mut fields = id.map(|k, v)| (k.to_string(), v.as_ref().unwrap_or(&"".to_string()));
                                    fields.insert("attempt".into(), (attempt + 1).to_string());
                                    let _: () = self.client
                                        .xadd(
                                                "submission_queue",
                                                "*",
                                                &fields,
                                        ).await?;

                                    // ACK原消息
                                    let _: () = self.client
                                        .xack(
                                                &self.stream_name,
                                                &self.group_name,
                                                &[&id.id],
                                            ).await?;
                                }
                            }
                        }
                        Err(e) => eprintln!("Failed to parse submission_id"),
                    }
                }
            }
        }
    }

    async fn process_submission(
        &mut self,
        submission_id: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // 1. 从Redis获取完整submission数据
        let submission: Submission = self.get_submission_data(submission_id).await?;

        // 2. 调用评测Worker执行
        match judge_worker::evaluate(&submission).await {
            Ok(result) => {
                // 3. 保存结果到数据库
                self.save_result(submission_id, &result).await?;
            }
            Err(e) => {
                eprintln!("Judging failed for {}: {}", submission_id, e);
                // 记录错误但不ACK，让它重新排队
                return Err(e);
            }
        }

        Ok(())
    }
}
```

### 幂等性、重试和DLQ

```rust
// judge-worker/src/queue/retry_logic.rs

// 幂等等待：5秒（指数退避，jitter避免惊群效应）
pub async fn backoff(attempt: u32) -> Duration {
    let base_ms = 1000u64; // 基础1秒
    let max_ms = 60000u64;  // 最大60秒
    let delay = base_ms * 2u32.pow(attempt.min(10)));
    Duration::from_millis(delay.min(max_ms))
}

// 死信队列：保存失败的任务供手动处理
pub async fn move_to_dlq(
    submission_id: &str,
    error: String,
) -> Result<(), Box<dyn std::error::Error>> {
    // 将任务移动到死信队列，带错误信息
    let fields = vec![
        ("original_id".to_string(), submission_id.to_string()),
        ("error".to_string(), error),
        ("moved_at".to_string(), chrono::Utc::now().to_rfc3339().to_string()),
    ];

    let _: () = redis::client
        .hmset(
            format!("submission_dlq:{}", submission_id),
            &fields,
        ).await?;

    println!("Moved submission {} to DLQ due to: {}", submission_id, error);

    Ok(())
}

// 恢复PEL：worker重启时恢复未完成的任务
pub async fn recover_pending(&self) -> Result<(), Box<dyn std::error::Error>> {
    // 读取所有pending消息
    let opts = StreamReadOptions::default()
        .group(&self.group_name, &self.consumer_name)
        .count(100)
        .block(0);

    let reply: StreamReadReply = self
        .xread_options(
            &[&self.stream_name],
            &[">"],  // 只读取pending，不消费
            &[&self.group_name, &self.consumer_name],
            &opts,
        ).await?;

    for (key, ids) in &reply.keys {
        for id in ids.ids {
            // XCLAIM：重新声明所有权（如果其他worker崩溃了）
            let _: () = self.client
                .xclaim(
                    &self.stream_name,
                    &self.group_name,
                    &min_idle_time: 0,  // 立即可
                    &[&id.id],
                ).await?;
        }
    }

    Ok(())
}
```

---

## 7. 防作弊：代码相似度检测算法

### Token-based Winnowing (简化版MOSS)

```rust
// api/src/anti_cheat/token_winning.rs
use std::collections::{HashMap, HashSet};

#[derive(Clone, Debug)]
struct Fingerprint {
    tokens: Vec<u64>,  // k-grams的hash
    total_tokens: usize,   // 总token数
}

fn tokenize(code: &str, k: usize) -> Vec<String> {
    // 1. 移除空白和注释
    let cleaned: String = code
        .lines()
        .filter(|line| !line.trim().is_empty())
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase();

    // 2. 拆分成单词（按空格和标点）
    let words: Vec<&str> = cleaned
        .split(|c: char| !c.is_alphanumeric())
        .collect();

    // 3. 生成k-grams (k=5: 连续k个字符)
    let mut kgrams: Vec<String> = Vec::new();
    for window in windows(&words, k) {
        let kgram: String = window.join("");
        kgrams.push(kgram);
    }

    kgrams
}

fn hash_kgram(kgram: &str) -> u64 {
    // 使用简单的rolling hash
    let mut hash: u64 = 0xcb;
    for byte in kgram.bytes() {
        hash = hash.wrapping_mul(31).wrapping_add(1) ^ byte);
    }
    hash
}

fn compute_jaccard(set_a: &HashSet<u64>, set_b: &HashSet<u64>) -> f64 {
    let intersection: HashSet<&u64> = set_a.intersection(set_b);
    let union: HashSet<&u64> = set_a.union(set_b);
    let intersection_size = intersection.len() as f64;
    let union_size = union.len() as f64;

    if union_size == 0.0 {
        return 0.0;
    } else {
        intersection_size as f64 / union_size
    }
}

pub fn compute_similarity(submission_a: &str, submission_b: &str) -> f64 {
    let k = 5usize;
    let fp_a: Fingerprint = Fingerprint {
        tokens: tokenize_and_hash(submission_a, k),
        total_tokens: 0,
    };
    let fp_b: Fingerprint = Fingerprint {
        tokens: tokenize_and_hash(submission_b, k),
        total_tokens: 0,
    };

    let common_hashes = fp_a.tokens
        .iter()
        .filter(|h| fp_b.tokens.contains(h))
        .collect::<HashSet<_>>();

    let similarity = compute_jaccard(&common_hashes, &fp_b.tokens);
    similarity
}
```

### AST结构化相似度（高级）

```rust
// api/src/anti_cheat/ast_similarity.rs
use tree_sitter::{Parser, Tree, Node};
use std::collections::HashSet;

fn normalize_ast(code: &str, language: &str) -> Vec<String> {
    match language {
        "python" | "python3" => {
            let mut parser = Parser::new(&code, language).unwrap();
            let root = parser.root_node().unwrap();
            extract_identifiers(&root, language)
        }
        "cpp" | "c++" | "gcc" | "clang" => {
            let mut parser = Parser::new(&code, language).unwrap();
            let root = parser.root_node().unwrap();
            extract_identifiers(&root, language)
        }
        _ => vec![],
    }
}

fn extract_identifiers(node: &Node, language: &str) -> Vec<String> {
    let mut identifiers = Vec::new();

    match node {
        Node::Identifier(i) => {
            identifiers.push(i.clone());
            // 递归处理子节点
        }
        Node::NamedFunctionRef(_) => {
            identifiers.push(node.clone());
            identifiers.extend(extract_identifiers_from_signature(&node)?);
        }
        Node::FunctionDefinition(_) => {
            identifiers.push("function".to_string());
            identifiers.extend(extract_identifiers_from_params(&node)?);
        }
        Node::BinaryOp(_) => identifiers.push("op".to_string()),
        Node::UnaryOp(_) => identifiers.push("op".to_string()),
        _ => {}
    }

    identifiers
}

fn extract_identifiers_from_params(node: &Node) -> Option<Vec<String>> {
    // 函数参数的标识符
    node.children()
        .filter_map(|child| matches!(child, Node::Parameter(_)))
        .map(|child| child.clone())
        .collect()
}

fn compute_ast_similarity(submission_a: &str, submission_b: &str, language: &str) -> f64 {
    let ids_a: Vec<String> = normalize_ast(submission_a, language);
    let ids_b: Vec<String> = normalize_ast(submission_b, language);

    let set_a: HashSet<String> = ids_a.into_iter().collect();
    let set_b: HashSet<String> = ids_b.into_iter().collect();

    // Jaccard index计算：|A ∩ B| / |A ∪ B|
    let intersection = set_a.intersection(&set_b);
    let union: HashSet<&String> = set_a.union(&set_b);
    let intersection_size = intersection.len() as f64;
    let union_size = union.len() as f64;

    if union_size == 0 {
        0.0
    } else {
        intersection_size as f64 / union_size
    }
}
```

### 运行时特征分析

```rust
// api/src/anti_cheat/runtime_similarity.rs
pub struct RuntimeProfile {
    pub avg_time_ms: u64,
    pub max_time_ms: u64,
    pub avg_memory_kb: u64,
    pub max_memory_kb: u64,
    pub time_distribution: Vec<u64>,  // 时间分布直方图（10个bin）
}

fn analyze_runtime(submissions: &[Submission]) -> Vec<RuntimeProfile> {
    submissions
        .chunks(10)
        .map(|chunk| {
            let times: Vec<u64> = chunk.iter().map(|s| s.time_ms as u64).collect();
            let memories: Vec<u64> = chunk.iter().map(|s| s.memory_kb as u64).collect();

            RuntimeProfile {
                avg_time_ms: average(&times),
                max_time_ms: *times.iter().max().unwrap_or(&0),
                avg_memory_kb: average(&memories),
                max_memory_kb: *memories.iter().max().unwrap_or(&0),
                time_distribution: create_histogram(&times, 10),
            }
        })
        .collect()
}

fn average(values: &[u64]) -> u64 {
    let sum: u64 = values.iter().sum();
    if values.is_empty() { 0 } else { sum / values.len() as u64 }
}

fn create_histogram(values: &[u64], bins: usize) -> Vec<u64> {
    let mut histogram = vec![0; bins];
    for value in values {
        let bin_index = (value / (values.iter().max().unwrap_or(&1) / *bins).min(*bins - 1, *bins - 1));
        histogram[bin_index] += 1;
    }
    histogram
}

fn detect_runtime_anomaly(
    submission_a: &Submission,
    submission_b: &Submission,
) -> f64 {
    let profile_a = analyze_runtime(&[submission_a]);
    let profile_b = analyze_runtime(&[submission_b]);

    // 比较时间分布和内存使用
    let time_diff = (profile_a.avg_time_ms as i64 - profile_b.avg_time_ms as i64).abs() as f64;
    let memory_diff = (profile_a.avg_memory_kb as i64 - profile_b.avg_memory_kb as i64).abs() as f64);

    // 标准化差值（避免极端值影响太大）
    let normalized_time_diff = (time_diff as f64).min(100.0) / (time_diff as f64).max(100.0));
    let normalized_memory_diff = (memory_diff as f64).min(1000.0) / (memory_diff as f64).max(1000.0));

    // 综合相似度（权重：时间60% + 内存40%）
    0.6 * normalized_time_diff + 0.4 * normalized_memory_diff
}
```

### 提交时间分析

```rust
// api/src/anti_cheat/time_analysis.rs
use chrono::{DateTime, Utc, Duration};

pub fn detect_simultaneous_submissions(
    submissions: &[Submission],
    time_window_seconds: u64,  // 默认5秒
) -> Vec<SubmissionPair> {
    let mut pairs: Vec::SubmissionPair> = Vec::new();

    for (i, sub_i) in submissions.iter().enumerate() {
        let sub_a = sub_i;
        for (j, sub_j) in submissions.iter().enumerate() {
            if j <= i {
                continue;
            }

            let time_diff = sub_a
                .created_at
                .signed_duration_since::<DateTime<Utc>>(
                    sub_j.created_at
                )
                .unwrap_or_else(|_| Duration::zero())
                .num_seconds()
                .abs() as i64;

            if time_diff <= time_window_seconds as i64 {
                pairs.push((sub_a.clone(), sub_j.clone()));
            }
        }
    }

    pairs
}

#[derive(Clone)]
pub struct SubmissionPair {
    pub submission_a: Submission,
    pub submission_b: Submission,
}
```

### 综合相似度评分

```rust
// api/src/anti_cheat/score_calculator.rs
use std::cmp::Ordering;

pub struct SimilarityReport {
    pub submission_id: String,
    pub token_similarity: f64,
    pub ast_similarity: f64,
    pub runtime_similarity: f64,
    pub time_similarity: f64,
    pub overall_similarity: f64,
    pub risk_level: RiskLevel,
}

#[derive(Debug)]
pub enum RiskLevel {
    Low,    // 0.0-0.3 (低风险)
    Medium, // 0.3-0.6 (中等风险)
    High,    // 0.6-1.0 (高风险)
    Critical, // >0.1.0 (极高风险)
}

pub fn calculate_composite_similarity(
    token_sim: f64,
    ast_sim: f64,
    runtime_sim: f64,
    time_sim: f64,
) -> SimilarityReport {
    let token_weight = 0.3;  // token-based最可靠
    let ast_weight = 0.2;    // AST结构最准确但可能误报
    let runtime_weight = 0.2; // 运时特征最不稳定
    let time_weight = 0.2;     // 提交时间最易误报

    let composite = token_sim * token_weight
                  + ast_sim * ast_weight
                  + runtime_sim * runtime_weight
                  + time_sim * time_weight;

    let risk_level = match composite {
        s if s >= 0.8 => RiskLevel::Critical,
        s if s >= 0.6 => RiskLevel::High,
        s if s >= 0.3 => RiskLevel::Medium,
        _ => RiskLevel::Low,
    };

    SimilarityReport {
        submission_id: String::new(),
        token_similarity: token_sim,
        ast_similarity: ast_sim,
        runtime_similarity: runtime_sim,
        time_similarity: time_sim,
        overall_similarity: composite,
        risk_level,
    }
}
```

---

## 8. 任务依赖重新组织（解决循环依赖）

### 新增任务0：定义系统核心数据结构

- **位置**：Phase 1之前
- **内容**：定义所有核心模型和数据结构
- **输出**：共享数据结构定义、认证相关结构、枚举、接口trait

### 依赖关系（修复后）
```
任务0: 系统核心数据结构定义
  ↓
任务1-3: 基础设施
  ↓
任务5: JWT认证（依赖任务0）
  ↓
任务4: 租户中间件（依赖任务0、5）
  ↓
任务6-7: RBAC/组织管理
  ↓
任务8: 数据库Schema（依赖任务0）
  ↓
任务9-18: 其他功能实现
```

**关键点**：
- 任务0必须在最前面，消除循环依赖
- 任务0不依赖任何数据库或外部服务
- 任务0定义的结构直接用于所有后续任务
- JWT Token结构、租户上下文、权限系统都在任务0中定义
- 任务5和4的依赖关系变简单清晰
```

---

## 9. 总结

### 关键改进

1. ✅ JWT Token Payload结构明确
2. ✅ 循环依赖问题解决
3. ✅ 数据库Schema详细设计指导
4. ✅ 系统架构详细说明（14个组件+交互）
5. ✅ 沙箱实现：完整Rust代码示例
6. ✅ Redis Streams：消费者组+重试+DLQ模式
7. ✅ 防作弊：3种算法的详细实现

### 实施建议

1. **从任务0开始**：先定义所有数据结构，消除技术债务
2. **严格按照新任务顺序执行**：任务0 → 任务1-3 → 任务5 → ...
3. **参考本文件的代码示例**：特别是chroot/cgroups/seccomp部分
4. **测试驱动开发**：每个任务都遵循RED-GREEN-REFACTOR循环
5. **持续参考原计划**：本文件是补充，原计划中的所有31个任务仍然有效

---

**文件使用说明**：
- 本文件包含所有5个关键改进的详细实现指导
- 原计划文件（education-online-judge.md）中的31个任务仍然有效
- 开发者应该：
  1. 先阅读本补充文件
  - 然后按原计划任务顺序实施
  - 遇到参考本文件的代码示例
  - 在实施时更新任务完成状态

**与原计划的关系**：
- 本文件是增强，不是替换
- 原计划中的任务分解和验收标准保持不变
- 本文件提供的技术细节和代码示例是原计划的补充
- 开发者需要同时参考两个文件
