-- Migrate old tier-based plan values to new team-count-based plan values.
-- baseline/trial → inactive (no paid subscription equivalent)
-- core → 1_team (closest match: single-team plan)
-- advantage → 2_teams (closest match: two-team plan)
-- topper → 5plus_teams (closest match: highest tier)
UPDATE profiles
SET plan = CASE
  WHEN plan IN ('baseline', 'trial') THEN 'inactive'
  WHEN plan = 'core'      THEN '1_team'
  WHEN plan = 'advantage' THEN '2_teams'
  WHEN plan = 'topper'    THEN '5plus_teams'
  ELSE plan
END
WHERE plan IN ('baseline', 'trial', 'core', 'advantage', 'topper');
