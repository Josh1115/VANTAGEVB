-- Harden pv_stats: add ownership + live score column, restrict writes to authenticated owners.
--
-- coach_user_id: set automatically on INSERT via trigger; UPDATE restricted to owner.
-- live_score:    lightweight score state written after each point (replaces broadcast channel).
-- Legacy rows (coach_user_id IS NULL) remain updatable by any authenticated user until
-- the coach next publishes, at which point ownership is stamped.

ALTER TABLE pv_stats ADD COLUMN IF NOT EXISTS coach_user_id uuid REFERENCES auth.users(id);
ALTER TABLE pv_stats ADD COLUMN IF NOT EXISTS live_score jsonb;

-- Drop the fully-open policies
DROP POLICY IF EXISTS "pv_stats_public_insert" ON pv_stats;
DROP POLICY IF EXISTS "pv_stats_public_update" ON pv_stats;

-- INSERT: authenticated users only (trigger sets coach_user_id)
CREATE POLICY "pv_stats_auth_insert" ON pv_stats
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: owner only; legacy rows (NULL owner) accepted until re-stamped
CREATE POLICY "pv_stats_owner_update" ON pv_stats
  FOR UPDATE TO authenticated
  USING (coach_user_id IS NULL OR coach_user_id = auth.uid());

-- Trigger: stamp coach_user_id from JWT on every INSERT
CREATE OR REPLACE FUNCTION set_pv_stats_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.coach_user_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pv_stats_set_owner ON pv_stats;
CREATE TRIGGER pv_stats_set_owner
  BEFORE INSERT ON pv_stats
  FOR EACH ROW EXECUTE FUNCTION set_pv_stats_owner();

-- Enable Postgres Changes (Realtime) for this table
ALTER PUBLICATION supabase_realtime ADD TABLE pv_stats;
