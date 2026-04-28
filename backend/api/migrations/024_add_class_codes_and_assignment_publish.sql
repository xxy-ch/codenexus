ALTER TABLE classes
ADD COLUMN IF NOT EXISTS code TEXT;

UPDATE classes
SET code = CONCAT('CLS', LPAD(id::text, 6, '0'))
WHERE code IS NULL;

ALTER TABLE classes
ALTER COLUMN code SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'classes_code_key'
    ) THEN
        ALTER TABLE classes
        ADD CONSTRAINT classes_code_key UNIQUE (code);
    END IF;
END $$;

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
