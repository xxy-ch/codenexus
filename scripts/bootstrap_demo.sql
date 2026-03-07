-- Idempotent demo data bootstrap for local delivery verification.
-- Usage:
--   psql "$DATABASE_URL" -f scripts/bootstrap_demo.sql

INSERT INTO organizations (id, name, slug)
VALUES (1, 'Demo School', 'demo-school')
ON CONFLICT (id) DO NOTHING;

INSERT INTO campuses (id, organization_id, name, slug)
VALUES (1, 1, 'Main Campus', 'main')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, username, email, password_hash, display_name, organization_id, campus_id)
VALUES
  ('11111111-1111-1111-1111-111111111111', '1001', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpWMeQJUu', '管理员', 1, 1),
  ('22222222-2222-2222-2222-222222222222', '2001', 'student1@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpWMeQJUu', '学生甲', 1, 1),
  ('33333333-3333-3333-3333-333333333333', '2002', 'student2@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpWMeQJUu', '学生乙', 1, 1),
  ('44444444-4444-4444-4444-444444444444', '3001', 'teacher@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpWMeQJUu', '教师用户', 1, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, organization_id, campus_id, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 1, 1, 'root'),
  ('22222222-2222-2222-2222-222222222222', 1, 1, 'student'),
  ('33333333-3333-3333-3333-333333333333', 1, 1, 'student'),
  ('44444444-4444-4444-4444-444444444444', 1, 1, 'teacher')
ON CONFLICT (user_id, organization_id, campus_id) DO NOTHING;

INSERT INTO direct_conversations (id, user1_id, user2_id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

INSERT INTO direct_messages (id, conversation_id, sender_id, content, read_at)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '欢迎来到 Online Judge。', NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', '收到，开始验收。', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO plagiarism_scan_configs (
  id,
  enabled,
  language,
  threshold,
  min_token_length,
  window_size,
  ignore_comments,
  ignore_whitespace,
  max_reports_per_run
)
VALUES (1, TRUE, 'all', 0.85, 5, 30, TRUE, TRUE, 100)
ON CONFLICT (id) DO NOTHING;

INSERT INTO classes (id, organization_id, campus_id, name, teacher_id, semester)
VALUES (1, 1, 1, '示范班级', '44444444-4444-4444-4444-444444444444', '2026 Spring')
ON CONFLICT (id) DO NOTHING;

INSERT INTO class_enrollments (class_id, student_id)
VALUES
  (1, '22222222-2222-2222-2222-222222222222'),
  (1, '33333333-3333-3333-3333-333333333333')
ON CONFLICT (class_id, student_id) DO NOTHING;

INSERT INTO problems (
  id,
  organization_id,
  campus_id,
  author_id,
  title,
  description,
  difficulty,
  visibility,
  time_limit_ms,
  memory_limit_kb
)
VALUES
  (
    1,
    1,
    1,
    '44444444-4444-4444-4444-444444444444',
    'Two Sum',
    'Given an array of integers and a target, return the indices of the two numbers that add up to the target.',
    'easy',
    'public',
    1000,
    262144
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO discussions (id, problem_id, user_id, content, is_pinned)
VALUES
  (
    1,
    1,
    '22222222-2222-2222-2222-222222222222',
    'Two Sum 这题可以先用哈希表记录已经出现过的数字，再在一次遍历里找补数。',
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO submissions (
  id,
  organization_id,
  user_id,
  problem_id,
  language,
  code,
  status,
  verdict,
  time_ms,
  memory_kb
)
VALUES
  (
    1,
    1,
    '22222222-2222-2222-2222-222222222222',
    1,
    'python3',
    'nums = [2, 7, 11, 15]\nprint([0, 1])',
    'judged',
    'ac',
    12,
    8192
  ),
  (
    2,
    1,
    '33333333-3333-3333-3333-333333333333',
    1,
    'python3',
    'nums = [2, 7, 11, 15]\nprint([0, 1])',
    'judged',
    'ac',
    15,
    9216
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO plagiarism_scan_reports (
  id,
  contest_id,
  assignment_id,
  status,
  overall_risk,
  total_submissions,
  suspicious_pairs,
  finished_at
)
VALUES
  (
    'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb',
    NULL,
    'assignment-demo-1',
    'completed',
    'medium',
    2,
    1,
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO plagiarism_scan_pairs (
  report_id,
  left_submission_id,
  right_submission_id,
  left_user,
  right_user,
  similarity,
  matched_lines
)
VALUES
  (
    'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb',
    '1',
    '2',
    '学生甲',
    '学生乙',
    0.91,
    24
  )
ON CONFLICT DO NOTHING;
