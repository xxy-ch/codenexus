-- Feature Gateway: Registry and Scoped Flags (FGW-01, FGW-02, D-16)
-- Phase 11 Plan 01

-- Feature registry: canonical catalog of all feature flags
CREATE TABLE IF NOT EXISTS feature_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    default_enabled BOOLEAN NOT NULL DEFAULT true,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feature flags: runtime overrides at global/campus/grade/class scope
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_slug VARCHAR(100) NOT NULL REFERENCES feature_registry(slug) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('global', 'campus', 'grade', 'class')),
    scope_id BIGINT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_feature_flag UNIQUE (feature_slug, scope, scope_id)
);

-- Index for fast lookups by feature_slug
CREATE INDEX IF NOT EXISTS idx_feature_flags_slug ON feature_flags (feature_slug);

-- Seed data per D-16: 5 features, all default_enabled=true
INSERT INTO feature_registry (slug, name, description, default_enabled, category) VALUES
    ('direct_messages', 'Direct Messages', 'Direct messaging between users', true, 'communication'),
    ('plagiarism', 'Plagiarism Detection', 'Code similarity detection', true, 'analysis'),
    ('discussions', 'Discussions', 'Problem discussion forum', true, 'community'),
    ('blog', 'Blog', 'Community blog and articles', true, 'community'),
    ('leaderboard', 'Leaderboard', 'Ranking and scoreboard', true, 'competition')
ON CONFLICT (slug) DO NOTHING;
