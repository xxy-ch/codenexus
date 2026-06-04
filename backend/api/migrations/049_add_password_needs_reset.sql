-- Add password_needs_reset flag to users table.
-- When a user's password_hash starts with {MD5}, login is rejected and this
-- flag is set so admins can identify accounts requiring a reset.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_needs_reset BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark all existing MD5-hashed users as needing reset.
UPDATE users SET password_needs_reset = true WHERE password_hash LIKE '{MD5}%';
