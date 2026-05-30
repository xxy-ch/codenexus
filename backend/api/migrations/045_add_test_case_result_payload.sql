-- Persist judge-worker result payloads so submission details can display
-- actual output and per-case errors for completed submissions.

ALTER TABLE test_case_results
    ADD COLUMN IF NOT EXISTS expected_output TEXT,
    ADD COLUMN IF NOT EXISTS actual_output TEXT,
    ADD COLUMN IF NOT EXISTS error_message TEXT;
