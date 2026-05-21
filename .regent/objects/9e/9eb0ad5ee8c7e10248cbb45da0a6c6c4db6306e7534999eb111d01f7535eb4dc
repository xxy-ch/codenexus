-- Phase 12: AI Analysis Bounded Context — Additive Tables (AIA-04)
-- All tables are new. No existing tables are modified.

-- analysis_jobs: tracks analysis work items from the shadow pipeline
CREATE TABLE IF NOT EXISTS analysis_jobs (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL REFERENCES submissions(id),
    problem_id BIGINT NOT NULL,
    user_id UUID NOT NULL,
    organization_id BIGINT NOT NULL,
    campus_id BIGINT,
    grade_id BIGINT,
    contest_id BIGINT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_submission ON analysis_jobs(submission_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_org_status ON analysis_jobs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_pending ON analysis_jobs(id) WHERE status = 'pending';

-- analysis_submission_features: structural + embedding features per submission
CREATE TABLE IF NOT EXISTS analysis_submission_features (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL REFERENCES submissions(id),
    organization_id BIGINT NOT NULL,
    cyclomatic_complexity DOUBLE PRECISION,
    lines_of_code INTEGER,
    token_count INTEGER,
    function_count INTEGER,
    nesting_depth INTEGER,
    distinct_operators INTEGER,
    distinct_operands INTEGER,
    halstead_volume DOUBLE PRECISION,
    embedding_vector JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_analysis_submission_features_submission UNIQUE (submission_id)
);

CREATE INDEX IF NOT EXISTS idx_analysis_features_org ON analysis_submission_features(organization_id);

-- analysis_solution_clusters: groupings of similar solutions
CREATE TABLE IF NOT EXISTS analysis_solution_clusters (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    cluster_name VARCHAR(255),
    centroid_embedding JSONB,
    member_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_clusters_problem_org ON analysis_solution_clusters(problem_id, organization_id);

-- analysis_cluster_members: links submissions to clusters
CREATE TABLE IF NOT EXISTS analysis_cluster_members (
    id BIGSERIAL PRIMARY KEY,
    cluster_id BIGINT NOT NULL REFERENCES analysis_solution_clusters(id) ON DELETE CASCADE,
    submission_id BIGINT NOT NULL REFERENCES submissions(id),
    organization_id BIGINT NOT NULL,
    distance_to_centroid DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_cluster_members_cluster ON analysis_cluster_members(cluster_id);
CREATE INDEX IF NOT EXISTS idx_analysis_cluster_members_submission ON analysis_cluster_members(submission_id);
CREATE INDEX IF NOT EXISTS idx_analysis_cluster_members_org ON analysis_cluster_members(organization_id);

-- analysis_teaching_cards: AI-generated teaching insights
CREATE TABLE IF NOT EXISTS analysis_teaching_cards (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    card_type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_cluster_ids BIGINT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_teaching_cards_problem_org ON analysis_teaching_cards(problem_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_analysis_teaching_cards_type ON analysis_teaching_cards(card_type);

-- analysis_class_snapshots: class-level cognition profiles
CREATE TABLE IF NOT EXISTS analysis_class_snapshots (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    snapshot_date DATE NOT NULL,
    cognition_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    student_count INTEGER NOT NULL DEFAULT 0,
    avg_complexity DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analysis_class_snapshot_unique ON analysis_class_snapshots(class_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_analysis_class_snapshot_org ON analysis_class_snapshots(organization_id);

-- analysis_flags: internal analysis toggles and rollout controls
CREATE TABLE IF NOT EXISTS analysis_flags (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    flag_key VARCHAR(100) NOT NULL,
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('global', 'campus', 'grade', 'class')),
    scope_id BIGINT,
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_analysis_flags UNIQUE (organization_id, flag_key, scope, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_analysis_flags_org_key ON analysis_flags(organization_id, flag_key);
