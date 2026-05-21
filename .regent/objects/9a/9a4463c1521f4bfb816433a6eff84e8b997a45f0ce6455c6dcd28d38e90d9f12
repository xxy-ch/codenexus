# Contest System API Documentation

## Overview

The Contest System API provides endpoints for managing programming contests with support for ACM, IOI, and Education contest rules. Features include:

- Contest CRUD operations
- Problem set management
- Participant registration
- Real-time rankings with ACM scoring
- Contest status tracking (upcoming/active/ended)
- Freeze board (scoreboard hiding) support
- Submission tracking during contests

## Base URL

```
http://localhost:3000/contests
```

## Authentication

All endpoints require JWT authentication except where noted.

## Endpoints

### 1. List Contests

**GET** `/contests`

Query Parameters:
- `organization_id` (optional): Filter by organization
- `campus_id` (optional): Filter by campus
- `active` (optional): Filter for active contests (true/false)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

Response:
```json
{
  "contests": [
    {
      "id": 1,
      "organization_id": 1,
      "campus_id": null,
      "name": "Weekly Contest #1",
      "description": "Weekly programming challenge",
      "rules": "acm",
      "start_time": "2024-01-01T10:00:00Z",
      "end_time": "2024-01-01T12:00:00Z",
      "freeze_minutes": 30,
      "created_at": "2024-01-01T08:00:00Z",
      "updated_at": "2024-01-01T08:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### 2. Create Contest

**POST** `/contests`

Request Body:
```json
{
  "organization_id": 1,
  "campus_id": null,
  "name": "Weekly Contest #1",
  "description": "Weekly programming challenge",
  "rules": "acm",
  "start_time": "2024-01-01T10:00:00Z",
  "end_time": "2024-01-01T12:00:00Z",
  "freeze_minutes": 30
}
```

Fields:
- `organization_id` (required): Organization ID
- `campus_id` (optional): Campus ID for school-level contests
- `name` (required): Contest name
- `description` (optional): Contest description
- `rules` (optional): Contest rules - "acm", "ioi", or "education" (default: "acm")
- `start_time` (required): Contest start time (ISO 8601)
- `end_time` (required): Contest end time (ISO 8601)
- `freeze_minutes` (optional): Minutes before end to freeze scoreboard

Response: `200 OK` with Contest object

### 3. Get Contest Details

**GET** `/contests/:id`

Response:
```json
{
  "id": 1,
  "organization_id": 1,
  "campus_id": null,
  "name": "Weekly Contest #1",
  "description": "Weekly programming challenge",
  "rules": "acm",
  "start_time": "2024-01-01T10:00:00Z",
  "end_time": "2024-01-01T12:00:00Z",
  "freeze_minutes": 30,
  "created_at": "2024-01-01T08:00:00Z",
  "updated_at": "2024-01-01T08:00:00Z",
  "problem_count": 5,
  "participant_count": 42
}
```

### 4. Update Contest

**PUT** `/contests/:id`

Request Body (all fields optional):
```json
{
  "name": "Updated Contest Name",
  "description": "Updated description",
  "rules": "ioi",
  "start_time": "2024-01-01T11:00:00Z",
  "end_time": "2024-01-01T13:00:00Z",
  "freeze_minutes": 15
}
```

Response: `200 OK` with updated Contest object

### 5. Delete Contest

**DELETE** `/contests/:id`

Response: `204 No Content`

### 6. Get Contest Status

**GET** `/contests/:id/status`

No authentication required.

Response:
```json
{
  "status": "active",
  "time_until_start": null,
  "time_until_end": 3600,
  "is_frozen": false
}
```

Status values:
- `upcoming`: Contest has not started
- `active`: Contest is currently running
- `ended`: Contest has finished

### 7. Register for Contest

**POST** `/contests/:id/register`

Register the authenticated user for the contest.

Response:
```json
{
  "id": 1,
  "contest_id": 1,
  "user_id": "uuid",
  "registered_at": "2024-01-01T09:00:00Z"
}
```

Error responses:
- `409 Conflict`: Already registered for this contest

### 8. Get Contest Participants

**GET** `/contests/:id/participants`

Response:
```json
[
  {
    "id": 1,
    "contest_id": 1,
    "user_id": "uuid",
    "registered_at": "2024-01-01T09:00:00Z"
  }
]
```

### 9. Add Problem to Contest

**POST** `/contests/:id/problems`

Request Body:
```json
{
  "problem_id": 1,
  "points": 100,
  "order_index": 1
}
```

Fields:
- `problem_id` (required): Problem ID
- `points` (optional): Problem points (default: 100)
- `order_index` (optional): Display order (default: 0)

Response: `200 OK` with ContestProblem object

### 10. Get Contest Problems

**GET** `/contests/:id/problems`

Response:
```json
[
  {
    "id": 1,
    "problem_id": 1,
    "title": "Two Sum",
    "difficulty": "easy",
    "points": 100,
    "order_index": 1
  }
]
```

### 11. Remove Problem from Contest

**DELETE** `/contests/:id/problems/:problem_id`

Response: `204 No Content`

### 12. Get Contest Rankings

**GET** `/contests/:id/rankings`

Returns ACM-style rankings with penalty calculation.

Response:
```json
[
  {
    "user_id": "uuid",
    "username": "alice",
    "score": 500,
    "penalty": 145,
    "solved_count": 5,
    "submissions": [
      {
        "problem_id": 1,
        "problem_title": "Two Sum",
        "score": 100,
        "attempts": 1,
        "time_penalty": 12,
        "first_solved_at": "2024-01-01T10:12:00Z"
      }
    ]
  }
]
```

Ranking rules (ACM):
1. Primary: Solved count (descending)
2. Secondary: Total penalty (ascending)
3. Tertiary: Last AC time (descending)

Penalty calculation:
- Base time: Minutes from contest start to first AC
- Wrong submission penalty: 20 minutes per incorrect attempt before AC

### 13. Link Submission to Contest (Internal)

**POST** `/contests/:id/submissions/:submission_id`

Internal endpoint used by the judge system to link submissions to contests.

Response: `200 OK` with ContestSubmission object

Error responses:
- `403 Forbidden`: Contest is not active
- `404 Not Found`: Contest or submission not found

## Contest Rules

### ACM Rules
- Ranking based on: solved count (desc), penalty (asc), last AC time (desc)
- Penalty: time + 20 minutes per wrong submission
- First AC submission counts
- Freeze board supported

### IOI Rules
- Ranking based on: total score (desc)
- Each problem can be submitted multiple times
- Best score per problem counts
- No penalty time

### Education Rules
- Practice mode, no formal ranking
- All submissions visible
- No freeze board

## Database Schema

### contests
```sql
- id: BIGSERIAL PRIMARY KEY
- organization_id: BIGINT NOT NULL (FK to organizations)
- campus_id: BIGINT (FK to campuses)
- name: VARCHAR(255) NOT NULL
- description: TEXT
- rules: VARCHAR(50) NOT NULL DEFAULT 'acm'
- start_time: TIMESTAMPTZ NOT NULL
- end_time: TIMESTAMPTZ NOT NULL
- freeze_minutes: INTEGER
- created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
- updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### contest_problems
```sql
- id: BIGSERIAL PRIMARY KEY
- contest_id: BIGINT NOT NULL (FK to contests)
- problem_id: BIGINT NOT NULL (FK to problems)
- points: INTEGER NOT NULL DEFAULT 100
- order_index: INTEGER NOT NULL DEFAULT 0
- created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
- UNIQUE(contest_id, problem_id)
```

### contest_participants
```sql
- id: BIGSERIAL PRIMARY KEY
- contest_id: BIGINT NOT NULL (FK to contests)
- user_id: UUID NOT NULL (FK to users)
- registered_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
- UNIQUE(contest_id, user_id)
```

### contest_submissions
```sql
- id: BIGSERIAL PRIMARY KEY
- contest_id: BIGINT NOT NULL (FK to contests)
- submission_id: BIGINT NOT NULL (FK to submissions)
- penalty_time: INTEGER NOT NULL DEFAULT 0
- created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
- UNIQUE(contest_id, submission_id)
```

## Error Responses

All endpoints may return:

- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate registration
- `500 Internal Server Error`: Server error

## Example Usage

### Create and Run a Contest

```bash
# 1. Create contest
curl -X POST http://localhost:3000/contests \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": 1,
    "name": "Weekly Contest",
    "rules": "acm",
    "start_time": "2024-01-01T10:00:00Z",
    "end_time": "2024-01-01T12:00:00Z",
    "freeze_minutes": 30
  }'

# 2. Add problems
curl -X POST http://localhost:3000/contests/1/problems \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"problem_id": 1, "points": 100}'

# 3. Register participants
curl -X POST http://localhost:3000/contests/1/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. View rankings
curl http://localhost:3000/contests/1/rankings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 5. Check status
curl http://localhost:3000/contests/1/status
```

## Testing

Run the automated test script:

```bash
./tests/contest_api_test.sh
```

This will test all CRUD operations, registration, and status checking.
