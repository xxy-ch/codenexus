-- Persistent token revocation fallback used when Redis is unavailable or disabled.
-- Stores JWT IDs (jti) for access and refresh tokens until their original expiry.

CREATE TABLE IF NOT EXISTS token_revocations (
    jti UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_type TEXT NOT NULL CHECK (token_type IN ('access', 'refresh')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_revocations_user_id
    ON token_revocations(user_id);

CREATE INDEX IF NOT EXISTS idx_token_revocations_expires_at
    ON token_revocations(expires_at);
