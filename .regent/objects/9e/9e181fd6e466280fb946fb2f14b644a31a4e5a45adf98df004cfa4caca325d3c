-- Create test_cases table
-- Test cases belong to problems

CREATE TABLE test_cases (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    output TEXT NOT NULL,
    is_secret BOOLEAN NOT NULL DEFAULT false,
    points INTEGER NOT NULL DEFAULT 1,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for problem queries
CREATE INDEX idx_test_cases_problem_id ON test_cases(problem_id);

-- Index for ordering
CREATE INDEX idx_test_cases_order ON test_cases(problem_id, order_index);
