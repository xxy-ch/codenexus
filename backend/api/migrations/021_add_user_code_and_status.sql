ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_code VARCHAR(12),
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_user_code_format_check;

ALTER TABLE users
ADD CONSTRAINT users_user_code_format_check
CHECK (
    user_code IS NULL
    OR user_code ~ '^[0-9]{12}$'
);

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE users
ADD CONSTRAINT users_status_check
CHECK (status IN ('active', 'inactive', 'banned'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_code
ON users(user_code)
WHERE user_code IS NOT NULL;
