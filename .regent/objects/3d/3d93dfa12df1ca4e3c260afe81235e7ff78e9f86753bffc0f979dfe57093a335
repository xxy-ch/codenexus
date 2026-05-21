-- Add LLM usage tracking and retry columns to analysis_jobs.
-- llm-worker records model name, token counts, and latency on each job completion.
-- retry_count / max_retries enable automatic re-queue of transient failures.

ALTER TABLE analysis_jobs
    ADD COLUMN IF NOT EXISTS llm_model VARCHAR(64),
    ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS completion_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS latency_ms INTEGER,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_retries INTEGER NOT NULL DEFAULT 3;

-- Partial index for finding jobs eligible for retry (pending with retries remaining).
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_retry_pending
    ON analysis_jobs(id) WHERE status = 'pending';
