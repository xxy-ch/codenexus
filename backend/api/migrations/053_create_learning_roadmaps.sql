-- Persist one editable learning roadmap per organization.

CREATE TABLE IF NOT EXISTS learning_roadmaps (
    organization_id BIGINT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    nodes JSONB NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
