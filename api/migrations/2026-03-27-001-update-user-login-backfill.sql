-- Backfill legacy usernames without changing applied migration checksums.
-- This keeps the user login normalization behavior separate from 019.

UPDATE users
SET username = 'user_' || substr(md5(id::text), 1, 8)
WHERE username IS NULL OR username = '';

UPDATE users
SET username = 'user_' || substr(md5(random()::text), 1, 8)
WHERE username IS NULL OR username = '';
