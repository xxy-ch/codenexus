CREATE TABLE IF NOT EXISTS judge_language_settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE,
    c_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    cpp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT judge_language_settings_singleton CHECK (id = TRUE)
);

INSERT INTO judge_language_settings (id, c_enabled, cpp_enabled)
VALUES (TRUE, FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER update_judge_language_settings_updated_at
    BEFORE UPDATE ON judge_language_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
