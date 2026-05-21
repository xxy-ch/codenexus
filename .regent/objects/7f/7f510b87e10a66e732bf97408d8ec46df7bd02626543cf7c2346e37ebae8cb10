-- Create classes table
-- Classes exist within tenant context

CREATE TABLE classes (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campus_id BIGINT REFERENCES campuses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    semester TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for tenant queries (organization_id)
CREATE INDEX idx_classes_organization_id ON classes(organization_id);

-- Index for campus queries
CREATE INDEX idx_classes_campus_id ON classes(campus_id);

-- Index for teacher queries
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);

-- Add check constraint: if campus_id is set, campus must belong to organization
ALTER TABLE classes
ADD CONSTRAINT fk_classes_campus_organization
FOREIGN KEY (campus_id, organization_id)
REFERENCES campuses(id, organization_id)
ON DELETE CASCADE;

-- Add trigger for updated_at
CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
