-- Problems and Test Cases migration for Online Judge

-- Create problems table
CREATE TABLE IF NOT EXISTS problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(50) NOT NULL DEFAULT 'medium', -- 'easy', 'medium', 'hard', 'expert'
    time_limit INTEGER NOT NULL DEFAULT 5000, -- milliseconds
    memory_limit INTEGER NOT NULL DEFAULT 256, -- MB
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    is_public BOOLEAN NOT NULL DEFAULT false,
    visibility VARCHAR(50) NOT NULL DEFAULT 'private', -- 'global', 'school', 'campus', 'class', 'private'
    tags TEXT[], -- Array of tags for categorization
    source_url TEXT, -- Original source URL if applicable
    author_note TEXT, -- Notes for other teachers
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    CONSTRAINT valid_visibility CHECK (visibility IN ('global', 'school', 'campus', 'class', 'private')),
    CONSTRAINT valid_time_limit CHECK (time_limit > 0 AND time_limit <= 60000),
    CONSTRAINT valid_memory_limit CHECK (memory_limit > 0 AND memory_limit <= 4096)
);

-- Create indexes for problems
CREATE INDEX idx_problems_organization_id ON problems(organization_id);
CREATE INDEX idx_problems_created_by ON problems(created_by);
CREATE INDEX idx_problems_difficulty ON problems(difficulty);
CREATE INDEX idx_problems_visibility ON problems(visibility);
CREATE INDEX idx_problems_is_public ON problems(is_public);
CREATE INDEX idx_problems_tags ON problems USING GIN(tags);
CREATE INDEX idx_problems_created_at ON problems(created_at DESC);

-- Full-text search on title and description
CREATE INDEX idx_problems_title_search ON problems USING GIN(to_tsvector('english', title));
CREATE INDEX idx_problems_description_search ON problems USING GIN(to_tsvector('english', description));

-- Create problems_test_cases table
CREATE TABLE IF NOT EXISTS problems_test_cases (
    id BIGSERIAL PRIMARY KEY,
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT false, -- Hidden from students
    is_sample BOOLEAN NOT NULL DEFAULT false, -- Sample test case shown to students
    score INTEGER NOT NULL DEFAULT 10,
    order_index INTEGER NOT NULL DEFAULT 0,
    explanation TEXT, -- Explanation for the test case
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_score CHECK (score >= 0),
    CONSTRAINT valid_order CHECK (order_index >= 0)
);

-- Create indexes for test cases
CREATE INDEX idx_test_cases_problem_id ON problems_test_cases(problem_id);
CREATE INDEX idx_test_cases_order ON problems_test_cases(problem_id, order_index);
CREATE INDEX idx_test_cases_hidden ON problems_test_cases(is_hidden);
CREATE INDEX idx_test_cases_sample ON problems_test_cases(is_sample);

-- Create problem_languages table (language-specific limits)
CREATE TABLE IF NOT EXISTS problem_languages (
    id BIGSERIAL PRIMARY KEY,
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL, -- 'python3', 'c', 'cpp', 'java'
    time_limit INTEGER, -- Override default time limit
    memory_limit INTEGER, -- Override default memory limit
    compiler_flags TEXT, -- Additional compiler flags
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(problem_id, language)
);

CREATE INDEX idx_problem_languages_problem_id ON problem_languages(problem_id);
CREATE INDEX idx_problem_languages_language ON problem_languages(language);

-- Create problem_statistics table (denormalized for performance)
CREATE TABLE IF NOT EXISTS problem_statistics (
    problem_id UUID PRIMARY KEY REFERENCES problems(id) ON DELETE CASCADE,
    total_submissions BIGINT NOT NULL DEFAULT 0,
    accepted_submissions BIGINT NOT NULL DEFAULT 0,
    acceptance_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_submissions > 0
        THEN (accepted_submissions::DECIMAL / total_submissions::DECIMAL) * 100
        ELSE 0
    END) STORED,
    fastest_submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    fastest_time_ms INTEGER, -- Fastest AC time in milliseconds
    first_solver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    first_solved_at TIMESTAMPTZ,
    last_solved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_problem_statistics_total_submissions ON problem_statistics(total_submissions DESC);

-- Create problem_versions table (immutable test cases)
CREATE TABLE IF NOT EXISTS problem_versions (
    id BIGSERIAL PRIMARY KEY,
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    time_limit INTEGER NOT NULL,
    memory_limit INTEGER NOT NULL,
    test_cases_snapshot JSONB NOT NULL, -- Snapshot of test cases at this version
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_version CHECK (version > 0),
    UNIQUE(problem_id, version)
);

CREATE INDEX idx_problem_versions_problem_id ON problem_versions(problem_id);
CREATE INDEX idx_problem_versions_version ON problem_versions(problem_id, version DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_problems_updated_at
    BEFORE UPDATE ON problems
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_cases_updated_at
    BEFORE UPDATE ON problems_test_cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statistics_updated_at
    BEFORE UPDATE ON problem_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create initial statistics when problem is created
CREATE OR REPLACE FUNCTION create_problem_statistics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO problem_statistics (problem_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_problem_statistics_trigger
    AFTER INSERT ON problems
    FOR EACH ROW
    EXECUTE FUNCTION create_problem_statistics();

-- Comments for documentation
COMMENT ON TABLE problems IS 'Programming problems with test cases';
COMMENT ON TABLE problems_test_cases IS 'Test cases for problems, can be hidden from students';
COMMENT ON TABLE problem_languages IS 'Language-specific limits and configuration';
COMMENT ON TABLE problem_statistics IS 'Denormalized statistics for performance';
COMMENT ON TABLE problem_versions IS 'Immutable versions of problems with test cases';

COMMENT ON COLUMN problems.visibility IS 'Visibility scope: global, school, campus, class, private';
COMMENT ON COLUMN problems_test_cases.is_hidden IS 'Hidden from students (used in contests)';
COMMENT ON COLUMN problems_test_cases.is_sample IS 'Sample test case visible to students';
COMMENT ON COLUMN problem_statistics.fastest_time_ms IS 'Fastest accepted submission time';
COMMENT ON COLUMN problem_statistics.first_solver_id IS 'First user to solve the problem';
