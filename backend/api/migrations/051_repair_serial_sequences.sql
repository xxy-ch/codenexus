-- Demo/bootstrap data and migration imports may insert explicit BIGSERIAL IDs.
-- Keep all public serial sequences aligned so the next production insert does
-- not collide with existing rows.

DO $$
DECLARE
    r RECORD;
    seq_name TEXT;
    max_id BIGINT;
BEGIN
    FOR r IN
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_default LIKE 'nextval(%'
    LOOP
        seq_name := pg_get_serial_sequence(
            format('%I.%I', r.table_schema, r.table_name),
            r.column_name
        );

        IF seq_name IS NULL THEN
            CONTINUE;
        END IF;

        EXECUTE format(
            'SELECT MAX(%I)::BIGINT FROM %I.%I',
            r.column_name,
            r.table_schema,
            r.table_name
        )
        INTO max_id;

        IF max_id IS NULL THEN
            EXECUTE 'SELECT setval($1::regclass, 1, false)' USING seq_name;
        ELSE
            EXECUTE 'SELECT setval($1::regclass, $2, true)' USING seq_name, max_id;
        END IF;
    END LOOP;
END $$;
