-- Create discussions table
-- Discussions are linked to problems

CREATE TABLE discussions (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES discussions(id) ON DELETE CASCADE,  -- For nested replies (or use separate table)
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for problem queries (discussions for a problem)
CREATE INDEX idx_discussions_problem_id ON discussions(problem_id);

-- Index for user queries (user's discussions)
CREATE INDEX idx_discussions_user_id ON discussions(user_id);

-- Index for parent queries (replies to a discussion)
CREATE INDEX idx_discussions_parent_id ON discussions(parent_id);

-- Index for created_at queries (recent discussions)
CREATE INDEX idx_discussions_created_at ON discussions(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_discussions_updated_at
    BEFORE UPDATE ON discussions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
