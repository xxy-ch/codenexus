-- Post-contest upsolving flag (CONT-02)
-- Submissions after contest ends are tagged as upsolving and excluded from official standings.
ALTER TABLE contest_submissions
    ADD COLUMN IF NOT EXISTS is_upsolving BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_cs_upsolving ON contest_submissions(contest_id, is_upsolving);
