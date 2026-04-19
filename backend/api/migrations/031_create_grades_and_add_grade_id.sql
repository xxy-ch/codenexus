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

-- 7. Data migration: populate grades from existing class names
-- Heuristics for Chinese high school naming patterns (D-09):
--   高一 → year_level 1, 高二 → year_level 2, 高三 → year_level 3
-- International patterns: Grade 1-12, Year 1-13, IGCSE Year 1-2, AS, A2
-- Fallback: leave grade_id NULL if heuristics cannot infer

-- 7a. Create grades from distinct grade indicators found in class names
-- For each campus, extract grade-level indicators and create corresponding grade rows.
-- Default academic_year is '2025-2026' (current year context at migration time).
INSERT INTO grades (campus_id, name, year_level, academic_year)
SELECT DISTINCT
    c.campus_id,
    CASE
        WHEN cl.name ~ '高一' THEN '高一'
        WHEN cl.name ~ '高二' THEN '高二'
        WHEN cl.name ~ '高三' THEN '高三'
        WHEN cl.name ~ '[Gg]rade\s+(\d+)' THEN 'Grade ' || regexp_replace(cl.name, '.*[Gg]rade\s+(\d+).*', '\1')
        WHEN cl.name ~ '[Yy]ear\s+(\d+)' THEN 'Year ' || regexp_replace(cl.name, '.*[Yy]ear\s+(\d+).*', '\1')
        WHEN cl.name ~ 'IGCSE\s+[Yy]ear\s+1' THEN 'IGCSE Year 1'
        WHEN cl.name ~ 'IGCSE\s+[Yy]ear\s+2' THEN 'IGCSE Year 2'
        WHEN cl.name ~ '\bAS\b' THEN 'AS'
        WHEN cl.name ~ '\bA2\b' THEN 'A2'
        ELSE NULL
    END AS grade_name,
    CASE
        WHEN cl.name ~ '高一' THEN 1
        WHEN cl.name ~ '高二' THEN 2
        WHEN cl.name ~ '高三' THEN 3
        WHEN cl.name ~ '[Gg]rade\s+(\d+)' THEN regexp_replace(cl.name, '.*[Gg]rade\s+(\d+).*', '\1')::INT
        WHEN cl.name ~ '[Yy]ear\s+(\d+)' THEN regexp_replace(cl.name, '.*[Yy]ear\s+(\d+).*', '\1')::INT
        WHEN cl.name ~ 'IGCSE\s+[Yy]ear\s+1' THEN 1
        WHEN cl.name ~ 'IGCSE\s+[Yy]ear\s+2' THEN 2
        WHEN cl.name ~ '\bAS\b' THEN 3
        WHEN cl.name ~ '\bA2\b' THEN 4
        ELSE 0
    END AS year_level,
    '2025-2026' AS academic_year
FROM classes cl
JOIN campuses c ON c.id = cl.campus_id
WHERE cl.campus_id IS NOT NULL
  AND (
    cl.name ~ '高一|高二|高三'
    OR cl.name ~ '[Gg]rade\s+\d+'
    OR cl.name ~ '[Yy]ear\s+\d+'
    OR cl.name ~ 'IGCSE\s+[Yy]ear\s+[12]'
    OR cl.name ~ '\bAS\b'
    OR cl.name ~ '\bA2\b'
  )
ON CONFLICT (campus_id, name, academic_year) DO NOTHING;

-- 7b. Backfill classes.grade_id by matching class name patterns to grades
UPDATE classes cl
SET grade_id = g.id
FROM grades g
JOIN campuses c ON c.id = g.campus_id
WHERE cl.campus_id = g.campus_id
  AND g.academic_year = '2025-2026'
  AND cl.grade_id IS NULL
  AND (
    (g.name = '高一' AND cl.name ~ '高一')
    OR (g.name = '高二' AND cl.name ~ '高二')
    OR (g.name = '高三' AND cl.name ~ '高三')
    OR (g.name ~ '^Grade \d+$' AND cl.name ~ ('.*' || replace(g.name, 'Grade ', '[Gg]rade\s+') || '.*'))
    OR (g.name ~ '^Year \d+$' AND cl.name ~ ('.*' || replace(g.name, 'Year ', '[Yy]ear\s+') || '.*'))
    OR (g.name = 'IGCSE Year 1' AND cl.name ~ 'IGCSE\s+[Yy]ear\s+1')
    OR (g.name = 'IGCSE Year 2' AND cl.name ~ 'IGCSE\s+[Yy]ear\s+2')
    OR (g.name = 'AS' AND cl.name ~ '\bAS\b')
    OR (g.name = 'A2' AND cl.name ~ '\bA2\b')
  );

-- 7c. Backfill users.grade_id for students via class enrollments
UPDATE users u
SET grade_id = cl.grade_id
FROM class_enrollments ce
JOIN classes cl ON cl.id = ce.class_id
WHERE u.id = ce.student_id
  AND ce.status = 'active'
  AND cl.grade_id IS NOT NULL
  AND u.grade_id IS NULL
  AND u.id IN (
    SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'student'
  );

-- 7d. Backfill users.grade_id for teachers via primary class (most students taught)
UPDATE users u
SET grade_id = sub.grade_id
FROM (
    SELECT DISTINCT ON (cl.teacher_id) cl.teacher_id, cl.grade_id
    FROM classes cl
    JOIN class_enrollments ce ON ce.class_id = cl.id AND ce.status = 'active'
    WHERE cl.grade_id IS NOT NULL
    ORDER BY cl.teacher_id, COUNT(ce.id) DESC
) sub
WHERE u.id = sub.teacher_id
  AND u.grade_id IS NULL
  AND u.id IN (
    SELECT ur.user_id FROM user_roles ur WHERE ur.role IN ('teacher', 'ta')
  );

-- 7e. Backfill user_roles.grade_id for gradeadmins
-- Default to first grade in their campus if ambiguous
UPDATE user_roles ur
SET grade_id = g.id
FROM grades g
WHERE ur.campus_id = g.campus_id
  AND ur.role = 'gradeadmin'
  AND ur.grade_id IS NULL
  AND g.academic_year = '2025-2026'
  AND g.id = (
    SELECT MIN(g2.id) FROM grades g2
    WHERE g2.campus_id = ur.campus_id
    AND g2.academic_year = '2025-2026'
  );

COMMIT;
