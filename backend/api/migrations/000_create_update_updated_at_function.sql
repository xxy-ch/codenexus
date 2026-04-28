-- Ensure pgcrypto extension is available for gen_random_uuid()
-- On PG < 13 this is required; on PG 14+ it's a no-op (already built-in)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create update_updated_at function
-- This function is used by all tables with updated_at timestamp columns
-- Automatically updates updated_at to current timestamp on row update

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
