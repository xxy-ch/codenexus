<!-- generated-by: gsd-doc-writer -->

# AlgoMaster Online Judge -- API Reference

The AlgoMaster API is a RESTful service built with Axum (Rust). All authenticated endpoints require a JWT token sent via the `Authorization: Bearer <token>` header or the `access_token` cookie. The API runs on port 3000 by default.

- **Base URL**: `http://localhost:3000` <!-- VERIFY: production base URL -->
- **Content-Type**: `application/json` for all request/response bodies unless noted otherwise
- **Multi-tenancy**: Most endpoints are scoped to the authenticated user's organization via JWT claims (`school_id`)

---

## Table of Contents

- [Authentication](#authentication)
- [Users](#users)
- [Problems](#problems)
- [Test Cases](#test-cases)
- [Submissions](#submissions)
- [Contests](#contests)
- [Classes](#classes)
- [Leaderboard](#leaderboard)
- [Discussions](#discussions)
- [Blog](#blog)
- [Messages](#messages)
- [Search](#search)
- [Notifications](#notifications)
- [Import / Export](#import--export)
- [Admin: Plagiarism](#admin-plagiarism)
- [Admin: Judge Monitor](#admin-judge-monitor)
- [Worker Callbacks](#worker-callbacks)
- [Health & Metrics](#health--metrics)
- [WebSocket](#websocket)
- [Error Responses](#error-responses)
- [Rate Limiting](#rate-limiting)

---

## Authentication

All endpoints except login, register, health, and metrics require a valid JWT. The token is obtained via `POST /auth/login` or `POST /auth/register`.

### POST /auth/login

Authenticate with username and password. Returns JWT access and refresh tokens, plus sets them as HttpOnly cookies.

**Auth required**: No

**Request body**:

```json
{
  "username": "string",
  "password": "string"
}
```

**Response** `200`:

```json
{
  "token": "string (JWT access token)",
  "refresh_token": "string (JWT refresh token)",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "role": "string",
    "school_id": 1,
    "campus_id": null
  }
}
```

Cookies set: `access_token` (4h), `refresh_token` (7d, path `/api/auth/refresh`).

**Error** `401`: Invalid credentials.

---

### POST /auth/register

Register a new user account. Returns JWT tokens upon successful registration.

**Auth required**: No

**Request body**:

```json
{
  "username": "string",
  "password": "string",
  "email": "string (optional)",
  "display_name": "string (optional)",
  "organization_id": 1,
  "campus_id": null
}
```

**Response** `200`:

```json
{
  "token": "string",
  "refresh_token": "string",
  "user": { "id": "uuid", "username": "string", "email": "string", ... }
}
```

**Error** `400`: Validation failure (duplicate username, missing fields).

---

### POST /auth/refresh

Refresh an expired access token using a valid refresh token. Reads from `refresh_token` cookie first, then from request body.

**Auth required**: No

**Request body**:

```json
{
  "refresh_token": "string (optional if sent via cookie)"
}
```

**Response** `200`:

```json
{
  "token": "string (new access token)"
}
```

**Error** `401`: Invalid or expired refresh token.

---

### POST /auth/logout

Invalidate the current access token by adding its JTI to a Redis blacklist.

**Auth required**: Yes

**Request body**: None

**Response** `200` (empty body).

---

## Users

### GET /users/me

Get the authenticated user's full profile.

**Auth required**: Yes

**Response** `200`: User profile object.

---

### PATCH /users/me

Update the authenticated user's profile.

**Auth required**: Yes

**Request body**: `UserProfileUpdate` (partial update fields).

**Response** `200`: Updated user profile.

---

### POST /users/register

Register a user through the users domain (alternative to `/auth/register` for admin flows).

**Auth required**: Yes

**Request body**: `RegisterRequest`

**Response** `200`: Created user profile.

---

### GET /users/admin

List all users with pagination and filtering. Admin only.

**Auth required**: Admin

**Query parameters**: `AdminUserQuery` (page, limit, search, role, status).

**Response** `200`: Paginated user list.

---

### POST /users/admin/batch-create

Create multiple users at once. Admin only.

**Auth required**: Admin

**Request body**: `BatchCreateUsersRequest`

**Response** `200`: Batch creation result.

---

### PATCH /users/admin/:user_id/role

Change a user's role. Admin only.

**Auth required**: Admin

**Request body**:

```json
{
  "role": "string (student|teacher|admin)"
}
```

**Response** `200`: `{ "success": true }`

---

### PATCH /users/admin/:user_id/status

Toggle a user's active/inactive status. Admin only.

**Auth required**: Admin

**Response** `200`: `{ "success": true }`

---

## Problems

### GET /problems

List problems with pagination, search, and filtering.

**Auth required**: Yes

**Query parameters**:

| Parameter    | Type     | Default | Description                |
|-------------|----------|---------|----------------------------|
| `page`      | integer  | 1       | Page number                |
| `limit`     | integer  | 20      | Items per page (max 100)   |
| `search`    | string   |         | Search by title/description|
| `difficulty`| string   |         | Filter: easy, medium, hard |
| `visibility`| string   |         | Filter: public, campus, class, private |
| `is_public` | boolean  | true    | Only public problems       |

**Response** `200`:

```json
{
  "problems": [{ "id": 1, "title": "...", "difficulty": "easy", ... }],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

### POST /problems

Create a new problem. Teacher+ only.

**Auth required**: Teacher or higher

**Request body**:

```json
{
  "title": "string",
  "description": "string",
  "difficulty": "easy|medium|hard",
  "visibility": "public|campus|class|private",
  "is_public": true,
  "time_limit": 1000,
  "memory_limit": 262144,
  "organization_id": 1
}
```

**Response** `200`: Created problem object.

---

### GET /problems/:id

Get problem details including test case count.

**Auth required**: Yes

**Response** `200`: `ProblemDetail` with `test_case_count` and optional `statistics`.

**Error** `404`: Problem not found.

---

### PUT /problems/:id

Update a problem. Teacher+ only.

**Auth required**: Teacher or higher

**Request body**: `UpdateProblemRequest` (all fields optional).

**Response** `200`: Updated problem object.

**Error** `404`: Problem not found.

---

### DELETE /problems/:id

Delete a problem. Admin only.

**Auth required**: Admin

**Response** `204`: No content.

**Error** `404`: Problem not found.

---

### GET /problems/:id/statistics

Get submission statistics for a problem. Public (no auth).

**Auth required**: No

**Response** `200`:

```json
{
  "problem_id": 1,
  "total_submissions": 150,
  "accepted_submissions": 45,
  "acceptance_rate": 30.0,
  "fastest_time_ms": 12,
  "first_solver_id": "uuid",
  "first_solved_at": "timestamp",
  "last_solved_at": "timestamp"
}
```

---

### GET /problems/languages

Get supported programming languages.

**Auth required**: Yes

**Response** `200`: Array of `SupportedLanguage` objects.

---

### PUT /problems/languages

Update supported language settings. Admin only.

**Auth required**: Admin

**Request body**:

```json
{
  "c_enabled": true,
  "cpp_enabled": true
}
```

**Response** `200`: Updated array of `SupportedLanguage`.

---

## Test Cases

### GET /problems/:id/test-cases

List test cases for a problem. Teachers see full data; students see only non-hidden metadata.

**Auth required**: Yes

**Response** `200`: Array of `TestCase` (teachers) or `PublicTestCase` (students).

---

### POST /problems/:id/test-cases

Create a single test case. Teacher+ only.

**Auth required**: Teacher or higher

**Request body**:

```json
{
  "input": "string",
  "expected_output": "string",
  "is_hidden": false,
  "score": 10,
  "order": 0
}
```

**Response** `200`: Created `TestCase`.

---

### POST /problems/:id/test-cases/import

Batch import test cases. Teacher+ only.

**Auth required**: Teacher or higher

**Request body**:

```json
{
  "test_cases": [
    { "input": "...", "expected_output": "...", "is_hidden": false, "score": 10 }
  ]
}
```

**Response** `200`:

```json
{
  "message": "Imported 5 test cases",
  "imported_count": 5,
  "total_count": 6,
  "errors": ["Test case 4: ..."]
}
```

---

### PUT /problems/:id/test-cases/:test_case_id

Update a test case. Teacher+ only.

**Auth required**: Teacher or higher

**Request body**: `UpdateTestCaseRequest` (all fields optional).

**Response** `200`: Updated `TestCase`.

**Error** `404`: Test case not found.

---

### DELETE /problems/:id/test-cases/:test_case_id

Delete a test case. Teacher+ only.

**Auth required**: Teacher or higher

**Response** `200`: `{ "message": "Test case deleted successfully" }`.

**Error** `404`: Test case not found.

---

## Submissions

### POST /submissions

Submit code for judging.

**Auth required**: Yes

**Request body**:

```json
{
  "problem_id": 1,
  "language": "python",
  "code": "print('hello')"
}
```

**Response** `200`: Created submission object (status: `pending` or `queued`).

---

### GET /submissions

List the authenticated user's submissions with optional filtering.

**Auth required**: Yes

**Query parameters**:

| Parameter    | Type    | Default | Description                |
|-------------|---------|---------|----------------------------|
| `problem_id`| integer |         | Filter by problem          |
| `status`    | string  |         | Filter by status           |
| `language`  | string  |         | Filter by language         |
| `limit`     | integer | 20      | Max items (max 100)        |
| `offset`    | integer | 0       | Pagination offset          |

**Response** `200`:

```json
{
  "submissions": [...],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

---

### GET /submissions/stats

Get aggregate submission statistics for the authenticated user.

**Auth required**: Yes

**Response** `200`: User submission stats object.

---

### GET /submissions/:id

Get a single submission's details. Users can only access their own submissions.

**Auth required**: Yes

**Response** `200`: Submission detail with test case results.

**Error** `404`: Submission not found or access denied.

---

### POST /submissions/:id/results

Judge result callback from the judge worker. Secured via `X-Worker-Secret` header with state machine validation and idempotency.

**Auth required**: Worker secret (X-Worker-Secret header)

**Request body**:

```json
{
  "submission_id": 1,
  "status": "ac|wa|tle|mle|re|ce",
  "score": 100,
  "runtime_ms": 150,
  "memory_kb": 1024,
  "test_case_results": [
    {
      "test_case_id": 1,
      "status": "ac",
      "expected_output": "hello",
      "actual_output": "hello",
      "error_message": null,
      "runtime_ms": 50,
      "memory_kb": 512
    }
  ]
}
```

**Response** `200`:

```json
{
  "message": "Judge result updated successfully",
  "submission_id": 1,
  "status": "ac"
}
```

**State transitions**: `pending` / `queued` -> `judging` -> terminal (`ac`, `wa`, `tle`, `mle`, `re`, `ce`). Duplicate callbacks with the same status are accepted but ignored (idempotent).

---

## Contests

### GET /contests

List contests scoped to the authenticated user's organization.

**Auth required**: Yes

**Query parameters**:

| Parameter       | Type     | Default | Description                  |
|----------------|----------|---------|------------------------------|
| `page`         | integer  | 1       | Page number                  |
| `limit`        | integer  | 20      | Items per page               |
| `campus_id`    | integer  |         | Filter by campus             |
| `active`       | boolean  |         | Filter by active status      |

**Response** `200`:

```json
{
  "contests": [...],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

---

### POST /contests

Create a new contest. Teacher+ only. Organization is forced from JWT claims.

**Auth required**: Teacher or higher

**Request body**: `CreateContestRequest` (title, description, start_time, end_time, etc.)

**Response** `200`: Created contest object.

---

### GET /contests/:id

Get contest details. Scoped to user's organization.

**Auth required**: Yes

**Response** `200`: `ContestDetail` object.

---

### PUT /contests/:id

Update a contest. Teacher+ only.

**Auth required**: Teacher or higher

**Request body**: `UpdateContestRequest`

**Response** `200`: Updated contest.

---

### DELETE /contests/:id

Delete a contest. Teacher+ only.

**Auth required**: Teacher or higher

**Response** `204`: No content.

---

### GET /contests/:id/problems

List problems in a contest. Tenant-scoped.

**Auth required**: Yes

**Response** `200`: Array of `ContestProblemDetail`.

---

### POST /contests/:id/problems

Add a problem to a contest. Teacher+ only.

**Auth required**: Teacher or higher

**Request body**: `AddProblemToContestRequest`

**Response** `200`: `ContestProblem`.

---

### DELETE /contests/:id/problems/:problem_id

Remove a problem from a contest. Teacher+ only.

**Auth required**: Teacher or higher

**Response** `204`: No content.

---

### GET /contests/:id/rankings

Get contest rankings/standings. Tenant-scoped.

**Auth required**: Yes

**Response** `200`: Array of `ContestRankingEntry`.

---

### GET /contests/:id/status

Get contest status (upcoming, ongoing, ended). Tenant-scoped.

**Auth required**: Yes

**Response** `200`: `ContestStatus` object.

---

### POST /contests/:id/register

Register the authenticated user for a contest. Tenant-scoped.

**Auth required**: Yes

**Response** `200`: `ContestParticipant`.

**Error** `409`: Already registered.

---

### GET /contests/:id/participants

List contest participants. Teacher/admin only. Tenant-scoped.

**Auth required**: Teacher or higher

**Response** `200`: Array of `ContestParticipant`.

---

### POST /contests/:id/submissions/:submission_id

Link a submission to a contest. Teacher+ only.

**Auth required**: Teacher or higher

**Response** `200`: `ContestSubmission`.

**Errors**: `404` not found, `403` contest not active, `400` not in contest, `409` already linked.

---

## Classes

### POST /classes

Create a new class. Teacher+ only. Organization forced from JWT claims.

**Auth required**: Teacher or higher

**Request body**: `CreateClassRequest` (name, description, enrollment_code, etc.)

**Response** `200`: Created `Class` object.

---

### GET /classes

List classes scoped to the authenticated user's organization.

**Auth required**: Yes

**Query parameters**: `ListClassesQuery` (page, limit, search).

**Response** `200`: `ClassesListResponse` with pagination.

---

### GET /classes/:class_id

Get class details. Tenant-scoped.

**Auth required**: Yes

**Response** `200`: `Class` object.

---

### PUT /classes/:class_id

Update a class. Teacher+ only, must be class owner or admin.

**Auth required**: Teacher or higher

**Request body**: `UpdateClassRequest`

**Response** `200`: Updated `Class`.

---

### DELETE /classes/:class_id

Delete a class. Teacher+ only, must be class owner or admin.

**Auth required**: Teacher or higher

**Response** `204`: No content.

---

### GET /classes/:class_id/stats

Get class statistics (member count, submission count, etc.). Tenant-scoped.

**Auth required**: Yes

**Response** `200`: `ClassStats` object.

---

### GET /classes/:class_id/students

List students with progress in a class. Teacher/admin only.

**Auth required**: Teacher or higher (class owner or admin)

**Response** `200`: Array of `StudentProgress`.

---

### POST /classes/:class_id/students

Add a student to a class by username. Teacher+ only.

**Auth required**: Teacher or higher

**Request body**:

```json
{
  "username": "string"
}
```

**Response** `200`: `ClassEnrollment`.

---

### POST /classes/:class_id/students/import

Batch import students by username. Teacher+ only.

**Auth required**: Teacher or higher

**Request body**:

```json
{
  "usernames": ["student1", "student2"]
}
```

**Response** `200`: Array of `ClassEnrollment`.

---

### DELETE /classes/:class_id/students/:student_id

Remove a student from a class. Teacher+ only.

**Auth required**: Teacher or higher

**Response** `204`: No content.

---

### POST /classes/enroll

Enroll the authenticated user in a class using an enrollment code.

**Auth required**: Yes

**Request body**:

```json
{
  "code": "string",
  "enrollment_code": "string (alternative field name)"
}
```

**Response** `200`: `ClassEnrollment`.

---

### POST /classes/:class_id/assignments

Create a new assignment in a class. Teacher+ only.

**Auth required**: Teacher or higher

**Request body**: `CreateAssignmentRequest` (title, description, problem_ids, due_date, etc.)

**Response** `200`: `Assignment` object.

---

### GET /classes/:class_id/assignments

List assignments for a class. Tenant-scoped.

**Auth required**: Yes

**Response** `200`: Array of `Assignment`.

---

### GET /classes/assignments/:assignment_id

Get assignment details. Tenant-scoped.

**Auth required**: Yes

**Response** `200`: `Assignment` object.

---

### PUT /classes/assignments/:assignment_id

Update an assignment. Teacher+ only, must be class owner.

**Auth required**: Teacher or higher

**Request body**: `UpdateAssignmentRequest`

**Response** `200`: Updated `Assignment`.

---

### DELETE /classes/assignments/:assignment_id

Delete an assignment. Teacher+ only, must be class owner.

**Auth required**: Teacher or higher

**Response** `204`: No content.

---

### POST /classes/assignments/:assignment_id/publish

Publish a draft assignment. Teacher+ only, must be class owner.

**Auth required**: Teacher or higher

**Response** `200`: Updated `Assignment` with `status: "published"`.

---

### GET /classes/assignments/:assignment_id/submissions

Get all submissions for an assignment. Teacher/admin only.

**Auth required**: Teacher or higher (class owner)

**Response** `200`: Array of `AssignmentSubmission`.

---

## Leaderboard

### GET /leaderboard/global

Get the global leaderboard. Non-admin users see only their organization.

**Auth required**: Yes

**Query parameters**: `LeaderboardQuery` (page, limit).

**Response** `200`: `LeaderboardResponse` with ranked entries.

---

### GET /leaderboard/school/:school_id

Get school leaderboard. Must match user's organization unless admin.

**Auth required**: Yes

**Response** `200`: `LeaderboardResponse`.

---

### GET /leaderboard/campus/:campus_id

Get campus leaderboard. Must match user's campus unless admin.

**Auth required**: Yes

**Response** `200`: `LeaderboardResponse`.

---

### GET /leaderboard/class/:class_id

Get class leaderboard. Must be class member or teacher/admin.

**Auth required**: Yes

**Response** `200`: `LeaderboardResponse`.

---

### GET /leaderboard/user/:user_id/stats

Get individual user statistics. Own stats, or teacher/admin of same org.

**Auth required**: Yes

**Response** `200`: `UserStats` object.

---

### GET /leaderboard/problem/:problem_id

Get fastest solvers for a problem. Scoped to user's org unless admin.

**Auth required**: Yes

**Query parameters**: `limit` (default 10, max 100).

**Response** `200`: Array of `ProblemLeaderboardEntry`.

---

## Discussions

### GET /discussions

List discussions with filtering.

**Auth required**: Yes

**Query parameters**: `DiscussionFilters` (problem_id, page, limit, sort).

**Response** `200`: `DiscussionListResponse`.

---

### POST /discussions

Create a new discussion.

**Auth required**: Yes

**Request body**: `CreateDiscussionRequest` (title, content, problem_id, tags).

**Response** `200`: `Discussion` object.

---

### GET /discussions/:id

Get discussion detail with replies.

**Auth required**: Yes

**Response** `200`: `DiscussionDetail` with replies.

**Error** `404`: Discussion not found.

---

### PATCH /discussions/:id

Update a discussion. Author only.

**Auth required**: Yes (author)

**Request body**: `UpdateDiscussionRequest`

**Response** `200`: Updated `Discussion`.

---

### DELETE /discussions/:id

Delete a discussion. Author or admin.

**Auth required**: Yes (author or admin)

**Response** `204`: No content.

---

### GET /discussions/:id/replies

Get replies for a discussion.

**Auth required**: Yes

**Response** `200`: Array of `DiscussionReply`.

---

### POST /discussions/:id/replies

Create a reply to a discussion. Sends WebSocket notification.

**Auth required**: Yes

**Request body**: `CreateReplyRequest` (content).

**Response** `200`: `DiscussionReply`.

**Error** `403`: Discussion is locked.

---

### POST /discussions/:id/like

Toggle like on a discussion.

**Auth required**: Yes

**Response** `200`: `true` (liked) or `false` (unliked).

---

### POST /discussions/replies/:reply_id/like

Toggle like on a reply.

**Auth required**: Yes

**Response** `200`: `true` (liked) or `false` (unliked).

---

## Blog

### GET /blog

List articles with filtering.

**Auth required**: Yes

**Query parameters**: `ArticleFilters` (page, limit, category, tag, author_id).

**Response** `200`: `ArticleListResponse`.

---

### POST /blog

Create a new article. Sends WebSocket notification to tenant.

**Auth required**: Yes

**Request body**: `CreateArticleRequest` (title, content, category, tags, etc.)

**Response** `200`: `Article` object.

---

### GET /blog/trending

Get trending articles.

**Auth required**: Yes

**Query parameters**: `limit` (default 10).

**Response** `200`: Array of `Article`.

---

### GET /blog/featured

Get featured articles.

**Auth required**: Yes

**Query parameters**: `limit` (default 5).

**Response** `200`: Array of `Article`.

---

### GET /blog/categories

List all article categories.

**Auth required**: Yes

**Response** `200`: Array of strings.

---

### GET /blog/tags/popular

Get popular tags with counts.

**Auth required**: Yes

**Query parameters**: `limit` (default 20).

**Response** `200`: Array of `[tag_name, count]` pairs.

---

### GET /blog/:slug_or_id

Get article detail by slug or ID.

**Auth required**: Yes

**Response** `200`: `ArticleDetail` with comments.

**Error** `404`: Article not found.

---

### PATCH /blog/:slug_or_id

Update an article. Author only.

**Auth required**: Yes (author)

**Request body**: `UpdateArticleRequest`

**Response** `200`: Updated `Article`.

---

### DELETE /blog/:slug_or_id

Delete an article. Author or admin.

**Auth required**: Yes (author or admin)

**Response** `204`: No content.

---

### GET /blog/:slug_or_id/comments

Get comments for an article.

**Auth required**: Yes

**Response** `200`: Array of `ArticleComment`.

---

### POST /blog/:slug_or_id/comments

Create a comment on an article. Sends WebSocket notification.

**Auth required**: Yes

**Request body**: `CreateCommentRequest` (content).

**Response** `200`: `ArticleComment`.

---

### POST /blog/:id/like

Toggle like on an article.

**Auth required**: Yes

**Response** `200`: `true` (liked) or `false` (unliked).

---

### POST /blog/comments/:comment_id/like

Toggle like on a comment.

**Auth required**: Yes

**Response** `200`: `true` (liked) or `false` (unliked).

---

## Messages

### GET /messages/conversations

List conversations for the authenticated user, ordered by most recent message.

**Auth required**: Yes

**Response** `200`: Array of `ConversationDto`:

```json
[
  {
    "id": "uuid",
    "peer_user_id": "uuid",
    "peer_username": "string",
    "last_message": "string",
    "last_message_at": "timestamp",
    "unread_count": 3
  }
]
```

---

### GET /messages/conversations/:conversation_id

Get all messages in a conversation. Automatically marks unread messages as read.

**Auth required**: Yes (must be conversation member)

**Response** `200`: Array of `DirectMessageDto`.

---

### POST /messages/conversations/:conversation_id

Send a message in a conversation.

**Auth required**: Yes (must be conversation member)

**Request body**:

```json
{
  "content": "string"
}
```

**Response** `200`: `DirectMessageDto`.

**Error** `400`: Empty content. `404`: Not a conversation member.

---

## Search

### GET /search

Search problems and content. Tenant-aware for authenticated users.

**Auth required**: Optional (enhanced results with auth)

**Query parameters**: `SearchQuery` (q, type, page, limit).

**Response** `200`: `SearchResponse` with results grouped by type.

---

### GET /search/suggestions

Get search autocomplete suggestions.

**Auth required**: Optional

**Query parameters**: `q` (query string).

**Response** `200`: `SearchSuggestionsResponse`.

---

## Notifications

### GET /notifications

List notifications for the authenticated user.

**Auth required**: Yes

**Query parameters**: `ListNotificationsQuery` (page, limit, unread_only).

**Response** `200`: Paginated notification list.

---

### GET /notifications/stats

Get notification statistics (unread count, etc.).

**Auth required**: Yes

**Response** `200`: Notification stats object.

---

### POST /notifications/mark-read

Mark specific notifications as read.

**Auth required**: Yes

**Request body**:

```json
{
  "notification_ids": ["uuid1", "uuid2"]
}
```

**Response** `200`:

```json
{
  "message": "Notifications marked as read",
  "count": 2
}
```

---

### POST /notifications/mark-all-read

Mark all notifications as read.

**Auth required**: Yes

**Response** `200`:

```json
{
  "message": "All notifications marked as read",
  "count": 15
}
```

---

### GET /notifications/settings

Get notification preferences.

**Auth required**: Yes

**Response** `200`: `NotificationSettings` (email_notifications, reply_notifications, digest_mode, etc.).

---

### PUT /notifications/settings

Update notification preferences.

**Auth required**: Yes

**Request body**: `NotificationSettings` (digest_mode must be one of: `immediate`, `hourly`, `daily`).

**Response** `200`: Updated `NotificationSettings`.

---

### DELETE /notifications/:id

Delete a notification.

**Auth required**: Yes

**Response** `204`: Deleted. `404`: Not found.

---

## Import / Export

### POST /imex/import/problems/validate

Upload a ZIP file to preview problem import. Teacher+ only. Max 50 MB.

**Auth required**: Teacher or higher

**Content-Type**: `multipart/form-data`

**Form fields**: `file` (ZIP file).

**Response** `200`: `ImportPreviewResponse` with token, validation results, warnings, and errors.

---

### POST /imex/import/problems/execute

Execute a previously validated problem import. Teacher+ only.

**Auth required**: Teacher or higher

**Request body**:

```json
{
  "token": "uuid (from validate step)"
}
```

**Response** `200`: `ImportResultResponse` (total, created, skipped, errors).

---

### GET /imex/export/problems/:id

Export a problem as a ZIP file with test cases. Teacher+ only.

**Auth required**: Teacher or higher

**Response** `200`: Binary ZIP file (`Content-Type: application/zip`).

---

### POST /imex/import/users/validate

Upload a CSV file to preview user import. Admin only. Max 10 MB.

**Auth required**: Admin

**Content-Type**: `multipart/form-data`

**Form fields**: `file` (CSV), `default_password` (string, min 6 chars).

**Response** `200`: `UserImportPreviewResponse` with token and validation results.

---

### POST /imex/import/users/execute

Execute a previously validated user import. Admin only.

**Auth required**: Admin

**Request body**:

```json
{
  "token": "uuid (from validate step)"
}
```

**Response** `200`: `ImportResultResponse`.

---

### GET /imex/export/users

Export all users in the organization as a CSV file. Admin only.

**Auth required**: Admin

**Response** `200`: CSV file (`Content-Type: text/csv`). CampusAdmin sees only their campus users.

---

## Admin: Plagiarism

All plagiarism endpoints require admin role.

### GET /admin/plagiarism/config

Get plagiarism scan configuration.

**Auth required**: Admin

**Response** `200`: `SimilarityScanConfig`:

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

### PUT /admin/plagiarism/config

Update plagiarism scan configuration.

**Auth required**: Admin

**Request body**: `SimilarityScanConfig` (all fields required).

**Response** `200`: Updated config.

---

### POST /admin/plagiarism/scan

Run a plagiarism scan for a contest or assignment.

**Auth required**: Admin

**Request body**:

```json
{
  "contest_id": "string (optional)",
  "assignment_id": "string (optional)"
}
```

**Response** `200`: `{ "report_id": "uuid" }`.

---

### GET /admin/plagiarism/reports

List plagiarism reports with pagination.

**Auth required**: Admin

**Query parameters**: `page` (default 1), `limit` (default 20, max 100).

**Response** `200`: `PlagiarismReportListResponse` with reports and top pairs.

---

### GET /admin/plagiarism/reports/:report_id

Get detailed plagiarism report with all pairs.

**Auth required**: Admin

**Response** `200`: `PlagiarismReport` with up to 100 top pairs.

**Error** `404`: Report not found.

---

## Admin: Judge Monitor

### GET /admin/judge/status

Get judge queue status, worker heartbeats, and circuit breaker states. Root only (global infrastructure data).

**Auth required**: Root

**Response** `200`:

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
  "workers": [{ "worker_id": "...", "active_judgements": 2, ... }]
}
```

---

### GET /admin/judge/dlq

List dead-letter queue entries. Admin+. Tenant-scoped.

**Auth required**: Admin

**Query parameters**: `count` (default 50, max 200), `start_id` (for pagination).

**Response** `200`:

```json
{
  "items": [
    {
      "id": "redis-stream-id",
      "submission_id": "123",
      "error_reason": "...",
      "source_stream": "submissions",
      "submitted_at": "...",
      "failed_at": "..."
    }
  ],
  "count": 5
}
```

---

### POST /admin/judge/dlq/:id/retry

Retry a dead-letter queue entry. Admin+. Tenant-scoped.

**Auth required**: Admin

**Response** `200`:

```json
{
  "message": "DLQ entry retried",
  "entry_id": "...",
  "target_stream": "submissions"
}
```

---

### DELETE /admin/judge/dlq/:id

Permanently delete a DLQ entry. Admin+. Tenant-scoped.

**Auth required**: Admin

**Response** `200`:

```json
{
  "message": "DLQ entry discarded",
  "entry_id": "..."
}
```

---

## Worker Callbacks

### POST /internal/worker/heartbeat

Judge worker heartbeat. Authenticated via `X-Worker-Secret` header (not JWT). Not rate-limited.

**Auth required**: Worker secret (X-Worker-Secret header)

**Request body**:

```json
{
  "worker_id": "string",
  "active_judgements": 2,
  "total_processed": 150,
  "avg_wait_ms": 45,
  "redis_breaker_state": "closed",
  "api_breaker_state": "closed"
}
```

**Response** `200`: `{ "status": "ok" }`.

Heartbeat data is stored in Redis at `worker:heartbeat:{worker_id}` with a 30-second TTL.

---

## Health & Metrics

These endpoints are **not rate-limited**.

### GET /health/live

Liveness probe. Returns `200` with body `"OK"` if the process is alive.

**Auth required**: No

---

### GET /health/ready

Readiness probe. Checks PostgreSQL and Redis connectivity.

**Auth required**: No

**Response** `200`:

```json
{
  "status": "ok",
  "db": "connected",
  "redis": "connected"
}
```

**Response** `503`: One or more dependencies unavailable.

---

### GET /health

Redirects to `/health/live` (307).

---

### GET /status

Redirects to `/health/ready` (307).

---

### GET /metrics

Prometheus metrics endpoint. Returns Prometheus-formatted text for scraping.

**Auth required**: No

---

## WebSocket

### GET /ws

Upgrade to a WebSocket connection for real-time updates.

**Auth required**: JWT token via `?token=` query parameter or `access_token` cookie.

**Protocol**: Messages are JSON-encoded with a `type` field for dispatch.

**Message types**:

| Type                | Direction    | Description                       |
|---------------------|-------------|-----------------------------------|
| `SubmissionUpdate`  | Server->Client | Real-time judging progress     |
| `LeaderboardUpdate` | Server->Client | Rank changes                   |
| `Notification`      | Server->Client | In-app notifications            |
| `ContestUpdate`     | Server->Client | Contest status/time             |
| `ProblemStats`      | Server->Client | Submission statistics           |
| `ChatMessage`       | Server->Client | Contest chat                    |
| `DiscussionReply`   | Server->Client | Discussion reply notifications  |
| `ArticleComment`    | Server->Client | Blog comment notifications      |
| `TrendingArticles`  | Server->Client | Blog trending updates           |
| `Ping`              | Bidirectional  | Heartbeat                       |
| `Pong`              | Server->Client | Heartbeat response              |
| `Error`             | Server->Client | Protocol/subscription errors    |

**Subscription topics** (client sends `{ "action": "subscribe", "topic": "..." }`):

| Topic Pattern              | Visibility                              |
|---------------------------|-----------------------------------------|
| `submission:{id}`         | User's own submissions only             |
| `contest:{id}`            | Same-organization contests              |
| `contest:{id}:chat`       | Teachers + registered participants      |
| `user:{uuid}`             | Personal notifications (auto-subscribed)|
| `leaderboard:{scope}:{id}`| Ranking updates                         |
| `discussion:{id}`         | Discussion reply updates                |
| `article:{id}`            | Article comment updates                 |

---

## Error Responses

All errors follow a consistent JSON envelope:

```json
{
  "error": "Human-readable error message",
  "status": 401
}
```

**Standard HTTP status codes used**:

| Status | Meaning                    |
|--------|----------------------------|
| 200    | Success                    |
| 204    | Success (no content)       |
| 400    | Validation error           |
| 401    | Authentication required    |
| 403    | Insufficient permissions   |
| 404    | Resource not found         |
| 409    | Conflict (duplicate)       |
| 429    | Rate limit exceeded        |
| 500    | Internal server error      |
| 503    | Service unavailable (deps) |

**AppError variants** (from `api-infra/src/error.rs`):

| Variant     | HTTP Status | Usage                               |
|-------------|-------------|--------------------------------------|
| `Auth`      | 401         | Invalid/expired JWT, bad credentials |
| `Forbidden` | 403         | Role or tenant access violation      |
| `NotFound`  | 404         | Resource does not exist              |
| `Validation`| 400         | Invalid request data                 |
| `Database`  | 500         | Database operation failure            |
| `Internal`  | 500         | Unexpected server error              |

---

## Rate Limiting

User-facing endpoints are rate-limited to **30 requests per minute per IP** using a token-bucket algorithm (1 request/second refill, burst size 30). The following endpoints are **not rate-limited**:

- `/health/live`, `/health/ready`, `/health`, `/status`
- `/metrics`
- `/internal/worker/heartbeat`

When rate-limited, the API returns `429 Too Many Requests`.

<!-- GSD:docs -->
