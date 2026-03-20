-- Align runtime tables with fields already used by the API and with
-- high-value data preserved from the customized legacy UOJ schema.

ALTER TABLE problems
ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS author_note TEXT;

CREATE INDEX IF NOT EXISTS idx_problems_tags
ON problems USING GIN(tags);

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS score INTEGER;

ALTER TABLE submissions
DROP CONSTRAINT IF EXISTS submissions_language_check;

ALTER TABLE submissions
ADD CONSTRAINT submissions_language_check
CHECK (
    language IN (
        'python',
        'python3',
        'c',
        'cpp',
        'c++',
        'java',
        'go',
        'rust',
        'javascript',
        'typescript',
        'ruby',
        'php'
    )
);
