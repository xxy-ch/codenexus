---
wave: 3
depends_on: [1, 2]
files_modified:
  - api-infra/src/lib.rs
  - api-infra/src/traits/mod.rs
  - api-infra/src/traits/user_repo.rs
  - api-infra/src/traits/problem_repo.rs
  - api-infra/src/traits/submission_repo.rs
  - api-infra/src/traits/contest_repo.rs
  - api-infra/src/traits/class_repo.rs
  - api-infra/src/traits/community_repo.rs
  - api-infra/src/traits/leaderboard_repo.rs
  - api-infra/src/traits/search_repo.rs
  - api-infra/src/traits/submission_service.rs
  - api-infra/src/traits/notification_service.rs
  - api-infra/src/config.rs
  - api/Cargo.toml
  - api/src/main.rs
autonomous: true
requirements:
  - ARCH-02
  - ARCH-03
  - SEC-01
  - SEC-06
---

# Plan 03: Define Trait Interfaces + AppConfig with SEC-01/SEC-06

<objective>
Define 8 repository trait interfaces and 2 service trait interfaces in `api-infra/src/traits/`. Create the `AppConfig` struct with environment-based secret validation (SEC-01: fail in production if secrets missing; SEC-06: APP_ENV controls behavior). Wire `AppConfig` into `api/src/main.rs` to replace the scattered `std::env::var().unwrap_or_else()` calls.
</objective>

<threat_model>
- **HIGH (SEC-01)**: Hardcoded default secrets (`"default_jwt_secret_change_me"`, `"default_worker_secret_change_me"`) are a critical vulnerability. If deployed to production, anyone who knows the defaults can forge JWT tokens. The `AppConfig::from_env()` constructor MUST reject missing secrets when `APP_ENV=production`. This is verified by a unit test that asserts `AppStartupError::MissingSecret` is returned.
- **MEDIUM (SEC-06)**: CORS wildcard (`Any`) in production allows any origin to make authenticated requests, enabling CSRF. The `AppConfig.cors_origins` field MUST be empty (not wildcard) when `APP_ENV=production` and `CORS_ORIGINS` is not set. The `create_router` function MUST use `cors_origins` from config instead of `CorsLayer::new().allow_origin(Any)`.
- **LOW**: Trait definitions are additive code. They define interfaces but have no runtime behavior until implemented. No security risk.
- **LOW**: `AppConfig::test_config()` uses deterministic test values. These must never leak to production via environment variable pollution.
</threat_model>

<must_haves>
- [ ] All 8 repository traits defined with `#[async_trait]` and at least 5 methods each
- [ ] All traits return `Result<T, AppError>` where `AppError` is `api_infra::error::AppError`
- [ ] Each trait has companion input/filter struct types defined in the same file
- [ ] `cargo doc -p api-infra --no-deps` succeeds (all types documented)
- [ ] `AppConfig::from_env()` returns `Err(MissingSecret("JWT_SECRET"))` when `APP_ENV=production` and `JWT_SECRET` is unset
- [ ] `AppConfig::from_env()` returns `Err(MissingSecret("WORKER_SECRET"))` when `APP_ENV=production` and `WORKER_SECRET` is unset
- [ ] `AppConfig::from_env()` returns `Ok(...)` with insecure defaults when `APP_ENV=development` and secrets are unset
- [ ] `api/src/main.rs` uses `AppConfig::from_env()` instead of scattered `std::env::var` calls
- [ ] `api/src/main.rs::create_router` uses `AppConfig.cors_origins` instead of `CorsLayer::new().allow_origin(Any)`

## Tasks

### Task 03-01: Add async-trait dep to api-infra + Create traits module structure

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/Cargo.toml (add async-trait dep)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/lib.rs (add traits module)
</read_first>

<action>
1. Add `async-trait = "0.1"` to `api-infra/Cargo.toml` `[dependencies]`.

2. Create `api-infra/src/traits/mod.rs`:
```rust
pub mod class_repo;
pub mod community_repo;
pub mod contest_repo;
pub mod leaderboard_repo;
pub mod notification_service;
pub mod problem_repo;
pub mod search_repo;
pub mod submission_repo;
pub mod submission_service;
pub mod user_repo;
```

3. Add `pub mod traits;` to `api-infra/src/lib.rs`.

4. Run `cargo build -p api-infra` -- it will fail because the module files don't exist yet. Create placeholder files for each trait with just a doc comment:
```rust
// Placeholder -- implemented in subsequent tasks
```

5. Run `cargo build -p api-infra` -- should succeed with empty module files.
</action>

<acceptance_criteria>
- `grep "async-trait" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/Cargo.toml` returns a match
- `test -d /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/` succeeds
- `test -f /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/mod.rs` succeeds
- `cargo build -p api-infra` exits 0
</acceptance_criteria>

### Task 03-02: Define all 8 repository trait interfaces

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/error.rs (for AppError type used in return types)
- /Users/xiexingyu/Documents/项目/Online_Judge/shared/src/models/user.rs (for User, UserPublic types)
- /Users/xiexingyu/Documents/项目/Online_Judge/shared/src/models/role.rs (for Role type)
- /Users/xiexingyu/Documents/项目/Online_Judge/shared/src/models/permission.rs (for Permission type)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/problems/models.rs (for understanding Problem model shape)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/contests/models.rs (for understanding Contest model shape)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/classes/models.rs (for understanding Class model shape)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/submissions/models.rs (for understanding Submission model shape)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/leaderboard/models.rs (for understanding Leaderboard model shape)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/discussions/models.rs (for understanding Discussion model shape)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/blog/models.rs (for understanding Blog model shape)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/search/service.rs (for understanding SearchService shape)
</read_first>

<action>
Define all 8 trait files. Each trait uses `#[async_trait]`, returns `Result<T, crate::error::AppError>`, and defines companion input/output struct types.

**File: `api-infra/src/traits/user_repo.rs`**

```rust
use async_trait::async_trait;
use shared::models::role::Role;
use shared::models::user::{User, UserPublic};
use uuid::Uuid;
use crate::error::AppError;

/// Input for creating a new user
#[derive(Debug, Clone)]
pub struct CreateUserInput {
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub school_id: i64,
    pub campus_id: Option<i64>,
    pub display_name: Option<String>,
    pub user_code: Option<String>,
}

/// Input for updating an existing user
#[derive(Debug, Clone)]
pub struct UpdateUserInput {
    pub username: Option<String>,
    pub email: Option<String>,
    pub role: Option<String>,
    pub campus_id: Option<i64>,
    pub display_name: Option<String>,
    pub status: Option<String>,
}

/// Filter for listing users
#[derive(Debug, Clone, Default)]
pub struct UserFilter {
    pub organization_id: Option<i64>,
    pub campus_id: Option<i64>,
    pub role: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
    pub limit: u32,
    pub offset: u32,
}

/// Repository interface for user domain operations.
#[async_trait]
pub trait UserRepo: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AppError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, AppError>;
    async fn find_by_username(&self, username: &str) -> Result<Option<User>, AppError>;
    async fn create(&self, input: CreateUserInput) -> Result<User, AppError>;
    async fn update(&self, id: Uuid, input: UpdateUserInput) -> Result<User, AppError>;
    async fn delete(&self, id: Uuid) -> Result<(), AppError>;
    async fn list(&self, filter: UserFilter) -> Result<Vec<User>, AppError>;
    async fn count_by_organization(&self, organization_id: i64) -> Result<i64, AppError>;
    async fn find_public_by_id(&self, id: Uuid) -> Result<Option<UserPublic>, AppError>;
}
```

**File: `api-infra/src/traits/problem_repo.rs`**

```rust
use async_trait::async_trait;
use crate::error::AppError;
use uuid::Uuid;

/// Summary type for cross-domain problem references.
/// Full `Problem` model lives in the domain crate.
#[derive(Debug, Clone)]
pub struct ProblemSummary {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub difficulty: String,
    pub time_limit_ms: i32,
    pub memory_limit_kb: i32,
    pub visibility: String,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub author_id: Option<Uuid>,
    pub tags: Vec<String>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Input for creating a problem
#[derive(Debug, Clone)]
pub struct CreateProblemInput {
    pub title: String,
    pub description: String,
    pub difficulty: String,
    pub time_limit_ms: i32,
    pub memory_limit_kb: i32,
    pub visibility: String,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub author_id: Uuid,
    pub tags: Vec<String>,
}

/// Filter for listing problems
#[derive(Debug, Clone, Default)]
pub struct ProblemFilter {
    pub organization_id: Option<i64>,
    pub visibility: Option<String>,
    pub difficulty: Option<String>,
    pub tag: Option<String>,
    pub search: Option<String>,
    pub limit: u32,
    pub offset: u32,
}

/// Repository interface for problem domain operations.
#[async_trait]
pub trait ProblemRepo: Send + Sync {
    async fn find_by_id(&self, id: i64) -> Result<Option<ProblemSummary>, AppError>;
    async fn find_by_ids(&self, ids: &[i64]) -> Result<Vec<ProblemSummary>, AppError>;
    async fn exists(&self, id: i64) -> Result<bool, AppError>;
    async fn create(&self, input: CreateProblemInput) -> Result<i64, AppError>;
    async fn update(&self, id: i64, input: serde_json::Value) -> Result<ProblemSummary, AppError>;
    async fn delete(&self, id: i64) -> Result<(), AppError>;
    async fn list(&self, filter: ProblemFilter) -> Result<Vec<ProblemSummary>, AppError>;
    async fn count_by_organization(&self, organization_id: i64) -> Result<i64, AppError>;
    async fn add_test_case(&self, problem_id: i64, input: CreateTestCaseInput) -> Result<i64, AppError>;
    async fn get_test_cases(&self, problem_id: i64) -> Result<Vec<TestCaseSummary>, AppError>;
}

/// Input for creating a test case
#[derive(Debug, Clone)]
pub struct CreateTestCaseInput {
    pub problem_id: i64,
    pub input: String,
    pub expected_output: String,
    pub is_sample: bool,
    pub score: Option<i32>,
}

/// Summary of a test case
#[derive(Debug, Clone)]
pub struct TestCaseSummary {
    pub id: i64,
    pub problem_id: i64,
    pub input: String,
    pub expected_output: String,
    pub is_sample: bool,
    pub score: Option<i32>,
}
```

**File: `api-infra/src/traits/submission_repo.rs`**

```rust
use async_trait::async_trait;
use crate::error::AppError;
use uuid::Uuid;

/// Summary type for submission references.
#[derive(Debug, Clone)]
pub struct SubmissionSummary {
    pub id: i64,
    pub user_id: Uuid,
    pub problem_id: i64,
    pub contest_id: Option<i64>,
    pub status: String,
    pub score: Option<i32>,
    pub runtime_ms: Option<i32>,
    pub memory_kb: Option<i32>,
    pub language: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Input for creating a submission
#[derive(Debug, Clone)]
pub struct CreateSubmissionInput {
    pub user_id: Uuid,
    pub problem_id: i64,
    pub contest_id: Option<i64>,
    pub language: String,
    pub code: String,
}

/// Filter for listing submissions
#[derive(Debug, Clone, Default)]
pub struct SubmissionFilter {
    pub user_id: Option<Uuid>,
    pub problem_id: Option<i64>,
    pub contest_id: Option<i64>,
    pub status: Option<String>,
    pub organization_id: Option<i64>,
    pub limit: u32,
    pub offset: u32,
}

/// Repository interface for submission domain operations.
#[async_trait]
pub trait SubmissionRepo: Send + Sync {
    async fn find_by_id(&self, id: i64) -> Result<Option<SubmissionSummary>, AppError>;
    async fn create(&self, input: CreateSubmissionInput) -> Result<i64, AppError>;
    async fn update_status(&self, id: i64, status: &str, score: Option<i32>, runtime_ms: Option<i32>, memory_kb: Option<i32>) -> Result<(), AppError>;
    async fn list(&self, filter: SubmissionFilter) -> Result<Vec<SubmissionSummary>, AppError>;
    async fn count_by_user(&self, user_id: Uuid) -> Result<i64, AppError>;
    async fn count_by_problem(&self, problem_id: i64) -> Result<i64, AppError>;
    async fn get_user_submission_count(&self, user_id: Uuid) -> Result<i64, AppError>;
    async fn save_test_case_results(&self, submission_id: i64, results: Vec<TestCaseResultInput>) -> Result<(), AppError>;
}

/// Input for saving a test case result
#[derive(Debug, Clone)]
pub struct TestCaseResultInput {
    pub test_case_id: i64,
    pub status: String,
    pub time_ms: Option<i32>,
    pub memory_kb: Option<i32>,
    pub output: Option<String>,
    pub error_message: Option<String>,
}
```

**File: `api-infra/src/traits/contest_repo.rs`**

```rust
use async_trait::async_trait;
use crate::error::AppError;
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Summary type for contest references.
#[derive(Debug, Clone)]
pub struct ContestSummary {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub rules: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub freeze_minutes: Option<i32>,
    pub created_by: Uuid,
    pub status: String,
}

/// Input for creating a contest
#[derive(Debug, Clone)]
pub struct CreateContestInput {
    pub name: String,
    pub description: Option<String>,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub rules: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub freeze_minutes: Option<i32>,
    pub created_by: Uuid,
}

/// Filter for listing contests
#[derive(Debug, Clone, Default)]
pub struct ContestFilter {
    pub organization_id: Option<i64>,
    pub status: Option<String>,
    pub limit: u32,
    pub offset: u32,
}

/// Repository interface for contest domain operations.
#[async_trait]
pub trait ContestRepo: Send + Sync {
    async fn find_by_id(&self, id: i64) -> Result<Option<ContestSummary>, AppError>;
    async fn create(&self, input: CreateContestInput) -> Result<i64, AppError>;
    async fn update(&self, id: i64, input: serde_json::Value) -> Result<ContestSummary, AppError>;
    async fn delete(&self, id: i64) -> Result<(), AppError>;
    async fn list(&self, filter: ContestFilter) -> Result<Vec<ContestSummary>, AppError>;
    async fn register_participant(&self, contest_id: i64, user_id: Uuid) -> Result<(), AppError>;
    async fn unregister_participant(&self, contest_id: i64, user_id: Uuid) -> Result<(), AppError>;
    async fn is_participant(&self, contest_id: i64, user_id: Uuid) -> Result<bool, AppError>;
    async fn list_participants(&self, contest_id: i64) -> Result<Vec<Uuid>, AppError>;
    async fn add_problem(&self, contest_id: i64, problem_id: i64, order: i32) -> Result<(), AppError>;
    async fn list_problems(&self, contest_id: i64) -> Result<Vec<ContestProblemSummary>, AppError>;
}

/// Summary of a contest problem
#[derive(Debug, Clone)]
pub struct ContestProblemSummary {
    pub contest_id: i64,
    pub problem_id: i64,
    pub order: i32,
    pub title: String,
    pub difficulty: String,
}
```

**File: `api-infra/src/traits/class_repo.rs`**

```rust
use async_trait::async_trait;
use crate::error::AppError;
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Summary type for class references.
#[derive(Debug, Clone)]
pub struct ClassSummary {
    pub id: i64,
    pub name: String,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub teacher_id: Uuid,
    pub semester: String,
    pub code: String,
    pub created_at: DateTime<Utc>,
}

/// Input for creating a class
#[derive(Debug, Clone)]
pub struct CreateClassInput {
    pub name: String,
    pub organization_id: i64,
    pub campus_id: Option<i64>,
    pub teacher_id: Uuid,
    pub semester: String,
    pub code: String,
}

/// Filter for listing classes
#[derive(Debug, Clone, Default)]
pub struct ClassFilter {
    pub organization_id: Option<i64>,
    pub campus_id: Option<i64>,
    pub teacher_id: Option<Uuid>,
    pub limit: u32,
    pub offset: u32,
}

/// Repository interface for class domain operations.
#[async_trait]
pub trait ClassRepo: Send + Sync {
    async fn find_by_id(&self, id: i64) -> Result<Option<ClassSummary>, AppError>;
    async fn create(&self, input: CreateClassInput) -> Result<i64, AppError>;
    async fn update(&self, id: i64, input: serde_json::Value) -> Result<ClassSummary, AppError>;
    async fn delete(&self, id: i64) -> Result<(), AppError>;
    async fn list(&self, filter: ClassFilter) -> Result<Vec<ClassSummary>, AppError>;
    async fn enroll_student(&self, class_id: i64, student_id: Uuid) -> Result<(), AppError>;
    async fn remove_student(&self, class_id: i64, student_id: Uuid) -> Result<(), AppError>;
    async fn is_enrolled(&self, class_id: i64, student_id: Uuid) -> Result<bool, AppError>;
    async fn list_students(&self, class_id: i64) -> Result<Vec<Uuid>, AppError>;
    async fn create_assignment(&self, input: CreateAssignmentInput) -> Result<i64, AppError>;
    async fn list_assignments(&self, class_id: i64) -> Result<Vec<AssignmentSummary>, AppError>;
}

/// Input for creating an assignment
#[derive(Debug, Clone)]
pub struct CreateAssignmentInput {
    pub class_id: i64,
    pub problem_id: i64,
    pub title: Option<String>,
    pub deadline: DateTime<Utc>,
    pub points: i32,
}

/// Summary of an assignment
#[derive(Debug, Clone)]
pub struct AssignmentSummary {
    pub id: i64,
    pub class_id: i64,
    pub problem_id: i64,
    pub title: Option<String>,
    pub deadline: DateTime<Utc>,
    pub points: i32,
    pub published_at: DateTime<Utc>,
}
```

**File: `api-infra/src/traits/community_repo.rs`**

```rust
use async_trait::async_trait;
use crate::error::AppError;
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Summary type for discussion references.
#[derive(Debug, Clone)]
pub struct DiscussionSummary {
    pub id: i64,
    pub problem_id: i64,
    pub user_id: Uuid,
    pub content: String,
    pub is_pinned: bool,
    pub created_at: DateTime<Utc>,
    pub reply_count: i64,
}

/// Summary type for blog article references.
#[derive(Debug, Clone)]
pub struct BlogArticleSummary {
    pub id: i64,
    pub author_id: Uuid,
    pub title: String,
    pub content: String,
    pub is_published: bool,
    pub organization_id: i64,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Input for creating a discussion
#[derive(Debug, Clone)]
pub struct CreateDiscussionInput {
    pub problem_id: i64,
    pub user_id: Uuid,
    pub content: String,
    pub parent_id: Option<i64>,
}

/// Input for creating a blog article
#[derive(Debug, Clone)]
pub struct CreateBlogArticleInput {
    pub author_id: Uuid,
    pub title: String,
    pub content: String,
    pub is_published: bool,
    pub organization_id: i64,
    pub tags: Vec<String>,
}

/// Input for creating a direct message
#[derive(Debug, Clone)]
pub struct CreateMessageInput {
    pub sender_id: Uuid,
    pub receiver_id: Uuid,
    pub content: String,
}

/// Filter for listing discussions
#[derive(Debug, Clone, Default)]
pub struct DiscussionFilter {
    pub problem_id: Option<i64>,
    pub user_id: Option<Uuid>,
    pub limit: u32,
    pub offset: u32,
}

/// Filter for listing blog articles
#[derive(Debug, Clone, Default)]
pub struct BlogFilter {
    pub organization_id: Option<i64>,
    pub author_id: Option<Uuid>,
    pub is_published: Option<bool>,
    pub tag: Option<String>,
    pub limit: u32,
    pub offset: u32,
}

/// Repository interface for community domain operations (discussions, blogs, messages).
#[async_trait]
pub trait CommunityRepo: Send + Sync {
    // Discussions
    async fn create_discussion(&self, input: CreateDiscussionInput) -> Result<i64, AppError>;
    async fn find_discussion_by_id(&self, id: i64) -> Result<Option<DiscussionSummary>, AppError>;
    async fn list_discussions(&self, filter: DiscussionFilter) -> Result<Vec<DiscussionSummary>, AppError>;
    async fn delete_discussion(&self, id: i64) -> Result<(), AppError>;

    // Blog articles
    async fn create_article(&self, input: CreateBlogArticleInput) -> Result<i64, AppError>;
    async fn find_article_by_id(&self, id: i64) -> Result<Option<BlogArticleSummary>, AppError>;
    async fn list_articles(&self, filter: BlogFilter) -> Result<Vec<BlogArticleSummary>, AppError>;
    async fn update_article(&self, id: i64, input: serde_json::Value) -> Result<BlogArticleSummary, AppError>;
    async fn delete_article(&self, id: i64) -> Result<(), AppError>;

    // Direct messages
    async fn send_message(&self, input: CreateMessageInput) -> Result<i64, AppError>;
    async fn list_conversations(&self, user_id: Uuid) -> Result<Vec<ConversationSummary>, AppError>;
    async fn list_messages(&self, user_id: Uuid, other_user_id: Uuid, limit: u32, offset: u32) -> Result<Vec<MessageSummary>, AppError>;
}

/// Summary of a conversation
#[derive(Debug, Clone)]
pub struct ConversationSummary {
    pub other_user_id: Uuid,
    pub other_username: String,
    pub last_message: Option<String>,
    pub last_message_at: Option<DateTime<Utc>>,
    pub unread_count: i64,
}

/// Summary of a direct message
#[derive(Debug, Clone)]
pub struct MessageSummary {
    pub id: i64,
    pub sender_id: Uuid,
    pub receiver_id: Uuid,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub is_read: bool,
}
```

**File: `api-infra/src/traits/leaderboard_repo.rs`**

```rust
use async_trait::async_trait;
use crate::error::AppError;
use uuid::Uuid;

/// Summary type for leaderboard entries.
#[derive(Debug, Clone)]
pub struct LeaderboardEntry {
    pub user_id: Uuid,
    pub username: String,
    pub organization_id: i64,
    pub total_score: i64,
    pub solved_count: i64,
    pub submissions_count: i64,
    pub rank: i64,
}

/// Filter for leaderboard queries
#[derive(Debug, Clone, Default)]
pub struct LeaderboardFilter {
    pub organization_id: Option<i64>,
    pub problem_id: Option<i64>,
    pub contest_id: Option<i64>,
    pub class_id: Option<i64>,
    pub limit: u32,
    pub offset: u32,
}

/// Repository interface for leaderboard domain operations.
#[async_trait]
pub trait LeaderboardRepo: Send + Sync {
    async fn get_global(&self, filter: LeaderboardFilter) -> Result<Vec<LeaderboardEntry>, AppError>;
    async fn get_by_problem(&self, problem_id: i64, filter: LeaderboardFilter) -> Result<Vec<LeaderboardEntry>, AppError>;
    async fn get_by_contest(&self, contest_id: i64, filter: LeaderboardFilter) -> Result<Vec<LeaderboardEntry>, AppError>;
    async fn get_by_class(&self, class_id: i64, filter: LeaderboardFilter) -> Result<Vec<LeaderboardEntry>, AppError>;
    async fn get_best_ac_submission(&self, user_id: Uuid, problem_id: i64) -> Result<Option<BestAcSubmission>, AppError>;
    async fn get_user_rank(&self, user_id: Uuid, organization_id: i64) -> Result<Option<i64>, AppError>;
}

/// Summary of a best AC submission
#[derive(Debug, Clone)]
pub struct BestAcSubmission {
    pub submission_id: i64,
    pub runtime_ms: i32,
    pub memory_kb: i32,
    pub submitted_at: chrono::DateTime<chrono::Utc>,
}
```

**File: `api-infra/src/traits/search_repo.rs`**

```rust
use async_trait::async_trait;
use crate::error::AppError;

/// A single search result item.
#[derive(Debug, Clone)]
pub struct SearchResultItem {
    pub id: String,
    pub title: String,
    pub content: String,
    pub item_type: String,  // "problem", "discussion", "blog", "contest"
    pub score: f64,
    pub organization_id: i64,
}

/// Search results with pagination.
#[derive(Debug, Clone)]
pub struct SearchResults {
    pub results: Vec<SearchResultItem>,
    pub total: i64,
    pub page: i32,
    pub limit: i32,
}

/// Filter for search queries
#[derive(Debug, Clone)]
pub struct SearchFilter {
    pub query: String,
    pub item_type: Option<String>,
    pub category: Option<String>,
    pub tag: Option<String>,
    pub author_id: Option<uuid::Uuid>,
    pub sort: String,
    pub page: i32,
    pub limit: i32,
}

/// Repository interface for search domain operations.
#[async_trait]
pub trait SearchRepo: Send + Sync {
    async fn search(&self, filter: SearchFilter, organization_id: Option<i64>, is_teacher: bool) -> Result<SearchResults, AppError>;
    async fn index_problem(&self, problem_id: i64, title: &str, content: &str, organization_id: i64) -> Result<(), AppError>;
    async fn index_discussion(&self, discussion_id: i64, problem_id: i64, content: &str, organization_id: i64) -> Result<(), AppError>;
    async fn index_article(&self, article_id: i64, title: &str, content: &str, organization_id: i64) -> Result<(), AppError>;
    async fn remove_index(&self, item_type: &str, item_id: i64) -> Result<(), AppError>;
}
```

After creating all 8 files, run:
```bash
cargo doc -p api-infra --no-deps
cargo build -p api-infra
```
</action>

<acceptance_criteria>
- `ls /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/` contains exactly 11 files: `mod.rs`, `user_repo.rs`, `problem_repo.rs`, `submission_repo.rs`, `contest_repo.rs`, `class_repo.rs`, `community_repo.rs`, `leaderboard_repo.rs`, `search_repo.rs`, `submission_service.rs`, `notification_service.rs`
- `grep -c "pub trait.*Repo.*Send.*Sync" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/*.rs` returns 8 (one per repo file)
- `grep -c "async fn" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/user_repo.rs` returns at least 9
- `cargo doc -p api-infra --no-deps` exits 0
- `cargo build -p api-infra` exits 0
</acceptance_criteria>

### Task 03-03: Define service trait interfaces

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/mod.rs (module declarations)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/leaderboard/service.rs (uses submission counts -- cross-domain dependency)
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/notifications/service.rs (cross-domain notification sending)
</read_first>

<action>
Create the 2 service trait files for cross-domain communication.

**File: `api-infra/src/traits/submission_service.rs`**

```rust
use async_trait::async_trait;
use crate::error::AppError;
use uuid::Uuid;

/// Service interface for cross-domain submission queries.
/// Used by leaderboard and notification modules to query submission data.
#[async_trait]
pub trait SubmissionService: Send + Sync {
    /// Get the total number of submissions by a user.
    async fn get_user_submission_count(&self, user_id: Uuid) -> Result<i64, AppError>;
    /// Get the number of accepted (AC) submissions by a user.
    async fn get_user_accepted_count(&self, user_id: Uuid) -> Result<i64, AppError>;
    /// Check if a user has an accepted submission for a specific problem.
    async fn has_accepted_submission(&self, user_id: Uuid, problem_id: i64) -> Result<bool, AppError>;
}
```

**File: `api-infra/src/traits/notification_service.rs`**

```rust
use async_trait::async_trait;
use crate::error::AppError;
use uuid::Uuid;

/// Service interface for cross-domain notification operations.
/// Used by submissions, contests, and community modules to send notifications.
#[async_trait]
pub trait NotificationService: Send + Sync {
    /// Send an in-app notification to a user.
    async fn send_notification(&self, user_id: Uuid, title: String, message: String, notification_type: String) -> Result<(), AppError>;
    /// Send a notification to multiple users.
    async fn send_bulk_notification(&self, user_ids: &[Uuid], title: String, message: String, notification_type: String) -> Result<(), AppError>;
    /// Mark a notification as read.
    async fn mark_as_read(&self, notification_id: i64, user_id: Uuid) -> Result<(), AppError>;
    /// Get unread notification count for a user.
    async fn get_unread_count(&self, user_id: Uuid) -> Result<i64, AppError>;
}
```

Run `cargo build -p api-infra`.
</action>

<acceptance_criteria>
- `test -f /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/submission_service.rs` succeeds
- `test -f /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/notification_service.rs` succeeds
- `grep "pub trait SubmissionService" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/submission_service.rs` returns a match
- `grep "pub trait NotificationService" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/traits/notification_service.rs` returns a match
- `cargo build -p api-infra` exits 0
</acceptance_criteria>

### Task 03-04: Create AppConfig with SEC-01 + SEC-06 validation

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs (lines 52-71: current env var reads that will be replaced)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/lib.rs (add config module)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/Cargo.toml (tracing already in deps)
</read_first>

<action>
1. Create `api-infra/src/config.rs`:

```rust
use std::env;

/// Application environment mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppEnv {
    Production,
    Development,
    Test,
}

impl AppEnv {
    /// Read APP_ENV from environment. Defaults to Development if unset or invalid.
    pub fn from_env() -> Self {
        match env::var("APP_ENV").as_deref() {
            Ok("production") => AppEnv::Production,
            Ok("test") => AppEnv::Test,
            _ => AppEnv::Development,
        }
    }

    pub fn is_production(&self) -> bool {
        matches!(self, AppEnv::Production)
    }

    pub fn is_test(&self) -> bool {
        matches!(self, AppEnv::Test)
    }
}

/// Startup error -- the application cannot start.
#[derive(Debug)]
pub enum AppStartupError {
    /// A required secret was not set or was empty.
    MissingSecret(&'static str),
    /// An environment variable has an invalid value.
    InvalidValue { key: &'static str, reason: String },
}

impl std::fmt::Display for AppStartupError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppStartupError::MissingSecret(key) => {
                write!(f, "Required secret '{}' is not set. Set it in .env or environment.", key)
            }
            AppStartupError::InvalidValue { key, reason } => {
                write!(f, "Invalid value for '{}': {}", key, reason)
            }
        }
    }
}

impl std::error::Error for AppStartupError {}

/// Application configuration, validated at startup.
///
/// In production: `from_env()` fails if JWT_SECRET or WORKER_SECRET are not set.
/// In development: warns and uses insecure defaults.
/// In test: `test_config()` provides safe defaults without touching env vars.
#[derive(Debug, Clone)]
pub struct AppConfig {
    pub app_env: AppEnv,
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub worker_secret: String,
    pub bind_address: String,
    pub cors_origins: Vec<String>,
}

impl AppConfig {
    /// Load configuration from environment variables.
    ///
    /// # Errors
    /// - Returns `AppStartupError::MissingSecret` if a required secret is unset in production.
    /// - Returns `AppStartupError::InvalidValue` if `API_BIND_ADDRESS` is malformed.
    pub fn from_env() -> Result<Self, AppStartupError> {
        let app_env = AppEnv::from_env();

        let jwt_secret = match env::var("JWT_SECRET") {
            Ok(v) if !v.is_empty() => v,
            _ if app_env.is_production() => {
                return Err(AppStartupError::MissingSecret("JWT_SECRET"));
            }
            _ => {
                tracing::warn!("JWT_SECRET not set -- using insecure development default. NEVER use in production.");
                "dev-only-insecure-jwt-secret-do-not-use-in-production".to_string()
            }
        };

        let worker_secret = match env::var("WORKER_SECRET") {
            Ok(v) if !v.is_empty() => v,
            _ if app_env.is_production() => {
                return Err(AppStartupError::MissingSecret("WORKER_SECRET"));
            }
            _ => {
                tracing::warn!("WORKER_SECRET not set -- using insecure development default. NEVER use in production.");
                "dev-only-insecure-worker-secret-do-not-use-in-production".to_string()
            }
        };

        let database_url = env::var("DATABASE_URL")
            .map_err(|_| AppStartupError::MissingSecret("DATABASE_URL"))?;

        let redis_url = env::var("REDIS_URL")
            .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());

        let bind_address = env::var("API_BIND_ADDRESS")
            .unwrap_or_else(|_| "0.0.0.0:3000".to_string());

        let cors_origins = if app_env.is_production() {
            env::var("CORS_ORIGINS")
                .unwrap_or_default()
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        } else {
            vec!["*".to_string()]
        };

        Ok(Self {
            app_env,
            database_url,
            redis_url,
            jwt_secret,
            worker_secret,
            bind_address,
            cors_origins,
        })
    }

    /// Create config for testing (no env vars required).
    #[cfg(test)]
    pub fn test_config() -> Self {
        Self {
            app_env: AppEnv::Test,
            database_url: "postgres://localhost/test".to_string(),
            redis_url: "redis://127.0.0.1:6379".to_string(),
            jwt_secret: "test-jwt-secret".to_string(),
            worker_secret: "test-worker-secret".to_string(),
            bind_address: "0.0.0.0:0".to_string(),
            cors_origins: vec!["*".to_string()],
        }
    }

    /// Create config for integration tests that need a real database.
    #[cfg(test)]
    pub fn test_config_with_db(database_url: String) -> Self {
        let mut config = Self::test_config();
        config.database_url = database_url;
        config
    }
}
```

2. Add `pub mod config;` to `api-infra/src/lib.rs`.

3. Run `cargo build -p api-infra`.
</action>

<acceptance_criteria>
- `test -f /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/config.rs` succeeds
- `grep "pub enum AppStartupError" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/config.rs` returns a match
- `grep "pub struct AppConfig" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/config.rs` returns a match
- `grep "MissingSecret.*JWT_SECRET" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/config.rs` returns a match
- `grep "MissingSecret.*WORKER_SECRET" /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/config.rs` returns a match
- `cargo build -p api-infra` exits 0
</acceptance_criteria>

### Task 03-05: Wire AppConfig into api/src/main.rs

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs (full 201-line file -- the main function to modify)
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/config.rs (AppConfig struct just created)
</read_first>

<action>
Replace the scattered environment variable reads in `main()` with `AppConfig::from_env()`. Update `create_router` to use config-based CORS.

**In `main()` function, replace lines 63-71:**

OLD (remove these lines):
```rust
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let redis_url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
    let jwt_secret =
        std::env::var("JWT_SECRET").unwrap_or_else(|_| "default_jwt_secret_change_me".to_string());
    let worker_secret = std::env::var("WORKER_SECRET")
        .unwrap_or_else(|_| "default_worker_secret_change_me".to_string());
    let bind_address =
        std::env::var("API_BIND_ADDRESS").unwrap_or_else(|_| "0.0.0.0:3000".to_string());
```

NEW:
```rust
    let config = api_infra::config::AppConfig::from_env()
        .map_err(|e| anyhow::anyhow!("Configuration error: {}", e))?;
```

**Update lines 74-98 to use config fields:**

OLD:
```rust
    info!("Connecting to database...");
    let db_pool = db::create_pool(&database_url, Some(10), Some(30)).await?;
    ...
    let redis_pool = if let Ok(pool) = redis::create_pool(&redis_url).await {
    ...
    let jwt_service = auth::JwtService::new(&jwt_secret);
    ...
    let state = AppState {
        db_pool,
        redis_pool,
        redis_url,
        jwt_service,
        jwt_secret,
        worker_secret,
        websocket_server,
    };
```

NEW:
```rust
    info!("Connecting to database...");
    let db_pool = db::create_pool(&config.database_url, Some(10), Some(30)).await?;
    ...
    let redis_pool = if let Ok(pool) = redis::create_pool(&config.redis_url).await {
    ...
    let jwt_service = auth::JwtService::new(&config.jwt_secret);
    ...
    let state = AppState {
        db_pool,
        redis_pool,
        redis_url: config.redis_url.clone(),
        jwt_service,
        jwt_secret: config.jwt_secret.clone(),
        worker_secret: config.worker_secret.clone(),
        websocket_server,
    };
```

**Update line 100 to pass config:**

OLD: `let app = create_router(state);`
NEW: `let app = create_router(state, config.clone());`

**Update line 102-103 to use config:**

OLD:
```rust
    let addr: SocketAddr = bind_address
        .parse()
        .expect("Invalid API_BIND_ADDRESS format");
```

NEW:
```rust
    let addr: SocketAddr = config.bind_address
        .parse()
        .expect("Invalid API_BIND_ADDRESS format");
```

**Update `create_router` signature and CORS:**

OLD signature: `fn create_router(state: AppState) -> Router {`
NEW signature: `fn create_router(state: AppState, config: api_infra::config::AppConfig) -> Router {`

OLD CORS:
```rust
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([...])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE]);
```

NEW CORS:
```rust
    let cors = if config.cors_origins.contains(&"*".to_string()) {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods([
                Method::GET, Method::POST, Method::PUT,
                Method::PATCH, Method::DELETE, Method::OPTIONS,
            ])
            .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE])
    } else {
        let origins: Vec<axum::http::HeaderValue> = config
            .cors_origins
            .iter()
            .filter_map(|o| o.parse().ok())
            .collect();
        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods([
                Method::GET, Method::POST, Method::PUT,
                Method::PATCH, Method::DELETE, Method::OPTIONS,
            ])
            .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE])
    };
```

Remove the now-unused `use tower_http::cors::Any;` import if the `Any` variant is no longer referenced directly (it is still used in the wildcard branch, so keep it).

Run `cargo build --workspace`.
</action>

<acceptance_criteria>
- `grep "AppConfig::from_env" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs` returns a match
- `grep "default_jwt_secret_change_me\|default_worker_secret_change_me" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs` returns NO matches (hardcoded defaults removed)
- `grep "config\." /Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs` returns at least 5 matches (config fields used)
- `grep "create_router(state" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs` returns a match with `, config` argument
- `cargo build --workspace` exits 0
</acceptance_criteria>

### Task 03-06: Verify SEC-01 + SEC-06 behavior with unit tests

<read_first>
- /Users/xiexingyu/Documents/项目/Online_Judge/api-infra/src/config.rs (AppConfig to test)
</read_first>

<action>
Add unit tests to `api-infra/src/config.rs` at the bottom of the file, inside an existing or new `#[cfg(test)]` module.

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_env_from_env_default() {
        // Without setting APP_ENV, defaults to Development
        std::env::remove_var("APP_ENV");
        assert_eq!(AppEnv::from_env(), AppEnv::Development);
    }

    #[test]
    fn test_app_env_from_env_production() {
        std::env::set_var("APP_ENV", "production");
        assert_eq!(AppEnv::from_env(), AppEnv::Production);
        std::env::remove_var("APP_ENV");
    }

    #[test]
    fn test_app_env_from_env_test() {
        std::env::set_var("APP_ENV", "test");
        assert_eq!(AppEnv::from_env(), AppEnv::Test);
        std::env::remove_var("APP_ENV");
    }

    #[test]
    fn test_missing_secret_in_production() {
        std::env::set_var("APP_ENV", "production");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("WORKER_SECRET");
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");

        let result = AppConfig::from_env();
        assert!(result.is_err());
        let err = result.unwrap_err();
        let msg = format!("{}", err);
        assert!(msg.contains("JWT_SECRET"), "Expected JWT_SECRET error, got: {}", msg);

        std::env::remove_var("APP_ENV");
        std::env::remove_var("DATABASE_URL");
    }

    #[test]
    fn test_missing_worker_secret_in_production() {
        std::env::set_var("APP_ENV", "production");
        std::env::set_var("JWT_SECRET", "a-real-secret");
        std::env::remove_var("WORKER_SECRET");
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");

        let result = AppConfig::from_env();
        assert!(result.is_err());
        let msg = format!("{}", result.unwrap_err());
        assert!(msg.contains("WORKER_SECRET"), "Expected WORKER_SECRET error, got: {}", msg);

        std::env::remove_var("APP_ENV");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("DATABASE_URL");
    }

    #[test]
    fn test_empty_secret_treated_as_unset_in_production() {
        std::env::set_var("APP_ENV", "production");
        std::env::set_var("JWT_SECRET", "");  // empty string
        std::env::set_var("WORKER_SECRET", "real-secret");
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");

        let result = AppConfig::from_env();
        assert!(result.is_err(), "Empty JWT_SECRET should be treated as unset");

        std::env::remove_var("APP_ENV");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("WORKER_SECRET");
        std::env::remove_var("DATABASE_URL");
    }

    #[test]
    fn test_development_allows_missing_secrets() {
        std::env::remove_var("APP_ENV");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("WORKER_SECRET");
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");

        let result = AppConfig::from_env();
        assert!(result.is_ok(), "Development should allow missing secrets");
        let config = result.unwrap();
        assert!(!config.jwt_secret.is_empty());
        assert!(config.jwt_secret.contains("dev-only-insecure"));

        std::env::remove_var("DATABASE_URL");
    }

    #[test]
    fn test_production_cors_defaults_empty() {
        std::env::set_var("APP_ENV", "production");
        std::env::set_var("JWT_SECRET", "real-secret");
        std::env::set_var("WORKER_SECRET", "real-secret");
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");
        std::env::remove_var("CORS_ORIGINS");

        let config = AppConfig::from_env().unwrap();
        assert!(config.cors_origins.is_empty(), "Production CORS should be empty when CORS_ORIGINS unset");
        assert!(config.cors_origins.iter().all(|o| o != "*"));

        std::env::remove_var("APP_ENV");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("WORKER_SECRET");
        std::env::remove_var("DATABASE_URL");
    }

    #[test]
    fn test_development_cors_allows_all() {
        std::env::remove_var("APP_ENV");
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");

        let config = AppConfig::from_env().unwrap();
        assert_eq!(config.cors_origins, vec!["*"]);

        std::env::remove_var("DATABASE_URL");
    }

    #[test]
    fn test_production_cors_from_env() {
        std::env::set_var("APP_ENV", "production");
        std::env::set_var("JWT_SECRET", "real-secret");
        std::env::set_var("WORKER_SECRET", "real-secret");
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");
        std::env::set_var("CORS_ORIGINS", "https://example.com, https://app.example.com");

        let config = AppConfig::from_env().unwrap();
        assert_eq!(config.cors_origins.len(), 2);
        assert!(config.cors_origins.contains(&"https://example.com".to_string()));
        assert!(config.cors_origins.contains(&"https://app.example.com".to_string()));

        std::env::remove_var("APP_ENV");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("WORKER_SECRET");
        std::env::remove_var("DATABASE_URL");
        std::env::remove_var("CORS_ORIGINS");
    }

    #[test]
    fn test_test_config() {
        let config = AppConfig::test_config();
        assert_eq!(config.app_env, AppEnv::Test);
        assert_eq!(config.jwt_secret, "test-jwt-secret");
        assert_eq!(config.worker_secret, "test-worker-secret");
        assert_eq!(config.cors_origins, vec!["*"]);
    }
}
```

Run `cargo test -p api-infra config`.
</action>

<acceptance_criteria>
- `cargo test -p api-infra config` exits 0
- `cargo test -p api-infra config 2>&1 | grep -c "test result"` returns 1
- `cargo test -p api-infra config 2>&1 | grep -c "ok$" | head -1` shows at least 10 test functions
- `cargo test --workspace` exits 0
</acceptance_criteria>

## Verification

<verify>
```bash
# Verify all traits compile and document
cargo doc -p api-infra --no-deps

# Verify config tests pass (SEC-01 + SEC-06)
cargo test -p api-infra config

# Verify workspace still builds
cargo build --workspace

# Verify no hardcoded secrets remain in main.rs
grep -n "default_jwt_secret\|default_worker_secret" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs
# expected: no output

# Verify AppConfig is used in main.rs
grep -n "AppConfig::from_env" /Users/xiexingyu/Documents/项目/Online_Judge/api/src/main.rs
# expected: exactly 1 match

# Full test suite
cargo test --workspace
```
</verify>
