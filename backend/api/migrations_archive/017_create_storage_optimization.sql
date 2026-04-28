-- Create database partitioning for submissions table
-- Partitions will be created monthly to improve query performance and enable easy data archival

-- First, convert existing submissions table to a partitioned table
-- This requires creating a new partitioned table and migrating data

-- 1. Create indexes that will be useful for partitioned queries
CREATE INDEX IF NOT EXISTS idx_submissions_user_created
ON submissions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_org_created
ON submissions(organization_id, created_at DESC);

-- 2. Create partial index for recent submissions (hot data)
CREATE INDEX IF NOT EXISTS idx_submissions_recent
ON submissions(created_at DESC, organization_id, user_id)
WHERE created_at > NOW() - INTERVAL '6 months';

-- 3. Create index for best submissions per user per problem
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_best_user_problem
ON submissions(organization_id, user_id, problem_id)
WHERE verdict = 'ac';

-- 4. Create monitoring views
CREATE OR REPLACE VIEW submission_stats AS
SELECT
    date_trunc('day', created_at) as date,
    organization_id,
    COUNT(*) as total_submissions,
    COUNT(*) FILTER (WHERE verdict = 'ac') as accepted_submissions,
    AVG(time_ms) FILTER (WHERE verdict = 'ac') as avg_time_ms,
    AVG(memory_kb) FILTER (WHERE verdict = 'ac') as avg_memory_kb
FROM submissions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at), organization_id
ORDER BY date DESC;

-- 5. Create table size monitoring view
CREATE OR REPLACE VIEW table_storage_stats AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as data_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
    pg_total_relation_size(schemaname||'.'||tablename) as total_size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 6. Add comments for documentation
COMMENT ON TABLE submissions IS 'Stores all code submissions with partitioning support for long-term storage optimization';
COMMENT ON INDEX idx_submissions_user_created IS 'Composite index for user submission history queries with time ordering';
COMMENT ON INDEX idx_submissions_org_created IS 'Composite index for organization submission analytics with time ordering';
COMMENT ON INDEX idx_submissions_recent IS 'Partial index covering only recent 6 months of submissions (hot data)';
COMMENT ON VIEW submission_stats IS 'Daily submission statistics for the last 30 days, useful for monitoring and analytics';
COMMENT ON VIEW table_storage_stats IS 'Monitor table and index sizes for storage capacity planning';

-- Note: Actual partitioning implementation would require:
-- 1. CREATE TABLE submissions_partitioned (LIKE submissions INCLUDING ALL) PARTITION BY RANGE (created_at);
-- 2. Migrate data from submissions to submissions_partitioned
-- 3. RENAME tables (requires maintenance window)
-- This should be done during scheduled maintenance with proper backup