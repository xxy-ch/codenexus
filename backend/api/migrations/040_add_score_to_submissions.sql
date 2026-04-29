-- Add score column to submissions table
-- The judge-worker reports a score per submission (sum of test case scores),
-- but the column was missing from the original schema.

ALTER TABLE submissions ADD COLUMN score INTEGER;
