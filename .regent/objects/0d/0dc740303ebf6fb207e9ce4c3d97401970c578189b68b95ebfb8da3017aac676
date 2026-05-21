-- Ensure global feature flag overrides upsert as a single row.
--
-- PostgreSQL unique constraints treat NULL values as distinct, so the original
-- (feature_slug, scope, scope_id) uniqueness does not protect global rows where
-- scope_id is NULL. The service uses this partial index as the conflict target
-- for global updates.
CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_flag_null_scope_id
    ON feature_flags (feature_slug, scope)
    WHERE scope_id IS NULL;
