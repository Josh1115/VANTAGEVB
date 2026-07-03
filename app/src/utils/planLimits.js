// Plan constants and pure plan-resolution logic, kept dependency-free (no React,
// no AuthContext) so both the usePlan() hook and non-component code (like
// AuthContext's own cloud sync) can use them without a circular import.

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
  '5plus_teams': '5 Teams',
};

export const TRIAL_MATCH_LIMIT = 5;

// Features shared across every paid plan — only team count and price differ.
export const ALL_FEATURES = [
  'Vantage Point - Full Live Match Stat Entry',
  'Complete Access To Records, History, And Stats Pages',
  'Detailed Player & Team Analysis',
  'Family Scope - Live Gamecast-Like Sharing',
  'Rotation Analysis & Optimization',
  'Opponent Scouting & Tracking',
  'Practice Tools',
  'Up To 50 Matches Per Team Per Season',
  'PDF, CSV & MaxPreps Export (Trial User May Have Limitations)',
];

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

// Resolves a raw profiles row into the effective plan info, applying expiration.
// Shared by usePlan() and any non-React code (e.g. AuthContext's cloud sync) that
// needs to know a user's real teamsAllowed/matchLimit without rendering a component.
export function resolvePlanFromProfile(profile) {
  const rawPlan = profile?.plan ?? 'inactive';
  const now = new Date();
  const expiresAt = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null;
  const isExpired = expiresAt ? expiresAt < now : false;
  const plan = (rawPlan !== 'inactive' && rawPlan !== 'master' && isExpired) ? 'inactive' : rawPlan;
  const isActive = plan !== 'inactive';
  const teamsAllowed = PLAN_TEAMS[plan] ?? 0;
  const matchLimit = plan === 'trial' ? TRIAL_MATCH_LIMIT
    : plan === 'master' ? Infinity
    : isActive ? 50
    : Infinity;

  return { plan, isActive, isMaster: plan === 'master', teamsAllowed, matchLimit, isExpired, expiresAt };
}
