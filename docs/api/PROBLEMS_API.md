# Problems Management API Documentation

## Overview

The Problems Management API provides endpoints for creating, managing, and searching programming problems with test cases, difficulty levels, and visibility controls.

## Base URL

```
http://localhost:3000/problems
```

## Authentication

All endpoints require JWT authentication.

## Data Models

### Problem
```json
{
  "id": "uuid",
  "title": "Two Sum",
  "description": "Given an array of integers...",
  "difficulty": "easy",
  "time_limit": 5000,
  "memory_limit": 256,
  "created_by": "uuid",
  "organization_id": 1,
  "is_public": false,
  "visibility": "private",
  "tags": ["array", "hash-table"],
  "source_url": "https://leetcode.com/problems/two-sum",
  "author_note": "Classic problem for beginners",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Problem Statistics
```json
{
  "problem_id": "uuid",
  "total_submissions": 1250,
  "accepted_submissions": 890,
  "acceptance_rate": 71.2,
  "fastest_time_ms": 45,
  "first_solver_id": "uuid",
  "first_solved_at": "2024-01-01T01:00:00Z",
  "last_solved_at": "2024-01-02T15:30:00Z"
}
```

## Endpoints

### 1. List Problems

**GET** `/problems`

Query Parameters:
- `difficulty` (optional): Filter by difficulty - "easy", "medium", "hard", "expert"
- `visibility` (optional): Filter by visibility - "global", "school", "campus", "class", "private"
- `is_public` (optional): Filter by public status (true/false)
- `tags` (optional): Filter by tags (array)
- `search` (optional): Full-text search on title and description
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sort_by` (optional): Sort field - "created_at", "title", "difficulty", "updated_at"
- `sort_order` (optional): Sort order - "asc", "desc" (default: "desc")

Example Request:
```
GET /problems?difficulty=easy&tags=array&page=1&limit=20&sort_by=title&sort_order=asc
```

Response:
```json
{
  "problems": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Two Sum",
      "description": "Given an array of integers...",
      "difficulty": "easy",
      "time_limit": 5000,
      "memory_limit": 256,
      "created_by": "550e8400-e29b-41d4-a716-446655440001",
      "organization_id": 1,
      "is_public": true,
      "visibility": "school",
      "tags": ["array", "hash-table"],
      "source_url": null,
      "author_note": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### 2. Create Problem

**POST** `/problems`

Request Body:
```json
{
  "title": "Two Sum",
  "description": "Given an array of integers nums and an integer target...",
  "difficulty": "easy",
  "time_limit": 5000,
  "memory_limit": 256,
  "organization_id": 1,
  "is_public": false,
  "visibility": "private",
  "tags": ["array", "hash-table"],
  "source_url": "https://leetcode.com/problems/two-sum",
  "author_note": "Good for teaching hash tables"
}
```

Fields:
- `title` (required): Problem title
- `description` (required): Problem description (supports Markdown)
- `difficulty` (required): One of "easy", "medium", "hard", "expert"
- `time_limit` (optional): Time limit in milliseconds (default: 5000)
- `memory_limit` (optional): Memory limit in MB (default: 256)
- `organization_id` (required): Organization ID
- `is_public` (optional): Publicly visible (default: false)
- `visibility` (optional): One of "global", "school", "campus", "class", "private" (default: "private")
- `tags` (optional): Array of tags for categorization
- `source_url` (optional): Original source URL
- `author_note` (optional): Notes for other teachers

Response: `200 OK` with Problem object

### 3. Get Problem Details

**GET** `/problems/:id`

Returns detailed problem information including statistics and test case count.

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Two Sum",
  "description": "...",
  "difficulty": "easy",
  "time_limit": 5000,
  "memory_limit": 256,
  "created_by": "550e8400-e29b-41d4-a716-446655440001",
  "organization_id": 1,
  "is_public": true,
  "visibility": "school",
  "tags": ["array", "hash-table"],
  "source_url": null,
  "author_note": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "statistics": {
    "problem_id": "550e8400-e29b-41d4-a716-446655440000",
    "total_submissions": 1250,
    "accepted_submissions": 890,
    "acceptance_rate": 71.2,
    "fastest_time_ms": 45,
    "first_solver_id": "550e8400-e29b-41d4-a716-446655440002",
    "first_solved_at": "2024-01-01T01:00:00Z",
    "last_solved_at": "2024-01-02T15:30:00Z"
  },
  "test_case_count": 15
}
```

### 4. Update Problem

**PUT** `/problems/:id`

Request Body (all fields optional):
```json
{
  "title": "Two Sum (Updated)",
  "description": "New description",
  "difficulty": "medium",
  "time_limit": 3000,
  "memory_limit": 512,
  "is_public": true,
  "visibility": "school",
  "tags": ["array", "hash-table", "two-pointers"],
  "source_url": "https://example.com",
  "author_note": "Updated notes"
}
```

Response: `200 OK` with updated Problem object

### 5. Delete Problem

**DELETE** `/problems/:id`

Response: `204 No Content`

### 6. Get Problem Statistics

**GET** `/problems/:id/statistics`

Returns submission statistics for the problem.

Response:
```json
{
  "problem_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_submissions": 1250,
  "accepted_submissions": 890,
  "acceptance_rate": 71.2,
  "fastest_time_ms": 45,
  "first_solver_id": "550e8400-e29b-41d4-a716-446655440002",
  "first_solved_at": "2024-01-01T01:00:00Z",
  "last_solved_at": "2024-01-02T15:30:00Z"
}
```

## Test Cases Management

### 7. List Test Cases

**GET** `/problems/:id/test-cases`

Returns all test cases for a problem (including hidden ones).

Management roles receive full test case data. Student-facing problem views receive only non-hidden sample cases, exposing `input` and `expected_output` for IDE examples while hidden cases remain unavailable.

Response:
```json
[
  {
    "id": 1,
    "problem_id": "550e8400-e29b-41d4-a716-446655440000",
    "input": "2 7 11 15\n9",
    "expected_output": "0 1\n",
    "is_hidden": false,
    "score": 10,
    "order": 0,
    "explanation": "Example from problem statement",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### 8. Create Test Case

**POST** `/problems/:id/test-cases`

Request Body:
```json
{
  "input": "2 7 11 15\n9",
  "expected_output": "0 1\n",
  "is_hidden": false,
  "score": 10,
  "order": 0,
  "explanation": "Sample test case"
}
```

Response: `200 OK` with TestCase object

### 9. Update Test Case

**PUT** `/problems/:id/test-cases/:test_case_id`

Request Body (all fields optional):
```json
{
  "input": "3 2 4\n6",
  "expected_output": "1 2\n",
  "is_hidden": false,
  "score": 10,
  "order": 1,
  "explanation": "Another sample"
}
```

Response: `200 OK` with updated TestCase object

### 10. Delete Test Case

**DELETE** `/problems/:id/test-cases/:test_case_id`

Response: `200 OK` with success message

### 11. Batch Import Test Cases

**POST** `/problems/:id/test-cases`

Import multiple test cases at once (useful for Kattis format).

Request Body:
```json
{
  "test_cases": [
    {
      "input": "2 7 11 15\n9",
      "expected_output": "0 1\n",
      "is_hidden": false,
      "score": 10
    },
    {
      "input": "3 2 4\n6",
      "expected_output": "1 2\n",
      "is_hidden": true,
      "score": 10
    }
  ]
}
```

Response:
```json
{
  "message": "Imported 2 test cases",
  "imported_count": 2,
  "total_count": 2,
  "errors": []
}
```

## Difficulty Levels

- `easy`: Beginner-friendly problems
- `medium`: Intermediate difficulty
- `hard`: Challenging problems
- `expert`: Very difficult or competitive programming level

## Visibility Levels

- `global`: Visible to all users across all organizations
- `school`: Visible to all users in the same school
- `campus`: Visible to users in the same campus
- `class`: Visible only to assigned classes
- `private`: Only visible to the author

## Full-Text Search

The search parameter uses PostgreSQL full-text search with English stemming:
- Searches both title and description
- Supports natural language queries
- Example: `search="binary tree traversal"` matches "binary", "tree", "traversal"

## Error Responses

All endpoints may return:

- `400 Bad Request`: Invalid request body or parameters
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Example Usage

### Create a problem with test cases

```bash
# 1. Create problem
PROBLEM_ID=$(curl -X POST http://localhost:3000/problems \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Two Sum",
    "description": "Given an array of integers nums and an integer target...",
    "difficulty": "easy",
    "time_limit": 5000,
    "memory_limit": 256,
    "organization_id": 1,
    "visibility": "school",
    "tags": ["array", "hash-table"]
  }' | jq -r '.id')

# 2. Add test cases
curl -X POST http://localhost:3000/problems/$PROBLEM_ID/test-cases \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test_cases": [
      {
        "input": "2 7 11 15\n9",
        "expected_output": "0 1\n",
        "is_hidden": false,
        "score": 10
      },
      {
        "input": "3 2 4\n6",
        "expected_output": "1 2\n",
        "is_hidden": false,
        "score": 10
      }
    ]
  }'

# 3. View problem with statistics
curl http://localhost:3000/problems/$PROBLEM_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Search and filter problems

```bash
# Search for easy array problems
curl "http://localhost:3000/problems?difficulty=easy&tags=array&search=sum" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get all public problems sorted by title
curl "http://localhost:3000/problems?is_public=true&sort_by=title&sort_order=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Database Schema

### problems
```sql
- id: UUID PRIMARY KEY
- title: VARCHAR(255) NOT NULL
- description: TEXT NOT NULL
- difficulty: VARCHAR(50) NOT NULL
- time_limit: INTEGER NOT NULL (ms)
- memory_limit: INTEGER NOT NULL (MB)
- created_by: UUID REFERENCES users(id)
- organization_id: BIGINT NOT NULL REFERENCES organizations(id)
- is_public: BOOLEAN NOT NULL
- visibility: VARCHAR(50) NOT NULL
- tags: TEXT[] (array)
- source_url: TEXT
- author_note: TEXT
- created_at: TIMESTAMPTZ NOT NULL
- updated_at: TIMESTAMPTZ NOT NULL
```

### test_cases
```sql
- id: BIGSERIAL PRIMARY KEY
- problem_id: BIGINT NOT NULL REFERENCES problems(id)
- input: TEXT NOT NULL
- output: TEXT NOT NULL
- is_secret: BOOLEAN NOT NULL
- points: INTEGER NOT NULL
- order_index: INTEGER NOT NULL
- created_at: TIMESTAMPTZ NOT NULL
```

### problem_statistics
```sql
- problem_id: UUID PRIMARY KEY REFERENCES problems(id)
- total_submissions: BIGINT NOT NULL
- accepted_submissions: BIGINT NOT NULL
- acceptance_rate: DECIMAL(5,2) GENERATED
- fastest_submission_id: UUID REFERENCES submissions(id)
- fastest_time_ms: INTEGER
- first_solver_id: UUID REFERENCES users(id)
- first_solved_at: TIMESTAMPTZ
- last_solved_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ NOT NULL
- updated_at: TIMESTAMPTZ NOT NULL
```

## Performance Considerations

### Indexes
- Full-text search indexes on title and description
- GIN index on tags array
- Composite indexes for filtering
- Sorted indexes for common query patterns

### Caching Strategy (Future)
- Redis cache for problem list (TTL: 5 minutes)
- Cache invalidation on problem update
- Separate cache for public vs private problems

### Query Optimization
- Prepared statements for all queries
- Efficient pagination with LIMIT/OFFSET
- Denormalized statistics table for performance

## Security Considerations

### Authorization
- Teachers: Create/update problems in their organization
- Students: View problems based on visibility
- Admins: Full access

### Data Isolation
- All queries filtered by organization_id
- Visibility-based access control
- Private problems only visible to author

### Input Validation
- SQL injection prevention with parameterized queries
- Validated difficulty and visibility enums
- Limited time/memory ranges

## Best Practices

1. **Test Case Organization**
   - Use `is_hidden=false` for example cases shown to students in the IDE
   - Use `is_hidden=true` for private judging cases
   - Order test cases logically (visible examples first, then edge cases and hidden cases)

2. **Difficulty Guidelines**
   - Easy: 1-2 simple concepts, straightforward solution
   - Medium: 2-3 concepts, requires some optimization
   - Hard: Multiple concepts, optimal solution non-obvious
   - Expert: Competitive programming level, advanced techniques

3. **Time/Memory Limits**
   - Default: 5000ms / 256MB
   - Adjust based on expected solution complexity
   - Allow 2-3x headroom over optimal solution

4. **Tags Usage**
   - Use standardized tags: "array", "dp", "graph", "string", etc.
   - Include data structures: "binary-tree", "linked-list"
   - Add algorithms: "sorting", "search", "traversal"

## Testing

Run the automated test script:
```bash
./tests/problem_api_test.sh
```

Manual testing examples provided in Example Usage section.
