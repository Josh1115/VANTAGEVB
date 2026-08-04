-- Include the master/admin account in the public "X programs in Illinois"
-- counter after all — it's a real coach program too, just one Vantage
-- treats as unlimited/comped. Previously excluded via `plan != 'master'`.

CREATE OR REPLACE FUNCTION get_program_count(p_state text DEFAULT 'IL')
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM profiles
  WHERE school_state = p_state;
$$;

GRANT EXECUTE ON FUNCTION get_program_count(text) TO anon, authenticated;
