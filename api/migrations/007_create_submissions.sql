-- Create submissions table
-- Submissions exist within tenant context

CREATE TABLE submissions (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    language TEXT NOT NULL CHECK (language IN ('python3', 'c', 'cpp', 'c++')),
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'compiling', 'running', 'judged', 'failed')),
    verdict TEXT CHECK (verdict IN ('ac', 'wa', 'rte', 'tle', 'mle', 'ole', 'ce', 'ie')),
    time_ms INTEGER,
    memory_kb INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for tenant queries (organization_id)
CREATE INDEX idx_submissions_organization_id ON submissions(organization_id);

-- Index for user queries (user's submission history)
CREATE INDEX idx_submissions_user_id ON submissions(organization_id, user_id);

-- Index for problem queries (problem's submissions)
CREATE INDEX idx_submissions_problem_id ON submissions(organization_id, problem_id);

-- Index for status queries
CREATE INDEX idx_submissions_status ON submissions(status);

-- Index for verdict queries
CREATE INDEX idx_submissions_verdict ON submissions(organization_id, verdict);

-- Index for created_at queries (recent submissions)
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);

-- Composite index for user problem queries (best submission per problem)
CREATE INDEX idx_submissions_user_problem ON submissions(organization_id, user_id, problem_id);

-- Add trigger for updated_at
CREATE TRIGGER update_submissions_updated_at
    BEFORE UPDATE ON submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
