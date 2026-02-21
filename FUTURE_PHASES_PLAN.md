# 后续 Phase 规划

## 📅 当前状态
- **已完成**: Phase 1-8 (100%)
- **项目状态**: ✅ 生产就绪
- **最后更新**: 2026-02-21

---

## 🎯 Phase 9: 社区功能 API

### 目标
实现完整的社区交互功能,增强用户粘性和学习体验。

### 后端 API

#### 讨论区模块
**文件**: `api/src/discussions/`

```rust
// 数据模型
pub struct Discussion {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub author_id: Uuid,
    pub problem_id: Option<i64>,
    pub contest_id: Option<i64>,
    pub tags: Vec<String>,
    pub is_pinned: bool,
    pub is_solved: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub reply_count: i64,
    pub view_count: i64,
    pub like_count: i64,
}

pub struct Reply {
    pub id: i64,
    pub discussion_id: i64,
    pub content: String,
    pub author_id: Uuid,
    pub parent_id: Option<i64>,  // 支持嵌套回复
    pub created_at: DateTime<Utc>,
    pub like_count: i64,
}
```

**API 端点**:
```
GET    /discussions                    - 获取讨论列表
POST   /discussions                    - 创建讨论
GET    /discussions/:id                - 获取讨论详情
PATCH  /discussions/:id                - 更新讨论
DELETE /discussions/:id                - 删除讨论
POST   /discussions/:id/reply          - 回复讨论
GET    /discussions/:id/replies        - 获取回复列表
POST   /discussions/:id/like           - 点赞讨论
POST   /replies/:id/like               - 点赞回复
GET    /problems/:id/discussions       - 题目相关讨论
GET    /contests/:id/discussions       - 竞赛相关讨论
```

#### 博客/文章模块
**文件**: `api/src/blog/`

```rust
pub struct Article {
    pub id: i64,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub summary: String,
    pub cover_image: Option<String>,
    pub author_id: Uuid,
    pub tags: Vec<String>,
    pub category: String,
    pub is_published: bool,
    pub is_featured: bool,
    pub view_count: i64,
    pub like_count: i64,
    pub comment_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
}

pub struct ArticleComment {
    pub id: i64,
    pub article_id: i64,
    pub content: String,
    pub author_id: Uuid,
    pub parent_id: Option<i64>,
    pub created_at: DateTime<Utc>,
}
```

**API 端点**:
```
GET    /articles                       - 文章列表
POST   /articles                       - 创建文章
GET    /articles/:id                   - 文章详情
GET    /articles/:slug/:slug           - 通过slug获取文章
PATCH  /articles/:id                   - 更新文章
DELETE /articles/:id                   - 删除文章
POST   /articles/:id/like              - 点赞文章
GET    /articles/:id/comments          - 获取评论
POST   /articles/:id/comments          - 发表评论
GET    /articles/categories            - 文章分类
GET    /articles/tags                  - 热门标签
GET    /articles/trending              - 热门文章
GET    /articles/featured              - 精选文章
```

### WebSocket 集成

**实时更新**:
```rust
// 新消息类型
pub enum WebSocketMessage {
    // ... 现有消息

    /// 新讨论通知
    NewDiscussion {
        discussion_id: i64,
        title: String,
        author: String,
    },

    /// 新回复通知
    NewReply {
        discussion_id: i64,
        reply_id: i64,
        author: String,
        content_preview: String,
    },

    /// 新文章通知
    NewArticle {
        article_id: i64,
        title: String,
        author: String,
    },

    /// 新评论通知
    NewComment {
        article_id: i64,
        comment_id: i64,
        author: String,
    },

    /// 讨论热度更新
    DiscussionTrending {
        discussion_id: i64,
        view_count: i64,
        reply_count: i64,
    },
}
```

### 前端实现

**新增页面**:
```
frontend/src/pages/
├── user/
│   ├── Discussions.tsx          (已存在,需增强)
│   ├── DiscussionDetail.tsx     (新建)
│   ├── NewDiscussion.tsx        (新建)
│   ├── Blog.tsx                 (已存在,需增强)
│   ├── BlogDetail.tsx           (已存在,需增强)
│   ├── NewArticle.tsx           (新建)
│   └── EditArticle.tsx          (新建)
```

**组件**:
```
frontend/src/components/discussions/
├── DiscussionList.tsx
├── DiscussionCard.tsx
├── DiscussionEditor.tsx
├── ReplyList.tsx
├── ReplyItem.tsx
└── DiscussionTags.tsx

frontend/src/components/blog/
├── ArticleCard.tsx
├── ArticleEditor.tsx
├── ArticleList.tsx
├── CommentList.tsx
└── TagCloud.tsx
```

**Hooks**:
```typescript
// hooks/useDiscussions.ts
export function useDiscussions(filters?: DiscussionFilters) {
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(false)
  // ...

  return { discussions, loading, createDiscussion, reply, like }
}

// hooks/useBlog.ts
export function useArticles() {
  // ...
}

// hooks/useRealtimeDiscussions.ts
export function useDiscussionUpdates(discussionId?: number) {
  const { update } = useWebSocket()

  useEffect(() => {
    // 订阅讨论更新
    if (discussionId) {
      subscribe(undefined, undefined)
    }
  }, [discussionId])
}
```

### 数据库迁移

```sql
-- 讨论表
CREATE TABLE discussions (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    problem_id BIGINT REFERENCES problems(id),
    contest_id BIGINT REFERENCES contests(id),
    tags TEXT[] DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_solved BOOLEAN DEFAULT FALSE,
    view_count BIGINT DEFAULT 0,
    reply_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 回复表
CREATE TABLE discussion_replies (
    id BIGSERIAL PRIMARY KEY,
    discussion_id BIGINT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES discussion_replies(id),
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    like_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文章表
CREATE TABLE articles (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    cover_image VARCHAR(500),
    author_id UUID NOT NULL REFERENCES users(id),
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(100),
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- 文章评论表
CREATE TABLE article_comments (
    id BIGSERIAL PRIMARY KEY,
    article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES article_comments(id),
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 点赞记录表
CREATE TABLE likes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    target_type VARCHAR(50) NOT NULL, -- 'discussion', 'reply', 'article', 'comment'
    target_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

-- 索引
CREATE INDEX idx_discussions_problem ON discussions(problem_id);
CREATE INDEX idx_discussions_author ON discussions(author_id);
CREATE INDEX idx_discussions_tags ON discussions USING GIN(tags);
CREATE INDEX idx_replies_discussion ON discussion_replies(discussion_id);
CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX idx_likes_target ON likes(target_type, target_id);
```

### 预计工作量
- **后端**: 3-4 天
- **前端**: 3-4 天
- **测试**: 1-2 天
- **总计**: 7-10 天

---

## 🎯 Phase 10: 消息系统

### 目标
实现用户间的直接消息和实时聊天功能。

### 后端 API

**文件**: `api/src/messages/`

```rust
pub struct Conversation {
    pub id: i64,
    pub participants: Vec<Uuid>,
    pub type: ConversationType, // 'direct', 'group'
    pub title: Option<String>,
    pub created_by: Uuid,
    pub last_message_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

pub struct Message {
    pub id: i64,
    pub conversation_id: i64,
    pub sender_id: Uuid,
    pub content: String,
    pub message_type: MessageType, // 'text', 'image', 'file', 'system'
    pub attachments: Vec<Attachment>,
    pub is_deleted: bool,
    pub created_at: DateTime<Utc>,
    pub read_by: Vec<Uuid>,
}
```

**API 端点**:
```
GET    /conversations                 - 获取会话列表
POST   /conversations                 - 创建会话
GET    /conversations/:id             - 获取会话详情
PATCH  /conversations/:id             - 更新会话
DELETE /conversations/:id             - 删除会话
GET    /conversations/:id/messages    - 获取消息历史
POST   /conversations/:id/messages    - 发送消息
PATCH  /conversations/:id/read        - 标记已读
GET    /conversations/:id/typing      - 获取正在输入的用户
POST   /conversations/:id/typing      - 发送输入状态
GET    /messages/unread               - 未读消息统计
```

### WebSocket 聊天

**实时消息**:
```rust
pub enum WebSocketMessage {
    // ... 现有消息

    /// 新聊天消息
    ChatMessage {
        id: i64,
        conversation_id: i64,
        sender_id: Uuid,
        sender_name: String,
        content: String,
        timestamp: DateTime<Utc>,
    },

    /// 输入指示器
    TypingIndicator {
        conversation_id: i64,
        user_id: Uuid,
        user_name: String,
        is_typing: bool,
    },

    /// 消息已读回执
    MessageRead {
        conversation_id: i64,
        message_id: i64,
        read_by: Uuid,
        read_at: DateTime<Utc>,
    },

    /// 用户上线/下线
    UserOnlineStatus {
        user_id: Uuid,
        status: String, // 'online', 'offline', 'away'
    },

    /// 未读消息数更新
    UnreadCountUpdate {
        conversation_id: i64,
        count: i64,
    },
}
```

### 前端实现

**新增页面**:
```
frontend/src/pages/
├── user/
│   ├── Messages.tsx             - 消息列表页
│   ├── Conversation.tsx         - 会话详情页
│   └── NewConversation.tsx      - 创建会话
```

**组件**:
```
frontend/src/components/chat/
├── MessageList.tsx              - 消息列表
├── MessageItem.tsx              - 单条消息
├── MessageInput.tsx             - 输入框
├── TypingIndicator.tsx          - 输入指示器
├── OnlineStatus.tsx             - 在线状态
├── ConversationPreview.tsx      - 会话预览
└── MessageAttachments.tsx       - 附件处理
```

**Hooks**:
```typescript
// hooks/useMessages.ts
export function useMessages(conversationId: number) {
  const [messages, setMessages] = useState<Message[]>([])

  // WebSocket 实时接收
  const { update } = useWebSocket()

  useEffect(() => {
    if (update?.type === 'ChatMessage') {
      setMessages(prev => [...prev, update])
    }
  }, [update])

  return { messages, sendMessage, markAsRead }
}

// hooks/useTypingIndicator.ts
export function useTypingIndicator(conversationId: number) {
  const [typingUsers, setTypingUsers] = useState<Set<Uuid>>(new Set())

  const startTyping = () => {
    // 发送 typing 消息
  }

  return { typingUsers, startTyping, stopTyping }
}
```

### 数据库迁移

```sql
-- 会话表
CREATE TABLE conversations (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL, -- 'direct', 'group'
    title VARCHAR(200),
    created_by UUID REFERENCES users(id),
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 会话参与者
CREATE TABLE conversation_participants (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    UNIQUE(conversation_id, user_id)
);

-- 消息表
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    attachments JSONB DEFAULT '[]',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 消息已读记录
CREATE TABLE message_reads (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- 在线状态表 (使用Redis缓存)
-- user:online:{user_id} -> TTL 5分钟
```

### 预计工作量
- **后端**: 3-4 天
- **前端**: 4-5 天
- **测试**: 1-2 天
- **总计**: 8-11 天

---

## 🎯 Phase 11: 高级功能

### 11.1 代码协作功能

#### 功能点
- 代码分享
- 代码片段保存
- 公共代码库
- 代码版本历史

#### API 端点
```
GET    /snippets                      - 代码片段列表
POST   /snippets                      - 创建代码片段
GET    /snippets/:id                  - 片段详情
PATCH  /snippets/:id                  - 更新片段
DELETE /snippets/:id                  - 删除片段
POST   /snippets/:id/fork             - 复制片段
GET    /snippets/public               - 公共片段
```

### 11.2 团队功能

#### 功能点
- 创建团队
- 邀请成员
- 团队题目集
- 团队竞赛
- 团队统计

#### API 端点
```
GET    /teams                         - 团队列表
POST   /teams                         - 创建团队
GET    /teams/:id                     - 团队详情
PATCH  /teams/:id                     - 更新团队
DELETE /teams/:id                     - 删除团队
POST   /teams/:id/members             - 添加成员
DELETE /teams/:id/members/:uid        - 移除成员
GET    /teams/:id/stats               - 团队统计
```

### 11.3 学习路径

#### 功能点
- 推荐学习路径
- 难度递进
- 技能树
- 学习进度跟踪
- 成就系统

#### API 端点
```
GET    /learning-paths                - 学习路径列表
GET    /learning-paths/:id            - 路径详情
GET    /learning-paths/:id/progress   - 学习进度
POST   /learning-paths/:id/complete   - 完成课程
GET    /achievements                  - 成就列表
GET    /achievements/unlocked         - 已解锁成就
POST   /achievements/:id/unlock       - 解锁成就
```

### 预计工作量
- **后端**: 5-7 天
- **前端**: 5-7 天
- **测试**: 2-3 天
- **总计**: 12-17 天

---

## 🎯 Phase 12: 性能优化

### 12.1 缓存优化

#### Redis 缓存策略
```rust
// 热门题目缓存
CACHE problems:hot: TTL 1h

// 排行榜缓存
CACHE leaderboard:global TTL 5min

// 用户会话缓存
CACHE session:{user_id} TTL 24h

// 题目统计缓存
CACHE stats:problem:{id} TTL 10min
```

### 12.2 数据库优化

#### 查询优化
- 添加复合索引
- 优化 JOIN 查询
- 使用数据库连接池
- 读写分离

#### 分页优化
- 使用游标分页
- 预加载策略
- 懒加载优化

### 12.3 前端优化

#### 性能优化
- 代码分割
- 懒加载
- 虚拟列表 (长列表)
- 图片优化
- CDN 集成

#### 打包优化
- Tree shaking
- 压缩优化
- 缓存策略

### 预计工作量
- **后端优化**: 3-4 天
- **前端优化**: 2-3 天
- **性能测试**: 2-3 天
- **总计**: 7-10 天

---

## 🎯 Phase 13: 监控和分析

### 13.1 系统监控

#### 功能点
- API 性能监控
- 错误追踪
- 日志聚合
- 告警系统

#### 工具集成
- Prometheus + Grafana
- Sentry (错误追踪)
- ELK Stack (日志)

### 13.2 用户分析

#### 功能点
- 用户行为追踪
- A/B 测试
- 转化漏斗
- 留存分析

#### 数据收集
```typescript
// 前端埋点
analytics.track('problem_solved', {
  problem_id: 123,
  time_spent: 1200,
  attempts: 3,
})
```

### 预计工作量
- **监控集成**: 3-4 天
- **分析实现**: 3-4 天
- **仪表板**: 2-3 天
- **总计**: 8-11 天

---

## 🎯 Phase 14: 移动端支持

### 14.1 响应式优化

#### 功能点
- 移动端适配
- 触摸优化
- PWA 支持
- 离线功能

### 14.2 移动应用

#### 技术选型
- React Native / Flutter
- 或 Progressive Web App

#### 功能
- 原生推送通知
- 生物识别登录
- 离线提交
- 代码编辑器适配

### 预计工作量
- **响应式优化**: 2-3 天
- **PWA 实现**: 3-4 天
- **移动应用**: 15-20 天
- **总计**: 20-27 天

---

## 📊 Phase 优先级建议

### 🔴 高优先级 (推荐优先)
1. **Phase 9**: 社区功能 - 增强用户粘性
2. **Phase 10**: 消息系统 - 提升互动体验
3. **Phase 12**: 性能优化 - 确保系统稳定

### 🟡 中优先级
4. **Phase 11**: 高级功能 - 扩展系统能力
5. **Phase 13**: 监控分析 - 运维支持

### 🟢 低优先级
6. **Phase 14**: 移动端 - 长期规划

---

## 🗓️ 建议实施顺序

### 短期 (1-2个月)
1. ✅ Phase 9: 社区功能
2. ✅ Phase 10: 消息系统

### 中期 (2-3个月)
3. Phase 12: 性能优化
4. Phase 11: 高级功能

### 长期 (3-6个月)
5. Phase 13: 监控分析
6. Phase 14: 移动端支持

---

## 🎯 下一步行动

### 立即开始
**推荐**: Phase 9 - 社区功能 API

**原因**:
- 用户需求强烈
- 技术难度适中
- 与现有功能互补
- 易于看到效果

### 开始步骤
1. 创建数据库迁移文件
2. 实现后端 API
3. 前端页面开发
4. WebSocket 集成
5. 测试和部署

---

**规划日期**: 2026-02-21
**规划人员**: Claude Code + Happy
**项目状态**: Phase 1-8 完成,Phase 9-14 规划中

🤖 Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)
