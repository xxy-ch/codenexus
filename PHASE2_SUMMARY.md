# Phase 2 Implementation Summary: Contest Management System

## Overview

Phase 2 implements the Contest Management System for the Online Judge, supporting ACM, IOI, and Education contest rules. The system includes participant registration, real-time rankings with ACM scoring, contest status tracking, and freeze board functionality.

## Completed Features

### 1. Contest CRUD Operations ✅
- Create, read, update, delete contests
- Support for organization and campus-level contests
- Configurable contest rules (ACM, IOI, Education)
- Time range management with validation

### 2. Contest Problem Management ✅
- Add/remove problems from contests
- Configurable point values per problem
- Customizable problem order
- Batch problem operations

### 3. Participant Registration ✅
- User registration for contests
- Duplicate registration prevention
- Participant listing
- Registration timestamp tracking

### 4. Contest Status Tracking ✅
- Real-time contest status (upcoming/active/ended)
- Time until start/end calculation
- Freeze board detection
- Public status endpoint (no auth required)

### 5. ACM Scoring System ✅
- Full ACM ranking implementation
- Solved count (primary sort, descending)
- Penalty time (secondary sort, ascending)
- Last AC time (tertiary sort, descending)
- Penalty calculation: time + 20 minutes per wrong submission

### 6. Freeze Board Support ✅
- Configurable freeze period
- Automatic freeze detection
- Scoreboard hiding during freeze
- Post-contest full rankings

### 7. Contest-Submission Linking ✅
- Automatic linking of submissions during contest
- Contest validation (must be active)
- Problem validation (must be in contest)
- Internal API for judge system integration

### 8. Database Schema ✅
- Complete migration script
- Four main tables: contests, contest_problems, contest_participants, contest_submissions
- Proper indexes for performance
- Foreign key constraints
- Automatic updated_at triggers

## File Structure

```
api/src/contests/
├── mod.rs           # Module exports
├── models.rs        # Data models (Contest, ContestProblem, ContestParticipant, etc.)
├── routes.rs        # API route handlers
└── service.rs       # Business logic and database operations

migrations/
└── 001_create_contests.sql  # Database migration

tests/
└── contest_api_test.sh      # Automated API testing script

docs/
└── CONTEST_API.md          # Complete API documentation
```

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/contests` | List contests with filtering | Yes |
| POST | `/contests` | Create new contest | Yes |
| GET | `/contests/:id` | Get contest details | No |
| PUT | `/contests/:id` | Update contest | Yes |
| DELETE | `/contests/:id` | Delete contest | Yes |
| GET | `/contests/:id/status` | Get contest status | No |
| POST | `/contests/:id/register` | Register for contest | Yes |
| GET | `/contests/:id/participants` | Get participants | Yes |
| GET | `/contests/:id/problems` | Get contest problems | No |
| POST | `/contests/:id/problems` | Add problem to contest | Yes |
| DELETE | `/contests/:id/problems/:problem_id` | Remove problem | Yes |
| GET | `/contests/:id/rankings` | Get ACM rankings | No |
| POST | `/contests/:id/submissions/:submission_id` | Link submission (internal) | Yes |

## Contest Rules

### ACM Rules
- **Ranking**: Solved count → Total penalty → Last AC time
- **Penalty**: (First AC time - Contest start) + (Wrong attempts × 20 minutes)
- **Scoring**: Binary (AC = points, others = 0)
- **Freeze board**: Supported (configurable minutes before end)

### IOI Rules
- **Ranking**: Total score (descending)
- **Penalty**: None
- **Scoring**: Partial scoring possible
- **Freeze board**: Not supported

### Education Rules
- **Ranking**: None (practice mode)
- **Penalty**: None
- **Scoring**: Best submission per problem
- **Freeze board**: Not supported

## Database Schema

### contests
- Primary contest information
- Links to organizations/campuses
- Time range and rules configuration

### contest_problems
- Many-to-many relationship
- Points and ordering
- Unique constraint on (contest_id, problem_id)

### contest_participants
- User registration tracking
- Unique constraint prevents duplicate registration
- Registration timestamp

### contest_submissions
- Links submissions to contest sessions
- Penalty time tracking for ACM rules
- Validates contest is active when linking

## Key Implementation Details

### ACM Ranking Algorithm

The ranking system uses a three-level sort:
1. **Solved Count** (descending): More solved problems = better rank
2. **Total Penalty** (ascending): Less penalty time = better rank
3. **Last AC Time** (descending): Earlier final AC = better rank

Penalty per problem:
```
penalty = (first_ac_time - contest_start_minutes) + (wrong_attempts - 1) × 20
```

### Contest Status Logic

```python
if now < start_time:
    status = "upcoming"
elif start_time <= now <= end_time:
    status = "active"
else:
    status = "ended"

if freeze_minutes is not None:
    freeze_time = end_time - freeze_minutes
    is_frozen = (freeze_time <= now <= end_time)
```

### Submission Linking Validation

When linking a submission to a contest:
1. Contest must exist
2. Contest must be active (now within [start_time, end_time])
3. Problem must be in contest problem set
4. Prevents duplicate links with ON CONFLICT

## Testing

### Automated Testing

Run the test script:
```bash
./tests/contest_api_test.sh
```

Test coverage:
- Authentication
- Contest CRUD
- Status checking
- Participant registration
- Duplicate registration rejection
- Contest deletion

### Manual Testing Examples

Create a contest:
```bash
curl -X POST http://localhost:3000/contests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": 1,
    "name": "Test Contest",
    "rules": "acm",
    "start_time": "2024-01-01T10:00:00Z",
    "end_time": "2024-01-01T12:00:00Z",
    "freeze_minutes": 30
  }'
```

View rankings:
```bash
curl http://localhost:3000/contests/1/rankings
```

## Performance Considerations

### Database Indexes
- `organization_id`: Tenant filtering
- `campus_id`: Campus-level filtering
- `start_time`/`end_time`: Time-based queries
- Composite indexes for common query patterns

### Caching Strategy (Future Enhancement)
- Redis cache for rankings (TTL: 5 minutes during active contest)
- Cache invalidation on new submission
- Separate cache for frozen/unfrozen rankings

### Query Optimization
- Use CTEs for complex ranking calculations
- Single query for user's problem submissions
- Efficient sorting with proper indexes

## Security Considerations

### Authentication
- JWT required for all write operations
- Public endpoints (status, rankings) no auth required
- User-scoped registration (can only register self)

### Authorization
- Admin/Teacher: Create/update/delete contests
- Students: Register and view
- Public: View status and rankings

### Data Isolation
- All queries filtered by organization_id
- Campus-level optional filtering
- Tenant-aware at database level

## Future Enhancements

### Phase 3 Potential Features
1. **Virtual Contests**: Allow users to create custom contests from problem archive
2. **Team Contests**: Support for group participation
3. **Contest Clarifications**: Q&A system during contests
4. **Ballot Problems**: Problems with hidden scoring
5. **ICPC Regionals Support**: Advanced rule variations
6. **Contest Templates**: Pre-defined contest configurations
7. **Registration Approval**: Manual approval for private contests
8. **Contest Analytics**: Detailed statistics and visualizations

### Performance Improvements
1. **Materialized View**: Pre-computed rankings refreshed on submissions
2. **WebSocket**: Real-time ranking updates
3. **Ranking Cache Layer**: Redis with intelligent invalidation
4. **Query Result Caching**: Postgres prepared statements

## Dependencies

- **sqlx**: Database queries and migrations
- **axum**: Web framework
- **uuid**: User identification
- **chrono**: DateTime handling
- **serde**: JSON serialization

## Migration Notes

Apply the database migration:
```bash
psql -d online_judge -f migrations/001_create_contests.sql
```

Or run via application (if migration runner implemented):
```bash
cargo run --bin api -- migrate
```

## Troubleshooting

### Common Issues

**Problem**: Rankings return empty
- **Solution**: Ensure submissions are linked to contest via internal API

**Problem**: Cannot register for contest
- **Solution**: Check if already registered (returns 409 Conflict)

**Problem**: Contest status shows "ended" prematurely
- **Solution**: Verify start_time and end_time are in correct timezone (UTC)

**Problem**: Penalties calculated incorrectly
- **Solution**: Ensure all submissions before first AC are counted in attempts

## Conclusion

Phase 2 completes the Contest Management System with full ACM scoring, participant registration, and real-time rankings. The system is production-ready with proper error handling, database constraints, and comprehensive API documentation.

**Next Phase**: Frontend integration for contest UI and user interaction.
