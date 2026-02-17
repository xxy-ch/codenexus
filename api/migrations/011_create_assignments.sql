-- Create assignments table
-- Assignments link problems to classes with deadlines

CREATE TABLE assignments (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    deadline TIMESTAMPTZ NOT NULL,
    points INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for class queries (assignments for a class)
CREATE INDEX idx_assignments_class_id ON assignments(class_id);

-- Index for problem queries (which classes use this problem)
CREATE INDEX idx_assignments_problem_id ON assignments(problem_id);

-- Index for deadline queries (active assignments)
CREATE INDEX idx_assignments_deadline ON assignments(deadline);

-- Unique constraint: one assignment per class per problem
CREATE UNIQUE INDEX idx_assignments_class_problem ON assignments(class_id, problem_id);

-- Add trigger for updated_at
CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
