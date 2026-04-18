-- Fix user_roles UNIQUE constraint to handle NULL campus_id correctly.
--
-- Problem: UNIQUE(user_id, organization_id, campus_id) treats NULLs as distinct
-- in PostgreSQL, so two rows with same user_id + org_id + NULL campus_id are NOT
-- considered conflicting. This allows duplicate role assignments on migration re-runs.
--
-- Fix: Replace with a unique index using COALESCE so NULL campus_id maps to 0,
-- making conflict detection work for all cases.

BEGIN;

-- Drop the existing UNIQUE constraint (auto-named by PostgreSQL)
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_organization_id_campus_id_key;

-- Create unique index that handles NULL campus_id via COALESCE
-- campus_id NULL -> treated as 0 for uniqueness purposes
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_unique
    ON user_roles (user_id, organization_id, COALESCE(campus_id, 0));

-- Clean up any existing duplicates that may have been inserted before this fix
-- Keep the earliest row per (user_id, organization_id, effective_campus) and delete the rest
DELETE FROM user_roles a USING user_roles b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.organization_id = b.organization_id
  AND COALESCE(a.campus_id, 0) = COALESCE(b.campus_id, 0);

COMMIT;
