-- Create full-text search indexes for community features
-- Migration: 2026-02-22-002

-- Full-text search index for discussions
CREATE INDEX IF NOT EXISTS discussions_content_search
ON discussions
USING GIN (to_tsvector('english', title || ' ' || content));

-- Full-text search index for articles
CREATE INDEX IF NOT EXISTS articles_content_search
ON articles
USING GIN (to_tsvector('english', title || ' ' || content));

-- Index for tags search (for filtering)
CREATE INDEX IF NOT EXISTS discussions_tags_gin_idx
ON discussions USING GIN (tags);

CREATE INDEX IF NOT EXISTS articles_tags_gin_idx
ON articles USING GIN (tags);

-- Index for categories
CREATE INDEX IF NOT EXISTS articles_category_idx
ON articles(category);

-- Composite index for search + sorting
CREATE INDEX IF NOT EXISTS discussions_created_idx
ON discussions(created_at DESC);

CREATE INDEX IF NOT EXISTS articles_published_idx
ON articles(published_at DESC NULLS LAST)
WHERE is_published = true;

-- Index for problem_id in discussions
CREATE INDEX IF NOT EXISTS discussions_problem_id_idx
ON discussions(problem_id)
WHERE problem_id IS NOT NULL;

-- Index for author_id (for user content search)
CREATE INDEX IF NOT EXISTS discussions_author_idx
ON discussions(author_id);
CREATE INDEX IF NOT EXISTS articles_author_idx
ON articles(author_id);
