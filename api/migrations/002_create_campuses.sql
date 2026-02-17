-- Create campuses table
-- Campuses are sub-units within organizations (schools)
-- Aligns with campus_id used in JWT Claims and User model

CREATE TABLE campuses (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- Index for organization queries (tenant filtering)
CREATE INDEX idx_campuses_organization_id ON campuses(organization_id);

-- Index for slug lookups within organization
CREATE INDEX idx_campuses_slug ON campuses(organization_id, slug);

-- Add trigger for updated_at
CREATE TRIGGER update_campuses_updated_at
    BEFORE UPDATE ON campuses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
