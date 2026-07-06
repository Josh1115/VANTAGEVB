-- Step 2 of the pv_stats exposure fix (see 20260706_pv_stats_get_rpc.sql).
-- The frontend no longer reads pv_stats directly (get_pv_stats RPC + Realtime
-- Broadcast instead), and no active FamilyScope sessions exist at the time of
-- this migration, so it's safe to remove the fully-open policy now.

DROP POLICY IF EXISTS "pv_stats_public_select" ON pv_stats;
