ALTER TABLE contest_problems
ADD COLUMN IF NOT EXISTS category VARCHAR(80) NOT NULL DEFAULT '默认';

CREATE INDEX IF NOT EXISTS idx_contest_problems_category
ON contest_problems(contest_id, category, order_index);
