-- Classes and Assignments System Migration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campus_id BIGINT REFERENCES campuses(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) UNIQUE NOT NULL, -- Enrollment code
    is_active BOOLEAN DEFAULT true,
    max_students INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for classes
CREATE INDEX idx_classes_organization ON classes(organization_id);
CREATE INDEX idx_classes_campus ON classes(campus_id);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_code ON classes(code);
CREATE INDEX idx_classes_active ON classes(is_active);

-- Class enrollments table
CREATE TABLE IF NOT EXISTS class_enrollments (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);

-- Indexes for class_enrollments
CREATE INDEX idx_enrollments_class ON class_enrollments(class_id);
CREATE INDEX idx_enrollments_student ON class_enrollments(student_id);
CREATE INDEX idx_enrollments_status ON class_enrollments(status);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    problem_ids BIGINT[] NOT NULL, -- Array of problem IDs
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    late_penalty_percent INTEGER DEFAULT 10 CHECK (late_penalty_percent BETWEEN 0 AND 100),
    max_submissions INTEGER,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for assignments
CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_assignments_deadline ON assignments(deadline);
CREATE INDEX idx_assignments_published ON assignments(is_published);
CREATE INDEX idx_assignments_problem_ids ON assignments USING GIN(problem_ids);

-- Assignment submissions table
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    is_late BOOLEAN DEFAULT false,
    late_days INTEGER DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, user_id, submission_id)
);

-- Indexes for assignment_submissions
CREATE INDEX idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submissions_user ON assignment_submissions(user_id);
CREATE INDEX idx_assignment_submissions_submission ON assignment_submissions(submission_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
    BEFORE UPDATE ON class_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function: Get class statistics
CREATE OR REPLACE FUNCTION class_statistics(p_class_id BIGINT)
RETURNS TABLE (
    class_id BIGINT,
    total_students BIGINT,
    active_students BIGINT,
    total_assignments BIGINT,
    total_submissions BIGINT,
    average_score DOUBLE PRECISION,
    completion_rate DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p_class_id as class_id,
        (SELECT COUNT(*) FROM class_enrollments WHERE class_id = p_class_id) as total_students,
        (SELECT COUNT(*) FROM class_enrollments WHERE class_id = p_class_id AND status = 'active') as active_students,
        (SELECT COUNT(*) FROM assignments WHERE class_id = p_class_id) as total_assignments,
        (SELECT COUNT(*) FROM assignment_submissions asub
         JOIN assignments a ON a.id = asub.assignment_id
         WHERE a.class_id = p_class_id) as total_submissions,
        COALESCE((SELECT AVG(score) FROM assignment_submissions asub
                  JOIN assignments a ON a.id = asub.assignment_id
                  WHERE a.class_id = p_class_id), 0) as average_score,
        CASE
            WHEN (SELECT COUNT(*) FROM assignments WHERE class_id = p_class_id) > 0 THEN
                (SELECT COUNT(DISTINCT asub.user_id)::FLOAT / COUNT(DISTINCT ce.student_id) * 100
                 FROM class_enrollments ce
                 LEFT JOIN assignment_submissions asub ON asub.assignment_id IN (SELECT id FROM assignments WHERE class_id = p_class_id)
                 WHERE ce.class_id = p_class_id AND ce.status = 'active')
            ELSE 0
        END as completion_rate;
END;
$$ LANGUAGE plpgsql;

-- Function: Get student progress for a class
CREATE OR REPLACE FUNCTION student_progress(p_class_id BIGINT)
RETURNS TABLE (
    student_id UUID,
    username VARCHAR,
    email VARCHAR,
    total_assignments BIGINT,
    completed_assignments BIGINT,
    average_score DOUBLE PRECISION,
    last_submission TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.student_id,
        u.username,
        u.email,
        (SELECT COUNT(*) FROM assignments WHERE class_id = p_class_id AND is_published = true) as total_assignments,
        COALESCE((SELECT COUNT(DISTINCT assignment_id)
                  FROM assignment_submissions
                  WHERE assignment_id IN (SELECT id FROM assignments WHERE class_id = p_class_id)
                  AND user_id = ce.student_id), 0) as completed_assignments,
        COALESCE((SELECT AVG(score)
                  FROM assignment_submissions
                  WHERE assignment_id IN (SELECT id FROM assignments WHERE class_id = p_class_id)
                  AND user_id = ce.student_id), 0) as average_score,
        (SELECT MAX(submitted_at)
         FROM assignment_submissions
         WHERE assignment_id IN (SELECT id FROM assignments WHERE class_id = p_class_id)
         AND user_id = ce.student_id) as last_submission
    FROM class_enrollments ce
    JOIN users u ON u.id = ce.student_id
    WHERE ce.class_id = p_class_id AND ce.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- View: Class roster with progress
CREATE OR REPLACE VIEW v_class_roster AS
SELECT
    c.id as class_id,
    c.name as class_name,
    ce.student_id,
    u.username,
    u.email,
    ce.status as enrollment_status,
    ce.enrolled_at,
    (SELECT COUNT(*) FROM assignments WHERE class_id = c.id) as total_assignments,
    (SELECT COUNT(DISTINCT asub.assignment_id)
     FROM assignment_submissions asub
     JOIN assignments a ON a.id = asub.assignment_id
     WHERE a.class_id = c.id AND asub.user_id = ce.student_id) as submitted_assignments
FROM classes c
JOIN class_enrollments ce ON ce.class_id = c.id
JOIN users u ON u.id = ce.student_id
WHERE c.is_active = true;

-- Comments for documentation
COMMENT ON TABLE classes IS 'Stores course/class information for educational institutions';
COMMENT ON TABLE class_enrollments IS 'Tracks student enrollment in classes with status tracking';
COMMENT ON TABLE assignments IS 'Assignments created by teachers for their classes';
COMMENT ON TABLE assignment_submissions IS 'Links submissions to assignments with score tracking';

COMMENT ON COLUMN classes.code IS 'Unique 6-character code for students to enroll';
COMMENT ON COLUMN assignments.problem_ids IS 'Array of problem IDs included in this assignment';
COMMENT ON COLUMN assignments.late_penalty_percent IS 'Penalty percentage per day late (0-100)';
COMMENT ON COLUMN assignment_submissions.is_late IS 'Whether the submission was after the deadline';
COMMENT ON COLUMN assignment_submissions.late_days IS 'Number of days late submitted';
