-- Create users table
-- Users exist within tenant context (organization + optional campus)

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campus_id BIGINT REFERENCES campuses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email login
CREATE INDEX idx_users_email ON users(email);

-- Index for tenant queries (organization_id)
CREATE INDEX idx_users_organization_id ON users(organization_id);

-- Index for campus queries
CREATE INDEX idx_users_campus_id ON users(campus_id);

-- Add trigger for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
