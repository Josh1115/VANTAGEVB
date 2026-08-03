-- Public "X programs in Illinois" counter for the login/marketing page.
--
-- profiles has no client-readable SELECT policy for other users' rows, so
-- (same pattern as get_pv_stats / redeem_promo_code) expose a narrow
-- SECURITY DEFINER RPC that returns only a count, never any row data.
-- Excludes plan = 'master' (the dev/admin account) so it doesn't inflate
-- the number of real coach programs by one.

CREATE OR REPLACE FUNCTION get_program_count(p_state text DEFAULT 'IL')
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM profiles
  WHERE school_state = p_state
    AND plan != 'master';
$$;

GRANT EXECUTE ON FUNCTION get_program_count(text) TO anon, authenticated;
