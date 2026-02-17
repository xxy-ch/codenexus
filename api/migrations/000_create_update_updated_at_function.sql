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
