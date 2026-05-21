-- Add organization_id to community tables for tenant isolation
-- Backfills from author's organization_id to ensure data consistency

-- 1. Discussions: add organization_id column
ALTER TABLE discussions ADD COLUMN IF NOT EXISTS organization_id BIGINT;

-- Backfill from author's organization
UPDATE discussions d
SET organization_id = u.organization_id
FROM users u
WHERE d.author_id = u.id AND d.organization_id IS NULL;

-- Make NOT NULL after backfill (safe because all discussions have authors)
ALTER TABLE discussions ALTER COLUMN organization_id SET NOT NULL;

-- Add foreign key and index
ALTER TABLE discussions ADD CONSTRAINT fk_discussions_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_discussions_organization ON discussions(organization_id);

-- 2. Articles (blog): add organization_id column
ALTER TABLE articles ADD COLUMN IF NOT EXISTS organization_id BIGINT;

-- Backfill from author's organization
UPDATE articles a
SET organization_id = u.organization_id
FROM users u
WHERE a.author_id = u.id AND a.organization_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE articles ALTER COLUMN organization_id SET NOT NULL;

-- Add foreign key and index
ALTER TABLE articles ADD CONSTRAINT fk_articles_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_articles_organization ON articles(organization_id);

-- 3. Article comments: add organization_id for consistent filtering
ALTER TABLE article_comments ADD COLUMN IF NOT EXISTS organization_id BIGINT;

-- Backfill from article's organization
UPDATE article_comments ac
SET organization_id = a.organization_id
FROM articles a
WHERE ac.article_id = a.id AND ac.organization_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE article_comments ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE article_comments ADD CONSTRAINT fk_article_comments_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_article_comments_organization ON article_comments(organization_id);

-- 4. Discussion replies: add organization_id for consistent filtering
ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS organization_id BIGINT;

-- Backfill from parent discussion's organization
UPDATE discussion_replies dr
SET organization_id = d.organization_id
FROM discussions d
WHERE dr.discussion_id = d.id AND dr.organization_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE discussion_replies ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE discussion_replies ADD CONSTRAINT fk_discussion_replies_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_discussion_replies_organization ON discussion_replies(organization_id);
