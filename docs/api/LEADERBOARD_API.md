# Leaderboard & Statistics API Documentation

## Overview

The Leaderboard API provides competitive rankings and statistics at multiple levels (global, school, campus, class) with real-time updates and caching.

## Base URL

```
http://localhost:3000/leaderboard
```

## Authentication

Most endpoints are publicly accessible. User-specific endpoints may require authentication.

## Data Models

### LeaderboardEntry
```json
{
  "rank": 1,
  "user_id": "uuid",
  "username": "alice",
  "score": 42.5,
  "problems_solved": 15,
  "submissions": 89,
  "acceptance_rate": 68.54,
  "organization_id": 1,
  "campus_id": null
}
```

### UserStats
```json
{
  "user_id": "uuid",
  "username": "alice",
  "total_problems_solved": 42,
  "total_submissions": 156,
  "acceptance_rate": 73.08,
  "global_rank": 15,
  "school_rank": 3,
  "campus_rank": 1,
  "class_rank": null,
  "streak_days": 7,
  "max_streak_days": 14,
  "last_ac_at": "2024-01-15T10:30:00Z",
  "joined_at": "2023-09-01T08:00:00Z",
  "recent_ac": [
    {
      "problem_id": "uuid",
      "problem_title": "Two Sum",
      "difficulty": "easy",
      "solved_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Endpoints

### 1. Get Global Leaderboard

**GET** `/leaderboard/global`

Query Parameters:
- `limit` (optional): Number of entries (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)
- `timeframe` (optional): "all", "week", "month", "year" (default: "all")
- `min_problems` (optional): Minimum problems solved to qualify (default: 0)

Response:
```json
{
  "entries": [
    {
      "rank": 1,
      "user_id": "550e8400-...",
      "username": "top_solver",
      "score": 156.5,
      "problems_solved": 89,
      "submissions": 245,
      "acceptance_rate": 78.5,
      "organization_id": 1,
      "campus_id": null
    }
  ],
  "total": 1523,
  "limit": 100,
  "offset": 0,
  "timeframe": "all"
}
```

### 2. Get School Leaderboard

**GET** `/leaderboard/school/:school_id`

Query Parameters:
- `limit` (optional): Number of entries (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

Response: Same structure as global leaderboard

### 3. Get Campus Leaderboard

**GET** `/leaderboard/campus/:campus_id`

Query Parameters:
- `limit` (optional): Number of entries (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

Response: Same structure as global leaderboard

### 4. Get Class Leaderboard

**GET** `/leaderboard/class/:class_id`

Query Parameters:
- `limit` (optional): Number of entries (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

Response: Same structure as global leaderboard

### 5. Get User Statistics

**GET** `/leaderboard/user/:user_id/stats`

Returns comprehensive statistics for a specific user.

Response:
```json
{
  "user_id": "550e8400-...",
  "username": "alice",
  "total_problems_solved": 42,
  "total_submissions": 156,
  "acceptance_rate": 73.08,
  "global_rank": 15,
  "school_rank": 3,
  "campus_rank": 1,
  "class_rank": 5,
  "streak_days": 7,
  "max_streak_days": 14,
  "last_ac_at": "2024-01-15T10:30:00Z",
  "joined_at": "2023-09-01T08:00:00Z",
  "recent_ac": [
    {
      "problem_id": "problem-uuid",
      "problem_title": "Binary Tree Inorder Traversal",
      "difficulty": "medium",
      "solved_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 6. Get Problem Leaderboard

**GET** `/leaderboard/problem/:problem_id`

Returns the fastest solvers for a specific problem.

Query Parameters:
- `limit` (optional): Number of entries (default: 10, max: 100)

Response:
```json
[
  {
    "rank": 1,
    "user_id": "550e8400-...",
    "username": "speed_coder",
    "time_ms": 45,
    "memory_kb": 2048,
    "language": "python3",
    "solved_at": "2024-01-15T10:30:00Z"
  }
]
```

## Scoring System

### Problem Points

Points are awarded based on difficulty:
- **Easy**: 1 point
- **Medium**: 3 points
- **Hard**: 5 points
- **Expert**: 10 points

### Score Calculation

```sql
score = SUM(
  CASE WHEN verdict = 'AC' THEN
    CASE difficulty
      WHEN 'easy' THEN 1
      WHEN 'medium' THEN 3
      WHEN 'hard' THEN 5
      WHEN 'expert' THEN 10
      ELSE 1
    END
  ELSE 0
  END
)
```

### Ranking Criteria

Leaderboards are sorted by:
1. **Score** (descending) - Primary criterion
2. **Problems Solved** (descending) - Tiebreaker
3. **Username** (ascending) - Final tiebreaker

## Caching Strategy

### Redis Caching

- **Cache Key Format**: `leaderboard:{scope}:{limit}:{offset}`
- **TTL**: 5 minutes (300 seconds)
- **Invalidation**: On new accepted submission

### Cache Invalidation

When a user solves a problem:
```rust
service.invalidate_leaderboard_cache().await?;
```

This deletes all leaderboard cache keys, forcing fresh calculation on next request.

## Timeframe Filtering

### Supported Timeframes

- `all`: All-time rankings (default)
- `week`: Last 7 days
- `month`: Last 30 days
- `year`: Last 365 days

### Usage

```
GET /leaderboard/global?timeframe=week
```

This only counts submissions within the specified timeframe.

## Performance Optimizations

### Database Indexes

Ensure these indexes exist:
```sql
CREATE INDEX idx_submissions_user_verdict ON submissions(user_id, verdict);
CREATE INDEX idx_submissions_problem_verdict ON submissions(problem_id, verdict);
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX idx_users_organization_campus ON users(organization_id, campus_id);
```

### Query Optimization

1. **CTE for User Stats**: Calculate once, reuse multiple times
2. **ROW_NUMBER()**: Efficient ranking without subqueries
3. **FILTER clause**: Conditional aggregation efficiently
4. **Prepared statements**: Reusable query plans

### Caching Strategy

1. **First Query**: Calculate from database
2. **Cache Result**: Store in Redis with TTL
3. **Subsequent Queries**: Serve from cache
4. **Invalidation**: Clear cache on new AC

## Example Usage

### Get top 10 global users

```bash
curl "http://localhost:3000/leaderboard/global?limit=10"
```

### Get this week's rankings

```bash
curl "http://localhost:3000/leaderboard/global?timeframe=week&limit=50"
```

### Get school leaderboard with pagination

```bash
curl "http://localhost:3000/leaderboard/school/1?limit=20&offset=20"
```

### Get user stats

```bash
curl http://localhost:3000/leaderboard/user/550e8400-.../stats
```

### Get fastest solvers for a problem

```bash
curl "http://localhost:3000/leaderboard/problem/uuid?limit=5"
```

## Statistics Tracking

### Automatically Tracked

1. **Problems Solved**: Count of unique AC submissions
2. **Total Submissions**: All submission attempts
3. **Acceptance Rate**: Problems solved / Total submissions × 100
4. **Rankings**: Calculated across all scopes
5. **Recent AC**: Last 10 accepted problems

### Future Enhancements

1. **Streak Calculation**: Daily active streaks
2. **Badges**: Achievement badges
3. **Rating System**: ELO-style rating
4. **Progress Tracking**: Weekly/monthly progress
5. **Comparison Stats**: User vs average

## Error Responses

All endpoints may return:

- `400 Bad Request`: Invalid query parameters
- `404 Not Found`: Resource not found (user, school, campus, class)
- `500 Internal Server Error`: Server error

## Integration Points

### Submission System

When a submission is accepted:
```rust
// Update leaderboard cache
leaderboard_service.invalidate_leaderboard_cache().await?;

// Update user statistics
// This can be done asynchronously
```

### Contest System

Contest rankings use similar logic but:
- Time-limited (contest duration)
- Penalty calculation
- Freeze board support
- Separate from global leaderboard

## Monitoring

### Key Metrics

1. **Cache Hit Rate**: Should be > 80%
2. **Query Performance**: < 500ms for top 100
3. **Cache Size**: Monitor Redis memory usage
4. **Update Frequency**: Submission rate vs cache invalidation

### Logging

```rust
tracing::info!(
    limit = limit,
    offset = offset,
    cache_hit = from_cache,
    query_time_ms = duration.as_millis(),
    "Leaderboard query"
);
```

## Security Considerations

### Access Control

1. **Public Leaderboards**: No auth required
2. **User Stats**: May require user permission
3. **Class Leaderboards**: Class membership check
4. **School/Campus**: Organization membership

### Rate Limiting

Suggested limits:
- Global leaderboard: 100 req/min per IP
- User stats: 60 req/min per user
- Other endpoints: 200 req/min per IP

### Data Privacy

1. **Username Only**: Don't expose email/real names
2. **Opt-out Option**: Allow users to hide from leaderboards
3. **Minimize Data**: Only show necessary statistics

## Best Practices

1. **Cache Strategy**: Use aggressive caching for popular queries
2. **Pagination**: Always use limit/offset for large datasets
3. **Timeframe**: Default to "all" for first page, offer filters
4. **Real-time**: 5-minute cache balances freshness vs performance
5. **Monitoring**: Track cache effectiveness and query performance

## Testing

### Manual Testing

```bash
# Test global leaderboard
curl "http://localhost:3000/leaderboard/global?limit=10"

# Test timeframe filtering
curl "http://localhost:3000/leaderboard/global?timeframe=week"

# Test pagination
curl "http://localhost:3000/leaderboard/global?limit=20&offset=20"

# Test user stats
curl http://localhost:3000/leaderboard/user/{uuid}/stats

# Test problem leaderboard
curl http://localhost:3000/leaderboard/problem/{uuid}
```

### Load Testing

```bash
# Simulate 100 concurrent users
ab -n 10000 -c 100 http://localhost:3000/leaderboard/global
```

Expected: < 100ms p95 for cached results
