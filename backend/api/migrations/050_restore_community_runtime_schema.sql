-- Restore community runtime tables/columns that were previously placed in
-- date-prefixed migration files. sqlx only applied the numeric migrations in
-- this project, so production databases missed these schema changes.

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    discussion_id BIGINT REFERENCES discussions(id) ON DELETE CASCADE,
    article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE,
    comment_id BIGINT REFERENCES discussion_replies(id) ON DELETE CASCADE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS notification_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    reply_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    comment_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    like_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    mention_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    system_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    digest_mode VARCHAR(20) NOT NULL DEFAULT 'immediate',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS notification_settings_updated_at ON notification_settings;
CREATE TRIGGER notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE direct_conversations ADD COLUMN IF NOT EXISTS organization_id BIGINT;

UPDATE direct_conversations c
SET organization_id = u.organization_id
FROM users u
WHERE c.user1_id = u.id AND c.organization_id IS NULL;

ALTER TABLE direct_conversations ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE direct_conversations
    DROP CONSTRAINT IF EXISTS fk_direct_conversations_organization;
ALTER TABLE direct_conversations
    ADD CONSTRAINT fk_direct_conversations_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_direct_conversations_organization
    ON direct_conversations(organization_id);

ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS organization_id BIGINT;

UPDATE direct_messages m
SET organization_id = c.organization_id
FROM direct_conversations c
WHERE m.conversation_id = c.id AND m.organization_id IS NULL;

ALTER TABLE direct_messages ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE direct_messages
    DROP CONSTRAINT IF EXISTS fk_direct_messages_organization;
ALTER TABLE direct_messages
    ADD CONSTRAINT fk_direct_messages_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_direct_messages_organization
    ON direct_messages(organization_id);
