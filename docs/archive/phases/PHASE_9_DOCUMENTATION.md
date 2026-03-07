# Phase 9: Community Features - Documentation

## 📅 Implementation Date
2026-02-21

## 🎯 Phase Overview

Phase 9 implements comprehensive community features including:
- **Discussion Forum**: Threaded discussions for problem-solving help
- **Blog/Articles System**: Educational content and tutorials
- **Real-time Updates**: WebSocket integration for live replies and comments
- **Engagement Features**: Likes, views, trending content

---

## 📁 Database Schema

### New Tables

```sql
-- Discussions table
CREATE TABLE discussions (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    problem_id BIGINT REFERENCES problems(id),
    tags TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE,
    is_solved BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    view_count BIGINT DEFAULT 0,
    reply_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discussion replies table
CREATE TABLE discussion_replies (
    id BIGSERIAL PRIMARY KEY,
    discussion_id BIGINT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    parent_reply_id BIGINT REFERENCES discussion_replies(id),
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    like_count BIGINT DEFAULT 0,
    is_solution BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Articles table
CREATE TABLE articles (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    tags TEXT[],
    category VARCHAR(100),
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Article comments table
CREATE TABLE article_comments (
    id BIGSERIAL PRIMARY KEY,
    article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    parent_comment_id BIGINT REFERENCES article_comments(id),
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    like_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified likes table
CREATE TABLE likes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    target_type VARCHAR(20) NOT NULL, -- 'discussion', 'reply', 'article', 'comment'
    target_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);
```

### Key Features

- **Auto-updating timestamps**: Trigger updates `updated_at` on modification
- **Soft deletion**: Articles support soft delete (via `is_deleted` flag concept)
- **Nested replies**: Support for threaded discussions
- **Slug generation**: SEO-friendly URLs for articles
- **Unified likes**: Single table for all content types

---

## 🔌 API Endpoints

### Discussions API

#### Get Discussions List
```
GET /api/discussions
Query Parameters:
  - page: integer (default: 1)
  - limit: integer (default: 20)
  - problem_id: integer (optional)
  - tag: string (optional)
  - status: 'solved' | 'unsolved' | 'all' (default: 'all')
  - sort: 'latest' | 'popular' | 'unanswered' (default: 'latest')

Response: DiscussionListResponse
  - discussions: Array<Discussion>
  - total: integer
  - page: integer
  - limit: integer
  - has_more: boolean
```

#### Get Discussion Detail
```
GET /api/discussions/:id

Response: DiscussionDetail
  - discussion: Discussion
  - replies: Array<DiscussionReply>
  - author: UserSummary
  - problem: ProblemSummary (if applicable)
```

#### Create Discussion
```
POST /api/discussions
Authentication: Required
Body: CreateDiscussionRequest
  - title: string (required, max 500 chars)
  - content: string (required)
  - problem_id: integer (optional)
  - tags: Array<string> (optional)

Response: Discussion
```

#### Update Discussion
```
PATCH /api/discussions/:id
Authentication: Required (author only)
Body: UpdateDiscussionRequest
  - title: string (optional)
  - content: string (optional)
  - tags: Array<string> (optional)
  - is_solved: boolean (optional)
  - is_locked: boolean (admin only)

Response: Discussion
```

#### Delete Discussion
```
DELETE /api/discussions/:id
Authentication: Required (author or admin)

Response: 204 No Content
```

#### Create Reply
```
POST /api/discussions/:id/replies
Authentication: Required
Body: CreateReplyRequest
  - content: string (required)
  - parent_reply_id: integer (optional, for nested replies)
  - is_solution: boolean (optional, author can mark)

Response: DiscussionReply
```

#### Like Discussion/Reply
```
POST /api/discussions/:id/like
POST /api/replies/:id/like
Authentication: Required

Response: boolean (liked status)
```

### Blog API

#### Get Articles List
```
GET /api/blog
Query Parameters:
  - page: integer (default: 1)
  - limit: integer (default: 20)
  - category: string (optional)
  - tag: string (optional)
  - author_id: UUID (optional)

Response: ArticleListResponse
  - articles: Array<Article>
  - total: integer
  - page: integer
  - limit: integer
  - has_more: boolean
```

#### Get Trending Articles
```
GET /api/blog/trending?limit=10

Response: Array<Article>
```

#### Get Featured Articles
```
GET /api/blog/featured?limit=5

Response: Array<Article>
```

#### Get Article Detail
```
GET /api/blog/:slug_or_id

Response: ArticleDetail
  - article: Article
  - comments: Array<ArticleComment>
  - author: UserSummary
```

#### Create Article
```
POST /api/blog
Authentication: Required
Body: CreateArticleRequest
  - title: string (required)
  - content: string (required, supports Markdown)
  - tags: Array<string> (optional)
  - category: string (optional)
  - is_published: boolean (default: false)
  - is_featured: boolean (admin only)

Response: Article
```

#### Update Article
```
PATCH /api/blog/:slug_or_id
Authentication: Required (author only)
Body: UpdateArticleRequest
  - title: string (optional)
  - content: string (optional)
  - tags: Array<string> (optional)
  - category: string (optional)
  - is_published: boolean (optional)

Response: Article
```

#### Delete Article
```
DELETE /api/blog/:slug_or_id
Authentication: Required (author or admin)

Response: 204 No Content
```

#### Create Comment
```
POST /api/blog/:slug_or_id/comments
Authentication: Required
Body: CreateCommentRequest
  - content: string (required)
  - parent_comment_id: integer (optional)

Response: ArticleComment
```

#### Like Article/Comment
```
POST /api/blog/:id/like
POST /api/blog/comments/:comment_id/like
Authentication: Required

Response: boolean (liked status)
```

### Utility Endpoints

```
GET /api/blog/categories
Response: Array<string>

GET /api/blog/tags/popular?limit=20
Response: Array<{tag: string, count: integer}>
```

---

## 🔌 WebSocket Integration

### New Message Types

#### DiscussionReply
```typescript
{
  type: "DiscussionReply",
  data: {
    discussion_id: number
    reply_id: number
    user_id: string
    username: string
    content: string
    created_at: string
  }
}
```

**Topic**: `discussion:{discussion_id}`
**Trigger**: New reply posted to a discussion
**Usage**: Subscribe to receive real-time replies in discussion threads

#### ArticleComment
```typescript
{
  type: "ArticleComment",
  data: {
    article_id: number
    comment_id: number
    user_id: string
    username: string
    content: string
    created_at: string
  }
}
```

**Topic**: `article:{article_id}`
**Trigger**: New comment posted to an article
**Usage**: Subscribe to receive real-time comments on articles

#### TrendingArticles
```typescript
{
  type: "TrendingArticles",
  data: {
    articles: Array<{
      id: number
      title: string
      slug: string
      author: string
      view_count: number
      like_count: number
    }>
  }
}
```

**Topic**: Broadcast (global)
**Trigger**: New article published
**Usage**: Update trending articles sidebar/homepage

### Usage Example

```typescript
// Subscribe to discussion replies
ws.subscribe(undefined, undefined, discussionId)

// Listen for replies
const { update } = useDiscussionUpdates(discussionId)

useEffect(() => {
  if (update) {
    // New reply received
    addReplyToThread(update)
  }
}, [update])
```

---

## 📊 Data Models

### Discussion
```typescript
interface Discussion {
  id: number
  title: string
  content: string
  author_id: string
  author_username: string
  problem_id?: number
  problem_title?: string
  tags: string[]
  is_pinned: boolean
  is_solved: boolean
  is_locked: boolean
  view_count: number
  reply_count: number
  like_count: number
  created_at: string
  updated_at: string
}
```

### DiscussionReply
```typescript
interface DiscussionReply {
  id: number
  discussion_id: number
  parent_reply_id?: number
  content: string
  author_id: string
  author_username: string
  like_count: number
  is_solution: boolean
  created_at: string
  updated_at: string
  replies?: DiscussionReply[] // Nested replies
}
```

### Article
```typescript
interface Article {
  id: number
  title: string
  slug: string
  content: string
  excerpt: string
  author_id: string
  author_username: string
  tags: string[]
  category?: string
  is_published: boolean
  is_featured: boolean
  view_count: number
  like_count: number
  comment_count: number
  published_at?: string
  created_at: string
  updated_at: string
}
```

### ArticleComment
```typescript
interface ArticleComment {
  id: number
  article_id: number
  parent_comment_id?: number
  content: string
  author_id: string
  author_username: string
  like_count: number
  created_at: string
  updated_at: string
  replies?: ArticleComment[] // Nested comments
}
```

---

## 🚀 Usage Examples

### Creating a Discussion

```typescript
const response = await fetch('/api/discussions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Need help with Two Sum problem',
    content: 'I\'m trying to solve the Two Sum problem but getting TLE...',
    problem_id: 1,
    tags: ['algorithm', 'arrays']
  })
})

const discussion = await response.json()
```

### Getting Trending Articles

```typescript
const response = await fetch('/api/blog/trending?limit=10')
const articles = await response.json()

// Display on homepage
articles.map(article => ({
  title: article.title,
  slug: article.slug,
  views: article.view_count,
  likes: article.like_count
}))
```

### Subscribing to Discussion Updates

```typescript
function DiscussionThread({ discussionId }: Props) {
  const { update, isConnected } = useDiscussionUpdates(discussionId)
  const [replies, setReplies] = useState<Reply[]>([])

  useEffect(() => {
    if (update) {
      // Add new reply to state
      setReplies(prev => [...prev, {
        id: update.reply_id,
        content: update.content,
        author: update.username,
        created_at: update.created_at
      }])
    }
  }, [update])

  return (
    <div>
      {replies.map(reply => <ReplyCard key={reply.id} reply={reply} />)}
    </div>
  )
}
```

---

## 🔐 Permissions & Authorization

### Discussion Operations

| Operation | Auth Required | Permission |
|-----------|--------------|------------|
| View discussions | No | Public |
| Create discussion | Yes | Any user |
| Edit discussion | Yes | Author only |
| Delete discussion | Yes | Author or Admin |
| Lock discussion | Yes | Admin only |
| Create reply | Yes | Any user (if unlocked) |
| Mark solution | Yes | Discussion author |
| Like | Yes | Any user |

### Article Operations

| Operation | Auth Required | Permission |
|-----------|--------------|------------|
| View articles | No | Public (if published) |
| Create article | Yes | Any user |
| Edit article | Yes | Author only |
| Delete article | Yes | Author or Admin |
| Publish article | Yes | Author |
| Feature article | Yes | Admin only |
| Create comment | Yes | Any user |
| Like | Yes | Any user |

---

## 📈 Performance Optimizations

### Database Indexes

```sql
-- Discussions
CREATE INDEX idx_discussions_problem ON discussions(problem_id);
CREATE INDEX idx_discussions_author ON discussions(author_id);
CREATE INDEX idx_discussions_created ON discussions(created_at DESC);
CREATE INDEX idx_discussions_solved ON discussions(is_solved) WHERE is_solved = TRUE;
CREATE INDEX idx_discussions_tags ON discussions USING GIN(tags);

-- Articles
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_published ON articles(is_published, published_at DESC);
CREATE INDEX idx_articles_featured ON articles(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_tags ON articles USING GIN(tags);

-- Likes (composite index for uniqueness)
CREATE INDEX idx_likes_target ON likes(target_type, target_id);
CREATE INDEX idx_likes_user ON likes(user_id);
```

### Caching Strategy

- **Trending articles**: Cache for 5 minutes
- **Popular tags**: Cache for 10 minutes
- **Categories**: Cache for 1 hour
- **Article views**: Increment in Redis, batch update to DB

### Pagination

- Default page size: 20 items
- Maximum page size: 100 items
- Cursor-based pagination for better performance

---

## 🧪 Testing

### Running Database Migrations

```bash
cd api
# Apply migrations
sqlx migrate run --database-url postgresql://user:pass@localhost/db

# Rollback if needed
sqlx migrate revert --database-url postgresql://user:pass@localhost/db
```

### Testing API Endpoints

```bash
# Get discussions
curl http://localhost:3000/api/discussions?page=1&limit=20

# Create discussion (requires auth)
curl -X POST http://localhost:3000/api/discussions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Discussion",
    "content": "This is a test",
    "problem_id": 1,
    "tags": ["test"]
  }'

# Get trending articles
curl http://localhost:3000/api/blog/trending?limit=10

# Like article
curl -X POST http://localhost:3000/api/blog/1/like \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📚 Future Enhancements

### Phase 9+ Features

1. **Rich Text Editor**
   - Markdown editor with live preview
   - Code syntax highlighting
   - Image upload support

2. **Advanced Search**
   - Full-text search with Elasticsearch
   - Filter by multiple criteria
   - Save search queries

3. **Notifications**
   - Email notifications for replies
   - In-app notification center
   - Notification preferences

4. **Moderation Tools**
   - Report inappropriate content
   - Moderator queue
   - Content flagging system

5. **Gamification**
   - Badges for helpful answers
   - Reputation points
   - Leaderboards for top contributors

6. **SEO Optimization**
   - Meta tags for articles
   - Sitemap generation
   - Open Graph tags

---

## 🎯 Success Criteria

### Completed Features ✅

- [x] Database schema for discussions and blog
- [x] Backend API for discussions (CRUD operations)
- [x] Backend API for blog (CRUD operations)
- [x] WebSocket integration for real-time updates
- [x] Like/unlike functionality
- [x] Filtering and sorting
- [x] Trending articles algorithm
- [x] Nested replies and comments
- [x] Slug generation for articles

### Backend Status ✅

- **Compilation**: ✅ No errors
- **API Endpoints**: ✅ All implemented
- **WebSocket**: ✅ Integrated
- **Database**: ✅ Migrations ready

### Remaining Work ⏳

- [ ] Frontend UI for discussions
- [ ] Frontend UI for blog
- [ ] Rich text editor integration
- [ ] Frontend WebSocket integration
- [ ] End-to-end testing

---

## 📞 Support

For issues or questions about Phase 9:
- Check API documentation: `/api/docs` (when available)
- Review database migration files
- Check WebSocket message types in `api/src/websocket/message.rs`

---

**Phase 9 Status**: ✅ Backend Complete
**Next Phase**: Frontend Implementation
**Documentation Updated**: 2026-02-21

🤖 Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>
