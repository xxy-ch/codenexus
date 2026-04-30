-- Audit log for control-plane actions (S02: control API + auto-recovery).
-- Append-only: no UPDATE or DELETE expected.
-- Stores action/target/operator/timestamp/result but no secrets or PII.

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    target TEXT NOT NULL,
    action TEXT NOT NULL,
    operator TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('success', 'failure')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for time-range queries and the future GET /api/control/audit-log endpoint.
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log (target);
