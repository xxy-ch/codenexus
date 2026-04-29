-- Add advanced structural features produced by domain-analysis extractor.
-- These columns are nullable so existing feature rows remain valid until reprocessed.

ALTER TABLE analysis_submission_features
    ADD COLUMN IF NOT EXISTS has_recursion BOOLEAN,
    ADD COLUMN IF NOT EXISTS loop_count INTEGER,
    ADD COLUMN IF NOT EXISTS avg_loop_nesting DOUBLE PRECISION;
