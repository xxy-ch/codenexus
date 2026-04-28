-- Create contest_submissions table
-- Track submissions made during contests

CREATE TABLE contest_submissions (
    id BIGSERIAL PRIMARY KEY,
    contest_id BIGINT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    penalty_time INTEGER NOT NULL DEFAULT 0,  -- Penalty time for ACM scoring
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for contest queries (submissions in a contest)
CREATE INDEX idx_contest_submissions_contest_id ON contest_submissions(contest_id);

-- Index for submission queries (which contest this submission belongs to)
CREATE INDEX idx_contest_submissions_submission_id ON contest_submissions(submission_id);

-- Unique constraint: one contest submission per submission
CREATE UNIQUE INDEX idx_contest_submissions_unique ON contest_submissions(submission_id);
