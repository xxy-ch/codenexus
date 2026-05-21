-- Contest leaderboard freeze snapshot storage (CONT-01)
-- Stores a frozen view of rankings during the freeze window.
-- One snapshot per contest, lazily computed on first frozen request.
CREATE TABLE IF NOT EXISTS contest_leaderboard_snapshots (
    contest_id BIGINT PRIMARY KEY REFERENCES contests(id) ON DELETE CASCADE,
    snapshot_data JSONB NOT NULL,
    frozen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
