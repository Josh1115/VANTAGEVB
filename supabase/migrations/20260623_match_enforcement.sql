-- Server-side trial match limit enforcement.
--
-- Adds a matches_created counter to profiles (incremented by the RPC below).
-- The client calls consume_match_slot() before creating a match in IndexedDB.
-- Because this runs inside Postgres with SECURITY DEFINER, no client-side
-- manipulation can affect the result.
--
-- Only trial users are blocked here. Paid plans are already paid for;
-- their 50/season cap remains a client-side courtesy limit.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matches_created integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION consume_match_slot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan    text;
  v_created integer;
  v_limit   integer := 5;
BEGIN
  SELECT plan, COALESCE(matches_created, 0)
  INTO v_plan, v_created
  FROM profiles WHERE id = auth.uid();

  -- No profile row yet (shouldn't happen, but be safe)
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_profile');
  END IF;

  -- Master: unlimited
  IF v_plan = 'master' THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Inactive (expired or no plan): blocked
  IF v_plan = 'inactive' THEN
    RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', 0, 'reason', 'inactive');
  END IF;

  -- Trial: enforce 5-match limit atomically
  IF v_plan = 'trial' THEN
    IF v_created >= v_limit THEN
      RETURN jsonb_build_object('allowed', false, 'used', v_created, 'limit', v_limit, 'reason', 'trial_limit');
    END IF;
    UPDATE profiles SET matches_created = matches_created + 1 WHERE id = auth.uid();
    RETURN jsonb_build_object('allowed', true, 'used', v_created + 1, 'limit', v_limit);
  END IF;

  -- Any active paid plan: allow
  RETURN jsonb_build_object('allowed', true);
END;
$$;
