-- Sample data for testing and development
-- This migration inserts example data into the database

-- Insert sample users
INSERT INTO users (email, password_hash, organization_id, campus_id) VALUES
('admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpWMeQJUu', 1, NULL), -- password: admin123
('user@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpWMeQJUu', 1, 1), -- password: admin123
('teacher@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpWMeQJUu', 1, 1) -- password: admin123
ON CONFLICT (email) DO NOTHING;

-- Insert user roles
INSERT INTO user_roles (user_id, role) SELECT id, 'admin' FROM users WHERE email = 'admin@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
INSERT INTO user_roles (user_id, role) SELECT id, 'user' FROM users WHERE email = 'user@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
INSERT INTO user_roles (user_id, role) SELECT id, 'teacher' FROM users WHERE email = 'teacher@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Insert sample problems
INSERT INTO problems (title, description, difficulty, time_limit, memory_limit, created_by, is_public) VALUES
('Two Sum', 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.\n\nExample 1:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].', 'easy', 1000, 128, (SELECT id FROM users WHERE email = 'admin@example.com'), true),
'Add Two Numbers', 'You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.\n\nYou may assume the two numbers do not contain any leading zero, except the number 0 itself.', 'medium', 2000, 256, (SELECT id FROM users WHERE email = 'admin@example.com'), true),
'Longest Substring Without Repeating Characters', 'Given a string s, find the length of the longest substring without repeating characters.', 'medium', 3000, 256, (SELECT id FROM users WHERE email = 'admin@example.com'), true),
'Median of Two Sorted Arrays', 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be O(log (m+n)).', 'hard', 5000, 512, (SELECT id FROM users WHERE email = 'admin@example.com'), true)
ON CONFLICT DO NOTHING;

-- Insert sample test cases for Two Sum problem
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden) VALUES
((SELECT id FROM problems WHERE title = 'Two Sum'), '[2,7,11,15]\n9', '[0,1]', false),
((SELECT id FROM problems WHERE title = 'Two Sum'), '[3,2,4]\n6', '[1,2]', false),
((SELECT id FROM problems WHERE title = 'Two Sum'), '[3,3]\n6', '[0,1]', true)
ON CONFLICT DO NOTHING;

-- Insert sample test cases for Add Two Numbers problem
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden) VALUES
((SELECT id FROM problems WHERE title = 'Add Two Numbers'), '[2,4,3]\n[5,6,4]', '[7,0,8]', false),
((SELECT id FROM problems WHERE title = 'Add Two Numbers'), '[0]\n[0]', '[0]', false),
((SELECT id FROM problems WHERE title = 'Add Two Numbers'), '[9,9,9,9,9,9,9]\n[9,9,9,9]', '[8,9,9,9,0,0,0,1]', true)
ON CONFLICT DO NOTHING;

-- Insert sample contests
INSERT INTO contests (title, description, start_time, end_time, duration_minutes, created_by, is_public, max_participants) VALUES
('Weekly Contest 1', 'Test your coding skills with our weekly programming contest!', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 2 hours', 120, (SELECT id FROM users WHERE email = 'admin@example.com'), true, 100),
('Algorithm Challenge', 'Focus on dynamic programming and greedy algorithms', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 3 hours', 180, (SELECT id FROM users WHERE email = 'admin@example.com'), true, 50)
ON CONFLICT DO NOTHING;

-- Insert contest-problem relationships
INSERT INTO contest_problems (contest_id, problem_id, order_index, points) VALUES
((SELECT id FROM contests WHERE title = 'Weekly Contest 1'), (SELECT id FROM problems WHERE title = 'Two Sum'), 1, 100),
((SELECT id FROM contests WHERE title = 'Weekly Contest 1'), (SELECT id FROM problems WHERE title = 'Add Two Numbers'), 2, 150),
((SELECT id FROM contests WHERE title = 'Algorithm Challenge'), (SELECT id FROM problems WHERE title = 'Longest Substring Without Repeating Characters'), 1, 200),
((SELECT id FROM contests WHERE title = 'Algorithm Challenge'), (SELECT id FROM problems WHERE title = 'Median of Two Sorted Arrays'), 2, 300)
ON CONFLICT DO NOTHING;

-- Insert sample discussions
INSERT INTO discussions (title, content, problem_id, author_id, category, tags, is_pinned) VALUES
('Help with Two Sum problem', 'I am trying to solve the Two Sum problem but getting time limit exceeded. Can someone help me optimize my solution?', (SELECT id FROM problems WHERE title = 'Two Sum'), (SELECT id FROM users WHERE email = 'user@example.com'), 'help', ARRAY['algorithm', 'arrays'], true),
('Best approach for Add Two Numbers', 'What is the most efficient way to solve the Add Two Numbers problem?', (SELECT id FROM problems WHERE title = 'Add Two Numbers'), (SELECT id FROM users WHERE email = 'teacher@example.com'), 'discussion', ARRAY['linked-list', 'math'], false)
ON CONFLICT DO NOTHING;

-- Insert sample blog posts
INSERT INTO blog_posts (title, content, author_id, category, tags, is_published, featured_image, published_at) VALUES
('Getting Started with Online Judge', 'Welcome to our Online Judge platform! This guide will help you get started with solving coding problems and participating in contests.', (SELECT id FROM users WHERE email = 'admin@example.com'), 'tutorial', ARRAY['getting-started', 'guide'], true, 'https://picsum.photos/800/400', NOW()),
('10 Tips for Better Coding Competition Performance', 'Here are 10 essential tips to improve your performance in coding competitions and online judges.', (SELECT id FROM users WHERE email = 'teacher@example.com'), 'tips', ARRAY['competition', 'performance'], true, 'https://picsum.photos/800/401', NOW()),
('Understanding Dynamic Programming', 'Dynamic programming is a powerful technique for solving complex problems. Learn the basics and see examples in this comprehensive guide.', (SELECT id FROM users WHERE email = 'teacher@example.com'), 'algorithms', ARRAY['dynamic-programming', 'algorithms'], true, 'https://picsum.photos/800/402', NOW())
ON CONFLICT DO NOTHING;

-- Insert sample discussion comments
INSERT INTO discussion_comments (discussion_id, author_id, content) VALUES
((SELECT id FROM discussions WHERE title = 'Help with Two Sum problem'), (SELECT id FROM users WHERE email = 'teacher@example.com'), 'Try using a hash map to store the values you have seen so far. This will give you O(n) time complexity.'),
((SELECT id FROM discussions WHERE title = 'Help with Two Sum problem'), (SELECT id FROM users WHERE email = 'user@example.com'), 'Thank you! That solved the problem.')
ON CONFLICT DO NOTHING;

-- Insert sample blog comments
INSERT INTO blog_comments (post_id, author_id, content) VALUES
((SELECT id FROM blog_posts WHERE title = 'Getting Started with Online Judge'), (SELECT id FROM users WHERE email = 'user@example.com'), 'Great introduction! Very helpful for beginners.'),
((SELECT id FROM blog_posts WHERE title = '10 Tips for Better Coding Competition Performance'), (SELECT id FROM users WHERE email = 'user@example.com'), 'Tip #5 about time management is so important!')
ON CONFLICT DO NOTHING;
