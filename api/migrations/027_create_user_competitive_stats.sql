CREATE TABLE IF NOT EXISTS user_competitive_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    ac_count BIGINT NOT NULL DEFAULT 0,
    contest_rating INTEGER NOT NULL DEFAULT 1500,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_competitive_stats_ac_count
ON user_competitive_stats(ac_count DESC);

CREATE INDEX IF NOT EXISTS idx_user_competitive_stats_contest_rating
ON user_competitive_stats(contest_rating DESC);

DROP TRIGGER IF EXISTS update_user_competitive_stats_updated_at ON user_competitive_stats;
CREATE TRIGGER update_user_competitive_stats_updated_at
    BEFORE UPDATE ON user_competitive_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
