-- Create contests table
-- Contests exist within tenant context

CREATE TABLE contests (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campus_id BIGINT REFERENCES campuses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    rules TEXT NOT NULL DEFAULT 'acm' CHECK (rules IN ('acm', 'ioi', 'education')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    freeze_minutes INTEGER,  -- Freeze leaderboard N minutes before end
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for tenant queries (organization_id)
CREATE INDEX idx_contests_organization_id ON contests(organization_id);

-- Index for campus queries
CREATE INDEX idx_contests_campus_id ON contests(campus_id);

-- Index for time-based queries (active contests)
CREATE INDEX idx_contests_start_time ON contests(start_time);

CREATE INDEX idx_contests_end_time ON contests(end_time);

-- Add check constraint: if campus_id is set, campus must belong to organization
ALTER TABLE contests
ADD CONSTRAINT fk_contests_campus_organization
FOREIGN KEY (campus_id, organization_id)
REFERENCES campuses(id, organization_id)
ON DELETE CASCADE;

-- Add check constraint: end_time must be after start_time
ALTER TABLE contests
ADD CONSTRAINT chk_contests_time_order
CHECK (end_time > start_time);

-- Add trigger for updated_at
CREATE TRIGGER update_contests_updated_at
    BEFORE UPDATE ON contests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
