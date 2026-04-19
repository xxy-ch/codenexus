-- Create user_roles table
-- Junction table for multi-tenant role assignment
-- Supports role assignment at organization or campus level

CREATE TABLE user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campus_id BIGINT REFERENCES campuses(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('root', 'campusadmin', 'teacher', 'student')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, organization_id, campus_id)
);

-- Index for user role lookups
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Index for tenant queries (organization_id)
CREATE INDEX idx_user_roles_organization_id ON user_roles(organization_id);

-- Index for campus queries
CREATE INDEX idx_user_roles_campus_id ON user_roles(campus_id);

-- Index for role-based queries
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Add check constraint: if campus_id is set, campus must belong to organization
ALTER TABLE user_roles
ADD CONSTRAINT fk_user_roles_campus_organization
FOREIGN KEY (campus_id, organization_id)
REFERENCES campuses(id, organization_id)
ON DELETE CASCADE;
