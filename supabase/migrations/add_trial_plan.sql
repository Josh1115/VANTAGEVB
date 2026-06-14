-- Migration: introduce 'trial' plan
-- Run this once in the Supabase SQL editor.
--
-- 1. Add 'trial' to the plan check constraint (if one exists).
--    If your profiles table has no check constraint on plan, this is a no-op — skip it.
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
--   CHECK (plan IN ('baseline', 'trial', 'core', 'advantage', 'topper'));

-- 2. Change the default plan for new sign-ups to 'trial'.
ALTER TABLE profiles ALTER COLUMN plan SET DEFAULT 'trial';

-- 3. (Optional) Migrate any NULL plan rows to 'trial'.
--    Existing 'baseline' rows are left untouched (grandfathered).
UPDATE profiles SET plan = 'trial' WHERE plan IS NULL;
