-- Phase 14: Create grades table and add grade_id to users/user_roles/classes
-- Grades are campus-scoped, analogous to campuses at org level.
-- Adds grade_id FKs to users (identity), user_roles (authorization scope), classes (parent entity).

BEGIN;

-- 1. Create grades table (campus-scoped)
CREATE TABLE grades (
    id BIGSERIAL PRIMARY KEY,
    campus_id BIGINT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                 -- e.g. '高一', 'IGCSE Year 1'
    year_level INT NOT NULL DEFAULT 1,  -- 1/2/3 for sorting
    academic_year TEXT NOT NULL,         -- e.g. '2025-2026'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(campus_id, name, academic_year)
);

CREATE INDEX idx_grades_campus_id ON grades(campus_id);
CREATE INDEX idx_grades_is_active ON grades(is_active) WHERE is_active = true;

-- Updated_at trigger
CREATE TRIGGER update_grades_updated_at
    BEFORE UPDATE ON grades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Add grade_id to users (nullable FK — identity: student's current grade)
ALTER TABLE users ADD COLUMN grade_id BIGINT REFERENCES grades(id) ON DELETE SET NULL;
CREATE INDEX idx_users_grade_id ON users(grade_id);

-- 3. Add grade_id to user_roles (nullable FK — authorization scope)
ALTER TABLE user_roles ADD COLUMN grade_id BIGINT REFERENCES grades(id) ON DELETE SET NULL;

-- 4. Update user_roles unique constraint to include grade_id
-- Drop the COALESCE-based unique index from migration 029 and recreate with grade_id
DROP INDEX IF EXISTS idx_user_roles_unique;
CREATE UNIQUE INDEX idx_user_roles_unique
    ON user_roles (user_id, organization_id, COALESCE(campus_id, 0), COALESCE(grade_id, 0));

-- 5. Add grade_id to classes (nullable FK — class belongs to a grade)
ALTER TABLE classes ADD COLUMN grade_id BIGINT REFERENCES grades(id) ON DELETE SET NULL;
CREATE INDEX idx_classes_grade_id ON classes(grade_id);

-- 6. Partial unique index: one GradeAdmin per grade per campus (D-06)
CREATE UNIQUE INDEX idx_one_gradeadmin_per_grade
    ON user_roles (campus_id, grade_id)
    WHERE role = 'gradeadmin' AND grade_id IS NOT NULL;

COMMIT;
