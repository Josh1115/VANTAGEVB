-- Close a TOCTOU race in migrateSharedDb() (AuthContext.jsx): it used to SELECT
-- the backups table to check "does this account already have cloud data?" and
-- then decide whether to migrate a device's pre-account local data into it.
-- Two devices logging into the same shared account (e.g. a multi-coach/multi-team
-- plan) for the very first time, at nearly the same moment, could both see "no
-- data yet" and both proceed — same pattern already fixed for match creation in
-- 20260624_atomic_match_slot.sql.
--
-- claim_migration() replaces that check with a single atomic INSERT ... ON
-- CONFLICT DO NOTHING, which relies on the backups table's unique constraint on
-- user_id: under concurrent calls, only one can ever succeed, no matter how close
-- together they run. The loser gets `false` back and skips migration, exactly
-- like the old "cloud backup already exists" branch.

CREATE OR REPLACE FUNCTION claim_migration()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_claimed_id uuid;
BEGIN
  INSERT INTO backups (user_id, label, payload, created_at)
  VALUES (auth.uid(), 'migration_claim', '{}'::jsonb, now())
  ON CONFLICT (user_id) DO NOTHING
  RETURNING user_id INTO v_claimed_id;

  RETURN v_claimed_id IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_migration() TO authenticated;
