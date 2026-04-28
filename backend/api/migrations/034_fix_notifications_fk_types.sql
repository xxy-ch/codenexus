-- Fix notifications FK types: UUID → BIGINT to match actual PK types
-- discussions.id, articles.id, discussion_replies.id are BIGSERIAL (see migrations 015, 022)

-- Only apply if notifications table exists and has UUID-typed FK columns
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'discussion_id'
        AND udt_name = 'uuid'
    ) THEN
        ALTER TABLE notifications
            ALTER COLUMN discussion_id TYPE BIGINT USING discussion_id::BIGINT,
            ALTER COLUMN article_id TYPE BIGINT USING article_id::BIGINT,
            ALTER COLUMN comment_id TYPE BIGINT USING comment_id::BIGINT;
    END IF;
END $$;
