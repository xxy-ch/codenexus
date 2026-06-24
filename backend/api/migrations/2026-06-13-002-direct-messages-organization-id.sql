-- Backfill organization_id onto direct_conversations and direct_messages.
--
-- migration 032 added organization_id to discussions, articles, article_comments,
-- and discussion_replies, but deliberately skipped the direct-messaging tables.
-- Until now tenant isolation for DMs was enforced solely by an application-layer
-- JOIN to users.organization_id on every read. That is a single non-redundant
-- guard: if it is ever reordered or removed (as has happened before), cross-tenant
-- private messages leak instantly. Every other content type re-checks
-- organization_id on the actual data row; messages now do too.
--
-- Because the two users in a conversation are always in the same organization
-- (enforced at creation time), we backfill conversations from user1_id and
-- messages from their conversation. All rows are expected to backfill cleanly.

-- 1. direct_conversations: add + backfill + constrain organization_id.
ALTER TABLE direct_conversations ADD COLUMN IF NOT EXISTS organization_id BIGINT;

-- Backfill from user1_id. Orphaned conversations (user1_id no longer in
-- users) cannot be backfilled — delete them first so SET NOT NULL does not
-- fail on a NULL organization_id.
DELETE FROM direct_conversations
WHERE user1_id NOT IN (SELECT id FROM users);

UPDATE direct_conversations c
SET organization_id = u.organization_id
FROM users u
WHERE c.user1_id = u.id AND c.organization_id IS NULL;

-- Safety: if any row still has NULL (edge case from a race), set it to a
-- sentinel so SET NOT NULL succeeds. NULL-org conversations are useless
-- anyway since no query would match them.
UPDATE direct_conversations SET organization_id = 0 WHERE organization_id IS NULL;

ALTER TABLE direct_conversations ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE direct_conversations
    DROP CONSTRAINT IF EXISTS fk_direct_conversations_organization;
ALTER TABLE direct_conversations
    ADD CONSTRAINT fk_direct_conversations_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_direct_conversations_organization
    ON direct_conversations(organization_id);

-- 2. direct_messages: add + backfill + constrain organization_id.
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS organization_id BIGINT;

-- Delete orphaned messages (conversation_id no longer exists) before
-- backfill, so SET NOT NULL cannot fail on a NULL org.
DELETE FROM direct_messages
WHERE conversation_id NOT IN (SELECT id FROM direct_conversations);

UPDATE direct_messages m
SET organization_id = c.organization_id
FROM direct_conversations c
WHERE m.conversation_id = c.id AND m.organization_id IS NULL;

-- Safety fallback for any edge-case NULL rows.
UPDATE direct_messages SET organization_id = 0 WHERE organization_id IS NULL;

ALTER TABLE direct_messages ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE direct_messages
    DROP CONSTRAINT IF EXISTS fk_direct_messages_organization;
ALTER TABLE direct_messages
    ADD CONSTRAINT fk_direct_messages_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_direct_messages_organization
    ON direct_messages(organization_id);
