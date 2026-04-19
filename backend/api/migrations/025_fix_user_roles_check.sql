-- Fix user_roles CHECK constraint to include all canonical roles
-- Previous constraint only had: ('root', 'campusadmin', 'teacher', 'student')
-- Missing: 'organizationadmin', 'teachingassistant'

ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('root', 'organizationadmin', 'campusadmin', 'teacher', 'teachingassistant', 'student'));
