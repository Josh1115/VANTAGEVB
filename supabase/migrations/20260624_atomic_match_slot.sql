-- Replace the two-step SELECT + UPDATE in consume_match_slot with a single atomic
-- UPDATE ... WHERE matches_created < 5 RETURNING, eliminating the TOCTOU race window
-- where two concurrent tabs could both pass the limit check.

CREATE OR REPLACE FUNCTION consume_match_slot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan    text;
  v_created integer;
BEGIN
  SELECT plan INTO v_plan FROM profiles WHERE id = auth.uid();

  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_profile');
  END IF;

  IF v_plan = 'master' THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  IF v_plan = 'inactive' THEN
    RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', 0, 'reason', 'inactive');
  END IF;

  -- Paid plans: unconditionally allowed, no counter
  IF v_plan != 'trial' THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Trial: single atomic increment — only succeeds when under the limit.
  -- No separate SELECT means no race window between the check and the write.
  UPDATE profiles
  SET matches_created = matches_created + 1
  WHERE id = auth.uid()
    AND plan = 'trial'
    AND matches_created < 5
  RETURNING matches_created INTO v_created;

  IF v_created IS NULL THEN
    SELECT matches_created INTO v_created FROM profiles WHERE id = auth.uid();
    RETURN jsonb_build_object('allowed', false, 'used', v_created, 'limit', 5, 'reason', 'trial_limit');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', v_created, 'limit', 5);
END;
$$;
