-- Update user login system to use UUID + password
-- Email becomes optional, UUID (numeric) becomes the primary login

-- Add username column (will store numeric UUID for login)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(20) UNIQUE;

-- Make email nullable and optional
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN email SET DEFAULT NULL;

-- Add unique constraint on username if not exists
DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
END $$;

-- Create index on username for fast login lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update existing users to have numeric usernames (based on their UUID)
UPDATE users SET username = CONVERT_TO(id::text, 'UTF8') WHERE username IS NULL;

-- For existing users without proper format, generate numeric usernames
UPDATE users SET username = 'user_' || substr(md5(random()::text), 1, 8)
WHERE username IS NULL OR username = '';

-- Add display_name column for user-friendly name
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- Set display_name from existing data or use username as fallback
UPDATE users SET display_name = username WHERE display_name IS NULL;
