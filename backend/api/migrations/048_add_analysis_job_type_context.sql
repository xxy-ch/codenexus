ALTER TABLE analysis_jobs
    ADD COLUMN IF NOT EXISTS analysis_type VARCHAR(32) NOT NULL DEFAULT 'code_review',
    ADD COLUMN IF NOT EXISTS source_cluster_ids BIGINT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_type
    ON analysis_jobs(analysis_type) WHERE analysis_type = 'teaching_card';
