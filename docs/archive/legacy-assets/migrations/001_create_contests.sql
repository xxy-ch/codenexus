-- Contest system migrations for Online Judge

-- Create contests table
CREATE TABLE IF NOT EXISTS contests (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    campus_id BIGINT REFERENCES campuses(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rules VARCHAR(50) NOT NULL DEFAULT 'acm', -- 'acm', 'ioi', or 'education'
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    freeze_minutes INTEGER, -- Minutes before end to freeze scoreboard
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_end_after_start CHECK (end_time > start_time),
    CONSTRAINT check_freeze_minutes CHECK (freeze_minutes IS NULL OR freeze_minutes > 0)
);

-- Create index on organization_id for tenant filtering
CREATE INDEX idx_contests_organization_id ON contests(organization_id);
CREATE INDEX idx_contests_campus_id ON contests(campus_id);
CREATE INDEX idx_contests_start_time ON contests(start_time);
CREATE INDEX idx_contests_end_time ON contests(end_time);

-- Create contest_problems table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS contest_problems (
    id BIGSERIAL PRIMARY KEY,
    contest_id BIGINT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 100,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contest_id, problem_id)
);

CREATE INDEX idx_contest_problems_contest_id ON contest_problems(contest_id);
CREATE INDEX idx_contest_problems_problem_id ON contest_problems(problem_id);

-- Create contest_participants table
CREATE TABLE IF NOT EXISTS contest_participants (
    id BIGSERIAL PRIMARY KEY,
    contest_id BIGINT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contest_id, user_id)
);

CREATE INDEX idx_contest_participants_contest_id ON contest_participants(contest_id);
CREATE INDEX idx_contest_participants_user_id ON contest_participants(user_id);

-- Create contest_submissions table (tracks submissions made during contest)
CREATE TABLE IF NOT EXISTS contest_submissions (
    id BIGSERIAL PRIMARY KEY,
    contest_id BIGINT NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    penalty_time INTEGER NOT NULL DEFAULT 0, -- Calculated penalty in minutes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contest_id, submission_id)
);

CREATE INDEX idx_contest_submissions_contest_id ON contest_submissions(contest_id);
CREATE INDEX idx_contest_submissions_submission_id ON contest_submissions(submission_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for contests table
CREATE TRIGGER update_contests_updated_at
    BEFORE UPDATE ON contests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE contests IS 'Competition events with problems and time limits';
COMMENT ON TABLE contest_problems IS 'Problems included in contests';
COMMENT ON TABLE contest_participants IS 'Users registered for contests';
COMMENT ON TABLE contest_submissions IS 'Submissions linked to contest sessions';
COMMENT ON COLUMN contests.freeze_minutes IS 'Minutes before end when scoreboard is frozen (ACM style)';
COMMENT ON COLUMN contest_submissions.penalty_time IS 'Time penalty for wrong submissions (ACM style)';
