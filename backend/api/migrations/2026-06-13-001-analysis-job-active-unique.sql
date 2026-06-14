-- Prevent duplicate active analysis jobs per submission.
--
-- Before this index, two concurrent POST /analysis/submissions/:id/trigger-feedback
-- calls could both pass the application-layer "no pending job" check and insert
-- two rows, double-charging the LLM call. A partial unique index at the DB level
-- is the authoritative guard: it makes the check-then-insert atomic regardless of
-- transaction isolation level.
--
-- Only one row per submission_id may exist in the 'pending' or 'processing'
-- state at any time. Completed/failed history rows are unrestricted (a new
-- job may be created after the previous one finishes).

-- Drop the plain non-unique index so the partial unique index can serve the
-- same lookup pattern without redundancy.
DROP INDEX IF EXISTS idx_analysis_jobs_submission;

CREATE UNIQUE INDEX IF NOT EXISTS uq_analysis_jobs_active_per_submission
    ON analysis_jobs (submission_id)
    WHERE status IN ('pending', 'processing');
