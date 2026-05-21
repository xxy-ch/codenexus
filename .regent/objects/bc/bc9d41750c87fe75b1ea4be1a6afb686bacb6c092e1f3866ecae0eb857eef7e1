-- Create class_enrollments table
-- Junction table for student-class enrollment

CREATE TABLE class_enrollments (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'graduated')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);

-- Index for class queries (students in a class)
CREATE INDEX idx_class_enrollments_class_id ON class_enrollments(class_id);

-- Index for student queries (classes for a student)
CREATE INDEX idx_class_enrollments_student_id ON class_enrollments(student_id);

-- Index for status queries
CREATE INDEX idx_class_enrollments_status ON class_enrollments(status);
