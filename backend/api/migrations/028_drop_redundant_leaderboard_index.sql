-- Drop redundant index on contest_leaderboard_snapshots(contest_id).
-- contest_id is the PRIMARY KEY, so PostgreSQL already maintains a unique index on it.
-- The extra idx_cl_snapshots_contest index provides no query benefit.
DROP INDEX IF EXISTS idx_cl_snapshots_contest;
