ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS result_error TEXT,
    ADD COLUMN IF NOT EXISTS status_details TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_submissions_is_hidden
    ON submissions(is_hidden);
