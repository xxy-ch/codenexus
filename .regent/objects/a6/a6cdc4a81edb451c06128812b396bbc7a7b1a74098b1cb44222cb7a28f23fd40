-- Create data retention and archival functions
-- Automated data archival for long-term storage optimization

-- 1. Create archival tables structure
CREATE TABLE IF NOT EXISTS submissions_archive (
    LIKE submissions INCLUDING ALL,
    CONSTRAINT pk_submissions_archive PRIMARY KEY (id)
);

-- Add metadata for archived records
ALTER TABLE submissions_archive
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS archive_reason TEXT DEFAULT 'retention_policy';

-- Create indexes on archive table
CREATE INDEX idx_submissions_archive_org_created
ON submissions_archive(organization_id, created_at DESC);

CREATE INDEX idx_submissions_archive_user_created
ON submissions_archive(user_id, created_at DESC);

CREATE INDEX idx_submissions_archive_archived_at
ON submissions_archive(archived_at DESC);

-- 2. Create function to archive old submissions
CREATE OR REPLACE FUNCTION archive_old_submissions(months_to_keep INTEGER DEFAULT 12)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
    cutoff_date TIMESTAMPTZ := NOW() - MAKE_INTERVAL(months => months_to_keep);
BEGIN
    -- Insert into archive table
    INSERT INTO submissions_archive
    SELECT *, NOW(), 'retention_policy'
    FROM submissions
    WHERE created_at < cutoff_date
    ON CONFLICT (id) DO NOTHING;

    GET DIAGNOSTICS archived_count = ROW_COUNT;

    -- Delete from main table
    DELETE FROM submissions
    WHERE created_at < cutoff_date;

    -- Log the archival
    RAISE NOTICE 'Archived % submissions older than % months',
                 archived_count, months_to_keep;

    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to get storage statistics
CREATE OR REPLACE FUNCTION get_storage_statistics()
RETURNS TABLE (
    table_name TEXT,
    total_size TEXT,
    data_size TEXT,
    index_size TEXT,
    row_count BIGINT,
    avg_row_size NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tablename as table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as data_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
        pg_total_relation_size(schemaname||'.'||tablename) / NULLIF(pg_stat_get_live_tuples(schemaname||'.'||tablename, 0), 0) as avg_row_size
    FROM pg_tables t
    LEFT JOIN pg_stat_user_tables s ON s.schemaname = t.schemaname AND s.relname = t.tablename
    WHERE t.schemaname = 'public'
      AND t.tablename IN ('submissions', 'submissions_archive', 'problems', 'contests', 'discussions')
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Create automated cleanup function for very old data
CREATE OR REPLACE FUNCTION cleanup_ancient_data(years_to_keep INTEGER DEFAULT 5)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMPTZ := NOW() - MAKE_INTERVAL(years => years_to_keep);
BEGIN
    -- Delete very old archived data (beyond retention period)
    DELETE FROM submissions_archive
    WHERE created_at < cutoff_date
      AND verdict NOT IN ('ac');  -- Keep accepted solutions

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RAISE NOTICE 'Deleted % ancient submissions from archive (older than % years)',
                 deleted_count, years_to_keep;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Create monitoring function for storage alerts
CREATE OR REPLACE FUNCTION check_storage_thresholds()
RETURNS TABLE (
    table_name TEXT,
    current_size_gb NUMERIC,
    threshold_gb NUMERIC,
    status TEXT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH table_sizes AS (
        SELECT
            schemaname||'.'||tablename as table_name,
            pg_total_relation_size(schemaname||'.'||tablename) / (1024.0^3) as size_gb
        FROM pg_tables
        WHERE schemaname = 'public'
    )
    SELECT
        ts.table_name,
        ts.size_gb as current_size_gb,
        CASE
            WHEN ts.table_name LIKE '%submissions%' THEN 100  -- 100GB threshold
            WHEN ts.table_name LIKE '%problems%' THEN 10     -- 10GB threshold
            WHEN ts.table_name LIKE '%discussions%' THEN 5   -- 5GB threshold
            ELSE 50                                           -- 50GB default
        END as threshold_gb,
        CASE
            WHEN ts.size_gb > CASE
                WHEN ts.table_name LIKE '%submissions%' THEN 100
                WHEN ts.table_name LIKE '%problems%' THEN 10
                WHEN ts.table_name LIKE '%discussions%' THEN 5
                ELSE 50
            END THEN 'ALERT'
            WHEN ts.size_gb > CASE
                WHEN ts.table_name LIKE '%submissions%' THEN 80
                WHEN ts.table_name LIKE '%problems%' THEN 8
                WHEN ts.table_name LIKE '%discussions%' THEN 4
                ELSE 40
            END THEN 'WARNING'
            ELSE 'OK'
        END as status,
        CASE
            WHEN ts.table_name = 'public.submissions' AND ts.size_gb > 80
            THEN 'Consider archiving old submissions: SELECT archive_old_submissions(6);'
            WHEN ts.table_name = 'public.submissions_archive' AND ts.size_gb > 200
            THEN 'Consider deleting ancient data: SELECT cleanup_ancient_data(5);'
            WHEN ts.size_gb > 50 THEN 'Consider table partitioning for better performance'
            ELSE 'Storage usage within acceptable limits'
        END as recommendation
    FROM table_sizes ts
    WHERE ts.table_name LIKE ANY(ARRAY['%.submissions', '%.problems', '%.discussions'])
    ORDER BY ts.size_gb DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. Create view for retention policy monitoring
CREATE OR REPLACE VIEW retention_policy_status AS
SELECT
    'submissions' as table_name,
    12 as retention_months,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '12 months') as active_records,
    COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '12 months') as ready_for_archive,
    pg_size_pretty(pg_total_relation_size('public.submissions')) as current_size
FROM submissions

UNION ALL

SELECT
    'submissions_archive' as table_name,
    60 as retention_months,  -- 5 years
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 years') as active_records,
    COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '5 years') as ready_for_deletion,
    pg_size_pretty(pg_total_relation_size('public.submissions_archive')) as current_size
FROM submissions_archive;

-- Add comments
COMMENT ON FUNCTION archive_old_submissions(INTEGER) IS 'Archive submissions older than specified months to archive table';
COMMENT ON FUNCTION cleanup_ancient_data(INTEGER) IS 'Delete ancient archived data (except accepted solutions) beyond retention period';
COMMENT ON FUNCTION check_storage_thresholds() IS 'Check storage usage against defined thresholds and provide recommendations';
COMMENT ON FUNCTION get_storage_statistics() IS 'Get detailed storage statistics for all major tables';
COMMENT ON VIEW retention_policy_status IS 'Monitor data retention policy compliance and storage usage';

-- Note: These functions can be scheduled using pg_cron or external schedulers
-- Example usage:
-- SELECT archive_old_submissions(6);  -- Archive 6+ month old submissions
-- SELECT cleanup_ancient_data(5);     -- Clean up 5+ year old data
-- SELECT * FROM check_storage_thresholds();  -- Check storage status
-- SELECT * FROM retention_policy_status;     -- Check retention compliance