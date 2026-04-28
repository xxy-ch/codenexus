-- Phase 9: Community Features - Discussions and Blog
-- Migration for community features

-- Discussions table
CREATE TABLE IF NOT EXISTS discussions (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id BIGINT REFERENCES problems(id) ON DELETE SET NULL,
    contest_id BIGINT REFERENCES contests(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
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
CREATE TABLE IF NOT EXISTS discussion_replies (
    id BIGSERIAL PRIMARY KEY,
    discussion_id BIGINT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES discussion_replies(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    like_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Articles/Blog table
CREATE TABLE IF NOT EXISTS articles (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    cover_image VARCHAR(500),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(100) DEFAULT 'general',
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Article comments table
CREATE TABLE IF NOT EXISTS article_comments (
    id BIGSERIAL PRIMARY KEY,
    article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES article_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes table (unified for all content types)
CREATE TABLE IF NOT EXISTS likes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL, -- 'discussion', 'reply', 'article', 'comment'
    target_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

-- Indexes for discussions
CREATE INDEX IF NOT EXISTS idx_discussions_author ON discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_discussions_problem ON discussions(problem_id);
CREATE INDEX IF NOT EXISTS idx_discussions_contest ON discussions(contest_id);
CREATE INDEX IF NOT EXISTS idx_discussions_tags ON discussions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_discussions_created ON discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_pinned ON discussions(is_pinned, created_at DESC);

-- Indexes for replies
CREATE INDEX IF NOT EXISTS idx_replies_discussion ON discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_replies_parent ON discussion_replies(parent_id);
CREATE INDEX IF NOT EXISTS idx_replies_author ON discussion_replies(author_id);

-- Indexes for articles
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(is_featured, published_at DESC);

-- Indexes for article comments
CREATE INDEX IF NOT EXISTS idx_article_comments_article ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent ON article_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_author ON article_comments(author_id);

-- Indexes for likes
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON discussions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_replies_updated_at BEFORE UPDATE ON discussion_replies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_article_comments_updated_at BEFORE UPDATE ON article_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
