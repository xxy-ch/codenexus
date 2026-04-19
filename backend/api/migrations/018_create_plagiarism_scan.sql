-- Scan configuration and report tables for plagiarism module

CREATE TABLE IF NOT EXISTS plagiarism_scan_configs (
    id SMALLINT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    language TEXT NOT NULL DEFAULT 'all',
    threshold DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    min_token_length INTEGER NOT NULL DEFAULT 5,
    window_size INTEGER NOT NULL DEFAULT 30,
    ignore_comments BOOLEAN NOT NULL DEFAULT TRUE,
    ignore_whitespace BOOLEAN NOT NULL DEFAULT TRUE,
    max_reports_per_run INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plagiarism_scan_reports (
    id UUID PRIMARY KEY,
    contest_id TEXT,
    assignment_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    overall_risk TEXT NOT NULL DEFAULT 'low' CHECK (overall_risk IN ('low', 'medium', 'high')),
    total_submissions INTEGER NOT NULL DEFAULT 0,
    suspicious_pairs INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_plagiarism_scan_reports_created_at
    ON plagiarism_scan_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_plagiarism_scan_reports_status
    ON plagiarism_scan_reports(status);

CREATE TABLE IF NOT EXISTS plagiarism_scan_pairs (
    id BIGSERIAL PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES plagiarism_scan_reports(id) ON DELETE CASCADE,
    left_submission_id TEXT NOT NULL,
    right_submission_id TEXT NOT NULL,
    left_user TEXT NOT NULL,
    right_user TEXT NOT NULL,
    similarity DOUBLE PRECISION NOT NULL,
    matched_lines INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_plagiarism_scan_pairs_report_id
    ON plagiarism_scan_pairs(report_id);

CREATE INDEX IF NOT EXISTS idx_plagiarism_scan_pairs_similarity
    ON plagiarism_scan_pairs(report_id, similarity DESC);

CREATE TRIGGER update_plagiarism_scan_configs_updated_at
    BEFORE UPDATE ON plagiarism_scan_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
