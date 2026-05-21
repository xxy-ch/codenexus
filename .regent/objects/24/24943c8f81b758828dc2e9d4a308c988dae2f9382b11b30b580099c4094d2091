-- Create plagiarism_reports table
-- Reports for code similarity detection

CREATE TABLE plagiarism_reports (
    id BIGSERIAL PRIMARY KEY,
    submission1_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    submission2_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    similarity_score NUMERIC(5, 2) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 100),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'cleared', 'confirmed')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (submission1_id < submission2_id)  -- Ensure consistent ordering
);

-- Index for submission1 queries
CREATE INDEX idx_plagiarism_reports_submission1_id ON plagiarism_reports(submission1_id);

-- Index for submission2 queries
CREATE INDEX idx_plagiarism_reports_submission2_id ON plagiarism_reports(submission2_id);

-- Index for status queries
CREATE INDEX idx_plagiarism_reports_status ON plagiarism_reports(status);

-- Index for similarity score queries
CREATE INDEX idx_plagiarism_reports_similarity ON plagiarism_reports(similarity_score DESC);

-- Index for created_at queries (recent reports)
CREATE INDEX idx_plagiarism_reports_created_at ON plagiarism_reports(created_at DESC);

-- Index for reviewed_by queries (reports reviewed by teacher)
CREATE INDEX idx_plagiarism_reports_reviewed_by ON plagiarism_reports(reviewed_by);

-- Add trigger for updated_at
CREATE TRIGGER update_plagiarism_reports_updated_at
    BEFORE UPDATE ON plagiarism_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
