-- Create problems table
-- Problems exist within tenant context

CREATE TABLE problems (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campus_id BIGINT REFERENCES campuses(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'campus', 'class', 'private')),
    time_limit_ms INTEGER NOT NULL DEFAULT 1000,
    memory_limit_kb INTEGER NOT NULL DEFAULT 256000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for tenant queries (organization_id)
CREATE INDEX idx_problems_organization_id ON problems(organization_id);

-- Index for campus queries
CREATE INDEX idx_problems_campus_id ON problems(campus_id);

-- Index for author queries
CREATE INDEX idx_problems_author_id ON problems(author_id);

-- Index for visibility filtering
CREATE INDEX idx_problems_visibility ON problems(organization_id, visibility);

-- Index for difficulty filtering
CREATE INDEX idx_problems_difficulty ON problems(organization_id, difficulty);

-- Add check constraint: if campus_id is set, campus must belong to organization
ALTER TABLE problems
ADD CONSTRAINT fk_problems_campus_organization
FOREIGN KEY (campus_id, organization_id)
REFERENCES campuses(id, organization_id)
ON DELETE CASCADE;

-- Add trigger for updated_at
CREATE TRIGGER update_problems_updated_at
    BEFORE UPDATE ON problems
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
