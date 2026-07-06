-- Close the pv_stats public-read hole (2026-07-06 audit) without breaking the
-- no-login FamilyScope flow: parents should still only need the link (token),
-- but right now a caller can drop the token filter and dump every row via a
-- plain REST call, since pv_stats_public_select is `USING (true)`.
--
-- Rollout is staged on purpose: this migration only ADDS the safe read path
-- (get_pv_stats) and leaves pv_stats_public_select in place, so any client
-- still on the old bundle keeps working. A follow-up migration drops the old
-- policy once the new frontend has had time to roll out to active devices.
--
-- The live-update side (currently Postgres Changes, which is authorized off
-- this same SELECT policy) is being replaced client-side by Realtime
-- Broadcast on a channel named after the token — pub/sub by channel name, not
-- RLS — so it keeps working once the old policy is dropped too.

CREATE OR REPLACE FUNCTION get_pv_stats(p_token text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'token', token,
    'team_name', team_name,
    'payload', payload,
    'live_score', live_score,
    'updated_at', updated_at
  )
  FROM pv_stats
  WHERE token = p_token;
$$;

GRANT EXECUTE ON FUNCTION get_pv_stats(text) TO anon, authenticated;
