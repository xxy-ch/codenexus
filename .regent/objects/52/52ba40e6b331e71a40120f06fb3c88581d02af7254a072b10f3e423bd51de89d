-- Add analysis_type and source_cluster_ids to analysis_jobs.
--
-- analysis_type discriminates between code_review (single submission) and
-- teaching_card (cluster-based) jobs so the llm-worker can branch accordingly.
-- source_cluster_ids carries the cluster context for teaching_card jobs.

ALTER TABLE analysis_jobs
    ADD COLUMN IF NOT EXISTS analysis_type VARCHAR(32) NOT NULL DEFAULT 'code_review',
    ADD COLUMN IF NOT EXISTS source_cluster_ids BIGINT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_type
    ON analysis_jobs(analysis_type) WHERE analysis_type = 'teaching_card';
