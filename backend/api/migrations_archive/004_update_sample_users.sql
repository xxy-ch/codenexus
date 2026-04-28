-- Update sample data to use numeric usernames
-- This migration updates existing users and adds new ones with numeric usernames

-- Update existing users to have numeric usernames
UPDATE users SET username = '1001' WHERE email = 'admin@example.com' AND username IS NULL;
UPDATE users SET username = '1002' WHERE email = 'user@example.com' AND username IS NULL;
UPDATE users SET username = '1003' WHERE email = 'teacher@example.com' AND username IS NULL;

-- Set display names
UPDATE users SET display_name = '管理员' WHERE username = '1001' AND display_name IS NULL;
UPDATE users SET display_name = '普通用户' WHERE username = '1002' AND display_name IS NULL;
UPDATE users SET display_name = '教师用户' WHERE username = '1003' AND display_name IS NULL;

-- Insert additional sample users with numeric usernames
INSERT INTO users (username, email, password_hash, display_name, organization_id, campus_id)
VALUES
('2001', 'student1@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpWMeQJUu', '学生用户1', 1, 1),
('2002', 'student2@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpWMeQJUu', '学生用户2', 1, 1),
('3001', NULL, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpWMeQJUu', '访客用户1', 1, NULL)
ON CONFLICT (username) DO NOTHING;

-- Assign roles to new users
INSERT INTO user_roles (user_id, role)
SELECT id, 'user' FROM users WHERE username IN ('2001', '2002', '3001')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create a sequence for auto-generating numeric usernames
CREATE SEQUENCE IF NOT EXISTS username_sequence START WITH 4001;

-- Function to get next available username
CREATE OR REPLACE FUNCTION get_next_username() RETURNS TEXT AS $$
BEGIN
    RETURN 'U' || nextval('username_sequence');
END;
$$ LANGUAGE plpgsql;
