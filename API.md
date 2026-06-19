![CodeNexus Banner](codenexus_banner.svg)

> 📄 **[Read in Chinese / 中文说明](API.zh-CN.md)**

# REST API Reference Manual

This document provides the complete API specification for **CodeNexus**, including base URLs, request/response formats, security parameters, and HTTP endpoints.

---

## 1. Global Specifications

### Server Information

| Attribute | Specification |
|-----------|---------------|
| **Base URL** | `http://{host}:3000/api` |
| **Protocol** | HTTP REST & WebSockets |
| **Data Format** | JSON (`application/json`) |
| **Character Set** | UTF-8 |
| **Authentication** | JWT Bearer Token / HTTP-Only Cookies |

### Mounted API Areas

The Axum API currently mounts these route groups:

| Area | Prefix |
|------|--------|
| Auth/session | `/auth/*` |
| Users | `/users/*` |
| Problems and test cases | `/problems/*` |
| Submissions and judge callbacks | `/submissions/*` |
| Contests and scoreboards | `/contests/*` |
| Classes and assignments | `/classes/*` |
| Community discussions | `/discussions/*` |
| Blog articles | `/blog/*` |
| Search | `/search/*` |
| Notifications | `/notifications/*` |
| Learning roadmap | `/roadmap/*` |
| Direct messages | `/messages/*` |
| Import/export | `/imex/*` |
| Feature flags | `/features/*` |
| Admin judge monitor | `/admin/judge/*` |
| Admin plagiarism | `/admin/plagiarism/*` |
| Analysis / AI assistance | `/analysis/*` |

### Standard Response Schemas

#### 1. Success Payload
Returned directly as a JSON object or array.
```json
{
  "id": "uuid-v4-string",
  "title": "Two Sum",
  "difficulty": "easy"
}
```

#### 2. Standard Error Payload
Uniform envelope for errors and exceptions.
```json
{
  "error": "The requested resource was not found.",
  "status": 404
}
```

#### 3. Paginated Payload
List collections are wrapped in a pager schema.
```json
{
  "items": [],
  "total": 250,
  "page": 1,
  "limit": 20
}
```

---

## 2. Authentication & Session Endpoints

### POST `/auth/login`
Authenticates a user and establishes standard JWT cookies.

**Request Payload:**
```json
{
  "username": "developer1",
  "password": "strongpassword123"
}
```

**Success Response (`200 OK`):**
```json
{
  "token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "user": {
    "id": "uuid-string",
    "username": "developer1",
    "email": "dev@nexus.edu",
    "role": "student",
    "school_id": 1,
    "campus_id": null
  }
}
```

---

### POST `/auth/register`
Registers a new user profile under a designated tenant structure.

**Request Payload:**
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "user@nexus.edu",
  "organization_id": 1,
  "campus_id": null,
  "display_name": "John Doe"
}
```

**Success Response (`200 OK`):**
```json
{
  "token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "user": {
    "id": "uuid-string",
    "username": "newuser",
    "email": "user@nexus.edu",
    "role": "student",
    "school_id": 1
  }
}
```

---

### GET `/users/me`
Retrieves the profile of the currently logged-in user session.

**Success Response (`200 OK`):**
```json
{
  "id": "uuid-string",
  "username": "newuser",
  "email": "user@nexus.edu",
  "role": "student",
  "school_id": 1,
  "campus_id": null,
  "display_name": "John Doe"
}
```

---

## 3. Problem Management Endpoints

### GET `/problems`
Retrieves a paginated list of visible problems, automatically filtered by the requester's tenant context.

**Parameters:**
- `page` (optional) — Default: `1`
- `limit` (optional) — Default: `20`
- `difficulty` (optional) — Ex: `easy`, `medium`, `hard`
- `search` (optional) — Text query

**Success Response (`200 OK`):**
```json
{
  "items": [
    {
      "id": "problem-uuid",
      "title": "Two Sum",
      "difficulty": "easy",
      "time_limit": 1000,
      "memory_limit": 256,
      "accepted_count": 140,
      "submission_count": 300
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

### GET `/problems/:id`
Retrieves detailed specifications of a single problem, including the Markdown description.

**Success Response (`200 OK`):**
```json
{
  "id": "problem-uuid",
  "title": "Two Sum",
  "description": "# Two Sum\n\nGiven an array...",
  "difficulty": "easy",
  "time_limit": 1000,
  "memory_limit": 256,
  "allowed_languages": ["c", "cpp", "python", "go"]
}
```

---

### POST `/problems`
Creates a new problem. (Requires role `Teacher` or higher).

**Request Payload:**
```json
{
  "title": "Add Two Numbers",
  "description": "You are given two non-empty linked lists...",
  "difficulty": "medium",
  "time_limit": 2000,
  "memory_limit": 512,
  "allowed_languages": ["c", "cpp", "python"]
}
```

**Success Response (`201 Created`):**
```json
{
  "id": "new-problem-uuid",
  "title": "Add Two Numbers",
  "difficulty": "medium"
}
```

---

## 4. Submission Endpoints

### POST `/submissions`
Submits source code to be processed by the judging stream.

**Request Payload:**
```json
{
  "problem_id": 1,
  "language": "cpp",
  "code": "#include <iostream>\nint main() { return 0; }",
  "contest_id": null
}
```

**Success Response (`202 Accepted`):**
```json
{
  "id": 123,
  "problem_id": 1,
  "language": "cpp",
  "status": "pending"
}
```
<!-- GSD:docs -->
