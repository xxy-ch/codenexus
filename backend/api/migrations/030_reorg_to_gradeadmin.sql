-- Phase 13: Replace organizationadmin role with gradeadmin
-- Data migration: existing orgadmins become gradeadmins
-- CHECK constraint update for new role name

BEGIN;

-- Migrate existing data: organizationadmin -> gradeadmin
UPDATE user_roles SET role = 'gradeadmin' WHERE role = 'organizationadmin';

-- Update CHECK constraint to reflect new hierarchy
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('root', 'campusadmin', 'gradeadmin', 'teacher', 'teachingassistant', 'student'));

COMMIT;
