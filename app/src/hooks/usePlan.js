import { useAuth } from '../contexts/AuthContext';

// Number of teams allowed per plan
export const PLAN_TEAMS = {
  inactive:      0,
  trial:         1,
  '1_team':      1,
  '2_teams':     2,
  '3_teams':     3,
  '4_teams':     4,
  '5plus_teams': 5,
  master:        99,
};

export const PLAN_PRICES = {
  '1_team':      '$79.99',
  '2_teams':     '$139.99',
  '3_teams':     '$189.99',
  '4_teams':     '$229.99',
  '5plus_teams': '$259.99',
};

export const PLAN_LABELS = {
  trial:         'Trial',
  '1_team':      '1 Team',
  '2_teams':     '2 Teams',
  '3_teams':     '3 Teams',
  '4_teams':     '4 Teams',
  '5plus_teams': '5+ Teams',
};

export const TRIAL_MATCH_LIMIT = 5;

// Numeric tier: 0=inactive, 1=trial, 2=paid, 3=master
export const PLAN_TIER = {
  inactive:      0,
  trial:         1,
  '1_team':      2,
  '2_teams':     2,
  '3_teams':     2,
  '4_teams':     2,
  '5plus_teams': 2,
  master:        3,
};

export function usePlan() {
  const { profile } = useAuth();
  const rawPlan = profile?.plan ?? 'inactive';
  const now = new Date();
  const expiresAt = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null;
  const isExpired = expiresAt ? expiresAt < now : false;
  const plan = (rawPlan !== 'inactive' && rawPlan !== 'master' && isExpired) ? 'inactive' : rawPlan;
  const isMaster = plan === 'master';
  const isActive = plan !== 'inactive';
  const teamsAllowed = PLAN_TEAMS[plan] ?? 0;
  const tier = PLAN_TIER[plan] ?? 0;

  // Accepts a numeric tier (1/2/3) or a string alias:
  //   'active' | 'core' → 1 (any non-inactive plan, including trial)
  //   'paid'            → 2 (purchased plan)
  //   'master'          → 3
  const TIER_ALIAS = { active: 1, core: 1, paid: 2, master: 3 };
  function has(required = 1) {
    const t = typeof required === 'string' ? (TIER_ALIAS[required] ?? 1) : required;
    return tier >= t;
  }

  const matchLimit = plan === 'trial' ? TRIAL_MATCH_LIMIT
    : plan === '5plus_teams' ? 50
    : Infinity;

  // Days until expiry — positive integer if expiring in future, null otherwise
  const daysUntilExpiry = (!isExpired && expiresAt)
    ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
    : null;

  return { plan, isActive, isMaster, teamsAllowed, matchLimit, tier, has, expiresAt: isExpired ? null : expiresAt, daysUntilExpiry };
}
