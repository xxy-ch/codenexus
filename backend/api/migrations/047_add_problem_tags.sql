ALTER TABLE problems
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_problems_tags
    ON problems USING GIN(tags);
