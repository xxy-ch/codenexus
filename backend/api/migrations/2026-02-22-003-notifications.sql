-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'reply', 'comment', 'like', 'system', 'mention'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    link VARCHAR(500), -- URL to navigate when clicked
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Optional foreign keys (nullable for system notifications)
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL, -- User who triggered the notification
    discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE,

    -- Metadata for extensibility
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Notification settings table (user preferences)
CREATE TABLE IF NOT EXISTS notification_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    reply_notifications BOOLEAN DEFAULT TRUE,
    comment_notifications BOOLEAN DEFAULT TRUE,
    like_notifications BOOLEAN DEFAULT TRUE,
    mention_notifications BOOLEAN DEFAULT TRUE,
    system_notifications BOOLEAN DEFAULT TRUE,
    digest_mode VARCHAR(20) DEFAULT 'immediate', -- 'immediate', 'hourly', 'daily'
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notification_settings
CREATE TRIGGER notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_settings_updated_at();

-- Comments table for discussions and articles
CREATE TABLE IF NOT EXISTS discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE, -- For nested replies
    votes_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discussion_replies_discussion_id ON discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_user_id ON discussion_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_parent_id ON discussion_replies(parent_id);

-- Add votes column to discussions if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'discussions' AND column_name = 'votes_count'
    ) THEN
        ALTER TABLE discussions ADD COLUMN votes_count INT DEFAULT 0;
    END IF;
END $$;

-- Articles table (blog posts)
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'school', 'campus', 'private'
    is_featured BOOLEAN DEFAULT FALSE,
    views_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    keywords TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_articles_visibility ON articles(visibility);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- Comments for articles (can reuse discussion_replies or create separate table)
-- For now, let's create a separate table for article comments
CREATE TABLE IF NOT EXISTS article_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES article_comments(id) ON DELETE CASCADE, -- For nested replies
    votes_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_comments_article_id ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_user_id ON article_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent_id ON article_comments(parent_id);
