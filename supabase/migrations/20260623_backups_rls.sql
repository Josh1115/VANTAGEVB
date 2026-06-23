-- Lock down the backups table so coaches can only read and write their own data.
-- Without this, any authenticated user could query all coaches' backup payloads.

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- SELECT — can only read your own backup row
CREATE POLICY "backups_select_own" ON backups
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- INSERT — can only create a row for yourself
CREATE POLICY "backups_insert_own" ON backups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE — can only overwrite your own backup
CREATE POLICY "backups_update_own" ON backups
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE — can only delete your own backup
CREATE POLICY "backups_delete_own" ON backups
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
