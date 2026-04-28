-- Create organizations (schools) table
-- Organizations act as tenants for multi-tenant isolation
-- Aligns with school_id used in JWT Claims and User model

CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for slug lookups (tenant identification)
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Add trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
