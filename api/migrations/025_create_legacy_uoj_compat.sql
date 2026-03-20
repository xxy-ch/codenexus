-- Preserve legacy UOJ-only fields and unsupported entities without polluting
-- the current UUID-based business schema.
--
-- Strategy:
-- 1. Keep current login / auth / runtime tables unchanged.
-- 2. Store legacy identifiers and old-only attributes in legacy_uoj_* tables.
-- 3. Allow migration scripts to map old usernames / numeric ids onto new UUID ids.

CREATE TABLE IF NOT EXISTS legacy_uoj_users (
    legacy_username VARCHAR(20) PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    legacy_usergroup CHAR(1) NOT NULL DEFAULT 'U',
    legacy_password_md5 CHAR(32) NOT NULL,
    legacy_svn_password CHAR(10),
    legacy_rating INTEGER NOT NULL DEFAULT 1500,
    legacy_qq BIGINT,
    legacy_sex CHAR(1) NOT NULL DEFAULT 'U',
    legacy_ac_num INTEGER NOT NULL DEFAULT 0,
    legacy_register_time TIMESTAMPTZ,
    legacy_remote_addr VARCHAR(50),
    legacy_http_x_forwarded_for VARCHAR(50),
    legacy_remember_token VARCHAR(60),
    legacy_motto VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_users_user_id
    ON legacy_uoj_users(user_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_problems (
    legacy_problem_id BIGINT PRIMARY KEY,
    problem_id BIGINT UNIQUE REFERENCES problems(id) ON DELETE SET NULL,
    legacy_is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    legacy_submission_requirement TEXT,
    legacy_hackable BOOLEAN NOT NULL DEFAULT FALSE,
    legacy_extra_config TEXT,
    legacy_zan INTEGER NOT NULL DEFAULT 0,
    legacy_ac_num INTEGER NOT NULL DEFAULT 0,
    legacy_submit_num INTEGER NOT NULL DEFAULT 0,
    legacy_statement_html TEXT,
    legacy_statement_md TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_problems_problem_id
    ON legacy_uoj_problems(problem_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_problem_tags (
    id BIGSERIAL PRIMARY KEY,
    legacy_problem_id BIGINT NOT NULL,
    problem_id BIGINT REFERENCES problems(id) ON DELETE SET NULL,
    tag VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(legacy_problem_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_problem_tags_problem_id
    ON legacy_uoj_problem_tags(problem_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_problem_permissions (
    legacy_problem_id BIGINT NOT NULL,
    problem_id BIGINT REFERENCES problems(id) ON DELETE SET NULL,
    legacy_username VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (legacy_problem_id, legacy_username)
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_problem_permissions_problem_id
    ON legacy_uoj_problem_permissions(problem_id);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_problem_permissions_user_id
    ON legacy_uoj_problem_permissions(user_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_submissions (
    legacy_submission_id BIGINT PRIMARY KEY,
    submission_id BIGINT UNIQUE REFERENCES submissions(id) ON DELETE SET NULL,
    legacy_problem_id BIGINT NOT NULL,
    problem_id BIGINT REFERENCES problems(id) ON DELETE SET NULL,
    legacy_contest_id BIGINT,
    contest_id BIGINT REFERENCES contests(id) ON DELETE SET NULL,
    legacy_submitter VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legacy_tot_size INTEGER NOT NULL DEFAULT 0,
    legacy_judge_time TIMESTAMPTZ,
    legacy_result_raw BYTEA,
    legacy_status VARCHAR(20) NOT NULL,
    legacy_result_error VARCHAR(20),
    legacy_score INTEGER,
    legacy_used_time INTEGER NOT NULL DEFAULT 0,
    legacy_used_memory INTEGER NOT NULL DEFAULT 0,
    legacy_is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    legacy_status_details VARCHAR(100) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_submissions_submission_id
    ON legacy_uoj_submissions(submission_id);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_submissions_user_id
    ON legacy_uoj_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_submissions_problem_id
    ON legacy_uoj_submissions(problem_id);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_submissions_contest_id
    ON legacy_uoj_submissions(contest_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_contests (
    legacy_contest_id BIGINT PRIMARY KEY,
    contest_id BIGINT UNIQUE REFERENCES contests(id) ON DELETE SET NULL,
    legacy_last_min INTEGER NOT NULL,
    legacy_player_num INTEGER NOT NULL DEFAULT 0,
    legacy_status VARCHAR(50) NOT NULL,
    legacy_extra_config TEXT NOT NULL,
    legacy_zan INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_contests_contest_id
    ON legacy_uoj_contests(contest_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_contest_registrations (
    legacy_contest_id BIGINT NOT NULL,
    contest_id BIGINT REFERENCES contests(id) ON DELETE SET NULL,
    legacy_username VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legacy_user_rating INTEGER NOT NULL DEFAULT 0,
    legacy_has_participated BOOLEAN NOT NULL DEFAULT FALSE,
    legacy_rank INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (legacy_contest_id, legacy_username)
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_contest_registrations_contest_id
    ON legacy_uoj_contest_registrations(contest_id);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_contest_registrations_user_id
    ON legacy_uoj_contest_registrations(user_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_contest_permissions (
    legacy_contest_id BIGINT NOT NULL,
    contest_id BIGINT REFERENCES contests(id) ON DELETE SET NULL,
    legacy_username VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (legacy_contest_id, legacy_username)
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_contest_permissions_contest_id
    ON legacy_uoj_contest_permissions(contest_id);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_contest_permissions_user_id
    ON legacy_uoj_contest_permissions(user_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_contest_submission_details (
    id BIGSERIAL PRIMARY KEY,
    legacy_contest_id BIGINT NOT NULL,
    contest_id BIGINT REFERENCES contests(id) ON DELETE SET NULL,
    legacy_username VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legacy_problem_id BIGINT NOT NULL,
    problem_id BIGINT REFERENCES problems(id) ON DELETE SET NULL,
    legacy_submission_id BIGINT NOT NULL,
    submission_id BIGINT REFERENCES submissions(id) ON DELETE SET NULL,
    legacy_score INTEGER NOT NULL DEFAULT 0,
    legacy_penalty INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (legacy_contest_id, legacy_username, legacy_problem_id)
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_contest_submission_details_contest_id
    ON legacy_uoj_contest_submission_details(contest_id);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_contest_submission_details_submission_id
    ON legacy_uoj_contest_submission_details(submission_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_articles (
    legacy_blog_id BIGINT PRIMARY KEY,
    article_id BIGINT UNIQUE REFERENCES articles(id) ON DELETE SET NULL,
    legacy_title TEXT NOT NULL,
    legacy_content_html TEXT NOT NULL,
    legacy_content_md TEXT NOT NULL,
    legacy_post_time TIMESTAMPTZ NOT NULL,
    legacy_poster VARCHAR(20) NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legacy_zan INTEGER NOT NULL DEFAULT 0,
    legacy_is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    legacy_type CHAR(1) NOT NULL DEFAULT 'B',
    legacy_is_draft BOOLEAN NOT NULL DEFAULT FALSE,
    legacy_important_level INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_articles_article_id
    ON legacy_uoj_articles(article_id);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_articles_author_id
    ON legacy_uoj_articles(author_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_article_tags (
    id BIGSERIAL PRIMARY KEY,
    legacy_blog_id BIGINT NOT NULL,
    article_id BIGINT REFERENCES articles(id) ON DELETE SET NULL,
    tag VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (legacy_blog_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_article_tags_article_id
    ON legacy_uoj_article_tags(article_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_article_comments (
    legacy_comment_id BIGINT PRIMARY KEY,
    article_comment_id BIGINT UNIQUE REFERENCES article_comments(id) ON DELETE SET NULL,
    legacy_blog_id BIGINT NOT NULL,
    article_id BIGINT REFERENCES articles(id) ON DELETE SET NULL,
    legacy_reply_id BIGINT NOT NULL DEFAULT 0,
    parent_comment_id BIGINT REFERENCES article_comments(id) ON DELETE SET NULL,
    legacy_poster VARCHAR(20) NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legacy_content TEXT NOT NULL,
    legacy_post_time TIMESTAMPTZ NOT NULL,
    legacy_zan INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_article_comments_article_id
    ON legacy_uoj_article_comments(article_id);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_article_comments_author_id
    ON legacy_uoj_article_comments(author_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_click_zans (
    raw_type CHAR(2) NOT NULL,
    legacy_target_id BIGINT NOT NULL,
    legacy_username VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    val SMALLINT NOT NULL DEFAULT 1,
    mapped_target_type VARCHAR(50),
    mapped_target_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (raw_type, legacy_target_id, legacy_username)
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_click_zans_user_id
    ON legacy_uoj_click_zans(user_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_notifications (
    legacy_system_msg_id BIGINT PRIMARY KEY,
    notification_id UUID UNIQUE,
    legacy_receiver VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legacy_title VARCHAR(100) NOT NULL,
    legacy_content VARCHAR(300) NOT NULL,
    legacy_send_time TIMESTAMPTZ NOT NULL,
    legacy_read_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_notifications_user_id
    ON legacy_uoj_notifications(user_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_private_messages (
    legacy_message_id BIGINT PRIMARY KEY,
    conversation_id UUID REFERENCES direct_conversations(id) ON DELETE SET NULL,
    direct_message_id UUID UNIQUE REFERENCES direct_messages(id) ON DELETE SET NULL,
    legacy_sender VARCHAR(20) NOT NULL,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legacy_receiver VARCHAR(20) NOT NULL,
    receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legacy_message VARCHAR(5000) NOT NULL,
    legacy_send_time TIMESTAMPTZ NOT NULL,
    legacy_read_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_private_messages_conversation_id
    ON legacy_uoj_private_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_private_messages_sender_id
    ON legacy_uoj_private_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_private_messages_receiver_id
    ON legacy_uoj_private_messages(receiver_id);

CREATE TABLE IF NOT EXISTS legacy_uoj_hacks (
    legacy_hack_id BIGINT PRIMARY KEY,
    legacy_problem_id BIGINT NOT NULL,
    problem_id BIGINT REFERENCES problems(id) ON DELETE SET NULL,
    legacy_contest_id BIGINT,
    contest_id BIGINT REFERENCES contests(id) ON DELETE SET NULL,
    legacy_submission_id BIGINT NOT NULL,
    submission_id BIGINT REFERENCES submissions(id) ON DELETE SET NULL,
    legacy_hacker VARCHAR(20) NOT NULL,
    hacker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legacy_owner VARCHAR(20) NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legacy_input VARCHAR(150) NOT NULL,
    legacy_input_type VARCHAR(20) NOT NULL,
    legacy_submit_time TIMESTAMPTZ NOT NULL,
    legacy_judge_time TIMESTAMPTZ,
    legacy_success BOOLEAN,
    legacy_details_raw BYTEA,
    legacy_is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legacy_uoj_best_ac_submissions (
    legacy_problem_id BIGINT NOT NULL,
    problem_id BIGINT REFERENCES problems(id) ON DELETE SET NULL,
    legacy_submitter VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legacy_submission_id BIGINT NOT NULL,
    submission_id BIGINT REFERENCES submissions(id) ON DELETE SET NULL,
    legacy_used_time INTEGER NOT NULL DEFAULT 0,
    legacy_used_memory INTEGER NOT NULL DEFAULT 0,
    legacy_tot_size INTEGER NOT NULL DEFAULT 0,
    legacy_shortest_id BIGINT NOT NULL,
    legacy_shortest_submission_id BIGINT REFERENCES submissions(id) ON DELETE SET NULL,
    legacy_shortest_used_time INTEGER NOT NULL DEFAULT 0,
    legacy_shortest_used_memory INTEGER NOT NULL DEFAULT 0,
    legacy_shortest_tot_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (legacy_problem_id, legacy_submitter)
);

CREATE TABLE IF NOT EXISTS legacy_uoj_contest_asks (
    legacy_ask_id BIGINT PRIMARY KEY,
    legacy_contest_id BIGINT NOT NULL,
    contest_id BIGINT REFERENCES contests(id) ON DELETE SET NULL,
    legacy_username VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legacy_question TEXT NOT NULL,
    legacy_answer TEXT NOT NULL,
    legacy_post_time TIMESTAMPTZ NOT NULL,
    legacy_reply_time TIMESTAMPTZ,
    legacy_is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legacy_uoj_contest_notices (
    id BIGSERIAL PRIMARY KEY,
    legacy_contest_id BIGINT NOT NULL,
    contest_id BIGINT REFERENCES contests(id) ON DELETE SET NULL,
    legacy_title VARCHAR(30) NOT NULL,
    legacy_content VARCHAR(500) NOT NULL,
    legacy_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legacy_uoj_custom_test_submissions (
    legacy_custom_test_submission_id BIGINT PRIMARY KEY,
    legacy_problem_id BIGINT NOT NULL,
    problem_id BIGINT REFERENCES problems(id) ON DELETE SET NULL,
    legacy_submitter VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legacy_submit_time TIMESTAMPTZ NOT NULL,
    legacy_content TEXT NOT NULL,
    legacy_judge_time TIMESTAMPTZ,
    legacy_result_raw BYTEA,
    legacy_status VARCHAR(20) NOT NULL,
    legacy_status_details VARCHAR(100) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legacy_uoj_judger_info (
    legacy_judger_name VARCHAR(50) PRIMARY KEY,
    legacy_password VARCHAR(50) NOT NULL,
    legacy_ip VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legacy_uoj_search_requests (
    legacy_search_request_id BIGINT PRIMARY KEY,
    legacy_created_at TIMESTAMPTZ NOT NULL,
    legacy_remote_addr VARCHAR(50) NOT NULL,
    legacy_type VARCHAR(20) NOT NULL,
    legacy_cache_id INTEGER NOT NULL DEFAULT 0,
    legacy_query VARCHAR(100) NOT NULL,
    legacy_content TEXT NOT NULL,
    legacy_result TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_search_requests_created_at
    ON legacy_uoj_search_requests(legacy_created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_search_requests_remote_addr
    ON legacy_uoj_search_requests(legacy_remote_addr);

CREATE TABLE IF NOT EXISTS legacy_uoj_pastes (
    legacy_paste_index VARCHAR(20) PRIMARY KEY,
    legacy_creator VARCHAR(20),
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legacy_created_at TIMESTAMPTZ,
    legacy_content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_pastes_creator_id
    ON legacy_uoj_pastes(creator_id);

CREATE INDEX IF NOT EXISTS idx_legacy_uoj_pastes_created_at
    ON legacy_uoj_pastes(legacy_created_at DESC);
