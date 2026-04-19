-- Create test_case_results table
-- Results for each test case in a submission

CREATE TABLE test_case_results (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    test_case_id BIGINT NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    verdict TEXT NOT NULL CHECK (verdict IN ('ac', 'wa', 'rte', 'tle', 'mle', 'ole', 'ce', 'ie')),
    time_ms INTEGER,
    memory_kb INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for submission queries
CREATE INDEX idx_test_case_results_submission_id ON test_case_results(submission_id);

-- Index for test case queries
CREATE INDEX idx_test_case_results_test_case_id ON test_case_results(test_case_id);

-- Unique constraint: one result per submission per test case
CREATE UNIQUE INDEX idx_test_case_results_unique ON test_case_results(submission_id, test_case_id);
