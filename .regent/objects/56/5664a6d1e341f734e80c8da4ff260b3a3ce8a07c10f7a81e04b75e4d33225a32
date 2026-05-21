-- Allow the submission lifecycle to use the pending state.
--
-- The service, routes, and judge worker already treat `pending` as a valid
-- status, but the original submissions_status_check constraint omitted it.
-- That caused submission creation / queue recovery to fail when code tried to
-- move rows back to pending.

ALTER TABLE submissions
    DROP CONSTRAINT IF EXISTS submissions_status_check;

ALTER TABLE submissions
    ADD CONSTRAINT submissions_status_check
    CHECK (status IN ('pending', 'queued', 'compiling', 'running', 'judged', 'failed'));
