-- Align the legacy discussions table with the runtime service and demo data.
-- The earlier 015 migration created a smaller legacy shape; this migration
-- keeps that data reachable while adding the fields the API now expects.

ALTER TABLE discussions
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS contest_id BIGINT REFERENCES contests(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS is_solved BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS view_count BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reply_count BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS like_count BIGINT NOT NULL DEFAULT 0;

ALTER TABLE discussions
    ALTER COLUMN problem_id DROP NOT NULL;

ALTER TABLE discussions
    ALTER COLUMN user_id DROP NOT NULL;

UPDATE discussions
SET
    author_id = COALESCE(author_id, user_id),
    title = COALESCE(NULLIF(title, ''), LEFT(content, 120), 'Discussion')
WHERE author_id IS NULL
   OR title IS NULL
   OR title = '';

ALTER TABLE discussions
    ALTER COLUMN title SET NOT NULL,
    ALTER COLUMN author_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discussions_author_id
    ON discussions(author_id);

CREATE INDEX IF NOT EXISTS idx_discussions_contest_id
    ON discussions(contest_id);

CREATE INDEX IF NOT EXISTS idx_discussions_tags
    ON discussions USING GIN(tags);
