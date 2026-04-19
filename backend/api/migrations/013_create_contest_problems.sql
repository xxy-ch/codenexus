-- Create contest_problems table
-- Junction table for contest-problem relationships

CREATE TABLE contest_problems (
    id BIGSERIAL PRIMARY KEY,
    contest_id BIGINT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 100,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contest_id, problem_id)
);

-- Index for contest queries (problems in a contest)
CREATE INDEX idx_contest_problems_contest_id ON contest_problems(contest_id);

-- Index for problem queries (contests containing this problem)
CREATE INDEX idx_contest_problems_problem_id ON contest_problems(problem_id);

-- Index for ordering
CREATE INDEX idx_contest_problems_order ON contest_problems(contest_id, order_index);
